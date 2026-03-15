# Required Environment Variables (Production)

Use this as the single checklist for production. The API **exits at startup** if required vars are missing in production.

---

## Required on API server (backend)

| Variable | Required in prod | Description |
|----------|------------------|-------------|
| **JWT_SECRET** | ✅ Yes | Signing key for access/refresh tokens. Generate with `openssl rand -base64 48`. |
| **APP_URL** | ✅ Yes | **Frontend** origin for CORS (e.g. `https://betrollover.com`). The API must allow this origin so the web app can call the API. |
| **POSTGRES_HOST** | ✅ Yes (practical) | Database host. If missing, TypeORM will fail to connect. |
| **POSTGRES_PORT** | Recommended | Default 5432. |
| **POSTGRES_USER** | ✅ Yes (practical) | DB user. |
| **POSTGRES_PASSWORD** | ✅ Yes (practical) | DB password. Use a strong random value. |
| **POSTGRES_DB** | ✅ Yes (practical) | Database name. |

---

## Required on Web server (frontend)

| Variable | Required in prod | Description |
|----------|------------------|-------------|
| **NEXT_PUBLIC_APP_URL** | ✅ Yes | Canonical site URL (e.g. `https://betrollover.com`) for SEO, OG, sitemap. |
| **NEXT_PUBLIC_API_URL** | ✅ Yes | API base URL (e.g. `https://api.betrollover.com`) so the browser can call the API. |

---

## Optional but recommended (API)

| Variable | Description |
|----------|-------------|
| **CORS_ORIGINS** | Comma-separated extra origins (in addition to APP_URL). |
| **PAYSTACK_SECRET_KEY** | Live key for Paystack. If not set, payments may be configured in Admin → Settings. |
| **SENDGRID_API_KEY** or SMTP_* | Email (OTP, verification, password reset). Can use DB SMTP settings. |
| **API_SPORTS_KEY** | Fixtures/leagues. Can be set in Admin → Settings. |
| **ODDS_API_KEY** / **TENNIS_ODDS_API_KEY** | Odds/settlement. |
| **GOOGLE_CLIENT_ID** / **APPLE_CLIENT_ID** | OAuth. Frontend needs **NEXT_PUBLIC_GOOGLE_CLIENT_ID** / **NEXT_PUBLIC_APPLE_CLIENT_ID**. |

---

## Optional (Web)

| Variable | Description |
|----------|-------------|
| **NEXT_PUBLIC_GOOGLE_CLIENT_ID** | Show “Sign in with Google” when set. |
| **NEXT_PUBLIC_APPLE_CLIENT_ID** | Show “Sign in with Apple” when set. |

---

## Quick check

- **API:** In production, the API will **exit with an error** if `JWT_SECRET` or `APP_URL` is missing. Check logs after deploy.
- **Payments:** See [PAYMENTS_RUNBOOK.md](./PAYMENTS_RUNBOOK.md) for webhook URL, verify URL, and manual reconciliation.
