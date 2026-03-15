# BetRollover – Platform Gaps Review

A structured review of gaps, risks, and improvement areas across the entire platform. Use this to prioritize fixes and enhancements.

---

## 1. Testing & Reliability

| Gap | Severity | Notes |
|-----|----------|--------|
| **Limited automated tests** | High | Backend: only a few unit specs (auth, wallet, tipster-follow, settlement-logic, notification-types). No integration or e2e for Paystack, subscriptions, chat, support, admin, or OAuth. Frontend: single e2e smoke test (`web/e2e/smoke.spec.ts`). |
| **No React Error Boundaries** | Medium | Uncaught component errors can bring down whole page trees. No `ErrorBoundary` (or equivalent) in `web` for route or section-level fallbacks. |
| **No global API error UI** | Medium | Proxy route returns 502 on backend failure; app has no shared “API unavailable” or retry UI. Users see generic failures or “Backend unavailable” without recovery guidance. |
| **Config not validated at startup** | Medium | Critical env (e.g. `JWT_SECRET` in prod) is checked in `main.ts`; no single validated config schema for Paystack, SMTP, API keys, OAuth, etc. Misconfiguration can surface only at runtime. |

**Recommendations:** Add route-level Error Boundaries; add a small set of integration/e2e tests for auth, wallet, and marketplace; consider a config validation step (e.g. `ConfigModule` with schema) at bootstrap.

---

## 2. Security

| Gap | Severity | Notes |
|-----|----------|--------|
| **CSP disabled** | Medium | `contentSecurityPolicy: false` in Helmet to avoid breaking Paystack/inline scripts. Increases XSS risk if any user input is rendered without sanitization. |
| **Input sanitization beyond chat** | Medium | Chat has `filterMessageContent()` (links, contact details, spam). Reviews, coupon titles/descriptions, bio, support tickets, content pages, and news may not have equivalent sanitization or HTML escaping when rendered. |
| **Rate limits** | Low–Medium | Global 100 req/min; stricter limits on auth (login, OTP, register, forgot, refresh) and on support/chat. Wallet, subscriptions, and many admin endpoints rely on global limit only. Paystack webhook has no app-level throttle (relies on signature verification). |
| **Admin surface** | Low | Admin routes protected by `AdminGuard`; ensure no admin actions are exposed without guard (e.g. double-check fixtures/sync and migration endpoints). |

**Recommendations:** Re-enable CSP with a allowlist that supports Paystack and auth scripts; ensure all user-generated content (reviews, bios, support, CMS) is escaped or sanitized before render; consider stricter throttling for wallet and sensitive admin actions.

---

## 3. Auth & Users

| Gap | Severity | Notes |
|-----|----------|--------|
| **OAuth token handling** | Low | Google/Apple ID tokens verified server-side; refresh flow and token storage on frontend are consistent. Contact email for “Hide My Email” (Apple) is in place. |
| **Password policy** | Low | No enforced complexity or breach-check; only length in some flows. Acceptable for MVP but worth documenting. |
| **Session invalidation** | Low | Refresh tokens revokable on logout; no “logout all devices” or admin-triggered invalidation documented. |

**Recommendations:** Optional: add password strength rules and “logout everywhere”; document session/refresh strategy for support.

---

## 4. Payments & Wallet

| Gap | Severity | Notes |
|-----|----------|--------|
| **Paystack webhook idempotency** | Medium | If webhook is retried, ensure duplicate credit is not applied (e.g. idempotency key or idempotent handling by `reference`). |
| **Deposit verification fallback** | Low | Callback/verify route exists when webhook fails; ensure it is the only fallback and that manual reconciliation is documented. |
| **Withdrawal limits & audit** | Low | Min/max and payout method checks exist; consider audit log for large or repeated withdrawals. |

**Recommendations:** Confirm webhook handler is idempotent; add a short “Payments runbook” (webhook URL, verify URL, manual steps) for ops.

---

## 5. Data & Integrations

| Gap | Severity | Notes |
|-----|----------|--------|
| **API-Sports rate limits** | Medium | Plan and limits configured in `api-limits.config`; ensure cron/sync jobs respect limits and handle 429/errors without leaving data half-updated. |
| **Odds API / settlement** | Medium | Odds API used for tennis and settlement; timezone/date handling was fixed. Ensure all sports using it have clear “event finished” logic and retry/backfill for failed settlement. |
| **Email delivery** | Low | SMTP/SendGrid used for OTP, verification, password reset, admin. No systematic tracking of bounces or failures; consider logging or alerting for critical sends. |
| **Missing or partial i18n** | Low | Some UI strings may still be hardcoded; ensure critical user-facing flows (auth, wallet, support) use translation keys. |

**Recommendations:** Add integration tests or scripts that simulate rate limits and settlement failures; document which jobs depend on which APIs and how to monitor them.

---

## 6. Frontend & UX

| Gap | Severity | Notes |
|-----|----------|--------|
| **Loading & empty states** | Low–Medium | Some lists/pages may show spinners only; empty states (e.g. “No coupons yet”) improve clarity. |
| **Offline / poor network** | Low | No service worker or offline strategy beyond PWA metadata; failed requests show generic errors. |
| **Accessibility** | Low | No audit referenced; ensure forms, buttons, and modals have labels and focus order for screen readers. |
| **Mobile consistency** | Low | Bottom nav and responsive layout in place; verify all admin and secondary flows (e.g. support, referrals) are usable on small screens. |

**Recommendations:** Add Error Boundaries and a simple “Something went wrong” + retry for key routes; review one critical flow (e.g. login → create pick → purchase) for loading/empty/a11y.

---

## 7. Admin & Operations

| Gap | Severity | Notes |
|-----|----------|--------|
| **Migrations & seeds** | Low | Migration runner and seeds exist; ensure production runs migrations in a controlled way and seeds are not re-run in prod. |
| **Audit trail** | Medium | No structured audit log for admin actions (user role change, payouts, content changes, ban, etc.). Harder to debug and comply with policies. |
| **Feature flags / kill switches** | Low | No explicit feature flags; disabling a feature (e.g. Paystack, a sport) would require config/code change. |
| **Monitoring & alerts** | Low | Sentry referenced for errors; no documented alerting for payment failures, settlement failures, or API quota. |

**Recommendations:** Add an audit log for sensitive admin actions; document how to disable payments or key features in an emergency.

---

## 8. Documentation & Runbooks

| Gap | Severity | Notes |
|-----|----------|--------|
| **Env and secrets** | Medium | `.env.example` documents many variables; no single “required vs optional” matrix per environment (dev/staging/prod). |
| **Deployment** | Low | Deployment and CORS (e.g. `APP_URL` on API server) are documented; webhook and verify URLs for Paystack should be in one place. |
| **Product/feature docs** | Low | PRE_LAUNCH_REVIEW and other docs describe known gaps; keep a short “Platform overview” for new devs (main areas, env, and critical paths). |

**Recommendations:** Maintain a one-page “Required env (prod)” and link Paystack/webhook/verify docs from it; add a short “Platform overview” for onboarding.

---

## 9. Summary by Priority

- **High:** Expand test coverage (auth, wallet, marketplace); add React Error Boundaries and clearer API-failure UX.
- **Medium:** Config validation at startup; CSP and input sanitization for all UGC; Paystack webhook idempotency; admin audit log; env/docs clarity.
- **Low:** Password policy; session invalidation; withdrawal audit; i18n and a11y pass; feature flags; monitoring/alerting; runbooks.

Use this document alongside `docs/PRE_LAUNCH_REVIEW.md` and any deployment/security checklists you already have.
