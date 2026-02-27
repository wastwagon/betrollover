# Admin Coupon Deletion — Implementation Plan

> **Status: Implemented** (see summary at end)

## Goal

Allow **admin-only** complete deletion of tipster coupons (including AI coupons). When a coupon is deleted:

1. **Full removal** — Coupon and all related data are deleted
2. **Stats recalculated** — ROI, Win Rate, Streak, Best Streak, Total Predictions update automatically
3. **No breaking changes** — Live system remains stable; purchases, escrow, and other features unaffected

---

## Current State

### What Exists Today

- **`DELETE /admin/picks/:id`** — Admin can delete a coupon (accumulator_ticket)
- **`deletePick(id)`** — Simply runs `ticketRepo.delete(id)` with **no**:
  - Escrow refund check
  - Prediction cleanup (for AI coupons)
  - Tipster stats recalculation

### Data Model

| Entity | Relation to Coupon | On Delete |
|--------|--------------------|-----------|
| `accumulator_tickets` | The coupon itself | — |
| `accumulator_picks` | Legs of the coupon | CASCADE |
| `pick_marketplace` | Marketplace listing | CASCADE |
| `user_purchased_picks` | Purchase records | CASCADE |
| `escrow_funds` | Held buyer funds (pick_id) | CASCADE |
| `pick_reactions` | Likes | CASCADE |
| `subscription_coupon_access` | Subscription packages | CASCADE |
| `coupon_reviews` | Reviews | CASCADE |
| `predictions` | AI source (via pick_marketplace.predictionId) | **No FK** — orphaned if we only delete ticket |

### Stats Sources

| Tipster Type | Stats Source | Stored Where |
|--------------|-------------|--------------|
| **Human** | `accumulator_tickets` (userId) | Computed on-the-fly by TipstersApiService |
| **AI** | `tipsters` table (denormalized) | Updated by ResultTrackerService when predictions settle |

- **Human tipsters**: Stats are computed from tickets. Deleting a ticket → next API call automatically excludes it. No stored stats to fix.
- **AI tipsters**: `tipsters` table holds totalPredictions, totalWins, totalLosses, winRate, roi, currentStreak, bestStreak. These must be **recomputed** after deletion.

---

## Risks & Constraints

### 1. Purchases with Held Escrow

If a coupon has been **purchased** and is **pending** (not yet settled):

- Buyer’s wallet was debited
- `escrow_funds` rows exist with `status: 'held'`
- Deleting the ticket CASCADE-deletes escrow rows but **does not refund** the buyer

**Required**: Refund all buyers with held escrow **before** deleting the coupon.

### 2. AI Coupons — Orphaned Predictions

- AI coupon = `prediction` → synced to `accumulator_ticket` via `pick_marketplace`
- `pick_marketplace.predictionId` links to `predictions.id`
- Deleting the ticket CASCADE-deletes `pick_marketplace`, but **not** the `prediction`
- `tipster.totalPredictions` was incremented when the prediction was created

**Required**: If coupon is AI-backed, delete the `prediction` and `prediction_fixtures` so tipster stats stay correct.

### 3. Settled Coupons with Released Escrow

- Escrow already settled (won → tipster paid; lost → buyer refunded)
- Safe to delete ticket; CASCADE will remove escrow records (status `released`/`refunded`)

### 4. Subscription Packages

- `subscription_coupon_access` links packages to coupons
- CASCADE removes access when coupon is deleted
- Subscribers lose access to that coupon — acceptable for mistaken coupons

---

## Implementation Plan

### Phase 1: Safe Deletion Service (Backend)

Create `AdminCouponDeletionService` (or extend `AdminService`) with a single method: `deleteCouponCompletely(accumulatorId: number)`.

**Steps (in order):**

1. **Load coupon** — `accumulator_ticket` by id; return 404 if not found.
2. **Check for held escrow** — `escrow_funds` where `pickId = accumulatorId` and `status = 'held'`.
3. **Refund buyers** — For each held escrow:
   - Credit buyer’s wallet (same flow as settlement “lost” refund)
   - Update escrow status to `refunded` (or delete after refund)
   - Notify buyer
4. **Resolve AI prediction** — If `pick_marketplace` has `predictionId`:
   - Delete `prediction_fixtures` (FK to prediction)
   - Delete `prediction`
5. **Delete coupon** — `ticketRepo.delete(accumulatorId)`.
   - CASCADE removes: picks, marketplace, purchases, escrow, reactions, subscription access, reviews.
6. **Recalculate tipster stats** — For `ticket.userId`:
   - Query all remaining `accumulator_tickets` for that user (won/lost/pending)
   - Compute: totalPredictions, totalWins, totalLosses, winRate, roi, currentStreak, bestStreak, totalProfit, avgOdds
   - Find `tipster` by `userId` and update `tipsters` table
   - If no tipster row (human-only), optionally create one or skip (TipstersApiService computes from tickets anyway)
