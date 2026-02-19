# World-Class Development Template — AI Agent Specification

Use this specification when starting a **new project** that requires both **web** and **mobile** apps. Follow this stack and structure for scalability, consistency, and store approval (iOS/Android).

---

## Quick Reference — Master Checklist

| Area | Key Items |
|------|-----------|
| **API** | Versioning (`/api/v1/`), shared types package, rate limiting, Helmet, RFC 7807 errors |
| **iOS App Store** | Privacy policy, Terms, Sign in with Apple (if social login), age rating, metadata, deep links |
| **Google Play** | Privacy policy, Data Safety form, target API 34+, content rating, store listing |
| **Website / SEO** | Metadata, sitemap, robots, JSON-LD, Core Web Vitals, accessibility |
| **Database** | Migrations, indexes, prepared statements, backups, audit fields, soft deletes |
| **UI/UX** | Mobile-first, 44px+ touch targets, loading/error/empty states, WCAG 2.1 AA |
| **Security** | HTTPS, JWT short expiry, rate limiting, CORS, Helmet, input validation, npm audit |

---

## Project Setup Instruction (Copy & Adapt)

When scaffolding or implementing a new project, apply the following stack and structure. Replace `PROJECT_NAME` and `PROJECT_SLUG` with the actual project name and URL-friendly slug.

---

## 1. Monorepo Structure

```
PROJECT_SLUG/
├── docker-compose.yml       # Postgres, Redis, API, Web
├── .env.example
├── README.md
├── packages/
│   └── shared-types/        # Shared DTOs, API contracts, domain types
│       ├── src/
│       │   └── index.ts
│       └── package.json
├── backend/                 # NestJS API
│   ├── src/
│   │   ├── modules/
│   │   ├── main.ts
│   │   └── app.module.ts
│   ├── package.json
│   └── Dockerfile
├── web/                     # Next.js (web app)
│   ├── app/                 # App Router
│   ├── components/
│   ├── package.json
│   └── Dockerfile
├── mobile/                  # Expo (iOS/Android app)
│   ├── app/                 # Expo Router
│   ├── package.json
│   └── app.json
├── database/
│   ├── init/                # Postgres init scripts
│   ├── migrations/          # SQL migrations
│   └── seeds/               # Seed data
└── scripts/                 # Setup, deploy, migrations
```

---

## 2. Technology Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **Web** | Next.js (React) | 14.x | SSR, SEO, App Router, API routes |
| **Web** | Tailwind CSS | 3.x | Utility-first styling |
| **Web** | TypeScript | 5.x | Type safety |
| **Mobile** | Expo | 50.x | iOS/Android without native Xcode/Android Studio |
| **Mobile** | React Native | 0.73.x | Cross-platform native UI |
| **Mobile** | Expo Router | 3.x | File-based routing (like Next.js) |
| **API** | NestJS | 10.x | Node.js backend, modules, DI |
| **API** | TypeORM | 0.3.x | ORM for PostgreSQL |
| **API** | Passport (JWT + Local) | Latest | Auth for web & mobile |
| **API** | class-validator / class-transformer | Latest | DTO validation |
| **Database** | PostgreSQL | 16 | Primary data store |
| **Cache** | Redis | 7 | Sessions, rate limit, cache |
| **Dev** | Docker Compose | Latest | Local dev: Postgres, Redis, API, Web |
| **Web E2E** | Playwright | Latest | Browser tests |
| **API Tests** | Jest | 29.x | Unit/integration tests |

---

## 3. Core Principles

1. **Single API** — One NestJS backend serves both web and mobile. No separate mobile API.
2. **Single Database** — PostgreSQL is the source of truth. Web and mobile never have separate DBs.
3. **Shared Auth** — JWT tokens. Web stores in `localStorage`, mobile in `AsyncStorage`. Same login/register endpoints.
4. **Shared Data Layer** — Use `@tanstack/react-query` on both web and mobile for API state.
5. **TypeScript Everywhere** — Backend, web, and mobile all use TypeScript.
6. **Docker for Local Dev** — `docker compose up` starts Postgres, Redis, API, Web. Mobile runs separately (Expo needs native tooling).

---

## 4. Environment Variables

**Backend (API)**
- `NODE_ENV`, `PORT`
- `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` (or `DATABASE_URL`)
- `REDIS_URL`
- `JWT_SECRET`
- `APP_URL` (e.g. `http://localhost:6002` for web)
- Payment/email/external API keys as needed (e.g. Paystack, SendGrid, etc.)

