# BetRollover Mobile App – Development Plan

**Purpose:** Phased development plan for world-class mobile UI/UX. Aligns with web design, Africa-focused UX, and betting/sports app best practices.

---

## Design Philosophy

### Core Principles (Research-Backed)

| Principle | Source | Application |
|-----------|--------|-------------|
| **Trust first** | Africa fintech UX | Clear security cues, real-time feedback, minimal friction |
| **Speed critical** | Betting apps | Sub-2s cold start, single-tap actions, skeleton loaders |
| **Simplicity** | Africa mobile | Large touch targets (44pt min), simple screens, progressive disclosure |
| **Low bandwidth** | Africa infra | Optimistic UI, cached avatars, minimal payloads |
| **Personalization** | 2024 UX | Tailored feed, smart notifications, "For You" sections |

### Visual Identity (Match Web)

The web app uses **Emerald + Amber** (trust, growth, action). Mobile will mirror this:

| Token | Value | Usage |
|-------|-------|-------|
| **Primary** | `#10b981` (Emerald-500) | Buttons, links, active states |
| **Primary Hover** | `#059669` (Emerald-600) | Pressed states |
| **Accent** | `#f59e0b` (Amber-500) | Badges, highlights, CTAs |
| **Background** | `#ffffff` / `#fafaf9` | Light mode |
| **Text** | `#0f172a` (Slate-900) | Primary text |
| **Text Muted** | `#64748b` (Slate-500) | Secondary |
| **Border** | `#e2e8f0` | Dividers, cards |
| **Success** | `#10b981` | Wins, deposits |
| **Error** | `#dc2626` | Losses, errors |

### Typography

- **Headings:** 24–28pt, semibold (large for Africa readability)
- **Body:** 16pt minimum (accessibility)
- **Captions:** 14pt, muted
- **Font:** System default (SF Pro / Roboto) for performance; or **DM Sans** to match web

### Touch Targets

- Minimum **44×44pt** for all interactive elements
- Generous padding (16–24pt) between tappable items
- Bottom tab bar: 5 tabs max, icons + labels

---

## Tech Stack Additions

| Addition | Purpose |
|----------|---------|
| **NativeWind v5** | Tailwind for RN – shared design tokens with web |
| **expo-router tabs** | Bottom tab navigation |
| **@expo/vector-icons** | Tab icons (Ionicons or similar) |
| **Shared `lib/api.ts`** | Single API base URL config |

---

## Phase Overview

| Phase | Focus | Est. Effort |
|-------|-------|-------------|
| **1** | Design system + foundation | 1–2 days |
| **2** | Navigation + auth polish | 1 day |
| **3** | Marketplace + picks | 2–3 days |
| **4** | Tipsters + leaderboard | 1–2 days |
| **5** | Profile + subscriptions | 1–2 days |
| **6** | Polish + extras | 1 day |

---

## Phase 1: Design System & Foundation

**Goal:** Establish shared design tokens, components, and API config. No new screens yet.

### 1.1 Styling Approach

**Note:** NativeWind v5 requires React 19; project uses React 18 (Expo 50). Using **theme-based StyleSheet** instead. Design tokens in `lib/theme.ts`; components use `StyleSheet.create` with theme values. Can migrate to NativeWind when upgrading Expo/React.

### 1.2 Create `lib/theme.ts`

```ts
export const colors = {
  primary: '#10b981',
  primaryHover: '#059669',
  primaryLight: '#d1fae5',
  accent: '#f59e0b',
  accentLight: '#fef3c7',
  bg: '#ffffff',
  bgWarm: '#fafaf9',
  card: '#ffffff',
  text: '#0f172a',
  textMuted: '#64748b',
  border: '#e2e8f0',
  success: '#10b981',
  error: '#dc2626',
};
```

### 1.3 Create `lib/api.ts`

```ts
export const API_BASE = `${(process.env.EXPO_PUBLIC_API_URL || 'http://localhost:6001').replace(/\/$/, '')}/api/v1`;
```

### 1.4 Create Shared Components

- `components/Button.tsx` – Primary, secondary, outline variants
- `components/Card.tsx` – Rounded card with shadow
- `components/LoadingSkeleton.tsx` – Mobile skeleton (3–4 placeholder cards)
- `components/EmptyState.tsx` – Icon, title, description, CTA

### 1.5 Deliverables

- [ ] NativeWind configured
- [ ] `lib/theme.ts`, `lib/api.ts`
- [ ] Button, Card, LoadingSkeleton, EmptyState components
- [ ] Replace hardcoded `API_BASE` in existing screens with `lib/api`

---

## Phase 2: Navigation & Auth Polish

**Goal:** Bottom tab bar, improved auth screens, forgot password.

### 2.1 Tab Layout

**Tabs (4–5):** Home | Marketplace | Wallet | Tipsters | Profile

- Icons: Home, Storefront, Wallet, People, Person
- Labels: Home, Marketplace, Wallet, Tipsters, Profile
- Active: filled icon + primary color
- Inactive: outline icon + muted

### 2.2 Auth Flow Updates

- **Home (logged out):** Hero, value prop, Sign In / Get Started
- **Home (logged in):** Redirect to tab layout or show feed
- **Forgot password:** New screen, email input → API → success message
- **Login/Register:** Use new Button, Card; improve spacing and typography

### 2.3 Deliverables

