# Implementation Plan: Subscriptions, Push Notifications, In-App Purchases & ROI Guarantee

**Version:** 1.0.0  
**Created:** February 2026  
**Status:** Planning — Do not implement until approved

---

## Overview

This plan adds to BetRollover v2:

1. **Tipster Subscriptions** — Users subscribe to tipsters; view coupons in dashboard; escrow + ROI guarantee
2. **Push Notifications** — Web + Mobile (new coupon, subscription, renewal, etc.)
3. **In-App Purchases (IAP)** — Mobile wallet top-up via Apple/Google (Paystack remains for web)
4. **Coupon Placement** — Tipsters choose: Marketplace, Subscription, or Both
5. **ROI Guarantee** — Refund if tipster doesn’t reach target ROI during subscription period

**Principles:**
- All transactions use **wallet balance** (no change)
- Top-up options: **Paystack** (existing) + **IAP** (mobile)
- Subscription funds held in **escrow** until end of period
- **No breaking changes** to existing features

---

## Part 1 — Data Model & Schema Changes

### 1.1 New Tables (Migrations)

| Table | Purpose |
|-------|---------|
| `tipster_subscription_packages` | Tipster-defined subscription plans (price, duration, ROI guarantee threshold) |
| `subscriptions` | User subscriptions to tipster packages (active, cancelled, ended) |
| `subscription_escrow` | Escrow for subscription payments (similar to `escrow_funds` for picks) |
| `subscription_coupon_access` | Maps subscription → coupons subscriber can view |
| `push_devices` | Push token / device registration (web + mobile) |
| `in_app_purchases` | IAP receipt / product records (for wallet top-up) |
| `roi_guarantee_refunds` | Audit trail for ROI-based refunds |

### 1.2 Schema Detail

**tipster_subscription_packages**
- `id`, `tipster_user_id`, `name`, `price` (GHS/month or flat), `duration_days` (7, 30, 90, 365)
- `roi_guarantee_min` (e.g. -10 = refund if ROI below -10%), `roi_guarantee_enabled` (boolean)
- `status` (active, paused), `created_at`, `updated_at`

**subscriptions**
- `id`, `user_id`, `package_id`, `started_at`, `ends_at`, `status` (active, cancelled, ended, refunded)
- `amount_paid`, `escrow_id`, `created_at`, `updated_at`

**subscription_escrow**
- `id`, `subscription_id`, `amount`, `status` (held, released, refunded), `released_at`, `refund_reason`
- `created_at`, `updated_at`

**subscription_coupon_access**
- `subscription_id`, `accumulator_id` — junction for which coupons a subscription grants access to
- Created when tipster publishes coupon to subscription package

**push_devices**
- `id`, `user_id`, `platform` (web, ios, android), `token`, `device_name`, `last_used_at`
- `created_at`, `updated_at`

**in_app_purchases**
- `id`, `user_id`, `platform` (ios, android), `product_id`, `transaction_id`, `amount` (GHS credited)
- `receipt_data` (encrypted/stored for validation), `status`, `created_at`

### 1.3 Changes to Existing Tables

**pick_marketplace** (or new `pick_placements`)
- Add `placement` ENUM: `marketplace`, `subscription`, `both`
- If `subscription` or `both`: add `subscription_package_id` (nullable)
- Backward compatible: default `placement = 'marketplace'` for existing rows

**accumulator_tickets** (or `pick_marketplace` extended)
- `placement` column: `marketplace`, `subscription`, `both`
- `subscription_package_id` (nullable) — which tipster package this coupon belongs to

**escrow_funds** — keep as-is for marketplace pick purchases
- New `subscription_escrow` table for subscription payments (separate lifecycle)

---

## Part 2 — Feature Breakdown

### 2.1 Tipster Subscription Packages

**Backend**
- `POST /subscriptions/packages` — Tipster creates package (price, duration, ROI guarantee)
- `GET /subscriptions/packages` — List packages (by tipster or public)
- `PATCH /subscriptions/packages/:id` — Tipster updates package
- `GET /subscriptions/packages/:tipsterId` — Packages for a tipster

