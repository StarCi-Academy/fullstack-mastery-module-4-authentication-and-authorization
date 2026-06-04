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
	dsn := "host=localhost user=starci_user password=starci_password dbname=starci_db port=5432 sslmode=disable"
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

	fmt.Println("Server starting on port 3000")
	if err := r.Run(":3000"); err != nil {
		log.Fatalf("failed to run server: %v", err)
	}
}
