# Translation Implementation Review

**Date:** February 2026  
**Scope:** Tipster dashboard French translations (admin stays English)

---

## ✅ What's Done Well

### Fully Translated (Tipster-Facing)
- **Tipsters list** (`/tipsters`) — page header, filters, sort, empty state, toasts
- **Tipster profile** (`/tipsters/[username]`) — stats, tabs, subscription packages, coupons, toasts
- **TipsterCard** — ROI, Win Rate, Streak, Follow/Following, rank, follower count
- **Earnings** (`/earnings`) — all summary cards, transaction types, filters, chart, coupon stats
- **Create Pick** (`/create-pick`) — sport tabs, search hints, slip, form labels
- **My Picks** (`/my-picks`) — header, sport filters, empty states, coupon count
- **My Purchases** (`/my-purchases`) — header, result filters, sport chips, empty state
- **Wallet** (`/wallet`) — header, tagline, verify email, balance label, deposit button, withdraw section
- **Dashboard** (tipster section) — quick action cards, multi-sport banner, performance stats, followed tipsters, purchase summary, ROI/earnings badge

### Translation Keys
- ~800+ keys in `en.ts` and `fr.ts`
- Keys follow `section.key` convention (e.g. `dashboard.title`, `tipster.follow`)
- Interpolation supported: `t('key', { n: '5', name: 'John' })`

### Architecture
- `LanguageContext` with `useT()` hook
- Cookie `br_language` for persistence
- Fallback to English for missing keys

---

## ⚠️ Gaps — Tipster Dashboard (Should Be Translated)

### 1. Dashboard (`/dashboard`) — Tipster Section
| Location | Hardcoded String | Suggested Key |
|----------|------------------|---------------|
| ROI badge CTA | "Create Paid Pick" | `dashboard.create_paid_pick` |
| ROI badge CTA | "Marketplace" | `dashboard.marketplace` |
| ROI badge CTA | "Create Free Pick" | `dashboard.create_free_pick` |
| Recent Purchases | "Recent Purchases" | `dashboard.recent_purchases` |
| Recent Purchases | "View all" | `common.view_all` |
| Recent Purchases | "No purchases yet" | `my_purchases.no_purchases` |
| Recent Purchases | "Browse Marketplace" | `my_purchases.browse_marketplace` |
| Purchase status badges | "Active", "Won", "Lost" | `status.active`, `status.won`, `status.lost` |

### 2. My Purchases (`/my-purchases`)
| Location | Hardcoded String | Suggested Key |
|----------|------------------|---------------|
| Filtered empty state | "No picks match this filter" | `my_purchases.no_filter_match` |
| Filtered empty state | "Try selecting a different result or sport filter." | `my_purchases.no_filter_match_desc` |

### 3. Wallet (`/wallet`)
| Location | Hardcoded String | Suggested Key |
|----------|------------------|---------------|
| Deposit error | "Enter an amount between GHS 1 and GHS 10,000" | `wallet.deposit_range_error` |
| Withdraw error | "Enter an amount between GHS 5 and GHS 5,000" | `wallet.withdraw_range_error` |
| Payout form | "Account holder name", "Bank name", "Account number", "Wallet address" | `wallet.account_holder`, etc. |
| Withdraw section | "Amount to withdraw (min GHS 5)" | `wallet.withdraw_placeholder` |
| Withdraw button | "Processing...", "Withdrawal pending…", "Request Withdrawal" | `wallet.processing`, etc. |
| Withdrawal in progress | "Withdrawal in progress — " | `wallet.withdrawal_in_progress` |
| Payout options | "Mobile Money", "Bank Account", "Cryptocurrency" | `wallet.mobile_money`, etc. |

### 4. PickCard Component
Used on marketplace, my-picks, tipster profile, dashboard feed. Hardcoded:
- "Following" / "Follow" (already in TipsterCard; PickCard has its own)
- "Tipster" fallback
- "picks" / "odds" labels
- "bought" (e.g. "5 bought")
- "Created: {date}"
- Status display: "won", "lost", "active", "pending_approval" (uses `displayStatus.replace(/_/g, ' ')` — not translated)

