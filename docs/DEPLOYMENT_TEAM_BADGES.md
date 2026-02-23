# Team Badges & Country Flags – Deployment Guide

## Pre-deploy verification

Before commit, push, and deploy:

```bash
bash scripts/pre-deploy-verify.sh
```

This script:
1. Builds backend and web
2. Runs linters
3. Checks migration 049 is present
4. Optionally runs migration 049 against local DB (if Postgres is reachable)

## Production deployment flow

### Automatic (on API start)

1. **MigrationRunnerService** – Runs pending raw SQL migrations from `database/migrations/NNN_*.sql` on API startup.
2. **ensureTeamLogoAndCountryColumns** – Fallback that adds logo/country columns if 049 was marked applied without running.
3. **SeedRunnerService** – Runs seeds from `database/seeds/` on startup.

### Admin UI

- **Admin → Settings → Database migrations**
  - View applied and pending migrations
  - **Run pending** – Execute all pending migrations
  - **Mark all as applied** – For existing production DBs migrated elsewhere

### Manual production migrations

If you need to run migrations against production DB manually (e.g. via SSH tunnel):

```bash
# 1. Ensure tunnel is active and env is set (e.g. from backend/.env.tunnel)
export $(grep -v '^#' backend/.env.tunnel | xargs)

# 2. Run raw SQL migrations (same logic as MigrationRunnerService)
bash scripts/run-production-migrations.sh
```

## Migration 049

**File:** `database/migrations/049_add_team_logos_and_country_codes.sql`

**Adds:**
- `fixtures`: `home_team_logo`, `away_team_logo`, `home_country_code`, `away_country_code`
- `sport_events` (if table exists): same columns

**Post-deploy:** Run fixture sync to populate logos and country codes from the API.
