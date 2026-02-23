# BetRollover — Project Unification Flow Review

**Purpose:** Review entire project structure, feature flows, communication, triggers, automations, and syncs for consistency and deployment readiness.  
**Date:** February 2026

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EXTERNAL TRIGGERS                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  Paystack Webhook  │  API-Sports (Football)  │  The Odds API (7 sports)    │
│  POST /wallet/paystack-webhook  │  fixtures, odds, leagues  │  events, odds  │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BACKEND (NestJS)                                     │
│  ├── Cron Jobs (FixtureScheduler, per-sport syncs, news, settlement)        │
│  ├── Admin Triggers (manual sync, settlement, predictions)                   │
│  ├── Settlement Service (football + non-football)                           │
│  └── NotificationsService (central hub for user notifications)             │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
┌───────────────────────┐  ┌───────────────────────┐  ┌───────────────────────┐
│   WEB (Next.js)       │  │   MOBILE (Expo)         │  │   PostgreSQL + Redis  │
│   getApiUrl()         │  │   API_BASE              │  │   fixtures, sport_   │
│   /api/backend proxy  │  │   EXPO_PUBLIC_API_URL   │  │   events, users, etc. │
└───────────────────────┘  └───────────────────────┘  └───────────────────────┘
```

---

## 2. Sync & Automation Matrix

### 2.1 Football (API-Sports)

| Job | Schedule | Service | Trigger | Notes |
|-----|----------|---------|---------|-------|
| Live fixture update | Every 5 min | `FixtureSchedulerService` | Cron | → SettlementService.checkAndSettleAccumulators |
| Finished fixture update | Every 5 min | `FixtureSchedulerService` | Cron | → SettlementService.checkAndSettleAccumulators |
| Daily fixture sync | 12 AM | `FixtureSchedulerService` | Cron | FootballSyncService.sync() — 7 days ahead. Skipped if ENABLE_FOOTBALL_SYNC=false |
| Odds sync | Every 2h | `FixtureSchedulerService` | Cron | Up to 100 fixtures without odds |
| Odds force refresh | 1 AM | `FixtureSchedulerService` | Cron | Re-sync 50 soonest fixtures |
| Prediction generation | 1 AM | `FixtureSchedulerService` | Cron | AI tipsters — ready before 4–5 AM fixtures |
| Prediction catch-up | 2 AM | `FixtureSchedulerService` | Cron | If no predictions for today |
| Fixture archive | 2 AM | `FixtureSchedulerService` | Cron | Move 90+ day fixtures to archive |
| Periodic settlement | Every 30 min | `FixtureSchedulerService` | Cron | SettlementService.runSettlement |

**Manual triggers:** Admin → Fixtures (sync leagues, sync odds, fetch results)

### 2.2 Non-Football Sports (The Odds API)

| Sport | Schedule | Service | Trigger |
|-------|----------|---------|---------|
| Basketball | 12:15 AM | `BasketballSyncService` | Cron |
| Rugby | 12:20 AM | `RugbySyncService` | Cron |
| MMA | 12:25 AM | `MmaSyncService` | Cron |
| Volleyball | 12:35 AM | `VolleyballSyncService` | Cron (API-Sports) |
| Hockey | 12:40 AM | `HockeySyncService` | Cron |
| American Football | 12:45 AM | `AmericanFootballSyncService` | Cron |
| Tennis | 12:50 AM | `TennisSyncService` | Cron |

**Manual triggers:** Admin → Sports → Sync All Sports (`POST /admin/sport-sync/all` or per-sport)

### 2.3 Non-Football Settlement

| Job | Schedule | Service | Notes |
|-----|----------|---------|-------|
| Odds API settlement | Every 4h | `OddsApiSettlementService` | Settles sport_events (all non-football) |

### 2.4 News & Content

| Job | Schedule | Service | Notes |
|-----|----------|---------|-------|
| Transfers sync | 12:55 AM | `TransfersSyncService` | API-Sports transfers |
| Injuries sync | 1:05 AM | `InjuriesSyncService` | API-Sports injuries |

**Manual triggers:** Admin → News → Sync Transfers / Sync Injuries

### 2.5 Subscriptions & Health

| Job | Schedule | Service | Notes |
|-----|----------|---------|-------|
| Subscription settlement | 3:00 AM | `SubscriptionSettlementService` | ROI guarantee, refunds |
| Sync health check | Every hour :05 | `SyncHealthService` | Notifies admins if sport stale >25h |

### 2.6 Result Tracker (Predictions)

| Job | Schedule | Service | Notes |
|-----|----------|---------|-------|
| Result sync | Every 5 min | `ResultTrackerService` | Updates prediction fixture results |
| Daily snapshot | 0:00, 6:00, 12:00, 18:30 | `ResultTrackerService` | Leaderboard snapshots |
| Daily cleanup | 11:00 PM | `ResultTrackerService` | Archive old predictions |

---

## 3. Feature Flow Unification

### 3.1 Create Pick Flow

```
User → /create-pick (web) or mobile
  → Select sport (football | basketball | rugby | mma | volleyball | hockey | american_football | tennis)
  → Football: fixtures from fixtures table (API-Sports)
  → Others: events from sport_events table (Odds API)
  → POST /accumulators (create)
  → accumulator_tickets + accumulator_picks + pick_marketplace (if marketplace)
  → Escrow created if price > 0
