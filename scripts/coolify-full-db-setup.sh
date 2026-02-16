#!/usr/bin/env bash
# One-command full DB setup for Coolify: init + migrations + seeds
# Run inside API container. Usage: docker exec API_CONTAINER bash -c "$(cat scripts/coolify-full-db-setup.sh)"
# Or run on host: docker exec $(docker ps -q -f name=api-aw0so4) bash -c '...'

set -e
export PGPASSWORD="${POSTGRES_PASSWORD}"
DB="psql -h postgres -U betrollover -d betrollover -v ON_ERROR_STOP=1"

echo "=== 1. Init scripts ==="
for f in /app/database/init/01-schema.sql /app/database/init/02-seed-users.sql /app/database/init/03-core-tables.sql \
  /app/database/init/04-seed-wallets.sql /app/database/init/05-fixtures-odds.sql /app/database/init/06-tipster-requests.sql \
  /app/database/init/07-content-pages.sql /app/database/init/08-smtp-settings.sql /app/database/init/09-deposit-withdrawals.sql \
  /app/database/init/10-api-settings.sql /app/database/init/11-performance-indexes.sql \
  /app/database/init/12-enabled-leagues-market-config.sql /app/database/init/13-sync-status.sql; do
  [ -f "$f" ] && echo "  $(basename $f)" && $DB -f "$f" 2>/dev/null || true
done

echo ""
echo "=== 2. Migrations ==="
$DB -c "CREATE TABLE IF NOT EXISTS applied_migrations (id SERIAL PRIMARY KEY, filename VARCHAR(255) UNIQUE NOT NULL, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);" 2>/dev/null || true
for f in $(ls /app/database/migrations/[0-9][0-9][0-9]_*.sql 2>/dev/null | sort); do
  name=$(basename "$f")
  exists=$($DB -t -A -c "SELECT 1 FROM applied_migrations WHERE filename='$name'" 2>/dev/null || echo "")
  if [ "$exists" != "1" ]; then
    echo "  $name"
    $DB -f "$f" 2>/dev/null && $DB -c "INSERT INTO applied_migrations (filename) VALUES ('$name') ON CONFLICT (filename) DO NOTHING" 2>/dev/null || true
  fi
done

echo ""
echo "=== 3. Seeds ==="
for f in /app/database/seeds/news-resources-seed.sql /app/database/seeds/news-2026-seed.sql \
  /app/database/seeds/comprehensive-seed-data.sql /app/database/seeds/ai-tipsters-full-seed.sql; do
  [ -f "$f" ] && echo "  $(basename $f)" && $DB -f "$f" 2>/dev/null || true
done

echo ""
echo "=== Done. Users: $($DB -t -A -c 'SELECT COUNT(*) FROM users' 2>/dev/null || echo '?') ==="
