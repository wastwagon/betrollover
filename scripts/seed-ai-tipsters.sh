#!/bin/bash
# Seed 25 AI Tipsters (users + tipsters with profile images)
# Run after: docker compose up postgres redis, API running
# Usage: ./scripts/seed-ai-tipsters.sh [API_URL]

set -e
API_URL="${1:-http://localhost:3001}"

echo "=== BetRollover AI Tipsters Seed ==="
echo "API: $API_URL"

# 1. Health check
echo "[1/3] Checking API health..."
if ! curl -sf "$API_URL/health" > /dev/null; then
  echo "ERROR: API not reachable at $API_URL. Start the API first."
  exit 1
fi

# 2. Login as admin
echo "[2/3] Logging in as admin..."
LOGIN=$(curl -sf -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@betrollover.com","password":"password"}')
TOKEN=$(echo "$LOGIN" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "ERROR: Login failed. Check admin credentials in database/init/02-seed-users.sql"
  echo "Expected: admin@betrollover.com / password"
  exit 1
fi

# 3. Setup AI tipsters
echo "[3/3] Initializing 25 AI tipsters..."
RESULT=$(curl -sf -X POST "$API_URL/admin/setup/ai-tipsters" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

CREATED=$(echo "$RESULT" | grep -o '"created":[0-9]*' | cut -d':' -f2)
UPDATED=$(echo "$RESULT" | grep -o '"updated":[0-9]*' | cut -d':' -f2)

echo ""
echo "Done. Created: ${CREATED:-?}, Updated: ${UPDATED:-?}"
echo "25 AI tipsters with profile images are now seeded."
echo "Visit /tipsters to see them."
