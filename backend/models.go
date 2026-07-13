package main

// User represents a user account
type User struct {
	ID                 int    `json:"id"`
	Username           string `json:"username"`
	Password           string `json:"password,omitempty"` // omitempty so we don't send hashes back
	Role               string `json:"role"`               // 'admin' or 'user'
	MustChangePassword bool   `json:"mustChangePassword"` // Force password change on first login
}

// HostServer represents a server where games are hosted
type HostServer struct {
	ID       int    `json:"id"`
	Name     string `json:"name"`
	IP       string `json:"ip"`
	Port     int    `json:"port"`
	Username string `json:"username"`
	Password string `json:"password,omitempty"` // SSH Password
}

// GameProfile represents a game configuration profile
type GameProfile struct {
	ID         int    `json:"id"`
	Name       string `json:"name"`
	GameType   string `json:"gameType"` // e.g. "Palworld"
	HostID     int    `json:"hostId"`
	HostName   string `json:"hostName,omitempty"` // Joined from HostServer for UI
	ConfigPath string `json:"configPath"`
}

// UserProfile represents the many-to-many relationship
type UserProfile struct {
	UserID    int `json:"userId"`
	ProfileID int `json:"profileId"`
}

// LoginRequest represents login payload
type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// LoginResponse represents login response
type LoginResponse struct {
	Token              string `json:"token"`
	Username           string `json:"username"`
	Role               string `json:"role"`
	MustChangePassword bool   `json:"mustChangePassword"`
}

// ChangePasswordRequest is for updating a user's password
type ChangePasswordRequest struct {
	OldPassword string `json:"oldPassword,omitempty"`
	Password    string `json:"password"`
}
