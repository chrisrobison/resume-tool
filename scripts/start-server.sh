#!/usr/bin/env bash
# Start a simple Python HTTP server on port 8080 if one isn't already running.
# Writes its PID to `.server.pid` when it starts the server.

PORT=8080
PIDFILE=".server.pid"
URL="http://127.0.0.1:${PORT}"

set -e

# Quick check: is something already serving on the port?
if command -v curl >/dev/null 2>&1; then
  if curl -sS --max-time 2 "$URL" >/dev/null 2>&1; then
    echo "Server already running at $URL"
    exit 0
  fi
fi

# Start python server in background and record PID
echo "Starting Python HTTP server on port ${PORT}..."
python -m http.server ${PORT} >/dev/null 2>&1 &
PID=$!
echo $PID > "$PIDFILE"

# Wait for server to become available
for i in {1..10}; do
  if command -v curl >/dev/null 2>&1; then
    if curl -sS --max-time 2 "$URL" >/dev/null 2>&1; then
      echo "Started server (PID $PID) at $URL"
      exit 0
    fi
  else
    # If curl isn't available, just wait a moment and assume success
    sleep 0.5
  fi
  sleep 0.5
done

echo "Failed to start server on ${PORT}. Check for errors." >&2
exit 1

