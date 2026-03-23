#!/usr/bin/env bash
# Local smoke test: league table + top scorers (API-Football) via the Nest API.
# Requires: docker compose up (or API on PORT), .env with API_SPORTS_KEY, seeded admin user.
#
# Usage:
#   ./scripts/test-league-insights-local.sh
#   ./scripts/test-league-insights-local.sh 78 2025
#   API_BASE=http://127.0.0.1:6001/api/v1 ./scripts/test-league-insights-local.sh

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck disable=SC1091
[ -f "$ROOT/.env" ] && set -a && source "$ROOT/.env" && set +a

API_BASE="${API_BASE:-http://localhost:6001/api/v1}"
EMAIL="${ADMIN_EMAIL:-admin@betrollover.com}"
PASSWORD="${ADMIN_PASSWORD:-password}"
LEAGUE_ID="${1:-78}"
SEASON="${2:-2025}"

echo "=== League insights local test ($API_BASE) ==="
echo "League API id=$LEAGUE_ID season=$SEASON (refresh=1)"

LOGIN_JSON=$(curl -sS -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo "$LOGIN_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('access_token',''))")
if [ -z "$TOKEN" ]; then
  echo "Login failed. Response:" >&2
  echo "$LOGIN_JSON" >&2
  exit 1
fi

echo "Logged in."
curl -sS -H "Authorization: Bearer $TOKEN" \
  "$API_BASE/fixtures/leagues/$LEAGUE_ID/insights?season=$SEASON&refresh=1" \
  | python3 -c "
import json,sys
d=json.load(sys.stdin)
stand=d.get('standings') or []
scorers=d.get('topScorers') or []
rows=sum(len(g.get('table') or []) for g in stand)
print('season:', d.get('season'), 'fromCache:', d.get('fromCache'))
print('league:', d.get('leagueName'), '/', d.get('country'))
print('error:', d.get('error'))
print('standings: groups=', len(stand), 'rows=', rows)
print('topScorers:', len(scorers))
if rows and stand[0].get('table'):
  print('sample (top 5):')
  for r in stand[0]['table'][:5]:
    print(' ', r.get('rank'), r.get('teamName'), r.get('points'), 'GF', r.get('goalsFor'), 'GA', r.get('goalsAgainst'))
if scorers:
  print('top scorer:', scorers[0].get('playerName'), scorers[0].get('goals'), 'goals')
if rows == 0:
  print('FAIL: no standings rows. error:', d.get('error'))
  sys.exit(1)
"
echo "=== OK ==="
