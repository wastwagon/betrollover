# Typography review: sections with same “titles too large / not blending” issue

Same issue as fixed on **coupon cards** and **coupon single view**: titles use `text-2xl`/`text-3xl` and `font-bold`, so they dominate and don’t blend with body content for a premium feel.

**Implementation (safe phases):**
- **Phase 1:** Tipster profile, News article, Resource article (single-entity views).
- **Phase 2:** FeaturedPicks, NewsWidget, Discover, Support, News list, Coupon not found.
- **Phase 3:** Archive/My Purchases/Wallet/Earnings stats, Auth, Static pages, Invite, Leaderboard, ContentPage, not-found.
- **Phase 4:** Home page (section titles, How it works, Sports, Features, Free Tip of the Day, Public Chat Rooms, Popular Events, HomeStats).

**Originally fixed:** `PickCard.tsx` (cards + modals), `app/coupons/[id]/page.tsx` (coupon single view).

---

## High priority (single-entity views / main content)

| Location | Current | Suggested | Note |
|----------|---------|-----------|------|
| **Tipster profile** `app/tipsters/[username]/page.tsx` | | | |
| – Tipster name (h1) | `text-2xl md:text-3xl font-bold` | `text-lg sm:text-xl font-semibold` | Same pattern as coupon single view |
| – Stats (ROI, Win rate, W/L, etc.) | `font-bold text-lg` | `font-semibold text-base` | Softer, still clear |
| – Subscription price | `text-2xl font-bold` | `text-lg font-semibold` | Align with coupon price |
| **News article** `app/news/[slug]/page.tsx` | | | |
| – Article title (h1) | `text-2xl sm:text-3xl font-bold` | `text-lg sm:text-xl font-semibold` | Same as coupon single view |
| **Resource article** `app/resources/[category]/[slug]/page.tsx` | | | |
| – Resource title | `text-xl md:text-2xl font-semibold` | `text-lg md:text-xl font-semibold` | Slightly smaller |

---

## Medium priority (section titles / lists)

| Location | Current | Suggested | Note |
|----------|---------|-----------|------|
| **FeaturedPicks** `components/FeaturedPicks.tsx` | `text-xl md:text-2xl font-bold` | `text-base md:text-lg font-semibold` | “Marketplace Coupons” section |
| **NewsWidget** `components/NewsWidget.tsx` | `text-xl md:text-2xl font-bold` | `text-base md:text-lg font-semibold` | “Latest News” |
| **Discover** `app/discover/page.tsx` | `text-xl font-bold` (h2/h3) | `text-base font-semibold` | Hub and “coming soon” headings |
| **Support** `app/support/page.tsx` | `text-2xl sm:text-3xl font-bold` (h1) | `text-lg sm:text-xl font-semibold` | Page title |
| **Support** `app/support/page.tsx` | `text-base font-bold` (h2 “New ticket”) | `text-sm font-semibold` | Section title |
| **News list** `app/news/page.tsx` | `text-lg font-bold` (card title), `text-xl font-bold` (section) | `text-base font-semibold` | Article cards and section |
| **Coupon not found** `app/coupons/[id]/page.tsx` | `text-2xl font-bold` | `text-lg font-semibold` | Error state |

---

## Lower priority (stats / auth / static pages)

| Location | Current | Suggested | Note |
|----------|---------|-----------|------|
| **Settled archive** `app/coupons/archive/page.tsx` | `text-2xl font-bold` (stat numbers) | `text-lg font-semibold` | Total / Won / Lost counts |
| **My Purchases** `app/my-purchases/page.tsx` | `text-2xl font-bold` (stat value) | `text-lg font-semibold` | Summary value |
| **Wallet** `app/wallet/page.tsx` | `text-2xl sm:text-3xl font-bold` (balance) | `text-xl sm:text-2xl font-semibold` | Balance |
| **Earnings** `app/earnings/page.tsx` | `text-2xl sm:text-3xl` (h1), `text-2xl font-bold` (stat) | `text-lg sm:text-xl font-semibold`, `text-lg font-semibold` | Page title and main stat |
| **Login** `app/login/page.tsx` | `text-2xl font-bold` | `text-xl font-semibold` | “Welcome back” |
| **Register** `app/register/page.tsx` | `text-2xl xl:text-3xl font-bold`, `text-2xl md:text-3xl font-bold` | `text-xl xl:text-2xl font-semibold` | Headlines |
| **Forgot password / Verify email** | `text-2xl font-bold` | `text-xl font-semibold` | Page titles |
| **Static content** (About, Privacy, Terms, Contact, How it works, Learn, Responsible gambling) | `text-3xl font-bold` (h1) | `text-xl md:text-2xl font-semibold` | Consistent with coupon single view |
| **Invite** `app/invite/page.tsx` | `text-2xl sm:text-3xl font-bold`, `text-xl font-bold` (stat) | `text-lg sm:text-xl font-semibold`, `text-base font-semibold` | Title and reward value |
| **Leaderboard** `app/leaderboard/page.tsx` | `text-3xl sm:text-4xl font-bold` | `text-2xl sm:text-3xl font-semibold` | Hero title; can stay slightly larger |
| **ContentPage** `components/ContentPage.tsx` | `text-3xl font-bold` (generic content) | `text-xl md:text-2xl font-semibold` | Fallback content pages |
| **Not found** `app/not-found.tsx` | `text-2xl sm:text-3xl font-bold` | `text-lg sm:text-xl font-semibold` | 404 title |

---

## Home page (section titles)

| Location | Current | Suggested | Note |
|----------|---------|-----------|------|
| **Home** `app/page.tsx` | “How it works” / “Sports” `text-lg … md:text-2xl lg:text-3xl font-bold` | `text-base … md:text-lg font-semibold` | Softer section titles |
| | “Features” `text-2xl md:text-3xl font-bold` (section + card h3) | `text-lg md:text-xl font-semibold` | |
| **HomeFreeTipOfTheDay** | `text-lg … md:text-2xl font-bold` | `text-base md:text-lg font-semibold` | “Free Tip of the Day” |
| **HomePublicChatRooms** | `text-lg … lg:text-3xl font-bold` | `text-base … md:text-lg font-semibold` | Section title |
| **HomePopularEvents** | `text-lg … md:text-2xl font-bold` | `text-base md:text-lg font-semibold` | |
| **HomeStats** | `text-xl md:text-2xl font-bold` (stat value) | `text-lg font-semibold` | Optional |

---

## Intentionally unchanged

- **Admin** pages: kept larger/bold for clarity (Wallet Management, Users, Settings, etc.).
- **Home hero** (`HomeHero.tsx`): main hero headline stays large for impact.
- **Number-only emphasis** (e.g. step numbers 1–3 on home): can stay bolder for visual hierarchy.

---

## Summary

- **Same issue (single views):** Tipster profile, News article, Resource article.
- **Same issue (section/card titles):** FeaturedPicks, NewsWidget, Discover, Support, News list, coupon archive stats.
- **Soften for consistency:** Auth pages, static content, Wallet/Earnings/My Purchases stats, home section titles, 404/ContentPage.

Apply the same idea everywhere: **smaller size + `font-semibold` instead of `font-bold`** so titles sit in the same typographic scale as the rest of the UI.
