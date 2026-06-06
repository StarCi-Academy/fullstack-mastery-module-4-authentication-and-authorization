// Package main is the entry point for the JWT authentication demo server.
// It uses Gin as the HTTP framework, GORM for PostgreSQL access,
// golang-jwt for token signing/verification, and bcrypt for password hashing.
// All auth is stateless — no session table is written; identity travels in the JWT itself.
package main

import (
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// User maps to the `users` table.
// Identity (email) is kept separate from the password hash (UserCredential)
// so a query that joins users without credentials will not expose secret data.
type User struct {
	ID         uint            `gorm:"primaryKey;column:id" json:"id"`
	Email      string          `gorm:"uniqueIndex;column:email" json:"email"`
	// Credential is loaded via GORM's Preload — absent from JSON responses.
	Credential *UserCredential `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
}

// UserCredential maps to the `user_credentials` table.
// Stores only the BCrypt hash — the plain-text password is never persisted.
type UserCredential struct {
	ID       uint   `gorm:"primaryKey;column:id"`
	UserID   uint   `gorm:"column:userId"` // Foreign key referencing users.id
	Password string `gorm:"column:password"` // BCrypt hash, not plain-text
}

// SignUpRequest is the validated request body for POST /auth/signup.
type SignUpRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// SignInRequest is the validated request body for POST /auth/signin.
type SignInRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// jwtSecret is the HMAC key used to sign and verify all tokens.
// In production this must come from a secret manager — never commit real secrets.
var jwtSecret = []byte("9a7631a7b8e662b9514731c34a2e5d7f6b9a8c7d6e5f4a3b2c1d0e9f8a7b6c5d")

func main() {
	// Read database connection details from environment variables;
	// fall back to developer defaults so the app runs without any .env edits.
	pgHost := os.Getenv("POSTGRES_HOST")
	if pgHost == "" {
		pgHost = "localhost"
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

	// Build DSN from individual components for clarity
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable", pgHost, pgUser, pgPass, pgDb, pgPort)

	// Open the GORM connection — panics if the database is unreachable at startup
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("failed to connect database: %v", err)
	}

	// AutoMigrate creates the tables if they do not exist; safe for demo usage.
	// Production projects should use explicit migrations instead.
	err = db.AutoMigrate(&User{}, &UserCredential{})
	if err != nil {
		log.Fatalf("failed to migrate database: %v", err)
	}

	r := gin.Default()

	// ── Public auth routes ────────────────────────────────────────────────────

	// POST /auth/signup — create a new user with a bcrypt-hashed password
	r.POST("/auth/signup", func(c *gin.Context) {
		var req SignUpRequest
		// ShouldBindJSON validates the body against struct tags (required, email)
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Guard: reject duplicate accounts — email must be unique per user
		var existing User
		if err := db.Where("email = ?", req.Email).First(&existing).Error; err == nil {
			// Record found → email already registered → conflict
			c.JSON(http.StatusConflict, gin.H{"message": "Email already registered"})
			return
		}

		// Hash the password with bcrypt; cost=10 is a safe default balancing security and speed
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), 10)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
			return
		}

		// Build the user + embedded credential — GORM creates both rows in one Create call
		user := User{
			Email: req.Email,
			Credential: &UserCredential{
				Password: string(hashedPassword), // Only the hash is stored, never the plain-text
			},
		}

		if err := db.Create(&user).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
			return
		}

		// Return only safe fields — never echo the hash or plain-text password back
		c.JSON(http.StatusCreated, gin.H{
			"id":    user.ID,
			"email": user.Email,
		})
	})

	// POST /auth/signin — validate credentials and issue a signed JWT
	r.POST("/auth/signin", func(c *gin.Context) {
		var req SignInRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Load the user with their credential for bcrypt comparison
		var user User
		if err := db.Preload("Credential").Where("email = ?", req.Email).First(&user).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				// Same 401 as wrong password — prevents user-enumeration attacks
				c.JSON(http.StatusUnauthorized, gin.H{"message": "Invalid credentials"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// Compare the provided plain-text against the stored bcrypt hash
		if user.Credential == nil || bcrypt.CompareHashAndPassword([]byte(user.Credential.Password), []byte(req.Password)) != nil {
			// Same message regardless of which guard failed — no enumeration leakage
			c.JSON(http.StatusUnauthorized, gin.H{"message": "Invalid credentials"})
			return
		}

		// Sign a JWT carrying the user id as the `sub` claim.
		// The `exp` claim limits the token's validity window.
		// No session is created — identity travels entirely inside the signed token.
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
			"sub": user.ID,
			"exp": time.Now().Add(time.Hour).Unix(), // Token expires in 1 hour
		})

		tokenString, err := token.SignedString(jwtSecret)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"access_token": tokenString, // Return the compact JWT string to the client
		})
	})

	// ── Protected routes ──────────────────────────────────────────────────────
	// The JWTMiddleware guard runs before every handler in this group.
	// Requests without a valid Bearer token are rejected with 401 before reaching handlers.

	users := r.Group("/users")
	users.Use(JWTMiddleware(jwtSecret))
	{
		// GET /users/profile — returns the authenticated user's id from the token claim
		users.GET("/profile", func(c *gin.Context) {
			// JWTMiddleware sets "userId" in the Gin context after verifying the token
			userIDVal, _ := c.Get("userId")

			// The `sub` claim is a JSON number, which jwt.MapClaims decodes as float64
			var userID int
			switch v := userIDVal.(type) {
			case float64:
				userID = int(v) // Standard case — JSON number from MapClaims
			case string:
				id, _ := strconv.Atoi(v)
				userID = id
			case int:
				userID = v
			case uint:
				userID = int(v)
			}

			// userId is derived entirely from the verified token — no session or DB lookup required
			c.JSON(http.StatusOK, gin.H{
				"message": "You have accessed a protected resource!",
				"user": gin.H{
					"userId": userID,
				},
			})
		})
	}

	// Read port from environment; default to 3000 for local development
	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}
	fmt.Printf("Server starting on port %s\n", port)

	// Bind to loopback only to avoid Windows Defender Firewall prompts during local development
	if err := r.Run("127.0.0.1:" + port); err != nil {
		log.Fatalf("failed to run server: %v", err)
	}
}

// JWTMiddleware returns a Gin middleware that validates Bearer tokens on every request.
// It reads the Authorization header, verifies the HMAC signature and expiry,
// then sets "userId" in the Gin context so downstream handlers can read the identity.
// Requests with missing or invalid tokens are aborted with HTTP 401.
func JWTMiddleware(secret []byte) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")

		// Require the "Bearer " prefix — reject missing or malformed headers immediately
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			c.JSON(http.StatusUnauthorized, gin.H{"statusCode": 401, "message": "Unauthorized"})
			c.Abort() // Stop further middleware/handler execution
			return
		}

		// Strip the "Bearer " prefix to isolate the raw JWT string
		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")

		// Parse re-computes the HMAC signature and checks the `exp` claim;
		// any error (expired, tampered, wrong key) results in a 401.
		token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
			return secret, nil // Provide the same secret used at signing time
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"statusCode": 401, "message": "Unauthorized"})
			c.Abort()
			return
		}

		// Extract the claims map from the verified token
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"statusCode": 401, "message": "Unauthorized"})
			c.Abort()
			return
		}

		// Read the `sub` claim — set at sign time as the user id
		sub, ok := claims["sub"]
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"statusCode": 401, "message": "Unauthorized"})
			c.Abort()
			return
		}

		// Attach the user id to the Gin context so the route handler can access it
		c.Set("userId", sub)
		c.Next() // Proceed to the next middleware or handler
	}
}
