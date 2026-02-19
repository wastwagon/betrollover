#!/usr/bin/env bash
# Setup and test the full BetRollover stack (local Docker).
# Run from project root: bash scripts/setup-and-test.sh

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== 1. Build and start Docker services ==="
docker compose build api web
docker compose up -d

echo ""
echo "=== 2. Wait for API to be ready (30s) ==="
sleep 30

echo ""
echo "=== 3. Test API endpoints ==="
health=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:6001/health)
login=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:6001/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"x","password":"y"}')
analytics=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:6001/api/v1/analytics/track -H "Content-Type: application/json" -d '{"page":"/"}')

echo "  Health:    $health (expect 200)"
echo "  Login:     $login (expect 401)"
echo "  Analytics: $analytics (expect 201)"

echo ""
echo "=== 4. Test web login page ==="
web=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:6002/login)
echo "  Web /login: $web (expect 200)"

echo ""
if [ "$health" = "200" ] && [ "$login" = "401" ] && [ "$analytics" = "201" ] && [ "$web" = "200" ]; then
  echo "All tests passed."
  echo ""
  echo "Local URLs:"
  echo "  Web:  http://localhost:6002"
  echo "  Login: http://localhost:6002/login"
  echo "  API:  http://localhost:6001"
else
  echo "Some tests failed. Check: docker compose logs api"
  exit 1
fi
