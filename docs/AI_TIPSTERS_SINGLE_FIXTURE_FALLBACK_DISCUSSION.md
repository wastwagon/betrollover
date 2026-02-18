# Discussion: Option A + Single-Fixture Coupon Fallback

**Status: Analysis only. No implementation.**

We’re evaluating two changes:

1. **Option A** – Let conservative tipsters use **same-day** pairs for their 2-leg acca (instead of requiring two different days).
2. **Single-fixture coupon** – When a tipster can’t find a valid 2-fixture acca, allow them to post a **1-fixture** “coupon” (single pick) instead of posting nothing.

---

## 1. Option A (same-day for conservative) – quick recap

- **Change:** In `findBest2FixtureAcca`, stop skipping pairs where both legs are on the same day when `risk_level === 'conservative'`.
- **Effect:** The 6 conservative tipsters (SafetyFirstPro, TheBankroller, SteadyEddie, ConsistentCarl, HomeHeroes, TopSixSniper) would have many more valid 2-leg combinations (e.g. two Saturday games).
- **Product meaning:** They still only post 2-pick accas; we’re just making it easier for those accas to exist. No new product type.

**Conclusion:** Option A is a small, clear win for “more tipsters posting accas” with no new concepts. We can do it regardless of what we decide on singles.

---

## 2. Single-fixture coupon – what we mean

Today:

- Engine tries to build a **2-fixture acca** per tipster.
- If `suitable.length < 2` or `findBest2FixtureAcca` returns null → **no prediction** for that tipster.

Proposal:

- **Same as now:** Prefer a 2-fixture acca when one exists.
- **Fallback:** If no valid 2-leg acca exists but the tipster has **≥1** qualifying fixture (same personality filter), create a **single-fixture coupon** (one pick) instead of nothing.

So we’d get:

- More tipsters “active” (league specialists, weekend-only, strict thresholds).
- More predictions overall (accas + singles).
- Tipsters that today never post could sometimes post a single.

---

## 3. How effective would single-fixture fallback be?

**Effectiveness for “more activity”**

- **High.** Many tipsters fail today because they have 0 or 1 qualifying fixture after filters, or 1+ qualifying but no valid **pair** (e.g. conservative + same-day, or combined odds never in 2.0–4.0).  
- If they have **≥1** qualifying fixture, a single-fixture fallback gives them something to post. So:
  - League specialists (Serie A, Championship, Ligue 1) with only 1–2 matching fixtures could post that one best pick.
  - Weekend tipsters with only one strong weekend fixture could post it.
  - Conservative tipsters with only one qualifying day could post one pick from that day (even before we do Option A).

So **effectiveness for “more tipsters posting” and “more predictions”** is strong.

**Effectiveness for “quality” and “product fit”**

- **Depends on how we position it.**
- **Singles vs accas:**
  - **Acca** = two legs, combined odds 2.0–4.0, one result (both must win). Higher variance, “coupon” feel.
  - **Single** = one leg, odds in same band (e.g. 1.41–2.0). Lower variance, clearer “one tip” feel.
- Some personalities already sound like “one pick” (e.g. “One quality pick per week”). For them, a single-fixture coupon can be **more** aligned than forcing a 2-pick.
- For “2–3 picks daily” tipsters (e.g. The Gambler), we could either:
  - Only use single when we really can’t form an acca (keep acca-first), or
  - Allow both (acca when possible, single when not) so they still post often.

So single-fixture fallback is **effective for volume and for fitting “one pick” identities**; we just need to decide how prominently we want “singles” in the product (see below).

---

## 4. What it would mean going forward

### 4.1 Product and UX

- **Today:** Everything is a 2-pick acca (title like “2-Pick Acca”, two legs, combined odds).
- **With singles:** We’d have two output types:
  - **2-pick acca** (unchanged).
  - **1-pick “coupon”** (single fixture, single odds).

Decisions we’d need:

- **Naming:** “Single Pick”, “1-Pick Coupon”, “Best Bet”, or keep “2-Pick Acca” only and treat single as “acca with 1 leg” for display. Naming affects how users perceive it.
- **Placement:** Same feed/card as accas (with a badge “Single” vs “Acca”) or separate section (e.g. “Single picks” vs “Accumulators”). Same marketplace or separate filters.
- **Pricing (if any):** If accas are paid/free, do singles use the same rule or different? Usually same (e.g. free) unless we want to differentiate.

