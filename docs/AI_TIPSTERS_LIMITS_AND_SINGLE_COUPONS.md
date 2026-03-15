# AI Tipsters: Limits and Single Coupons

## What “limits” mean for single coupons

With **single-fixture coupons**, each AI tipster only needs **one** fixture that passes their filters to create a coupon (no need for a second leg or combined odds 2.0–4.0). So **more** tipsters can post than when we required 2-pick accas.

A fixture is **suitable** for a tipster only if it passes **all** of:

- **Odds:** `target_odds_min` ≤ single pick odds ≤ `target_odds_max`
- **Probability:** ≥ `min_win_probability` (or when API: ≥ `min_api_confidence`)
- **EV:** ≥ `min_expected_value - 0.08` (engine relaxes slightly)
- **League:** in `leagues_focus` (or “All”)
- **Bet type:** outcome matches one of `bet_types` (e.g. 1X2, BTTS, Over 2.5, Under 2.5)
- **Fixture day:** if set, `fixture_days` = weekend (Sat/Sun) or midweek (Tue/Wed/Thu)
- **Extra:** e.g. `selection_filter: 'home_only'` → only home wins; `preference: 'underdogs'` → away at odds ≥ 2.5

If **no** fixture passes for a tipster on a given run, that tipster creates **no** coupon that day.

---

## Limits per AI tipster

| Tipster | Odds range | Min prob / API conf | Leagues | Bet types | Day filter | Max coupons/day |
|--------|------------|---------------------|--------|-----------|-----------|------------------|
| **SafetyFirstPro** (Weekly Premium) | 1.41–2.0 | 0.65 / 0.62 | PL, La Liga, Serie A | 1X2 | — | 1 |
| **TheBankroller** (Weekly Bankroll) | 1.41–2.0 | 0.62 / 0.52 | PL, Bundesliga, La Liga, Serie A | 1X2, Over/Under | — | 1 |
| **SteadyEddie** (Weekly Steady) | 1.41–2.0 | 0.64 / 0.57 | PL, Ligue 1 | 1X2 | — | 1 |
| **ConsistentCarl** (Weekly Elite) | 1.41–2.0 | **0.68** / 0.57 | PL, Bundesliga | 1X2 | — | 1 |
| **WeekendWarrior** | 1.41–2.0 | 0.58 / 0.52 | PL, La Liga | 1X2, BTTS, DC | **Weekend** | 2 |
| **PremierLeaguePro** | 1.41–2.0 | 0.58 / 0.52 | **PL only** | 1X2, O/U, BTTS, DC | **Weekend** | 2 |
| **LaLigaLegend** | 1.41–2.0 | 0.55 / 0.5 | **La Liga only** | 1X2, BTTS | **Weekend** | 2 |
| **BundesligaBoss** | 1.41–2.0 | 0.55 / 0.5 | **Bundesliga only** | 1X2, Over/Under | **Weekend** | 2 |
| **MidweekMagic** | 1.41–2.0 | 0.52 / 0.5 | All | 1X2, BTTS | **Midweek** | 2 |
| **LateBloomer** | 1.41–**1.6** | 0.52 / **0.6** | All | 1X2, Over/Under | — | 999 |
| **TheAnalyst** | **1.3–1.5** | 0.58 / 0.52 | All | **Double Chance only** | — | 999 |
| **ValueHunter** | 1.41–2.0 | 0.58 / 0.52 | PL, Serie A, Bundesliga | 1X2 | — | 1 |
| **FormExpert** | 1.41–2.0 | 0.58 / 0.52 | PL, La Liga, Bundesliga | 1X2, Over/Under | — | 2 |
| **StatsMachine** | 1.3–1.7 | 0.6 / 0.6 | All | 1X2, O/U, BTTS | — | 2 |
| **BTTSMaster** | 1.41–2.0 | 0.58 / 0.52 | All | **BTTS only** | — | 999 |
| **OverUnderGuru** (Over 2.5) | 1.41–2.0 | 0.59 / 0.52 | PL, Bundesliga, Serie A | **Over 2.5 only** | — | 2 |
| **CleanSheetChaser** (Under 2.5) | 1.41–2.0 | 0.52 / 0.5 | All | **Under 2.5 only** | — | 2 |
| **SerieASavant** | 1.41–2.0 | 0.55 / 0.5 | **Serie A only** | 1X2, Under 2.5 | — | 2 |
| **Ligue1Lion** | 1.41–2.0 | 0.55 / 0.5 | **Ligue 1 only** | 1X2, BTTS | — | 2 |
| **ChampionshipChamp** | 1.41–2.0 | 0.55 / 0.5 | **Championship only** | 1X2, BTTS | — | 2 |
| **HomeHeroes** | 1.41–2.0 | 0.52 / 0.5 | All | 1X2 **+ home only** | — | 2 |
| **UnderdogKing** | 1.41–2.0 | 0.57 / 0.52 | PL, Championship, La Liga | 1X2 **+ away ≥2.5** | — | 2 |
| **HighRollerHQ** | 1.41–2.0 | 0.55 / 0.52 | Top 5 leagues | 1X2, BTTS, Over/Under | — | 2 |
| **TheGambler** | 1.41–2.0 | 0.52 / 0.5 | All | 1X2, BTTS, Under 2.5 | — | 2 |
| **TopSixSniper** | 1.41–2.0 | **0.63** / 0.57 | **PL only** | 1X2 | — (team_filter in config but not enforced in engine) | 1 |

