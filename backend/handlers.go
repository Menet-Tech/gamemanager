package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
)

// Helper to write JSON responses
func sendJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

// Helper to write error responses
func sendError(w http.ResponseWriter, status int, errMsg string) {
	sendJSON(w, status, map[string]string{"error": errMsg})
}

// Setup CORS headers
func enableCORS(w http.ResponseWriter, r *http.Request) bool {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return true
	}
	return false
}

// AuthMiddleware authenticates requests using JWT
func AuthMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if enableCORS(w, r) {
			return
		}

		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			sendError(w, http.StatusUnauthorized, "unauthorized: missing token")
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			sendError(w, http.StatusUnauthorized, "unauthorized: invalid token format")
			return
		}

		claims, err := ValidateToken(parts[1])
		if err != nil {
			sendError(w, http.StatusUnauthorized, fmt.Sprintf("unauthorized: %v", err))
			return
		}

		// Query database to ensure user still exists and get their ID
		var userID int
		var role string
		var mustChange int
		err = db.QueryRow("SELECT id, role, must_change_password FROM users WHERE username = ?", claims.Username).Scan(&userID, &role, &mustChange)
		if err != nil {
			if err == sql.ErrNoRows {
				sendError(w, http.StatusUnauthorized, "unauthorized: user not found")
			} else {
				sendError(w, http.StatusInternalServerError, "database error")
			}
			return
		}

		// Enforce password change before any other actions
		if mustChange == 1 && r.URL.Path != "/api/me" && r.URL.Path != "/api/me/change-password" && r.URL.Path != "/api/login" {
			sendJSON(w, http.StatusForbidden, map[string]interface{}{
				"error":   "force_change_password",
				"message": "You must change your password before proceeding",
			})
			return
		}

		// Inject into context
		ctx := context.WithValue(r.Context(), "auth", &AuthContext{
			Username: claims.Username,
			Role:     role,
		})
		// Also inject user ID
		ctx = context.WithValue(ctx, "userId", userID)

		next(w, r.WithContext(ctx))
	}
}

// AdminMiddleware restricts access to administrators
func AdminMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// AuthMiddleware should run first
		val := r.Context().Value("auth")
		if val == nil {
			sendError(w, http.StatusUnauthorized, "unauthorized")
			return
		}
		authCtx := val.(*AuthContext)
		if authCtx.Role != "admin" {
			sendError(w, http.StatusForbidden, "forbidden: admin access required")
			return
		}
		next(w, r)
	}
}

// GetUserIDFromRequest retrieves the database user ID from the request context
func GetUserIDFromRequest(r *http.Request) int {
	val := r.Context().Value("userId")
	if val == nil {
		return 0
	}
	return val.(int)
}

// Helper to extract ID from URL path (works on both Go 1.22+ and older versions)
func getPathParamID(r *http.Request, entityName string) (int, error) {
	// Try standard Go 1.22 path value
	if idVal := r.PathValue("id"); idVal != "" {
		return strconv.Atoi(idVal)
	}

	// Manual fallback parsing
	parts := strings.Split(r.URL.Path, "/")
	for i, part := range parts {
		if part == entityName && i+1 < len(parts) {
			val := parts[i+1]
			// Strip any sub-paths (e.g. /config in /api/profiles/123/config)
			if idx := strings.Index(val, "/"); idx != -1 {
				val = val[:idx]
			}
			return strconv.Atoi(val)
		}
	}
	return 0, fmt.Errorf("id parameter not found")
}

// --- AUTH HANDLERS ---

