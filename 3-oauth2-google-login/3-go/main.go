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

type User struct {
	ID        uint    `gorm:"primaryKey;column:id" json:"id"`
	Email     string  `gorm:"uniqueIndex;column:email" json:"email"`
	Password  *string `gorm:"column:password" json:"-"`
	GoogleID  *string `gorm:"uniqueIndex;column:googleId" json:"googleSub"`
	FirstName *string `gorm:"column:firstName" json:"-"`
	LastName  *string `gorm:"column:lastName" json:"-"`
	Picture   *string `gorm:"column:picture" json:"-"`
}

var jwtSecret = []byte("9a7631a7b8e662b9514731c34a2e5d7f6b9a8c7d6e5f4a3b2c1d0e9f8a7b6c5d")

func main() {
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
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable", pgHost, pgUser, pgPass, pgDb, pgPort)
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("failed to connect database: %v", err)
	}

	err = db.AutoMigrate(&User{})
	if err != nil {
		log.Fatalf("failed to migrate database: %v", err)
	}

	r := gin.Default()

	r.GET("/auth/google", func(c *gin.Context) {
		googleAuthURL := "https://accounts.google.com/o/oauth2/v2/auth?" +
			"response_type=code&" +
			"redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fgoogle%2Fcallback&" +
			"scope=email%20profile&" +
			"client_id=dummy"

		c.Redirect(http.StatusFound, googleAuthURL)
	})

	r.GET("/auth/google/callback", func(c *gin.Context) {
		code := c.Query("code")
		if code == "mockcode" {
			googleID := "mock-google-sub-123"
			email := "mock@demo.com"
			firstName := "Mock"
			lastName := "User"

			var user User
			err := db.Where("email = ? OR \"googleId\" = ?", email, googleID).First(&user).Error
			isNewUser := false

			if err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					user = User{
						Email:     email,
						GoogleID:  &googleID,
						FirstName: &firstName,
						LastName:  &lastName,
						Password:  nil,
					}
					if err := db.Create(&user).Error; err != nil {
						c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
						return
					}
					isNewUser = true
				} else {
					c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
					return
				}
			} else {
				user.GoogleID = &googleID
				user.FirstName = &firstName
				user.LastName = &lastName
				db.Save(&user)
			}

			// Generate internal JWT
			token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
				"sub": user.ID,
				"exp": time.Now().Add(time.Hour).Unix(),
			})

			tokenString, err := token.SignedString(jwtSecret)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
				return
			}

			var nameParts []string
			if user.FirstName != nil && *user.FirstName != "" {
				nameParts = append(nameParts, *user.FirstName)
			}
			if user.LastName != nil && *user.LastName != "" {
				nameParts = append(nameParts, *user.LastName)
			}
			name := strings.Join(nameParts, " ")

			c.JSON(http.StatusOK, gin.H{
				"message":      "Đăng nhập Google thành công!",
				"access_token": tokenString,
				"isNewUser":    isNewUser,
				"user": gin.H{
					"id":        user.ID,
					"email":     user.Email,
					"name":      name,
					"googleSub": user.GoogleID,
				},
			})
			return
		}

		c.JSON(http.StatusUnauthorized, gin.H{"statusCode": 401, "message": "Google authentication failed"})
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}
	fmt.Printf("Server starting on port %s\n", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("failed to run server: %v", err)
	}
}
