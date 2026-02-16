# BetRollover v2 – Full Implementation Plan

**Created:** Feb 2026  
**Scope:** All missing features + world-class premium homepage

---

## Overview

This plan covers implementation of all missing platform features identified in the platform review, plus a premium homepage redesign. Work is organized into phases with clear deliverables.

---

## Phase 1: Admin Management (Priority: High)

### 1.1 Admin Users Page

**Current:** Placeholder "coming soon"  
**Target:** Full user management

| Task | Backend | Frontend |
|------|---------|----------|
| List users | `GET /admin/users?role=&status=&search=` | Table with search, filters |
| Update role | `PATCH /admin/users/:id` body: `{ role }` | Dropdown per row |
| Update status | `PATCH /admin/users/:id` body: `{ status }` | Suspend/activate buttons |
| Pagination | Query params `page`, `limit` | Pagination controls |

**API spec:**
```
GET  /admin/users?role=tipster&status=active&search=john&page=1&limit=20
PATCH /admin/users/:id { role: 'tipster' | 'user' | 'admin', status?: 'active' | 'suspended' }
```

**UI:** Table columns: ID, Email, Display Name, Role, Status, Joined, Actions (Change Role, Suspend)

---

### 1.2 Admin Escrow Page

**Current:** Placeholder  
**Target:** View held escrow funds

| Task | Backend | Frontend |
|------|---------|----------|
| List escrow | `GET /admin/escrow` | Table of held funds |
| Show details | Include user, pick, amount, status | Expandable rows |

**API spec:**
```
GET /admin/escrow
Response: [{ id, userId, pickId, amount, status, createdAt, user: { email }, pick: { title } }]
```

**UI:** Table: User, Pick, Amount (GHS), Status, Date. Filter by status (held/released/refunded).

---

### 1.3 Admin Wallet Page

**Current:** Placeholder  
**Target:** View wallets and transactions

| Task | Backend | Frontend |
|------|---------|----------|
| List wallets | `GET /admin/wallets` | Table with balance |
| List transactions | `GET /admin/wallet-transactions?userId=&type=` | Transaction log |

**API spec:**
```
GET /admin/wallets
GET /admin/wallet-transactions?userId=1&type=purchase&limit=50
```

**UI:** Tabs: Wallets (user, balance, status) | Transactions (user, type, amount, date, ref).

---

### 1.4 Admin Settings Page

**Current:** Placeholder  
**Target:** Platform configuration (read-only for MVP)

| Task | Backend | Frontend |
|------|---------|----------|
| Platform info | `GET /admin/settings` (env-derived, no secrets) | Display only |
| API status | Check API_SPORTS_KEY configured | Badge: Configured / Not set |

**UI:** Cards: API-Sports Status, Currency (GHS), Country (Ghana), Support Email. Future: editable settings.

---

## Phase 2: User Experience (Priority: High)

### 2.1 My Purchases Page

**Current:** Missing  
**Target:** List picks the user has purchased

| Task | Backend | Frontend |
|------|---------|----------|
| List purchased | `GET /accumulators/purchased` or `GET /users/me/purchases` | Card list |
| Show pick detail | Reuse accumulator detail | Link to view |

**API spec:**
```
GET /accumulators/purchased (or /users/me/purchases)
Response: [{ accumulatorId, purchasePrice, purchasedAt, pick: { title, picks, status, result } }]
```

**UI:** Same PickCard component, status badges (pending/won/lost). Add to AppShell nav.

---

### 2.2 Wallet in Header

**Current:** Missing  
**Target:** Show balance in nav for logged-in users

| Task | Backend | Frontend |
|------|---------|----------|
| Balance | `GET /wallet/balance` (exists) | Fetch on layout, display in header |
| Link | — | Link to `/wallet` or modal |

**UI:** "GHS 0.00" badge in AppShell header. Click → Wallet page or deposit CTA.

---

### 2.3 Wallet Page (User)

**Current:** No user-facing wallet page  
**Target:** Balance, transactions, deposit CTA

| Task | Backend | Frontend |
|------|---------|----------|
| Transactions | `GET /wallet/transactions` | List with type, amount, date |
| Deposit | Placeholder / Paystack integration later | "Deposit" button → coming soon |

**API spec:**
```
GET /wallet/transactions?limit=20
Response: [{ id, type, amount, status, description, createdAt }]
```