*PL = Premier League, DC = Double Chance, O/U = Over/Under.*

---

## Who is likely to post often vs rarely

**More likely to have ≥1 suitable fixture (broad filters):**

- **The Gambler, CleanSheetChaser, HomeHeroes, MidweekMagic, LateBloomer** — All leagues (or many), relaxed prob/EV.
- **BTTSMaster, StatsMachine, TheAnalyst** — All leagues, various markets; TheAnalyst only Double Chance.

**More likely to post rarely (strict filters):**

- **Weekly group** (SafetyFirstPro, TheBankroller, SteadyEddie, ConsistentCarl) — High min probability (0.62–0.68), limited leagues.
- **ConsistentCarl** — 0.68 prob and only PL + Bundesliga.
- **Weekend-only** (WeekendWarrior, PremierLeaguePro, LaLigaLegend, BundesligaBoss) — Only Sat/Sun; if the 7-day window has few weekend fixtures, they may get nothing.
- **Single-league** (PremierLeaguePro, LaLigaLegend, BundesligaBoss, SerieASavant, Ligue1Lion, ChampionshipChamp) — Need fixtures in that league in the 7-day window with value.
- **Market specialists** (Over 2.5 only, Under 2.5 only, BTTS only, Double Chance only) — Need the right outcome to be the best by EV in that fixture.

So: **single coupons did not remove limits**; they only lowered the bar from “2 suitable fixtures + combined 2–4” to “1 suitable fixture”. Tipsters with tight odds, high prob, one league, or weekend-only will still only create coupons when at least one fixture passes all their filters.

---

## Relaxations applied (config)

The following relaxations are in place so more tipsters can create single coupons:

1. **Weekly tipsters:** `min_win_probability` and `min_api_confidence` lowered to 0.58–0.60 (SafetyFirstPro, TheBankroller, SteadyEddie, ConsistentCarl, TopSixSniper).
2. **Weekend / midweek:** `fixture_days` removed from WeekendWarrior, PremierLeaguePro, LaLigaLegend, BundesligaBoss, and MidweekMagic so they can post on any day when they have value.
3. **Single-league:** `"All"` added to `leagues_focus` for PremierLeaguePro, LaLigaLegend, BundesligaBoss, SerieASavant, Ligue1Lion, ChampionshipChamp, OverUnderGuru, TopSixSniper; WeekendWarrior already had two leagues and now has `"All"` as well.

---

## No duplicate fixtures across tipsters (global usedFixtureIds)

**Problem:** The Gambler and Under 2.5 Daily (and others) were picking the same fixtures because each tipster had their own `usedFixtureIds`; the "best" fixture by EV was the same for both.

**Fix:** The engine now uses a **single global** `usedFixtureIds` for the whole run. Once any tipster uses a fixture, no other tipster can use it. Tipsters are processed in config order (e.g. Under 2.5 Daily before The Gambler), so the first tipster in the list gets first pick of the best fixtures for their filters; the rest get the next-best remaining. This reduces duplicate picks and spreads fixtures across more tipsters.

---

## Why only a few AI tipsters may show on a given day

The **fixture pool** (next 7 days, with odds + API predictions) may only contain value that matches a **subset** of tipsters’ filters:

- If most value is **Under 2.5**, tipsters that only accept 1X2, BTTS, or Over 2.5 may have few or no suitable fixtures.
- **Market specialists** (BTTS only, Over 2.5 only, Double Chance only) only get coupons when that outcome is best by EV in the pool.
- **Strict filters** (e.g. high min probability, single league, home_only) further reduce the number of qualifying fixtures.

So it’s normal to see only 3–5 tipsters with coupons on some days. To get more tipsters to show:

- Relax **min_win_probability** / **min_api_confidence** slightly for tipsters that rarely post.
- Ensure **fixture sync** runs so the pool has enough fixtures with odds and predictions.
- With **global usedFixtureIds**, the same fixture is not repeated across tipsters, so variety in the UI improves.
