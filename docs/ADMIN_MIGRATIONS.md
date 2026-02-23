# Admin migration feature

This document describes how the **admin migration** system works and how to add or run database migrations.

---

## How it works

1. **Where migrations live**  
   SQL migration files are in **`database/migrations/`**.

2. **Which files are run**  
   Only files whose names match this pattern are run:
   - **Pattern:** `NNN_something.sql` (exactly 3 digits, then underscore, then a name, then `.sql`)
   - **Examples:** `042_subscription_push_iap_tables.sql`, `043_pick_marketplace_placement.sql`
   - **Not run:** `create_notifications_system.sql` (no 3-digit prefix), `convert_users_to_tipsters.sql` (no 3-digit prefix)

3. **Tracking**  
   The backend keeps a table **`applied_migrations`** (filename, applied_at). Only files that are **not** in this table are considered “pending” and will be run.

4. **Running migrations**
   - **On API startup:** The API runs all pending migrations automatically when it starts (see `main.ts`).
   - **From Admin UI:** In **Admin → Settings**, the “Database migrations” section shows:
     - **Applied:** List of migration files already run.
     - **Pending:** List of migration files not yet run.
     - **Run pending:** Button to run all pending migrations.
     - **Mark all as applied:** For an existing DB that was migrated elsewhere; marks every migration file in the folder as applied **without** executing them.

5. **API endpoints (admin only)**  
   - `GET /api/v1/admin/migrations/status` — returns `{ applied, pending }`
   - `POST /api/v1/admin/migrations/run` — runs all pending migrations
   - `POST /api/v1/admin/migrations/mark-all-applied` — marks all current files as applied (no execution)

---

## Current migrations (subscriptions, push, IAP, team badges)

| File | Purpose |
|------|--------|
| **042_subscription_push_iap_tables.sql** | Creates: `tipster_subscription_packages`, `subscriptions`, `subscription_coupon_access`, `push_devices`, etc. |
| **043_pick_marketplace_placement.sql** | Adds to `pick_marketplace`: `placement`, `subscription_package_id` |
| **044_manual_crypto_payout_methods.sql** | Adds to `payout_methods`: `country`, `currency`, `manual_details` |
| **048_multi_sport_foundation.sql** | Creates `sport_events`, `sport_event_odds` for basketball, rugby, MMA, etc. |
| **049_add_team_logos_and_country_codes.sql** | Adds `home_team_logo`, `away_team_logo`, `home_country_code`, `away_country_code` to `fixtures` and `sport_events` (badges/flags) |

- If the API starts and these files are still **pending**, they run automatically.
- You can also run them from **Admin → Settings → Database migrations → Run pending**.

---

## Adding a new migration (for admin to run)

1. **Create a new file** in `database/migrations/` with a **3-digit prefix** that is **after** the last one used (e.g. after `043` use `044`).
   - **Good:** `044_add_my_feature.sql`
   - **Bad:** `44_add_my_feature.sql` (must be 3 digits), `add_my_feature.sql` (no numeric prefix).

2. **Write plain SQL** (PostgreSQL). The runner splits the file by lines ending with `;` and runs each part. Use `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN` with existence checks, etc., so the migration is safe to run once.

3. **Order:** If migration B depends on a table created in migration A, ensure A’s filename sorts before B (e.g. `044_...` before `045_...`).

4. **Do not edit** a migration file after it has been applied in production (the runner only runs **pending** files; it does not re-run or version SQL).

---

## Summary

| What | Detail |
|------|--------|
| **Location** | `database/migrations/*.sql` |
| **Naming** | `NNN_description.sql` (3-digit prefix) |
| **Tracking** | `applied_migrations` table |
| **Run** | Automatically on API start, or via Admin → Settings → Run pending |
| **New additions** | Add `044_...`, `045_...`, etc.; they will be picked up as pending |

All current database addition work for subscriptions, push, and IAP is already in **042** and **043** and is ready for the admin migration feature.
