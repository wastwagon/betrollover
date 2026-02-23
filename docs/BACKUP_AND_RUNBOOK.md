# Backup & Runbook

**Purpose:** Database backup and basic operational steps for BetRollover. See also `CONTRIBUTING.md` (releases) and `docs/TEMPLATE_IMPLEMENTATION_PHASES.md` (version alignment).

---

## Database backup

- **What:** PostgreSQL database (default DB name: `betrollover`).
- **Where:** Use your host’s backup (e.g. Coolify, VPS cron, managed Postgres backups).
- **How (manual):**
  - With Docker:  
    `docker compose exec postgres pg_dump -U betrollover betrollover > backup_$(date +%Y%m%d_%H%M).sql`
  - Direct:  
    `PGPASSWORD=... pg_dump -h localhost -p 5435 -U betrollover betrollover > backup_YYYYMMDD.sql`
- **Restore (manual):**  
  `psql -h ... -U betrollover -d betrollover -f backup_YYYYMMDD.sql`  
  (or `docker compose exec -T postgres psql -U betrollover betrollover < backup_YYYYMMDD.sql`)
- **Recommendation:** Daily backups, retain 7–30 days; test restore periodically.

---

## Migrations

- Migrations run on API startup (see `MigrationRunnerService`).
- SQL files live in `database/migrations/` (numeric prefix, e.g. `042_...sql`).
- **Admin UI:** Admin → Settings → Database migrations shows applied/pending and lets you **Run pending** or **Mark all as applied**. See ** [docs/ADMIN_MIGRATIONS.md](ADMIN_MIGRATIONS.md)** for how it works and how to add new migrations.
- **Do not edit** migrations that have already been applied in production.
- To add a new migration: add a file named `NNN_description.sql` (3-digit prefix); next API deploy or “Run pending” will apply it.

---

## Release steps (summary)

1. From `develop`: create `release/X.Y.Z`, bump versions in `backend/package.json`, `web/package.json`, `mobile/app.json`.
2. Update `CHANGELOG.md`: move [Unreleased] items into `[X.Y.Z] - YYYY-MM-DD`.
3. Run tests and deploy to staging; QA sign-off.
4. Merge `release/X.Y.Z` → `main`, tag `vX.Y.Z`, deploy production.
5. Merge `main` back into `develop`.
6. Submit app store updates if mobile changed.

---

## Health & webhooks

- **Health (unversioned):** `GET /health` — liveness; always 200 if process is running.
- **Readiness (unversioned):** `GET /health/ready` — checks DB connectivity; returns 503 if DB unreachable. Use for load balancer / k8s readiness probes.
- **Paystack webhook (unversioned):** `POST /wallet/paystack-webhook` — ensure this URL is whitelisted in Paystack and not behind `/api/v1`.

---

## Env and secrets

- Copy `.env.example` to `.env` and set values (never commit `.env`).
- Production: use strong `JWT_SECRET`, set `NODE_ENV=production`, configure `APP_URL` and CORS.
