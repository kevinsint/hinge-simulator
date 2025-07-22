#!/bin/bash

# Cross Hinge Simulator - Stop Server Script
# This script stops the local web server

PID_FILE="server.pid"

# Check if PID file exists
if [ ! -f "$PID_FILE" ]; then
    echo "❌ No server PID file found. Server may not be running."
    echo "If a server is running, you can manually kill it with:"
    echo "   pkill -f 'python3 -m http.server'"
    exit 1
fi

# Read the PID
PID=$(cat "$PID_FILE")

# Check if the process is running
if ! ps -p $PID > /dev/null 2>&1; then
    echo "❌ Server process (PID: $PID) is not running."
    echo "Removing stale PID file..."
    rm "$PID_FILE"
    exit 1
fi

# Stop the server
echo "Stopping Cross Hinge Simulator server (PID: $PID)..."
kill $PID

# Wait a moment for graceful shutdown
sleep 1

# Check if process was terminated
if ps -p $PID > /dev/null 2>&1; then
    echo "⚠️  Graceful shutdown failed. Force killing..."
    kill -9 $PID
    sleep 1
fi

# Verify termination and cleanup
if ps -p $PID > /dev/null 2>&1; then
    echo "❌ Failed to stop server process"
    exit 1
else
    echo "✅ Server stopped successfully!"
    rm "$PID_FILE"
    echo "🧹 Cleaned up PID file"
fi
