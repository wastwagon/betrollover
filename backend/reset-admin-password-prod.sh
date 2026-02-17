#!/bin/bash

# Configuration
VPS_USER="root"
VPS_HOST="31.97.57.75"
CONTAINER_NAME="postgres-aw0so4cgcscsgk8c0okggswk-192537349803"
LOCAL_PORT=5434
REMOTE_DB_PORT=5432

echo "🔍 Fetching latest IP for container $CONTAINER_NAME..."
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
