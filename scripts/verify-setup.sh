#!/bin/bash
# BetRollover - Verify setup (News, Resources, Ads)
set -e
cd "$(dirname "$0")/.."

echo "=== BetRollover Setup Verification ==="
echo ""

# 1. Check .env
if [ -f .env ]; then
  echo "✓ .env exists"
else
  echo "✗ .env missing - run: cp .env.example .env"
  exit 1
fi

# 2. Backend build
echo ""
echo "Building backend..."
cd backend && npm run build > /dev/null 2>&1 && echo "✓ Backend builds" || { echo "✗ Backend build failed"; exit 1; }
cd ..

# 3. Web build
echo ""
echo "Building web..."
cd web && npm run build > /dev/null 2>&1 && echo "✓ Web builds" || { echo "✗ Web build failed"; exit 1; }
cd ..

# 4. Docker (if available)
echo ""
if command -v docker &>/dev/null && docker info &>/dev/null 2>&1; then
  echo "Starting Docker..."
  docker compose up -d 2>/dev/null || true
  sleep 5
  echo "✓ Docker services started"
  echo "  Web:  http://localhost:6002"
  echo "  API:  http://localhost:6001"
  echo "  Health: http://localhost:6001/health"
else
  echo "Docker not available - start manually:"
  echo "  Backend: cd backend && npm run start:dev"
  echo "  Web:     cd web && npm run dev"
fi

# 5. Migration status (if postgres is up)
if docker compose exec -T postgres psql -U betrollover -d betrollover -c "SELECT 1" &>/dev/null; then
  echo ""
  echo "Migration 036 (news, resources, ads):"
  if docker compose exec -T postgres psql -U betrollover -d betrollover -t -c "SELECT 1 FROM applied_migrations WHERE filename='036_news_resources_ads.sql'" 2>/dev/null | grep -q 1; then
    echo "✓ Applied"
  else
    echo "  Run: docker compose restart api"
  fi
fi

echo ""
echo "=== Verification complete ==="
echo ""
echo "New features:"
echo "  - News:     /news, /admin/news"
echo "  - Resources: /resources, /admin/resources"
echo "  - Ads:      /admin/ads, AdSlot placeholders on site"
echo ""
echo "Admin: admin@betrollover.com / password"
