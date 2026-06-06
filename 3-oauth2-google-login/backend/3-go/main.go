// Package main is the entry point for the OAuth2 Google Login demo written in Go.
// It wires up a Gin HTTP server, a GORM + Postgres database, and two endpoints that
// implement the authorization-code flow (redirect + callback with a mock branch).
package main

import (
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// User is a GORM model that maps to the "users" table.
// It supports both local password accounts and OAuth-only (Google) accounts:
//   - Password-only accounts: GoogleID is nil.
//   - OAuth-only accounts: Password is nil — credential lives at Google.
//   - Linked accounts: both fields are non-nil after the user connects Google to a pre-existing row.
//
// GoogleID holds Google's stable "sub" claim and serves as the primary upsert key;
// Email is the fallback for account linking when no row matches googleId.
type User struct {
	// ID is the auto-incremented surrogate primary key — stable internal identifier.
	ID uint `gorm:"primaryKey;column:id" json:"id"`
	// Email is unique across all users — login hint and fallback upsert key.
	Email string `gorm:"uniqueIndex;column:email" json:"email"`
	// Password is the bcrypt hash for local password accounts; nil for OAuth-only users.
	// Excluded from JSON responses to avoid leaking hashes.
	Password *string `gorm:"column:password" json:"-"`
	// GoogleID is Google's "sub" claim — unique and stable per Google account.
	// Exported as "googleSub" in JSON to match Google's own terminology.
	GoogleID *string `gorm:"uniqueIndex;column:googleId" json:"googleSub"`
	// FirstName and LastName are sourced from the Google profile and excluded from JSON
	// to keep the top-level User object lean; they are included in the response via name assembly.
	FirstName *string `gorm:"column:firstName" json:"-"`
	LastName  *string `gorm:"column:lastName" json:"-"`
	// Picture is the URL of the Google profile photo — display hint only.
	Picture *string `gorm:"column:picture" json:"-"`
}

// jwtSecret is the HMAC-SHA256 signing key used for all internal JWTs.
// In production this should be loaded from an environment variable or secrets manager —
// never hard-coded in source. The hard-coded value here is safe only for a demo.
var jwtSecret = []byte("9a7631a7b8e662b9514731c34a2e5d7f6b9a8c7d6e5f4a3b2c1d0e9f8a7b6c5d")

func main() {
	// --- Database configuration ---
	// Read Postgres connection parameters from environment variables so the same binary
	// can connect to different databases (dev Docker vs. CI vs. production) without recompiling.
	pgHost := os.Getenv("POSTGRES_HOST")
	if pgHost == "" {
		pgHost = "localhost" // default for local Docker Compose setup
	}
	pgPort := os.Getenv("POSTGRES_PORT")
	if pgPort == "" {
		pgPort = "5432"
	}
	pgUser := os.Getenv("POSTGRES_USER")
	if pgUser == "" {
		pgUser = "starci_user"
	}
	pgPass := os.Getenv("POSTGRES_PASSWORD")
	if pgPass == "" {
		pgPass = "starci_password"
	}
	pgDb := os.Getenv("POSTGRES_DB")
	if pgDb == "" {
		pgDb = "starci_db"
	}
	// Build the Postgres DSN (Data Source Name) from the individual env vars.
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable", pgHost, pgUser, pgPass, pgDb, pgPort)

	// Open the database connection — GORM manages the connection pool internally.
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("failed to connect database: %v", err)
	}

	// AutoMigrate creates or updates the "users" table to match the User struct.
	// Idempotent — safe to run on every startup. Use proper migrations in production.
	err = db.AutoMigrate(&User{})
	if err != nil {
		log.Fatalf("failed to migrate database: %v", err)
	}

	// --- HTTP routes ---
	r := gin.Default() // Default includes the Logger and Recovery middleware.

	// GET /auth/google — redirect the browser to Google's consent screen.
	// In a real app this URL would include a random "state" parameter to prevent CSRF.
	r.GET("/auth/google", func(c *gin.Context) {
		// Build the authorization URL with minimal scopes — least-privilege principle.
		googleAuthURL := "https://accounts.google.com/o/oauth2/v2/auth?" +
			"response_type=code&" +
			// redirect_uri must exactly match the Authorized Redirect URI in Google Cloud Console.
			"redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fgoogle%2Fcallback&" +
			// Minimal scopes: email for the upsert key, profile for display name.
			"scope=email%20profile&" +
			// Placeholder client_id — replace with a real registered ID for live deployments.
			"client_id=dummy"

		// HTTP 302 Found — browser follows the Location header automatically.
		c.Redirect(http.StatusFound, googleAuthURL)
	})

	// GET /auth/google/callback — receive the authorization code, upsert the user, issue JWT.
	r.GET("/auth/google/callback", func(c *gin.Context) {
		code := c.Query("code") // authorization code forwarded by Google (or "mockcode" for mock tests)

		// Mock branch: bypass real Google token exchange for offline testing.
		// Uses a fixed profile so the upsert logic is exercised deterministically.
		if code == "mockcode" {
			googleID  := "mock-google-sub-123" // stable "sub" used as primary upsert key
			email     := "mock@demo.com"
			firstName := "Mock"
			lastName  := "User"

			var user User
			// Two-stage upsert: try googleId first, then fall back to email (account linking).
			// Using a single OR query avoids a second round-trip to the database.
			err := db.Where("email = ? OR \"googleId\" = ?", email, googleID).First(&user).Error
			isNewUser := false

			if err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					// First time we see this identity — INSERT a new OAuth-only user row.
					// password is nil because the credential lives at Google, not in our DB.
					user = User{
						Email:     email,
						GoogleID:  &googleID,
						FirstName: &firstName,
						LastName:  &lastName,
						Password:  nil, // OAuth-only account: no local password
					}
					if err := db.Create(&user).Error; err != nil {
						c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
						return
					}
					isNewUser = true // signal to the client that this is a first login
				} else {
					// Unexpected DB error — surface it so the caller can diagnose.
					c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
					return
				}
			} else {
				// Returning user — re-link googleId and refresh display name fields.
				// Always overwrite googleId to guarantee the link is set (handles email-matched case).
				user.GoogleID  = &googleID
				user.FirstName = &firstName
				user.LastName  = &lastName
				db.Save(&user) // isNewUser stays false
			}

			// --- JWT issuance ---
			// Sign a token with only the user id as "sub" — minimal payload reduces size.
			token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
				"sub": user.ID,                         // user id is the only claim needed
				"exp": time.Now().Add(time.Hour).Unix(), // expire in 1 hour
			})

			tokenString, err := token.SignedString(jwtSecret)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
				return
			}

			// Build the display name by joining non-empty first/last name parts.
			var nameParts []string
			if user.FirstName != nil && *user.FirstName != "" {
				nameParts = append(nameParts, *user.FirstName)
			}
			if user.LastName != nil && *user.LastName != "" {
				nameParts = append(nameParts, *user.LastName)
			}
			name := strings.Join(nameParts, " ")

			// Return the response matching the API contract shared across all four lang backends.
			c.JSON(http.StatusOK, gin.H{
				"message":      "Đăng nhập Google thành công!",
				"access_token": tokenString,
				"isNewUser":    isNewUser,
				"user": gin.H{
					"id":        user.ID,
					"email":     user.Email,
					"name":      name,
					"googleSub": user.GoogleID, // alias matching Google's "sub" terminology
				},
			})
			return
		}

		// Real-code path: not implemented in this demo — reject to avoid silent misuse.
		c.JSON(http.StatusUnauthorized, gin.H{"statusCode": 401, "message": "Google authentication failed"})
	})

	// --- Start server ---
	// PORT env var allows the e2e harness to assign a free port without modifying source.
	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}
	fmt.Printf("Server starting on port %s\n", port)
	// Bind to all interfaces (":port") — for loopback-only, use "127.0.0.1:"+port.
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("failed to run server: %v", err)
	}
}
