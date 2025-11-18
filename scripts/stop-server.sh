#!/usr/bin/env bash
# Stop the Python HTTP server started by `scripts/start-server.sh` if possible.

PIDFILE=".server.pid"
PORT=8080

set -e

if [ -f "$PIDFILE" ]; then
  PID=$(cat "$PIDFILE")
  if [ -n "$PID" ] && kill -0 "$PID" >/dev/null 2>&1; then
    echo "Stopping server PID $PID"
    kill "$PID" || true
    rm -f "$PIDFILE"
    exit 0
  else
    rm -f "$PIDFILE"
  fi
fi

# Fallback: try to find any python http.server processes and kill them
PIDS=$(ps -ef | grep 'python' | grep 'http.server' | grep -v grep | awk '{print $2}') || true
if [ -n "$PIDS" ]; then
  echo "Killing python http.server PIDs: $PIDS"
  echo "$PIDS" | xargs -r kill || true
fi

exit 0