**Frontend**
- Tipster dashboard: “Create Subscription Package”
- Form: name, price (GHS), duration (monthly, quarterly, yearly), ROI guarantee % (optional)

**Enrichment**
- Multiple tiers per tipster (Basic / Premium)
- Trial period (e.g. 3 days free) — optional phase 2

---

### 2.2 User Subscriptions (Subscribe to Tipster)

**Flow**
1. User browses tipster profile → sees subscription packages
2. User clicks Subscribe → wallet debit (same as marketplace purchase)
3. Amount goes to `subscription_escrow`, `subscriptions` row created
4. User gains access to tipster’s subscription-only coupons in dashboard

**Backend**
- `POST /subscriptions/subscribe` — Body: `{ packageId }` — debit wallet, create subscription, create escrow
- `GET /subscriptions/me` — Current user’s subscriptions (active, ended)
- `POST /subscriptions/:id/cancel` — Cancel at period end (no immediate refund)
- `GET /subscriptions/:id/coupons` — Coupons included in this subscription

**Frontend**
- Tipster profile page: subscription packages + “Subscribe” button
- Dashboard: “My Subscriptions” section with subscribed tipsters + their coupons

**Enrichment**
- Renewal reminder (push + in-app) 3 days before end
- “Gift subscription” (phase 2)

---

### 2.3 Coupon Placement (Marketplace vs Subscription)

**Flow**
When tipster creates coupon:
1. Choose placement: **Marketplace** | **Subscription** | **Both**
2. If Subscription or Both: choose which package(s) to include
3. Coupon appears in marketplace and/or subscription feed based on placement

**Backend**
- Extend `CreateAccumulatorDto`: `placement`, `subscriptionPackageIds[]`
- `PickMarketplace` / listing logic: support `placement` and link to packages
- New: `subscription_coupon_access` — when coupon is “subscription” or “both”, insert rows for each package’s subscribers

**Frontend**
- Create Pick form: radio/checkboxes for placement
- If subscription: multi-select packages

---

### 2.4 Subscription Escrow & ROI Guarantee

**Escrow Lifecycle**
1. User subscribes → wallet debited → `subscription_escrow` row (status: held)
2. At `ends_at`:
   - Compute tipster ROI over subscription period (coupons that settled)
   - If `roi_guarantee_enabled` and ROI < `roi_guarantee_min`: **refund** user from escrow
   - Else: **release** escrow to tipster (credit wallet)

**Backend**
- Cron / scheduled job: `SubscriptionSettlementService.runPeriodEndSettlement()`
- For each subscription ending today:
  - Get tipster’s ROI for period (from predictions/picks)
  - If ROI below threshold → refund user, escrow status = refunded
  - Else → credit tipster, escrow status = released

**Enrichment**
- Admin override for disputed ROI calculations
- Notification to user: “You were refunded because [Tipster] didn’t meet ROI guarantee”
- Notification to tipster: “Your subscription period ended. Escrow released.” or “ROI below guarantee; user refunded.”

---

### 2.5 Push Notifications

**Web**
- Service Worker + Web Push API
- Backend: store `push_devices` with VAPID public key, send via web-push library
- Prompt: “Enable notifications” on dashboard/login

**Mobile**
- Expo Push Notifications (`expo-notifications`)
- Backend: store FCM/APNs token in `push_devices`
- Same backend service to send: `PushService.send(userId, payload)` — routes to web or mobile by platform

**Trigger Events**
- New coupon from subscribed tipster
- Subscription renewal reminder (3 days before)
- Subscription ended / refunded
- Pick settled (won/lost) — existing + extend to subscription
- Marketplace: new coupon from followed tipster (optional)

**Backend**
- `POST /notifications/push/register` — Register device/token
- `DELETE /notifications/push/register` — Unregister
- `PushService` — inject into NotificationService; call on create for high-priority types

**Enrichment**
- User preferences: which notification types to receive (in-app, push, email)
- Quiet hours (optional phase 2)

---

### 2.6 In-App Purchases (Wallet Top-Up)

