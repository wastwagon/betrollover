#!/usr/bin/env bash
# BetRollover - Coolify database diagnostic
# Run this on the VPS (where Coolify runs) to check why the database has no data.
#
# Usage: ./scripts/coolify-db-diagnose.sh
# Or: bash scripts/coolify-db-diagnose.sh
#
# Run from project root, or set PROJECT_DIR to the Coolify deployment path.

set -e
# Run from anywhere - finds containers by name
echo "=== BetRollover Coolify Database Diagnostic ==="
echo ""

# Find postgres container (Coolify may use different naming)
PG_CONTAINER=""
for name in betrollover-postgres postgres; do
  if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${name}"; then
    PG_CONTAINER="$name"
    break
  fi
done

if [ -z "$PG_CONTAINER" ]; then
  echo "Postgres container not found. Is the app running?"
  docker ps -a --format 'table {{.Names}}\t{{.Status}}' 2>/dev/null | head -20
  exit 1
fi

echo "Postgres container: $PG_CONTAINER"
echo ""

# Get DB credentials from env or docker
POSTGRES_USER="${POSTGRES_USER:-betrollover}"
POSTGRES_DB="${POSTGRES_DB:-betrollover}"
export PGPASSWORD="${POSTGRES_PASSWORD}"

if [ -z "$PGPASSWORD" ]; then
  PGPASSWORD=$(docker exec "$PG_CONTAINER" printenv POSTGRES_PASSWORD 2>/dev/null || true)
  export PGPASSWORD
fi

echo "[1] Table counts:"
docker exec "$PG_CONTAINER" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "
SELECT 'users: ' || COUNT(*) FROM users;
SELECT 'applied_migrations: ' || COUNT(*) FROM applied_migrations;
" 2>/dev/null || echo "  (could not query)"

echo ""
echo "[2] Applied migrations:"
docker exec "$PG_CONTAINER" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT filename FROM applied_migrations ORDER BY id;" 2>/dev/null || echo "  (applied_migrations table missing or empty)"

echo ""
echo "[3] Admin user exists?"
docker exec "$PG_CONTAINER" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT email, role FROM users WHERE role='admin';" 2>/dev/null || echo "  (users table missing)"

echo ""
echo "=== Next steps ==="
echo "If users=0 or no admin: seeds did not run. Check API container logs in Coolify."
echo "To manually run seeds, use: scripts/coolify-run-seeds.sh"
echo ""
