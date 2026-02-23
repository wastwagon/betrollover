#!/usr/bin/env bash
# Pre-deploy verification: env vars, builds, migrations, Docker config
# Run from project root before every production deploy.
# Usage: bash scripts/pre-deploy-verify.sh
#
# Exit codes: 0 = all checks passed, 1 = critical failure

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ERRORS=0
WARNINGS=0

fail()  { echo "  ✗ $1"; ERRORS=$((ERRORS+1)); }
warn()  { echo "  ⚠ $1"; WARNINGS=$((WARNINGS+1)); }
ok()    { echo "  ✓ $1"; }

# Load .env if present (local dev verification)
[ -f .env ] && source .env 2>/dev/null || true

echo "=========================================="
echo "  BetRollover Pre-Deploy Verification"
echo "=========================================="
echo ""

# ──────────────────────────────────────────────
# STEP 1: Required environment variables
# ──────────────────────────────────────────────
echo "[1/7] Checking required environment variables..."

check_required() {
  local var="$1"; local value="${!var}"
  if [ -z "$value" ] || [ "$value" = "your-super-secret-jwt-key-min-32-chars" ] || \
     [ "$value" = "sk_live_xxx" ] || [ "$value" = "pk_live_xxx" ]; then
    fail "$var is not set or still using placeholder"
  else
    ok "$var is set"
  fi
}
check_warn() {
  local var="$1"; local value="${!var}"
  [ -z "$value" ] && warn "$var not set (optional but recommended)" || ok "$var is set"
}

check_required JWT_SECRET
check_required POSTGRES_USER
check_required POSTGRES_PASSWORD
check_required POSTGRES_DB
check_required APP_URL
check_required NEXT_PUBLIC_API_URL
check_required NEXT_PUBLIC_APP_URL

check_warn API_SPORTS_KEY
check_warn ODDS_API_KEY
check_warn PAYSTACK_SECRET_KEY
check_warn PAYSTACK_PUBLIC_KEY
check_warn SENDGRID_API_KEY
check_warn VAPID_PUBLIC_KEY
check_warn VAPID_PRIVATE_KEY

