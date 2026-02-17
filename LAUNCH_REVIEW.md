# BetRollover Platform — Pre-Launch Review

Comprehensive review of flows, automations, conflicts, and duplicates before launch.

---

## 1. Scheduled Jobs (Cron) Overview

| Schedule | Job | Purpose |
|----------|-----|---------|
| `*/5 * * * *` | Live fixture update | Score updates for matches in progress |
| `*/5 * * * *` | Finished fixture update | Mark completed matches (FT), get final scores |
| `*/5 * * * *` | ResultTrackerService | Settle **AI predictions** (predictions table) |
| `*/30 * * * *` | Periodic settlement | Fallback settlement (accumulator_tickets, Smart Coupons) |
| `0 */2 * * *` | Odds sync | Pre-load odds for upcoming fixtures |
| `0 2 * * *` | Fixture archive | Archive fixtures 90+ days old (not referenced by picks) |
| `0 6 * * *` | Daily fixture sync | Sync next 7 days of fixtures |
| `0 6 * * *` | Transfers sync | News/transfers from API-Football |
| `30 6 * * *` | Smart Coupon generation | Generate daily Smart Coupons |
| `0 7 * * *` | Odds force refresh | Re-sync odds for 50 soonest fixtures |
| `0 7 * * *` | Injuries sync | News/injuries from API-Football |
| `0 9 * * *` | AI prediction generation | Generate daily AI tipster predictions |
| `0 11 * * *` | Prediction catch-up | Re-run if no predictions by 11 AM |
| `30 0,6,12,18 * * *` | Leaderboard update | Recompute tipster rankings |
| `0 23 * * *` | ResultTrackerService (daily) | Additional AI prediction check |

---

## 2. Critical Flows

### 2.1 Settlement (Two Separate Systems)

| System | Table | Trigger | Updates |
|--------|-------|---------|---------|
| **SettlementService** | `accumulator_tickets`, `accumulator_picks`, Smart Coupons | After live/finished fixture updates, every 30 min | Human tipster picks, escrow payouts |
| **ResultTrackerService** | `predictions`, `tipsters` | Every 5 min | AI predictions, tipster stats in `tipsters` table |

**Conflict:** Human tipster stats come from `accumulator_tickets` (computed on-the-fly). AI tipster stats come from `tipsters` table (updated by ResultTrackerService). Both flows are independent and correct.

---

### 2.2 Leaderboard Inconsistency (Bug)

**Issue:** Monthly and Weekly leaderboard use only the `predictions` table:

```sql
LEFT JOIN predictions p ON t.id = p.tipster_id AND date_filter
```

Human tipsters create `accumulator_tickets`, not `predictions`. So **human tipsters always show 0** for monthly/weekly leaderboard.

**Fix:** Extend leaderboard monthly/weekly to aggregate from `accumulator_tickets` for human tipsters (where `tipster.userId` is set), in addition to `predictions` for AI tipsters.

---

### 2.3 Picks with `fixtureId = null` Never Settle

**Issue:** SettlementService only updates picks where `fixtureId IN (finishedFixtureIds)`. Picks with `fixtureId = null` are never settled.

**Cause:** When creating a pick, if the fixture isn't in the DB and the API fetch fails, `fixtureId` stays null. The create-pick form sends `fixtureId` from the fixture selector, so this mainly affects edge cases (API down, fixture not in DB).

**Mitigation:**
- Ensure Create Pick requires selecting from fixture list (fixtureId always sent).
- Consider fallback: match by `matchDate` + `matchDescription` + manual fixture lookup for null fixtureId picks (complex).
- Or: warn user if fixture can't be linked and advise pick may not auto-settle.

---

### 2.4 Potential Race: Double Purchase

**Flow:** Purchase checks `existing` in `user_purchased_picks`, then debits, then creates escrow.

**Edge case:** If user double-clicks, two requests can pass the `existing` check. First request: debit + escrow save. Second request: debit succeeds again (insufficient balance might catch it if first already debited), escrow save may hit unique violation (23505). Current code catches 23505 and continues — but the second request has already debited the user. User could be debited twice with only one escrow entry.

**Mitigation:** Use DB transaction with `SELECT ... FOR UPDATE` on the ticket/listing, or unique constraint on `(userId, accumulatorId)` in `user_purchased_picks` and handle unique violation by refunding the duplicate debit.

---

