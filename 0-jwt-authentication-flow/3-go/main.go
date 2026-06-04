package main

import (
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// User table; bcrypt hash lives in user_credentials.
type User struct {
	ID         uint            `gorm:"primaryKey;column:id" json:"id"`
	Email      string          `gorm:"uniqueIndex;column:email" json:"email"`
	Credential *UserCredential `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
}

// UserCredential stores the password hash per user.
type UserCredential struct {
	ID       uint   `gorm:"primaryKey;column:id"`
	UserID   uint   `gorm:"column:userId"`
	Password string `gorm:"column:password"`
}

type SignUpRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type SignInRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

var jwtSecret = []byte("9a7631a7b8e662b9514731c34a2e5d7f6b9a8c7d6e5f4a3b2c1d0e9f8a7b6c5d")

func main() {
	dsn := "host=localhost user=starci_user password=starci_password dbname=starci_db port=5432 sslmode=disable"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("failed to connect database: %v", err)
	}

	// Auto Migrate
	err = db.AutoMigrate(&User{}, &UserCredential{})
	if err != nil {
		log.Fatalf("failed to migrate database: %v", err)
	}

	r := gin.Default()

	// Auth routes
	r.POST("/auth/signup", func(c *gin.Context) {
		var req SignUpRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		var existing User
		if err := db.Where("email = ?", req.Email).First(&existing).Error; err == nil {
			c.JSON(http.StatusConflict, gin.H{"message": "Email already registered"})
			return
		}

		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), 10)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
			return
		}

		user := User{
			Email: req.Email,
			Credential: &UserCredential{
				Password: string(hashedPassword),
			},
		}

		if err := db.Create(&user).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
			return
		}

		c.JSON(http.StatusCreated, gin.H{
			"id":    user.ID,
			"email": user.Email,
		})
	})

	r.POST("/auth/signin", func(c *gin.Context) {
		var req SignInRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		var user User
		if err := db.Preload("Credential").Where("email = ?", req.Email).First(&user).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				c.JSON(http.StatusUnauthorized, gin.H{"message": "Invalid credentials"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		if user.Credential == nil || bcrypt.CompareHashAndPassword([]byte(user.Credential.Password), []byte(req.Password)) != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "Invalid credentials"})
			return
		}

		// Issue JWT
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
			"sub": user.ID,
			"exp": time.Now().Add(time.Hour).Unix(),
		})

		tokenString, err := token.SignedString(jwtSecret)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"access_token": tokenString,
		})
	})

	// Protected routes
	users := r.Group("/users")
	users.Use(JWTMiddleware(jwtSecret))
	{
		users.GET("/profile", func(c *gin.Context) {
			userIDVal, _ := c.Get("userId")
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
				"message": "Bạn đã truy cập vào khu vực bảo mật!",
				"user": gin.H{
					"userId": userID,
				},
			})
		})
	}

	fmt.Println("Server starting on port 3000")
	if err := r.Run(":3000"); err != nil {
		log.Fatalf("failed to run server: %v", err)
	}
}

func JWTMiddleware(secret []byte) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			c.JSON(http.StatusUnauthorized, gin.H{"statusCode": 401, "message": "Unauthorized"})
			c.Abort()
			return
		}

		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
		token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
			return secret, nil
		})

		if err != nil || !token.Valid {
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
			c.JSON(http.StatusUnauthorized, gin.H{"statusCode": 401, "message": "Unauthorized"})
			c.Abort()
			return
		}

		c.Set("userId", sub)
		c.Next()
	}
}