**Web (Next.js)**
- `NEXT_PUBLIC_API_URL` (e.g. `http://localhost:6001` for local, or API domain in prod)

**Mobile (Expo)**
- `EXPO_PUBLIC_API_URL` (use machine IP for device/simulator, e.g. `http://192.168.1.100:6001`)

---

## 5. Docker Compose Default Ports

- **PostgreSQL:** 5435 (host) → 5432 (container)
- **Redis:** 6380 (host) → 6379 (container)
- **API:** 6001 (host) → 3001 (container)
- **Web:** 6002 (host) → 3000 (container)

Avoid port 6000 (Chrome blocks it). Use 6xxx range for API/Web.

---

## 6. API Design

- RESTful endpoints with **versioning**: prefix all routes with `/api/v1/` (e.g. `/api/v1/auth/login`)
- JWT in `Authorization: Bearer <token>` header
- JSON request/response
- DTOs with class-validator for validation
- Consistent error format (RFC 7807–style): `{ statusCode, message, error?, path?, timestamp? }`
- Health check: `GET /health` (no version)
- API docs: optional OpenAPI/Swagger at `/api/docs` for web/mobile devs

---

## 6b. Shared Types Package

- Create `packages/shared-types/` — exported TypeScript types/interfaces for:
  - API request/response DTOs
  - Domain models (User, Pick, etc.)
  - Error shapes
- Backend, web, and mobile import from `@project/shared-types` (or workspace package name)
- Single source of truth for API contracts; reduces drift and breaking changes

---

## 6c. Real-Time (Optional)

- Use **WebSockets** (NestJS `@WebSocketGateway`) or managed services (Pusher, Ably) for:
  - Live notifications, chat, live scores, presence
- Web: `WebSocket` API or Pusher/Ably client
- Mobile: same client SDKs
- Fallback: long-polling or SSE if WebSockets blocked

---

## 7. Auth Flow (Shared)

- `POST /api/v1/auth/register` — body: `{ email, password, displayName? }`
- `POST /api/v1/auth/login` — body: `{ email, password }` → returns `{ access_token }`
- Protected routes: `Authorization: Bearer <token>`
- Passport JWT strategy validates token; `@CurrentUser()` decorator injects user

---

## 8. Web App Structure (Next.js)

- **App Router** — `app/` directory, `layout.tsx`, `page.tsx`
- **Route groups** — `(marketing)` for public, `(dashboard)` for authenticated
- **API routes** — `app/api/` for proxy or server actions if needed
- **Components** — `components/` with shared UI (Header, Footer, Shell, etc.)
- **Hooks** — `hooks/` for reuse (useToast, useDebounce, etc.)
- **Lib** — `lib/` for config, utils
- **Mobile-first responsive** — Tailwind breakpoints: `sm`, `md`, `lg`

---

## 9. Mobile App Structure (Expo)