# JWT secret must be at least 32 chars
if [ -n "$JWT_SECRET" ] && [ ${#JWT_SECRET} -lt 32 ]; then
  fail "JWT_SECRET is too short (${#JWT_SECRET} chars, need ≥32)"
fi

# Production URL should not be localhost
if echo "${APP_URL:-}" | grep -q "localhost"; then
  warn "APP_URL contains 'localhost' — set to your real domain for production"
fi
echo ""

# ──────────────────────────────────────────────
# STEP 2: Migration files present
# ──────────────────────────────────────────────
echo "[2/7] Checking database migration files..."
EXPECTED_MIGRATIONS=(
  "048_multi_sport_foundation.sql"
  "049_add_team_logos_and_country_codes.sql"
  "050_add_sport_to_news.sql"
  "051_add_platform_commission.sql"
  "052_add_coupon_reviews.sql"
  "053_add_support_tickets.sql"
  "054_add_referrals.sql"
  "055_add_chat_system.sql"
  "056_add_language_to_news_resources.sql"
  "057_add_ad_zones.sql"
  "058_add_high_traffic_ad_zones.sql"
  "059_add_ad_cost_and_analytics.sql"
  "060_add_refresh_tokens.sql"
  "061_add_errors_to_analytics_daily.sql"
)
for mig in "${EXPECTED_MIGRATIONS[@]}"; do
  if [ -f "database/migrations/$mig" ]; then
    ok "$mig present"
  else
    fail "$mig MISSING from database/migrations/"
  fi
done

# Count total numeric migrations
total=$(ls database/migrations/[0-9][0-9][0-9]_*.sql 2>/dev/null | wc -l | tr -d ' ')
ok "$total numeric migrations found in database/migrations/"
echo ""

# ──────────────────────────────────────────────
# STEP 3: Docker init scripts present
# ──────────────────────────────────────────────
echo "[3/7] Checking Docker init scripts..."
EXPECTED_INIT=(
  "01-schema.sql"
  "14-sport-events.sql"
)
for f in "${EXPECTED_INIT[@]}"; do
  if [ -f "database/init/$f" ]; then
    ok "database/init/$f present"
  else
    fail "database/init/$f MISSING"
  fi
done
init_count=$(ls database/init/*.sql 2>/dev/null | wc -l | tr -d ' ')
ok "$init_count init SQL files found"
echo ""

# ──────────────────────────────────────────────
# STEP 4: Dockerfiles present
# ──────────────────────────────────────────────
echo "[4/7] Checking Dockerfiles..."
for df in "backend/Dockerfile.prod" "web/Dockerfile.prod" "docker-compose.prod.yml"; do
  [ -f "$df" ] && ok "$df present" || fail "$df MISSING"
done
echo ""

# ──────────────────────────────────────────────
# STEP 5: Backend build
# ──────────────────────────────────────────────
echo "[5/7] Backend build..."
if (cd backend && npm run build --silent 2>&1); then
  ok "Backend builds successfully"
else
  fail "Backend build FAILED"
fi
echo ""

# ──────────────────────────────────────────────
# STEP 6: Web build
# ──────────────────────────────────────────────
echo "[6/7] Web build..."
if (cd web && npm run build --silent 2>&1); then
  ok "Web builds successfully"
else
  fail "Web build FAILED"
fi
echo ""

# ──────────────────────────────────────────────
# STEP 7: Local DB migration test (optional)
# ──────────────────────────────────────────────
echo "[7/7] Local DB migration check (optional)..."
if command -v psql &>/dev/null; then
  export PGPASSWORD="${POSTGRES_PASSWORD:-betrollover_dev}"
  PG_OPTS="-h ${POSTGRES_HOST:-localhost} -p ${POSTGRES_PORT:-5435} -U ${POSTGRES_USER:-betrollover} -d ${POSTGRES_DB:-betrollover}"
  if psql $PG_OPTS -c "SELECT 1" &>/dev/null 2>&1; then
    for mig in database/migrations/[0-9][0-9][0-9]_*.sql; do
      name=$(basename "$mig")
      applied=$(psql $PG_OPTS -t -A -c "SELECT 1 FROM applied_migrations WHERE filename='$name'" 2>/dev/null || echo "")
      if [ "$applied" = "1" ]; then
        ok "$name already applied"
      else
        echo "  → Running: $name"
        psql $PG_OPTS -f "$mig" || { fail "Migration $name failed"; }
        psql $PG_OPTS -c "INSERT INTO applied_migrations (filename) VALUES ('$name') ON CONFLICT DO NOTHING" &>/dev/null || true
        ok "$name applied"
      fi
    done
  else
    warn "Local Postgres not reachable — skipping migration test"
  fi
else
  warn "psql not found — skipping local migration test"
fi
echo ""

# ──────────────────────────────────────────────
# Summary
# ──────────────────────────────────────────────
echo "=========================================="
if [ "$ERRORS" -gt 0 ]; then
  echo "  ✗ $ERRORS error(s) found — fix before deploying"
  [ "$WARNINGS" -gt 0 ] && echo "  ⚠ $WARNINGS warning(s)"
  echo "=========================================="
  exit 1
else
  echo "  ✓ Pre-deploy checks passed"
  [ "$WARNINGS" -gt 0 ] && echo "  ⚠ $WARNINGS warning(s) — review before going live"
  echo "=========================================="
fi
echo ""
echo "Production deployment flow:"
echo "  1. Push to Git → Coolify rebuilds Docker containers"
echo "  2. DB init scripts run on first fresh deployment"
echo "  3. MigrationRunnerService auto-applies pending migrations on API start"
echo "  4. Admin → Database → Migrations to monitor or manually apply"
echo "  5. Admin → Sports → Trigger sync to populate fixtures and events"
echo ""
echo "For manual production DB migrations:"
echo "  bash scripts/run-production-migrations.sh"
echo ""
