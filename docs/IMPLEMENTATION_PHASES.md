# BetRollover Implementation Phases

Phased rollout of features for safe, incremental deployment.

---

## Phase 1: Backend Language Support ✅

**Status:** Complete

**What was done:**
- Added `language` column to `news_articles`, `resource_items`, `resource_categories` (migration 056)
- News API: `?language=en|fr` filter; `getBySlug` falls back to English when French not available
- Resources API: `?language=en|fr` filter; categories and items filter by language with fallback
- Web API routes (`/api/news`, `/api/news/[slug]`, `/api/resources/*`) read `br_language` cookie and pass to backend
- News page passes `lang` from LanguageContext when fetching directly from backend

**Testing:**
- Switch language to French in header → news/resources requests include `language=fr`
- If no French content exists, API returns English (fallback) or empty list

---

## Phase 2: Environment & Configuration Validation ✅

**Status:** Complete

**What was done:**
- Created `scripts/check-env.sh` — validates .env, JWT_SECRET, optional keys
- Updated `scripts/pre-deploy-verify.sh` — added migration 056 to expected list
- Updated `.env.example` — added `bash scripts/check-env.sh` hint

**Usage:**
```bash
bash scripts/check-env.sh
```

---

## Phase 3: Content Workflow — French Versions When Creating ✅

**Status:** Complete

**What was done:**
- Admin news create: added language selector (English / Français)
- Backend admin news create/update: accepts `language` (default 'en')
- Backend admin resource item create/update: accepts `language` (default 'en')
- Hint: "Same slug for French = same article, different language"

---

## Phase 4: Production Readiness ✅

**Status:** Complete (scripts in place)

**What was done:**
- `scripts/pre-deploy-verify.sh` — run before every deploy
- `scripts/check-env.sh` — validates .env, JWT_SECRET, optional keys
- Migration 056 added to pre-deploy expected list

**Before deploy:**
```bash
bash scripts/pre-deploy-verify.sh
```

**Configure for production:**
- `CORS_ORIGINS` — add your frontend domain(s)
- `NEXT_PUBLIC_APP_URL` / `APP_URL` — set to production domain
- `NEXT_PUBLIC_API_URL` — API base URL
- Optional: Sentry DSN, VAPID keys

---

## Phase 5: Code Quality — ESLint Fixes ✅

**Status:** Partial (safe fixes applied)

**What was done:**
- TeamBadge: replaced `<img>` with Next.js `<Image />` (unoptimized for external URLs)

**Remaining (optional, lower priority):**
- `useEffect` dependency warnings in admin, marketplace, create-pick, my-purchases, wallet
- `useMemo` dependency warnings in tipster profile
- These can be addressed incrementally; they do not block deployment

---

## Follow-up: Admin Pages (Completed)

**Admin News Edit** (`/admin/news/[id]/edit`):
- Edit existing articles
- Language selector, category, all fields
- Backend: added `GET admin/news/:id`

**Admin Resource Item Create** (`/admin/resources/items/create?categoryId=X`):
- Create guide/strategy/tool items
- Language selector, type (article/strategy/tool)
- Duration, excerpt, content

**Admin News List**: Added "Lang" column to show article language.

---

## Running Phases

| Phase | Command / Action |
|-------|------------------|
| 1 | Already applied — backend + web use language |
| 2 | `bash scripts/check-env.sh` |
| 3 | Admin create forms have language selector |
| 4 | `bash scripts/pre-deploy-verify.sh` before deploy |
| 5 | TeamBadge fixed; remaining ESLint optional |
