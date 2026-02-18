# Review: Will the New Enhancements Bring More Tipsters Onboard?

**Date:** 2026-02-18  
**Run:** Manual prediction generation (189 fixtures with odds, 7-day window)

---

## Summary

The enhancements (league aliases + league specialist threshold nudges) are **in place and correct**. They **will** bring league specialists onboard **when the fixture set includes fixtures from those leagues** with odds/probability in range. On the current run, **no league specialist had any suitable fixtures** because the 189 fixtures in the 7-day window do not appear to include any that both (a) match their league focus (Serie A, La Liga, Bundesliga, Championship, Ligue 1) and (b) pass the other filters (odds 1.41–2.0, probability, EV, fixture_days). So the **same 3 tipsters** as before got coupons: **LateBloomer, StatsMachine, The Gambler** (all “All” leagues or midweek with relaxed bar).

---

## Per-tipster results (this run)

| Tipster            | Suitable | Coupon | Notes                                      |
|--------------------|----------|--------|--------------------------------------------|
| SafetyFirstPro     | 0        | no     | Conservative + strict + multi-league       |
| TheBankroller      | 0        | no     | Same                                       |
| SteadyEddie        | 0        | no     | Same                                       |
| ConsistentCarl     | 0        | no     | Same                                       |
| WeekendWarrior     | 0        | no     | Weekend + Premier League / La Liga         |
| PremierLeaguePro   | 0        | no     | Weekend + Premier League only              |
| LaLigaLegend       | 0        | no     | Weekend + La Liga (nudged)                 |
| BundesligaBoss     | 0        | no     | Weekend + Bundesliga (nudged)               |
| MidweekMagic       | 0        | no     | Midweek only                               |
| **LateBloomer**    | **11**   | **yes**| Midweek + All leagues                      |
| TheAnalyst         | 0        | no     | Multi-league, no fixture_days               |
| ValueHunter        | 0        | no     | Same                                       |
| FormExpert         | 0        | no     | Same                                       |
| **StatsMachine**   | **17**   | **yes**| All leagues, no fixture_days                |
| BTTSMaster         | 0        | no     | BTTS + Premier League / Bundesliga          |
| OverUnderGuru      | 0        | no     | Over 2.5 + multi-league                    |
| CleanSheetChaser   | 0        | no     | Under 2.5 + Serie A / La Liga               |
| SerieASavant       | 0        | no     | Serie A only (nudged)                      |
| Ligue1Lion         | 0        | no     | Ligue 1 only (nudged)                      |
| ChampionshipChamp | 0        | no     | Championship only (nudged)                 |
| HomeHeroes         | 0        | no     | All leagues, home_only                     |
| UnderdogKing       | 0        | no     | Away + odds ≥ 2.5                          |
| HighRollerHQ       | 0        | no     | Multi-league                               |
| **TheGambler**     | **17**   | **yes**| All leagues                                |
| TopSixSniper       | 0        | no     | Premier League + conservative              |

**Coupons generated:** 3 (LateBloomer, StatsMachine, The Gambler).

---

## Why league specialists still have 0 suitable

Likely one or both of:

1. **Fixture mix**  
   The 189 fixtures may be mostly from competitions whose `leagueName` in the DB is not one we match (e.g. “UEFA Europa League”, “Conference League”, or other cups). So there are few or no fixtures with `leagueName` like “Serie A”, “La Liga”, “Bundesliga”, “Championship”, or “Ligue 1” (or our aliases).

2. **Weekend vs midweek**  
   La Liga and Bundesliga specialists are **weekend-only**. If most of their leagues’ fixtures in the window fall on Wed/Thu, they get 0 after `fixture_days` filter. Similarly, if Serie A / Championship / Ligue 1 fixtures exist but are weekend-only and we’re midweek, we’d need to run again on a weekend (or with dates that include more weekend games) to see them get suitable fixtures.

So the **logic** is ready (aliases + thresholds); the **data** for this run doesn’t yet give league specialists any qualifying legs.

---

## What will bring them onboard

- **Ensure league names are set**  
  Fixtures coming from football sync should have `leagueName` set from the API (e.g. `league?.name`). If your enabled leagues include Serie A, La Liga, Bundesliga, Championship, Ligue 1, those fixtures will then match our aliases when the names are as expected (or covered by the alias list).

- **Run on a weekend (or include weekend-heavy dates)**  
  So that weekend-only tipsters (La Liga, Bundesliga, Premier League, Weekend Value) have enough Sat/Sun fixtures in the 7-day window.

- **Optional: relax a bit more**  
  If you see fixtures with the right league but still 0 suitable, you can nudge `min_win_probability` / `min_api_confidence` again for those tipsters only (e.g. to 0.52 / 0.5 to match Gambler).

- **Optional: log league mix**  
  Add a one-off log of unique `leagueName` values in the fixture prediction pool (or in the DB for the next 7 days) to confirm which leagues are present and how they’re named.

---

## Conclusion

- **Enhancements:** Implemented and will help as soon as the fixture/league mix and (for weekend tipsters) the day mix support it.
- **This run:** No new tipsters beyond the existing 3 (LateBloomer, StatsMachine, The Gambler) because the current 7-day set doesn’t give league specialists any qualifying fixtures.
- **Next step:** Run generation again when (a) more leagues are synced and fixtures have `leagueName` set, and/or (b) the run includes weekend-heavy days, then re-check per-tipster “suitable” counts and coupons.
