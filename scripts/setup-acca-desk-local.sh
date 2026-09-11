#!/usr/bin/env bash
# Rebuild API with new Acca Desk roster, setup tipsters, verify locally.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Rebuild + restart API (new roster config)"
docker compose build api
docker compose up -d api

echo "==> Wait for API"
for i in $(seq 1 40); do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:6001/api/v1/tipsters || echo 000)
  if [[ "$code" == "200" ]]; then
    echo "API ready (${i})"
    break
  fi
  sleep 2
done

echo "==> Login admin"
TOKEN=$(curl -s -X POST http://127.0.0.1:6001/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@betrollover.com","password":"password"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))")
if [[ -z "$TOKEN" ]]; then
  echo "ERROR: login failed"
  exit 1
fi

echo "==> Setup Acca Desk tipsters"
curl -s -X POST http://127.0.0.1:6001/api/v1/admin/setup/acca-desk-tipsters \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' | python3 -m json.tool

echo "==> Overview"
curl -s http://127.0.0.1:6001/api/v1/admin/acca-desk/overview \
  -H "Authorization: Bearer $TOKEN" -o /tmp/acca-desk-overview.json
python3 - <<'PY'
import json, sys
d = json.load(open("/tmp/acca-desk-overview.json"))
print(f"rosterSize={d.get('rosterSize')} setupCount={d.get('setupCount')} activeCount={d.get('activeCount')}")
roster = d.get("roster") or []
new = [t for t in roster if any(x in (t.get("username") or "") for x in ("U15", "DNB", "FH1X2", "FHO15"))]
print(f"new_in_roster={len(new)}")
for t in sorted(new, key=lambda x: x.get("username") or ""):
    print(f"  {t.get('username')} | markets={t.get('markets')}")
ok = d.get("rosterSize") == 34 and d.get("setupCount") == 34
print("VERIFY", "OK" if ok else "FAIL (expected roster/setup 34)")
sys.exit(0 if ok else 1)
PY

echo ""
echo "Done. Admin Acca Desk: http://localhost:6002/admin/acca-desk"