**UI:** Balance card, transaction list, "Deposit" button (disabled or "Coming soon").

---

### 2.4 Profile / Account Page

**Current:** Missing  
**Target:** View and edit profile

| Task | Backend | Frontend |
|------|---------|----------|
| Get profile | `GET /users/me` (exists) | Profile form |
| Update profile | `PATCH /users/me` body: `{ displayName, email?, phone? }` | Form submit |
| Change password | `POST /auth/change-password` | Separate form |

**API spec:**
```
PATCH /users/me { displayName, phone }
POST /auth/change-password { currentPassword, newPassword }
```

**UI:** Profile page at `/profile`. Form: Display Name, Email (read-only), Phone. Change password section.

---

## Phase 3: Role & Tipster (Priority: Medium)

### 3.1 Tipster Dashboard

**Current:** Same as user  
**Target:** Tipster-specific stats and actions

| Task | Backend | Frontend |
|------|---------|----------|
| Tipster stats | `GET /users/me/stats` or `GET /tipster/stats` | Win rate, ROI, total picks, earnings |
| Different layout | — | Stats cards + Create Pick prominent |

**API spec:**
```
GET /tipster/stats
Response: { totalPicks, wonPicks, lostPicks, winRate, totalEarnings, roi }
```

**UI:** When role=tipster, dashboard shows: Win Rate %, ROI %, Picks Won/Lost, Earnings (GHS). Larger Create Pick CTA.

---

### 3.2 Role Upgrade Flow

**Current:** Admin must manually update DB  
**Target:** User can request tipster; admin approves

| Task | Backend | Frontend |
|------|---------|----------|
| Request tipster | `POST /users/me/request-tipster` | Button on dashboard |
| Admin approve | `POST /admin/users/:id/approve-tipster` | In Admin Users page |
| Optional: tipster_requests table | Store pending requests | — |

**Simpler MVP:** Admin Users page has "Set as Tipster" button. No request flow.

---

### 3.3 Restrict Create Pick to Tipsters (Optional)

**Current:** All users can create picks  
**Target:** Only tipsters (or users who requested)

| Task | Backend | Frontend |
|------|---------|----------|
| Guard | Check role=tipster on POST /accumulators | Hide Create Pick for non-tipsters |
| CTA | — | "Become a Tipster" → request flow or contact |

---

## Phase 4: Notifications (Priority: Low)

### 4.1 Notifications System

**Current:** Schema exists (`notifications` table)  
**Target:** Basic in-app notifications

| Task | Backend | Frontend |
|------|---------|----------|
| List | `GET /notifications` | Bell icon + dropdown |
| Mark read | `PATCH /notifications/:id/read` | On click |
| Create on events | Service: purchase, approval, settlement | — |

**UI:** Bell icon in header. Dropdown with recent 5. "View all" → `/notifications`.

---

## Phase 5: Premium Homepage (Priority: High)

### 5.1 World-Class Homepage Redesign

**Current:** Minimal hero + 2 CTAs + footer  
**Target:** Premium, conversion-focused landing

#### Sections to Add

| Section | Content | Reference |
|---------|---------|-----------|
| **Hero** | Strong headline, subhead, primary CTA, trust badge (e.g. "8M+ tips verified") | Tipstrr, Stripe |
| **Social proof** | Stats bar: Tipsters, Tips, Win Rate, Users | Tipstrr |
| **How it works** | 3–4 steps: Browse → Pick → Purchase → Win | Clean icons, short copy |
| **Features** | Escrow protection, Verified tips, Free + Premium, Mobile-first | Icon grid |
| **Popular picks** | 3–4 sample picks (or "Featured" from API) | Tipstrr |
| **Testimonials** | 2–3 quotes (can be placeholder) | Social proof |
| **CTA block** | Final sign-up prompt | Conversion |
| **Footer** | Links: About, Terms, Privacy, Contact, Social | Standard |

#### Design Direction

- **Typography:** DM Sans (already in use), consider display font for hero
- **Colors:** Primary red, dark sections for contrast, subtle gradients
- **Layout:** Full-width sections, max-width content, generous spacing
- **Animations:** Subtle fade-in on scroll, hover states
- **Mobile:** Stack sections, touch-friendly CTAs

#### Technical

