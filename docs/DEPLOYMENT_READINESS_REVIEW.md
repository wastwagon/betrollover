# BetRollover — Deployment Readiness Review

**Purpose:** Comprehensive review before deploying multi-sport expansion on top of existing football MVP.  
**Scope:** Continuity, consistency, transparency, accessibility, performance, best practices, security, SEO.  
**Date:** February 2026

---

## Executive Summary

| Area | Status | Priority |
|------|--------|----------|
| **Security** | Good foundation; a few hardening items | High |
| **SEO** | Strong (metadata, sitemap, robots, JSON-LD) | — |
| **Accessibility** | Partial; needs systematic improvement | Medium |
| **Performance** | Good (Next/Image, caching, preconnect) | Low |
| **Consistency** | Generally good; minor gaps | Medium |
| **Transparency** | Good (docs, env example, pre-deploy script) | — |

**Recommendation:** Address **Critical** and **High** items before deploy. **Medium** items can follow in first post-launch sprint.

---

## 1. Continuity & Approach Consistency

### 1.1 Football MVP vs Multi-Sport Architecture

| Aspect | Football (MVP) | Multi-Sport (New) | Consistency |
|--------|----------------|-------------------|-------------|
| **Data source** | API-Sports Football | API-Sports (volleyball) + The Odds API (6 sports) | Different APIs; unified `sport` column in picks/tickets |
| **Tables** | `fixtures`, `fixture_odds` | `sport_events`, `sport_event_odds` | Separate tables; `accumulator_picks` has `fixture_id` OR `event_id` |
| **Sync** | FootballSyncService, OddsSyncService | Per-sport sync services | Same pattern per sport |
| **Settlement** | Football in `settlement.service.ts` | Non-football in Odds API settlement | Two paths; both update `accumulator_tickets.result` |

**Findings:**
- ✅ Clear separation: football uses `fixtures`, others use `sport_events`
- ✅ `accumulator_picks.sport` and `accumulator_tickets.sport` unify display
- ⚠️ **Gap:** Create-pick page shows all 8 sports; ensure non-football sports have events synced before users can create picks. Admin → Sports sync must run post-deploy.

### 1.2 API Consistency

- ✅ All routes under `/api/v1` except health, Paystack webhook, docs, avatars
- ✅ Paystack webhook correctly excluded: `POST /wallet/paystack-webhook` (no version prefix)
- ✅ Web and mobile use `getApiUrl()` / `API_BASE` with `/api/v1` suffix
- ✅ RFC 7807–style error responses via `HttpExceptionFilter`

### 1.3 Naming & Patterns

- ✅ TypeORM `SnakeNamingStrategy` (snake_case DB columns)
- ✅ DTOs with `class-validator` decorators
- ✅ Guards: `JwtAuthGuard`, `AdminGuard`, `AgeVerifiedGuard`, `OptionalJwtGuard`
- ⚠️ Some `any` types remain (e.g. `@Req() req: any` in webhook); prefer typed request

---

## 2. Transparency

### 2.1 Documentation

| Doc | Purpose |
|-----|---------|
| `docs/DEPLOYMENT.md` | Production deploy steps, env vars, cron jobs |
| `docs/PRE_LAUNCH_REVIEW.md` | Security checklist, gaps |
| `docs/ADMIN_MIGRATIONS.md` | Migration runner behavior |
| `.env.example` | All env vars with comments |
| `scripts/pre-deploy-verify.sh` | Automated checks before deploy |

**Findings:**
- ✅ Pre-deploy script validates JWT_SECRET, migrations, Dockerfiles, builds
- ✅ Env example includes production checklist
- ⚠️ **Gap:** `docs/PRE_LAUNCH_REVIEW.md` references `PAYSTACK_WEBHOOK_SECRET` but Paystack uses `x-paystack-signature` with `PAYSTACK_SECRET_KEY` — ensure docs match implementation (they do: `verifyWebhookSignature` uses `getSecretKey()`)

### 2.2 User-Facing

- ✅ Responsible gambling page
- ✅ Terms, Privacy, Contact
- ✅ Age verification guard for sensitive features
- ⚠️ Consider adding a "How it works" or "Transparency" page explaining escrow, settlement, and tipster verification

---

## 3. Accessibility (a11y)

### 3.1 Current State

| Area | Status | Notes |
|------|--------|-------|
| **Semantic HTML** | Partial | `aria-label` on main nav; some buttons lack labels |
| **Focus management** | Partial | `focus-visible` in globals.css; modals/dropdowns may trap focus |
| **Color contrast** | Unknown | No automated audit; Tailwind defaults generally pass |
| **Keyboard nav** | Partial | Form fields and links work; mega-menu may need arrow-key support |
| **Screen readers** | Partial | `aria-hidden` on decorative elements; some interactive elements lack `aria-*` |

