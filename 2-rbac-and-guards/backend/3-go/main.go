// Package main is the entry point for the Go RBAC demo server.
// It wires up a Gin HTTP router with JWT-based authentication and role-based
// authorization, backed by a PostgreSQL database via GORM.
//
// Architecture overview:
//   - JWTMiddleware: validates the Bearer token and stores userId + role in the Gin context.
//   - RolesGuard: reads the role from the context and rejects requests whose role is not in the allowed set.
//   - Routes: /auth/** (public), /public/health (public), /admin/** (admin), /editor/** (admin|editor).
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
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// User represents a row in the "users" table.
// The Role field is embedded in the JWT so authorization middleware
// can enforce RBAC without hitting the database on every request.
type User struct {
	ID       uint   `gorm:"primaryKey;column:id" json:"id"`
	Email    string `gorm:"uniqueIndex;column:email" json:"email"`
	Password string `gorm:"column:password" json:"-"` // json:"-" prevents the hash from leaking in responses
	Role     string `gorm:"column:role;default:user" json:"role"`
}

// SignUpRequest is the validated body for POST /auth/signup.
// Gin's ShouldBindJSON uses the binding tags to reject missing or malformed fields.
type SignUpRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
	Role     string `json:"role"` // optional — defaults to "user" in handler
}

// SignInRequest is the validated body for POST /auth/signin.
type SignInRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// jwtSecret is the symmetric HMAC-SHA256 key used to sign and verify JWTs.
// Loaded from JWT_SECRET env var; falls back to a demo key for local development.
// In production, always override via a secret manager (Vault, AWS Secrets Manager, etc.).
var jwtSecret = func() []byte {
	s := os.Getenv("JWT_SECRET")
	if s == "" {
		s = "9a7631a7b8e662b9514731c34a2e5d7f6b9a8c7d6e5f4a3b2c1d0e9f8a7b6c5d"
	}
	return []byte(s)
}()

// main bootstraps the application: opens a PostgreSQL connection, runs GORM AutoMigrate,
// seeds the admin user, registers routes, and starts the HTTP server.
func main() {
	// Read database connection params from env vars; fall back to dev defaults.
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

	// Build the DSN (Data Source Name) from the individual env components.
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable", pgHost, pgUser, pgPass, pgDb, pgPort)

	// Open a GORM connection — panics on failure (non-recoverable at boot).
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("failed to connect database: %v", err)
	}

	// AutoMigrate creates the "users" table if it does not already exist.
	// For production, prefer explicit migration files instead of AutoMigrate.
	err = db.AutoMigrate(&User{})
	if err != nil {
		log.Fatalf("failed to migrate database: %v", err)
	}

	// Seed the default admin user if it does not already exist — idempotent.
	var admin User
	if err := db.Where("email = ?", "admin@starci.net").First(&admin).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// Hash the admin password with bcrypt cost factor 10 before persisting.
			hashed, _ := bcrypt.GenerateFromPassword([]byte("admin123"), 10)
			db.Create(&User{
				Email:    "admin@starci.net",
				Password: string(hashed),
				Role:     "admin",
			})
		}
	}

	r := gin.Default() // Default includes the Logger and Recovery middleware

	// ── Auth routes (public — no JWT required) ──────────────────────────────

	// POST /auth/signup — register a new user account.
	r.POST("/auth/signup", func(c *gin.Context) {
		var req SignUpRequest
		// Bind and validate the JSON body; return 400 on missing/invalid fields.
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Reject duplicate emails — return 409 Conflict before attempting a DB insert.
		var existing User
		if err := db.Where("email = ?", req.Email).First(&existing).Error; err == nil {
			c.JSON(http.StatusConflict, gin.H{"message": "Email already registered"})
			return
		}

		// Hash the plain-text password with bcrypt (cost=10) — never store raw passwords.
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), 10)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
			return
		}

		// Default to "user" role when the caller does not specify one.
		role := req.Role
		if strings.TrimSpace(role) == "" {
			role = "user"
		}

		user := User{
			Email:    req.Email,
			Password: string(hashedPassword),
			Role:     role,
		}

		if err := db.Create(&user).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
			return
		}

		// HTTP 201 Created — confirms the resource was persisted.
		c.JSON(http.StatusCreated, gin.H{
			"message": "Created",
		})
	})

	// POST /auth/signin — validate credentials and return a signed JWT.
	r.POST("/auth/signin", func(c *gin.Context) {
		var req SignInRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Look up the user by email; gorm.ErrRecordNotFound → 401 (same message as wrong password).
		var user User
		if err := db.Where("email = ?", req.Email).First(&user).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				// Generic 401 message to prevent email enumeration attacks.
				c.JSON(http.StatusUnauthorized, gin.H{"message": "Invalid credentials"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// Compare the submitted plain-text password against the stored bcrypt hash.
		if bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)) != nil {
			// Same 401 message for wrong-password and user-not-found — avoids enumeration.
			c.JSON(http.StatusUnauthorized, gin.H{"message": "Invalid credentials"})
			return
		}

		// Build the JWT with sub (user ID), role (custom claim), and exp (1-hour TTL).
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
			"sub":  user.ID,   // standard subject claim — stores the user's database ID
			"role": user.Role, // custom claim read by JWTMiddleware for RBAC enforcement
			"exp":  time.Now().Add(time.Hour).Unix(), // exp = current time + 1 hour (Unix timestamp)
		})

		// Sign the token with the shared HMAC-SHA256 secret.
		tokenString, err := token.SignedString(jwtSecret)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
			return
		}

		// Return the signed JWT — matches the `access_token` field in the API contract.
		c.JSON(http.StatusOK, gin.H{
			"access_token": tokenString,
		})
	})

	// ── Public route (no auth) ───────────────────────────────────────────────

	// GET /public/health — liveness probe; no JWT required.
	r.GET("/public/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status": "ok",
		})
	})

	// ── Protected routes (JWT + role check) ─────────────────────────────────

	// GET /admin/dashboard — single-role gate: "admin" only.
	// JWTMiddleware extracts the token; RolesGuard("admin") checks the role claim.
	r.GET("/admin/dashboard", JWTMiddleware(jwtSecret), RolesGuard("admin"), func(c *gin.Context) {
		// Static mock payload — the lesson focuses on the authorization mechanism, not real data.
		c.JSON(http.StatusOK, gin.H{
			"message": "Chào mừng Admin vào khu vực mật!",
			"stats": gin.H{
				"users":  100,
				"orders": 15,
			},
		})
	})

	// GET /editor/articles — multi-role OR gate: "admin" or "editor".
	// RolesGuard accepts variadic allowed roles; any match grants access.
	r.GET("/editor/articles", JWTMiddleware(jwtSecret), RolesGuard("admin", "editor"), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "Editor area — admin và editor đều xem được.",
			"articles": []gin.H{
				{"id": 1, "title": "Hello RBAC"},
				{"id": 2, "title": "Multi-role OR check"},
			},
		})
	})

	// Determine the listen port — env PORT overrides the default 3000.
	// Bind to 127.0.0.1 to avoid Windows Defender Firewall popups during local e2e runs.
	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}
	addr := "127.0.0.1:" + port // loopback bind — prevents firewall prompts on Windows
	fmt.Printf("Server starting on %s\n", addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("failed to run server: %v", err)
	}
}

