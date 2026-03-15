# Security hardening checklist

Use this checklist to harden BetRollover in production. Items are ordered by impact and ease.

---

## 1. Environment and secrets

- [ ] **API:** `JWT_SECRET` is set, strong (≥32 chars), and not default. Required in prod (startup validation).
- [ ] **API:** `APP_URL` matches the frontend origin (e.g. `https://betrollover.com`) for CORS.
- [ ] **Web:** `NEXT_PUBLIC_API_URL` points to the API; no secrets in `NEXT_PUBLIC_*` except public IDs.
- [ ] **Paystack:** Webhook secret and API keys stored in env only; webhook URL uses HTTPS.
- [ ] **Google/Apple OAuth:** Client IDs and secrets in env; redirect/callback URLs correct and HTTPS.

See [REQUIRED_ENV_PROD.md](./REQUIRED_ENV_PROD.md) and [PAYMENTS_RUNBOOK.md](./PAYMENTS_RUNBOOK.md).

---

## 2. Dependencies

- [ ] Run `npm audit` in `backend/` and `web/` regularly.
- [ ] Apply safe fixes: `npm audit fix` (avoid `--force` unless you accept breaking changes).
- [x] **Web:** `npm audit fix` applied (vulnerabilities resolved as of this checklist).
- [ ] **Backend:** Some issues may require `npm audit fix --force` (breaking; e.g. NestJS CLI / webpack, geoip-lite). Prefer upgrading dependencies in a separate PR and running tests.
- [ ] For unfixable or transitive issues, track upgrades (e.g. geoip-lite / Node 24 in API Dockerfile).

---

## 3. HTTP and headers (API)

- **Helmet** is enabled in `backend/src/main.ts` with:
  - `contentSecurityPolicy: false` (to avoid breaking Paystack/OAuth); see [CSP_RECOMMENDATIONS.md](./CSP_RECOMMENDATIONS.md).
  - `crossOriginEmbedderPolicy: false`, `crossOriginOpenerPolicy: false` for payments and OAuth.
- [x] **CSP report-only:** Next.js sends `Content-Security-Policy-Report-Only` (see `web/next.config.js`). Violations are logged in the browser console; add `report-uri` to collect in production. When ready, switch to enforcing (see CSP_RECOMMENDATIONS.md).

---

## 4. Input and output

- [x] **UGC sanitization** (Phase 3): support tickets, reviews, user bio, content pages — HTML stripped, length limited.
- [x] **Password policy:** min 8 chars, letter + number on register, change-password, reset-password.
- [ ] Validate/sanitize any new user-facing inputs (e.g. chat, new forms).

---

## 5. Auth and sessions

- [x] **Refresh tokens:** Stored hashed; logout and “logout all devices” revoke tokens.
- [ ] **JWT expiry:** Default `JWT_EXPIRES_IN` (e.g. 7d) is acceptable; shorten if you need stricter session limits.
- [ ] **Admin routes:** All under `/admin` and protected by JWT + role check; no admin actions without token.

---

## 6. Audit and ops

- [x] **Admin audit log:** Sensitive actions (user role/status, withdrawal status, support resolve, content update) logged to `admin_audit_log`. View via `GET /api/v1/admin/audit-log` or Admin → Audit log.
- [ ] **Logging:** Ensure production logs do not contain passwords or tokens; use structured logging if needed.
- [ ] **Backups:** DB and env backups; test restore periodically.

---

## 7. Infrastructure

- [ ] **HTTPS only** for API and web in production.
- [ ] **Rate limiting:** Already applied (e.g. login, OTP, register); adjust limits if needed.
- [ ] **Firewall / WAF:** Restrict DB and Redis to app only; optional WAF in front of API/web.

---

## Quick commands

```bash
# Backend
cd backend && npm audit && npm audit fix

# Web
cd web && npm audit && npm audit fix
```

After any `npm audit fix`, run tests and a quick smoke deploy to confirm nothing breaks.
