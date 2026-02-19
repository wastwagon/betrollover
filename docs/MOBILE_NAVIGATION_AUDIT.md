# BetRollover Mobile – Navigation & UX Audit

**Date:** 2025-02-19  
**Purpose:** Verify all UI pages exist, are linked, and menu flow provides good UX.

---

## 1. Screen Inventory

| # | Screen | Path | Auth Required | Header |
|---|--------|------|---------------|--------|
| 1 | Landing | `/` (index) | No | No |
| 2 | Login | `/login` | No | No |
| 3 | Register | `/register` | No | No |
| 4 | Forgot Password | `/forgot-password` | No | No |
| 5 | Verify Email | `/verify-email` | No* | Yes, back |
| 6 | Home (tabs) | `/(tabs)` or `/(tabs)/index` | Yes | No (tab bar) |
| 7 | Marketplace | `/(tabs)/marketplace` | Yes | No |
| 8 | Wallet | `/(tabs)/wallet` | Yes | No |
| 9 | Tipsters | `/(tabs)/tipsters` | Yes | No |
| 10 | Profile | `/(tabs)/profile` | Yes | No |
| 11 | Leaderboard | `/leaderboard` | No | Yes, back |
| 12 | My Picks | `/my-picks` | Yes | Yes, back + Create |
| 13 | My Purchases | `/my-purchases` | Yes | Yes, back |
| 14 | Subscriptions | `/subscriptions` | Yes | Yes, back |
| 15 | Notifications | `/notifications` | Yes | Yes, back |
| 16 | Tipster Profile | `/tipsters/[username]` | No* | Yes, back |

*Verify email: token can come from deep link. Tipster profile: public, but follow/purchase need auth.

---

## 2. Navigation Map

### Auth Flow (Logged Out)
```
/ (Landing)
├── Sign In → /login
├── Get Started → /register
└── (if token) → /(tabs)

/login
├── Forgot password? → /forgot-password
├── Register → /register
└── (success) → /(tabs)

/register
├── Sign In → /login
└── (success) → /(tabs)

/forgot-password
└── Back to Sign In → /login
```

### Main App Flow (Logged In)
```
/(tabs) [5 tabs: Home, Marketplace, Wallet, Tipsters, Profile]

Home (/(tabs)/index)
├── Marketplace → (tabs)/marketplace (same tab)
├── Wallet → (tabs)/wallet
├── My Picks → /my-picks (stack)
├── My Purchases → /my-purchases (stack)
├── Tipsters → (tabs)/tipsters
└── Leaderboard → /leaderboard (stack)

Marketplace
├── Purchase success → View in My Purchases link
├── Insufficient funds → Top Up → (tabs)/wallet
├── PickCard View (purchased) → /my-purchases
└── Empty → Browse Tipsters → (tabs)/tipsters

Tipsters
├── Leaderboard (header) → /leaderboard
├── TipsterCard tap → /tipsters/[username]
└── Empty → (tabs) home

Tipster Profile
├── Follow (needs auth) → /login if no token
├── Purchase pick → (needs wallet)
└── Empty picks → (tabs)/tipsters

Leaderboard
├── Entry tap → /tipsters/[username]
└── Empty → (tabs)/tipsters

Profile
├── Edit profile → Modal (inline)
├── Subscriptions → /subscriptions
├── Notifications → /notifications
├── Verify email banner → /verify-email
├── Terms → External URL
├── Privacy → External URL
└── Sign Out → /

My Picks
├── Create (header) → Web /create-pick
└── Empty → (tabs)/marketplace

My Purchases
└── Empty → (tabs)/marketplace

Subscriptions
└── Empty → (tabs)/tipsters

Notifications
└── Empty → (tabs) home

Verify Email
└── Success → (tabs)/profile
```

---

## 3. Link Verification

| From | To | Method | Status |
|------|-----|--------|--------|
| Landing | Login, Register | Link | ✅ |
| Login | Forgot password, Register | Link | ✅ |
| Login | (tabs) on success | router.replace | ✅ |
| Register | Login | Link | ✅ |
| Register | (tabs) on success | router.replace | ✅ |
| Forgot password | Login | Link | ✅ |
| Home | Marketplace, Wallet, My Picks, My Purchases, Tipsters, Leaderboard | router.push | ✅ |
| Marketplace | My Purchases (success), Wallet (insufficient), Tipsters (empty) | router.push, actionHref | ✅ |
| Tipsters | Leaderboard, Tipster profile | router.push, Link | ✅ |
| Tipster profile | Login (if no auth for follow) | router.push | ✅ |
| Leaderboard | Tipster profile | router.push | ✅ |
| Profile | Subscriptions, Notifications, Verify email | router.push | ✅ |
| Profile | Terms, Privacy | Linking.openURL | ✅ |
| My Picks | Marketplace (empty) | actionHref | ✅ |
| My Purchases | Marketplace (empty) | actionHref | ✅ |
| Subscriptions | Tipsters (empty) | actionHref | ✅ |
| Notifications | (tabs) (empty) | actionHref | ✅ |
| Verify email | Profile (success) | router.replace | ✅ |
| PickCard | Wallet (Top Up) | Link | ✅ |
| TipsterCard | Tipster profile | Link | ✅ |

---

## 4. UX Assessment

### Strengths
- **Clear tab structure:** 5 tabs (Home, Marketplace, Wallet, Tipsters, Profile) – standard pattern
- **Home as hub:** Quick actions to all main features
- **Auth guard:** Unauthenticated users redirected to login from protected screens
- **Back navigation:** Stack screens (My Picks, My Purchases, Leaderboard, etc.) have header with back
- **Empty states:** All lists have EmptyState with contextual CTAs
- **Cross-linking:** Marketplace ↔ My Purchases, Tipsters ↔ Leaderboard ↔ Tipster profile

### Gaps & Recommendations

| Issue | Severity | Recommendation |
|-------|----------|-----------------|
| **Landing has no link to Leaderboard** | Low | Leaderboard is public; consider adding "View Leaderboard" for logged-out users |
| **Home uses router.push for tabs** | Low | When already in tabs, `router.push('/(tabs)/marketplace')` works but may create duplicate stack entries; consider `router.replace` or tab switching |
| **Profile refresh after verify-email** | Medium | After verify-email success, user goes to Profile but banner may still show until refetch; Profile should refetch on focus |
| **No "Back to Home" from deep screens** | Low | Users can use device back; acceptable |
| **Create Pick opens web** | Info | By design; mobile create-pick not in scope |

### Tab Bar UX
- **5 tabs** – at the limit for mobile (iOS HIG suggests 3–5)
- **Icons + labels** – good for clarity
- **Active/inactive colors** – primary vs muted, clear

### Information Architecture
```
Landing (public)
  └── Auth → Tabs
        ├── Home (hub)
        ├── Marketplace (browse/buy)
        ├── Wallet (money)
        ├── Tipsters (discover)
        └── Profile (account)
              ├── Subscriptions
              ├── Notifications
              └── Verify email
```

---

## 5. Summary

**All 16 screens exist and are reachable.** Navigation links are wired correctly. The menu flow is coherent and follows common mobile patterns.

**Verdict:** Navigation and menu flow are in good shape. Minor improvements (Profile refetch on focus, optional Leaderboard link on landing) would polish the experience but are not required for launch.
