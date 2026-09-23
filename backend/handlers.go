package main

import (
	"crypto/rand"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"regexp"
	"strings"
)

var emailRe = regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)

func writeJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, errorResponse{Error: msg})
}

// generateOTP returns a random 6-digit numeric code, zero-padded.
func generateOTP() (string, error) {
	max := int64(1000000)
	b := make([]byte, 4)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	n := (int64(b[0])<<24 | int64(b[1])<<16 | int64(b[2])<<8 | int64(b[3])) % max
	if n < 0 {
		n = -n
	}
	return fmt.Sprintf("%06d", n), nil
}

// handleRegister creates a new user and returns their one-time login code.
func handleRegister(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req registerRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		req.Email = strings.TrimSpace(strings.ToLower(req.Email))
		req.FirstName = strings.TrimSpace(req.FirstName)
		req.LastName = strings.TrimSpace(req.LastName)

		if !emailRe.MatchString(req.Email) || req.FirstName == "" || req.LastName == "" {
			writeError(w, http.StatusBadRequest, "email, firstName and lastName are required")
			return
		}

		code, err := generateOTP()
		if err != nil {
			log.Println("otp generation failed:", err)
			writeError(w, http.StatusInternalServerError, "could not generate code")
			return
		}

		_, err = db.Exec(
			`INSERT INTO users (email, first_name, last_name, otp_code) VALUES ($1, $2, $3, $4)`,
			req.Email, req.FirstName, req.LastName, code,
		)
		if err != nil {
			if strings.Contains(err.Error(), "duplicate key") {
				writeError(w, http.StatusConflict, "an account with this email already exists")
				return
			}
			log.Println("insert user failed:", err)
			writeError(w, http.StatusInternalServerError, "could not register user")
			return
		}

		writeJSON(w, http.StatusCreated, registerResponse{Code: code})
	}
}

// handleCheckEmail reports whether an email belongs to a registered user,
// without revealing any other account details.
func handleCheckEmail(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		email := strings.TrimSpace(strings.ToLower(r.URL.Query().Get("email")))
		if !emailRe.MatchString(email) {
			writeError(w, http.StatusBadRequest, "a valid email query param is required")
			return
		}

		var exists bool
		err := db.QueryRow(`SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)`, email).Scan(&exists)
		if err != nil {
			log.Println("check email failed:", err)
			writeError(w, http.StatusInternalServerError, "could not check email")
			return
		}

		writeJSON(w, http.StatusOK, checkResponse{Registered: exists})
	}
}

// handleLogin validates a submitted code against the one issued at registration.
func handleLogin(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req loginRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		email := strings.TrimSpace(strings.ToLower(req.Email))
		code := strings.TrimSpace(req.Code)

		var firstName, lastName, storedCode string
		err := db.QueryRow(
			`SELECT first_name, last_name, otp_code FROM users WHERE email = $1`, email,
		).Scan(&firstName, &lastName, &storedCode)

		if err == sql.ErrNoRows {
			writeJSON(w, http.StatusOK, loginResponse{Success: false, Message: "No account found for this email"})
			return
		}
		if err != nil {
			log.Println("login lookup failed:", err)
			writeError(w, http.StatusInternalServerError, "could not verify code")
			return
		}

		if code == "" || code != storedCode {
			writeJSON(w, http.StatusOK, loginResponse{Success: false, Message: "That code doesn't match. Try again."})
			return
		}

		writeJSON(w, http.StatusOK, loginResponse{Success: true, FirstName: firstName, LastName: lastName})
	}
}

// handleCheckout records a checkout submission. No real payment processing occurs.
func handleCheckout(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req checkoutRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		email := strings.TrimSpace(strings.ToLower(req.Email))
		phone := strings.TrimSpace(req.Phone)
		address := strings.TrimSpace(req.ShippingAddress)

		if !emailRe.MatchString(email) || phone == "" || address == "" {
			writeError(w, http.StatusBadRequest, "email, phone and shippingAddress are required")
			return
		}

		var userID sql.NullInt64
		_ = db.QueryRow(`SELECT id FROM users WHERE email = $1`, email).Scan(&userID)

		var id int
		err := db.QueryRow(
			`INSERT INTO checkout_submissions (user_id, email, phone, shipping_address, logged_in)
			 VALUES ($1, $2, $3, $4, $5) RETURNING id`,
			userID, email, phone, address, req.LoggedIn,
		).Scan(&id)
		if err != nil {
			log.Println("insert checkout failed:", err)
			writeError(w, http.StatusInternalServerError, "could not save checkout")
			return
		}

		writeJSON(w, http.StatusCreated, checkoutResponse{Success: true, ID: id})
	}
}

// corsMiddleware allows the frontend (hosted on a different origin) to call the API.
func corsMiddleware(allowedOrigin string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
