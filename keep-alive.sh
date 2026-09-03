#!/bin/bash
# Permanent server watchdog — keeps the dev server alive forever
# Kills any dead process, clears stale cache, and restarts

cd /home/z/my-project

# Kill any existing next/bun processes
pkill -f "next dev" 2>/dev/null
pkill -f "bun run dev" 2>/dev/null
sleep 2

# Clear stale cache
rm -rf .next/cache 2>/dev/null

# Start server with full detachment — NO tee pipe (that was causing SIGPIPE kills)
nohup ./node_modules/.bin/next dev -p 3000 </dev/null >dev.log 2>&1 &
SRV=$!
echo "[$(date)] Server started PID: $SRV"
disown $SRV 2>/dev/null

# Wait for it to be ready
for i in $(seq 1 20); do
  if curl -s -o /dev/null -m 2 "http://localhost:3000/" 2>/dev/null; then
    echo "[$(date)] Server UP after ${i}s"
    break
  fi
  sleep 1
done

# Permanent watchdog loop
while true; do
  sleep 5
  if ! curl -s -o /dev/null -m 3 "http://localhost:3000/" 2>/dev/null; then
    echo "[$(date)] Server DOWN — restarting..." >> /tmp/watchdog.log
    pkill -f "next dev" 2>/dev/null
    sleep 2
    rm -rf .next/cache 2>/dev/null
    cd /home/z/my-project
    nohup ./node_modules/.bin/next dev -p 3000 </dev/null >dev.log 2>&1 &
    disown $! 2>/dev/null
    sleep 12
    if curl -s -o /dev/null -m 3 "http://localhost:3000/" 2>/dev/null; then
      echo "[$(date)] Server restarted OK" >> /tmp/watchdog.log
    else
      echo "[$(date)] Server restart FAILED" >> /tmp/watchdog.log
    fi
  fi
done
