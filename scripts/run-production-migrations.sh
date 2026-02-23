#!/usr/bin/env bash
# Run raw SQL migrations against production database
# Uses same logic as MigrationRunnerService / docker-entrypoint
# Requires: POSTGRES_* env vars or .env.tunnel (for SSH-tunneled prod DB)
#
# Usage:
#   # With tunnel (e.g. db-tunnel pattern):
#   export $(grep -v '^#' backend/.env.tunnel | xargs)
#   bash scripts/run-production-migrations.sh
#
#   # Or inline:
#   POSTGRES_HOST=localhost POSTGRES_PORT=5434 POSTGRES_USER=betrollover POSTGRES_PASSWORD=xxx POSTGRES_DB=betrollover bash scripts/run-production-migrations.sh

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Load .env.tunnel if exists (for prod tunnel)
if [ -f backend/.env.tunnel ]; then
  export $(grep -v '^#' backend/.env.tunnel | xargs)
fi
if [ -f .env ]; then
  export $(grep -v '^#' .env | grep -E '^POSTGRES_|^PG' | xargs)
fi

export PGPASSWORD="${POSTGRES_PASSWORD:-}"
HOST="${POSTGRES_HOST:-${PGHOST:-localhost}}"
PORT="${POSTGRES_PORT:-${PGPORT:-5432}}"
USER="${POSTGRES_USER:-${PGUSER:-betrollover}}"
DB="${POSTGRES_DB:-${PGDATABASE:-betrollover}}"
DB_OPTS="-h $HOST -p $PORT -U $USER -d $DB -v ON_ERROR_STOP=1"
MIG_DIR="database/migrations"

echo "=== Production migrations ==="
echo "  Host: $HOST:$PORT"
echo "  DB:   $DB"
echo ""

# Ensure applied_migrations exists
psql $DB_OPTS -c "CREATE TABLE IF NOT EXISTS applied_migrations (id SERIAL PRIMARY KEY, filename VARCHAR(255) UNIQUE NOT NULL, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);" 2>/dev/null || true

# Run pending numeric migrations
for f in $(ls "$MIG_DIR"/[0-9][0-9][0-9]_*.sql 2>/dev/null | sort); do
  [ -f "$f" ] || continue
  name=$(basename "$f")
  exists=$(psql $DB_OPTS -t -A -c "SELECT 1 FROM applied_migrations WHERE filename='$name'" 2>/dev/null || echo "")
  if [ "$exists" != "1" ]; then
    echo "Running: $name"
    psql $DB_OPTS -f "$f" || { echo "Migration $name failed."; exit 1; }
    psql $DB_OPTS -c "INSERT INTO applied_migrations (filename) VALUES ('$name') ON CONFLICT (filename) DO NOTHING" 2>/dev/null || true
    echo "  ✓ Applied"
  fi
done

echo ""
echo "=== Migrations complete ==="
