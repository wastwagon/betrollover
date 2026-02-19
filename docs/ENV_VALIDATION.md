# Environment Variable Validation

**Purpose:** Reference for which environment variables are required vs optional in production. See also `.env.example`, `docs/BACKUP_AND_RUNBOOK.md`, and `README.md`.

---

## Production (NODE_ENV=production)

### Required

| Variable | Purpose | Validation |
|----------|---------|------------|
| `JWT_SECRET` | JWT signing key | API exits with error if unset |
| `POSTGRES_*` or `DATABASE_URL` | Database connection | App fails to start if DB unreachable |
| `APP_URL` | Canonical site URL (CORS, emails) | CORS warns if unset |

### Recommended

| Variable | Purpose |
|----------|---------|
| `PAYSTACK_SECRET_KEY` | Live payments (Ghana) |
| `PAYSTACK_WEBHOOK_SECRET` | Paystack webhook signature verification |
| `SENDGRID_API_KEY` | Email (verification, password reset) |
| `NEXT_PUBLIC_API_URL` | API base URL for web app |
| `NEXT_PUBLIC_APP_URL` | App URL for web (SEO, redirects) |

### Optional

| Variable | Purpose |
|----------|---------|
| `API_SPORTS_KEY` | Fixtures/leagues from api-football.com |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Web push notifications |
| `REDIS_URL` | Cache/sessions |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry error monitoring |
| `LOG_LEVEL` | Backend structured logging (debug \| info \| warn \| error) |
| `CORS_ORIGINS` | Additional CORS origins (comma-separated) |

---

## Development

All variables are optional. Defaults:

- `JWT_SECRET`: Falls back to dev secret (logged as warning)
- `APP_URL`: `http://localhost:6002`
- `NEXT_PUBLIC_API_URL`: `http://localhost:6001`
- Database: Use `docker compose up` or local PostgreSQL

---

## Validation Logic (Backend)

- **main.ts:** On startup, if `NODE_ENV=production` and `JWT_SECRET` is unset, the API exits with code 1.
- **CORS:** In production, only `APP_URL` and `CORS_ORIGINS` are used. If neither is set, a warning is logged.
- **Database:** Connection is validated on first query; migrations run at startup.

---

## Quick Checklist (Production Deploy)

- [ ] `NODE_ENV=production`
- [ ] `JWT_SECRET` set (min 32 chars)
- [ ] `APP_URL` set to your domain (e.g. `https://betrollover.com`)
- [ ] `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_API_URL` set for web build
- [ ] Paystack live keys if accepting payments
- [ ] SendGrid API key if sending email
- [ ] HTTPS enabled; reverse proxy configured
