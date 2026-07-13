# Game Configuration Manager

A secure, production-ready, web-based server configuration manager built using a **Go** backend and a **React.js + Tailwind CSS v4** frontend. It enables administrators to manage multiple hosting servers (local or remote Ubuntu servers via SSH) and map game profiles (such as Palworld) to operators, allowing them to edit complex configuration files safely from a sleek web UI.

---

## Technical Stack & Ports

*   **Production Deployment (Port 8010)**: The React app is built (`npm run build`) into static files inside `frontend/dist` and served directly by the Go backend on port **`8010`**. No other node processes are needed in production, preventing HMR WebSocket issues.
*   **Development Mode (Port 8011)**: Runs the React frontend via Vite dev server on port **`8011`** with Hot Module Replacement (HMR) enabled, proxying API requests to the Go backend on port `8010`.

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

### 3. Dynamic API Routing
The frontend targets relative `/api` paths.
*   **In Development**: Vite server maps `/api` requests to `http://localhost:8010` through a built-in reverse proxy configuration.
*   **In Production**: Cloudflare Tunnels or Nginx simply forward traffic to port `8010`. Since both static files and the API are served on port `8010`, it works perfectly without Mixed Content (HTTP/HTTPS) or HMR WebSocket blocks.

---

## Service Control Script (`game-manager.sh`)

For production setups (such as Ubuntu Server), a bash utility control script is provided in the root directory.

### Commands:
*   **Start**: Compiles the React frontend into production assets, compiles the Go backend binary, and runs the unified service on port `8010` in the background.
    ```bash
    ./game-manager.sh start
    ```
*   **Stop**: Stops the unified service on port `8010`.
    ```bash
    ./game-manager.sh stop
    ```
*   **Restart**: Restarts the service cleanly.
    ```bash
    ./game-manager.sh restart
    ```
*   **Status**: Displays port binding status and active process IDs.
    ```bash
    ./game-manager.sh status
    ```

*   **Logs**: Log outputs are piped directly into `logs/backend.log`.

---

## Setup & Run (Manual Mode)

### Development Mode (Both ports)
1.  **Start Go Backend**:
    ```bash
    cd backend
    go run .
    ```
2.  **Start Vite Dev Server**:
    ```bash
    cd frontend
    npm install
    npm run dev
    ```
    Access on [http://localhost:8011](http://localhost:8011)

### Production Mode (Single port 8010)
1.  **Build Frontend**:
    ```bash
    cd frontend
    npm install
    npm run build
    ```
2.  **Run Go Server**:
    ```bash
    cd ../backend
    go run .
    ```
    Access on [http://localhost:8010](http://localhost:8010) (both static assets and API are served on this port).