**Files with accessibility attributes:**
- `UnifiedHeader.tsx` — `aria-label="Main navigation"`
- `HomeHero.tsx` — `aria-hidden` on decorative grid
- `EmptyState.tsx` — `aria-hidden` on icon
- `ErrorToast`, `SuccessToast` — focus handling
- `create-pick`, `login`, `register` — some `aria-*` usage

### 3.2 Recommendations

1. **High:** Add `aria-label` to all icon-only buttons (e.g. close, menu toggle, cart)
2. **High:** Ensure form errors are announced (e.g. `aria-live="polite"` on error regions)
3. **Medium:** Add `skip to main content` link for keyboard users
4. **Medium:** Audit modal/drawer focus trap and escape key handling
5. **Low:** Run `axe-core` or Lighthouse a11y audit; fix critical issues

---

## 4. Performance

### 4.1 Web

| Area | Status | Notes |
|------|--------|-------|
| **Images** | ✅ | `next/image` used; AVIF/WebP; remote patterns for API, media |
| **Caching** | ✅ | `Cache-Control: immutable` for `/_next/static` in production |
| **Preconnect** | ✅ | `getApiOriginForPreconnect()` for external API |
| **Fonts** | ✅ | DM Sans via `next/font` (subset, variable) |
| **Code splitting** | ✅ | Next.js App Router automatic |
| **Loading states** | Partial | Some pages have `loading.tsx`; others may show blank |

**Findings:**
- ✅ No raw `<img>` tags found; all use `next/image`
- ✅ Security headers (X-Frame-Options, X-Content-Type-Options, etc.) in `next.config.js`
- ✅ `create-pick` page refactored: types, odds utils, format helpers, FootballFixtureCard, SportEventCard extracted (~1450 lines main page + components)

### 4.2 Backend

- ✅ Throttler: 100 req/min per IP (global)
- ✅ Redis cache module available
- ✅ TypeORM `createQueryBuilder` with parameterized queries (no SQL injection from user input)
- ⚠️ **Gap:** Auth endpoints (login, register) use same 100/min limit; consider stricter `@Throttle(5, 60)` for login to reduce brute-force risk

### 4.3 Mobile

- ✅ Expo Image for optimized images
- ⚠️ Chat polling (`poll?after_id=`) — ensure interval is reasonable to avoid battery drain

---

## 5. Best Practices

### 5.1 Backend

| Practice | Status |
|----------|--------|
| Validation | ✅ Global `ValidationPipe` with `whitelist`, `forbidNonWhitelisted` in prod |
| Error handling | ✅ `HttpExceptionFilter` for consistent format |
| Guards | ✅ JWT, Admin, AgeVerified, OptionalJwt |
| DTOs | ✅ `class-validator` on auth DTOs; some controllers accept unvalidated `body` |
| Logging | ⚠️ Mix of `Logger` and `console.log`; prefer structured logging (Pino/Winston) |

### 5.2 Frontend

| Practice | Status |
|----------|--------|
| React Query | ✅ Used for data fetching |
| Error boundaries | ✅ `global-error.tsx` for root |
| Loading states | Partial | Some routes have `loading.tsx` |
| i18n | ✅ `LanguageContext`, `getAlternates()` for hreflang |

### 5.3 Database

- ✅ `synchronize: false` — schema via init + migrations
- ✅ Migrations use `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` for idempotency
- ✅ `applied_migrations` table prevents duplicate runs
- ✅ TypeORM parameter binding (no string concatenation in queries)

---

## 6. Security

### 6.1 Authentication & Authorization

| Item | Status |
|------|--------|
| JWT secret | ✅ Required in production; app exits if missing |
| JWT validation | ✅ `JwtStrategy` validates token, loads user |
| Password hashing | ✅ bcrypt (assumed from `AuthService`) |
| Admin guard | ✅ `AdminGuard` checks `user.role === 'admin'` |
| Age verification | ✅ `AgeVerifiedGuard` for sensitive features |

### 6.2 Paystack Webhook

| Item | Status |
|------|--------|
| Raw body | ✅ Preserved for signature verification |
| Signature check | ✅ `verifyWebhookSignature` with HMAC-SHA512 |
| Secret source | ✅ `PaystackSettings` or `PAYSTACK_SECRET_KEY` |
| Webhook URL | `https://api.betrollover.com/wallet/paystack-webhook` (no /api/v1) |

### 6.3 Headers & CORS

