#!/usr/bin/env bash
# Sync all Odds API–powered sports (Basketball, Rugby, MMA, Hockey, American Football, Tennis)
# Requires: ODDS_API_KEY in backend .env, admin user, API running
#
# Usage:
#   ./scripts/sync-odds-api-sports.sh
#   API_URL=http://localhost:6001 ./scripts/sync-odds-api-sports.sh
#   ADMIN_EMAIL=admin@betrollover.com ADMIN_PASSWORD=yourpass ./scripts/sync-odds-api-sports.sh
#
# Setup:
#   1. Add ODDS_API_KEY to backend/.env (from https://the-odds-api.com)
#   2. Ensure ENABLED_SPORTS includes: basketball,rugby,mma,hockey,american_football,tennis
#   3. Start the API, then run this script

set -e
cd "$(dirname "$0")/.."

API_URL="${API_URL:-http://localhost:6001}"
BASE="${API_URL}/api/v1"
EMAIL="${ADMIN_EMAIL:-admin@betrollover.com}"
PASS="${ADMIN_PASSWORD:-${ADMIN_PASS:-password}}"

SPORTS=(basketball rugby mma hockey american-football tennis)

echo "=== BetRollover: Sync Odds API Sports ==="
echo "API: $API_URL"
echo "Sports: ${SPORTS[*]}"
echo ""

# Check ODDS_API_KEY is set (in backend .env - we can't read it here, but we can warn)
if [ -f backend/.env ] && ! grep -q 'ODDS_API_KEY=.\+' backend/.env 2>/dev/null; then
  echo "WARNING: ODDS_API_KEY may not be set in backend/.env"
  echo "Add your key from https://the-odds-api.com (e.g. ODDS_API_KEY=your_key_here)"
  echo ""
fi

# Login
echo "Logging in as $EMAIL..."
LOGIN=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}")

TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('access_token',''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "Login failed. Check credentials and that the API is running."
  echo "Response: $LOGIN"
  exit 1
fi

echo "Logged in successfully."
echo ""

# Sync each sport
for sport in "${SPORTS[@]}"; do
  echo "[$sport] Syncing..."
  RESULT=$(curl -s -X POST "$BASE/admin/sport-sync/$sport" -H "Authorization: Bearer $TOKEN")
  if echo "$RESULT" | grep -qE '"games"|"odds"'; then
    GAMES=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('games',0))" 2>/dev/null || echo "?")
    ODDS=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('odds',0))" 2>/dev/null || echo "?")
    echo "  → $GAMES events, $ODDS with odds"
  else
    echo "  → $RESULT"
  fi
  echo ""
done

# Sync results (for settlement)
echo "[results] Syncing scores for settlement..."
RESULT=$(curl -s -X POST "$BASE/admin/sport-sync/results" -H "Authorization: Bearer $TOKEN")
echo "$RESULT" | python3 -m json.tool 2>/dev/null || echo "$RESULT"
echo ""

echo "=== Done ==="
echo "Create Pick: $API_URL/../create-pick (or your web URL)"
echo "Only events with odds are stored and shown."
