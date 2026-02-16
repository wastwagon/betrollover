# Docker Desktop & PostgreSQL Setup Review

This doc describes how BetRollover uses **Docker Desktop** for local development, with **PostgreSQL** as a containerized service, and how to work with the database safely.

---

## How It’s Wired

### Services (docker-compose)

| Service   | Role              | Port (host) | Notes |
|----------|-------------------|-------------|--------|
| **postgres** | PostgreSQL 16     | **5433** (configurable via `POSTGRES_PORT`) | Maps to 5432 in container. Use for GUI/psql from host. |
| **redis**   | Cache/sessions    | *not exposed* | API uses `redis:6379` |
| **api**     | NestJS backend    | **6001**     | Depends on postgres + redis (after healthy) |
| **web**     | Next.js app       | **6002**     | Depends on api |

### Database connection

- **Inside Docker:** The API container connects with hostname `postgres` and port `5432`.  
  - Compose sets `DATABASE_URL=postgresql://...@postgres:5432/betrollover`.  
  - The Nest app uses `POSTGRES_HOST` / `POSTGRES_PORT` when set; otherwise it defaults to `postgres` and `5432`, which is correct for Docker.
- **From your host (e.g. GUI, `psql`):** Postgres is exposed on the host as **5433** (or whatever `POSTGRES_PORT` is in `.env`), so you can connect from Docker Desktop, TablePlus, DBeaver, or `psql -h localhost -p 5433 -U betrollover -d betrollover`.

### Init vs migrations

- **`database/init/`** – Runs **only on first start** when the Postgres data volume is empty (e.g. first `docker compose up -d`).  
  - Runs in alphabetical order: `01-schema.sql` … `13-sync-status.sql`.  
  - Creates tables, triggers, seed users, enabled leagues, market config, etc.
- **`database/migrations/`** – Run **manually** (or via scripts) after init.  
  - Examples: `013_deposit_requests.sql`, `014_withdrawals.sql`, `018_...`, `019_...`.  
  - Use the same Postgres user/database as in `.env` (or the defaults used by compose).

So: **PostgreSQL is “set up” by Docker (image + init scripts); schema changes and backfills are done with migrations.**

### Automatic migrations (production-friendly)

- **On every API startup**, pending migrations (files `010_*.sql` … `999_*.sql` in `database/migrations/`) are run automatically. The API creates a table `applied_migrations` and only runs files that are not already recorded there.
- **No need to run migration scripts by hand on production** unless you prefer to; deploy the new code and ensure the `database/migrations` folder is available to the API (see below).
- **Admin → Settings → Database migrations**: you can **Run pending migrations** or **Mark all as applied**. Use "Mark all as applied" when this database was already migrated manually (e.g. first deploy of this feature) so the API does not re-run old migrations.
- **Path**: The API looks for migrations in `database/migrations` relative to the process working directory, or in the path set by **`MIGRATIONS_PATH`**. On production, set `MIGRATIONS_PATH` to the absolute path to the migrations folder (e.g. `/app/database/migrations`) if the default lookup fails.

---

## Running Migrations (Docker Desktop)

With Docker Desktop running and `postgres` up:

```bash
# From project root
docker compose up -d postgres
docker compose exec -T postgres psql -U betrollover -d betrollover < database/migrations/018_enabled_leagues_category_api_type_bookmaker.sql
docker compose exec -T postgres psql -U betrollover -d betrollover < database/migrations/019_backfill_league_categories.sql
```

Or use the helper script (tries Docker first, then local `psql`):

```bash
./scripts/run-league-migrations.sh
```

Other migrations (e.g. 013, 014, 015–017) can be run the same way:  
`docker compose exec -T postgres psql -U betrollover -d betrollover < database/migrations/<file>.sql`

---

## Connecting From the Host (GUI / psql)

Postgres is exposed on the host so you can use Docker Desktop’s database tools or any GUI (TablePlus, DBeaver, etc.):

- **Host:** `localhost`  
- **Port:** `5433` (or `POSTGRES_PORT` from `.env`)  
- **User:** `betrollover`  
- **Password:** value of `POSTGRES_PASSWORD` in `.env` (default `betrollover_dev`)  
- **Database:** `betrollover`

Example with `psql` from the host:

```bash
PGPASSWORD=betrollover_dev psql -h localhost -p 5433 -U betrollover -d betrollover -c "SELECT 1"
```

The API inside Docker still connects to `postgres:5432` on the internal network; the exposed port is only for host access.

---

## .env and Docker

- **Compose** reads `.env` in the project root for variable substitution (e.g. `POSTGRES_USER`, `API_SPORTS_KEY`).  
- **Containers** only see variables you pass in the `environment:` section of `docker-compose.yml`.  
- The API is given `DATABASE_URL`; it also falls back to `POSTGRES_HOST`/`POSTGRES_PORT` if you ever pass them. Defaults (`postgres`, `5432`) are correct for Docker.

So: your **PostgreSQL database is set up and run by Docker Desktop**; the API and migration scripts are designed to work with that setup.

---

## Quick Checklist

- [ ] Docker Desktop installed and running  
- [ ] `.env` present (copy from `.env.example`), at least `API_SPORTS_KEY` if using fixtures  
- [ ] `docker compose up -d` – postgres, redis, api, web up  
- [ ] Run any needed migrations (e.g. `./scripts/run-league-migrations.sh` or individual SQL files)  
- [ ] Optional: connect from host with GUI or `psql -h localhost -p 5433 -U betrollover -d betrollover`
