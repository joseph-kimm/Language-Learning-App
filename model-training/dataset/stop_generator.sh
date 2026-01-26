#!/bin/bash
# Script to stop the dataset generator

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -f generator.pid ]; then
    echo "No PID file found. Generator may not be running."
    exit 1
fi

PID=$(cat generator.pid)

if ps -p $PID > /dev/null 2>&1; then
    echo "Stopping dataset generator (PID: $PID)..."
    kill $PID

    # Wait for process to stop
    sleep 2

    if ps -p $PID > /dev/null 2>&1; then
        echo "Process did not stop gracefully. Force killing..."
        kill -9 $PID
    fi

    rm generator.pid
    echo "Dataset generator stopped."
else
    echo "Process with PID $PID is not running."
    rm generator.pid
fi
