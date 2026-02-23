# Database Migrations

## How it works — two layers

### Layer 1: Init scripts (`database/init/`)
Run **once** automatically when a fresh PostgreSQL container starts.
Files are numbered `01-` through `14-` and create the baseline schema.
**Never edit these to alter an existing table** — use a numbered migration instead.

### Layer 2: Numbered SQL migrations (`database/migrations/NNN_*.sql`)
Incremental changes applied on top of the init schema.
Files matching `^\d{3}_.*\.sql$` are applied automatically on API startup in sorted order
and recorded in the `applied_migrations` table (idempotent — never re-run a file).

> **Rule**: to add a column, table, or index to an existing deployment, always create a
> new numbered migration file (next number in sequence). **Never edit an already-applied migration.**

---

## Current migration range: `010` → `049`

| Range | Area |
|-------|------|
| `010–014` | Tipster requests, content, SMTP, deposits, withdrawals |
| `015–021` | League data expansion, fixtures archive |
| `022–028` | Tipster/prediction tables, sync status, leagues |
| `029–032` | Marketplace, analytics, user/tipster merge, API settings |
| `033–041` | Smart coupons, email/OTP, news/resources/ads, Paystack, reactions |
| `042–044` | Subscriptions, push, IAP, pick placement, payout methods |
| `045–047` | Age verification, date of birth columns |
| `048` | Multi-sport foundation (`sport_events`, `sport_event_odds`) |
| `049` | Team logos & country code columns (fixtures + sport_events) |

---

## Adding a new migration

1. Pick the next number (e.g. `050`).
2. Create `database/migrations/050_describe_change.sql`.
3. Use `IF NOT EXISTS` / `IF EXISTS` guards so the script is safe to run on any DB state.
4. The API applies it automatically on next startup (or via Admin → Settings → Migrations → Run pending).

---

## Running migrations manually

```bash
# Via Docker psql (preferred — handles DO $$ blocks)
docker compose exec -T postgres psql -U betrollover -d betrollover \
  -f /path/to/migration.sql

# Via Admin UI
# Admin → Settings → Database migrations → Run pending migrations
```

---

## archive/
One-off historical scripts that are **not** part of the auto-run sequence.
Kept for reference only — do not run them.

| File | Notes |
|------|-------|
| `convert_users_to_tipsters.sql` | PostgreSQL. One-off conversion; already applied on all live DBs. |
| `add_national_teams.sql` | MySQL syntax — incompatible with PostgreSQL. Do not run. |
| `create_notifications_system.sql` | MySQL syntax. Notifications table lives in `init/03-core-tables.sql`. |
