package main

import (
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type User struct {
	ID       uint   `gorm:"primaryKey;column:id" json:"id"`
	Email    string `gorm:"uniqueIndex;column:email" json:"email"`
	Password string `gorm:"column:password" json:"-"`
	Role     string `gorm:"column:role;default:user" json:"role"`
}

type SignUpRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
	Role     string `json:"role"`
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

	err = db.AutoMigrate(&User{})
	if err != nil {
		log.Fatalf("failed to migrate database: %v", err)
	}

	// Seed admin user
	var admin User
	if err := db.Where("email = ?", "admin@starci.net").First(&admin).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			hashed, _ := bcrypt.GenerateFromPassword([]byte("admin123"), 10)
			db.Create(&User{
				Email:    "admin@starci.net",
				Password: string(hashed),
				Role:     "admin",
			})
		}
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

		c.JSON(http.StatusCreated, gin.H{
			"message": "Created",
		})
	})

	r.POST("/auth/signin", func(c *gin.Context) {
		var req SignInRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		var user User
		if err := db.Where("email = ?", req.Email).First(&user).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				c.JSON(http.StatusUnauthorized, gin.H{"message": "Invalid credentials"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		if bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)) != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "Invalid credentials"})
			return
		}

		token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
			"sub":  user.ID,
			"role": user.Role,
			"exp":  time.Now().Add(time.Hour).Unix(),
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

	// Public Health route
	r.GET("/public/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status": "ok",
		})
	})

	// Protected routes
	r.GET("/admin/dashboard", JWTMiddleware(jwtSecret), RolesGuard("admin"), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "Chào mừng Admin vào khu vực mật!",
			"stats": gin.H{
				"users":  100,
				"orders": 15,
			},
		})
	})

	r.GET("/editor/articles", JWTMiddleware(jwtSecret), RolesGuard("admin", "editor"), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "Editor area — admin và editor đều xem được.",
			"articles": []gin.H{
				{"id": 1, "title": "Hello RBAC"},
				{"id": 2, "title": "Multi-role OR check"},
			},
		})
	})

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

		role, ok := claims["role"]
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"statusCode": 401, "message": "Unauthorized"})
			c.Abort()
			return
		}

		c.Set("userId", sub)
		c.Set("role", role)
		c.Next()
	}
}

func RolesGuard(allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		roleVal, exists := c.Get("role")
		if !exists {
			c.JSON(http.StatusForbidden, gin.H{"statusCode": 403, "message": "Forbidden resource", "error": "Forbidden"})
			c.Abort()
			return
		}
		role, ok := roleVal.(string)
		if !ok {
			c.JSON(http.StatusForbidden, gin.H{"statusCode": 403, "message": "Forbidden resource", "error": "Forbidden"})
			c.Abort()
			return
		}
		for _, r := range allowedRoles {
			if r == role {
				c.Next()
				return
			}
		}
		c.JSON(http.StatusForbidden, gin.H{"statusCode": 403, "message": "Forbidden resource", "error": "Forbidden"})
		c.Abort()
	}
}
