#!/usr/bin/env bash
# BetRollover - Environment validation (Phase 2)
# Run from project root. Safe for local dev; stricter in production.
# Usage: bash scripts/check-env.sh
#
# Exit codes: 0 = ok, 1 = critical failure (e.g. .env missing when required)

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ERRORS=0
WARNINGS=0

fail()  { echo "  ✗ $1"; ERRORS=$((ERRORS+1)); }
warn()  { echo "  ⚠ $1"; WARNINGS=$((WARNINGS+1)); }
ok()    { echo "  ✓ $1"; }

# Load .env if present
[ -f .env ] && source .env 2>/dev/null || true

echo "=========================================="
echo "  BetRollover Environment Check"
echo "=========================================="
echo ""

# ──────────────────────────────────────────────
# .env file
# ──────────────────────────────────────────────
echo "[1/4] .env file..."
if [ -f .env ]; then
  ok ".env exists"
else
  fail ".env missing — run: cp .env.example .env"
  echo ""
  echo "  Quick fix: cp .env.example .env"
  echo "  Then edit .env with your keys."
  echo ""
  exit 1
fi
echo ""

# ──────────────────────────────────────────────
# Critical variables
# ──────────────────────────────────────────────
echo "[2/4] Critical variables..."

if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "your-super-secret-jwt-key-min-32-chars" ]; then
  fail "JWT_SECRET not set or still placeholder"
  echo "  Generate: openssl rand -base64 48"
else
  ok "JWT_SECRET is set"
  if [ ${#JWT_SECRET} -lt 32 ]; then
    fail "JWT_SECRET too short (${#JWT_SECRET} chars, need ≥32)"
  fi
fi

[ -z "$POSTGRES_PASSWORD" ] && fail "POSTGRES_PASSWORD not set" || ok "POSTGRES_PASSWORD set"
[ -z "$APP_URL" ] && warn "APP_URL not set (defaults used)" || ok "APP_URL set"
[ -z "$NEXT_PUBLIC_API_URL" ] && warn "NEXT_PUBLIC_API_URL not set" || ok "NEXT_PUBLIC_API_URL set"
echo ""

# ──────────────────────────────────────────────
# Optional but recommended
# ──────────────────────────────────────────────
echo "[3/4] Optional (recommended for production)..."
[ -z "$API_SPORTS_KEY" ] && warn "API_SPORTS_KEY not set — football fixtures disabled" || ok "API_SPORTS_KEY set"
[ -z "$ODDS_API_KEY" ] && warn "ODDS_API_KEY not set — multi-sport odds disabled" || ok "ODDS_API_KEY set"
[ -z "$SENDGRID_API_KEY" ] && warn "SENDGRID_API_KEY not set — email OTP disabled" || ok "SENDGRID_API_KEY set"
[ -z "$PAYSTACK_SECRET_KEY" ] && warn "PAYSTACK_SECRET_KEY not set — payments disabled" || ok "PAYSTACK_SECRET_KEY set"
[ -z "$VAPID_PUBLIC_KEY" ] && warn "VAPID_PUBLIC_KEY not set — push notifications disabled" || ok "VAPID keys set"
echo ""

# ──────────────────────────────────────────────
# Production URL check
# ──────────────────────────────────────────────
echo "[4/4] Production readiness..."
if [ "$NODE_ENV" = "production" ]; then
  if echo "${APP_URL:-}" | grep -q "localhost"; then
    fail "APP_URL must not be localhost in production"
  fi
  len=${#JWT_SECRET}
  if [ -z "$JWT_SECRET" ] || [ "$len" -lt 32 ]; then
    fail "JWT_SECRET required and ≥32 chars in production"
  fi
else
  ok "Development mode — relaxed checks"
fi
echo ""

# ──────────────────────────────────────────────
# Summary
# ──────────────────────────────────────────────
echo "=========================================="
if [ "$ERRORS" -gt 0 ]; then
  echo "  ✗ $ERRORS error(s)"
  [ "$WARNINGS" -gt 0 ] && echo "  ⚠ $WARNINGS warning(s)"
  echo "=========================================="
  exit 1
else
  echo "  ✓ Environment check passed"
  [ "$WARNINGS" -gt 0 ] && echo "  ⚠ $WARNINGS warning(s)"
  echo "=========================================="
  exit 0
fi
