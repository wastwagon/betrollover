# AI Tipsters: Recommendation for Effective, Well-Performing Tipsters (Acca Only)

**Goal:** More of the 25 AI tipsters should post **2-fixture accas** regularly, and those accas should be **quality** (value-focused, not junk).  
**Scope:** Acca only. No single-fixture option.  
**Status:** Discussion only; no implementation yet.

---

## Where we are today

- **Pipeline:** API-Football predictions → fixture-level value (EV) → personality filter → best 2-fixture acca → save.
- **Reality:** Only **The Gambler** consistently posts because his personality is the only one loose enough (All leagues, aggressive, low thresholds) to often have ≥2 qualifying fixtures and a valid 2-leg pair.
- **Other 24:** They fail either because too few fixtures pass their filter, or no valid **pair** exists (e.g. conservative = different days only; weekend/midweek = few matching days; strict prob/EV = few legs).

So “effective and well-performing” here means: **same product (2-pick acca), same quality bar in spirit, but more tipsters actually able to form and post an acca** when there is value.

---

## Root causes (brief)

1. **Conservative same-day rule** – For 6 tipsters, the two legs must be on **different days**. That hugely cuts valid pairs (e.g. most fixtures are Saturday). So they almost never get an acca.
2. **League focus** – Tipsters with specific leagues (e.g. Serie A, Championship) only see those leagues. If the 7-day set has few such fixtures, or league names don’t match exactly, they get 0–1 legs.
3. **Weekend / midweek only** – Some only see Sat/Sun or Tue–Thu. Need at least 2 qualifying fixtures in those days; often there aren’t.
4. **Strict thresholds** – Higher min_win_probability, min_expected_value, min_api_confidence than The Gambler. Fewer fixtures pass, so fewer tipsters get ≥2 legs.
5. **team_filter** – TopSixSniper has `team_filter: ['top_6']` in config but it’s not implemented; he’s just Premier League + conservative + strict. Not the main reason others don’t fire, but inconsistent.

---

## Recommendation (acca-only, no singles)

Focus on **three changes** that make more tipsters post **good** 2-pick accas without lowering the bar into “anything goes”.

### 1. Allow same-day pairs for conservative tipsters (Option A)

- **Change:** In the acca builder, stop requiring conservative tipsters to use two **different** days. Let them form a 2-leg acca from two fixtures on the same day (e.g. two Saturday games).
- **Why it helps:** The 6 conservative tipsters (SafetyFirstPro, TheBankroller, SteadyEddie, ConsistentCarl, HomeHeroes, TopSixSniper) have strict filters already (high min prob, min EV). The thing that blocks them is the “different day” rule, not quality. Same-day pairs still use the same odds band (2.0–4.0 combined) and same personality filters, so we keep **effective** (they can post) and **well-performing** (only value that passes their bar).
- **Risk:** “Conservative” no longer means “spread across days.” If you later want “different days only” for some, we can add a small flag (e.g. `require_different_days: true`) for those.

**Recommendation:** Do this. It’s the single change that unblocks the most tipsters without touching quality thresholds.

---

### 2. Slightly relax thresholds only where tipsters never fire (Option B, careful)

- **Change:** In config, for tipsters that **never** post, relax **a little**: e.g. lower min_win_probability by 0.02–0.03, min_expected_value by 0.01, min_api_confidence by 0.02. Don’t touch The Gambler; don’t relax everyone the same.
- **Why it helps:** Some tipsters (e.g. league specialists, weekend) have only a handful of fixtures in their league/day window. A tiny relaxation lets 1–2 more fixtures pass so they can sometimes form a pair, while still keeping the bar clearly above “random.”
- **Risk:** If we relax too much, we get weak accas and “well-performing” suffers. So: **small, targeted** relaxation only for the ones that currently never fire; monitor results and tighten again if needed.

**Recommendation:** Do this in a **measured** way: identify the tipsters that have 0 predictions in the last N runs, and only for those nudge thresholds slightly (as above). Revisit after we have data.

---

### 3. League name matching / aliases (Option C)

- **Change:** When filtering by `leagues_focus`, treat league names flexibly: e.g. “Premier League” matches “English Premier League”; “La Liga” matches “LaLiga” or “Spanish La Liga”; “Championship” matches “English Championship” or “Championship.” Either normalise when we store fixtures or add a small alias map in the filter.
- **Why it helps:** League specialists (Serie A, La Liga, Championship, Ligue 1, etc.) depend on fixture league name matching config. API often uses slightly different wording; one string mismatch and a fixture is dropped. Better matching = more legs for those tipsters without changing their intended focus.
- **Risk:** Low. We’re not changing who they target, just making the match robust.

**Recommendation:** Do this. It makes existing personalities **effective** (more of their intended leagues actually count) and doesn’t lower quality.

---

## What we are not doing

- **No single-fixture option** – Out of scope. We want effective, well-performing **acca** tipsters only.
- **No big, blanket relaxation** – We’re not lowering the bar for everyone to “Gambler level.” Targeted, small relaxations only where needed so more tipsters can form an acca.
- **No new product types** – Still 2-pick accas only.

---

## Optional later (not part of core recommendation)

- **team_filter:** Either implement Big 6 for TopSixSniper or remove `team_filter` from config so behaviour matches. Low priority compared to 1–3.
- **Debug / observability:** A dry-run or log that shows per tipster “how many fixtures passed filter” and “did we find a pair.” Helps tune 2 and 3 without guessing.

---

## Summary

- **Effective and well-performing** = more of the 25 tipsters posting **2-fixture accas** that still meet their personality (leagues, odds, EV, prob).
- **Recommendation:**  
  1. **Allow same-day pairs for conservative** (Option A) – unblocks 6 tipsters with no quality trade-off.  
  2. **Slight, targeted threshold relaxation** (Option B) – only for tipsters that never fire; small nudge so they can sometimes form an acca.  
  3. **League name / aliases** (Option C) – so league specialists actually see their leagues.  

No singles; no implementation until you’re happy with this direction.