| Item | Status |
|------|--------|
| Helmet | ✅ Enabled (CSP disabled to avoid breaking Paystack; COEP disabled for embeds) |
| CORS | ✅ Production uses `APP_URL` + `CORS_ORIGINS` only |
| Security headers (Next.js) | ✅ X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy |

### 6.4 Recommendations

1. **Critical:** Change default admin password immediately after first deploy (see `database/init/02-seed-users.sql`)
2. ~~**High:** Add `@Throttle(5, 60)` to login/register~~ ✅ **Already implemented:** Login 5/5min, OTP 5/15min, Register 5/hour, Forgot 3/15min
3. ~~**Medium:** Add `.env.backup` to `.gitignore`~~ ✅ **Already in .gitignore**
4. **Medium:** Consider Content-Security-Policy (CSP) with nonce for inline scripts if you add more client-side logic
5. **Low:** Ensure `PAYSTACK_WEBHOOK_SECRET` in docker-compose.prod is either unused or documented — Paystack uses `PAYSTACK_SECRET_KEY` for webhook verification

---

## 7. SEO

### 7.1 Current Implementation

| Feature | Status |
|---------|--------|
| Metadata | ✅ `metadataBase`, title template, description, keywords |
| Open Graph | ✅ type, locale, alternateLocale, images with alt |
| Twitter Card | ✅ summary_large_image |
| Robots | ✅ `robots.ts` — allow /, disallow /admin, /dashboard, /profile, etc. |
| Sitemap | ✅ `sitemap.ts` — English + French URLs, changeFrequency, priority |
| JSON-LD | ✅ Organization, WebSite, SearchAction |
| hreflang | ✅ `getAlternates()` for en/fr |
| Locale routing | ✅ `/fr/...` rewrites, `x-locale` header |

### 7.2 Recommendations

1. **Critical:** Ensure `og-image.png` (1200×630) and `BetRollover-logo.png` (512×512) exist in `web/public/` — both are referenced in layout/metadata but may be missing from the repo
2. **Verify:** `SITE_URL` from `NEXT_PUBLIC_APP_URL` is correct in production
3. **Optional:** Add `Article` schema for news pages; `Person` for tipster profiles
4. **Optional:** Add `lastModified` from CMS/DB for news and resources in sitemap (currently uses `now`)

---

## 8. Pre-Deploy Checklist

### Must Do Before Deploy

- [ ] Run `bash scripts/pre-deploy-verify.sh` — 0 errors
- [ ] Set `JWT_SECRET` (≥32 chars, `openssl rand -base64 48`)
- [ ] Set `APP_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_URL` to production domains
- [ ] Set `CORS_ORIGINS` (comma-separated)
- [ ] Configure Paystack webhook: `https://api.betrollover.com/wallet/paystack-webhook`
- [ ] Set `API_SPORTS_KEY` (football + volleyball)
- [ ] Set `ODDS_API_KEY` (basketball, rugby, MMA, hockey, american football, tennis)
- [ ] Change default admin password immediately after first deploy
- [ ] Use `docker-compose.prod.yml` with `NODE_ENV=production`

### Post-Deploy

- [ ] Admin → Sports → Sync All Sports (populate non-football events)
- [ ] Admin → Fixtures → Sync leagues (football)
- [ ] Admin → Database → Migrations — verify all applied
- [ ] Test: Register, login, browse marketplace, create pick (football + one non-football)
- [ ] Test: Deposit flow (Paystack)
- [ ] Verify health: `GET https://api.betrollover.com/health`

---

## 9. Summary of Action Items

| Priority | Item | Status |
|----------|------|--------|
| **Critical** | Change default admin password after first deploy | Ops (manual) |
| **Critical** | Add `og-image.png` and `BetRollover-logo.png` | ✅ Done (generated & copied to web/public) |
| ~~**High**~~ | ~~Add stricter throttle on auth endpoints~~ | ✅ Done |
| **High** | Add `aria-label` to icon-only buttons | ✅ Done |
| **Medium** | Add form error `aria-live` regions | ✅ Done |
| **Medium** | Add skip-to-main-content link | ✅ Done |
| **Medium** | How it works / Transparency page | ✅ Done (/how-it-works) |
| **Low** | Article/Person JSON-LD for news & tipsters | ✅ Done |
| **Low** | Typed webhook request + wallet DTOs | ✅ Done |
| **Low** | Escape key for modals/drawers | ✅ Done |
| **Low** | Run Lighthouse a11y audit | QA (manual) |
| **Low** | Consider splitting `create-pick` page | ✅ Done (extracted types, utils, components) |

---

*Last updated: February 2026 — implementation phases completed.*
