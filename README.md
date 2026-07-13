# Game Configuration Manager

A secure, production-ready, web-based server configuration manager built using a **Go** backend and a **React.js + Tailwind CSS v4** frontend. It enables administrators to manage multiple hosting servers (local or remote Ubuntu servers via SSH) and map game profiles (such as Palworld) to operators, allowing them to edit complex configuration files safely from a sleek web UI.

---

## Technical Stack & Ports

*   **Backend**: Go (Golang) 1.22+, SQLite (pure Go compiler `modernc.org/sqlite` without CGO), SSH client (`golang.org/x/crypto/ssh`).
    *   **Port**: `8010`
*   **Frontend**: React.js, Vite, Tailwind CSS v4 (with PostCSS), Lucide React.
    *   **Port**: `8011`

---

## Key Features

### 1. Unified Authentication & Password Security
*   **RBAC (Role-Based Access Control)**: Separates **Administrators** (who manage users, servers, game profiles, and authorizations) from **Operators** (who only edit game configs of assigned profiles).
*   **Force Password Change**: Admins can check "Force password change on first login" when creating a user. The user will be blocked by a fullscreen interface until they set a new password.
*   **Secure Changes**: Changing own passwords (either during force-reset or self-service via dashboard) requires verifying the current password using `bcrypt` validation in the backend.

### 2. OWASP Aligned Security
*   **Brute-Force Protection**: A 1-second throttling delay is introduced on failed login attempts to neutralize automated brute-forcing.
*   **Security Logging**: Detailed `[SECURITY]` logging registers logins (successful/failed with client IPs) and password change operations.
*   **CORS & Input Sanitization**: Secure dynamic origin headers and strict integer conversions for parameterized endpoints.

### 3. Dynamic API Routing (Domain & Reverse Proxy Plug-and-Play)
The frontend automatically resolves the API Base URL:
*   **Localhost / Direct IP Dev**: Derives the current browser IP/host and targets backend port `8010` (e.g. `http://localhost:8010/api` or `http://192.168.1.100:8010/api`).
*   **Production Reverse Proxy (Nginx + SSL)**: If served on standard ports (80/443), it defaults to relative `/api` paths. This prevents browser **Mixed Content** blocks when accessing the site via secure `https://your-domain.com`.

### 4. Smart Game Config Parser
*   Parses Palworld's complex single-line `OptionSettings=(...)` array into a formatted dashboard.
*   Enables search filters, expandable categories, styled dropdowns/toggles, and provides a raw fallback editor.

---

## Service Control Script (`game-manager.sh`)

For production setups (such as Ubuntu Server), a bash utility control script is provided in the root directory.

### Commands:
*   **Start**: Compiles the Go binary (if not present) and runs both backend and frontend in the background.
    ```bash
    ./game-manager.sh start
    ```
*   **Stop**: Stops the services. Includes an **anti-port-locking** feature that actively sweeps and kills orphaned node/Vite parent and child processes holding ports `8010` and `8011` to guarantee a clean state.
    ```bash
    ./game-manager.sh stop
    ```
*   **Restart**: Restarts both services cleanly.
    ```bash
    ./game-manager.sh restart
    ```
*   **Status**: Displays port binding status and active process IDs.
    ```bash
    ./game-manager.sh status
    ```

*   **Logs**: Log outputs are piped directly into `logs/backend.log` and `logs/frontend.log` respectively.

---

## Setup & Run (Manual Dev Mode)

### 1. Run the Backend
```bash
cd backend
# Set JWT signing secret (Optional: falls back to default with a warning)
export JWT_SECRET="your_production_secret_key" # Windows: $env:JWT_SECRET="..."
go run .
```
Default admin seeded automatically: **Username**: `admin` | **Password**: `admin123`

### 2. Run the Frontend
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:8011](http://localhost:8011) in your browser.