- [ ] `app/(tabs)/_layout.tsx` – Tab navigator
- [ ] `app/(tabs)/index.tsx` – Home/Feed
- [ ] `app/(tabs)/marketplace.tsx` – Placeholder
- [ ] `app/(tabs)/wallet.tsx` – Move existing wallet
- [ ] `app/(tabs)/tipsters.tsx` – Placeholder
- [ ] `app/(tabs)/profile.tsx` – Placeholder
- [ ] `app/forgot-password.tsx`
- [ ] Auth screens restyled with design system

---

## Phase 3: Marketplace & Picks

**Goal:** Browse marketplace, view picks, purchase. My Picks, My Purchases.

### 3.1 Marketplace Screen

- **Header:** Title, filters (price, sort)
- **List:** FlatList of PickCard components
- **PickCard:** Tipster avatar, title, odds, price, "Purchase" CTA
- **Pull-to-refresh**
- **Loading:** Skeleton cards
- **Empty:** EmptyState with "Browse Tipsters" CTA

### 3.2 Purchase Flow

- Tap Purchase → modal/sheet with wallet balance, confirm
- Success → toast + refresh
- Error → inline error message

### 3.3 My Picks Screen

- List of user's created picks
- Status, result, edit (if applicable)
- Empty: "Create Pick" → link to web or future Create Pick screen

### 3.4 My Purchases Screen

- List of purchased picks
- Status, result, live scores if active
- Empty: "Browse Marketplace"

### 3.5 Deliverables

- [ ] Marketplace with filters, list, purchase
- [ ] My Picks
- [ ] My Purchases
- [ ] PickCard component
- [ ] Purchase confirmation modal

---

## Phase 4: Tipsters & Leaderboard

**Goal:** Browse tipsters, follow, view profiles. Leaderboard.

### 4.1 Tipsters Screen

- Search bar
- Sort: ROI, Win Rate, Followers
- List: TipsterCard (avatar, name, stats, Follow button)
- Pull-to-refresh

### 4.2 Tipster Profile

- `app/tipsters/[username].tsx`
- Avatar, bio, stats (ROI, win rate, picks)
- Follow/Unfollow
- List of their marketplace picks

### 4.3 Leaderboard

- Period tabs: All Time | Monthly | Weekly
- Ranked list with avatar, name, ROI, picks count
- Tap → tipster profile

### 4.4 Deliverables

- [ ] Tipsters list with search, sort
- [ ] Tipster profile screen
- [ ] Leaderboard screen
- [ ] TipsterCard component

---

## Phase 5: Profile & Subscriptions

**Goal:** Profile edit, subscriptions, notifications.

### 5.1 Profile Screen

- Avatar (tap to change)
- Display name, username, email (read-only)
- Edit profile (display name, bio)
- Sign out
- Links: Terms, Privacy (open in browser)

### 5.2 Subscriptions

- Active subscriptions list
- Subscription feed (picks from subscribed tipsters)
- Empty: "Browse Tipsters" to subscribe

### 5.3 Notifications

- List of in-app notifications
- Mark read
- Empty: "No notifications yet"

### 5.4 Deliverables

- [ ] Profile screen with edit
- [ ] Subscriptions screen
- [ ] Notifications screen

---

## Phase 6: Polish & Extras

**Goal:** Loading states, empty states, deep links, verify email.

### 6.1 Loading & Empty States

- Replace all "Loading..." text with LoadingSkeleton
- Ensure all lists have EmptyState
- Pull-to-refresh where applicable

### 6.2 Verify Email

- Banner when `!user.emailVerifiedAt`
- Resend verification flow
- Verify screen (enter code from email)

### 6.3 Deep Linking

- `betrollover://` scheme for notifications
- Handle `betrollover://verify-email?token=...`

### 6.4 Performance

- Image optimization (expo-image)
- List virtualization (FlatList)
- Memoization where needed

### 6.5 Deliverables

- [ ] All loading/empty states
- [ ] Verify email flow
- [ ] Deep link handling
- [ ] Performance pass

---

## UI/UX Checklist (World-Class)

- [ ] **Speed:** Skeleton loaders, optimistic updates, <2s perceived load
- [ ] **Clarity:** Clear labels, no jargon, status always visible
- [ ] **Trust:** Security cues (lock icon, verified badge), real-time feedback
- [ ] **Accessibility:** 44pt touch targets, 16pt min font, contrast ratios
- [ ] **Africa-friendly:** Large fonts, simple flows, works offline where possible
- [ ] **Consistency:** Same colors, typography, spacing as web
- [ ] **Delight:** Subtle animations, haptic feedback on key actions

---

## File Structure (Target)

```
mobile/
├── app/
│   ├── (tabs)/
│   │   ├── _layout.tsx      # Tab bar
│   │   ├── index.tsx       # Home/Feed
│   │   ├── marketplace.tsx
│   │   ├── wallet.tsx
│   │   ├── tipsters.tsx
│   │   └── profile.tsx
│   ├── (auth)/
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── forgot-password.tsx
│   ├── tipsters/
│   │   └── [username].tsx
│   ├── leaderboard.tsx
│   ├── my-picks.tsx
│   ├── my-purchases.tsx
│   ├── subscriptions.tsx
│   ├── notifications.tsx
│   ├── verify-email.tsx
│   └── _layout.tsx
├── components/
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── PickCard.tsx
│   ├── TipsterCard.tsx
│   ├── LoadingSkeleton.tsx
│   └── EmptyState.tsx
├── lib/
│   ├── api.ts
│   └── theme.ts
└── hooks/
    └── useAuth.ts
```

---

## Next Step

**Start with Phase 1** – Design system and foundation. Once complete, Phase 2 (navigation + auth) will flow naturally.
