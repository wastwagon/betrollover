# BetRolloverNew – Restoration Plan

**Context:** Docker Desktop crashed and "restore defaults" was applied. BetRolloverNew containers, volumes, and images were lost. This plan restores the project from scratch.

---

## ✅ RESTORATION COMPLETE (2026-02-16)

**Current setup (hybrid – Docker + local):**
- **Postgres:** Docker `betrollover-postgres` on port **5435**
- **Redis:** Docker `betrollover-redis` on port **6380** (host)
- **API:** Running locally on port **3001** (`npm run start:dev` in backend/)
- **Web:** Running locally on port **3000** (`npm run dev` in web/)

**Login:** admin@betrollover.com / password

**Note:** Docker Hub connectivity issues prevented building the API image. API and web run locally; Postgres and Redis run in Docker.

### How to start (for next run)

1. **Start Postgres & Redis:**
   ```bash
   cd /Users/OceanCyber/Downloads/BetRolloverNew
   docker compose up -d postgres redis
   ```

2. **Start API:**
   ```bash
   cd backend && POSTGRES_HOST=localhost POSTGRES_PORT=5435 REDIS_URL=redis://localhost:6380 DATABASE_URL="postgresql://betrollover:betrollover_dev@localhost:5435/betrollover" MIGRATIONS_PATH="../database/migrations" npm run start:dev
   ```

3. **Start Web (new terminal):**
   ```bash
   cd web && NEXT_PUBLIC_API_URL=http://localhost:3001 npm run dev
   ```

4. **Open:** http://localhost:3000

---

## 1. Project Root Structure (Verified)

```
BetRolloverNew/
├── backend/           # NestJS API
├── web/               # Next.js frontend
├── database/
│   ├── init/          # Runs on first Postgres boot (empty DB)
│   │   ├── 01-schema.sql
│   │   ├── 02-seed-users.sql
│   │   ├── 03-core-tables.sql
│   │   ├── 04-seed-wallets.sql
│   │   ├── 05-fixtures-odds.sql
│   │   ├── 06-tipster-requests.sql
│   │   ├── 07-content-pages.sql
│   │   ├── 08-smtp-settings.sql
│   │   ├── 09-deposit-withdrawals.sql
│   │   ├── 10-api-settings.sql
│   │   ├── 11-performance-indexes.sql
│   │   ├── 12-enabled-leagues-market-config.sql
│   │   └── 13-sync-status.sql
│   ├── migrations/    # Run by API on startup (010_*, 011_*, ... 030_*)
│   └── seeds/         # Optional manual seed (comprehensive-seed-data.sql)
├── scripts/           # Helper scripts
├── docker-compose.yml
├── .env               # Copy from .env.example if missing
└── .env.example
```

---

## 2. Port Allocation (No Conflict with api-football)

| Service   | BetRolloverNew | api-football (running) |
|-----------|----------------|------------------------|
| Postgres  | 5435 (host)    | 5432                   |
| Redis     | internal only  | 6379                   |
| API       | 6001           | 7002                   |
| Web       | 6002           | -                      |

No port conflicts.

---

## 3. Restoration Steps (Order of Execution)

### Phase 1: Prerequisites

1. **Verify `.env` exists**
   - Copy from `.env.example` if missing
   - Ensure `POSTGRES_PORT=5435` (or leave default in docker-compose)
   - Set `API_SPORTS_KEY` if you have one (fixtures/leagues)
   - Set `JWT_SECRET` for production

2. **Ensure Docker Desktop is running**
   - Engine should be up (already verified)

### Phase 2: Start Stack

3. **Build and start containers**
   ```bash
   cd /Users/OceanCyber/Downloads/BetRolloverNew
   docker compose up -d --build
   ```

   This will:
   - Create new `postgres_data` and `redis_data` volumes
   - Run Postgres with `database/init/` scripts (first boot only)
   - Build and start api + web
   - API runs migrations on startup (from `database/migrations/`)

4. **Verify containers**
   ```bash
   docker ps
   ```
   Expect: `betrollover-postgres`, `betrollover-redis`, `betrollover-api`, `betrollover-web`

### Phase 3: Database Verification

5. **Check Postgres**
   ```bash
   docker exec betrollover-postgres psql -U betrollover -d betrollover -c "\dt"
   ```

6. **Check migrations**
   - Log in as admin at http://localhost:6002
   - Go to Admin → Settings → Database migrations
   - Confirm all migrations applied (or use "Run pending")

### Phase 4: Optional Seeding

7. **Seed users / basic data**
   - Init scripts (02-seed-users.sql, etc.) run automatically on first boot
   - If you need more data: `database/seeds/comprehensive-seed-data.sql` (run manually)

8. **API-Sports setup**
   - Add API key in Admin → Settings if you want fixtures/leagues
   - Run fixture sync if needed

---

## 4. What Gets Restored vs. Lost

| Item                    | Restored? | How |
|-------------------------|-----------|-----|
| Schema                  | ✅        | init/ + migrations |
| Seed users (admin, etc.)| ✅        | 02-seed-users.sql |
| Core tables             | ✅        | 03-core-tables.sql, init scripts |
| Leagues / config        | ✅        | 12-enabled-leagues-market-config.sql |
| Migrations (030, etc.)  | ✅        | API runs on startup |
| **User-created data**   | ❌        | Lost (picks, purchases, etc.) |
| **Custom seed data**    | ❌        | Re-run seeds if you have them |

---

## 5. Rollback / Clean Restart

If something goes wrong and you want a clean slate:

```bash
cd /Users/OceanCyber/Downloads/BetRolloverNew
docker compose down -v   # Stops containers and removes volumes
docker compose up -d --build   # Fresh start
```

---

## 6. Checklist Before Running

- [ ] `.env` exists (or copied from `.env.example`)
- [ ] Docker Desktop running
- [ ] No other project using 5435, 6001, 6002
- [ ] Ready to accept empty DB (no prior user data)

---

## 7. Post-Restoration

- **Admin login:** Use credentials from `02-seed-users.sql` (e.g. admin@betrollover.com)
- **API-Sports:** Add key in Admin → Settings for fixtures
- **Seeding:** Run `comprehensive-seed-data.sql` if you want demo picks/purchases (see DATABASE_SEEDING_STRATEGY.md)
