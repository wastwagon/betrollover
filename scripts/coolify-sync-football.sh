#!/usr/bin/env bash
# Sync fixtures, odds, and generate predictions/coupons via API
# Run from anywhere. Requires: curl. API must be reachable.
#
# Usage: API_URL=https://api.betrollover.com ./scripts/coolify-sync-football.sh
# Or: ./scripts/coolify-sync-football.sh   (uses API_URL from env or default)

API_URL="${API_URL:-https://api.betrollover.com}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@betrollover.com}"
ADMIN_PASS="${ADMIN_PASS:-password}"

echo "=== BetRollover Football Sync ==="
echo "API: $API_URL"
echo ""

# 1. Login
TOKEN=""
LOGIN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\"}")
TOKEN=$(echo "$LOGIN" | grep -oE '"access_token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "ERROR: Login failed. Check admin@betrollover.com / password"
  exit 1
fi
echo "Logged in."

# 2. Sync fixtures (from API-Football)
echo ""
echo "[1/4] Syncing fixtures..."
FIX=$(curl -s -X POST "$API_URL/fixtures/sync" -H "Authorization: Bearer $TOKEN")
echo "$FIX" | head -c 300
echo ""

# 3. Sync odds
echo ""
echo "[2/4] Syncing odds..."
ODDS=$(curl -s -X POST "$API_URL/fixtures/sync/odds?force=true" -H "Authorization: Bearer $TOKEN")
echo "$ODDS" | head -c 300
echo ""

# 4. Generate AI predictions (coupons)
echo ""
echo "[3/4] Generating predictions..."
PRED=$(curl -s -X POST "$API_URL/admin/predictions/generate" -H "Authorization: Bearer $TOKEN")
echo "$PRED" | head -c 300
echo ""

# 5. Sync to marketplace
echo ""
echo "[4/4] Syncing to marketplace..."
MKT=$(curl -s -X POST "$API_URL/admin/predictions/sync-to-marketplace" -H "Authorization: Bearer $TOKEN")
echo "$MKT" | head -c 300
echo ""

echo ""
echo "=== Done ==="
