#!/bin/bash
# Script to check the status of the dataset generator

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -f generator.pid ]; then
    echo "Status: NOT RUNNING (no PID file)"
    exit 0
fi

PID=$(cat generator.pid)

if ps -p $PID > /dev/null 2>&1; then
    echo "Status: RUNNING"
    echo "PID: $PID"
    echo "Process info:"
    ps -p $PID -o pid,cmd,%cpu,%mem,etime
    echo ""
    echo "Recent log entries:"
    tail -n 10 dataset_generator.log
else
    echo "Status: NOT RUNNING (stale PID file)"
    rm generator.pid
fi
