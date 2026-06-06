// Package main implements the refresh-token strategy demo using Gin + GORM + PostgreSQL.
// It exposes the same HTTP contract as the TypeScript/Java/C# implementations:
//
//	POST /auth/signup   — register; returns { id, email }
//	POST /auth/signin   — authenticate; returns { access_token, refresh_token }
//	POST /auth/refresh  — rotate tokens (RT in Authorization: Bearer header)
//	POST /auth/logout   — revoke RT (AT in Authorization: Bearer header)
//	GET  /users/profile — protected resource; requires valid AT
//
// Run: cd backend/3-go && go run .
package main

import (
	"crypto/sha256"
	"encoding/hex"
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

// hashForBcrypt returns a SHA-256 hex digest of s.
// JWT refresh tokens exceed bcrypt's 72-byte limit, so we pre-hash to 64 hex chars
// before calling bcrypt.GenerateFromPassword.
func hashForBcrypt(s string) string {
	sum := sha256.Sum256([]byte(s))
	return hex.EncodeToString(sum[:])
}

// User is the GORM model for the "users" table.
// RefreshTokenHash stores only the bcrypt hash of the active refresh token (never plaintext).
// When RefreshTokenHash is empty the user is considered logged out.
type User struct {
	// ID is the auto-incremented primary key.
	ID uint `gorm:"primaryKey;column:id" json:"id"`
	// Email must be unique across all users; used as the login identifier.
	Email string `gorm:"uniqueIndex;column:email" json:"email"`
	// Password is the bcrypt hash of the user's plaintext password; never exposed in JSON.
	Password string `gorm:"column:password" json:"-"`
	// RefreshTokenHash is the bcrypt hash of the current valid refresh token.
	// Empty string means the user is logged out and no RT is valid.
	RefreshTokenHash string `gorm:"column:refreshTokenHash" json:"-"`
}

// SignUpRequest is the JSON body accepted by POST /auth/signup.
type SignUpRequest struct {
	// Email must be a valid, unique email address.
	Email string `json:"email" binding:"required,email"`
	// Password is the plaintext password; will be hashed before storage.
	Password string `json:"password" binding:"required"`
}

// SignInRequest is the JSON body accepted by POST /auth/signin.
type SignInRequest struct {
	// Email identifies the account to authenticate.
	Email string `json:"email" binding:"required,email"`
	// Password is the plaintext password to verify against the stored hash.
	Password string `json:"password" binding:"required"`
}

// jwtSecret is the HMAC key used to sign and verify access tokens (AT_SECRET).
// Separate from jwtRefreshSecret so an AT cannot be used as an RT and vice-versa.
var (
	jwtSecret        = []byte("9a7631a7b8e662b9514731c34a2e5d7f6b9a8c7d6e5f4a3b2c1d0e9f8a7b6c5d")
	jwtRefreshSecret = []byte("8b7631a7b8e662b9514731c34a2e5d7f6b9a8c7d6e5f4a3b2c1d0e9f8a7b6c5e")
)

// main is the application entry point.
// It connects to PostgreSQL, auto-migrates the schema, registers routes, and starts the server.
func main() {
	// Read PostgreSQL connection parameters from environment; fall back to dev defaults.
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

	// Assemble the DSN and open the GORM connection.
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable", pgHost, pgUser, pgPass, pgDb, pgPort)
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("failed to connect database: %v", err)
	}

	// AutoMigrate creates the users table if it does not exist.
	// For production use explicit migration files instead.
	err = db.AutoMigrate(&User{})
	if err != nil {
		log.Fatalf("failed to migrate database: %v", err)
	}

	r := gin.Default()

	// --- POST /auth/signup ---
	// Registers a new user; hashes the password before persisting.
	r.POST("/auth/signup", func(c *gin.Context) {
		var req SignUpRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Guard: reject duplicate emails before hashing to fail fast.
		var existing User
		if err := db.Where("email = ?", req.Email).First(&existing).Error; err == nil {
			c.JSON(http.StatusConflict, gin.H{"message": "Email already registered"})
			return
		}

		// Hash with bcrypt cost 10 to match the other language implementations.
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), 10)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
			return
		}

		user := User{
			Email:    req.Email,
			Password: string(hashedPassword),
		}

		if err := db.Create(&user).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
			return
		}

		// Return only safe public fields — never expose the password hash.
		c.JSON(http.StatusCreated, gin.H{
			"id":    user.ID,
			"email": user.Email,
		})
	})

	// --- POST /auth/signin ---
	// Authenticates the user and issues a new AT + RT pair.
	// Stores a bcrypt hash of the RT in the DB immediately after issuance.
	r.POST("/auth/signin", func(c *gin.Context) {
		var req SignInRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		var user User
		// Look up user; unify "not found" and "wrong password" into one 401 to prevent email enumeration.
		if err := db.Where("email = ?", req.Email).First(&user).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				c.JSON(http.StatusUnauthorized, gin.H{"message": "Invalid credentials"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// Timing-safe comparison of the plaintext password against the stored hash.
		if bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)) != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "Invalid credentials"})
			return
		}

		// Issue AT (15 m) and RT (7 d) using separate signing secrets.
		accessTok, refreshTok, err := generateTokens(user.ID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate tokens"})
			return
		}

		// Persist only the bcrypt hash of the RT — a DB breach cannot replay the raw RT.
		// Pre-hash with SHA-256 to keep the input under bcrypt's 72-byte limit.
		rtHash, err := bcrypt.GenerateFromPassword([]byte(hashForBcrypt(refreshTok)), 10)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash refresh token"})
			return
		}

		user.RefreshTokenHash = string(rtHash)
		db.Save(&user)

		c.JSON(http.StatusOK, gin.H{
			"access_token":  accessTok,
			"refresh_token": refreshTok,
		})
	})

	// --- POST /auth/refresh ---
	// Rotates the token pair: validates the incoming RT (signature + bcrypt hash),
	// then issues a new pair and overwrites the stored hash (old RT is immediately invalidated).
	r.POST("/auth/refresh", func(c *gin.Context) {
		// Extract the raw RT string from the Authorization: Bearer header.
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			c.JSON(http.StatusUnauthorized, gin.H{"statusCode": 401, "message": "Refresh token revoked or rotated", "error": "Unauthorized"})
			return
		}

		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
		// Step 1: validate the JWT signature using the RT secret.
		token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
			return jwtRefreshSecret, nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"statusCode": 401, "message": "Refresh token revoked or rotated", "error": "Unauthorized"})
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"statusCode": 401, "message": "Refresh token revoked or rotated", "error": "Unauthorized"})
			return
		}

		// Extract the sub claim (user id); JJWT stores numbers as float64.
		sub, ok := claims["sub"]
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"statusCode": 401, "message": "Refresh token revoked or rotated", "error": "Unauthorized"})
			return
		}

		// Normalise the sub value to int regardless of whether it was float64 or string.
		var userID int
		switch v := sub.(type) {
		case float64:
			userID = int(v)
		case string:
			id, _ := strconv.Atoi(v)
			userID = id
		}

		// Step 2: load user and compare the incoming RT against the stored bcrypt hash.
		var user User
		if err := db.First(&user, userID).Error; err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"statusCode": 401, "message": "Refresh token revoked or rotated", "error": "Unauthorized"})
			return
		}

		// Empty hash = logged out; hash mismatch = rotated or replayed token.
		// Compare against the SHA-256 digest (same pre-hash used during storage).
		if user.RefreshTokenHash == "" || bcrypt.CompareHashAndPassword([]byte(user.RefreshTokenHash), []byte(hashForBcrypt(tokenStr))) != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"statusCode": 401, "message": "Refresh token revoked or rotated", "error": "Unauthorized"})
			return
		}

		// Rotation: issue a fresh pair and immediately overwrite the old RT hash.
		accessTok, refreshTok, err := generateTokens(user.ID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate tokens"})
			return
		}

		// Pre-hash with SHA-256 to keep the input under bcrypt's 72-byte limit.
		rtHash, err := bcrypt.GenerateFromPassword([]byte(hashForBcrypt(refreshTok)), 10)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash refresh token"})
			return
		}

		// Old hash is replaced → old RT is now permanently invalid.
		user.RefreshTokenHash = string(rtHash)
		db.Save(&user)

		c.JSON(http.StatusOK, gin.H{
			"access_token":  accessTok,
			"refresh_token": refreshTok,
		})
	})

	// --- POST /auth/logout (protected by AT) ---
	// Revokes the active RT by setting the stored hash to empty string.
	// The AT is validated by JWTMiddleware before this handler runs.
	r.POST("/auth/logout", JWTMiddleware(jwtSecret), func(c *gin.Context) {
		userIDVal, _ := c.Get("userId")

		// Normalise userId regardless of JWT library's numeric representation.
		var userID int
		switch v := userIDVal.(type) {
		case float64:
			userID = int(v)
		case string:
			id, _ := strconv.Atoi(v)
			userID = id
		case int:
			userID = v
		case uint:
			userID = int(v)
		}

		var user User
		if err := db.First(&user, userID).Error; err == nil {
			// Null the hash to revoke all outstanding RTs for this user.
			user.RefreshTokenHash = ""
			db.Save(&user)
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "Logged out",
		})
	})

	// --- GET /users/profile (protected by AT) ---
	// Returns the authenticated user's profile to verify that the AT grants access.
	users := r.Group("/users")
	users.Use(JWTMiddleware(jwtSecret))
	{
		users.GET("/profile", func(c *gin.Context) {
			userIDVal, _ := c.Get("userId")

			// Normalise userId from the JWT claim.
			var userID int
			switch v := userIDVal.(type) {
			case float64:
				userID = int(v)
			case string:
				id, _ := strconv.Atoi(v)
				userID = id
			case int:
				userID = v
			case uint:
				userID = int(v)
			}

			c.JSON(http.StatusOK, gin.H{
				"message": "You have accessed the protected area.",
				"user": gin.H{
					"userId": userID,
				},
			})
		})
	}

	// Read port from environment; default to 3000 to match other language implementations.
	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}
	fmt.Printf("Server starting on port %s\n", port)
	// Bind to 127.0.0.1 (loopback) to prevent the Windows Firewall dialog
	// that appears when a new binary tries to listen on all interfaces (0.0.0.0).
	if err := r.Run("127.0.0.1:" + port); err != nil {
		log.Fatalf("failed to run server: %v", err)
	}
}

