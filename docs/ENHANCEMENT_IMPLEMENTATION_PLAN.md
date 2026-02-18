# Enhancement Implementation Plan

**Status:** In progress  
**Last updated:** 2026-02-18

---

## Overview

This plan covers enhancements to improve AI tipster coverage, marketplace UX, and observability. Items are ordered by impact and dependency.

---

## Phase 1: Marketplace & Reactions

### 1.1 Reaction endpoint 500 — DONE
- **Problem:** `POST /accumulators/:id/react` returned 500 due to `pick_reactions.createdAt` vs TypeORM `created_at`.
- **Solution:** Entity `@CreateDateColumn({ name: 'createdAt' })` and defensive checks in `react()`.
- **Status:** ✅ Implemented.

### 1.2 Optimistic UI for reaction count — DONE
- **Goal:** When user clicks thumbs-up on a marketplace card, update the count immediately in the UI without waiting for the API; revert if the request fails.
- **Scope:** `web/app/marketplace/page.tsx`.
- **Implementation:** On click, apply optimistic update (hasReacted, reactionCount) then POST react/unreact; on failure or !res.ok revert state and show error toast.
- **Status:** ✅ Implemented.

---

## Phase 2: AI Tipsters — More Coupons for League Specialists

### 2.1 League name aliases (expand) — DONE
- **Goal:** League-focused tipsters see more fixtures when API/DB use alternate names.
- **Implementation:** Added `LEAGUE_ALIASES` in `prediction-engine.service.ts` for Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Championship; `leagueMatchesFocus` checks aliases when includes/normalized fail.
- **Status:** ✅ Implemented.

### 2.2 Slight threshold relaxation for league specialists — DONE
- **Goal:** League specialists can form accas when borderline fixtures exist for their league.
- **Implementation:** Nudged Serie A, La Liga, Championship, Ligue 1, Bundesliga (single-league and weekend) to min_win_probability 0.55, min_api_confidence 0.5, min_expected_value 0.04 in `ai-tipsters.config.ts`.
- **Status:** ✅ Implemented.

---

## Phase 3: Observability & Admin

### 3.1 Prediction generation: per-tipster breakdown in response (optional)
- **Goal:** When admin triggers “Generate predictions”, optionally return or log which tipsters got a coupon and how many suitable fixtures each had.
- **Current:** Debug log already exists (`X suitable → coupon`). Option: add query param `?verbose=true` to `POST /admin/predictions/generate` and include in response `{ count, tipsters: [{ username, displayName, suitable, gotCoupon }] }` for UI or support.
- **Tasks:**
  1. In `prediction-engine.service.ts`, have `generateDailyPredictionsForAllTipsters` build a lightweight breakdown array (or keep current flow and add a separate “dry run” that returns breakdown without saving).
  2. In `runNow()`, if `verbose` flag, call generation in a way that returns this breakdown; admin controller passes through to response.
- **Status:** Pending (low priority).

### 3.2 DB consistency (pick_reactions) — optional later
- **Goal:** New environments or a one-off migration: use `created_at` in `pick_reactions` so entity does not need `name: 'createdAt'`.
- **Risk:** Changing existing prod DB requires migration to rename column; only do if standardizing naming.
- **Status:** Deferred.

---

## Execution Order

1. ✅ Phase 1.1 — Reaction 500 fix (done).
2. ✅ Phase 1.2 — Optimistic UI for reactions (done).
3. ✅ Phase 2.1 — League aliases (expand) (done).
4. ✅ Phase 2.2 — League specialist thresholds (nudge) (done).
5. **Phase 3.1** — Optional (when needed).

---

## Completion Criteria

- **1.2:** Clicking thumbs-up updates count immediately; failed request reverts and notifies.
- **2.1:** League alias matching covers common API/DB variants; no regression for existing matches.
- **2.2:** At least one league specialist (e.g. Serie A or Championship) gets suitable fixtures when such fixtures exist in the 7-day pool.
- **3.1:** Admin can optionally see per-tipster breakdown for the last generation (if implemented).
