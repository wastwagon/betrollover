#!/bin/bash
# Rebuild local Docker API + web with latest create-pick markets + settlement.
set -euo pipefail
cd "$(dirname "$0")/.."
echo "==> Migrations 109 + 110 + 111"
docker compose exec -T postgres psql -U "${POSTGRES_USER:-betrollover}" -d "${POSTGRES_DB:-betrollover}" \
  -f - < database/migrations/109_fixture_match_statistics.sql || true
docker compose exec -T postgres psql -U "${POSTGRES_USER:-betrollover}" -d "${POSTGRES_DB:-betrollover}" \
  -f - < database/migrations/110_market_config_corners_cards.sql || true
docker compose exec -T postgres psql -U "${POSTGRES_USER:-betrollover}" -d "${POSTGRES_DB:-betrollover}" \
  -f - < database/migrations/111_disable_unsellable_corner_markets.sql || true
echo "==> Rebuild api + web"
docker compose build api web
docker compose up -d api web
echo "==> Wait for health"
sleep 8
curl -s -o /dev/null -w "API tipsters: %{http_code}\n" http://localhost:6001/api/v1/tipsters
curl -s -o /dev/null -w "Create Pick: %{http_code}\n" http://localhost:6002/create-pick
echo ""
echo "Preview: http://localhost:6002/create-pick"
echo "Login:   admin@betrollover.com / password"
echo "Then Load Odds on a fixture — corners/cards in the market accordion (one panel open at a time)."
