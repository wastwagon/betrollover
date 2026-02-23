# BetRollover — Production Deployment Guide

**Stack:** NestJS API · Next.js Web · PostgreSQL 16 · Redis · Docker Compose · Coolify  
**Last updated:** February 2026 (post multi-sport expansion)

---

## Quick Reference

| Service | Internal Port | Default Domain |
|---------|---------------|----------------|
| API (NestJS) | 6001 | `api.betrollover.com` |
| Web (Next.js) | 6002 | `betrollover.com` |
| PostgreSQL | 5435 | internal only |
| Redis | 6379 | internal only |

---

## Pre-Deploy Checklist

Run the automated verifier from the project root before every deploy:

```bash
bash scripts/pre-deploy-verify.sh
```

All checks must pass (0 errors) before pushing to production.

---

## Step 1 — Environment Variables

Set these in Coolify → Service → Environment for the **API** container:

### Required (app will not start without these)

| Variable | Description | Example |
|----------|-------------|---------|
| `JWT_SECRET` | ≥32-char random string | `openssl rand -base64 48` |
| `POSTGRES_USER` | DB username | `betrollover` |
| `POSTGRES_PASSWORD` | DB password | strong random string |
| `POSTGRES_DB` | DB name | `betrollover` |
| `APP_URL` | Frontend URL (no trailing slash) | `https://betrollover.com` |
| `NEXT_PUBLIC_API_URL` | API URL (no trailing slash) | `https://api.betrollover.com` |
| `NEXT_PUBLIC_APP_URL` | Frontend URL | `https://betrollover.com` |

### Sports Data APIs

| Variable | Used For |
|----------|----------|
| `API_SPORTS_KEY` | Football fixtures, odds, results + Volleyball |
| `ODDS_API_KEY` | Basketball, Rugby, MMA, Hockey, Amer. Football, Tennis — odds AND settlement |

Both keys are required for full multi-sport functionality. The platform degrades gracefully (shows empty state) if keys are missing, but settlement will not run for affected sports.

### Payments

| Variable | Required For |
|----------|-------------|
| `PAYSTACK_SECRET_KEY` | Accepting deposits (Ghana, Nigeria) |
| `PAYSTACK_PUBLIC_KEY` | Frontend deposit widget |

### Email / Notifications

| Variable | Required For |
|----------|-------------|
| `SENDGRID_API_KEY` | OTP registration emails, withdrawal notifications |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | Fallback SMTP if SendGrid not set |
| `VAPID_PUBLIC_KEY` | Web push notifications |
| `VAPID_PRIVATE_KEY` | Web push notifications |

Generate VAPID keys:
```bash
npx web-push generate-vapid-keys
```

### Sports Configuration

```env
# Enable all 8 sports (or subset):
ENABLED_SPORTS=football,basketball,rugby,mma,volleyball,hockey,american_football,tennis

# Cron jobs — set to 'true' to run scheduled syncs (fixtures, predictions, settlement)
ENABLE_SCHEDULING=true
# Football API sync — set to 'false' if football runs elsewhere (avoid API credits)
ENABLE_FOOTBALL_SYNC=true
```

### CORS

```env
# Comma-separated additional allowed origins (add your domains here):
CORS_ORIGINS=https://betrollover.com,https://www.betrollover.com
```

---

## Step 2 — First Deploy (Fresh Database)

On a brand-new server with no existing database:

1. Coolify pulls your repo from the `main` branch
2. Docker Compose builds the `api`, `web`, `postgres`, and `redis` containers
3. **PostgreSQL runs all files in `database/init/` automatically** in alphabetical order — this creates the full schema
4. The API starts, and `MigrationRunnerService` checks `applied_migrations` table — on a fresh DB this is empty, so it applies all 50+ migrations in `database/migrations/`
5. Admin user is seeded from `database/init/02-seed-users.sql`

**After first deploy — critical security step:**
```
1. Log in to /admin with the seeded credentials
2. Immediately change the admin password (Admin → Users → Edit)
3. Remove or disable the demo tipster account if present
```

---

## Step 3 — Subsequent Deploys (Existing Database)

For all future deploys (code updates):

1. Push to `main` → Coolify rebuilds containers
2. On API restart, `MigrationRunnerService` reads `applied_migrations` and only runs **new** migrations
3. New migrations since multi-sport expansion:
   - `048_multi_sport_foundation.sql` — sport_events table, picks sport column
   - `049_add_team_logos_and_country_codes.sql` — team_logos, country_codes columns
   - `050_add_sport_to_news.sql` — sport column on news_articles
   - `051_add_platform_commission.sql` — `platform_commission_rate` on api_settings (default 10%), commission index on wallet_transactions
   - `052_add_coupon_reviews.sql` — `coupon_reviews` table (buyer ratings 1-5 per coupon, one per buyer)
   - `053_add_support_tickets.sql` — `support_tickets` table (user-to-admin help/dispute tickets)
   - `054_add_referrals.sql` — `referral_codes`, `referral_conversions` tables, `referred_by_code` on users (invite & earn system)
   - `055_add_chat_system.sql` — `chat_rooms` (10 pre-seeded sport rooms), `chat_messages`, `chat_reactions`, `chat_reports`, `chat_bans` tables; `chat_warnings` column on users (community chat system)
4. No manual intervention needed — the runner handles it automatically

To manually run migrations (e.g. if runner failed):
```bash
bash scripts/run-production-migrations.sh
```

