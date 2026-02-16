#!/usr/bin/env bash
# Sync fixtures and odds for the next 7 days
# Usage: ./scripts/sync-fixtures-odds.sh
#   Or: API_URL=http://localhost:6001 ./scripts/sync-fixtures-odds.sh
#   Or: ./scripts/sync-fixtures-odds.sh --fixtures-only   # Only sync fixtures
#   Or: ./scripts/sync-fixtures-odds.sh --odds-only      # Only sync odds (force refresh)

set -e
cd "$(dirname "$0")/.."

API_URL="${API_URL:-http://localhost:6001}"
EMAIL="${ADMIN_EMAIL:-admin@betrollover.com}"
PASS="${ADMIN_PASSWORD:-${ADMIN_PASS:-password}}"

DO_FIXTURES=true
DO_ODDS=true

for arg in "$@"; do
  case "$arg" in
    --fixtures-only) DO_ODDS=false ;;
    --odds-only)    DO_FIXTURES=false ;;
  esac
done

echo "=== BetRollover: Sync Fixtures & Odds (Next 7 Days) ==="
echo "API: $API_URL"
echo ""

# Login
echo "Logging in as $EMAIL..."
LOGIN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}")

TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('access_token',''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "Login failed. Check credentials and API."
  echo "Response: $LOGIN"
  exit 1
fi

echo "Logged in successfully."
echo ""

# Sync fixtures
if [ "$DO_FIXTURES" = true ]; then
  echo "[1/2] Syncing fixtures (next 7 days)..."
  FIX_RESULT=$(curl -s -X POST "$API_URL/fixtures/sync" -H "Authorization: Bearer $TOKEN")
  echo "$FIX_RESULT" | python3 -m json.tool 2>/dev/null || echo "$FIX_RESULT"
  if echo "$FIX_RESULT" | grep -q '"fixtures"'; then
    echo "Fixtures sync complete."
  else
    echo "Fixtures sync may have failed. Check API_SPORTS_KEY in .env"
  fi
  echo ""
fi

# Sync odds (force = full 7-day refresh)
if [ "$DO_ODDS" = true ]; then
  echo "[2/2] Syncing odds (force refresh for next 7 days)..."
  ODDS_RESULT=$(curl -s -X POST "$API_URL/fixtures/sync/odds?force=true" -H "Authorization: Bearer $TOKEN")
  echo "$ODDS_RESULT" | python3 -m json.tool 2>/dev/null || echo "$ODDS_RESULT"
  if echo "$ODDS_RESULT" | grep -q '"synced"'; then
    echo "Odds sync complete."
  else
    echo "Odds sync may have failed."
  fi
  echo ""
fi

echo "=== Done ==="
echo "Create Pick page: http://localhost:6002/create-pick"
echo "Admin Fixtures: http://localhost:6002/admin (if admin)"
