#!/usr/bin/env bash
# BetRollover - Manually run seeds inside Coolify's API container
# Use when automatic seeding failed. Run on the VPS (Coolify host).
#
# Usage: ./scripts/coolify-run-seeds.sh

set -e
# Run from anywhere on the VPS (where Coolify/Docker runs)
# Coolify uses api-PROJECTID-HASH, we use betrollover-api
API_CONTAINER=""
for pattern in "betrollover-api" "^api-"; do
  API_CONTAINER=$(docker ps --format '{{.Names}}' 2>/dev/null | grep -E "$pattern" | head -1)
  [ -n "$API_CONTAINER" ] && break
done

if [ -z "$API_CONTAINER" ]; then
  echo "API container not found. Is the app running?"
  docker ps -a --format 'table {{.Names}}\t{{.Status}}' 2>/dev/null
  exit 1
fi

echo "Running seeds inside $API_CONTAINER..."
echo ""

# The API container has psql and /app/database/seeds. Run each seed via psql.
docker exec "$API_CONTAINER" sh -c '
  export PGPASSWORD="${POSTGRES_PASSWORD}"
  for f in /app/database/seeds/news-resources-seed.sql /app/database/seeds/news-2026-seed.sql /app/database/seeds/comprehensive-seed-data.sql /app/database/seeds/ai-tipsters-full-seed.sql; do
    if [ -f "$f" ]; then
      echo "Applying $(basename $f)..."
      psql -h "${POSTGRES_HOST:-postgres}" -p "${POSTGRES_PORT:-5432}" -U "${POSTGRES_USER:-betrollover}" -d "${POSTGRES_DB:-betrollover}" -f "$f" -v ON_ERROR_STOP=1 || echo "  (errors - may be duplicates)"
    fi
  done
  echo ""
  echo "Done."
'
echo ""
echo "Verify: docker exec $API_CONTAINER psql -h postgres -U betrollover -d betrollover -c 'SELECT COUNT(*) FROM users;'"