- Keep client components minimal; use `'use client'` only where needed
- Lazy-load below-fold sections if needed
- Ensure Core Web Vitals (LCP, CLS, FID)

---

## Phase 6: Polish & Consistency (Priority: Medium)

### 6.1 Design Consistency

| Task | Scope |
|------|-------|
| Admin placeholder pages | Apply design tokens (var(--bg), var(--card), etc.) |
| Role guard | Redirect non-admin from /admin/* |
| 404 page | Custom not-found page |
| Error boundaries | Graceful error handling |

### 6.2 Nav Updates

| Location | Add |
|----------|-----|
| AppShell | My Purchases, Wallet (or Profile) |
| AppShell header | Wallet balance badge |
| Admin sidebar | — (complete) |

---

## Implementation Order Summary

| Phase | Focus | Est. Effort |
|-------|-------|-------------|
| **1** | Admin Users, Escrow, Wallet, Settings | 2–3 days |
| **2** | My Purchases, Wallet page, Profile | 1–2 days |
| **3** | Tipster dashboard, role flow | 1 day |
| **4** | Notifications | 0.5–1 day |
| **5** | Premium homepage | 1–2 days |
| **6** | Polish, consistency | 0.5 day |

**Total:** ~6–10 days

---

## File Structure (New/Modified)

```
backend/src/modules/
├── admin/
│   ├── admin.controller.ts   # + GET users, escrow, wallets, transactions, settings
│   └── admin.service.ts      # + listUsers, updateUser, getEscrow, getWallets, etc.
├── users/
│   └── users.controller.ts   # + PATCH me, GET me/stats (tipster)
├── auth/
│   └── auth.controller.ts    # + POST change-password
├── wallet/
│   └── wallet.controller.ts # + GET transactions
└── accumulators/
    └── accumulators.service.ts # + getPurchased(userId)

web/app/
├── page.tsx                  # Full redesign (Phase 5)
├── admin/
│   ├── users/page.tsx        # Implement
│   ├── escrow/page.tsx       # Implement
│   ├── wallet/page.tsx       # Implement
│   └── settings/page.tsx     # Implement
├── my-purchases/page.tsx     # New
├── wallet/page.tsx           # New (user)
├── profile/page.tsx         # New
└── notifications/page.tsx    # New (Phase 4)

web/components/
├── AppShell.tsx              # + balance badge, My Purchases nav
└── HomePage/                 # New: Hero, Features, HowItWorks, etc. (optional components)
```

---

## API Endpoints Summary (New)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/admin/users` | List users (paginated, filtered) |
| PATCH | `/admin/users/:id` | Update role/status |
| GET | `/admin/escrow` | List escrow funds |
| GET | `/admin/wallets` | List wallets |
| GET | `/admin/wallet-transactions` | List transactions |
| GET | `/admin/settings` | Platform config (safe) |
| GET | `/accumulators/purchased` | User's purchased picks |
| GET | `/wallet/transactions` | User's transactions |
| PATCH | `/users/me` | Update profile |
| POST | `/auth/change-password` | Change password |
| GET | `/tipster/stats` | Tipster stats (win rate, ROI) |
| GET | `/notifications` | User notifications |
| PATCH | `/notifications/:id/read` | Mark read |

---

## Homepage Section Spec (Phase 5)

### Hero
- Headline: "Your Shield Against Losses"
- Subhead: "Verified football tips with escrow protection. Win or get your money back."
- Primary CTA: "Get Started Free"
- Secondary: "Sign In"
- Optional: Animated gradient or subtle pattern background

### Stats Bar
- 4 stats: e.g. "50+ Tipsters", "1,000+ Tips", "85% Win Rate", "GHS 50K+ Paid Out"
- Source: Aggregate from DB or placeholder

### How It Works
1. **Browse** – Explore verified tips from top tipsters  
2. **Pick** – Choose free or premium picks  
3. **Purchase** – Secure payment, funds held in escrow  
4. **Win** – Get paid when tips win; refund if they lose  

### Features Grid
- Escrow protection  
- Verified track records  
- Free & premium tips  
- Mobile-first  

### CTA
- "Join thousands of smart bettors. Create your free account."
- Button: Get Started

---

*Next: Start with Phase 1 (Admin) or Phase 5 (Homepage) based on priority.*
