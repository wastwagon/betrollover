# AI Tipster System - Command Reference

This document maps the Python setup commands to the BetRollover NestJS implementation.

---

## Setup Steps (NestJS Equivalent)

| Python Step | NestJS Equivalent | Status |
|-------------|-------------------|--------|
| **STEP 1-2:** Setup project / Install deps | `npm install` in backend/ | ✅ Done |
| **STEP 3:** Create database | `docker compose up -d` + migrations auto-run | ✅ Done |
| **STEP 4:** Initialize AI tipsters | `POST /admin/setup/ai-tipsters` (admin JWT) | ✅ Done |
| **STEP 5:** Train ensemble model | Simplified EV model in TypeScript (no ML training) | ✅ Alternative |
| **STEP 6:** Test prediction engine | `POST /admin/predictions/generate` | ✅ Done |
| **STEP 7:** Start API server | `docker compose up` or `cd backend && npm run start:dev` | ✅ Done |
| **STEP 8:** Start scheduler | Cron jobs run automatically when API starts | ✅ Done |

---

## Testing Commands

```bash
# API base (Docker: 6001, local dev: 6001)
API_URL="http://localhost:6001"

# Test API endpoints (no auth required)
curl $API_URL/tipsters
curl $API_URL/tipsters?limit=10&sort_by=roi&order=desc
curl $API_URL/predictions/today
curl $API_URL/leaderboard
curl $API_URL/leaderboard?period=monthly

# Health check
curl $API_URL/health
```

---

## Admin Endpoints (require JWT)

```bash
# Get JWT first (login as admin)
TOKEN="<your-jwt-token>"

# Initialize AI tipsters
curl -X POST $API_URL/admin/setup/ai-tipsters -H "Authorization: Bearer $TOKEN"

# Manual prediction generation
curl -X POST $API_URL/admin/predictions/generate -H "Authorization: Bearer $TOKEN"

# Generate for specific date (optional)
curl -X POST "$API_URL/admin/predictions/generate?date=2024-02-15" -H "Authorization: Bearer $TOKEN"

# Check results / settle predictions
curl -X POST $API_URL/admin/predictions/check-results -H "Authorization: Bearer $TOKEN"

# Update leaderboard
curl -X POST $API_URL/admin/predictions/update-leaderboard -H "Authorization: Bearer $TOKEN"

# Daily performance snapshot
curl -X POST $API_URL/admin/predictions/daily-snapshot -H "Authorization: Bearer $TOKEN"
```

---

## Cron Schedule (automatic)

| Job | Schedule |
|-----|----------|
| Daily predictions | 9:00 AM |
| Check results | Every hour |
| Leaderboard update | 0:30, 6:30, 12:30, 18:30 |
| Daily snapshot | 11:00 PM |

---

## Quick Start

```bash
# 1. Start services
docker compose up -d

# 2. (Optional) Initialize AI tipsters if not seeded
# Login at http://localhost:6002/login, then use Admin → or curl with JWT

# 3. Sync fixtures (Admin → Fixtures → Sync)
# 4. Generate predictions (Admin → or POST /admin/predictions/generate)
```
