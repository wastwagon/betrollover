#!/usr/bin/env bash
# Refresh local Docker: start stack, apply latest SQL migration(s), rebuild API+Web, verify health.
# Run from project root:  bash scripts/docker-local-refresh.sh
# Or:                     chmod +x scripts/docker-local-refresh.sh && ./scripts/docker-local-refresh.sh
#
# Requires: Docker Desktop, .env (copy from .env.example if needed)

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

API_PORT="${API_PORT:-6001}"
WEB_PORT="${WEB_PORT:-6002}"
API_HEALTH="http://127.0.0.1:${API_PORT}/health"
WEB_HOME="http://127.0.0.1:${WEB_PORT}/"

# Load .env for POSTGRES_* overrides
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi
PG_USER="${POSTGRES_USER:-betrollover}"
PG_DB="${POSTGRES_DB:-betrollover}"

echo "=== [1/6] docker compose up -d ==="
docker compose up -d

echo ""
echo "=== [2/6] Wait for Postgres ==="
for _ in $(seq 1 30); do
  if docker compose exec -T postgres pg_isready -U "$PG_USER" -d "$PG_DB" &>/dev/null; then
    echo "  Postgres ready."
    break
  fi
  sleep 1
done

echo ""
echo "=== [3/6] Apply migration 075 (status_elapsed) — idempotent ==="
if [ -f database/migrations/075_fixture_status_elapsed.sql ]; then
  docker compose exec -T postgres psql -U "$PG_USER" -d "$PG_DB" < database/migrations/075_fixture_status_elapsed.sql
else
  echo "  Skip (file missing)"
fi

echo ""
echo "=== [4/6] docker compose build api web ==="
docker compose build api web

echo ""
echo "=== [5/6] Recreate API + Web ==="
docker compose up -d api web

echo ""
echo "=== [6/6] Wait for API health (up to 90s) ==="
OK=0
for _ in $(seq 1 45); do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_HEALTH" 2>/dev/null || echo 000)
  if [ "$CODE" = "200" ]; then
    OK=1
    echo "  API healthy (200)."
    break
  fi
  sleep 2
done
if [ "$OK" != "1" ]; then
  echo "  WARNING: API did not return 200 on $API_HEALTH — check: docker logs betrollover-api"
fi

WCODE=$(curl -s -o /dev/null -w "%{http_code}" "$WEB_HOME" 2>/dev/null || echo 000)
echo "  Web home: HTTP $WCODE  ($WEB_HOME)"

echo ""
echo "=== Done ==="
echo "  Web:  $WEB_HOME"
echo "  API:  http://127.0.0.1:${API_PORT}  (global prefix /api/v1)"
echo ""
echo "Optional: bash scripts/test-league-insights-local.sh 39 2025  # smoke test league tables"
echo ""
