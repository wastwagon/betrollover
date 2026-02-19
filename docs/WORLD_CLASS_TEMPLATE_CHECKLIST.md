# World-Class Template Checklist — BetRolloverNew

**Purpose:** Align the project with `docs/WORLD_CLASS_DEV_TEMPLATE_COMPLETE.md` and `docs/STACK_TEMPLATE_FOR_AI_AGENT.md` after feature work (subscriptions, push, IAP).

**Last updated:** February 2026

---

## Summary: What’s Done vs What’s Next

| Area | Template requirement | BetRolloverNew status | Next action |
|------|----------------------|------------------------|-------------|
| **API versioning** | Routes under `/api/v1/` | ❌ No — all routes unversioned (e.g. `/auth`, `/wallet`) | Add global prefix `/api/v1` and update web/mobile base URL |
| **Shared types** | `packages/shared-types` for DTOs/contracts | ❌ Missing | Add `packages/shared-types`, export key DTOs; consume from backend/web/mobile |
| **CHANGELOG** | `CHANGELOG.md` at repo root, Keep a Changelog format | ❌ Missing | Create `CHANGELOG.md`, add initial entry and document recent releases |
| **Version control** | Branching: `main`, `develop`, `feature/*`, `release/*` | ⚠️ Only `main` in use | Introduce `develop`, use feature branches and optional `release/*` |
| **Conventional commits** | `feat(scope): description` etc. | ⚠️ Not enforced | Add commitlint + husky (optional) or document convention in CONTRIBUTING |
| **API** | Rate limiting, Helmet, RFC 7807 errors | ✅ Throttler + Helmet present | Optional: standardise error format (RFC 7807) |
| **Database** | Migrations, indexes, backups | ✅ Migrations, indexes | Keep doing; ensure backups documented |
| **SEO** | Metadata, sitemap, robots, JSON-LD | ✅ Metadata, sitemap, robots, JSON-LD | — |
| **Security** | HTTPS, JWT, CORS, Helmet, validation | ✅ In place | — |
| **Privacy / Terms** | `/privacy`, `/terms`; linked in app and stores | ✅ Web pages + footer links | Add `privacyPolicy` (and terms) URL in mobile `app.json` |
| **iOS / Google** | Privacy policy URL, store metadata, IAP | ✅ IAP + web push added | Store listings: add privacy/terms URLs; Sign in with Apple if social login added |

---

## Detailed checklist (template vs project)

### 1. Monorepo structure (template 1.1)

| Item | Status | Notes |
|------|--------|--------|
| `docker-compose.yml` | ✅ | Postgres, Redis, API, Web |
| `.env.example` | ✅ | Documented |
| `README.md` | ✅ | Present |
| **`CHANGELOG.md`** | ❌ | **Add at repo root** |
| **`packages/shared-types/`** | ❌ | **Create; shared DTOs, API contracts** |
| `backend/`, `web/`, `mobile/`, `database/`, `scripts/` | ✅ | Present |

### 2. API (template 1.3, 6, 6b)

| Item | Status | Notes |
|------|--------|--------|
| **Versioning `/api/v1/`** | ❌ | **Prefix all API routes** (e.g. `/api/v1/auth`, `/api/v1/wallet`) |
| **Shared types package** | ❌ | **Add and use from backend, web, mobile** |
| Rate limiting | ✅ | Throttler on auth |
| Helmet | ✅ | In `main.ts` |
| RFC 7807–style errors | ⚠️ | Optional: standardise exception filter |
| Health check | ✅ | e.g. `/health` |

### 3. Version control & releases (template 3.1–4.2)

| Item | Status | Notes |
|------|--------|--------|
| **CHANGELOG.md** | ❌ | **Create; Keep a Changelog format** |
| **Branching** | ⚠️ | **Use `develop`; feature branches; optional `release/*`** |
| **Conventional commits** | ⚠️ | **Document or enforce (commitlint)** |
| SemVer in package.json / app.json | ✅ | Versions present |
| Release steps (tag, deploy) | ⚠️ | Document in README or runbook |

### 4. Website & SEO (template 6.1, 14)

| Item | Status |
|------|--------|
| Metadata (title, description, OG) | ✅ |
| Sitemap | ✅ `web/app/sitemap.ts` |
| Robots | ✅ `web/app/robots.ts` |
| JSON-LD | ✅ `JsonLdScript.tsx` |
| Core Web Vitals / Lighthouse | ⚠️ Optional |
| Accessibility (WCAG 2.1 AA) | ⚠️ Ongoing |

### 5. Database (template 6.2, 15)

| Item | Status |
|------|--------|
| Migrations | ✅ `database/migrations/` |
| Indexes | ✅ In migrations |
| Prepared statements / ORM | ✅ TypeORM |
| Backups | ⚠️ Document/runbook |

### 6. Security (template 6.4, 17)

| Item | Status |
|------|--------|
| HTTPS (production) | ✅ Env/config |
| JWT + guards | ✅ |
| Rate limiting | ✅ Throttler |
| CORS | ✅ Configured |
| Helmet | ✅ |
| Input validation | ✅ class-validator |
| Secrets in env | ✅ .env.example |

### 7. Store & compliance (template 5.1–5.2, 12–13)

| Item | Status | Notes |
|------|--------|--------|
| Privacy policy URL | ✅ Web `/privacy` | **Add to mobile `app.json` (Expo `expo.privacyPolicy` or similar)** |
| Terms URL | ✅ Web `/terms` | Link in store listings and app |
| Sign in with Apple | ⚠️ | Only if adding social login |
| IAP (StoreKit / Play Billing) | ✅ | Backend verify + mobile flow |
| Store metadata (screenshots, description) | ⚠️ | At submission time |

### 8. UI/UX (template 16)

| Item | Status |
|------|--------|
| Mobile-first | ✅ |
| Touch targets 44px+ | ⚠️ Review key screens |
| Loading / error / empty states | ✅ Used |
| WCAG / accessibility | ⚠️ Ongoing |

---

## Recommended order of work (what’s next)

1. **CHANGELOG.md** — Create at repo root; add an initial “Unreleased” or first version and backfill recent changes (subscriptions, push, IAP, etc.).
2. **API versioning** — In NestJS, set global prefix `api/v1`; update web and mobile `API_URL` / `NEXT_PUBLIC_API_URL` / `EXPO_PUBLIC_API_URL` to include `/api/v1` (or keep base URL and append path in client). Document any breaking change for existing clients.
3. **Shared types package** — Add `packages/shared-types` with `package.json` and `src/index.ts`; export shared DTOs (e.g. auth, wallet, subscriptions); have backend and/or web consume it (mobile can follow later).
4. **Branching & commits** — Create `develop`; document (or enforce) conventional commits; use feature branches for new work.
5. **Mobile app.json** — Add privacy policy (and optionally terms) URL so store listings and in-app links are correct.
6. **Optional** — RFC 7807 exception filter; commitlint + husky; backup/runbook docs.

---

## Reference

- Full template: `docs/WORLD_CLASS_DEV_TEMPLATE_COMPLETE.md`
- AI agent stack: `docs/STACK_TEMPLATE_FOR_AI_AGENT.md`
