#!/usr/bin/env bash
# BetRollover - Full setup: Docker, migrations, leagues, fixtures, AI tipsters, predictions
# Usage: chmod +x scripts/setup-everything.sh && ./scripts/setup-everything.sh

set -e
cd "$(dirname "$0")/.."

API_URL="${API_URL:-http://localhost:6001}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@betrollover.com}"
ADMIN_PASS="${ADMIN_PASS:-password}"

echo "=== BetRollover Full Setup ==="

# 1. Ensure .env exists
if [ ! -f .env ]; then
  echo "Creating .env from .env.example..."
  cp .env.example .env
  echo "  Edit .env with API_SPORTS_KEY (for fixtures) and other keys."
fi

# 2. Load .env for API key
if [ -f .env ]; then
  export $(grep -v '^#' .env | grep -v '^$' | xargs) 2>/dev/null || true
fi

# 3. Install deps & build
echo ""
echo "[1/7] Installing dependencies..."
npm install --prefix backend --silent 2>/dev/null || (cd backend && npm install)
npm install --prefix web --silent 2>/dev/null || (cd web && npm install)

echo ""
echo "[2/7] Building backend..."
(cd backend && npm run build)

# 4. Start Docker
echo ""
echo "[3/7] Starting Docker services..."
if command -v docker &>/dev/null && docker info &>/dev/null 2>&1; then
  docker compose up -d 2>/dev/null || true
  echo "  Waiting for API to be ready..."
  for i in {1..30}; do
    if curl -s -o /dev/null -w "%{http_code}" "$API_URL/health" 2>/dev/null | grep -q 200; then
      echo "  API ready."
      break
    fi
    sleep 2
    [ $i -eq 30 ] && echo "  Timeout waiting for API. Continue manually."
  done
else
  echo "  Docker not available. Start manually: cd backend && npm run start:dev"
  echo "  Then run steps 5-7 manually."
fi

# 5. Run league migrations (015-017, 018-021) if not using API auto-migrations
echo ""
echo "[4/7] Running league migrations..."
run_sql() {
  local f="$1"
  [ ! -f "$f" ] && return 0
  if command -v docker &>/dev/null; then
    docker compose exec -T postgres psql -U betrollover -d betrollover < "$f" 2>/dev/null && echo "  OK: $(basename "$f")" || true
  elif command -v psql &>/dev/null; then
    export PGPASSWORD="${POSTGRES_PASSWORD:-betrollover_dev}"
    psql -h "${POSTGRES_HOST:-localhost}" -p "${POSTGRES_PORT:-5435}" -U "${POSTGRES_USER:-betrollover}" -d "${POSTGRES_DB:-betrollover}" -f "$f" 2>/dev/null && echo "  OK: $(basename "$f")" || true
  fi
}
for f in database/migrations/015_add_more_leagues.sql database/migrations/016_add_brazil_argentina_australia_second_tier.sql database/migrations/017_add_100_leagues_all_inclusive.sql database/migrations/018_enabled_leagues_category_api_type_bookmaker.sql database/migrations/019_backfill_league_categories.sql database/migrations/020_add_international_tournaments.sql database/migrations/021_fixtures_archive.sql; do
  run_sql "$f"
done
[ -f database/migrations/026_comprehensive_professional_leagues.sql ] && run_sql database/migrations/026_comprehensive_professional_leagues.sql
[ -f database/migrations/029_tipster_user_and_prediction_marketplace.sql ] && run_sql database/migrations/029_tipster_user_and_prediction_marketplace.sql

# 6. Generate comprehensive leagues (if API key set and script exists)
if [ -n "${API_SPORTS_KEY}" ] && [ -f scripts/generate-leagues-migration.ts ]; then
  echo ""
  echo "[5/7] Generating comprehensive leagues from API-Football..."
  if npx ts-node scripts/generate-leagues-migration.ts 2>/dev/null; then
    [ -f database/migrations/026_comprehensive_professional_leagues.sql ] && run_sql database/migrations/026_comprehensive_professional_leagues.sql
  else
    echo "  Skip (API key invalid or script error)"
  fi
else
  echo ""
  echo "[5/7] Skipping leagues generation (set API_SPORTS_KEY in .env to enable)"
fi

# 7. Login, sync fixtures, setup AI tipsters, generate predictions
echo ""
echo "[6/7] Admin setup (fixtures sync, AI tipsters, predictions)..."
TOKEN=""
LOGIN_RESP=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\"}" 2>/dev/null || true)
if echo "$LOGIN_RESP" | grep -q '"accessToken"'; then
  TOKEN=$(echo "$LOGIN_RESP" | grep -oE '"access_token":"[^"]*"' | cut -d'"' -f4)
  echo "  Logged in as admin."

  echo "  Syncing fixtures..."
  curl -s -X POST "$API_URL/fixtures/sync" -H "Authorization: Bearer $TOKEN" 2>/dev/null | head -c 200
  echo ""

  echo "  Setting up AI tipsters..."
  curl -s -X POST "$API_URL/admin/setup/ai-tipsters" -H "Authorization: Bearer $TOKEN" 2>/dev/null | head -c 200
  echo ""

  echo "  Generating predictions..."
  curl -s -X POST "$API_URL/admin/predictions/generate" -H "Authorization: Bearer $TOKEN" 2>/dev/null | head -c 200
  echo ""

  echo "  Syncing predictions to marketplace (free by default)..."
  curl -s -X POST "$API_URL/admin/predictions/sync-to-marketplace" -H "Authorization: Bearer $TOKEN" 2>/dev/null | head -c 200
  echo ""
else
  echo "  Could not login. Run manually:"
  echo "    1. Login at http://localhost:6002/login or: curl -X POST $API_URL/auth/login -H 'Content-Type: application/json' -d '{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\"}'"
  echo "    2. Admin → Fixtures → Sync Fixtures"
  echo "    3. Admin → AI Predictions → Setup AI Tipsters"
  echo "    4. Admin → AI Predictions → Generate Predictions"
fi

echo ""
echo "[7/7] Done."
echo ""
echo "=== Setup complete ==="
echo "  Web:  http://localhost:6002"
echo "  API:  $API_URL"
echo "  Admin: $ADMIN_EMAIL / $ADMIN_PASS"
echo ""
echo "Next: Open http://localhost:6002 and explore."
