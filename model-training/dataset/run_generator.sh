#!/bin/bash
# Script to run the dataset generator in the background

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check for argument
if [ $# -eq 0 ]; then
    echo "Usage: ./run_generator.sh [t|e]"
    echo "  t - Generate training dataset"
    echo "  e - Generate evaluation dataset"
    exit 1
fi

CHOICE=$1

# Validate choice
if [ "$CHOICE" != "t" ] && [ "$CHOICE" != "e" ]; then
    echo "Error: Invalid argument. Use 't' for training or 'e' for evaluation"
    exit 1
fi

# Check if already running
if [ -f generator.pid ]; then
    PID=$(cat generator.pid)
    if ps -p $PID > /dev/null 2>&1; then
        echo "Dataset generator is already running (PID: $PID)"
        exit 1
    else
        # Stale PID file, remove it
        rm generator.pid
    fi
fi

# Set dataset type message
if [ "$CHOICE" = "t" ]; then
    DATASET_TYPE="training"
else
    DATASET_TYPE="evaluation"
fi

# Start the generator in the background
echo "Starting dataset generator for $DATASET_TYPE dataset..."
nohup python3 dataset_generator.py $CHOICE > dataset_generator.log 2>&1 &
echo $! > generator.pid

echo "Dataset generator started with PID: $(cat generator.pid)"
echo "Logs: $SCRIPT_DIR/dataset_generator.log"
echo ""
echo "To stop: ./stop_generator.sh"
echo "To check status: ./status_generator.sh"