func LoginHandler(w http.ResponseWriter, r *http.Request) {
	if enableCORS(w, r) {
		return
	}
	if r.Method != http.MethodPost {
		sendError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	var storedPassword string
	var role string
	var mustChange int
	err := db.QueryRow("SELECT password, role, must_change_password FROM users WHERE username = ?", req.Username).Scan(&storedPassword, &role, &mustChange)
	if err != nil {
		log.Printf("[SECURITY] Failed login attempt from %s: username '%s' not found", r.RemoteAddr, req.Username)
		time.Sleep(1 * time.Second) // Throttling
		if err == sql.ErrNoRows {
			sendError(w, http.StatusUnauthorized, "invalid username or password")
		} else {
			sendError(w, http.StatusInternalServerError, "database error")
		}
		return
	}

	err = bcrypt.CompareHashAndPassword([]byte(storedPassword), []byte(req.Password))
	if err != nil {
		log.Printf("[SECURITY] Failed login attempt from %s: incorrect password for username '%s'", r.RemoteAddr, req.Username)
		time.Sleep(1 * time.Second) // Throttling
		sendError(w, http.StatusUnauthorized, "invalid username or password")
		return
	}

	token, err := GenerateToken(req.Username, role)
	if err != nil {
		log.Printf("[ERROR] Failed to generate token for %s: %v", req.Username, err)
		sendError(w, http.StatusInternalServerError, "failed to generate token")
		return
	}

	log.Printf("[SECURITY] Successful login from %s for user '%s'", r.RemoteAddr, req.Username)

	sendJSON(w, http.StatusOK, LoginResponse{
		Token:              token,
		Username:           req.Username,
		Role:               role,
		MustChangePassword: mustChange == 1,
	})
}

func GetMeHandler(w http.ResponseWriter, r *http.Request) {
	auth := r.Context().Value("auth").(*AuthContext)
	userID := GetUserIDFromRequest(r)

	var mustChange int
	_ = db.QueryRow("SELECT must_change_password FROM users WHERE id = ?", userID).Scan(&mustChange)

	sendJSON(w, http.StatusOK, map[string]interface{}{
		"id":                 userID,
		"username":           auth.Username,
		"role":               auth.Role,
		"mustChangePassword": mustChange == 1,
	})
}

// --- ADMIN USERS HANDLERS ---

func ManageUsersHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		rows, err := db.Query("SELECT id, username, role, must_change_password FROM users")
		if err != nil {
			sendError(w, http.StatusInternalServerError, "database error")
			return
		}
		defer rows.Close()

		var users []User
		for rows.Next() {
			var u User
			var mustChange int
			if err := rows.Scan(&u.ID, &u.Username, &u.Role, &mustChange); err == nil {
				u.MustChangePassword = mustChange == 1
				users = append(users, u)
			}
		}
		sendJSON(w, http.StatusOK, users)

	case http.MethodPost:
		var u User
		if err := json.NewDecoder(r.Body).Decode(&u); err != nil {
			sendError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		if u.Username == "" || u.Password == "" || (u.Role != "admin" && u.Role != "user") {
			sendError(w, http.StatusBadRequest, "missing or invalid user fields")
			return
		}

		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(u.Password), bcrypt.DefaultCost)
		if err != nil {
			sendError(w, http.StatusInternalServerError, "failed to hash password")
			return
		}

		mustChangeVal := 0
		if u.MustChangePassword {
			mustChangeVal = 1
		}

		res, err := db.Exec("INSERT INTO users (username, password, role, must_change_password) VALUES (?, ?, ?, ?)", u.Username, string(hashedPassword), u.Role, mustChangeVal)
		if err != nil {
			if strings.Contains(err.Error(), "UNIQUE") {
				sendError(w, http.StatusConflict, "username already exists")
			} else {
				sendError(w, http.StatusInternalServerError, "failed to save user")
			}
			return
		}

		lastID, _ := res.LastInsertId()
		u.ID = int(lastID)
		u.Password = ""
		sendJSON(w, http.StatusCreated, u)
	}
}

func UpdateUserPasswordHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		sendError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	id, err := getPathParamID(r, "users")
	if err != nil {
		sendError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	var req ChangePasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Password == "" {
		sendError(w, http.StatusBadRequest, "password cannot be empty")
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		sendError(w, http.StatusInternalServerError, "failed to hash password")
		return
	}

	_, err = db.Exec("UPDATE users SET password = ? WHERE id = ?", string(hashedPassword), id)
	if err != nil {
		sendError(w, http.StatusInternalServerError, "failed to update password")
		return
	}

	sendJSON(w, http.StatusOK, map[string]string{"message": "password updated successfully"})
}

func DeleteUserHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		sendError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	id, err := getPathParamID(r, "users")
	if err != nil {
		sendError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	// Prevent deleting the currently logged-in user
	currentUserID := GetUserIDFromRequest(r)
	if id == currentUserID {
		sendError(w, http.StatusBadRequest, "cannot delete your own account")
		return
	}

	_, err = db.Exec("DELETE FROM users WHERE id = ?", id)
	if err != nil {
		sendError(w, http.StatusInternalServerError, "failed to delete user")
		return
	}

	sendJSON(w, http.StatusOK, map[string]string{"message": "user deleted successfully"})
}

// --- ADMIN HOST SERVERS HANDLERS ---

func ManageHostsHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		rows, err := db.Query("SELECT id, name, ip, port, username, restart_command, version_command, update_command, local_build_command FROM host_servers")
		if err != nil {
			sendError(w, http.StatusInternalServerError, "database error")
			return
		}
		defer rows.Close()

		var hosts []HostServer
		for rows.Next() {
			var h HostServer
			var restartCmd, versionCmd, updateCmd, localBuildCmd sql.NullString
			if err := rows.Scan(&h.ID, &h.Name, &h.IP, &h.Port, &h.Username, &restartCmd, &versionCmd, &updateCmd, &localBuildCmd); err == nil {
				h.RestartCommand = restartCmd.String
				h.VersionCommand = versionCmd.String
				h.UpdateCommand = updateCmd.String
				h.LocalBuildCommand = localBuildCmd.String
				hosts = append(hosts, h)
			}
		}
		sendJSON(w, http.StatusOK, hosts)

	case http.MethodPost:
		var h HostServer
		if err := json.NewDecoder(r.Body).Decode(&h); err != nil {
			sendError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		if h.Name == "" {
			sendError(w, http.StatusBadRequest, "server name is required")
			return
		}

		// Default values for local servers if IP is empty
		if h.IP == "" {
			h.IP = "localhost"
		}
		if h.Port <= 0 {
			h.Port = 22
		}

		res, err := db.Exec("INSERT INTO host_servers (name, ip, port, username, password, restart_command, version_command, update_command, local_build_command) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
			h.Name, h.IP, h.Port, h.Username, h.Password, h.RestartCommand, h.VersionCommand, h.UpdateCommand, h.LocalBuildCommand)
		if err != nil {
			sendError(w, http.StatusInternalServerError, "failed to save host server")
			return
		}

		lastID, _ := res.LastInsertId()
		h.ID = int(lastID)
		h.Password = ""
		sendJSON(w, http.StatusCreated, h)
	}
}

