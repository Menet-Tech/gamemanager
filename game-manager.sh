#!/bin/bash

# Configuration
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"

PID_DIR="$APP_DIR/run"
LOG_DIR="$APP_DIR/logs"

BE_PID_FILE="$PID_DIR/backend.pid"
BE_LOG_FILE="$LOG_DIR/backend.log"

# Create run and log directories if they don't exist
mkdir -p "$PID_DIR"
mkdir -p "$LOG_DIR"

build_frontend() {
    echo "Checking frontend static assets..."
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        if [ ! -d "$FRONTEND_DIR/dist" ]; then
            echo " Error: 'npm' is not installed and no pre-built 'frontend/dist' folder exists."
            echo " Please install Node.js and npm (e.g. 'sudo apt update && sudo apt install -y nodejs npm') to build assets."
            return 1
        else
            echo " Warning: 'npm' not found, but pre-built 'frontend/dist' exists. Skipping build."
            return 0
        fi
    fi

    # Install node dependencies if node_modules doesn't exist
    if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        echo " Installing frontend dependencies (this may take a moment)..."
        (cd "$FRONTEND_DIR" && npm install --no-audit --no-fund)
        if [ $? -ne 0 ]; then
            echo " Error: npm install failed."
            return 1
        fi
    fi

    # Build production bundle
    echo " Compiling React production build (npm run build)..."
    (cd "$FRONTEND_DIR" && npm run build > /dev/null)
    if [ $? -ne 0 ]; then
        echo " Error: Frontend compilation failed."
        return 1
    fi
    echo " Frontend built successfully."
    return 0
}

start_service() {
    echo -n "Starting Game Manager Service..."
    
    # Check if already running via PID file
    if [ -f "$BE_PID_FILE" ] && kill -0 $(cat "$BE_PID_FILE") 2>/dev/null; then
        echo " Already running (PID: $(cat "$BE_PID_FILE"))."
        return
    fi

    # Check if port 8010 is already bound
    if lsof -pi :8010 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo " Error: Port 8010 is already in use by another process."
        return
    fi

    # Compile frontend first
    build_frontend
    if [ $? -ne 0 ]; then
        echo " Failed to start: frontend build error."
        return
    fi

    # Build Go binary if it doesn't exist or if source files are newer
    if [ ! -f "$BACKEND_DIR/server" ]; then
        echo " Compiling Go backend binary..."
        (cd "$BACKEND_DIR" && go build -o server .)
        if [ $? -ne 0 ]; then
            echo " Error: Go compilation failed."
            return
        fi
    fi

    # Start Go backend server (which serves both REST API and React static files)
    cd "$BACKEND_DIR"
    export JWT_SECRET="super-secret-production-token-salt-2026" 
    nohup ./server > "$BE_LOG_FILE" 2>&1 &
    echo $! > "$BE_PID_FILE"
    echo " Started successfully (PID: $(cat "$BE_PID_FILE"))."
    echo " Access the dashboard on: http://localhost:8010 (or via your custom domain/tunnel)"
}

stop_service() {
    echo -n "Stopping Game Manager Service..."
    
    # 1. Kill by PID file
    if [ -f "$BE_PID_FILE" ]; then
        PID=$(cat "$BE_PID_FILE")
        if kill -0 "$PID" 2>/dev/null; then
            kill "$PID"
            sleep 0.5
        fi
        rm -f "$BE_PID_FILE"
    fi
    
    # 2. Direct port release (kill whatever is listening on 8010)
    PORT_PID=$(lsof -t -i:8010 2>/dev/null)
    if [ ! -z "$PORT_PID" ]; then
        kill -9 "$PORT_PID" 2>/dev/null
    fi
    echo " Stopped."
}

status_service() {
    RUNNING=0

    if [ -f "$BE_PID_FILE" ] && kill -0 $(cat "$BE_PID_FILE") 2>/dev/null; then
        RUNNING=1
        PID=$(cat "$BE_PID_FILE")
    fi

    echo "=================================================="
    echo "  Game Manager Service Status"
    echo "=================================================="
    if [ $RUNNING -eq 1 ]; then
        echo -e "Service (Go + React): \e[32mRUNNING\e[0m (PID: $PID, Port: 8010)"
    else
        # Fallback check if port is listening but PID is lost
        PORT_PID=$(lsof -t -i:8010 2>/dev/null)
        if [ ! -z "$PORT_PID" ]; then
            echo -e "Service (Go + React): \e[32mRUNNING\e[0m (PID: $PORT_PID, Port: 8010 - PID recovered)"
        else
            echo -e "Service (Go + React): \e[31mSTOPPED\e[0m"
        fi
    fi
    echo "=================================================="
}

case "$1" in
    start)
        start_service
        ;;
    stop)
        stop_service
        ;;
    restart)
        stop_service
        sleep 1
        start_service
        ;;
    status)
        status_service
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status}"
        exit 1
        ;;
esac

exit 0
