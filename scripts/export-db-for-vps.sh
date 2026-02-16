#!/usr/bin/env bash
# BetRollover - Export local database for VPS import
# Run this on your LOCAL machine. Transfer the output file to your VPS, then run vps-import-db.sh
#
# Usage:
#   ./scripts/export-db-for-vps.sh
#   scp database/dump/betrollover-*.sql user@your-vps:/path/to/project/database/dump/
#   ssh user@your-vps "cd /path/to/project && DUMP_FILE=database/dump/betrollover-*.sql ./scripts/vps-import-db.sh"

set -e
cd "$(dirname "$0")/.."

# Load .env
if [ -f .env ]; then
  export $(grep -v '^#' .env | grep -v '^$' | xargs) 2>/dev/null || true
fi

DUMP_DIR="database/dump"
mkdir -p "$DUMP_DIR"
STAMP=$(date +%Y%m%d-%H%M)
OUTPUT="$DUMP_DIR/betrollover-$STAMP.sql"

echo "=== Exporting BetRollover database for VPS ==="

run_dump() {
  if command -v docker &>/dev/null && docker compose exec -T postgres pg_dump \
    -U "${POSTGRES_USER:-betrollover}" \
    -d "${POSTGRES_DB:-betrollover}" \
    --no-owner \
    --no-acl \
    --clean \
    --if-exists \
    > "$OUTPUT" 2>/dev/null; then
    echo "  Exported via Docker (postgres container)"
    return 0
  fi
  if command -v pg_dump &>/dev/null; then
    export PGPASSWORD="${POSTGRES_PASSWORD:-betrollover_dev}"
    pg_dump \
      -h "${POSTGRES_HOST:-localhost}" \
      -p "${POSTGRES_PORT:-5435}" \
      -U "${POSTGRES_USER:-betrollover}" \
      -d "${POSTGRES_DB:-betrollover}" \
      --no-owner \
      --no-acl \
      --clean \
      --if-exists \
      > "$OUTPUT"
    echo "  Exported via pg_dump (local PostgreSQL)"
    return 0
  fi
  if command -v docker &>/dev/null; then
    docker compose up -d postgres 2>/dev/null
    sleep 3
    docker compose exec -T postgres pg_dump \
      -U "${POSTGRES_USER:-betrollover}" \
      -d "${POSTGRES_DB:-betrollover}" \
      --no-owner \
      --no-acl \
      --clean \
      --if-exists \
      > "$OUTPUT"
    echo "  Exported via Docker (postgres container)"
    return 0
  fi
  return 1
}

if ! run_dump; then
  echo "  ERROR: Need Docker or pg_dump. Start Postgres and run:"
  echo "    pg_dump -h \$POSTGRES_HOST -p \$POSTGRES_PORT -U \$POSTGRES_USER -d \$POSTGRES_DB --no-owner --no-acl --clean --if-exists > $OUTPUT"
  exit 1
fi

echo ""
echo "=== Export complete ==="
echo "  File: $OUTPUT"
echo "  Size: $(du -h "$OUTPUT" | cut -f1)"
echo ""
echo "Next steps:"
echo "  1. Transfer to VPS: scp $OUTPUT user@your-vps:/path/to/project/database/dump/"
echo "  2. On VPS: cd /path/to/project && DUMP_FILE=database/dump/$(basename "$OUTPUT") ./scripts/vps-import-db.sh"
echo ""