- **Expo Router** — `app/` directory, file-based routes
- **app/_layout.tsx** — Root layout, QueryClientProvider, StatusBar
- **app/index.tsx** — Home/splash
- **app/login.tsx**, **app/register.tsx** — Auth screens
- **app/(tabs)/** — Tab navigator for main app (dashboard, profile, etc.)
- **Shared API client** — `fetch` with `EXPO_PUBLIC_API_URL`; store JWT in AsyncStorage
- **@tanstack/react-query** — Same patterns as web

---

## 10. Database Migrations

- Use SQL migrations in `database/migrations/`
- Naming: `NNN_description.sql` or TypeORM migration files
- Run on API startup (optional) or via CI/deploy script
- Never modify migrations after they are applied in prod

---

## 11. Testing

- **Backend:** Jest, unit tests for services, integration for controllers
- **Web:** Playwright for E2E (smoke tests: home, login, key flows)
- **Mobile:** Expo/React Native testing as needed (Jest, Detox, etc.)

---

## 12. iOS App Store Best Practices (Apple Review)

- **Privacy Policy URL** — Required. Host at `/privacy` on web; link in app and App Store Connect.
- **Terms of Service** — Required for paid/subscription features. Host at `/terms`; link in app.
- **Data Collection / App Tracking Transparency** — If you collect IDFA or track users, implement ATT (App Tracking Transparency) prompt and declare in App Store Connect.
- **Sign in with Apple** — Required if you offer third-party social login (Google, Facebook); add Apple Sign-In as an option.
- **Age Rating** — Set correctly (e.g. 17+ for gambling/betting apps).
- **App Store Metadata** — Screenshots (6.5", 5.5"), description, keywords, support URL.
- **In-App Purchases** — If selling, use StoreKit; no external payment links for digital goods.
- **Crash-free** — Ensure no crashes on launch; test on real devices.
- **Deep Links / Universal Links** — Use `app.json` scheme; configure Associated Domains for web↔app links.
- **Rejection Avoidance** — No placeholder content; no broken links; no hidden features; comply with gambling/payments guidelines if applicable.

---

## 13. Google Play Best Practices (Play Console)

- **Privacy Policy URL** — Required. Same as web `/privacy`; add in Play Console.
- **Data Safety Form** — Declare data collection, sharing, and security practices accurately.
- **Target API Level** — Target recent Android API (e.g. 34+); Google requires new apps to target latest.
- **64-bit Support** — Ensure native libs support 64-bit (Expo handles this).
- **Content Rating** — Complete IARC questionnaire; set appropriate rating.
- **App Signing** — Use Google Play App Signing; export upload key.
- **Store Listing** — Screenshots, feature graphic (1024x500), short/long description.
- **No Malware / Policy Violations** — No deceptive behavior; no gambling/minors violations without compliance.
- **Testing** — Internal/closed/open testing tracks before production.
- **Expo EAS Build** — Use EAS Build for production builds; configure `eas.json` for Android.

---

## 14. Website & SEO Best Practices

- **Metadata** — Next.js `metadata` in `layout.tsx`: title, description, keywords, Open Graph, Twitter cards.
- **Sitemap** — `app/sitemap.ts` for dynamic sitemap; submit to Google Search Console.
- **Robots** — `app/robots.ts` to allow/disallow crawlers.
- **Structured Data** — JSON-LD for Organization, WebSite, BreadcrumbList; improves rich results.
- **Performance** — Lighthouse 90+; lazy load images; use `next/image`; minimize CLS.
- **Core Web Vitals** — LCP < 2.5s, FID < 100ms, CLS < 0.1.
- **Mobile-Friendly** — Responsive; viewport meta; touch targets 44px+.
- **HTTPS** — Enforce in production.
- **Canonical URLs** — Avoid duplicate content; use canonical tags where needed.
- **Accessibility** — Semantic HTML; aria-labels; focus management; WCAG 2.1 AA target.

---

## 15. Database Best Practices

- **Migrations** — Versioned SQL or TypeORM migrations; never edit applied migrations.
- **Indexes** — Index foreign keys, frequently queried columns, and search fields.
- **Connection Pooling** — Use connection pool (default in TypeORM); tune `max` for load.
- **Prepared Statements** — Use parameterized queries (TypeORM/ORM) to prevent SQL injection.
- **Backups** — Daily backups; test restore; retention policy.
- **Secrets** — Never commit DB credentials; use env vars and secret managers.
- **Naming** — snake_case for tables/columns; consistent conventions.
- **Soft Deletes** — Use `deletedAt` for recoverable deletes where appropriate.
- **Audit Fields** — `createdAt`, `updatedAt` on relevant tables.
- **Read Replicas** — For high read load; consider when scaling.

---

## 16. UI/UX Best Practices

- **Mobile-First** — Design for small screens first; scale up.
- **Touch Targets** — Min 44x44px for tap areas; avoid tiny buttons.
- **Loading States** — Skeleton/spinner for async actions; avoid blank screens.
- **Error States** — Clear messages; retry options; no raw stack traces.
- **Empty States** — Helpful copy and CTAs when no data.
- **Accessibility** — Contrast ratios (4.5:1 text); keyboard nav; screen reader support.
- **Consistency** — Shared design tokens (colors, spacing, radii); same patterns across web and mobile.
- **Offline Handling** — Graceful degradation; cache critical data; show connectivity status.
- **Dark Mode** — Support `prefers-color-scheme` or user toggle where appropriate.
- **Reduced Motion** — Respect `prefers-reduced-motion`; disable non-essential animations.

---

## 17. Security Best Practices

- **HTTPS** — Enforce in production; redirect HTTP → HTTPS.
- **JWT** — Short expiry (e.g. 15min access, 7d refresh); store securely; HttpOnly cookies for web if possible.
- **Secrets** — Never commit `.env`; use secret managers (Coolify, Vault, etc.) in prod.
- **Rate Limiting** — Throttle auth and API endpoints; use NestJS Throttler or Nginx.
- **Input Validation** — Validate all inputs (class-validator); sanitize outputs.
- **CORS** — Restrict origins to known domains; no `*` in production.
- **Headers** — Helmet.js (NestJS); X-Content-Type-Options, X-Frame-Options, CSP.
- **SQL Injection** — Use ORM/parameterized queries; never concatenate SQL.
- **XSS** — Escape output; CSP; avoid `dangerouslySetInnerHTML` unless sanitized.
- **Dependencies** — Regular `npm audit`; fix high/critical; use Dependabot.
- **Auth** — bcrypt for passwords; secure password reset (token expiry).
- **Mobile** — Use Keychain/Keystore for sensitive data; certificate pinning for high-security apps.

---

## 18. Production Deployment (Coolify / VPS)

- PostgreSQL (managed or container)
- Redis (optional, for cache/rate limit)
- API container (NestJS)
- Web container (Next.js `npm run build` && `npm run start`)
- Reverse proxy (Nginx) for HTTPS
- Set `NODE_ENV=production`, strong `JWT_SECRET`, production API URL for web

---

## 19. AI Agent Checklist When Starting a New Project

### Structure & Setup
- [ ] Create monorepo: `packages/shared-types/`, `backend/`, `web/`, `mobile/`, `database/`
- [ ] Add `docker-compose.yml` for Postgres, Redis, API, Web
- [ ] Add `.env.example` with all required vars
- [ ] Add README with Quick Start, stack table, run instructions

### Backend
- [ ] Initialize NestJS in `backend/` with TypeORM, Passport JWT
- [ ] API versioning: prefix routes with `/api/v1/`
- [ ] Implement auth: register, login, JWT guard
- [ ] Health endpoint `GET /health`
- [ ] Configure CORS for web origin
- [ ] Rate limiting on auth endpoints
- [ ] Helmet / security headers

### Web
- [ ] Initialize Next.js 14 in `web/` with App Router, Tailwind
- [ ] Metadata, sitemap.ts, robots.ts for SEO
- [ ] API client using `NEXT_PUBLIC_API_URL`
- [ ] Mobile-first responsive layout; 44px+ touch targets

### Mobile
- [ ] Initialize Expo in `mobile/` with Expo Router
- [ ] app.json: bundleIdentifier (iOS), package (Android), scheme, privacyPolicy URL
- [ ] API client using `EXPO_PUBLIC_API_URL`, AsyncStorage for token
- [ ] Safe area handling; touch targets 44px+

### Shared
- [ ] Shared types package for DTOs / API contracts
- [ ] Consistent error format across API responses

### Store & Compliance
- [ ] Privacy policy page at `/privacy`; link in app and store listings
- [ ] Terms of service at `/terms` if applicable
- [ ] Sign in with Apple if using social login
- [ ] Data Safety / App Privacy declarations for stores

---

## 20. Example Prompt for AI Agent

```
Create a new project named [PROJECT_NAME] using this stack:

- Monorepo: packages/shared-types, backend (NestJS), web (Next.js 14), mobile (Expo)
- Database: PostgreSQL 16, Redis 7
- Auth: JWT (Passport), same API for web and mobile, API versioning /api/v1/
- Local dev: Docker Compose for Postgres, Redis, API, Web
- Follow docs/STACK_TEMPLATE_FOR_AI_AGENT.md (API versioning, shared types, iOS/Android store practices, SEO, DB, UI, security)

Implement:
1. Shared types: packages/shared-types with DTOs and API contracts
2. Backend: NestJS with auth (register, login) under /api/v1/, health check, TypeORM, rate limiting, Helmet
3. Web: Next.js 14 App Router, Tailwind, metadata/sitemap/robots for SEO, login/register, dashboard shell
4. Mobile: Expo with Expo Router, app.json (privacy policy URL, bundle IDs), login/register, dashboard tabs
5. Privacy policy page at /privacy, terms at /terms
6. docker-compose.yml, .env.example, README

Include: 44px+ touch targets, mobile-first responsive, HTTPS in prod, CORS restricted, no secrets in repo.
```

---

## 21. Reference

This template is based on the BetRollover v2 stack. Adapt project-specific modules (e.g. payments, notifications, domain logic) while keeping the core structure, security, and store-compliance practices consistent across projects.
