# BetRollover – Product Review & Improvement Roadmap

Comprehensive review for building a world-class tipster platform.

---

## 1. Registration & Fake User Prevention

### Current State
- **Minimal validation:** Email, username (3+ chars, alphanumeric), password (6+ chars)
- **Display name optional** – users can skip or use fake names
- **No email verification** – anyone can register with any email
- **No phone required** – `phone` exists in schema but is optional at registration
- **No CAPTCHA/reCAPTCHA** – vulnerable to bots
- **No rate limiting** on `/auth/register` – allows mass signups

### Recommended Improvements (Priority Order)

| Priority | Improvement | Effort | Impact |
|----------|-------------|--------|--------|
| **P0** | **Email verification** – Send OTP/link on signup; require verification before full access | Medium | High |
| **P0** | **Require full name** – Make `displayName` required, validate format (2+ words, no numbers/symbols) | Low | High |
| **P0** | **reCAPTCHA v3** – Add to registration form to block bots | Low | High |
| **P1** | **Phone verification** – Require for tipsters (or wallet deposits); use SMS OTP | Medium | High |
| **P1** | **Rate limiting** – Throttle registration by IP (e.g. 5/hour) | Low | Medium |
| **P1** | **Honeypot field** – Hidden field to catch bots | Low | Low |
| **P2** | **KYC for tipsters** – For withdrawals, require ID verification (e.g. Gov’t ID) | High | High |
| **P2** | **Disposable email block** – Block temp-mail domains | Low | Medium |

### Implementation Notes

**1. Display name validation (backend)** – enforce real-name pattern:
```ts
// In register.dto.ts – add @Matches for real name
@Matches(/^[a-zA-Z\s'-]{2,50}$/, { message: 'Use your real full name (letters and spaces only)' })
displayName: string;  // Make required, remove @IsOptional
```

**2. Email verification flow:**
- On register: create user with `isVerified: false`
- Send verification email with token/link
- Block wallet deposits, tipster features until verified
- Add `/auth/verify-email?token=xxx` endpoint

**3. reCAPTCHA:**
- Add `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` and `RECAPTCHA_SECRET_KEY`
- Verify token on backend before creating user

---

## 2. Wallet & Paystack Top-Up

### Current State
- **Flow:** `initializeDeposit` → Paystack redirect → user pays → **webhook** credits wallet
- **Webhook:** `/wallet/paystack-webhook` with raw body + signature verification
- **Callback URL:** `https://yourapp.com/wallet?deposit=success&ref=xxx` – user returns after payment
- **Paystack config:** `PAYSTACK_SECRET_KEY` required; `.env` has placeholder `sk_live_xxx`

### Is It Working?
- **Yes** – flow is correct when:
  - Paystack keys are set (`sk_live_*` or `sk_test_*`)
  - Webhook URL is publicly reachable (Paystack Dashboard → Settings → Webhooks)
  - Webhook URL: `https://your-api-domain.com/wallet/paystack-webhook`

### Gaps & Improvements

| Issue | Fix |
|-------|-----|
| **Local dev:** Paystack can’t reach webhook on localhost | Use ngrok or Paystack’s test mode; add **callback verification** as fallback |
| **No callback verification:** When user returns with `?ref=xxx`, wallet page only reloads; if webhook fails, user never gets credited | Add `GET /wallet/deposit/verify?ref=xxx` – verify with Paystack API and credit if not already done |
| **Race:** User may return before webhook fires | Callback verification handles this; webhook remains primary |
| **Placeholder keys:** `.env` has `sk_live_xxx` | Use real keys; for dev use `sk_test_*` |

### Paystack Setup Checklist
- [ ] Paystack Dashboard: Settings → API Keys → copy Secret Key
- [ ] `PAYSTACK_SECRET_KEY=sk_live_xxxx` or `sk_test_xxxx` in `.env`
- [ ] Paystack Dashboard: Settings → Webhooks → add `https://api.yourdomain.com/wallet/paystack-webhook`
- [ ] For local testing: ngrok or similar to expose webhook

---

## 3. Areas Needing Improvement

### Security
- [ ] **Rate limiting** – Add `@nestjs/throttler` on auth endpoints (login, register)
- [ ] **Password strength** – Enforce minimum 8 chars, 1 uppercase, 1 number, 1 special
- [ ] **JWT refresh** – Consider refresh tokens for long sessions
- [ ] **CORS** – Tighten for production; only allow known origins

### UX & Reliability
- [ ] **Loading states** – Consistent spinners/skeletons across pages
- [ ] **Error boundaries** – Catch React errors on key pages
- [ ] **Offline** – Basic offline handling for mobile
- [ ] **Form validation** – Client-side validation before submit (e.g. Zod, react-hook-form)

### Data & Integrity
- [ ] **Audit logging** – Log wallet deposits/withdrawals, admin actions
- [ ] **Idempotency** – Prevent double-crediting for deposits (e.g. webhook retries)
- [ ] **Transaction status** – Show pending/completed deposits clearly on wallet page

### Tipster Platform
- [ ] **Tipster verification** – Manual approval flow for “Become Tipster”
- [ ] **Performance stats** – Track ROI, win rate, consistency
- [ ] **Leaderboard** – Public tipster rankings
- [ ] **Notifications** – Email/push for pick results, withdrawals, approvals

### Admin
- [ ] **User management** – Suspend, verify, view activity
- [ ] **Deposit/withdrawal review** – Manual approval for large amounts
- [ ] **Analytics** – Revenue, user growth, retention

---

## 4. Quick Wins (Low Effort, High Impact)

1. **Require display name** – Make it required in registration; add validation
2. **Add callback verification** – `GET /wallet/deposit/verify?ref=xxx` for when webhook is slow
3. **Password strength** – Add `@MinLength(8)` and `@Matches` for complexity
4. **Confirm password** – Add `confirmPassword` field on registration
5. **Block registration** – Until `isVerified`, restrict wallet deposits and tipster features

---

## 5. Production Checklist

- [ ] `JWT_SECRET` – Strong, random, 32+ chars
- [ ] `PAYSTACK_SECRET_KEY` – Real keys
- [ ] `APP_URL` – Production URL
- [ ] `NEXT_PUBLIC_API_URL` – Production API URL
- [ ] Paystack webhook URL configured
- [ ] `POSTGRES_HOST` – Correct for deployment (not localhost)
- [ ] `BACKEND_URL` – Correct for server-to-server calls
- [ ] `NODE_ENV=production`
- [ ] HTTPS everywhere
- [ ] Database backups
- [ ] Email service (SMTP) for verification emails

---

## Summary

| Area | Status | Priority |
|------|--------|----------|
| Registration | Weak – no verification, fake names allowed | P0 |
| Email verification | Missing | P0 |
| Paystack wallet | Working when configured; add callback verification | P1 |
| Rate limiting | Missing | P1 |
| Security hardening | Partial | P1 |
| UX polish | Good base; needs consistency | P2 |

Implementing these changes will move BetRollover toward a robust, trustworthy tipster platform.
