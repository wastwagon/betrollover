#!/bin/bash
# Resync odds (force refresh) - requires admin login
# Usage: ./scripts/sync-odds.sh
# Or: API_URL=http://localhost:6001 ./scripts/sync-odds.sh

API_URL="${API_URL:-http://localhost:6001}"
EMAIL="${ADMIN_EMAIL:-admin@betrollover.com}"
PASS="${ADMIN_PASSWORD:-password}"

echo "Logging in as $EMAIL..."
LOGIN=$(curl -s -X POST "$API_URL/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}")
TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('access_token',''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "Login failed. Check credentials and API."
  echo "Response: $LOGIN"
  exit 1
fi

echo "Running force odds sync..."
RESULT=$(curl -s -X POST "$API_URL/fixtures/sync/odds?force=true" -H "Authorization: Bearer $TOKEN")
echo "$RESULT" | python3 -m json.tool 2>/dev/null || echo "$RESULT"

if echo "$RESULT" | grep -q '"synced"'; then
  echo "Done. Check Admin → Fixtures or Create Pick for BTTS, Correct Score, etc."
else
  echo "Sync may have failed. Try Admin → Fixtures → Force Refresh Odds in the browser."
fi
