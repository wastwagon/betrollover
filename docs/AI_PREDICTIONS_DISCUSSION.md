# AI Predictions System – Discussion (No Implementation)

This doc answers: why one coupon per day, serial numbers for multiple coupons, no fixture repeat, API period, and how to get more quality predictions.

---

## 1. Why only one coupon per day?

Two things together enforce “one coupon per tipster per day”:

**A) Database unique constraint**

- Table `accumulator_tickets` has `UNIQUE(user_id, title)` (migration `1771342706456`).
- So the same tipster cannot have two coupons with the same title.

**B) Title is date-only**

- In **prediction-engine** we save predictions with `predictionTitle: '2-Pick Acca'` (fixed).
- In **prediction-marketplace-sync** we build the coupon title as:
  - `baseTitle = '2-Pick Acca'` (for match-based titles),
  - `title = `${baseTitle} (${dateStr})` → e.g. `"2-Pick Acca (2026-02-20)"`.

So every coupon from the same tipster on the same day gets the **same title** → second coupon would violate `(user_id, title)` → only one coupon per tipster per day in practice.

**C) We only create one prediction per tipster per day anyway**

- In `savePredictionsToDatabase` we do:
  - `existing = predictionRepo.findOne({ where: { tipsterId, predictionDate } })`
  - If `existing`, we skip (no second prediction for that tipster on that date).
- The engine also produces only **one** acca per tipster per run (`createTipsterPrediction` returns a single “best” 2-pick acca).

So: **one prediction per tipster per day** in code, and **one possible coupon title per tipster per day** in sync → one coupon per day. The config `max_daily_predictions` (1, 2, or 3) exists but is **not used** when generating or saving predictions. Under the revised design, we would **drop the max cap**—tipsters get as many coupons as qualify (serial + no fixture repeat).

---

## 2. Serial number for multiple coupons (design only)

To allow **multiple coupons per tipster per day** without changing the DB constraint:

- **Title pattern:** keep date and add a serial, e.g.  
  `"2-Pick Acca (2026-02-20) #1"`, `"#2"`, `"#3"`.
- **Uniqueness:** `(user_id, title)` stays unique because the serial makes each title different.

**Where to apply**

- **Option A:** In **prediction-marketplace-sync**: when creating the coupon, compute today’s count of coupons for that tipster (e.g. count accumulator_tickets for that `user_id` with title starting with `"2-Pick Acca (YYYY-MM-DD)"`) and set title to `2-Pick Acca (date) #N`.
- **Option B:** In **prediction-engine**: when saving a prediction, pass a “serial” or “coupon index” (e.g. 1, 2, 3) and store it (new column or in existing metadata). Sync then uses it to build `#1`, `#2`, etc.

**No fixture repeat rule (for 2nd and later coupons)**

- For a given tipster and date, **coupon #2, #3, …** must not reuse any fixture already used in **coupon #1, #2, …** for that same tipster and date.
- Implementation idea (when you implement): when building the “next” acca for that tipster/date, exclude all `fixture_id`s that appear in `prediction_fixtures` for that tipster’s predictions on that `prediction_date`. Loop until no more qualifying accas (from remaining fixtures) or we run out of suitable pairs. No artificial cap on how many coupons per tipster per day.

This is the design; no code change in this discussion.

---

## 3. API: what “period” of predictions can we get?

**Tested with your key** (predictions + fixtures):

- **Predictions:** `GET /predictions?fixture={id}` — one request per fixture, returns winner/draw/away, advice, percent. **No date/from/to parameters.** Period is determined only by which **fixture IDs** we call.
- **Fixtures:** `GET /fixtures?date=YYYY-MM-DD` returns many fixtures for that date (e.g. 339 for a given day). So we can get fixture IDs for any date we care about.

**Conclusion**

- We **cannot** ask the API “give me all predictions for 7 days” in one call. We get predictions **per fixture**.
- The “period” we can get = **all fixtures we have** (e.g. from our 7-day fixture sync). We already load fixtures for the next 7 days and call the predictions API for each (with rate limit). So we already get predictions for the full 7-day window; the limit is not the API period but our logic (one run per day, one coupon per tipster per day).

So: **we can get predictions for all fixtures in our 7-day window in one day’s run**; we could also run generation again later (e.g. after new fixtures/odds sync) to pick up newly qualifying fixtures without changing the API usage pattern.

---

## 4. More predictions without compromising quality (ideas)

- **No max daily cap:** A tipster can get as many coupons per day as qualify. Serial titles (`#1`, `#2`, `#3`, …) ensure uniqueness; no fixture repeat ensures variety. Quality filters are the only limit—if 10 accas meet the bar, we create 10.
- **Same quality bar:** Keep current filters (min EV, min API confidence / min_win_probability, odds range, league/fixture_days, bet_types). Apply them to every candidate acca. Only quality, not an artificial cap, limits volume.
- **7-day window in one run:** We already fetch fixtures for the next 7 days and get API predictions for them in one run. No change needed for “period”; we already cover 7 days.
- **Re-run when new fixtures qualify:** Run prediction generation on schedule (e.g. 9 AM, 11 AM catch-up) and optionally after fixture/odds sync (e.g. midday/evening) so new fixtures that get odds and pass filters can produce extra coupons. No fixture repeat per tipster per day; no max count.

---

## 5. Summary

| Topic | Answer |
|-------|--------|
| Why one coupon per day? | Unique `(user_id, title)` and title = `"2-Pick Acca (date)"` only; plus we only create one prediction per tipster per day. |
| How to allow more? | Serial in title: `"2-Pick Acca (date) #1"`, `#2`, `#3`, … No max cap—as many as qualify. No fixture repeat for 2nd and later coupons. |
| API period? | No date range; predictions are per fixture. We already use a 7-day fixture set and can get predictions for all of them in one run. |
| More predictions, same quality? | Multiple coupons per tipster (serial + no repeat), same filters, optional extra run after fixture/odds sync. **No artificial limit**—quality filters are the only constraint. |

No implementation was done; this is discussion only. When you implement, you’ll need to: (1) add serial to title in sync (or from engine), and (2) in engine, when building each additional acca for same tipster/date, exclude fixture IDs already used that day. No `max_daily_predictions` cap—a tipster gets as many coupons as qualify.
