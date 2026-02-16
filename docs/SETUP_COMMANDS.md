# BetRollover - Setup Commands

Copy-paste these commands to set up everything.

---

## One-command setup

```bash
chmod +x scripts/setup-everything.sh && ./scripts/setup-everything.sh
```

This runs: Docker up → migrations → leagues (if API key) → fixtures sync → AI tipsters → predictions.

---

## Manual step-by-step

### 1. Environment

```bash
cd /path/to/BetRolloverNew
cp .env.example .env
# Edit .env: add API_SPORTS_KEY (from api-football.com) for fixtures
```

### 2. Start services

```bash
docker compose up -d
```

### 3. Wait for API, then run migrations (if needed)

```bash
# League migrations (015–017, 018–021)
./scripts/run-league-migrations.sh
```

### 4. Generate comprehensive leagues (optional)

```bash
# Requires API_SPORTS_KEY in .env
npx ts-node scripts/generate-leagues-migration.ts
# Then apply:
docker compose exec -T postgres psql -U betrollover -d betrollover < database/migrations/026_comprehensive_professional_leagues.sql
```

### 5. Login & get token

```bash
TOKEN=$(curl -s -X POST http://localhost:6001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@betrollover.com","password":"password"}' \
  | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
echo $TOKEN
```

### 6. Sync fixtures

```bash
curl -X POST http://localhost:6001/fixtures/sync \
  -H "Authorization: Bearer $TOKEN"
```

### 7. Setup AI tipsters

```bash
curl -X POST http://localhost:6001/admin/setup/ai-tipsters \
  -H "Authorization: Bearer $TOKEN"
```

### 8. Run migration 029 (tipster user + prediction marketplace link)

```bash
docker compose exec -T postgres psql -U betrollover -d betrollover < database/migrations/029_tipster_user_and_prediction_marketplace.sql
```

### 9. Generate predictions

```bash
curl -X POST http://localhost:6001/admin/predictions/generate \
  -H "Authorization: Bearer $TOKEN"
```

### 10. Sync predictions to marketplace (all AI coupons free by default)

```bash
curl -X POST http://localhost:6001/admin/predictions/sync-to-marketplace \
  -H "Authorization: Bearer $TOKEN"
```

Or use the script:

```bash
./scripts/sync-predictions-to-marketplace.sh
```

---

## Quick reference

| Step | Command |
|------|---------|
| Start | `docker compose up -d` |
| Leagues | `./scripts/run-league-migrations.sh` |
| Migration 029 | `docker compose exec -T postgres psql -U betrollover -d betrollover < database/migrations/029_tipster_user_and_prediction_marketplace.sql` |
| Login | `curl -X POST http://localhost:6001/auth/login -H "Content-Type: application/json" -d '{"email":"admin@betrollover.com","password":"password"}'` |
| Sync fixtures | `curl -X POST http://localhost:6001/fixtures/sync -H "Authorization: Bearer $TOKEN"` |
| AI tipsters | `curl -X POST http://localhost:6001/admin/setup/ai-tipsters -H "Authorization: Bearer $TOKEN"` |
| Predictions | `curl -X POST http://localhost:6001/admin/predictions/generate -H "Authorization: Bearer $TOKEN"` |
| Sync to marketplace | `curl -X POST http://localhost:6001/admin/predictions/sync-to-marketplace -H "Authorization: Bearer $TOKEN"` |

**Admin:** `admin@betrollover.com` / `password`
