#!/usr/bin/env bash
# Preview create-pick markets + settlement changes without rebuilding Docker.
# Uses host-exposed Postgres (:5435) and Redis (:6380) from docker compose.
# Web: http://localhost:6012  API: http://localhost:6011
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export POSTGRES_HOST=localhost
export POSTGRES_PORT=5435
export POSTGRES_USER="${POSTGRES_USER:-betrollover}"
export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-betrollover_dev}"
export POSTGRES_DB="${POSTGRES_DB:-betrollover}"
export REDIS_URL=redis://localhost:6380
export PORT=6011
export JWT_SECRET="${JWT_SECRET:-dev-jwt-secret-change-in-production}"
# Load API key from .env if present
if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source <(grep -E '^(API_SPORTS_KEY|JWT_SECRET|ODDS_API_KEY)=' .env | sed 's/\r$//')
  set +a
fi

echo "==> Applying migration 109 (fixture match statistics)…"
PGPASSWORD="${POSTGRES_PASSWORD}" psql -h localhost -p 5435 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -f database/migrations/109_fixture_match_statistics.sql >/dev/null

echo "==> Building API (tsc; nest build can no-op when dist is gitignored)…"
(cd backend && npx tsc -p tsconfig.build.json --incremental false)

echo "==> Starting API on :6011…"
(cd backend && REDIS_URL="${REDIS_URL}" POSTGRES_HOST="${POSTGRES_HOST}" POSTGRES_PORT="${POSTGRES_PORT}" \
  POSTGRES_USER="${POSTGRES_USER}" POSTGRES_PASSWORD="${POSTGRES_PASSWORD}" POSTGRES_DB="${POSTGRES_DB}" \
  PORT="${PORT}" ENABLE_SCHEDULING=false JWT_SECRET="${JWT_SECRET}" \
  API_SPORTS_KEY="${API_SPORTS_KEY:-}" node dist/main) &
API_PID=$!

echo "==> Starting web on :6012…"
(cd web && NEXT_PUBLIC_API_URL=http://127.0.0.1:6011 NEXT_PUBLIC_APP_URL=http://127.0.0.1:6012 \
  WATCHPACK_POLLING=true npx next dev -H 127.0.0.1 -p 6012) &
WEB_PID=$!

cleanup() {
  kill "$API_PID" "$WEB_PID" 2>/dev/null || true
}
trap cleanup EXIT

echo ""
echo "Preview ready:"
echo "  Create Pick → http://localhost:6012/create-pick"
echo "  Sign in     → http://localhost:6012/login  (admin@betrollover.com / password)"
echo "  API docs    → http://localhost:6011/docs"
echo ""
echo "Press Ctrl+C to stop."
wait
