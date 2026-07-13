# Game Configuration Manager

A secure, web-based server configuration manager built using a **Go** backend and a **React.js + Tailwind CSS v4** frontend. It enables administrators to manage multiple hosting servers (local or remote Ubuntu servers via SSH) and map game profiles (such as Palworld) to operators, allowing them to edit complex configuration files safely from a sleek web UI.

---

## Key Features

*   **Identification & Authorization**:
    *   Unified login page for both Administrators and Operators.
    *   Robust JWT token authentication with dynamic signature key loading.
    *   **Force Password Change**: Admins can require operators to change their temporary passwords upon their first login.
*   **Role-Based Access Control (RBAC)**:
    *   **Administrators**: Full access to register host servers (SSH credentials), manage operator accounts, create game configuration profiles, and map profile permissions to operators.
    *   **Operators (Users)**: Access restricted strictly to game profiles authorized by the admin.
*   **Secure File Operations (SSH)**:
    *   Secure read/write operations over POSIX-compliant SSH connections.
    *   **Command Injection Immunity**: File paths are configured exclusively by administrators. Shell escaping handles arbitrary paths containing special characters (like quotes, spaces, and semicolons) securely.
*   **Smart Palworld Config Editor**:
    *   A custom Go-based parser reads Palworld `OptionSettings=(...)` structures and translates them into styled input forms (switches for booleans, number inputs for rates, enums for dropdowns).
    *   A search box filters over 120 settings in real-time.
    *   Settings are grouped into logical, expandable category tabs.
    *   **Raw Editor**: A raw text area fallback is provided for manual edits or unrecognized configurations.
*   **OWASP Aligned Security**:
    *   Password hashing using bcrypt.
    *   Throttled login delays (1 second) on failures to mitigate automated brute-force attacks.
    *   Security logging (`[SECURITY]`) auditing logins, failed attempts, and password changes.
    *   CORS origin validation and parameterized URL path inputs.

---

## Technical Stack

*   **Backend**: Go (Golang) 1.22+, SQLite (pure Go compiler `modernc.org/sqlite` without CGO), SSH client (`golang.org/x/crypto/ssh`).
*   **Frontend**: React.js, Vite, Tailwind CSS v4 (with PostCSS), Lucide React (for icons).

---

## Project Structure

```
game-Manager/
├── backend/
│   ├── main.go          # Route mappings and HTTP listening (port 8080)
│   ├── db.go            # SQLite initialization, schema migrator, admin seeding
│   ├── auth.go          # JWT authentication and verification context middleware
│   ├── handlers.go      # REST endpoints (login, CRUD operations, config actions)
│   ├── ssh_client.go    # SSH stream readers and POSIX shell escaping
│   ├── palworld.go      # INI parsing and settings generator
│   └── palworld_test.go # Parser unit tests
└── frontend/
    ├── postcss.config.js# Tailwind v4 configuration
    ├── package.json     # Node dependencies
    └── src/
        ├── index.css    # Tailwind directives and custom glassmorphism styles
        ├── App.jsx      # Session validation and router
        ├── utils/api.js # central fetch client with token injection
        └── pages/
            ├── Login.jsx        # Glassmorphism login page
            ├── Dashboard.jsx    # Sidebar container
            ├── AdminPanel.jsx   # Admin CRUD dashboard
            ├── UserPanel.jsx    # Operator server cards listing
            └── ConfigEditor.jsx # Tabbed settings form editor
```

---

## Getting Started

### Prerequisites

Ensure you have the following installed on your machine:
*   [Go](https://go.dev/doc/install) (1.22 or newer)
*   [Node.js](https://nodejs.org/) (v18 or newer) and `npm`

---

### Step 1: Run the Backend

1.  Navigate into the `backend/` directory:
    ```bash
    cd backend
    ```
2.  Set the `JWT_SECRET` environment variable (optional, falls back to a default with a warning if not set):
    *   **Windows (PowerShell)**: `$env:JWT_SECRET="your_secure_random_key_here"`
    *   **Linux/macOS**: `export JWT_SECRET="your_secure_random_key_here"`
3.  Run the server:
    ```bash
    go run .
    ```
    *   The server will initialize SQLite and compile.
    *   A default admin account is seeded automatically:
        *   **Username**: `admin`
        *   **Password**: `admin123`
    *   The backend listens on **`http://localhost:8080`**.

---

### Step 2: Run the Frontend

1.  Navigate into the `frontend/` directory:
    ```bash
    cd ../frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the Vite dev server:
    ```bash
    npm run dev
    ```
    *   The frontend dev server launches on **`http://localhost:5173`**.

4.  Open [http://localhost:5173](http://localhost:5173) in your browser, log in with `admin` / `admin123`, and configure your servers!
