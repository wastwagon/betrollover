# BetRollover – Safe Phased Implementation Plan

**Purpose:** Add improvements without modifying existing features or functionality. This plan is designed for a **live production site** where stability is paramount.

**Principle:** All changes are **additive only**. No refactoring of auth, API calls, validation, or business logic.

---

## Scope: What We Will NOT Touch

| Area | Reason |
|------|--------|
| Auth flow / `localStorage.getItem('token')` usage | 100+ call sites; refactor risk too high |
| ValidationPipe / DTOs / `forbidNonWhitelisted` | Could break clients sending extra fields |
| CORS configuration | Already env-specific; change could block legitimate traffic |
| API URL usage (`getApiUrl` vs hardcoded) | Centralization requires touching many files |
| Database queries (N+1, aggregation) | Could change results in edge cases |
| Search debouncing | Changes when API is called; could affect UX |
| Polling / refresh intervals | Could affect real-time behavior |
| Silent `.catch()` blocks | Adding user feedback could change UX |
| Removing `console.log` | Could affect debugging; no replacement planned yet |

---

## Phase 1: Documentation & Alignment (Zero Risk)

**Goal:** Update docs to reflect current state. No code changes.

### 1.1 Update README Feature Checklist

**File:** `README.md`

**Change:** Update the "Feature Reference (from v1)" section to match implemented features.

| Feature | Current README | Actual State |
|---------|----------------|--------------|
| Auth (login, register, JWT) | [x] | [x] |
| Picks CRUD & marketplace | [ ] | [x] Implemented |
| Accumulator builder | [ ] | [x] Implemented |
| Wallet & Paystack | [ ] | [x] Implemented |
| Escrow for purchases | [ ] | [x] Implemented |
| Chat (WebSocket/Pusher) | [ ] | [ ] Not implemented |
| Notifications | [ ] | [x] Implemented |
| Leaderboard & contests | [ ] | [x] Implemented |
| Admin dashboard | [ ] | [x] Implemented |

**Risk:** None. Documentation only.

---

### 1.2 Add Production Checklist to .env.example

**File:** `.env.example`

**Change:** Add a short comment block at the top with production deployment checklist (JWT_SECRET, APP_URL, Paystack live keys, etc.). Reference existing `docs/BACKUP_AND_RUNBOOK.md` and `README.md` Production Checklist.

**Risk:** None. Comments only.

---

## Phase 2: Additive Observability (Low Risk, Opt-In)

**Goal:** Add optional monitoring and structured logging. All features are **opt-in** via env vars. No change to existing behavior when disabled.

### 2.1 Optional Error Tracking (Sentry) ✅

**Implemented:** `@sentry/nextjs` added to web app. `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `instrumentation.ts` created. `next.config.js` wraps with `withSentryConfig` only when `NEXT_PUBLIC_SENTRY_DSN` or `SENTRY_DSN` is set. When unset, plain Next.js config is used—zero Sentry code runs.

**To enable:** Set `NEXT_PUBLIC_SENTRY_DSN` (and optionally `SENTRY_DSN` for server) in `.env`. Get DSN from [sentry.io](https://sentry.io) → Project Settings → Client Keys.

**Risk:** Low. When DSN unset, zero impact. When set, adds error monitoring and optional tracing (10% sample in prod).

---

### 2.2 Optional Structured Logging (Backend) ✅

**Implemented:** `backend/src/common/logger.ts` – logger with `debug`, `info`, `warn`, `error`. When `LOG_LEVEL` is set, outputs JSON for log aggregation. When unset, uses console with simple format.

**Usage:** `import { logger } from '@/common/logger';` then `logger.info('msg', { key: 'value' });` in new code only. Existing `console.log` in scripts stays unchanged.

**Risk:** Low. Additive. No changes to existing logging paths.

---

## Phase 3: API Documentation (Additive) ✅

**Implemented:** `@nestjs/swagger` added. Swagger UI at `/docs`, JSON at `/docs-json`. Bearer auth supported for testing protected routes. Excluded from global prefix so docs are at `http://localhost:6001/docs`.

**Risk:** None. Read-only documentation. No changes to request/response handling.

---

## Phase 4: Production Runbook & Env Validation

**Goal:** Improve production safety with clearer env validation and runbook steps. No change to application logic.

### 4.1 Env Validation Summary Doc ✅

**Implemented:** `docs/ENV_VALIDATION.md` – lists required vs optional env vars, production checklist, validation logic reference.

**Risk:** None. Documentation only.

---

### 4.2 Optional: Health Check Enhancements

**Approach:** Extend `GET /health` to optionally check DB and Redis connectivity when `HEALTH_CHECK_DB=true`. Return 503 if DB is down. This is additive; existing health behavior unchanged when env is unset.

**Risk:** Low. Opt-in. Default behavior unchanged.

---

## Phase 5: Additive UX (Optional, Careful)

**Goal:** Add loading and empty states **only where they are clearly missing** and where the change is purely additive (no logic change).

### 5.1 Loading States ✅

**Implemented:** Replaced generic spinners with `LoadingSkeleton` on: Wallet, Subscriptions, Notifications, Subscription Packages. Wallet Suspense fallback now uses LoadingSkeleton. No change to data flow or API calls.

**Risk:** Low. Improves perceived performance.

---

### 5.2 Empty States ✅

**Implemented:** Notifications page now uses `EmptyState` component when no notifications (title, description, "Go to Dashboard" action). Other pages (Marketplace, My Picks, My Purchases, Tipsters, Leaderboard) already had EmptyState.

**Risk:** Low. Purely additive.

---

## Implementation Order

| Phase | Description | Est. Effort | Risk |
|-------|-------------|-------------|------|
| **1** | Documentation & alignment | 1–2 hours | None |
| **2** | Additive observability (Sentry, logger) | 2–4 hours | Low |
| **3** | API documentation (Swagger) | 2–3 hours | None |
| **4** | Runbook & env validation docs | 1 hour | None |
| **5** | Loading/empty states (optional) | 2–4 hours | Low |

---

## Pre-Implementation Checklist (Per Phase)

Before implementing each phase:

- [ ] Read this plan and confirm no existing logic is modified
- [ ] Run existing tests: `cd backend && npm test`, `cd web && npx playwright test`
- [ ] Verify live site behavior in staging (if available)
- [ ] Create a backup or ensure rollback path (e.g. git branch, DB backup for migrations)

---

## Rollback Strategy

- **Phase 1:** Revert README/.env.example changes
- **Phase 2:** Remove Sentry DSN from env; optionally revert package changes
- **Phase 3:** Remove Swagger setup from `main.ts`; no route changes to revert
- **Phase 4:** Documentation only; no rollback needed
- **Phase 5:** Revert component changes if any UX regression is observed

---

## Excluded from This Plan (Future Consideration)

These items were considered but **excluded** because they could affect current functions:

- Auth context/provider refactor
- ValidationPipe / DTO changes
- CORS changes
- API URL centralization
- Debug log removal
- Search debouncing
- N+1 query optimization
- Polling/refresh changes
- Chat implementation
- Mobile feature parity

---

**Last Updated:** February 19, 2026  
**Status:** All phases complete (1–5)
