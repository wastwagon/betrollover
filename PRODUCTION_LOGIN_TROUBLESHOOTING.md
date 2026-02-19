# Production Login Troubleshooting (Coolify)

If login works locally but fails in production with **"Internal server error"** or **"Backend unavailable"**, follow this guide.

---

## "Backend unavailable" – Quick checklist

This error means the **web container cannot reach the API**. Try in order:

1. **API not running?** In Coolify, check API container logs. If you see `DataTypeNotSupportedError: Data type "Object" in "PushDevice.deviceName"` → **Redeploy** (this is fixed in latest code).
2. **Wrong BACKEND_URL?** In Coolify → Web service env vars, set `BACKEND_URL=https://api.betrollover.com` (use your real API domain). Redeploy web.
3. **API on different network?** If web and API are in different Coolify apps, `http://api:3001` won't resolve. Use the public URL: `BACKEND_URL=https://api.betrollover.com`.
4. **CORS (browser errors)?** Set `APP_URL=https://betrollover.com` on the **API** service. Redeploy API.

---

## Recommended fix (do this first)

1. **Redeploy** with the latest code (includes `BACKEND_URL` in compose and login error logging).
2. **In Coolify → Environment Variables**, confirm these are set (no typos, no trailing slash):
   - `JWT_SECRET` (required)
   - `APP_URL` = `https://betrollover.com`
   - `NEXT_PUBLIC_APP_URL` = `https://betrollover.com`
   - `NEXT_PUBLIC_API_URL` = `https://api.betrollover.com`
   - `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
3. **Try login** on https://betrollover.com/login.
4. **If it still fails:** Coolify → your resource → **API** container → **Logs**. Attempt login again and look for a line like `[AuthController] [Login] 500 for user ...` — the message after it is the real cause (e.g. missing column, DB connection, JWT).
5. **If the web can’t reach the API:** In Coolify add **one** env var for the **web** service: `BACKEND_URL` = `https://api.betrollover.com`, then redeploy. That uses the public API URL instead of the internal hostname.

## Quick Diagnostics

### 1. Verify API is reachable

From your VPS (or your machine):

```bash
# Health check
curl -s https://api.betrollover.com/health

# Login endpoint (should return 401 with invalid credentials, not 500)
curl -X POST https://api.betrollover.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrong"}' -v
```

- **401 Unauthorized** = API is working; invalid credentials.
- **500 Internal Server Error** = API is reachable but something fails during login (DB, JWT, etc.).
- **Connection refused / timeout** = API not reachable (networking, wrong URL).

### 2. Check Coolify API container logs

In Coolify: **Resource → API container → Logs**

Look for errors when you attempt login. Common patterns:

| Log message | Cause |
|-------------|--------|
| `JWT_SECRET environment variable is required` | Missing `JWT_SECRET` in Coolify env vars |
| `relation "users" does not exist` | Migrations not applied |
| `column "email_verified_at" does not exist` | Schema mismatch – run migrations |
| `connect ECONNREFUSED` (Postgres) | DB connection wrong (`POSTGRES_HOST`, `DATABASE_URL`) |
| `ENOTFOUND api` (in web logs) | Web container can't resolve `api` – use public URL for `BACKEND_URL` |

### 3. Check Coolify Web container logs

In Coolify: **Resource → Web container → Logs**

On login attempt, look for:

- `[LoginProxy] Backend failure (500):` – backend returned 500; focus on API logs.
- `[Login Error] ... fetch failed` – web container cannot reach backend; fix `BACKEND_URL`.

---

## Common Fixes

### Fix 1: `BACKEND_URL` – web can't reach API

If web and API are in **different Coolify applications** or networks, `http://api:3001` will not resolve.

**Solution:** Set `BACKEND_URL` in Coolify env vars for the **web** service:

```
BACKEND_URL=https://api.betrollover.com
```

Then redeploy the web service.

### Fix 2: Missing `JWT_SECRET`

The API exits at startup if `JWT_SECRET` is missing in production. If the API is running, this is likely set. If login returns 500 and logs show JWT errors, add:

```
JWT_SECRET=<your-long-random-secret>
```

Use a strong random value (e.g. `openssl rand -base64 32`).

### Fix 3: Database schema / migrations

If logs show `column "email_verified_at" does not exist` or similar:

1. Ensure migrations run on deploy (they should in `backend/src/main.ts`).
2. In Coolify, confirm `MIGRATIONS_PATH` and `DATABASE_URL` are correct.
3. Manually run migrations if needed:

   ```bash
   # From inside API container
   npx typeorm migration:run -d /path/to/data-source
   ```

### Fix 4: CORS / `APP_URL`

If the browser shows CORS errors (e.g. in DevTools → Network), ensure API env has:

```
APP_URL=https://betrollover.com
```

Optional:

```
CORS_ORIGINS=https://betrollover.com,https://www.betrollover.com
```

### Fix 5: Required Coolify env vars

| Variable | Service | Example |
|----------|---------|---------|
| `JWT_SECRET` | API | `your-secret` |
| `APP_URL` | API | `https://betrollover.com` |
| `DATABASE_URL` | API | `postgresql://user:pass@postgres:5432/dbname` |
| `BACKEND_URL` | Web | `http://api:3001` or `https://api.betrollover.com` |
| `NEXT_PUBLIC_API_URL` | Web (build-time) | `https://api.betrollover.com` |
| `NEXT_PUBLIC_APP_URL` | Web (build-time) | `https://betrollover.com` |

---

## Login flow (for reference)

1. Browser → `POST https://betrollover.com/api/auth/login`
2. Next.js API route → `POST ${BACKEND_URL}/api/v1/auth/login` (server-side)
3. NestJS API → validates user, returns JWT
4. Next.js redirects to `/dashboard?token=...`

If `BACKEND_URL` is wrong or unreachable, step 2 fails and you see "Backend unavailable".  
If the API returns 500, step 3 fails and you see "Login failed (server error)".

---

## Quick test from inside web container

```bash
# Exec into web container from Coolify or docker exec
curl -X POST http://api:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpass"}'
```

- If this works: `BACKEND_URL=http://api:3001` is fine; the 500 is from the API logic (DB, JWT, etc.).
- If `curl` fails with "Could not resolve host": use `BACKEND_URL=https://api.betrollover.com` instead.
