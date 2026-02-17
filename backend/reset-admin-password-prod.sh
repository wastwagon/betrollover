#!/bin/bash

# Configuration
VPS_USER="root"
VPS_HOST="31.97.57.75"
CONTAINER_NAME="betrollover-postgres"
LOCAL_PORT=5434
REMOTE_DB_PORT=5432

echo "🔍 Detecting PostgreSQL container on $VPS_HOST..."
# NOTE: You will be asked for your SSH password here.
CONTAINER_NAME=$(ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_HOST "docker ps --format '{{.Names}}' | grep -E 'postgres|db' | head -n 1")

if [ -z "$CONTAINER_NAME" ]; then
    echo "❌ Failed to detect Postgres container."
  exit 1
fi

echo "✅ Detected container: $CONTAINER_NAME"
echo "🔍 Fetching IP for $CONTAINER_NAME..."
CONTAINER_IP=$(ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_HOST "docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $CONTAINER_NAME")

if [ -z "$CONTAINER_IP" ]; then
  echo "❌ Failed to get container IP."
  exit 1
fi

echo "✅ Container IP: $CONTAINER_IP"
echo "🔌 Creating SSH tunnel..."

# Create SSH tunnel in background
ssh -o StrictHostKeyChecking=no -N -L $LOCAL_PORT:$CONTAINER_IP:$REMOTE_DB_PORT $VPS_USER@$VPS_HOST &
TUNNEL_PID=$!

# Wait for tunnel to establish
sleep 2

echo "🔐 Resetting admin password..."
npx ts-node --transpile-only -O '{"module":"CommonJS"}' scripts/reset-admin-password.ts

# Cleanup
echo "🧹 Closing tunnel..."
kill $TUNNEL_PID 2>/dev/null
echo "✅ Done!"
