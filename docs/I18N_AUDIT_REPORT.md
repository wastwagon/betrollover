# BetRollover i18n Audit Report

**Date:** February 22, 2025  
**Scope:** Web app (pages, components), news/guides content model, translation keys, hardcoded strings

---

## 1. News/Guides Content Model

### Schema

| Table | Columns | Language field? |
|-------|---------|-----------------|
| `news_articles` | id, slug, title, excerpt, content, category, sport, image_url, source_url, featured, meta_description, published_at | **No** |
| `resource_items` | id, category_id, slug, title, excerpt, content, type, duration_minutes, tool_config, featured, sort_order, published_at | **No** |
| `resource_categories` | id, slug, name, description, level, sort_order | **No** |

**Conclusion:** News articles and resource items (guides) are stored in a **single language** (English). There is no `language`, `locale`, or `lang` column in any of these tables.

### Admin Flow

- **Admin News Create** (`/admin/news/create`): Single form with Title, Slug, Category, Excerpt, Content (HTML), Image URL, Source URL, Publish Date, Featured. No language selector. Editors create one version only.
- **Admin Resources** (`/admin/resources`): Manage resource categories and items. No language field. Items are created with title/excerpt/content in one language.
- **Admin News List** (`/admin/news`): List/edit existing articles. No French version workflow.

### French Versions

**French versions are neither required nor optional** — they do not exist in the current model. Editors create a single article; the same `title`, `excerpt`, and `content` are displayed to all users regardless of locale. The UI shell (nav, buttons, labels) switches via `t()` based on `br_language` cookie, but the article body itself is always the same text.

---

## 2. Translation Keys: en.ts vs fr.ts

| Metric | Value |
|--------|-------|
| Keys in en.ts | 472 |
| Keys in fr.ts | 472 |
| **Keys in en missing in fr** | **0** |

All translation keys present in `en.ts` have corresponding entries in `fr.ts`. No missing French translations for the UI dictionary.

---

## 3. Components/Pages with Hardcoded English

### High priority (user-facing, no t()/serverT)

| File | Hardcoded strings |
|------|------------------|
| `app/terms/page.tsx` | Entire page: "Terms of Service", "Legal", "Effective date", all section headings and body text (Overview, Eligibility, Nature of Service, etc.) |
| `app/earnings/page.tsx` | TX_LABELS (Pick Won — Net Payout, Platform Fee, Escrow Refund, etc.), "Tipster Dashboard", "Earnings & Performance", "Track your revenue...", RESULT_STYLE labels, SPORT_META labels |
| `app/not-found.tsx` | "Page Not Found", "This page went off-side", "The page you're looking for...", QUICK_LINKS (Marketplace, Find Tipsters, Leaderboard, etc.), "← Back to Home" |
| `app/login/page.tsx` | "Welcome back", "Sign in to access your dashboard", "Email", "Password", "Sign In", "Invalid email or password", "Unable to connect to server..." |
| `app/register/page.tsx` | Registration form labels and messages |
| `app/forgot-password/page.tsx` | Forgot password form text |
| `app/verify-email/page.tsx` | Verification messages |
| `app/resources/[category]/[slug]/page.tsx` | "Resource not found", "Back to Discover", type labels (Article, Strategy, Tool) |
| `app/news/[slug]/page.tsx` | CATEGORY_LABELS (News, Transfer Rumour, Confirmed Transfer, Injury Update, Gossip), SPORT_META labels |
| `app/news/page.tsx` | CATEGORY_TABS, CATEGORY_LABELS, SPORT_FILTERS, SPORT_META — all hardcoded |
| `app/discover/page.tsx` | SPORT_FILTERS, SPORT_META, CATEGORY_LABELS, levelLabels (Beginner, Intermediate, Advanced), typeLabels (Article, Strategy, Tool) — uses useT() for some UI but not these |
| `app/contact/page.tsx` | Mixed: uses t() for some, but response time list items ("Support requests — typically within 24 hours...") are hardcoded in both EN and FR via locale conditional |
| `app/responsible-gambling/page.tsx` | Some bullet points hardcoded; "Get Help" / "Obtenir de l'Aide" via locale conditional |

### Medium priority (create-pick, admin)

