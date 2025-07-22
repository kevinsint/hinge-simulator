#!/bin/bash

# Cross Hinge Simulator - Start Server Script
# This script starts a local web server to serve the simulator

PORT=8000
PID_FILE="server.pid"

# Check if server is already running
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p $PID > /dev/null 2>&1; then
        echo "Server is already running on port $PORT (PID: $PID)"
        echo "Visit: http://localhost:$PORT"
        exit 1
    else
        echo "Removing stale PID file..."
        rm "$PID_FILE"
    fi
fi

# Start the server
echo "Starting Cross Hinge Simulator server on port $PORT..."
python3 -m http.server $PORT &
SERVER_PID=$!

# Save the PID
echo $SERVER_PID > "$PID_FILE"

# Wait a moment for server to start
sleep 1

# Check if server started successfully
if ps -p $SERVER_PID > /dev/null 2>&1; then
    echo "✅ Server started successfully!"
    echo "🌐 Visit: http://localhost:$PORT"
    echo "📁 Serving files from: $(pwd)"
    echo "🔧 PID: $SERVER_PID (saved to $PID_FILE)"
    echo ""
    echo "To stop the server, run: ./stop-server.sh"
else
    echo "❌ Failed to start server"
    rm -f "$PID_FILE"
    exit 1
fi
