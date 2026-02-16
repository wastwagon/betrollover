#!/bin/bash
# BetRollover v2 - Setup script
set -e
cd "$(dirname "$0")/.."

echo "=== BetRollover v2 Setup ==="

# 1. Ensure .env exists
if [ ! -f .env ]; then
  echo "Creating .env from .env.example..."
  cp .env.example .env
  echo "  Edit .env with your keys (Paystack, JWT_SECRET, etc.)"
fi

# 2. Install dependencies
echo ""
echo "Installing dependencies..."
npm install --prefix backend --silent 2>/dev/null || (cd backend && npm install)
npm install --prefix web --silent 2>/dev/null || (cd web && npm install)
npm install --prefix mobile --silent 2>/dev/null || (cd mobile && npm install)

# 3. Build backend
echo ""
echo "Building backend..."
cd backend && npm run build && cd ..

# 4. Try Docker
echo ""
if command -v docker &>/dev/null && docker info &>/dev/null 2>&1; then
  echo "Starting Docker services..."
  docker compose up -d 2>/dev/null || true
  sleep 5
  echo "Running migrations..."
  for f in database/migrations/013_deposit_requests.sql database/migrations/014_withdrawals.sql; do
    [ -f "$f" ] && docker compose exec -T postgres psql -U betrollover -d betrollover < "$f" 2>/dev/null || true
  done
  echo ""
  echo "Docker services: http://localhost:6002 (web), http://localhost:6001 (API)"
else
  echo "Docker not available. Run manually:"
  echo "  Backend: cd backend && npm run start:dev"
  echo "  Web:     cd web && npm run dev"
  echo "  (Requires PostgreSQL at localhost:5432, db: betrollover)"
fi

echo ""
echo "=== Setup complete ==="
echo "Admin: admin@betrollover.com / password"
echo "Mobile: cd mobile && EXPO_PUBLIC_API_URL=http://localhost:6001 npx expo start"
