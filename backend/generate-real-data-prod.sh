#!/bin/bash
# Tunnel script to generate real AI predictions on production

# Load tunnel config
set -a
source .env.tunnel
set +a

# Start tunnel in background
echo "🔌 Usage: ./generate-real-data-prod.sh"
echo "🛠 Establishing SSH tunnel to Database..."
ssh -f -N -L $LOCAL_PORT:$REMOTE_DB_HOST:$REMOTE_DB_PORT $SSH_USER@$SSH_HOST -p $SSH_PORT || { echo "❌ Tunnel failed"; exit 1; }

echo "✅ Tunnel established on port $LOCAL_PORT"
echo "⏳ Waiting 5s for connection stability..."
sleep 5

# Set env vars for local execution against tunnel
export POSTGRES_HOST=localhost
export POSTGRES_PORT=$LOCAL_PORT
export POSTGRES_USER=$REMOTE_DB_USER
export POSTGRES_PASSWORD=$REMOTE_DB_PASSWORD
export POSTGRES_DB=$REMOTE_DB_NAME
export NODE_ENV=production

# Run the generation script
echo "🚀 Generating Artificial Intelligence (AI) Predictions..."
npx ts-node -r tsconfig-paths/register scripts/generate-predictions.ts

# Kill tunnel
echo "🛑 Closing tunnel..."
pkill -f "ssh -f -N -L $LOCAL_PORT"
echo "✅ Done!"
