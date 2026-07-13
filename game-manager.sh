#!/bin/bash

# Configuration
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"

PID_DIR="$APP_DIR/run"
LOG_DIR="$APP_DIR/logs"

BE_PID_FILE="$PID_DIR/backend.pid"
FE_PID_FILE="$PID_DIR/frontend.pid"

BE_LOG_FILE="$LOG_DIR/backend.log"
FE_LOG_FILE="$LOG_DIR/frontend.log"

# Create run and log directories if they don't exist
mkdir -p "$PID_DIR"
mkdir -p "$LOG_DIR"

start_backend() {
    echo -n "Starting Backend (Port 8010)..."
    
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

    # Build the Go binary if it doesn't exist
    if [ ! -f "$BACKEND_DIR/server" ]; then
        echo -n " (Building Go binary first)..."
        (cd "$BACKEND_DIR" && go build -o server .)
        if [ $? -ne 0 ]; then
            echo " Build failed."
            return
        fi
    fi

    # Start Go backend server
    cd "$BACKEND_DIR"
    # Derives dynamic JWT signature keys in production (change this key!)
    export JWT_SECRET="super-secret-production-token-salt-2026" 
    nohup ./server > "$BE_LOG_FILE" 2>&1 &
    echo $! > "$BE_PID_FILE"
    echo " Started (PID: $(cat "$BE_PID_FILE"))."
}

start_frontend() {
    echo -n "Starting Frontend (Port 8011)..."
    
    # Check if already running via PID file
    if [ -f "$FE_PID_FILE" ] && kill -0 $(cat "$FE_PID_FILE") 2>/dev/null; then
        echo " Already running (PID: $(cat "$FE_PID_FILE"))."
        return
    fi

    # Check if port 8011 is already bound
    if lsof -pi :8011 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo " Error: Port 8011 is already in use by another process."
        return
    fi

    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        echo " Error: 'npm' is not installed. Please install Node.js and npm (e.g. 'sudo apt update && sudo apt install -y nodejs npm')."
        return
    fi

    # Run npm install if node_modules doesn't exist
    if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        echo -n " (Installing node dependencies first)..."
        (cd "$FRONTEND_DIR" && npm install --no-audit --no-fund)
        if [ $? -ne 0 ]; then
            echo " npm install failed."
            return
        fi
    fi

    # Start Vite dev server in the background
    cd "$FRONTEND_DIR"
    nohup npm run dev > "$FE_LOG_FILE" 2>&1 &
    echo $! > "$FE_PID_FILE"
    echo " Started (PID: $(cat "$FE_PID_FILE"))."
}

stop_backend() {
    echo -n "Stopping Backend (Port 8010)..."
    
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

stop_frontend() {
    echo -n "Stopping Frontend (Port 8011)..."
    
    # 1. Kill parent process group by PID file
    if [ -f "$FE_PID_FILE" ]; then
        PID=$(cat "$FE_PID_FILE")
        if kill -0 "$PID" 2>/dev/null; then
            kill "$PID"
            sleep 0.5
        fi
        rm -f "$FE_PID_FILE"
    fi
    
    # 2. Hard release port 8011 (kills orphaned Vite/Node child processes)
    PORT_PID=$(lsof -t -i:8011 2>/dev/null)
    if [ ! -z "$PORT_PID" ]; then
        kill -9 "$PORT_PID" 2>/dev/null
    fi
    echo " Stopped."
}

status() {
    BE_RUNNING=0
    FE_RUNNING=0

    if [ -f "$BE_PID_FILE" ] && kill -0 $(cat "$BE_PID_FILE") 2>/dev/null; then
        BE_RUNNING=1
        BE_PID=$(cat "$BE_PID_FILE")
    fi

    if [ -f "$FE_PID_FILE" ] && kill -0 $(cat "$FE_PID_FILE") 2>/dev/null; then
        FE_RUNNING=1
        FE_PID=$(cat "$FE_PID_FILE")
    fi

    echo "=================================================="
    echo "  Game Manager Service Status"
    echo "=================================================="
    if [ $BE_RUNNING -eq 1 ]; then
        echo -e "Backend (Go):    \e[32mRUNNING\e[0m (PID: $BE_PID, Port: 8010)"
    else
        # Fallback check if port is listening but PID is lost
        PORT_PID=$(lsof -t -i:8010 2>/dev/null)
        if [ ! -z "$PORT_PID" ]; then
            echo -e "Backend (Go):    \e[32mRUNNING\e[0m (PID: $PORT_PID, Port: 8010 - PID recovered)"
        else
            echo -e "Backend (Go):    \e[31mSTOPPED\e[0m"
        fi
    fi

    if [ $FE_RUNNING -eq 1 ]; then
        echo -e "Frontend (Vite): \e[32mRUNNING\e[0m (PID: $FE_PID, Port: 8011)"
    else
        PORT_PID=$(lsof -t -i:8011 2>/dev/null)
        if [ ! -z "$PORT_PID" ]; then
            echo -e "Frontend (Vite): \e[32mRUNNING\e[0m (PID: $PORT_PID, Port: 8011 - PID recovered)"
        else
            echo -e "Frontend (Vite): \e[31mSTOPPED\e[0m"
        fi
    fi
    echo "=================================================="
}

case "$1" in
    start)
        start_backend
        start_frontend
        ;;
    stop)
        stop_frontend
        stop_backend
        ;;
    restart)
        $0 stop
        sleep 1
        $0 start
        ;;
    status)
        status
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status}"
        exit 1
        ;;
esac

exit 0
