# Mobile navigation redesign – no hamburger, native feel

**Goal:** Remove the hamburger menu on mobile and give the app a native mobile feel by using the **bottom nav** as primary navigation and **contextual “smart” buttons** on each parent page. No functionality is removed; everything is still reachable.

---

## Current state

- **UnifiedHeader:** On mobile it shows logo, slip cart, and a **hamburger** that opens a full dropdown (Home, Browse Coupons + sub-items + Sports, Tipsters + sub-items, Discover + sub-items, Dashboard, Create, Account/Login).
- **MobileBottomNav:** Fixed bottom bar (Home, Marketplace, Tipsters, Create coupon, Wallet on tablet, Dashboard). Only visible on mobile/tablet (`lg:hidden`).

So on mobile you have both: bottom nav + hamburger. The hamburger feels “web” and not native.

---

## Target state

1. **No hamburger on mobile** – Remove the slide-out / dropdown that opens from the hamburger icon.
2. **Primary mobile nav = bottom bar only** – Keep and rely on `MobileBottomNav` (Home, Marketplace, Tipsters, Create, Dashboard).
3. **Top bar (mobile):** Logo (→ Home), slip cart, and **one** compact action: **Account** (avatar or “Account” icon) that opens a small dropdown: Balance, Profile, Wallet, Sign out (and Login/Register if guest). No mega-menu, no Browse/Discover sections in the header.
4. **Contextual smart buttons on each page** – Put “the rest” of the links where they belong:
   - **Marketplace:** On the marketplace page: “Settled archive”, “Leaderboard”, and **sport chips** (Football, Basketball, etc.) as in-page buttons/chips.
   - **Tipsters:** On the tipsters page: “Leaderboard”, “Create coupon”, “My packages” (if signed in) as in-page buttons.
   - **Discover:** The `/discover` page already has News + Guides. Add a clear “More” section or second row of cards: Community, How it works, News, Guides, About, Contact, Responsible gambling, Terms, Privacy – so Discover is the single “everything else” hub with in-page links.
   - **Dashboard:** Already has its own nav (sidebar on desktop, cards/links on mobile). No change needed except ensure mobile view is clear.
   - **Home:** Optional “Quick links” strip: Marketplace, Tipsters, Discover, Leaderboard, Community (so key destinations are one tap from home).

5. **Desktop:** Unchanged – keep the existing mega-menus (Browse, Tipsters, Discover, Account) in the header for `lg:` and up.

---

## Safe implementation phases

### Phase 1 – Add contextual links (no removals) ✅ Done

- **Marketplace page:** Add a row below the header (or above filters): sport chips (Football, Basketball, …) + links “Settled archive” and “Leaderboard”. Same links as current hamburger “Browse” section.
- **Tipsters page:** Add a row of buttons/links: “Leaderboard”, “Create coupon”, “My packages” (if signed in).
- **Discover page:** Ensure one clear section “More” or “Explore” with: Community, How it works, About, Contact, Responsible gambling, Terms, Privacy (links already in hamburger Discover).
- **Home page (optional):** Add a “Quick links” or “Shortcuts” strip: Marketplace, Tipsters, Discover, Leaderboard, Community.

**Result:** Everything currently in the hamburger is now also available in context. No behaviour change yet; hamburger still there.

---

### Phase 2 – Replace hamburger with Account-only dropdown (mobile) ✅ Done

- On mobile (`lg:hidden`), **remove** the hamburger button and the full mobile menu panel.
- In the top bar (mobile), add an **Account** control:
  - If **signed in:** Avatar or account icon; click opens a small dropdown: Balance, Profile, Wallet, Earnings, My Picks, My Purchases, Notifications, Sign out.
  - If **guest:** “Login” and “Register” buttons (compact, e.g. text or small pills) in the header.
- Keep **desktop** header as is (mega-menus for Browse, Tipsters, Discover, Account).

**Result:** Mobile no longer uses a hamburger; primary nav is bottom bar + in-page smart buttons; account is in the top bar.

---

### Phase 3 – Polish and optional tweaks (optional)

- Ensure bottom nav “Dashboard” is visible and works as main account entry on mobile.
- Optional: Make the top-bar Account dropdown match your app’s style (e.g. sheet from bottom on mobile instead of dropdown).
- Remove any dead code or unused state (e.g. `mobileOpen`, `mobileSection`) from `UnifiedHeader`.

---

## What stays the same (no regressions)

- All routes and links remain (Marketplace, Tipsters, Leaderboard, Settled archive, Discover, News, Guides, Community, About, Contact, Terms, Privacy, Responsible gambling, Dashboard, Profile, Wallet, etc.).
- Desktop header and mega-menus unchanged.
- Bottom nav items and visibility unchanged.
- Slip cart, language, currency, notifications behaviour unchanged.
- Logged-in and guest flows both supported; only the way users reach each destination changes on mobile (contextual + account dropdown instead of hamburger).

---

## Files to touch (summary)

| Phase | Files |
|-------|--------|
| 1 | `web/app/marketplace/page.tsx`, `web/app/tipsters/page.tsx`, `web/app/discover/page.tsx`, optionally `web/app/page.tsx` |
| 2 | `web/components/UnifiedHeader.tsx` (mobile: remove hamburger + panel; add Account dropdown / Login–Register) |
| 3 | `web/components/UnifiedHeader.tsx` (cleanup), any small styling tweaks |

---

## Rollback

- Phase 1: Removing the added links/chips from each page restores previous behaviour.
- Phase 2: Re-adding the hamburger button and mobile menu in `UnifiedHeader` (from git history) restores the old mobile menu.

This keeps the site safe to deploy step by step; you can stop after Phase 1 and only proceed to Phase 2 when you’re happy with in-page navigation.
