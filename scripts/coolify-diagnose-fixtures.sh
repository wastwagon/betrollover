#!/bin/sh
# Quick fixture sync diagnostic using only curl. Run in Coolify Terminal (api container).
# In Coolify: BetRollover → Terminal → select "api" container → Connect.
# Then: /app/scripts/coolify-diagnose-fixtures.sh
# Or with date: DATE=2025-03-15 /app/scripts/coolify-diagnose-fixtures.sh

DATE="${DATE:-$(date +%Y-%m-%d)}"
if [ -z "$API_SPORTS_KEY" ]; then
  echo "Set API_SPORTS_KEY first (from Admin → Settings or Coolify env)."
  exit 1
fi

echo "=== Football fixtures diagnostic (date: $DATE) ==="
RES=$(curl -s -H "x-apisports-key: $API_SPORTS_KEY" "https://v3.football.api-sports.io/fixtures?date=$DATE")

# Total fixtures (each has "fixture":{"id":)
TOTAL=$(echo "$RES" | grep -o '"fixture":' | wc -l)
echo "Total fixtures returned by API: $TOTAL"

if [ "$TOTAL" = "0" ]; then
  echo "No fixtures for this date. Try: DATE=2025-03-15 $0"
  echo "Or check API key in Admin → Settings."
  exit 0
fi

# Leagues: "league":{"id":123,"name":"League Name"
echo ""
echo "Leagues in this response (id + name) — enable these in Admin → Fixtures → Leagues to see them in the app:"
echo "$RES" | grep -oE '"league":\{"id":[0-9]+,"name":"[^"]*"' | sed 's/"league":{"id":/  League /;s/,"name":"/ : /;s/"$//' | sort -u

echo ""
echo "Teams matching Fenerbahce / Porto / Benfica / Galatasaray:"
echo "$RES" | grep -oE '"name":"[^"]*"' | grep -iE 'fenerbahce|porto|benfica|galatasaray|besiktas' | sort -u || echo "  (none for this date)"

echo ""
echo "→ If a league above is missing in your app, add it in Admin → Fixtures → Leagues (use the League ID)."
echo "→ Then run sync (or wait for next scheduled sync)."
