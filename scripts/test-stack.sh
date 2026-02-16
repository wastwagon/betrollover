#!/usr/bin/env bash
# BetRollover – test that stack and fixtures enhancements work together
set -e
cd "$(dirname "$0")/.."
API="${API_URL:-http://localhost:6001}"
WEB="${WEB_URL:-http://localhost:6002}"
PASS=0
FAIL=0

check() {
  if "$@"; then
    echo "  OK: $*"
    ((PASS++)) || true
    return 0
  else
    echo "  FAIL: $*"
    ((FAIL++)) || true
    return 1
  fi
}

echo "=== BetRollover stack & fixtures test ==="
echo ""

echo "1. Docker services"
SVCS=$(docker compose ps -q 2>/dev/null | wc -l | tr -d ' ')
check [ "$SVCS" -ge 4 ]
echo ""

echo "2. API health"
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API/health" 2>/dev/null || echo "000")
check [ "$CODE" = "200" ]

echo "3. Database (enabled_leagues + new columns)"
COUNT=$(docker compose exec -T postgres psql -U betrollover -d betrollover -t -A -c "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'enabled_leagues' AND column_name IN ('category','api_type','bookmaker_tier');" 2>/dev/null | tr -d '\r')
check [ "$COUNT" = "3" ]

echo "4. Auth login"
LOGIN=$(curl -s -X POST "$API/auth/login" -H "Content-Type: application/json" -d '{"email":"admin@betrollover.com","password":"password"}' 2>/dev/null)
if echo "$LOGIN" | grep -q access_token; then
  echo "  OK: auth login"
  ((PASS++)) || true
  TOKEN=$(echo "$LOGIN" | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')
else
  echo "  FAIL: auth login (no token)"
  ((FAIL++)) || true
  TOKEN=""
fi

echo "5. Fixtures filters (countries, categories, leagues)"
if [ -n "$TOKEN" ]; then
  FILTERS=$(curl -s -H "Authorization: Bearer $TOKEN" "$API/fixtures/filters" 2>/dev/null)
  if echo "$FILTERS" | grep -q '"countries"' && echo "$FILTERS" | grep -q '"leagues"'; then
    echo "  OK: filters (countries + leagues)"
    ((PASS++)) || true
  else
    echo "  FAIL: filters response"
    ((FAIL++)) || true
  fi
else
  echo "  SKIP: no token"
fi

echo "6. Fixtures list (today UTC)"
if [ -n "$TOKEN" ]; then
  DATE=$(date -u +%Y-%m-%d)
  FIX=$(curl -s -H "Authorization: Bearer $TOKEN" "$API/fixtures?date=$DATE" 2>/dev/null)
  if echo "$FIX" | grep -q '^\['; then
    echo "  OK: fixtures list"
    ((PASS++)) || true
  else
    echo "  FAIL: fixtures list"
    ((FAIL++)) || true
  fi
else
  echo "  SKIP: no token"
fi

echo "7. Web app"
WEBCODE=$(curl -s -o /dev/null -w "%{http_code}" "$WEB" 2>/dev/null || echo "000")
check [ "$WEBCODE" = "200" ]
echo ""

echo "=== Result: $PASS passed, $FAIL failed ==="
if [ "$FAIL" -eq 0 ]; then
  echo "All checks passed. Stack and fixtures enhancements are working together."
  exit 0
else
  echo "Some checks failed. Fix the failed items above."
  exit 1
fi