// generateTokens signs a new access token (AT, 15 min) and refresh token (RT, 7 days)
// for the given user ID using their respective HMAC-SHA256 secrets.
// Both tokens carry only the "sub" claim (user ID) to minimise the token payload.
//
// Returns the raw AT string, RT string, and any signing error.
func generateTokens(userID uint) (string, string, error) {
	// AT: short-lived (15 minutes), signed with the AT secret.
	atToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": userID,
		"exp": time.Now().Add(time.Minute * 15).Unix(), // 15 m TTL matches the lesson contract
	})
	at, err := atToken.SignedString(jwtSecret)
	if err != nil {
		return "", "", err
	}

	// RT: long-lived (7 days), signed with the separate RT secret to prevent AT ↔ RT confusion.
	rtToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": userID,
		"exp": time.Now().Add(time.Hour * 24 * 7).Unix(), // 7 d TTL gives the user a week of silent re-auth
	})
	rt, err := rtToken.SignedString(jwtRefreshSecret)
	if err != nil {
		return "", "", err
	}

	return at, rt, nil
}

// JWTMiddleware returns a Gin middleware that validates an access token
// from the "Authorization: Bearer <token>" header using the provided HMAC secret.
// On success it sets the "userId" key in the Gin context for downstream handlers.
// On failure it aborts with HTTP 401.
func JWTMiddleware(secret []byte) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			// Missing or malformed Authorization header — reject immediately.
			c.JSON(http.StatusUnauthorized, gin.H{"statusCode": 401, "message": "Unauthorized"})
			c.Abort()
			return
		}

		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
		// Parse and validate the JWT signature against the provided secret.
		token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
			return secret, nil
		})

		if err != nil || !token.Valid {
			// Expired, tampered, or invalid token.
			c.JSON(http.StatusUnauthorized, gin.H{"statusCode": 401, "message": "Unauthorized"})
			c.Abort()
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"statusCode": 401, "message": "Unauthorized"})
			c.Abort()
			return
		}

		sub, ok := claims["sub"]
		if !ok {
			// Token is valid but missing the required subject claim.
			c.JSON(http.StatusUnauthorized, gin.H{"statusCode": 401, "message": "Unauthorized"})
			c.Abort()
			return
		}

		// Store the raw sub value; handlers normalise it to int via a type switch.
		c.Set("userId", sub)
		c.Next()
	}
}
