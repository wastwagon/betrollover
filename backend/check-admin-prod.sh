#!/bin/bash

# Configuration
VPS_USER="root"
VPS_HOST="31.97.57.75"
CONTAINER_NAME="betrollover-postgres"
LOCAL_PORT="5434"
REMOTE_DB_PORT="5432"

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

echo "🚀 Opening SSH tunnel..."
ssh -o StrictHostKeyChecking=no -N -L $LOCAL_PORT:$CONTAINER_IP:$REMOTE_DB_PORT $VPS_USER@$VPS_HOST &
TUNNEL_PID=$!

echo "⏳ Waiting 10 seconds for tunnel..."
sleep 10

# Check and create admin user
echo "🔍 Checking for admin user in production..."
export $(grep -v '^#' .env.tunnel | xargs)

# Run the check script
npx ts-node --transpile-only -O '{"module":"CommonJS"}' scripts/check-admin.ts

# Cleanup
echo "🛑 Closing tunnel..."
kill $TUNNEL_PID
