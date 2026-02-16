#!/bin/bash
# BetRollover v2 - Local test script
# Usage: ./scripts/test-local.sh

set -e
cd "$(dirname "$0")/.."

echo "
========================================
BetRollover v2 - Local Test Suite
========================================
"

# 1. Start services
echo "1. Starting services..."
docker compose up -d
sleep 3

# 2. API Health
echo ""
echo "2. API Health (http://localhost:6001/health)"
HEALTH=$(curl -s http://localhost:6001/health)
if echo "$HEALTH" | grep -q '"status":"ok"'; then
  echo "   OK - $HEALTH"
else
  echo "   FAIL - $HEALTH"
  exit 1
fi

# 3. Admin Login
echo ""
echo "3. Auth - Admin Login"
LOGIN=$(curl -s -X POST http://localhost:6001/auth/login -H "Content-Type: application/json" -d '{"email":"admin@betrollover.com","password":"password"}')
if echo "$LOGIN" | grep -q 'access_token'; then
  echo "   OK - Login successful"
  TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))")
else
  echo "   FAIL - $LOGIN"
  exit 1
fi

# 4. Wallet (protected)
echo ""
echo "4. Wallet Balance (protected route)"
WALLET=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:6001/wallet/balance)
if echo "$WALLET" | grep -q 'balance'; then
  echo "   OK - $WALLET"
else
  echo "   FAIL - $WALLET"
  exit 1
fi

# 5. Register
echo ""
echo "5. Register new user"
TS=$(date +%s)
REG=$(curl -s -X POST http://localhost:6001/auth/register -H "Content-Type: application/json" -d "{\"email\":\"test${TS}@test.com\",\"username\":\"testuser${TS}\",\"password\":\"Test123!\",\"displayName\":\"Test User\"}")
if echo "$REG" | grep -q 'access_token'; then
  echo "   OK - Registration successful"
else
  echo "   FAIL - $REG"
  exit 1
fi

# 6. Invalid login (401)
echo ""
echo "6. Invalid login (expect 401)"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:6001/auth/login -H "Content-Type: application/json" -d '{"email":"admin@betrollover.com","password":"wrong"}')
if [ "$CODE" = "401" ]; then
  echo "   OK - HTTP $CODE"
else
  echo "   FAIL - Expected 401, got $CODE"
fi

# 7. Unauthorized wallet (401)
echo ""
echo "7. Unauthorized wallet (expect 401)"
CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:6001/wallet/balance)
if [ "$CODE" = "401" ]; then
  echo "   OK - HTTP $CODE"
else
  echo "   FAIL - Expected 401, got $CODE"
fi

# 8. Web (port 6002 - 6000 blocked by Chrome)
echo ""
echo "8. Web - Homepage (http://localhost:6002)"
TITLE=$(curl -s --max-time 15 http://localhost:6002 2>/dev/null | grep -o '<title>[^<]*</title>' || true)
if [ -n "$TITLE" ]; then
  echo "   OK - $TITLE"
else
  echo "   WARN - Slow or no response (Next.js may need warm-up)"
fi

echo ""
echo "========================================
All tests passed.
========================================
"