func HostByIDHandler(w http.ResponseWriter, r *http.Request) {
	if enableCORS(w, r) {
		return
	}
	id, err := getPathParamID(r, "hosts")
	if err != nil {
		sendError(w, http.StatusBadRequest, "invalid host id")
		return
	}

	switch r.Method {
	case http.MethodDelete:
		_, err = db.Exec("DELETE FROM host_servers WHERE id = ?", id)
		if err != nil {
			sendError(w, http.StatusInternalServerError, "failed to delete host server")
			return
		}
		sendJSON(w, http.StatusOK, map[string]string{"message": "host server deleted successfully"})

	case http.MethodPut:
		var h HostServer
		if err := json.NewDecoder(r.Body).Decode(&h); err != nil {
			sendError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		if h.Name == "" {
			sendError(w, http.StatusBadRequest, "server name is required")
			return
		}

		// Default values for local servers if IP is empty
		if h.IP == "" {
			h.IP = "localhost"
		}
		if h.Port <= 0 {
			h.Port = 22
		}

		var query string
		var args []interface{}

		if h.Password != "" {
			query = "UPDATE host_servers SET name = ?, ip = ?, port = ?, username = ?, password = ?, restart_command = ?, version_command = ?, update_command = ?, local_build_command = ? WHERE id = ?"
			args = []interface{}{h.Name, h.IP, h.Port, h.Username, h.Password, h.RestartCommand, h.VersionCommand, h.UpdateCommand, h.LocalBuildCommand, id}
		} else {
			query = "UPDATE host_servers SET name = ?, ip = ?, port = ?, username = ?, restart_command = ?, version_command = ?, update_command = ?, local_build_command = ? WHERE id = ?"
			args = []interface{}{h.Name, h.IP, h.Port, h.Username, h.RestartCommand, h.VersionCommand, h.UpdateCommand, h.LocalBuildCommand, id}
		}

		_, err = db.Exec(query, args...)
		if err != nil {
			sendError(w, http.StatusInternalServerError, "failed to update host server")
			return
		}

		h.ID = id
		h.Password = ""
		sendJSON(w, http.StatusOK, h)

	default:
		sendError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

// --- ADMIN GAME PROFILES HANDLERS ---

func ManageProfilesHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		query := `
			SELECT p.id, p.name, p.game_type, p.host_id, p.config_path, h.name as host_name
			FROM game_profiles p
			LEFT JOIN host_servers h ON p.host_id = h.id
		`
		rows, err := db.Query(query)
		if err != nil {
			sendError(w, http.StatusInternalServerError, "database error")
			return
		}
		defer rows.Close()

		var profiles []GameProfile
		for rows.Next() {
			var p GameProfile
			var hostName sql.NullString
			if err := rows.Scan(&p.ID, &p.Name, &p.GameType, &p.HostID, &p.ConfigPath, &hostName); err == nil {
				if hostName.Valid {
					p.HostName = hostName.String
				} else {
					p.HostName = "Local System"
				}
				profiles = append(profiles, p)
			}
		}
		sendJSON(w, http.StatusOK, profiles)

	case http.MethodPost:
		var p GameProfile
		if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
			sendError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		if p.Name == "" || p.GameType == "" || p.ConfigPath == "" {
			sendError(w, http.StatusBadRequest, "missing profile name, game type, or config path")
			return
		}

		res, err := db.Exec("INSERT INTO game_profiles (name, game_type, host_id, config_path) VALUES (?, ?, ?, ?)",
			p.Name, p.GameType, p.HostID, p.ConfigPath)
		if err != nil {
			sendError(w, http.StatusInternalServerError, "failed to save game profile")
			return
		}

		lastID, _ := res.LastInsertId()
		p.ID = int(lastID)
		sendJSON(w, http.StatusCreated, p)
	}
}

func ProfileByIDHandler(w http.ResponseWriter, r *http.Request) {
	if enableCORS(w, r) {
		return
	}
	id, err := getPathParamID(r, "profiles")
	if err != nil {
		sendError(w, http.StatusBadRequest, "invalid profile id")
		return
	}

	switch r.Method {
	case http.MethodDelete:
		_, err = db.Exec("DELETE FROM game_profiles WHERE id = ?", id)
		if err != nil {
			sendError(w, http.StatusInternalServerError, "failed to delete game profile")
			return
		}
		sendJSON(w, http.StatusOK, map[string]string{"message": "game profile deleted successfully"})

	case http.MethodPut:
		var p GameProfile
		if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
			sendError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		if p.Name == "" || p.GameType == "" || p.ConfigPath == "" {
			sendError(w, http.StatusBadRequest, "missing profile name, game type, or config path")
			return
		}

		_, err = db.Exec("UPDATE game_profiles SET name = ?, game_type = ?, host_id = ?, config_path = ? WHERE id = ?",
			p.Name, p.GameType, p.HostID, p.ConfigPath, id)
		if err != nil {
			sendError(w, http.StatusInternalServerError, "failed to update game profile")
			return
		}

		p.ID = id
		sendJSON(w, http.StatusOK, p)

	default:
		sendError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

// --- ADMIN USER PROFILE LINKING HANDLERS ---

type LinkRequest struct {
	UserID    int `json:"userId"`
	ProfileID int `json:"profileId"`
}

type UserProfileLink struct {
	UserID      int    `json:"userId"`
	Username    string `json:"username"`
	ProfileID   int    `json:"profileId"`
	ProfileName string `json:"profileName"`
}

func ManageUserProfilesHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		query := `
			SELECT up.user_id, u.username, up.profile_id, p.name as profile_name
			FROM user_profiles up
			JOIN users u ON up.user_id = u.id
			JOIN game_profiles p ON up.profile_id = p.id
		`
		rows, err := db.Query(query)
		if err != nil {
			sendError(w, http.StatusInternalServerError, "database error")
			return
		}
		defer rows.Close()

		var links []UserProfileLink
		for rows.Next() {
			var link UserProfileLink
			if err := rows.Scan(&link.UserID, &link.Username, &link.ProfileID, &link.ProfileName); err == nil {
				links = append(links, link)
			}
		}
		sendJSON(w, http.StatusOK, links)

	case http.MethodPost:
		var req LinkRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			sendError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		if req.UserID <= 0 || req.ProfileID <= 0 {
			sendError(w, http.StatusBadRequest, "missing userId or profileId")
			return
		}

		_, err := db.Exec("INSERT INTO user_profiles (user_id, profile_id) VALUES (?, ?)", req.UserID, req.ProfileID)
		if err != nil {
			if strings.Contains(err.Error(), "UNIQUE") || strings.Contains(err.Error(), "constraint") {
				sendError(w, http.StatusConflict, "link already exists")
			} else {
				sendError(w, http.StatusInternalServerError, "failed to link profile to user")
			}
			return
		}

		sendJSON(w, http.StatusCreated, map[string]string{"message": "profile linked to user successfully"})
	}
}

func UnlinkUserProfileHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		sendError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	userIdStr := r.URL.Query().Get("userId")
	profileIdStr := r.URL.Query().Get("profileId")

	userId, err1 := strconv.Atoi(userIdStr)
	profileId, err2 := strconv.Atoi(profileIdStr)

	if err1 != nil || err2 != nil {
		sendError(w, http.StatusBadRequest, "invalid userId or profileId parameters")
		return
	}

	_, err := db.Exec("DELETE FROM user_profiles WHERE user_id = ? AND profile_id = ?", userId, profileId)
	if err != nil {
		sendError(w, http.StatusInternalServerError, "failed to unlink profile")
		return
	}

	sendJSON(w, http.StatusOK, map[string]string{"message": "profile unlinked successfully"})
}

// --- USER PROFILE AND CONFIG HANDLERS ---

func GetMyProfilesHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		sendError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	auth := r.Context().Value("auth").(*AuthContext)
	userID := GetUserIDFromRequest(r)

	var query string
	var args []interface{}

	if auth.Role == "admin" {
		// Admins can see all profiles
		query = `
			SELECT p.id, p.name, p.game_type, p.host_id, p.config_path, h.name as host_name
			FROM game_profiles p
			LEFT JOIN host_servers h ON p.host_id = h.id
		`
	} else {
		// Users can only see assigned profiles
		query = `
			SELECT p.id, p.name, p.game_type, p.host_id, p.config_path, h.name as host_name
			FROM game_profiles p
			JOIN user_profiles up ON p.id = up.profile_id
			LEFT JOIN host_servers h ON p.host_id = h.id
			WHERE up.user_id = ?
		`
		args = append(args, userID)
	}

	rows, err := db.Query(query, args...)
	if err != nil {
		sendError(w, http.StatusInternalServerError, "database error")
		return
	}
	defer rows.Close()

	var profiles []GameProfile
	for rows.Next() {
		var p GameProfile
		var hostName sql.NullString
		if err := rows.Scan(&p.ID, &p.Name, &p.GameType, &p.HostID, &p.ConfigPath, &hostName); err == nil {
			if hostName.Valid {
				p.HostName = hostName.String
			} else {
				p.HostName = "Local System"
			}
			profiles = append(profiles, p)
		}
	}
	sendJSON(w, http.StatusOK, profiles)
}

