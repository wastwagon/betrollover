# Under 2.5 Daily – Align with The Gambler (Implementation)

## Problem

- **Under 2.5 Daily** (CleanSheetChaser) rarely gets picks/coupons.
- **The Gambler** regularly gets under 2.5 legs when they have value.
- Goal: make Under 2.5 Daily pick **regularly** using the same logic as The Gambler for under 2.5, **without changing The Gambler**.

## Why The Gambler Gets Under 2.5 Picks

1. **leagues_focus: ['All']** – He sees every fixture in the 7-day window that has odds + API predictions.
2. **Relaxed thresholds** – `min_win_probability: 0.52`, `min_expected_value: 0.04`, `min_api_confidence: 0.5` so more legs pass.
3. **bet_types** include **Over/Under** – so he accepts fixtures whose best EV outcome is `under25` (or over25).
4. **risk_level: 'aggressive'** – No extra same-day restriction in the current engine.

The engine picks **one best outcome per fixture** (by EV). When that outcome is under25 and The Gambler allows Over/Under, the leg is in his pool. With All leagues and low thresholds, he often has ≥2 such legs and gets a 2-pick acca.

## Why Under 2.5 Daily Was Not Getting Picks

1. **leagues_focus: ['Serie A', 'La Liga']** – Only two leagues; if the 7-day pool has few Serie A/La Liga games with under25 as best outcome, he gets 0 or 1 suitable leg → no acca (need ≥2).
2. **Stricter thresholds** – `min_win_probability: 0.59`, `min_expected_value: 0.05`, `min_api_confidence: 0.52` → fewer legs pass.
3. **bet_types: ['Under 2.5']** – Correct; he only accepts under25. So any fixture whose *best* outcome is under25 can qualify, but the league + threshold filters were too tight.

## Implementation (Config Only)

**Change only CleanSheetChaser (Under 2.5 Daily)** in `backend/src/config/ai-tipsters.config.ts`:

- **leagues_focus**: `['Serie A', 'La Liga']` → **`['All']`**  
  Same pool as The Gambler; still only under25 legs will pass because **bet_types** stays `['Under 2.5']`.
- **risk_level**: `'balanced'` → **`'aggressive'`**  
  Matches Gambler; no engine logic currently uses this for same-day, but keeps behaviour aligned.
- **min_win_probability**: `0.59` → **`0.52`**
- **min_expected_value**: `0.05` → **`0.04`**
- **min_api_confidence**: `0.52` → **`0.5`**
- **bet_types**: **unchanged** `['Under 2.5']`  
  So he still only picks under 2.5 goals; we only widened the fixture pool and relaxed thresholds to match The Gambler.
- **target_odds_min / target_odds_max**: keep **1.41–2.0** (same as Gambler).
- **max_daily_predictions**: keep **2** (or set to 999 if you want multiple under-2.5 accas per day).

No changes to:

- Prediction engine code.
- The Gambler config.
- API key: ensure API-Football key (e.g. in Admin → Settings or `API_SPORTS_KEY`) is set so predictions and odds are fetched.

## Result

- Under 2.5 Daily will see the **same fixture/value pool** as The Gambler (all leagues, same probability/EV/confidence thresholds).
- **filterByPersonality** still restricts him to legs where `selectedOutcome === 'under25'` (because bet_types only has Under 2.5).
- Whenever there are ≥2 under25 legs in that pool with combined odds 2.0–4.0, he will get a 2-pick acca, so he should start picking **regularly** in line with how The Gambler gets under 2.5 games.

## API Key

Predictions come from API-Football (`/predictions?fixture=...`). Key is read from:

- Admin → Settings → API Sports Key, or  
- Environment variable `API_SPORTS_KEY`.

Set the key (e.g. `06208ae679202aa04a8478d479645756`) in one of those so fixtures get predictions and odds.
