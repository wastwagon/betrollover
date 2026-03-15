# Platform growth – ideas and priorities

Focused on security/hardening and product growth. Adjust order by your goals (revenue, retention, acquisition).

---

## Done (security & observability)

- **Security:** UGC sanitization, password policy, Paystack idempotency, config validation, audit log (backend + admin UI).
- **Observability:** Error boundaries, API error banner, platform overview doc, security hardening checklist.
- **Growth baseline:** Admin audit log UI (Audit log page under Admin); use it to review admin actions and support compliance.

---

## Security / hardening next

1. **CSP (Content Security Policy)**  
   **Done (report-only).** Next.js sends `Content-Security-Policy-Report-Only` with a permissive allowlist; violations are logged, not blocked. See [CSP_RECOMMENDATIONS.md](./CSP_RECOMMENDATIONS.md). To enforce later, add a report endpoint and tighten directives.

2. **Dependencies**  
   Run `npm audit` and `npm audit fix` in `backend/` and `web/` regularly; plan upgrades for unfixable issues (e.g. geoip-lite / Node 24).

3. **Logout-all in UI** (**Done**)  
   Add “Log out all devices” in profile/settings calling `POST /api/v1/auth/logout-all` Profile: "Sessions" section with button; clears token and redirects to login.

---

## Product / growth next

1. **Referrals**  
   **Done:** Invite page at `/invite` (code, link, conversions). **Done:** Dashboard referral CTA banner (“Invite & Earn” + “Get your link”) above Quick Actions. Optional next: referral dashboard stats on dashboard, email/share copy.

2. **Engagement**  
   - Notifications: ensure key events (payout, withdrawal, support reply, new tipster follow) send in-app and optionally email.  
   - Push: if VAPID is set, promote “Enable notifications” for fixture/coupon updates.

3. **Trust and conversion**  
   - Highlight “free marketplace” and guest browsing; keep CTA to sign up when purchasing or following.  
   - Tipster profiles: ensure ROI, win rate, and past coupons are visible; consider “verified” or “top tipster” badges.

4. **Revenue**  
   - Commission and paid coupons are in place; consider promos (first coupon free, time-limited discount).  
   - Ads: if using Ads module, fill zones (marketplace, discover) and track CTR/impressions from admin.

5. **Content and SEO**  
   - Keep content pages (how-it-works, learn, FAQs) updated; add meta descriptions and canonical URLs where missing.  
   - Sitemap and robots.txt are present; submit to search engines if not already.

6. **Analytics**  
   Use existing analytics (e.g. admin Analytics) to track signups, marketplace views, purchases, and withdrawals; set simple goals (e.g. signup → first purchase) and review funnel.

---

## Metrics to watch

- **Acquisition:** Signups (email, Google, Apple), referral signups.  
- **Activation:** First login, first marketplace view, first purchase or first coupon create.  
- **Revenue:** Deposits, withdrawals, commission, paid coupon sales.  
- **Retention:** DAU/MAU, return visits, repeat purchases.  
- **Support:** Open tickets, resolution time; use audit log for admin actions.

---

## Docs to keep updated

- [PLATFORM_OVERVIEW.md](./PLATFORM_OVERVIEW.md) – stack, main areas, env, critical paths.  
- [SECURITY_HARDENING.md](./SECURITY_HARDENING.md) – checklist and quick commands.  
- [REQUIRED_ENV_PROD.md](./REQUIRED_ENV_PROD.md) – production env.  
- [PAYMENTS_RUNBOOK.md](./PAYMENTS_RUNBOOK.md) – Paystack webhook and verify.