```

**Unification:** Single `sport` column on picks/tickets; `fixture_id` OR `event_id` per pick.

### 3.2 Purchase Flow

```
User → /marketplace (browse)
  → GET /accumulators/marketplace
  → Filter by sport, price, tipster
  → POST /accumulators/:id/purchase
  → WalletService.credit (deduct) + Escrow (hold)
  → UserPurchasedPicks + notification
  → Redirect /my-purchases
```

### 3.3 Settlement Flow (Unified)

```
Football:
  FixtureUpdateService (live/finished) → SettlementService.checkAndSettleAccumulators
  OR FixtureSchedulerService.handlePeriodicSettlement (every 30 min)

Non-Football:
  OddsApiSettlementService (every 4h) → settles sport_events with status FT

On settlement:
  - Pick result: won | lost | void
  - Ticket result: won | lost | void
  - If marketplace + price > 0: settle escrow (payout tipster or refund buyer)
  - NotificationsService.create (coupon_won, coupon_lost, etc.)
```

### 3.4 Wallet Flow

```
Deposit: User → Paystack → Webhook (POST /wallet/paystack-webhook)
  → verifyWebhookSignature → credit wallet → notification

Withdrawal: User → request → Admin → Paystack transfer → notification

IAP: Mobile → verify receipt → credit → notification
```

---

## 4. Communication & Linking

### 4.1 API → Web / Mobile

| Client | Base URL | Config |
|--------|---------|-------|
| Web | `getApiUrl()` → `/api/v1` or `NEXT_PUBLIC_API_URL/api/v1` | `site-config.ts` |
| Mobile | `API_BASE` → `EXPO_PUBLIC_API_URL/api/v1` | `mobile/lib/api.ts` |
| Web proxy | `/api/backend` → `BACKEND_URL` (internal) | `next.config.js` rewrites |

**Unification:** Both use `/api/v1` prefix. Web can proxy via Next.js when API is same-origin.

### 4.2 Web ↔ Mobile Deep Links

| Mobile | Web URL | Notes |
|--------|---------|-------|
| `WEB_URL` | `EXPO_PUBLIC_WEB_URL` or derived from API | Create pick, etc. |
| Invite | `/invite?ref=CODE` | Referral flow |

### 4.3 Navigation Links (Web)

| Section | Links | Consistency |
|---------|-------|-------------|
| UnifiedHeader | Home, Browse (marketplace, coupons, leaderboard, tipsters), Discover (news, resources, community, about, how-it-works), Dashboard, Create Coupon | ✅ All sports in SPORTS array |
| Marketplace | `/marketplace?sport=X` | ✅ 8 sports |
| Create Pick | Sport tabs → same 8 sports | ✅ |
| Tipsters | `/tipsters`, `/tipsters/[username]` | ✅ |

### 4.4 Notification Triggers

| Event | Source | Notification Type |
|-------|--------|-------------------|
| Deposit success | WalletService | `deposit_success` |
| Withdrawal approved | AdminService | `withdrawal_approved` |
| Coupon purchased | AccumulatorsService | `coupon_purchased` |
| Coupon won/lost | SettlementService | `coupon_won`, `coupon_lost` |
| Tipster approved | AdminService | `tipster_approved` |
| Support ticket reply | AdminService | (system) |
| Sync health warning | SyncHealthService | `system` (Sport Sync Health Warning) |
| IAP credit | WalletIapService | `deposit_success` |
| Follow | TipsterFollowService | `tipster_follow` |
| Result prediction | ResultTrackerService | (prediction result) |

---

## 5. Triggers Summary

### 5.1 External (Webhooks)

| Event | Endpoint | Verification |
|-------|----------|--------------|
| Paystack payment | `POST /wallet/paystack-webhook` | HMAC-SHA512 signature |

### 5.2 Cron (Automatic)

| Category | Count | ENABLE_SCHEDULING |
|----------|-------|-------------------|
| Football fixtures/odds | 6 jobs | `true` required |
| Non-football sync | 7 jobs (one per sport) | Always |
| Settlement | 3 (football + 30min periodic + Odds API) | Football: yes |
| News | 2 | Always |
| Subscriptions | 1 | Always |
| Sync health | 1 | Always |
| Result tracker | 3 | Always |

### 5.3 Admin (Manual)

| Action | Endpoint | Page |
|--------|----------|------|
| Sync football fixtures | (Fixtures page) | Admin → Fixtures |
| Sync football odds | POST /fixtures/sync/odds | Admin → Fixtures |
| Sync football results | (Fixtures page) | Admin → Fixtures |
| Sync sport (each) | POST /admin/sport-sync/:sport | Admin → Sports |
| Sync all sports | (calls each in sequence) | Admin → Sports |
| Run settlement | POST /admin/settlement/run | Admin |
| Generate predictions | POST /admin/predictions/generate | Admin → AI Predictions |
| Sync predictions to marketplace | POST /admin/predictions/sync-to-marketplace | Admin |
| Sync news (transfers) | POST /admin/news/sync | Admin → News |
| Sync injuries | POST /admin/news/sync/injuries | Admin → News |
| Sync sport results | POST /admin/sport-sync/results | Admin → Sports |

---

## 6. Gaps & Inconsistencies

### 6.1 Schedule Overlap (Resolved)

All syncs consolidated to 12 AM window:
- 12:00–12:55 AM: Football, non-football sports, transfers
- 1:00 AM: Odds refresh, AI predictions, injuries
- 2:00 AM: Archive, prediction catch-up

### 6.2 Football vs Non-Football Sync

| Aspect | Football | Non-Football |
|--------|----------|--------------|
| Data source | API-Sports | The Odds API (except Volleyball: API-Sports) |
| Table | `fixtures`, `fixture_odds` | `sport_events`, `sport_event_odds` |
| Cron | Central FixtureSchedulerService | Per-sport sync services |
| Manual | Admin → Fixtures | Admin → Sports |
| Settlement | SettlementService (fixture) | OddsApiSettlementService (event) |

**Unification:** Two parallel paths but consistent `sport` field and settlement outcome (won/lost/void).

### 6.3 ENABLE_SCHEDULING (Resolved)

- **Football:** `FixtureSchedulerService` checks `ENABLE_SCHEDULING === 'true'`.
- **Non-football:** All sport sync services (Basketball, Rugby, MMA, Volleyball, Hockey, American Football, Tennis) and news syncs (Transfers, Injuries) now check `ENABLE_SCHEDULING === 'true'`.
- When `ENABLE_SCHEDULING=false`, no cron syncs run (football + non-football).

### 6.4 Sync All Sports (Resolved)

- `POST /admin/sport-sync/all` runs all 7 non-football syncs server-side with error aggregation.
- Returns `{ results: { [sport]: { success, count?, error? } } }`.

### 6.5 Mobile ↔ Web Feature Parity

| Feature | Web | Mobile |
|---------|-----|--------|
| Create pick | ✅ `/create-pick` | ❌ Links to WEB_URL |
| Marketplace | ✅ | ✅ |
| Tipsters | ✅ | ✅ |
| Chat | ✅ | ✅ |
| Community | ✅ | ✅ |
| Support | ✅ | ✅ |
| Invite/Referrals | ✅ | ✅ |
| Notifications | ✅ | ✅ |

**Gap:** Create pick is web-only; mobile deep-links to web. Document this for users.

---

## 7. Recommendations

### 7.1 Unification

1. **Single sync trigger endpoint:** `POST /admin/sport-sync/all` — runs all non-football syncs server-side with error aggregation.
2. **ENABLE_FOOTBALL_SYNC:** Set to `false` to skip football fixture sync (e.g. when football runs on prod, avoid API credits here).
3. **Settlement unification:** Already unified (SettlementService + OddsApiSettlementService). Ensure both write to same notification types.

### 7.2 Communication

1. **Shared types:** `@betrollover/shared-types` exists — ensure web and mobile use it for API contracts.
2. **Deep links:** Document `EXPO_PUBLIC_WEB_URL` for mobile → web flows (create pick, etc.).

### 7.3 Triggers

1. **Cron stagger:** Review 6–7 AM and 9–10 AM windows; add delays if API limits are hit.
2. **Webhook idempotency:** Paystack webhook should handle duplicate events (idempotency key by reference).

### 7.4 Documentation

1. **Cron schedule table:** Add to deployment docs (already in DEPLOYMENT.md Step 6).
2. **Feature flow diagram:** Add to README or docs for onboarding.

---

## 8. Quick Reference

| What | Where |
|------|-------|
| All cron jobs | `backend/src/modules/**/*-scheduler*.ts`, `*-sync.service.ts` |
| Settlement | `backend/src/modules/accumulators/settlement.service.ts`, `odds-api/odds-api-settlement.service.ts` |
| Admin sync triggers | `backend/src/modules/admin/admin.controller.ts` |
| Notifications | `backend/src/modules/notifications/notifications.service.ts` |
| Web API config | `web/lib/site-config.ts` → `getApiUrl()` |
| Mobile API config | `mobile/lib/api.ts` → `API_BASE` |
| Sync health | `backend/src/modules/admin/sync-health.service.ts` |

---

*Last updated: February 2026*
