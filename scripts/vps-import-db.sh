#!/usr/bin/env bash
# BetRollover - Import database on Hostinger VPS (or any Linux server)
# Run this ON the VPS terminal after cloning the repo and setting up PostgreSQL.
#
# Two modes:
#   A) Import from dump (local DB exported with export-db-for-vps.sh):
#      DUMP_FILE=database/dump/betrollover-20260216-123456.sql ./scripts/vps-import-db.sh
#
#   B) Fresh setup (init + migrations + seeds from project files):
#      ./scripts/vps-import-db.sh
#
# Requires: psql (postgresql-client). Install: apt install postgresql-client
#
# Env vars (or .env in project root):
#   POSTGRES_HOST, POSTGRES_PORT, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB

set -e
cd "$(dirname "$0")/.."

# Load .env if present
if [ -f .env ]; then
  export $(grep -v '^#' .env | grep -v '^$' | xargs) 2>/dev/null || true
fi

HOST="${POSTGRES_HOST:-localhost}"
PORT="${POSTGRES_PORT:-5432}"
USER="${POSTGRES_USER:-betrollover}"
DB="${POSTGRES_DB:-betrollover}"
export PGPASSWORD="${POSTGRES_PASSWORD}"

if [ -z "$PGPASSWORD" ]; then
  echo "ERROR: Set POSTGRES_PASSWORD (or add to .env)"
  exit 1
fi

if ! command -v psql &>/dev/null; then
  echo "ERROR: psql not found. Install: apt install postgresql-client"
  exit 1
fi

run_sql() {
  local file="$1"
  [ ! -f "$file" ] && return 1
  psql -h "$HOST" -p "$PORT" -U "$USER" -d "$DB" -f "$file" -v ON_ERROR_STOP=1
}

echo "=== BetRollover VPS Database Import ==="
echo "  Host: $HOST:$PORT  DB: $DB  User: $USER"
echo ""

if [ -n "$DUMP_FILE" ]; then
  # Mode A: Import from dump file
  DUMP_PATH="$DUMP_FILE"
  if [[ "$DUMP_FILE" == *"*"* ]]; then
    DUMP_PATH=$(ls $DUMP_FILE 2>/dev/null | head -1)
  fi
  if [ ! -f "$DUMP_PATH" ]; then
    echo "ERROR: Dump file not found: $DUMP_FILE"
    exit 1
  fi
  echo "[1/1] Importing dump: $DUMP_PATH"
  psql -h "$HOST" -p "$PORT" -U "$USER" -d "$DB" -f "$DUMP_PATH" -v ON_ERROR_STOP=1 || true
  echo ""
  echo "=== Import complete (from dump) ==="
  exit 0
fi

# Mode B: Fresh setup - init + migrations + seeds
echo "[1/4] Running init scripts..."
for f in database/init/01-schema.sql database/init/02-seed-users.sql database/init/03-core-tables.sql \
         database/init/04-seed-wallets.sql database/init/05-fixtures-odds.sql database/init/06-tipster-requests.sql \
         database/init/07-content-pages.sql database/init/08-smtp-settings.sql database/init/09-deposit-withdrawals.sql \
         database/init/10-api-settings.sql database/init/11-performance-indexes.sql \
         database/init/12-enabled-leagues-market-config.sql database/init/13-sync-status.sql; do
  if [ -f "$f" ]; then
    echo "  $(basename "$f")"
    run_sql "$f" 2>/dev/null || true
  fi
done

echo ""
echo "[2/4] Running migrations..."
MIG_DIR="database/migrations"
if [ ! -d "$MIG_DIR" ]; then
  echo "  Migrations dir not found. Skip."
else
  # Create applied_migrations table
  psql -h "$HOST" -p "$PORT" -U "$USER" -d "$DB" -v ON_ERROR_STOP=1 <<'EOSQL'
CREATE TABLE IF NOT EXISTS applied_migrations (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) UNIQUE NOT NULL,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
EOSQL
  for f in $(ls "$MIG_DIR"/[0-9][0-9][0-9]_*.sql 2>/dev/null | sort); do
    name=$(basename "$f")
    exists=$(psql -h "$HOST" -p "$PORT" -U "$USER" -d "$DB" -t -A -c "SELECT 1 FROM applied_migrations WHERE filename='$name'" 2>/dev/null || echo "")
    if [ "$exists" != "1" ]; then
      echo "  $name"
      if psql -h "$HOST" -p "$PORT" -U "$USER" -d "$DB" -f "$f" -v ON_ERROR_STOP=1 2>/dev/null; then
        psql -h "$HOST" -p "$PORT" -U "$USER" -d "$DB" -c "INSERT INTO applied_migrations (filename) VALUES ('$name') ON CONFLICT (filename) DO NOTHING" 2>/dev/null || true
      fi
    fi
  done
fi

echo ""
echo "[3/4] Running seeds..."
for seed in news-resources-seed.sql news-2026-seed.sql comprehensive-seed-data.sql ai-tipsters-full-seed.sql; do
  f="database/seeds/$seed"
  if [ -f "$f" ]; then
    echo "  $seed"
    psql -h "$HOST" -p "$PORT" -U "$USER" -d "$DB" -f "$f" -v ON_ERROR_STOP=1 2>/dev/null || true
  fi
done

echo ""
echo "[4/4] Verifying..."
ROWS=$(psql -h "$HOST" -p "$PORT" -U "$USER" -d "$DB" -t -A -c "SELECT COUNT(*) FROM users" 2>/dev/null || echo "0")
echo "  Users: $ROWS"
echo ""
echo "=== Import complete (migrations + seeds) ==="
echo "  Admin: admin@betrollover.com / password"
echo ""
