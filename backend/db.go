package main

import (
	"database/sql"
	"fmt"
	"log"

	_ "modernc.org/sqlite"
	"golang.org/x/crypto/bcrypt"
)

var db *sql.DB

func initDB() {
	var err error
	db, err = sql.Open("sqlite", "data.db")
	if err != nil {
		log.Fatalf("Failed to open database: %v", err)
	}

	// Create tables
	queries := []string{
		`CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			username TEXT UNIQUE,
			password TEXT,
			role TEXT,
			must_change_password INTEGER DEFAULT 0
		);`,
		`CREATE TABLE IF NOT EXISTS host_servers (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT,
			ip TEXT,
			port INTEGER,
			username TEXT,
			password TEXT,
			restart_command TEXT,
			version_command TEXT,
			update_command TEXT
		);`,
		`CREATE TABLE IF NOT EXISTS game_profiles (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT,
			game_type TEXT,
			host_id INTEGER,
			config_path TEXT,
			steam_app_id INTEGER,
			FOREIGN KEY(host_id) REFERENCES host_servers(id) ON DELETE CASCADE
		);`,
		`CREATE TABLE IF NOT EXISTS user_profiles (
			user_id INTEGER,
			profile_id INTEGER,
			PRIMARY KEY (user_id, profile_id),
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
			FOREIGN KEY (profile_id) REFERENCES game_profiles(id) ON DELETE CASCADE
		);`,
	}

	for _, q := range queries {
		_, err := db.Exec(q)
		if err != nil {
			log.Fatalf("Failed to create table: %v\nQuery: %s", err, q)
		}
	}

	// Safely alter existing table to add must_change_password column if it doesn't exist
	_, _ = db.Exec("ALTER TABLE users ADD COLUMN must_change_password INTEGER DEFAULT 0")
	_, _ = db.Exec("ALTER TABLE host_servers ADD COLUMN restart_command TEXT")
	_, _ = db.Exec("ALTER TABLE host_servers ADD COLUMN version_command TEXT")
	_, _ = db.Exec("ALTER TABLE host_servers ADD COLUMN update_command TEXT")
	_, _ = db.Exec("ALTER TABLE game_profiles ADD COLUMN steam_app_id INTEGER")

	// Insert default admin if no users exist
	var count int
	err = db.QueryRow("SELECT COUNT(*) FROM users").Scan(&count)
	if err != nil {
		log.Fatalf("Failed to query users: %v", err)
	}

	if count == 0 {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
		if err != nil {
			log.Fatalf("Failed to hash default password: %v", err)
		}

		_, err = db.Exec("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", "admin", string(hashedPassword), "admin")
		if err != nil {
			log.Fatalf("Failed to insert default admin: %v", err)
		}
		fmt.Println("Default administrator account created: admin / admin123")
	}
}