| File | Hardcoded strings |
|------|------------------|
| `app/create-pick/page.tsx` | "Competition", "All competitions", "Clear all filters", SportLoadingSpinner labels ("Loading basketball games…"), SportEmptyState labels ("No upcoming basketball games with odds", "No games match your filters"), "Error Loading Fixtures", "All fixtures have started", "Brief analysis...", "Placement", "Marketplace only", "Subscription only", "Both marketplace & subscription", "Review & Create", "Create subscription packages" |
| `app/admin/news/create/page.tsx` | "← Back to News", "Create News Article", "Title *", "Slug *", "Category", "Excerpt", "Content (HTML) *", "Image URL", "Source URL", "Publish Date...", "Featured", "Saving...", "Create Article", "Cancel" |
| `app/admin/resources/page.tsx` | "Resource Center", "Manage articles, strategies, and tools.", "Loading...", "+ Add Item", "No items yet.", "Published", "Draft" |
| `app/admin/*` (other pages) | Most admin pages have hardcoded labels (Users, Withdrawals, Settings, etc.) — lower priority for end-user i18n |

### Components

| File | Hardcoded strings |
|------|------------------|
| `components/UnifiedHeader.tsx` | SPORTS array (Football, Basketball, Rugby, etc.), MegaLink desc "Browse & buy verified tips", Account menu items (My Profile, Dashboard, Wallet, Earnings, My Picks, My Purchases, Subscriptions, Notifications, "All caught up", "X unread"), Discover submenu (News, Tipster Guides, About Us, Contact, Responsible Use), Tipsters submenu (Browse Tipsters, Leaderboard, Create Coupon, My Packages), Marketplace submenu (Settled Archive, Leaderboard) |
| `components/PickCard.tsx` | Some status/result labels if not using t() |
| `components/NewsWidget.tsx` | If any labels |
| `components/ContentPage.tsx` | If any |
| `components/BecomeTipsterCard.tsx` | If any |
| `components/FeaturedPicks.tsx` | If any |

---

## 4. Pages/Components That Use useT() or serverT

These correctly use translations:

- `app/page.tsx` (home) — buildT
- `app/about/page.tsx` — buildT
- `app/contact/page.tsx` — buildT (partial)
- `app/privacy/page.tsx` — buildT
- `app/responsible-gambling/page.tsx` — buildT (partial)
- `app/marketplace/page.tsx` — useT
- `app/leaderboard/page.tsx` — useT
- `app/tipsters/page.tsx` — useT
- `app/discover/page.tsx` — useT (partial — tab titles use t(), but SPORT_FILTERS etc. hardcoded)
- `app/dashboard/page.tsx` — useT
- `app/community/page.tsx` — useT
- `app/invite/page.tsx` — useT
- `app/create-pick/page.tsx` — useT (partial — many SportEmptyState labels hardcoded)
- Layout files (marketplace, tipsters, leaderboard, discover, news, resources, coupons, invite, support, community) — serverT for SEO metadata only

---

## 5. Recommended Approach for News/Guides i18n

### Option A: Content-level translations (database)

Add a `language` column and support multiple rows per logical article:

- **Schema change:** Add `language VARCHAR(5) NOT NULL DEFAULT 'en'` to `news_articles` and `resource_items`. Use composite unique: `(slug, language)` for news, `(category_id, slug, language)` for resources.
- **Admin flow:** Add language selector when creating/editing. Editors create separate EN and FR versions. Optional: "Translate" action to duplicate an article and pre-fill for translation.
- **API:** Filter by `language` matching request locale (from `Accept-Language` or `x-locale` header).
- **Display:** Fetch article in user's locale; fallback to `en` if no translation exists.

**Pros:** Full control, no external services.  
**Cons:** More admin work; duplicate content per language.

### Option B: UI-only i18n (current + expand)

Keep news/guides content in a single language (English). Expand UI translations so all shell text uses `t()`.

- **No schema change.** Article body stays as-is.
- **Strategy:** Add translation keys for all hardcoded strings in the audit. News/guides remain English-only; UI (nav, buttons, empty states, errors) is fully translated.
- **Optional:** Add a banner for French users: "This article is available in English only" with `t('content.english_only')`.

**Pros:** Minimal effort, no content duplication.  
**Cons:** French users see English article bodies.

### Option C: Hybrid (recommended)

1. **Phase 1 (short term):** Implement Option B — fix all hardcoded UI strings. Add keys for category labels, sport labels, empty states, etc.
2. **Phase 2 (medium term):** Add `language` to `news_articles` and `resource_items`. Make French versions optional. Display French when available, else fallback to English with optional "Available in English" note.
3. **Phase 3 (long term):** Add admin "Translate" workflow and optional MT pre-fill for editors.

---

## 6. Summary

| Item | Status |
|------|--------|
| **News/guides schema** | Single language (no `language` field) |
| **Admin flow** | One version per article; no French workflow |
| **French versions** | Not supported; not required |
| **Missing fr keys** | 0 (all en keys have fr) |
| **Hardcoded UI** | ~25+ files with user-facing English |
| **Recommended** | Hybrid: Phase 1 = UI i18n; Phase 2 = optional content-level translations |
