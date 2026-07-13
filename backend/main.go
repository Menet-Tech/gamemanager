package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
)

func main() {
	// 1. Initialize SQLite Database
	initDB()
	defer db.Close()

	// 2. Setup standard ServeMux router
	mux := http.NewServeMux()

	// Public Routes
	mux.HandleFunc("/api/login", LoginHandler)

	// User Routes (require authentication)
	mux.HandleFunc("/api/me", AuthMiddleware(GetMeHandler))
	mux.HandleFunc("/api/me/change-password", AuthMiddleware(ChangeOwnPasswordHandler))
	mux.HandleFunc("/api/profiles", AuthMiddleware(GetMyProfilesHandler)) // List user's profiles
	mux.HandleFunc("/api/profiles/", AuthMiddleware(ManageConfigHandler))  // Read/Save config for profile: /api/profiles/{id}/config

	// Admin Routes (require admin privileges)
	mux.HandleFunc("/api/admin/users", AuthMiddleware(AdminMiddleware(ManageUsersHandler)))
	mux.HandleFunc("/api/admin/users/", AuthMiddleware(AdminMiddleware(func(w http.ResponseWriter, r *http.Request) {
		// Route users/ID/password and users/ID
		if r.Method == http.MethodPut && strings.Contains(r.URL.Path, "/password") {
			UpdateUserPasswordHandler(w, r)
		} else if r.Method == http.MethodDelete {
			DeleteUserHandler(w, r)
		} else {
			sendError(w, http.StatusMethodNotAllowed, "method not allowed")
		}
	})))

	mux.HandleFunc("/api/admin/hosts", AuthMiddleware(AdminMiddleware(ManageHostsHandler)))
	mux.HandleFunc("/api/admin/hosts/", AuthMiddleware(AdminMiddleware(DeleteHostHandler)))

	mux.HandleFunc("/api/admin/profiles", AuthMiddleware(AdminMiddleware(ManageProfilesHandler)))
	mux.HandleFunc("/api/admin/profiles/", AuthMiddleware(AdminMiddleware(DeleteProfileHandler)))

	mux.HandleFunc("/api/admin/user-profiles", AuthMiddleware(AdminMiddleware(ManageUserProfilesHandler)))
	mux.HandleFunc("/api/admin/user-profiles/", AuthMiddleware(AdminMiddleware(UnlinkUserProfileHandler)))

	// 3. Serve Frontend Static Files (Vite Production Build)
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/api/") {
			http.NotFound(w, r)
			return
		}

		// Check folder location
		distDir := "../frontend/dist"
		if _, err := os.Stat(distDir); os.IsNotExist(err) {
			distDir = "./frontend/dist"
		}

		path := r.URL.Path
		if strings.Contains(path, "..") {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}

		// If it's a file request (has file extension), serve the static file
		if strings.Contains(path, ".") {
			http.FileServer(http.Dir(distDir)).ServeHTTP(w, r)
			return
		}

		// Otherwise fallback to index.html to support React Router SPA navigation
		http.ServeFile(w, r, distDir+"/index.html")
	})

	// Global HTTP middleware wrapper for logging and CORS
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Handle CORS preflight globally
		if enableCORS(w, r) {
			return
		}
		log.Printf("%s %s %s", r.RemoteAddr, r.Method, r.URL.Path)
		mux.ServeHTTP(w, r)
	})

	port := 8010
	fmt.Printf("Game Configuration Manager Backend running on port %d...\n", port)
	err := http.ListenAndServe(fmt.Sprintf(":%d", port), handler)
	if err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}

// A simple string helper for routing
func stringsContains(s, sub string) bool {
	return strings.Index(s, sub) >= 0
}
