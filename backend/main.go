package main

import (
	"log"
	"net/http"
	"os"
)

func main() {
	db := connectDB()
	defer db.Close()

	allowedOrigin := os.Getenv("ALLOWED_ORIGIN")
	if allowedOrigin == "" {
		allowedOrigin = "*"
	}

	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/register", handleRegister(db))
	mux.HandleFunc("GET /api/users/check", handleCheckEmail(db))
	mux.HandleFunc("POST /api/login", handleLogin(db))
	mux.HandleFunc("POST /api/checkout", handleCheckout(db))
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("listening on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, corsMiddleware(allowedOrigin, mux)))
}