So going forward, we’re **explicitly adding “single-fixture coupon” as a product type** alongside 2-pick accas. That’s a small but real product/UX commitment.

### 4.2 Data and backend

- **Predictions:** Today a prediction has N fixtures (in practice N=2). We’d allow N=1.
- **Accumulator / marketplace:** Today an “accumulator” has 2 picks. We’d allow 1-pick “acca” (or a separate entity “single” that still uses the same result-tracking as now).
- **APIs and listing:** Any endpoint that assumes “always 2 legs” would need to support 1 leg (e.g. list of picks can have length 1). Usually a small extension.

So: **one extra case (1 fixture) in the same model** rather than a whole new system. Complexity is low if we treat “single” as “acca with one pick”.

### 4.3 Generation logic (conceptual)

- For each tipster (unchanged order):
  1. Run same personality filter → `suitable` fixtures.
  2. **Try 2-fixture acca** (existing logic). If we get a pair → save **2-pick prediction**, done.
  3. **Else, if single allowed:** pick best single fixture from `suitable` (e.g. by EV or probability), save **1-pick prediction**.

We could control “single allowed” by:

- **Global:** All tipsters can fall back to single when no acca.
- **Per tipster:** e.g. `allow_single_fallback: true` in personality (or only for “weekly” / “one pick” tipsters).

That gives a clear rule going forward: **acca first, single only when no acca and (optional) only when allowed for that tipster**.

### 4.4 Stats and reporting

- We’d have predictions with 1 or 2 legs. Win rate and ROI could be:
  - **Mixed:** one overall stat (simplest).
  - **Split:** “Acca win rate” vs “Single win rate” (better for analysis and tuning).

So going forward we might **track type (single vs acca)** even if we don’t show it everywhere at first.

### 4.5 Quality and risk

- **Variance:** Singles resolve on one match; accas on two. So singles are a bit “easier” to win in isolation but we’re not changing odds bands (still e.g. 1.41–2.0 per leg). Quality bar is the same (personality filter).
- **Spam risk:** If we allow single fallback for everyone, we could get many single picks on days with few fixtures. We could:
  - Limit to e.g. “at most one single per tipster per day”, or
  - Only allow single for tipsters that are defined as “one pick” (weekly, etc.), or
  - Add a minimum bar for single (e.g. only if probability > 0.6) so we don’t post weak singles.

So going forward we’d have a **policy**: when is it okay to post a single (always vs only for some tipsters vs only when quality above X).

---

## 5. Summary table

| Aspect | Option A only | Option A + single-fixture fallback |
|--------|----------------|-------------------------------------|
| **More 2-pick accas** | Yes (6 conservative tipsters) | Same |
| **More tipsters active** | Some | More (any with ≥1 qualifying fixture) |
| **New product type** | No | Yes (1-pick coupon) |
| **Backend/data** | No schema change | Support N=1 for prediction/acca |
| **UX** | Unchanged | Need naming + placement for singles |
| **Quality control** | Same as now | Optional extra rule for singles (min prob, who can post single) |
| **Going forward** | Acca-only, simpler | Acca-first + single fallback; need clear policy and naming |

---

## 6. Open decisions (for when we do implement)

1. **Option A:** Do we allow same-day pairs for conservative? (Recommendation: yes; we can add a “different-day only” flag later if needed.)
2. **Single fallback:** Do we want it at all? If yes:
   - **Who:** All tipsters, or only those with e.g. `allow_single_fallback: true` / “one pick” style?
   - **When:** Only when no 2-fixture acca exists (acca first), agreed?
   - **Quality:** Any extra bar for singles (e.g. min probability) or same as acca leg?
3. **Product/UX:** How we name and show singles (“Single Pick”, “1-Pick Coupon”, same card type with “1 leg”, etc.) and where they appear (same feed vs separate).

Once we’re aligned on these, we can turn this into a short implementation plan (still without writing code until you’re ready).