**Scope**
- Mobile only (iOS + Android)
- Products: e.g. “10 GHS”, “50 GHS”, “100 GHS”, “200 GHS”
- On success → credit wallet, record in `in_app_purchases`

**Backend**
- `POST /wallet/iap/verify` — Receives receipt from client, validates with Apple/Google, credits wallet
- `GET /wallet/iap/products` — List product IDs and GHS amounts (for mobile UI)

**Mobile**
- Expo: use `expo-in-app-purchases` or EAS + native modules for StoreKit / Google Play Billing
- Flow: User selects product → platform purchase → send receipt to API → API verifies and credits

**Enrichment**
- Promo: “First IAP top-up bonus” (e.g. +5% GHS)
- Receipt validation with retry (Apple/Google can be flaky)

---

### 2.7 Wallet Top-Up Options (Consolidated)

| Channel | Platform | Status |
|---------|----------|--------|
| Paystack | Web + Mobile (webview or redirect) | Existing |
| In-App Purchase | iOS | New |
| In-App Purchase | Android | New |

**UX**
- “Add Funds” → Show: Paystack, (if mobile) “Add with Apple/Google”
- Wallet screen: same balance, multiple top-up methods

---

## Part 3 — Implementation Phases

### Phase 1: Foundation (Non-Breaking)
1. Migrations: `tipster_subscription_packages`, `subscriptions`, `subscription_escrow`, `subscription_coupon_access`
2. Extend `pick_marketplace` / accumulator creation: `placement`, `subscription_package_id`
3. Backend: SubscriptionPackage entity, Subscription entity, SubscriptionService (CRUD)
4. **No UI changes yet** — API only, feature-flagged

### Phase 2: Tipster Subscription Flow
1. Tipster dashboard: create/edit subscription packages
2. Tipster create coupon: placement (marketplace / subscription / both)
3. User subscribe: wallet debit → subscription + escrow
4. Dashboard: “My Subscriptions” + subscription coupons feed
5. Settlement cron: end-of-period escrow release/refund + ROI guarantee logic

### Phase 3: Push Notifications
1. `push_devices` table + PushService
2. Web: Service Worker, VAPID, register endpoint
3. Mobile: Expo Push, register endpoint
4. Wire NotificationService → PushService for subscription + settlement events
5. User notification preferences (optional)

### Phase 4: In-App Purchases
1. `in_app_purchases` table + IAP verification service
2. Apple: App Store Connect products, server-side receipt validation
3. Google: Play Console products, server-side purchase validation
4. Mobile: IAP flow + “Add Funds” with IAP option
5. Web: no change (Paystack only)

### Phase 5: Polish & Enrichment
1. ROI guarantee: admin override, dispute flow
2. Renewal reminders, gift subscriptions (optional)
3. Analytics: subscription revenue, ROI guarantee refund rate
4. Docs: App Store / Play Store IAP setup, Push setup

---

## Part 4 — Technical Notes

### 4.1 Escrow Separation
- **Marketplace escrow** (`escrow_funds`): tied to `pickId`; released/refunded on pick settlement
- **Subscription escrow** (`subscription_escrow`): tied to `subscription_id`; released/refunded at period end

### 4.2 ROI Calculation
- Period: `subscription.started_at` → `subscription.ends_at`
- Tipster’s coupons that settled in that window: compute (profit/loss) / total staked → ROI %
- Compare to `package.roi_guarantee_min` (e.g. -10 means refund if ROI &lt; -10%)

### 4.3 IAP Receipt Validation
- iOS: Apple Verify Receipt API (or App Store Server API v2)
- Android: Google Play Developer API — purchases.subscriptions or one-time products
- Validate server-side; never trust client-only

### 4.4 Existing Features to Preserve
- Marketplace purchase flow (wallet debit → escrow → settlement) — unchanged
- Paystack deposit — unchanged
- Notifications (in-app + email) — extend, don’t replace
- Wallet balance — single source of truth for all transactions

---

## Part 5 — Risk & Rollback

