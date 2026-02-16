# Start All Services (Fix Login / ERR_CONNECTION_REFUSED)

> **Important:** Use **http://localhost:6002** (not 3000). The web app runs on port 6002 when using Docker or `PORT=6002 npm run dev`.

Login fails with `ERR_CONNECTION_REFUSED` to `:6001` because the **API backend** is not listening. The backend only starts fully when it can connect to **PostgreSQL**. Follow these steps in order.

---

## 1. Start Docker Desktop

- Open **Docker Desktop** and wait until it shows "Docker Desktop is running".
- Without this, Postgres cannot start.

---

## 2. Start PostgreSQL

From the project root (where `docker-compose.yml` is):

```bash
docker compose up -d postgres
```

Wait ~10 seconds for Postgres to be ready. Optional check:

```bash
docker compose ps
```

You should see `betrollover-postgres` with state "running".

---

## 3. Start the API backend (port 6001)

```bash
cd backend
PORT=6001 npm run start:dev
```

Wait until you see something like:

- `Nest application successfully started`
- `BetRollover API running on http://localhost:6001`

Leave this terminal open. The API will be available at **http://localhost:6001**.

---

## 4. Start the web app (port 6002)

In a **new** terminal:

```bash
cd web
PORT=6002 npm run dev
```

When you see "Ready" and "Local: http://localhost:6002", open **http://localhost:6002** in your browser. Login will work because the frontend will reach the API at 6001.

---

## 401 Unauthorized – “Invalid” or expired session

If you see **401 (Unauthorized)** on `/users/me`, `/admin/settings`, etc., the token in your browser is no longer valid (e.g. after restarting the backend or using a new database).

1. Go to **http://localhost:6002/login** and sign in again, or  
2. Clear storage: DevTools → Application → Local Storage → `http://localhost:6002` → Clear, then open the app and log in.

**Default credentials (from database init):**

| Role    | Email                    | Password  |
|---------|--------------------------|-----------|
| Admin   | `admin@betrollover.com`  | `password` |
| Tipster | `tipster@betrollover.com`| `password` |

If you ran the **comprehensive seed** (`database/seeds/comprehensive-seed-data.sql`), you also have tipsters with password **`password123`**, e.g. `tipster@example.com`, `flygonpriest@example.com`, `wastwagon@example.com`.

**If your database was created before the tipster was added to init**, add the tipster once (e.g. in TablePlus/DBeaver or `psql`):

```sql
INSERT INTO users (username, email, password, display_name, role, status, country, timezone, country_code, flag_emoji, is_verified, email_notifications, push_notifications)
VALUES ('tipster', 'tipster@betrollover.com', '$2b$10$usWKVA4Jrp75m9sISlaK/Om7VSzFsdHWQTmWRMAk7EYwuHguz7aLO', 'Tipster Demo', 'tipster', 'active', 'Ghana', 'Africa/Accra', 'GHA', '🇬🇭', true, true, true)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_wallets (user_id, balance, currency, status)
SELECT id, 0, 'GHS', 'active' FROM users WHERE email = 'tipster@betrollover.com'
ON CONFLICT (user_id) DO NOTHING;
```

---

## Summary

| Service   | Port | Command / How to run        |
|----------|------|-----------------------------|
| Postgres | 5435 | `docker compose up -d postgres` (5435 to avoid conflict with other projects) |
| API      | 6001 | `cd backend && PORT=6001 npm run start:dev` |
| Web      | 6002 | `cd web && PORT=6002 npm run dev` |

**If you prefer to run everything in Docker** (API + Web + Postgres + Redis):

```bash
docker compose up -d
```

Then open **http://localhost:6002** (not 3000). The API will be at http://localhost:6001 as before.

---

## Login redirects to wrong port (e.g. localhost:3000)

If you see `ERR_CONNECTION_REFUSED` on `localhost:3000`, you're on the wrong port. The app uses **6002** (not 3000). Set `APP_URL=http://localhost:6002` in `.env` so login redirects go to the correct URL. With Docker, this is set automatically.
