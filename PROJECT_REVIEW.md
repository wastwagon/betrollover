# BetRollover – Project & Database Review

**Date:** 2026-02-16  
**Scope:** Full project structure, database schema, init scripts, migrations, API, and deployment.

---

## Executive Summary

| Category | Status | Action |
|----------|--------|--------|
| **Architecture** | ✅ Solid | NestJS + Next.js + PostgreSQL + Redis |
| **Database Init** | ✅ Complete | 13 init scripts, proper order |
| **Migrations** | ⚠️ Issues | 3 MySQL files, 1 orphan; dev seeds mount missing |
| **API Integrations** | ✅ Fixed | API-Football `page` param removed |
| **Deployment** | ✅ Ready | Coolify prod stack, auto migrations |
| **Security** | ⚠️ Checklist | Change default admin password in prod |

---

## 1. Project Structure

```
BetRolloverNew/
├── backend/           # NestJS API (TypeScript)
├── web/               # Next.js 14 (React, Tailwind)
├── database/
│   ├── init/          # 13 scripts – run on first Postgres start only
│   ├── migrations/    # 010–037 – run on API startup
│   └── seeds/         # News, resources, AI tipsters – run after migrations
├── scripts/           # Coolify setup, diagnostics
├── docker-compose.yml       # Local dev
└── docker-compose.prod.yml  # Coolify production
```

---

## 2. Database Review

### 2.1 Init Scripts (run only on empty Postgres volume)

| File | Purpose |
|------|---------|
| 01-schema.sql | users, update_updated_at_column() |
| 02-seed-users.sql | admin, tipster demo (password: `password`) |
| 03-core-tables.sql | accumulator_tickets, wallets, escrow, notifications |
| 04-seed-wallets.sql | Wallet for admin/tipster |
| 05-fixtures-odds.sql | leagues, fixtures, fixture_odds |
| 06-tipster-requests.sql | tipster_requests |
| 07-content-pages.sql | content_pages |
| 08-smtp-settings.sql | smtp_settings |
| 09-deposit-withdrawals.sql | deposit_requests, withdrawal_requests |
| 10-api-settings.sql | api_settings (API-Sports key) |
| 11-performance-indexes.sql | Indexes |
| 12-enabled-leagues-market-config.sql | enabled_leagues, market_config |
| 13-sync-status.sql | sync_status |

**Issue:** If Postgres volume already exists (e.g. redeploy), init scripts are **skipped**. Use manual setup or fresh volume.

### 2.2 Migrations (run on every API startup)

**Auto-run pattern:** `^\d{3}_.*\.sql$` (010_*, 011_*, … 037_*)

| Range | Purpose |
|-------|---------|
| 010–014 | tipster_requests, content_pages, smtp, deposits, withdrawals |
| 015–021 | Leagues, fixtures, enabled_leagues |
| 022–030 | Tipsters, predictions, analytics |
| 031–037 | Merge users, smart coupons, Paystack, news, resources, ads |

**Non-numeric (not auto-run):**

| File | Issue |
|------|-------|
| `convert_users_to_tipsters.sql` | PostgreSQL ✓ – one-off; run manually if needed |
| `add_national_teams.sql` | **MySQL syntax** – incompatible with PostgreSQL |
| `create_notifications_system.sql` | **MySQL syntax** – incompatible with PostgreSQL |

### 2.3 Entity ↔ Table Alignment

All 38 TypeORM entities map to init/migration-created tables. No orphan entities.

---

## 3. Issues & Resolutions

### 3.1 ✅ FIXED: API-Football fixtures `page` parameter

**Was:** `/fixtures?date=...&page=1` → API returned `"The Page field do not exist"`  
**Fixed:** Removed `page` param; fetch once per date.

### 3.2 ✅ FIXED: Migration directory permissions (prod)

**Was:** `node` user might not read `/app/database/migrations`  
**Fixed:** `chown -R node:node /app/database` in Dockerfile.prod.

### 3.3 ✅ FIXED: Dev seeds not found

**Was:** Only `database/migrations` mounted; `database/seeds` missing in dev API container.  
**Fixed:** Mount `./database/seeds:/app/database/seeds` in docker-compose.yml.

### 3.4 ⚠️ MySQL migrations (document only)

`add_national_teams.sql` and `create_notifications_system.sql` use MySQL syntax (`BACKTICKS`, `INT(11)`, `AUTO_INCREMENT`, `ENUM`, `ENGINE=InnoDB`). They are not auto-run and would fail on PostgreSQL. Options:

- **A)** Delete if not needed (init + numeric migrations cover notifications)
- **B)** Convert to PostgreSQL if features are required
- **C)** Leave as legacy; do not run on Postgres

### 3.5 Postgres init skip (existing volume)

**Symptom:** `"PostgreSQL Database directory appears to contain a database; Skipping initialization"`  
**Cause:** Postgres data volume already exists.  
**Options:**

- **Fresh DB:** Delete postgres volume, redeploy.
- **Manual setup:** Run `docker exec <API_CONTAINER> bash /app/scripts/coolify-full-db-setup.sh`
- **Admin UI:** Admin → Settings → Database migrations → Run pending / Mark all as applied

### 3.6 .env.example port mismatch

**Was:** `POSTGRES_PORT=5433` but docker-compose default `5435`  
**Fixed:** Align `.env.example` with compose default.

---

## 4. Deployment Checklist

- [ ] Set `JWT_SECRET` (32+ chars) in production
- [ ] Set `APP_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_URL`
- [ ] Change admin password from `password` after first login
- [ ] Configure `API_SPORTS_KEY` in Admin → API Settings or env
- [ ] Configure Paystack keys (Admin or env)
- [ ] Configure SendGrid for email (OTP, notifications)
- [ ] For fresh DB: ensure postgres volume is empty so init runs
- [ ] For existing DB: use Admin → Mark all as applied if migrated manually

---

## 5. Quick Commands

```bash
# Local dev – start all
docker compose up -d

# Run full DB setup inside API container (Coolify)
docker exec -it <API_CONTAINER> bash /app/scripts/coolify-full-db-setup.sh

# Diagnose DB
./scripts/coolify-db-diagnose.sh
```

---

## 6. File Changes Made (This Review)

| File | Change |
|------|--------|
| `backend/src/modules/fixtures/football-sync.service.ts` | Removed `page` param from API-Football fixtures |
| `backend/Dockerfile.prod` | chown database, copy coolify-full-db-setup.sh |
| `backend/src/modules/admin/migration-runner.service.ts` | Log migrations path for diagnostics |
| `.dockerignore` | Include scripts/coolify-full-db-setup.sh |
| `docker-compose.yml` | Mount database/seeds for dev |
| `.env.example` | POSTGRES_PORT=5435 to match compose |