// Helper to check profile access permission
func hasProfileAccess(userID int, role string, profileID int) (bool, error) {
	if role == "admin" {
		return true, nil
	}
	var count int
	err := db.QueryRow("SELECT COUNT(*) FROM user_profiles WHERE user_id = ? AND profile_id = ?", userID, profileID).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// Helper to get profile and its host details
func getProfileAndHost(profileID int) (*GameProfile, *HostServer, error) {
	var p GameProfile
	var h HostServer
	var hostID sql.NullInt64
	var hostName, hostIP, hostUser, hostPass, hostRestartCmd, hostVersionCmd, hostUpdateCmd, hostLocalBuildCmd sql.NullString
	var hostPort sql.NullInt64

	query := `
		SELECT p.id, p.name, p.game_type, p.host_id, p.config_path, 
		       h.id, h.name, h.ip, h.port, h.username, h.password, h.restart_command, h.version_command, h.update_command, h.local_build_command
		FROM game_profiles p
		LEFT JOIN host_servers h ON p.host_id = h.id
		WHERE p.id = ?
	`
	err := db.QueryRow(query, profileID).Scan(
		&p.ID, &p.Name, &p.GameType, &hostID, &p.ConfigPath,
		&h.ID, &hostName, &hostIP, &hostPort, &hostUser, &hostPass, &hostRestartCmd, &hostVersionCmd, &hostUpdateCmd, &hostLocalBuildCmd,
	)
	if err != nil {
		return nil, nil, err
	}

	if hostID.Valid {
		p.HostID = int(hostID.Int64)
		h.ID = int(hostID.Int64)
		h.Name = hostName.String
		h.IP = hostIP.String
		h.Port = int(hostPort.Int64)
		h.Username = hostUser.String
		h.Password = hostPass.String
		h.RestartCommand = hostRestartCmd.String
		h.VersionCommand = hostVersionCmd.String
		h.UpdateCommand = hostUpdateCmd.String
		h.LocalBuildCommand = hostLocalBuildCmd.String
		return &p, &h, nil
	}

	// No host linked means local server file
	return &p, nil, nil
}

func ManageConfigHandler(w http.ResponseWriter, r *http.Request) {
	profileID, err := getPathParamID(r, "profiles")
	if err != nil {
		sendError(w, http.StatusBadRequest, "invalid profile id")
		return
	}

	auth := r.Context().Value("auth").(*AuthContext)
	userID := GetUserIDFromRequest(r)

	// 1. Verify access
	allowed, err := hasProfileAccess(userID, auth.Role, profileID)
	if err != nil {
		sendError(w, http.StatusInternalServerError, "database error")
		return
	}
	if !allowed {
		sendError(w, http.StatusForbidden, "forbidden: you do not have access to this game profile")
		return
	}

	// 2. Fetch profile and host details
	profile, host, err := getProfileAndHost(profileID)
	if err != nil {
		if err == sql.ErrNoRows {
			sendError(w, http.StatusNotFound, "profile not found")
		} else {
			sendError(w, http.StatusInternalServerError, "database error")
		}
		return
	}

	switch r.Method {
	case http.MethodGet:
		// Read configuration file
		rawContent, err := ReadFileContent(host, profile.ConfigPath)
		if err != nil {
			sendError(w, http.StatusInternalServerError, fmt.Sprintf("failed to read config file: %v", err))
			return
		}

		var responseData map[string]interface{}
		// If Palworld, parse config cleanly
		if strings.ToLower(profile.GameType) == "palworld" {
			parsed, err := ParsePalworldSettings(rawContent)
			if err != nil {
				// Send raw content anyway, flagging parser error
				responseData = map[string]interface{}{
					"raw":         rawContent,
					"isParsed":    false,
					"parserError": err.Error(),
				}
			} else {
				responseData = map[string]interface{}{
					"raw":      rawContent,
					"isParsed": true,
					"settings": parsed,
				}
			}
		} else {
			// Other games just get raw editor
			responseData = map[string]interface{}{
				"raw":      rawContent,
				"isParsed": false,
			}
		}

		sendJSON(w, http.StatusOK, responseData)

	case http.MethodPost:
		// Save configuration file
		var req struct {
			Raw      string            `json:"raw"`
			Settings map[string]string `json:"settings"` // Replaces OptionSettings keys
			IsParsed bool              `json:"isParsed"`
		}

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			sendError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		var newContent string

		// If it was parsed and we have settings, generate updated config in place
		if req.IsParsed && strings.ToLower(profile.GameType) == "palworld" && len(req.Settings) > 0 {
			// We need original raw first to insert the changes
			originalRaw, err := ReadFileContent(host, profile.ConfigPath)
			if err != nil {
				sendError(w, http.StatusInternalServerError, fmt.Sprintf("failed to read original config file: %v", err))
				return
			}

			newContent, err = GeneratePalworldConfig(originalRaw, req.Settings)
			if err != nil {
				sendError(w, http.StatusInternalServerError, fmt.Sprintf("failed to generate updated config: %v", err))
				return
			}
		} else {
			// Raw edit write back
			newContent = req.Raw
		}

		// Write configuration file back to server
		err = WriteFileContent(host, profile.ConfigPath, newContent)
		if err != nil {
			sendError(w, http.StatusInternalServerError, fmt.Sprintf("failed to save config file: %v", err))
			return
		}

		// Execute restart command if configured
		restartMessage := ""
		if host != nil && host.RestartCommand != "" {
			output, err := ExecuteCommand(host, host.RestartCommand)
			if err != nil {
				log.Printf("[ERROR] Restart command failed: %v, output: %s", err, output)
				restartMessage = " (but failed to restart: " + err.Error() + ")"
			} else {
				restartMessage = " and server restarted successfully"
			}
		}

		sendJSON(w, http.StatusOK, map[string]string{
			"message": "Configuration saved successfully" + restartMessage,
		})
	}
}

// ChangeOwnPasswordHandler allows users to change their own password
func ChangeOwnPasswordHandler(w http.ResponseWriter, r *http.Request) {
	if enableCORS(w, r) {
		return
	}
	if r.Method != http.MethodPost {
		sendError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	userID := GetUserIDFromRequest(r)
	if userID <= 0 {
		sendError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req ChangePasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.OldPassword == "" {
		sendError(w, http.StatusBadRequest, "current password is required")
		return
	}

	if req.Password == "" {
		sendError(w, http.StatusBadRequest, "new password cannot be empty")
		return
	}

	// Fetch current password hash from DB
	var currentHash string
	err := db.QueryRow("SELECT password FROM users WHERE id = ?", userID).Scan(&currentHash)
	if err != nil {
		sendError(w, http.StatusInternalServerError, "database error")
		return
	}

	// Verify old password
	err = bcrypt.CompareHashAndPassword([]byte(currentHash), []byte(req.OldPassword))
	if err != nil {
		log.Printf("[SECURITY] Failed password change attempt for user ID %d: incorrect old password", userID)
		sendError(w, http.StatusBadRequest, "current password is incorrect")
		return
	}

	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		sendError(w, http.StatusInternalServerError, "failed to hash password")
		return
	}

	_, err = db.Exec("UPDATE users SET password = ?, must_change_password = 0 WHERE id = ?", string(hashedPassword), userID)
	if err != nil {
		sendError(w, http.StatusInternalServerError, "failed to update password")
		return
	}

	log.Printf("[SECURITY] User ID %d successfully changed their password", userID)
	sendJSON(w, http.StatusOK, map[string]string{"message": "password changed successfully"})
}

// RestartProfileServerHandler executes a manual restart command for a host linked to a game profile
func RestartProfileServerHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		sendError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	profileID, err := getPathParamID(r, "profiles")
	if err != nil {
		sendError(w, http.StatusBadRequest, "invalid profile id")
		return
	}

	auth := r.Context().Value("auth").(*AuthContext)
	userID := GetUserIDFromRequest(r)

	// 1. Verify access
	allowed, err := hasProfileAccess(userID, auth.Role, profileID)
	if err != nil {
		sendError(w, http.StatusInternalServerError, "database error")
		return
	}
	if !allowed {
		sendError(w, http.StatusForbidden, "forbidden: you do not have access to this game profile")
		return
	}

	// 2. Fetch profile and host details
	_, host, err := getProfileAndHost(profileID)
	if err != nil {
		if err == sql.ErrNoRows {
			sendError(w, http.StatusNotFound, "profile not found")
		} else {
			sendError(w, http.StatusInternalServerError, "database error")
		}
		return
	}

	if host == nil {
		sendError(w, http.StatusBadRequest, "no host server configured for this profile")
		return
	}

	if host.RestartCommand == "" {
		sendError(w, http.StatusBadRequest, "no restart command configured for this host server")
		return
	}

	// 3. Execute restart command
	output, err := ExecuteCommand(host, host.RestartCommand)
	if err != nil {
		log.Printf("[ERROR] Manual restart command failed: %v, output: %s", err, output)
		sendError(w, http.StatusInternalServerError, "failed to restart server: "+err.Error())
		return
	}

	sendJSON(w, http.StatusOK, map[string]string{"message": "Server restarted successfully!"})
}

// GetProfileVersionHandler returns the running version of the profile server
func GetProfileVersionHandler(w http.ResponseWriter, r *http.Request) {
	if enableCORS(w, r) {
		return
	}
	if r.Method != http.MethodGet {
		sendError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	profileID, err := getPathParamID(r, "profiles")
	if err != nil {
		sendError(w, http.StatusBadRequest, "invalid profile id")
		return
	}

	auth := r.Context().Value("auth").(*AuthContext)
	userID := GetUserIDFromRequest(r)

	allowed, err := hasProfileAccess(userID, auth.Role, profileID)
	if err != nil {
		sendError(w, http.StatusInternalServerError, "database error")
		return
	}
	if !allowed {
		sendError(w, http.StatusForbidden, "forbidden")
		return
	}

	_, host, err := getProfileAndHost(profileID)
	if err != nil {
		sendError(w, http.StatusInternalServerError, "database error")
		return
	}

	if host == nil {
		host = &HostServer{IP: "localhost"}
	}

	if host.VersionCommand == "" {
		sendJSON(w, http.StatusOK, map[string]string{"version": "Version command not configured"})
		return
	}

	output, err := ExecuteCommand(host, host.VersionCommand)
	if err != nil {
		log.Printf("[ERROR] Failed to run version command for host %s (IP: %s): %v, output: %s", host.Name, host.IP, err, output)
		sendJSON(w, http.StatusOK, map[string]string{"version": "Failed to run version command"})
		return
	}

	version := parseVersion(output)
	sendJSON(w, http.StatusOK, map[string]string{"version": version})
}

// CheckProfileUpdateHandler checks if a game server update is available
func CheckProfileUpdateHandler(w http.ResponseWriter, r *http.Request) {
	if enableCORS(w, r) {
		return
	}
	if r.Method != http.MethodGet {
		sendError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	profileID, err := getPathParamID(r, "profiles")
	if err != nil {
		sendError(w, http.StatusBadRequest, "invalid profile id")
		return
	}

	auth := r.Context().Value("auth").(*AuthContext)
	userID := GetUserIDFromRequest(r)

	allowed, err := hasProfileAccess(userID, auth.Role, profileID)
	if err != nil {
		sendError(w, http.StatusInternalServerError, "database error")
		return
	}
	if !allowed {
		sendError(w, http.StatusForbidden, "forbidden")
		return
	}

	_, host, err := getProfileAndHost(profileID)
	if err != nil {
		sendError(w, http.StatusInternalServerError, "database error")
		return
	}

	if host == nil {
		host = &HostServer{IP: "localhost"}
	}

	// 1. Fetch latest build ID from SteamCMD API
	latestBuild := "Unknown"
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Get("https://api.steamcmd.net/v1/info/2394010")
	if err == nil {
		defer resp.Body.Close()
		var steamInfo SteamCMDInfo
		if err := json.NewDecoder(resp.Body).Decode(&steamInfo); err == nil {
			if data, ok := steamInfo.Data["2394010"]; ok {
				latestBuild = data.Depots.Branches.Public.BuildID
			}
		}
	}

	// 2. Fetch local build ID from server
	localBuild, err := getLocalBuildID(host)
	if err != nil {
		log.Printf("[INFO] Could not retrieve local build ID: %v", err)
		localBuild = "Unknown"
	}

	updateAvailable := false
	if latestBuild != "Unknown" && localBuild != "Unknown" && latestBuild != localBuild {
		updateAvailable = true
	} else if latestBuild != "Unknown" && localBuild == "Unknown" {
		// If we can't find local manifest, assume we can check or prompt anyway
		updateAvailable = true
	}

	sendJSON(w, http.StatusOK, map[string]interface{}{
		"updateAvailable": updateAvailable,
		"localBuild":      localBuild,
		"latestBuild":     latestBuild,
	})
}

// UpdateProfileServerHandler runs the update command on the host
func UpdateProfileServerHandler(w http.ResponseWriter, r *http.Request) {
	if enableCORS(w, r) {
		return
	}
	if r.Method != http.MethodPost {
		sendError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	profileID, err := getPathParamID(r, "profiles")
	if err != nil {
		sendError(w, http.StatusBadRequest, "invalid profile id")
		return
	}

	auth := r.Context().Value("auth").(*AuthContext)
	userID := GetUserIDFromRequest(r)

	allowed, err := hasProfileAccess(userID, auth.Role, profileID)
	if err != nil {
		sendError(w, http.StatusInternalServerError, "database error")
		return
	}
	if !allowed {
		sendError(w, http.StatusForbidden, "forbidden")
		return
	}

	_, host, err := getProfileAndHost(profileID)
	if err != nil {
		sendError(w, http.StatusInternalServerError, "database error")
		return
	}

	if host == nil {
		host = &HostServer{IP: "localhost"}
	}

	if host.UpdateCommand == "" {
		sendError(w, http.StatusBadRequest, "Update command not configured for this server")
		return
	}

	// Run update synchronously
	log.Printf("[INFO] Running update for profile %d using command: %s", profileID, host.UpdateCommand)
	output, err := ExecuteCommand(host, host.UpdateCommand)
	if err != nil {
		log.Printf("[ERROR] Server update failed: %v, output: %s", err, output)
		sendError(w, http.StatusInternalServerError, "Failed to update server: "+err.Error())
		return
	}

	sendJSON(w, http.StatusOK, map[string]string{"message": "Server updated successfully!"})
}

type SteamCMDInfo struct {
	Data map[string]struct {
		Depots struct {
			Branches struct {
				Public struct {
					BuildID string `json:"buildid"`
				} `json:"public"`
			} `json:"branches"`
		} `json:"depots"`
	} `json:"data"`
}

func parseVersion(output string) string {
	lines := strings.Split(output, "\n")
	for _, line := range lines {
		idx := strings.Index(strings.ToLower(line), "game version is")
		if idx >= 0 {
			ver := line[idx:]
			return strings.TrimSpace(ver)
		}
	}
	for i := len(lines) - 1; i >= 0; i-- {
		trimmed := strings.TrimSpace(lines[i])
		if trimmed != "" {
			if len(trimmed) > 50 {
				return trimmed[:50] + "..."
			}
			return trimmed
		}
	}
	return "Unknown"
}

func getLocalBuildID(host *HostServer) (string, error) {
	if host != nil && host.LocalBuildCommand != "" {
		output, err := ExecuteCommand(host, host.LocalBuildCommand)
		if err != nil {
			return "", fmt.Errorf("failed to run custom local build command: %v", err)
		}
		if output != "" {
			return parseBuildID(output), nil
		}
		return "", fmt.Errorf("custom local build command returned empty output")
	}

	if isLocal(host) {
		paths := []string{
			"C:\\steamcmd\\steamapps\\appmanifest_2394010.acf",
			"C:\\Program Files (x86)\\Steam\\steamapps\\appmanifest_2394010.acf",
		}
		if home, err := os.UserHomeDir(); err == nil {
			paths = append(paths, filepath.Join(home, "Steam", "steamapps", "appmanifest_2394010.acf"))
			paths = append(paths, filepath.Join(home, ".steam", "steam", "steamapps", "appmanifest_2394010.acf"))
			paths = append(paths, filepath.Join(home, "steamcmd", "steamapps", "appmanifest_2394010.acf"))
		}
		for _, p := range paths {
			if _, err := os.Stat(p); err == nil {
				content, err := os.ReadFile(p)
				if err == nil {
					return parseBuildID(string(content)), nil
				}
			}
		}
	}

	cmd := "find /home/steam /home /opt ~ -name appmanifest_2394010.acf 2>/dev/null | head -n 1 | xargs grep buildid"
	output, err := ExecuteCommand(host, cmd)
	if err != nil || output == "" {
		cmd = "find / -name appmanifest_2394010.acf 2>/dev/null | head -n 1 | xargs grep buildid"
		output, _ = ExecuteCommand(host, cmd)
	}

	if output != "" {
		return parseBuildID(output), nil
	}

	return "", fmt.Errorf("local appmanifest not found")
}

func parseBuildID(content string) string {
	lines := strings.Split(content, "\n")
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" {
			continue
		}

		// 1. Check if the line consists entirely of digits (Format 2: e.g. custom command output)
		isOnlyDigits := true
		var digits []rune
		for _, r := range trimmed {
			if r >= '0' && r <= '9' {
				digits = append(digits, r)
			} else if r != '\r' {
				isOnlyDigits = false
			}
		}
		if isOnlyDigits && len(digits) > 0 {
			return string(digits)
		}

		// 2. Check if the line contains the "buildid" keyword (Format 1: e.g. raw ACF file line)
		if strings.Contains(strings.ToLower(trimmed), "buildid") {
			var digits2 []rune
			for _, r := range trimmed {
				if r >= '0' && r <= '9' {
					digits2 = append(digits2, r)
				}
			}
			if len(digits2) > 0 {
				return string(digits2)
			}
		}
	}
	return ""
}
