# Platform Gaps – Implementation Phases

Safe, incremental rollout of the items from `PLATFORM_GAPS_REVIEW.md`. Each phase is designed to be low-risk and independently deployable.

---

## Phase 1 – Safety net (no behavior change)

**Goal:** Fail gracefully and fail fast. No change to happy-path behavior.

| Item | Description | Status |
|------|-------------|--------|
| 1.1 React Error Boundaries | Route-level and (optional) section-level error fallback UI so one component error doesn’t break the whole page. | **Done** — `app/error.tsx`, `app/global-error.tsx`, `components/ErrorBoundary.tsx` |
| 1.2 Config validation at startup | Backend: validate critical env (JWT, DB, APP_URL in prod) at bootstrap; exit with clear message if missing. | **Done** — `main.ts` `validateConfig()` requires JWT_SECRET + APP_URL in prod |
| 1.3 Required env (prod) doc | One-page “Required env (prod)” and link to Paystack/webhook from it. | **Done** — [REQUIRED_ENV_PROD.md](./REQUIRED_ENV_PROD.md), [PAYMENTS_RUNBOOK.md](./PAYMENTS_RUNBOOK.md) |

**Deploy:** After Phase 1, deploy and confirm app and API still start and key flows work.

---

## Phase 2 – Reliability

**Goal:** Better handling when the backend or payments misbehave.

| Item | Description | Status |
|------|-------------|--------|
| 2.1 Global API error / retry UI | Shared “Backend unavailable” or “Something went wrong” with retry (e.g. on login or key API calls). | **Done** — `ApiErrorBanner` + login (retry + hint) |
| 2.2 Paystack webhook idempotency | Ensure deposit webhook is idempotent by reference (no double credit on retries). | **Done** — webhook + verify check existing tx by reference |
| 2.3 Payments runbook | Short runbook: webhook URL, verify URL, manual reconciliation steps. | **Done** — [PAYMENTS_RUNBOOK.md](./PAYMENTS_RUNBOOK.md) |

**Deploy:** After Phase 2, run a test payment and webhook replay (if possible in staging).

---

## Phase 3 – Security (UGC & headers)

**Goal:** Reduce XSS and abuse risk from user content and headers.

| Item | Description | Status |
|------|-------------|--------|
| 3.1 Input sanitization for UGC | Sanitize or escape reviews, bio, support tickets, content pages (and coupon titles/descriptions if rendered as HTML). | **Done** — `common/sanitize.util.ts`; applied in support, reviews, users (bio, displayName), content (title, content, metaDescription) |
| 3.2 CSP (optional) | Re-enable CSP with an allowlist that allows Paystack and auth scripts; test thoroughly. | **Deferred** — [CSP_RECOMMENDATIONS.md](./CSP_RECOMMENDATIONS.md) for when ready |

**Deploy:** After Phase 3, smoke-test forms (review, support, profile bio) and Paystack + OAuth.

---

## Phase 4 – Observability & compliance

**Goal:** Audit trail for admin actions; clearer ops docs.

| Item | Description | Status |
|------|-------------|--------|
| 4.1 Admin audit log | Table + service to log sensitive admin actions (role change, payout, ban, content change); optional admin UI to view. | **Done** — `admin_audit_log` table, `AuditModule`, log from updateUser, updateWithdrawalStatus, updateContentPage, support adminResolve; GET admin/audit-log |
| 4.2 Platform overview doc | Short “Platform overview” for new devs (main areas, env, critical paths). | **Done** — [PLATFORM_OVERVIEW.md](./PLATFORM_OVERVIEW.md) |

**Deploy:** After Phase 4, trigger a few admin actions and confirm they are logged.

---

## Phase 5 – Testing & polish

**Goal:** Critical-path tests and optional product improvements.

| Item | Description | Status |
|------|-------------|--------|
| 5.1 Critical-path tests | A few e2e or integration tests: auth login, wallet balance, marketplace public list. | **Done** — smoke: marketplace loads for guests; unit: password policy, marketplace public controller |
| 5.2 Password policy (optional) | Enforce minimum complexity; optional breach check. | **Done** — min 8 chars, letter + number; register, change-password, reset-password |
| 5.3 Logout all devices (optional) | Allow user or admin to invalidate all refresh tokens for an account. | **Done** — POST /auth/logout-all (user), POST /admin/users/:id/logout-all (admin) |

**Deploy:** After Phase 5, run the new test suite in CI and before releases.

---

## Rollback

- **Phase 1:** Remove error.tsx / global-error.tsx; revert config validation (or make it warn-only). No DB or API contract change.
- **Phase 2:** Revert retry UI; webhook idempotency is backward-compatible (only adds a check).
- **Phase 3:** Revert sanitization/CSP to previous behavior.
- **Phase 4:** Audit log is append-only; can stop writing; no need to remove table.
- **Phase 5:** Disable or skip new tests if they flake.

---

## Completion checklist

- [ ] Phase 1 implemented and deployed
- [ ] Phase 2 implemented and deployed
- [ ] Phase 3 implemented and deployed
- [ ] Phase 4 implemented and deployed
- [ ] Phase 5 implemented and deployed
