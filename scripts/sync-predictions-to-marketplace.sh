#!/usr/bin/env bash
# Sync AI predictions to marketplace (free by default)
# Run after: migration 029, setup/ai-tipsters, and predictions/generate
# Usage: ./scripts/sync-predictions-to-marketplace.sh

set -e
cd "$(dirname "$0")/.."

API_URL="${API_URL:-http://localhost:6001}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@betrollover.com}"
ADMIN_PASS="${ADMIN_PASS:-password}"

echo "=== Sync Predictions to Marketplace ==="

# Login
LOGIN_RESP=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\"}" 2>/dev/null || true)

if ! echo "$LOGIN_RESP" | grep -q '"accessToken"'; then
  echo "Login failed. Set ADMIN_EMAIL and ADMIN_PASS, or run:"
  echo "  curl -X POST $API_URL/auth/login -H 'Content-Type: application/json' -d '{\"email\":\"YOUR_EMAIL\",\"password\":\"YOUR_PASS\"}'"
  exit 1
fi

TOKEN=$(echo "$LOGIN_RESP" | grep -oE '"access_token":"[^"]*"' | cut -d'"' -f4)
echo "Logged in. Syncing..."

RESP=$(curl -s -X POST "$API_URL/admin/predictions/sync-to-marketplace" -H "Authorization: Bearer $TOKEN")
echo "$RESP" | head -c 500
echo ""
echo "Done. All AI coupons are free on marketplace unless admin sets a price."