### 5. Profile (`/profile`)
**Not translated.** Tipster-facing. Strings: "Profile", "Display name", "Phone", "Save", "Change password", "Profile updated.", etc.

### 6. Support (`/support`)
**Not translated.** Tipster-facing. Strings: "Support & Disputes", "New Ticket", "General Question", "Dispute / Complaint", etc.

### 7. Notifications (`/notifications`)
**Not translated.** Tipster-facing. Strings: "Notifications", "Mark all read", "Just now", "5m ago", "Browse Marketplace", etc.

### 8. Invite (`/invite`)
**Not translated.** Tipster-facing. Strings: "Invite & Earn", "Grow Together", "Copy", "✓ Copied!", share text, etc.

### 9. Subscription Packages (`/dashboard/subscription-packages`)
**Not translated.** Tipster-facing. Strings: "Subscription Packages", "Create Package", form labels, etc.

### 10. Leaderboard (`/leaderboard`)
Uses `useT()` — verify all strings are wired.

### 11. Community (`/community`)
Uses `useT()` — verify all strings are wired.

### 12. Create Pick — Sport-Specific Empty States
Many hardcoded strings per sport:
- "Loading basketball games…"
- "No upcoming basketball games with odds"
- "Basketball data syncs daily. Odds become available shortly after events are synced."
- "No games match your filters"
- Similar for rugby, MMA, volleyball, etc.

### 13. Create Pick — Error Messages
- "Odds not available from bookmakers yet..."
- "You already have a selection for this match..."
- "Add at least one selection"
- "Enter a title"
- "Pick created successfully!"

---

## 🔧 Technical Notes

### my_picks.coupons_count
Current logic: `filtered.length === 1 ? t('my_picks.coupons_count', { n: '1' }) : t('my_picks.coupons_count_plural', { n: String(filtered.length) })`  
Both keys use `{n}` — e.g. "1 coupon" vs "5 coupons". Correct.

### Dashboard "follow_tipsters" Link
The text "Follow tipsters to see their latest picks here." is split: the link says "Follow more tipsters" but the sentence structure may be awkward. Current:  
`<Link>Follow more tipsters</Link> {t('dashboard.follow_tipsters')}`  
`dashboard.follow_tipsters` = "to see their latest picks here." — works.

### PickCard and LanguageContext
PickCard does **not** use `useT()`. It has hardcoded "Following", "Follow", "Tipster", "picks", "odds", "bought", "Created:". Adding `useT()` would require passing `t` or using the hook inside the component.

---

## 📋 Priority Fixes (Tipster French Completeness)

**High (visible on every tipster session):**
1. Dashboard — "Create Paid Pick", "Create Free Pick", "Marketplace", "Recent Purchases", "View all", "No purchases yet", "Browse Marketplace", status badges
2. PickCard — "Following", "Follow", "bought", status labels

**Medium (frequently used):**
3. Wallet — error messages, placeholders, withdraw button states
4. My Purchases — filtered empty state
5. Profile — all strings

**Lower (less frequent):**
6. Support, Notifications, Invite, Subscription Packages
7. Create Pick — sport-specific empty states and errors

---

## ✅ Admin Dashboard — Correctly Left in English

Admin routes (`/admin/*`) are intentionally not translated. Admin sidebar, stats, quick actions, etc. remain in English.

---

## Summary

| Area | Status | Notes |
|------|--------|-------|
| Tipsters list & profile | ✅ Complete | |
| TipsterCard | ✅ Complete | |
| Earnings | ✅ Complete | |
| Create Pick (main) | ✅ Complete | Sport-specific states not done |
| My Picks | ✅ Complete | |
| My Purchases | ⚠️ Partial | Filtered empty state missing |
| Wallet | ⚠️ Partial | Errors, placeholders, withdraw UI |
| Dashboard (tipster) | ⚠️ Partial | ROI CTA, Recent Purchases section |
| PickCard | ❌ Not translated | Shared component |
| Profile | ❌ Not translated | |
| Support | ❌ Not translated | |
| Notifications | ❌ Not translated | |
| Invite | ❌ Not translated | |
| Subscription Packages | ❌ Not translated | |
