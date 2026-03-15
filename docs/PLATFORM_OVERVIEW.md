# BetRollover – Platform Overview

Short reference for developers: main areas, env, and critical paths.

---

## Stack

- **Backend:** NestJS (Node), TypeORM, PostgreSQL. Global prefix `api/v1`; health and Paystack webhook unversioned.
- **Frontend:** Next.js (App Router), React. Proxies API via `web/app/api/backend/[[...path]]` to `BACKEND_URL` / `NEXT_PUBLIC_API_URL`.
- **Integrations:** Paystack (payments), API-Sports (fixtures/leagues), Odds API (tennis/settlement), SendGrid/SMTP (email), Google/Apple OAuth.

---

## Main areas

| Area | Backend | Frontend / Notes |
|------|---------|-------------------|
| **Auth** | `AuthModule` (login, register, refresh, Google/Apple) | `/login`, `/register`, `/api/auth/*` |
| **Users & profile** | `UsersModule` (me, update profile, tipster request) | `/profile`, `/dashboard` |
| **Wallet** | `WalletModule` (balance, deposit, withdraw, payout methods) | `/wallet`; Paystack webhook at `POST /wallet/paystack-webhook` |
| **Coupons & marketplace** | `AccumulatorsModule` (create, my, purchased, marketplace, purchase) | `/create-pick`, `/marketplace`, `/my-picks`, `/my-purchases` |
| **Tipsters & predictions** | `PredictionsModule`, `TipsterModule` (feed, stats, follow) | `/tipsters`, `/tipsters/[username]`, `/leaderboard` |
| **Admin** | `AdminModule` (users, withdrawals, content, settings, migrations, audit log) | `/admin/*`; guard: admin only |
| **Support** | `SupportModule` (create ticket, admin resolve) | `/support` |
| **Notifications** | `NotificationsModule` (in-app, push) | `/notifications` |
| **Content / CMS** | `ContentModule`, `NewsModule`, `ResourcesModule` | `/news`, `/resources`, content pages by slug |

---

## Environment (critical)

- **API server:** `JWT_SECRET`, `APP_URL` (frontend origin for CORS), `POSTGRES_*`. See [REQUIRED_ENV_PROD.md](./REQUIRED_ENV_PROD.md).
- **Web:** `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_URL`. Optional: `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_APPLE_CLIENT_ID`.
- **Payments:** [PAYMENTS_RUNBOOK.md](./PAYMENTS_RUNBOOK.md) (webhook URL, verify URL).

---

## Critical paths

1. **Login:** Browser → Next.js `POST /api/auth/login` → backend `POST /api/v1/auth/login` → JWT; Google/Apple via `/api/auth/google`, `/api/auth/apple` and callbacks.
2. **Deposit:** User initiates on `/wallet` → backend creates Paystack tx → user pays → Paystack sends webhook to `POST /wallet/paystack-webhook`; or user returns with `?ref=` and frontend calls `GET /api/v1/wallet/deposit/verify?ref=`.
3. **Marketplace:** Public list `GET /accumulators/marketplace/public`; purchase and auth-only flows use `GET /accumulators/...` with Bearer token.
4. **Admin audit:** Sensitive actions (user role/status, withdrawal status, support resolve, content update) are logged to `admin_audit_log`. View via `GET /api/v1/admin/audit-log` (admin only).

---

## Key docs

- [REQUIRED_ENV_PROD.md](./REQUIRED_ENV_PROD.md) – Production env checklist
- [PAYMENTS_RUNBOOK.md](./PAYMENTS_RUNBOOK.md) – Paystack webhook and verify
- [PLATFORM_GAPS_IMPLEMENTATION_PHASES.md](./PLATFORM_GAPS_IMPLEMENTATION_PHASES.md) – Gap fixes and phases
- [PRE_LAUNCH_REVIEW.md](./PRE_LAUNCH_REVIEW.md) – Pre-launch checklist
