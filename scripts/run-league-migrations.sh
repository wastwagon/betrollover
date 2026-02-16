#!/usr/bin/env bash
# Run migrations 018 and 019 (enabled_leagues category, api_type, bookmaker_tier + backfill)
set -e
cd "$(dirname "$0")/.."

echo "=== Running league/fixtures migrations (018, 019) ==="

run_sql() {
  local file="$1"
  if [ ! -f "$file" ]; then
    echo "  Skip (not found): $file"
    return 0
  fi
  echo "  Applying: $file"
  if command -v docker &>/dev/null && docker compose exec -T postgres psql -U betrollover -d betrollover < "$file" 2>/dev/null; then
    echo "  OK"
    return 0
  fi
  # Fallback: direct psql (e.g. local PostgreSQL)
  if command -v psql &>/dev/null; then
    export PGPASSWORD="${POSTGRES_PASSWORD:-betrollover_dev}"
    psql -h "${POSTGRES_HOST:-localhost}" -p "${POSTGRES_PORT:-5432}" -U "${POSTGRES_USER:-betrollover}" -d "${POSTGRES_DB:-betrollover}" -f "$file" && echo "  OK" && return 0
  fi
  echo "  Failed. Start Docker (docker compose up -d) or set POSTGRES_* in .env and run psql manually."
  return 1
}

# Ensure Postgres is up when using Docker
if command -v docker &>/dev/null; then
  docker compose up -d postgres 2>/dev/null || true
  sleep 2
fi

run_sql "database/migrations/018_enabled_leagues_category_api_type_bookmaker.sql"
run_sql "database/migrations/019_backfill_league_categories.sql"
run_sql "database/migrations/020_add_international_tournaments.sql"
run_sql "database/migrations/021_fixtures_archive.sql"

echo "=== League migrations done ==="
