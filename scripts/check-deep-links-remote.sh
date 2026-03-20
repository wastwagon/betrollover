#!/usr/bin/env bash
# After deploy: verify App Links / Universal Links URLs respond (HTTP + JSON sanity).
# Usage:
#   bash scripts/check-deep-links-remote.sh
#   PUBLIC_SITE_URL=https://betrollover.com bash scripts/check-deep-links-remote.sh
#
# Does not validate SHA256 / Apple team ID — only reachability and JSON shape.

set -euo pipefail

BASE="${PUBLIC_SITE_URL:-https://betrollover.com}"
BASE="${BASE%/}"

json_ok() {
  local f="$1"
  command -v jq &>/dev/null && jq empty "$f" 2>/dev/null && return 0
  command -v python3 &>/dev/null && python3 -c "import json; json.load(open('$f'))" 2>/dev/null && return 0
  command -v node &>/dev/null && node -e "JSON.parse(require('fs').readFileSync('$f','utf8'))" 2>/dev/null && return 0
  return 1
}

echo "Checking deep-link endpoints under $BASE"
echo ""

check_json() {
  local url="$1"
  local name="$2"
  local code
  code=$(curl -sS -o /tmp/br_deep_check_body -w '%{http_code}' "$url" || echo "000")
  if [ "$code" != "200" ]; then
    echo "  ✗ $name — HTTP $code ($url)"
    return 1
  fi
  if ! json_ok /tmp/br_deep_check_body; then
    echo "  ✗ $name — not valid JSON ($url)"
    head -c 400 /tmp/br_deep_check_body
    echo ""
    return 1
  fi
  echo "  ✓ $name — OK ($url)"
}

OK=0
check_json "$BASE/.well-known/assetlinks.json" "Android assetlinks" && OK=$((OK + 1)) || true
check_json "$BASE/.well-known/apple-app-site-association" "Apple AASA" && OK=$((OK + 1)) || true
rm -f /tmp/br_deep_check_body

echo ""
if [ "$OK" -eq 2 ]; then
  echo "All checks passed (2/2)."
  exit 0
fi
echo "Some checks failed — fix hosting or CI inject (docs/deep-linking/CI_DEPLOY.md)."
exit 1