**How the auto-migration system works (summary):**
| Step | What happens |
|------|--------------|
| API starts | `MigrationRunnerService.runPending()` is called in `main.ts` before the app accepts traffic |
| Check `applied_migrations` | Reads table of already-applied filenames |
| Scan `database/migrations/` | Lists all `NNN_*.sql` files (numeric prefix) in sorted order |
| Diff | Runs only files **not** in `applied_migrations` |
| Execute | Uses `psql -f` (prefers) or TypeORM fallback |
| Register | Inserts filename into `applied_migrations` on success |
| Stop on error | First error halts the chain — DB stays consistent |

**Admin UI override** (when new deploy encounters an already-migrated DB):
- Admin → Settings → Database Migrations → **"Mark all as applied"** — registers all files without re-running SQL
- Then restart the API

---

## Step 4 — New Backend Modules (Multi-Sport)

These modules were added in the multi-sport expansion. Ensure your Docker image includes them:

| Module | Purpose |
|--------|---------|
| `basketball/` | The Odds API — fixtures, odds, settlement |
| `rugby/` | The Odds API — fixtures, odds, settlement |
| `mma/` | The Odds API — fixtures, odds, settlement |
| `hockey/` | The Odds API — fixtures, odds, settlement |
| `american-football/` | The Odds API — fixtures, odds, settlement |
| `tennis/` | The Odds API — fixtures, odds, settlement |
| `volleyball/` | API-Sports — fixtures, odds, settlement |
| `sport-events/` | Unified sport events table (all non-football sports) |
| `odds-api/` | Shared The Odds API service layer |

All modules are registered in `app.module.ts`. No additional config needed.

---

## Step 5 — Post-Deploy Verification

After deploy, run these checks in sequence:

### 5.1 Health check
```
GET https://api.betrollover.com/health
→ { status: "ok" }
```

### 5.2 Admin panel
```
https://betrollover.com/admin/analytics  → analytics load
https://betrollover.com/admin/fixtures   → football fixtures visible
https://betrollover.com/admin/sports     → multi-sport health panel shows
```

### 5.3 Sports sync (first deploy)
```
Admin → Sports → ⚡ Sync All Sports
```
This fetches fixtures and odds for all 7 non-football sports. Football syncs automatically via its own cron.

### 5.4 Football fixtures
```
Admin → Fixtures → sync leagues
```

### 5.5 Database migrations
```
Admin → Database → Migrations
→ All 50 migrations should show as "applied"
```

### 5.6 Key user flows
- [ ] Register a new account (receives OTP email)
- [ ] Browse `/marketplace` — picks visible, sport filter works
- [ ] Purchase a free coupon — wallet deducted/unchanged, purchase appears in `/my-purchases`
- [ ] Tipster creates a pick via `/create-pick`

---

## Step 6 — Cron Jobs (Automatic)

Once running, these cron jobs handle data freshness automatically:

| Job | Schedule | What it does |
|-----|----------|--------------|
| Football fixture sync | 12 AM daily | 7 days ahead. Skipped if `ENABLE_FOOTBALL_SYNC=false` |
| Odds force refresh | 1 AM | Re-sync 50 soonest fixtures |
| AI prediction generation | 1 AM | Ready before 4–5 AM fixtures |
| Non-football sports | 12:15–12:50 AM | Basketball, Rugby, MMA, Volleyball, Hockey, Amer. Football, Tennis |
| Transfers / Injuries | 12:55 AM / 1:05 AM | API-Sports news |
| Football live/finished | Every 5 min | Scores + settlement |
| Odds sync | Every 2h | Fixtures without odds |
| Non-football settlement | Every 4h | Settles finished sport events |

---

## Rollback

If a deploy causes issues:

1. In Coolify → Deployments → select the last working deployment → **Redeploy**
2. If DB migrations caused issues, they cannot be automatically rolled back (they use `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` patterns and are safe to re-run, but column drops are not included)
3. Never run `DROP TABLE` or destructive migrations without a DB backup

**Always take a DB dump before major migrations:**
```bash
bash scripts/export-db-for-vps.sh
```

---

## Common Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| CORS error in browser console | `APP_URL` / `CORS_ORIGINS` not set | Add env vars, redeploy API |
| "Backend unavailable" on frontend | `NEXT_PUBLIC_API_URL` wrong | Verify URL points to live API |
| OTP emails not sending | `SENDGRID_API_KEY` missing | Set key or configure SMTP fallback |
| No fixtures for non-football sports | `ODDS_API_KEY` missing | Set key, then Admin → Sports → Sync |
| Settlement stuck on pending | Results not fetched | Admin → Fixtures → Fetch Football Results |
| Push notifications not working | VAPID keys missing | Generate and set VAPID keys |

---

## Related Docs

| Doc | Purpose |
|-----|---------|
| `docs/SIMPLE_DEPLOY_GUIDE.md` | Git workflow + Coolify deploy steps |
| `docs/PRE_LAUNCH_REVIEW.md` | Security checklist (passwords, JWT, CORS) |
| `docs/ADMIN_MIGRATIONS.md` | Migration runner details |
| `docs/API_SPORTS_MULTI_SPORT_GUIDE.md` | Multi-sport API configuration |
| `scripts/pre-deploy-verify.sh` | Automated pre-deploy checks |
| `scripts/run-production-migrations.sh` | Manual migration runner |
