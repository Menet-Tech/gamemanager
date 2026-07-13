package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"os"
	"strings"
	"time"
)

var jwtKey []byte

func init() {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		log.Println("[WARNING] JWT_SECRET environment variable is empty! Using default fallback key. Change this in production!")
		jwtKey = []byte("super-secret-game-manager-key-2026-fallback")
	} else {
		jwtKey = []byte(secret)
	}
}

// Claims represents the JWT claims payload
type Claims struct {
	Username string `json:"username"`
	Role     string `json:"role"`
	Exp      int64  `json:"exp"`
}

// GenerateToken generates a JWT token for a user
func GenerateToken(username, role string) (string, error) {
	// Header
	headerJSON := `{"alg":"HS256","typ":"JWT"}`
	header := base64.RawURLEncoding.EncodeToString([]byte(headerJSON))

	// Claims payload
	claims := Claims{
		Username: username,
		Role:     role,
		Exp:      time.Now().Add(24 * time.Hour).Unix(), // 24 hours expiry
	}
	claimsBytes, err := json.Marshal(claims)
	if err != nil {
		return "", err
	}
	payload := base64.RawURLEncoding.EncodeToString(claimsBytes)

	// Signature
	dataToSign := header + "." + payload
	h := hmac.New(sha256.New, jwtKey)
	h.Write([]byte(dataToSign))
	signature := base64.RawURLEncoding.EncodeToString(h.Sum(nil))

	return header + "." + payload + "." + signature, nil
}

// ValidateToken validates a JWT token and returns the claims
func ValidateToken(tokenStr string) (*Claims, error) {
	parts := strings.Split(tokenStr, ".")
	if len(parts) != 3 {
		return nil, errors.New("invalid token format")
	}

	header, payload, signature := parts[0], parts[1], parts[2]

	// Verify signature
	dataToSign := header + "." + payload
	h := hmac.New(sha256.New, jwtKey)
	h.Write([]byte(dataToSign))
	expectedSignature := base64.RawURLEncoding.EncodeToString(h.Sum(nil))

	if signature != expectedSignature {
		return nil, errors.New("invalid token signature")
	}

	// Decode payload
	payloadBytes, err := base64.RawURLEncoding.DecodeString(payload)
	if err != nil {
		return nil, err
	}

	var claims Claims
	err = json.Unmarshal(payloadBytes, &claims)
	if err != nil {
		return nil, err
	}

	// Check expiry
	if time.Now().Unix() > claims.Exp {
		return nil, errors.New("token expired")
	}

	return &claims, nil
}

// AuthContext holds user information after auth middleware
type AuthContext struct {
	Username string
	Role     string
}

// GetAuth retrieves the AuthContext from request context
func GetAuth(r *http.Request) *AuthContext {
	val := r.Context().Value("auth")
	if val == nil {
		return nil
	}
	if ctx, ok := val.(*AuthContext); ok {
		return ctx
	}
	return nil
}