### 2.5 Escrow Settlement — Duplicate Payout Prevention

SettlementService uses `processedUsers` to avoid double payouts when iterating escrow funds. Correct for normal flows. Edge case: if duplicate escrow rows exist for same user+pick, we skip the duplicate and might underpay the seller (only one payout counted). Ensure escrow has unique constraint on `(user_id, pick_id)` or equivalent.

---

## 3. Duplicate Prevention

| Area | Mechanism | Status |
|------|-----------|--------|
| Coupon title | `UNIQUE(userId, title)` on accumulator_tickets | ✅ |
| Purchase | Check `user_purchased_picks` before purchase | ✅ (race possible, see 2.4) |
| Follow | TipsterFollow table, unique (userId, tipsterId) | ✅ |
| Escrow | Unique constraint recommended | Verify |
| Sync runs | `isSyncRunning` per sync type (1h stale timeout) | ✅ |
| Settlement | Idempotent (only updates pending) | ✅ |

---

## 4. Automation Dependencies

```
6:00  Fixture sync ──────────────────┐
6:00  Transfers sync (API-Football) ─┼─ May share API rate limit
6:30  Smart Coupon generation ───────┘   (runs after fixtures)
7:00  Odds refresh, Injuries sync
9:00  AI prediction generation (needs fixtures + odds)
11:00 Catch-up if no predictions
```

**Potential conflict:** Fixture sync and Transfers sync both at 6:00 AM. If API-Football has a shared daily quota, running both at once could hit limits. Consider staggering (e.g. Transfers at 6:15).

---

## 5. Data Consistency Checks

| Check | Recommendation |
|-------|----------------|
| Tipster stats | Human: computed from accumulator_tickets ✅. AI: from tipsters table ✅. |
| Leaderboard All Time | Uses accumulator_tickets for human tipsters ✅. |
| Leaderboard Monthly/Weekly | Uses predictions only — human tipsters show 0 ❌. |
| Marketplace vs Profile | Profile now shows all coupons (upcoming + past) ✅. |
| ROI/Win rate display | Shows "—" when no settled picks ✅. |

---

## 6. Recommended Fixes (Priority)

### High
1. **Leaderboard monthly/weekly** — Include `accumulator_tickets` for human tipsters in the date-filtered query.
2. **Double-purchase race** — Add advisory lock or handle 23505 on `user_purchased_picks` with refund of duplicate debit.

### Medium
3. **fixtureId = null** — Add validation: require fixtureId when creating marketplace picks, or document that picks without linked fixture won't auto-settle.
4. **6 AM job clash** — Stagger Transfers sync to 6:15 if rate limits are an issue.

### Low
5. **Escrow unique** — Confirm unique constraint on escrow (userId, pickId) to prevent duplicate funds.
6. **SettlementService fixture lookup** — Settlement calls `determinePickResult` with `fix.homeTeamName`, `fix.awayTeamName`, but the fixture query only selects `id`, `homeScore`, `awayScore`. Team-name-based Double Chance (e.g. "Santos or Draw") may not match. Add `homeTeamName`, `awayTeamName` to the fixture select.

---

## 7. User Flows — Summary

| Flow | Status | Notes |
|------|--------|-------|
| Registration | ✅ | OTP, wallet created, tipster record |
| Login | ✅ | JWT expiresIn default 7d |
| Create Pick | ✅ | Duplicate title check, fixture linkage |
| Marketplace list | ✅ | Only upcoming purchasable coupons |
| Tipster profile | ✅ | All coupons (upcoming + past) |
| Purchase | ⚠️ | Double-click race possible |
| Settlement | ✅ | After fixture updates, idempotent |
| Escrow payout | ✅ | Won → seller, Lost → buyer refund |
| Wallet debit/credit | ✅ | Purchase uses transaction |
| Paystack webhook | ✅ | Verify signature, idempotent |

---

## 8. Quick Reference: Key Files

- Settlement: `backend/src/modules/accumulators/settlement.service.ts`
- Cron jobs: `backend/src/modules/fixtures/fixture-scheduler.service.ts`, `result-tracker.service.ts`
- Leaderboard: `backend/src/modules/predictions/tipsters-api.service.ts` (`getLeaderboard`)
- Tipster stats: `tipsters-api.service.ts` (`computeStatsFromTickets`)
- Purchase: `backend/src/modules/accumulators/accumulators.service.ts` (`purchase`)
