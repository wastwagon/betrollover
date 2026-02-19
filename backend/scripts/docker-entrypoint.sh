#!/bin/sh
# Run migrations via psql before starting the API.
# psql handles DO $$ blocks and all PostgreSQL syntax correctly.
# Migrations run automatically on every container start (idempotent via applied_migrations).

set -e

export PGPASSWORD="${POSTGRES_PASSWORD:-}"
DB_OPTS="-h ${POSTGRES_HOST:-localhost} -p ${POSTGRES_PORT:-5432} -U ${POSTGRES_USER:-betrollover} -d ${POSTGRES_DB:-betrollover} -v ON_ERROR_STOP=1"
MIGRATIONS_DIR="${MIGRATIONS_PATH:-/app/database/migrations}"

# Wait for postgres to be ready
echo "Waiting for PostgreSQL..."
until pg_isready -h "${POSTGRES_HOST:-localhost}" -p "${POSTGRES_PORT:-5432}" -U "${POSTGRES_USER:-betrollover}" -d "${POSTGRES_DB:-betrollover}" 2>/dev/null; do
  sleep 2
done

# Ensure applied_migrations table exists
psql $DB_OPTS -c "CREATE TABLE IF NOT EXISTS applied_migrations (id SERIAL PRIMARY KEY, filename VARCHAR(255) UNIQUE NOT NULL, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);" 2>/dev/null || true

# Run pending migrations via psql -f (handles DO $$ blocks correctly)
if [ -d "$MIGRATIONS_DIR" ]; then
  for f in $(ls "$MIGRATIONS_DIR"/[0-9][0-9][0-9]_*.sql 2>/dev/null | sort); do
    [ -f "$f" ] || continue
    name=$(basename "$f")
    exists=$(psql $DB_OPTS -t -A -c "SELECT 1 FROM applied_migrations WHERE filename='$name'" 2>/dev/null || echo "")
    if [ "$exists" != "1" ]; then
      echo "Running migration: $name"
      if ! psql $DB_OPTS -f "$f"; then
        echo "Migration $name failed. Exiting."
        exit 1
      fi
      psql $DB_OPTS -c "INSERT INTO applied_migrations (filename) VALUES ('$name') ON CONFLICT (filename) DO NOTHING" 2>/dev/null || true
    fi
  done
fi

# Start the API
exec "$@"
