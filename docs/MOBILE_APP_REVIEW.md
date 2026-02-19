# BetRollover Mobile App – Review & Gap Analysis

**Purpose:** Compare the mobile app (Expo/React Native) with the web app to identify what's implemented, what's missing, and recommended enhancements.

---

## Current Mobile App Structure

| Screen | Path | Status |
|--------|------|--------|
| **Home** | `/` (index.tsx) | ✅ Landing with Sign In / Get Started |
| **Login** | `/login` | ✅ Email + password |
| **Register** | `/register` | ✅ Email OTP (2 steps), username, displayName, password |
| **Dashboard** | `/dashboard` | ⚠️ Minimal – welcome, role, Wallet button, Sign Out |
| **Wallet** | `/wallet` | ✅ Full – balance, deposit (Paystack), withdraw, payout methods, IAP, transactions |

**Tech:** Expo 50, React Native 0.73, expo-router, TanStack Query, AsyncStorage, expo-notifications

---

## Web vs Mobile Feature Comparison

### Auth

| Feature | Web | Mobile |
|---------|-----|--------|
| Login | ✅ | ✅ |
| Register (email OTP) | ✅ | ✅ |
| Forgot password | ✅ | ❌ |
| Verify email | ✅ | ❌ |
| Email verification banner | ✅ | ❌ |

### Core User Features

| Feature | Web | Mobile |
|---------|-----|--------|
| Dashboard (stats, feed, purchases) | ✅ Rich | ⚠️ Minimal |
| Wallet (deposit, withdraw, transactions) | ✅ | ✅ |
| Profile | ✅ | ❌ |
| Marketplace (browse picks, purchase) | ✅ | ❌ |
| My Picks | ✅ | ❌ |
| My Purchases | ✅ | ❌ |
| Create Pick (accumulator builder) | ✅ | ❌ |
| Tipsters list | ✅ | ❌ |
| Tipster profile | ✅ | ❌ |
| Leaderboard | ✅ | ❌ |
| Subscriptions | ✅ | ❌ |
| Notifications | ✅ | ❌ |

### Content & Info

| Feature | Web | Mobile |
|---------|-----|--------|
| News | ✅ | ❌ |
| Resources | ✅ | ❌ |
| Terms / Privacy / Contact | ✅ | ❌ (links in app.json only) |

### Admin

| Feature | Web | Mobile |
|---------|-----|--------|
| Admin dashboard | ✅ | ❌ (admin typically uses web) |

---

## What's Missing (Priority Order)

### High priority (core user flows)

1. **Marketplace** – Browse and purchase picks (main revenue flow)
2. **My Picks** – View created picks
3. **My Purchases** – View purchased picks
4. **Tipsters** – Browse tipsters, follow, view profiles
5. **Leaderboard** – Top tipsters

### Medium priority

6. **Create Pick** – Accumulator builder (complex; may defer)
7. **Subscriptions** – View subscriptions, subscription feed
8. **Profile** – Edit profile, avatar
9. **Forgot password** – Password reset flow
10. **Verify email** – Email verification flow + banner

### Lower priority

11. **Notifications** – In-app notification list (push already works)
12. **News** – News list/detail
13. **Resources** – Resources list
14. **Terms / Privacy** – In-app or deep link to web

---

## UX & Code Enhancements

### Navigation

- **No tab bar** – User must go Dashboard → Wallet → Back. Add bottom tabs: Home, Marketplace, Wallet, Profile.
- **No deep linking** – Consider `betrollover://` scheme for notifications, emails.

### Loading & Empty States

- **Dashboard:** "Loading..." text → add skeleton or spinner
- **Wallet:** "Loading..." text → add skeleton
- **Empty states:** Wallet transactions show "No transactions yet." – could use richer empty state

### Code Quality

- **API_BASE duplicated** – Same `API_BASE` logic in index, login, register, dashboard, wallet. Extract to `lib/api.ts` or `utils/config.ts`.
- **No shared components** – Web has LoadingSkeleton, EmptyState, PickCard. Mobile could share types via `@betrollover/shared-types` and add mobile equivalents.

### Design Consistency

- **Hardcoded colors** – `#DC2626`, `#fff`, `#666` etc. Web uses CSS variables. Consider a theme file for mobile.
- **No dark mode** – Web supports it; mobile could follow.

### Push Notifications

- **Already implemented** – Dashboard registers push token on login. ✅

---

## Recommended Implementation Phases

### Phase A – Quick wins (low risk)

1. Extract `API_BASE` to shared config
2. Add loading skeletons/spinners (consistent with web Phase 5)
3. Add Forgot password screen
4. Add bottom tab navigation (Home, Marketplace, Wallet, Profile)

### Phase B – Core feature parity

1. Marketplace screen (list picks, purchase)
2. My Picks screen
3. My Purchases screen
4. Tipsters list screen
5. Tipster profile screen
6. Leaderboard screen

### Phase C – Extended features

1. Create Pick (or link to web for complex builder)
2. Subscriptions
3. Profile
4. Notifications list
5. News / Resources

---

## Summary

| Metric | Count |
|--------|-------|
| Mobile screens | 5 |
| Web screens (user-facing) | ~25 |
| Feature parity | ~20% |
| High-priority gaps | 5 (Marketplace, My Picks, My Purchases, Tipsters, Leaderboard) |

The mobile app is a solid foundation (auth, wallet, push) but lacks the core tipster/marketplace experience. Prioritizing Marketplace, My Picks, My Purchases, Tipsters, and Leaderboard would bring mobile closest to web parity for typical users.
