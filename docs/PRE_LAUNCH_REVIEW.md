# BetRollover – Pre-Launch Review

**Purpose:** Identify gaps, conflicts, best-practice issues, and enhancements before going live.

---

## 1. Critical (Fix Before Launch)

### 1.1 Default Admin Password

**Location:** `database/init/02-seed-users.sql`

**Issue:** Admin seeded with `password` (same for tipster demo).

**Action:**
- Change admin password immediately after first deploy
- Add migration or admin flow to force password change on first login
- Consider removing tipster demo user in production

---

### 1.2 JWT Secret in Production

**Location:** `backend/src/main.ts`, `backend/src/modules/auth/strategies/jwt.strategy.ts`

**Status:** ✅ Production check exists – app exits if `JWT_SECRET` missing when `NODE_ENV=production`

**Action:** Ensure `JWT_SECRET` is set in production (32+ chars, cryptographically random).

---

### 1.3 CORS in Production

**Location:** `backend/src/main.ts`

**Status:** Production uses `APP_URL` and `CORS_ORIGINS` only; no localhost in prod.

**Action:** Set `APP_URL` and `CORS_ORIGINS` (comma-separated) in production env.

---

### 1.4 Environment Files

**Issue:** `.env` in `.gitignore` ✅ but `.env.backup` may contain secrets.

**Action:** Add `.env.backup` to `.gitignore`; never commit env files with secrets.

---

### 1.5 Docker Compose for Production

**Issue:** `docker-compose.yml` uses `NODE_ENV: development` for api and web.

**Action:** For production, use separate `docker-compose.prod.yml` or override with `NODE_ENV=production`.

---

## 2. Security

### 2.1 Paystack Webhook

**Status:** ✅ Signature verification uses `PAYSTACK_SECRET_KEY` (Paystack standard)

**Action:** Configure webhook URL in Paystack Dashboard: `https://api.yourdomain.com/wallet/paystack-webhook`

---

### 2.2 Rate Limiting

**Location:** `ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }])`

**Status:** 100 req/min per IP globally.

**Action:** Consider stricter limits for auth endpoints (e.g. 5/min for login) to reduce brute-force risk.

---

### 2.3 API Keys in Database

**Status:** API-Sports key stored in `api_settings` table; env fallback.

**Action:** Prefer env vars in production; DB allows admin to update without redeploy.

---

## 3. Database & Migrations

### 3.1 Migration Order

**Status:** Migration runner uses `^\d{3}_.*\.sql$` – runs 010–027 in order.

**Non-numeric files** (`convert_users_to_tipsters.sql`, `add_national_teams.sql`, `create_notifications_system.sql`) are **not** auto-run – intentional.

---

### 3.2 Migration Conflicts

**Potential:** `run-league-migrations.sh` and API auto-migrations both apply 015–021.

**Status:** `applied_migrations` table prevents duplicates; safe to run both.

---

### 3.3 Init vs Migrations

**Init scripts** run on first Postgres start (empty data dir). **Migrations** run on API startup.

**Action:** For existing DBs, use Admin → Mark all as applied if migrations were run manually.

---

## 4. Missing / Gaps

### 4.1 Production Dockerfile

**Issue:** Backend Dockerfile uses `npm run start:dev` (watch mode).

**Action:** Add production build stage:
```dockerfile
# Production
CMD ["node", "dist/main.js"]
```
And build step: `npm run build`

---

### 4.2 Web Production Build

**Issue:** Web Dockerfile uses `npm run dev`.

**Action:** Production: `npm run build && npm run start`.

---

### 4.3 Health Check for Load Balancer

**Status:** `GET /health` exists.

**Action:** Ensure load balancer/proxy uses it for readiness.

---

### 4.4 Logging

**Issue:** `console.log` in several places; no structured logging.

**Action:** Use Pino/Winston; log levels; avoid logging secrets.

---

### 4.5 Error Monitoring

**Issue:** No Sentry or similar.

**Action:** Add error tracking for production (Sentry, LogRocket, etc.).

---

### 4.6 Tests

**Issue:** No unit/integration tests in app code.

**Action:** Add tests for: auth, wallet credit, settlement, prediction engine.

---

## 5. Possible Conflicts

### 5.1 Duplicate League Inserts

**Status:** All league migrations use `ON CONFLICT (api_id) DO NOTHING` or `DO UPDATE` – safe.

---

### 5.2 Fixture Sync vs Odds Sync

**Status:** Fixture sync triggers odds sync for next 24h; separate manual odds sync exists. No conflict.

---

### 5.3 Prediction Generation vs Cron

**Status:** Cron runs daily; manual trigger available. Both use same logic – no conflict.

---

## 6. Code Structure

### 6.1 Strengths

- Clear module separation (auth, wallet, fixtures, predictions, admin)
- TypeORM entities with snake_case
- Guards for JWT and admin
- Config via ConfigModule

### 6.2 Improvements

| Area | Recommendation |
|------|----------------|
| API URL duplication | Centralize `NEXT_PUBLIC_API_URL` in one config or hook |
| DTOs | Add validation decorators (`@IsEmail`, `@Min`, `@Max`) |
| Error handling | Global exception filter for consistent error format |
| Types | Reduce `any`; add response interfaces |

---

## 7. Environment Checklist (Production)

| Variable | Required | Notes |
|----------|----------|-------|
| `NODE_ENV` | Yes | `production` |
| `JWT_SECRET` | Yes | 32+ chars, random |
| `POSTGRES_*` | Yes | Host, port, user, pass, db |
| `REDIS_URL` | Yes | If using Redis cache |
| `APP_URL` | Yes | e.g. `https://app.betrollover.com` |
| `NEXT_PUBLIC_API_URL` | Yes | e.g. `https://api.betrollover.com` |
| `CORS_ORIGINS` | Yes | Comma-separated allowed origins |
| `API_SPORTS_KEY` | Yes | For fixtures/predictions |
| `PAYSTACK_SECRET_KEY` | Yes | `sk_live_*` for production |
| `PAYSTACK_PUBLIC_KEY` | Yes | `pk_live_*` |
| `SMTP_*` / SendGrid | If email | For transactional email |

---

## 8. Pre-Launch Checklist

- [ ] Change default admin password
- [ ] Set `JWT_SECRET` (strong, random)
- [ ] Set `NODE_ENV=production`
- [ ] Configure `APP_URL`, `CORS_ORIGINS`, `NEXT_PUBLIC_API_URL`
- [ ] Add Paystack webhook URL in dashboard
- [ ] Use production Dockerfiles (build + start, not dev)
- [ ] Enable HTTPS (reverse proxy)
- [ ] Add `.env.backup` to `.gitignore` if not already
- [ ] Run full migration set on production DB
- [ ] Sync fixtures after deploy
- [ ] Test login, deposit flow, prediction generation
- [ ] Configure error monitoring (Sentry, etc.)
- [ ] Set up log aggregation if needed

---

## 9. Quick Wins (Optional Before Launch)

1. **Debounce team search** – `create-pick` page (see CODE_REVIEW_IMPROVEMENTS.md)
2. **Stricter auth rate limit** – e.g. `@Throttle(5, 60)` on login
3. **User-friendly error messages** – Map 500/401 to readable text
4. **Loading states** – Skeleton loaders on key pages

---

## 10. Post-Launch

- Add unit tests for critical paths
- Add E2E tests for signup, deposit, create pick
- Consider API versioning (`/v1/...`)
- Monitor API-Football quota
- Set up backup/restore for PostgreSQL

---

*Last updated: 2025-02-15*