| Risk | Mitigation |
|------|------------|
| Migration breaks existing data | Defaults for new columns; migrations reversible |
| ROI calculation wrong | Log inputs; admin override; manual refund if needed |
| IAP validation failure | Retry; support fallback to Paystack |
| Push tokens invalid | Graceful failure; re-register on next login |

**Rollback:** Feature flags for subscriptions, push, IAP. Disable per-feature without reverting DB.

---

## Part 6 — Checklist Before Implementation

- [ ] Product/design sign-off on placement UI (Marketplace / Subscription / Both)
- [ ] ROI guarantee threshold rules (per package? global minimum?)
- [ ] IAP product IDs and pricing (GHS amounts)
- [ ] Apple + Google developer accounts for IAP
- [ ] VAPID keys for Web Push
- [ ] Expo push credentials (FCM, APNs)

---

## Part 7 — Best Practice Enrichments (World-Class Platform)

### 7.1 Subscription
- **Subscription calendar** — Dashboard widget showing renewal dates
- **Subscription analytics (tipster)** — Subscriber count, revenue, churn
- **Gift subscriptions** — Buy subscription for another user (phase 2)
- **Free trial** — 3–7 days free for first-time subscribers (phase 2)

### 7.2 Push Notifications
- **Preference center** — User chooses: new coupons, settlement, renewal, promo (opt-in)
- **Quiet hours** — Optional: no push 22:00–07:00 local time
- **Deep links** — Push opens specific coupon / subscription / wallet

### 7.3 In-App Purchases
- **First top-up bonus** — e.g. +5% GHS on first IAP
- **Receipt replay protection** — Store transaction_id to avoid double-credit
- **Server notification** — Apple/Google server callbacks for renewal/cancellation

### 7.4 Trust & Transparency
- **ROI guarantee disclosure** — Clear on subscription package page
- **Escrow status** — User sees “Funds held in escrow until [date]”
- **Refund audit** — `roi_guarantee_refunds` table for support

### 7.5 Analytics
- **Subscription funnel** — View package → Subscribe → Active
- **ROI guarantee refund rate** — Monitor for abuse / fairness
- **IAP vs Paystack top-up** — By platform, region

---

## Part 8 — API Endpoints Summary (New)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/subscriptions/packages` | Tipster: create package |
| GET | `/subscriptions/packages` | List packages |
| GET | `/subscriptions/packages/:tipsterId` | Packages by tipster |
| PATCH | `/subscriptions/packages/:id` | Tipster: update package |
| POST | `/subscriptions/subscribe` | User: subscribe (wallet debit) |
| GET | `/subscriptions/me` | User: my subscriptions |
| POST | `/subscriptions/:id/cancel` | User: cancel at period end |
| GET | `/subscriptions/:id/coupons` | User: coupons in subscription |
| POST | `/notifications/push/register` | Register push token |
| DELETE | `/notifications/push/register` | Unregister push token |
| POST | `/wallet/iap/verify` | Mobile: verify IAP receipt, credit wallet |
| GET | `/wallet/iap/products` | List IAP products (id, GHS amount) |

---

---

## Implementation Status (Updated)

### Completed
- **Phase 1:** Migrations 042, 043; entities; SubscriptionsModule; PickMarketplace.placement
- **Phase 2 (Backend):** Subscription packages CRUD; subscribe (wallet debit + escrow); subscription feed; ROI settlement cron; coupon placement (marketplace/subscription/both)
- **Phase 2 (Frontend):** Tipster package creation (/dashboard/subscription-packages); subscribe button on tipster profile; My Subscriptions (/subscriptions); placement dropdown in Create Pick; dashboard Quick Actions
- **Existing features:** Marketplace purchase, Paystack, wallet, notifications — unchanged

### Pending
- **Phase 3:** Push notifications (web + mobile)
- **Phase 4:** In-app purchases (wallet top-up)
- **Phase 5:** Polish, analytics, docs

### Run migrations
```bash
# Rebuild API and restart to run migrations
docker compose build api && docker compose up -d api
# Or: Admin → Settings → Database migrations → Run pending
```

---

**Next Step:** Frontend UI for subscriptions, then Phase 3 (Push).