// JWTMiddleware returns a Gin middleware function that validates the Bearer token
// in the Authorization header. On success it stores "userId" and "role" in the
// Gin context for downstream handlers (RolesGuard, route handlers).
// On failure it aborts with 401 Unauthorized.
func JWTMiddleware(secret []byte) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		// Reject requests with no Authorization header or wrong scheme (must be Bearer).
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			c.JSON(http.StatusUnauthorized, gin.H{"statusCode": 401, "message": "Unauthorized"})
			c.Abort() // stop processing — do not call downstream handlers
			return
		}

		// Strip the "Bearer " prefix (7 chars) to isolate the raw JWT string.
		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")

		// Parse and verify the HMAC signature; jwt.Parse also validates the "exp" claim.
		token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
			return secret, nil // return the symmetric key for HMAC verification
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"statusCode": 401, "message": "Unauthorized"})
			c.Abort()
			return
		}

		// Extract the MapClaims payload from the parsed token.
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"statusCode": 401, "message": "Unauthorized"})
			c.Abort()
			return
		}

		// Require "sub" claim (user ID) — missing sub means a malformed token.
		sub, ok := claims["sub"]
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"statusCode": 401, "message": "Unauthorized"})
			c.Abort()
			return
		}

		// Require "role" claim — missing role means the token cannot be authorized.
		role, ok := claims["role"]
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"statusCode": 401, "message": "Unauthorized"})
			c.Abort()
			return
		}

		// Store userId and role in the Gin context so RolesGuard and handlers can read them.
		c.Set("userId", sub)
		c.Set("role", role)
		c.Next() // pass control to the next middleware or route handler
	}
}

// RolesGuard returns a Gin middleware function that enforces role-based access control.
// It reads the "role" value set by JWTMiddleware and checks it against allowedRoles.
// If the user's role matches any allowed role (OR semantics), the request proceeds.
// Otherwise, it aborts with 403 Forbidden.
func RolesGuard(allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// "role" must have been stored by JWTMiddleware — absent means the middleware chain is misconfigured.
		roleVal, exists := c.Get("role")
		if !exists {
			c.JSON(http.StatusForbidden, gin.H{"statusCode": 403, "message": "Forbidden resource", "error": "Forbidden"})
			c.Abort()
			return
		}

		// Assert the role is a string — unexpected if JWTMiddleware is correct, but guard defensively.
		role, ok := roleVal.(string)
		if !ok {
			c.JSON(http.StatusForbidden, gin.H{"statusCode": 403, "message": "Forbidden resource", "error": "Forbidden"})
			c.Abort()
			return
		}

		// Linear scan through allowed roles — OR semantics: any match grants access.
		for _, r := range allowedRoles {
			if r == role {
				c.Next() // role matches — allow the request through
				return
			}
		}

		// No matching role found — authenticated but not authorised → 403 (not 401).
		c.JSON(http.StatusForbidden, gin.H{"statusCode": 403, "message": "Forbidden resource", "error": "Forbidden"})
		c.Abort()
	}
}
