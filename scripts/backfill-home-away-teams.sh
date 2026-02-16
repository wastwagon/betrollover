#!/usr/bin/env bash
# Fix "Home vs Away" fixtures by fetching real team names from API
# Usage: ./scripts/backfill-home-away-teams.sh
# Requires: Backend running, admin credentials

set -e
cd "$(dirname "$0")/.."

API_URL="${API_URL:-http://localhost:6001}"
EMAIL="${ADMIN_EMAIL:-admin@betrollover.com}"
PASS="${ADMIN_PASSWORD:-${ADMIN_PASS:-password}}"

echo "=== BetRollover: Fix Home vs Away Fixtures ==="
echo "API: $API_URL"
echo ""

echo "Logging in as $EMAIL..."
LOGIN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}")

TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('access_token',''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "Login failed. Ensure backend is running and credentials are correct."
  echo "Response: $LOGIN"
  exit 1
fi

echo "Logged in. Running backfill..."
RESULT=$(curl -s -X POST "$API_URL/fixtures/sync/backfill-teams" -H "Authorization: Bearer $TOKEN")
echo "$RESULT" | python3 -m json.tool 2>/dev/null || echo "$RESULT"

FIXED=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('fixed',0))" 2>/dev/null)
if [ "$FIXED" -gt 0 ] 2>/dev/null; then
  echo ""
  echo "Fixed $FIXED fixture(s). Refresh the admin page to see updates."
else
  echo ""
  echo "No fixtures needed fixing (or backend may need restart to pick up latest code)."
fi

echo ""
echo "=== Done ==="
