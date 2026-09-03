#!/bin/bash
# Persistent server startup script
# This script starts the dev server and keeps it alive

cd /home/z/my-project

# Kill any existing processes
pkill -f "next dev" 2>/dev/null
sleep 2

# Clear cache to prevent OOM during compilation
rm -rf .next/cache 2>/dev/null

# Start the server with full detachment
setsid nohup bun run dev </dev/null >dev.log 2>&1 &
SERVER_PID=$!
echo "Server started with PID: $SERVER_PID"
disown $SERVER_PID 2>/dev/null

# Wait for server to be ready
for i in $(seq 1 30); do
  if curl -s -o /dev/null -m 2 "http://localhost:3000/" 2>/dev/null; then
    echo "Server is UP (HTTP 200) after ${i}s"
    break
  fi
  sleep 1
done

# Start watchdog to keep server alive
setsid nohup bash -c '
cd /home/z/my-project
while true; do
  if ! curl -s -o /dev/null -m 3 "http://localhost:3000/" 2>/dev/null; then
    echo "[$(date)] Server down, restarting..." >> /tmp/watchdog.log
    pkill -f "next dev" 2>/dev/null
    sleep 2
    rm -rf .next/cache 2>/dev/null
    setsid nohup bun run dev </dev/null >>dev.log 2>&1 &
    disown $! 2>/dev/null
    sleep 12
  fi
  sleep 5
done
' </dev/null >/dev/null 2>&1 &
WATCHDOG_PID=$!
echo "Watchdog started with PID: $WATCHDOG_PID"
disown $WATCHDOG_PID 2>/dev/null

echo ""
echo "=== Server Status ==="
curl -s -o /dev/null -m 5 -w "HTTP: %{http_code}\n" "http://localhost:3000/"
echo "Dashboard: $(curl -s -m 5 'http://localhost:3000/api/dashboard' | grep -o '"presentToday":[0-9]*')"
echo ""
echo "Server is running. Access it at http://localhost:3000"
