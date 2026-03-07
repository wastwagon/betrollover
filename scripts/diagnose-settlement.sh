#!/bin/bash
# Settlement diagnostic - run on VPS or via Coolify
# Usage from project root:
#   ./scripts/diagnose-settlement.sh
# Or directly:
#   docker compose exec -T postgres psql -U betrollover -d betrollover -f scripts/diagnose-settlement.sql

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SQL_FILE="$SCRIPT_DIR/diagnose-settlement.sql"
DB_USER="${POSTGRES_USER:-betrollover}"
DB_NAME="${POSTGRES_DB:-betrollover}"

cd "$PROJECT_ROOT"

echo "=== BetRollover Settlement Diagnostic ==="
echo ""

if command -v docker &>/dev/null; then
  cat "$SQL_FILE" | docker compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -f -
elif [ -n "$PGHOST" ] || [ -n "$DATABASE_URL" ]; then
  psql -U "$DB_USER" -d "$DB_NAME" -f "$SQL_FILE"
else
  echo "Run: docker compose exec -T postgres psql -U $DB_USER -d $DB_NAME -f scripts/diagnose-settlement.sql"
  exit 1
fi

echo ""
echo ""
echo "Interpretation:"
echo "- If 'without_fixture_id' is high: seed data or Create Coupon flow did not link picks to fixtures."
echo "- Settlement only processes picks where fixture_id IS NOT NULL and points to a finished fixture."
echo "- Fix: Create coupons via the app (selecting real fixtures), or backfill fixture_id for existing picks."
echo ""