7. **Update leaderboard** — Call `ResultTrackerService.updateLeaderboardNow()` so rankings reflect changes.
8. **Audit log** — Record admin action (e.g. `admin_actions` table).

**Transaction**: Wrap steps 2–6 in a DB transaction so a failure rolls back refunds and deletion.

---

### Phase 2: Tipster Stats Recalculation

Create a reusable `recalculateTipsterStatsFromTickets(userId: number)`:

```ts
// Pseudocode
const tickets = await ticketRepo.find({
  where: { userId },
  select: ['id', 'result', 'totalOdds', 'createdAt'],
  order: { createdAt: 'ASC' }
});
const settled = tickets.filter(t => t.result === 'won' || t.result === 'lost');
const totalPredictions = tickets.length;
const totalWins = settled.filter(t => t.result === 'won').length;
const totalLosses = settled.filter(t => t.result === 'lost').length;
const totalProfit = /* sum of (odds - 1) for won, -1 for lost */;
const winRate = settled.length > 0 ? (totalWins / settled.length) * 100 : 0;
const roi = totalPredictions > 0 ? (totalProfit / totalPredictions) * 100 : 0;
const { currentStreak, bestStreak } = computeStreak(settled);
const avgOdds = /* average of totalOdds */;
// Update tipsters table where userId = X
```

- Use the same formulas as `ResultTrackerService` and `TipstersApiService` for consistency.
- Handle edge case: if `totalPredictions === 0`, set winRate/roi/streak to 0.

---

### Phase 3: API & Guardrails

1. **Replace `deletePick`** — Use the new `deleteCouponCompletely` logic.
2. **Admin-only** — Already enforced by controller (`user.role !== 'admin'`).
3. **Optional: Soft block** — If coupon has purchases and is **settled**, consider a warning or extra confirmation (e.g. “This coupon has been purchased and settled. Deleting will remove it from history. Continue?”).
4. **Response** — Return `{ ok: true, tipsterStatsRecalculated: true }` for UI feedback.

---

### Phase 4: Admin UI (Optional)

- Add a “Delete coupon” action on the admin marketplace/picks list or detail view.
- Confirmation modal: “This will permanently delete the coupon, refund any pending purchases, and recalculate the tipster’s stats. Continue?”
- Show success message: “Coupon deleted. Tipster stats have been recalculated.”

---

## Files to Modify

| File | Changes |
|------|---------|
| `backend/src/modules/admin/admin.service.ts` | Replace `deletePick` with full deletion + stats recalculation |
| `backend/src/modules/admin/admin.controller.ts` | Optional: rename route to `DELETE /admin/coupons/:id` for clarity |
| `backend/src/modules/predictions/result-tracker.service.ts` | Add `recalculateTipsterStatsFromTickets(userId)` (or new service) |
| `backend/src/modules/predictions/predictions.module.ts` | Export if new service |
| `web/app/admin/...` | Add delete button + confirmation (if UI phase) |

---

## Testing Checklist

- [ ] Delete human tipster coupon (no purchases) → stats recomputed from remaining tickets
- [ ] Delete AI coupon (no purchases) → prediction deleted, tipster stats updated
- [ ] Delete coupon with pending purchases (held escrow) → buyers refunded, then deleted
- [ ] Delete settled coupon (released escrow) → no refund needed, clean delete
- [ ] Leaderboard updates after deletion
- [ ] No FK violations, no orphaned predictions
- [ ] Admin-only: non-admin gets 403

---

## Rollout

1. Deploy backend with new logic; keep existing `DELETE /admin/picks/:id` route.
2. Test in staging with real-like data (purchases, escrow, AI coupons).
3. Add admin UI when ready.
4. Document in admin runbook: “Use Delete Coupon only for genuine mistakes (wrong picks, duplicates). Purchasers will be refunded if coupon was pending.”

---

## Summary

| Step | Action |
|------|--------|
| 1 | Refund held escrow before delete |
| 2 | Delete AI prediction + fixtures if AI coupon |
| 3 | Delete accumulator_ticket (CASCADE cleans rest) |
| 4 | Recalculate tipster stats from remaining tickets |
| 5 | Update leaderboard |
| 6 | Audit log |

This keeps the system consistent, avoids financial loss for buyers, and ensures tipster stats always match the remaining coupons.

---

## Implementation Summary (Completed)

- **Backend**: `AdminService.deletePick()` — Refunds held escrow, deletes AI prediction+fixtures, deletes ticket, recalculates tipster stats, updates leaderboard
- **TipstersApiService**: `recalculateAndPersistTipsterStats(userId)` — Recomputes totalPredictions, totalWins, totalLosses, winRate, roi, currentStreak, bestStreak from remaining tickets
- **Admin UI**: Admin → Marketplace — Red "Delete" button on each coupon with confirmation dialog
- **API**: `DELETE /admin/picks/:id` — Admin-only, returns `{ ok, refundedCount?, tipsterStatsRecalculated? }`
