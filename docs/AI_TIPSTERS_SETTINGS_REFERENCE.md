# AI tipsters — settings reference

**Source of truth:** [`backend/src/config/ai-tipsters.config.ts`](../backend/src/config/ai-tipsters.config.ts)

## Design

- **25 tipsters**, each with a unique `strategy_id` for long-run ROI tracking.
- **Single-fixture coupons**; global `usedFixtureIds` so strategies never share a fixture on a run.
- **Fixed config order** for fixture allocation (not win-rate sorted).
- Prefer **API-Football** probabilities (`require_api_probability` on most profiles).
- Extra API gates when configured: `require_advice_align`, `require_under_over`, `min_form_edge`, `major_leagues_only`, `reject_coarse_api_pct`.

## Why some tipsters were briefly retired

They previously shared the **same** odds/prob/EV floors (only market labels differed), so same-market clones raced for leftovers and ROI was hard to interpret. They are **re-enabled** as league/day/odds **variants** with distinct `strategy_id`s — not identical clones.

## Strategy families

| strategy_id | Tipster | What makes it unique |
|---|---|---|
| `soft_price_flex` | TheGambler | Odds 1.41–2.2, higher API bar |
| `home_favorites_advice` | SafetyFirstPro | Short home + advice + form |
| `home_mid_price` | HomeHeroes | Home 2.20–3.20, no advice gate |
| `away_value` | SteadyEddie | Away 2.2–4.0 all leagues |
| `draw_value` | ConsistentCarl | Draw 2.8–4.5 major leagues; coarse-bin reject |
| `draw_mid_odds` | ValueHunter | Draw 3.2–5.0 major leagues |
| `away_longshot` | UnderdogKing | Away 2.8–6.0 major leagues; +EV underdogs |
| `epl_big6_home` | TopSixSniper | EPL Big 6 home only |
| `serie_a_home` | SerieASavant | Serie A home + advice |
| `championship_away` | ChampionshipChamp | Championship away only |
| `over25_api_confirm` | TheBankroller | Over 2.5 + API `under_over` |
| `over25_value` | OverUnderGuru | Over 2.5 value band, no under_over gate |
| `under25_api_confirm` | StatsMachine | Under 2.5 + API `under_over` |
| `under25_aggressive` | CleanSheetChaser | Under 2.5 looser bar, no under_over |
| `btts_yes` | BTTSMaster | BTTS Yes daily |
| `laliga_weekend_btts` | LaLigaLegend | La Liga weekend BTTS |
| `bundesliga_weekend_under25` | BundesligaBoss | Bundesliga weekend Under |
| `dc_1x` | FormExpert | DC 1X + advice |
| `dc_x2` | Ligue1Lion | DC X2 |
| `weekend_dc_12` | WeekendWarrior | Weekend DC 12 |
| `epl_weekend_flex` | PremierLeaguePro | EPL weekend flex |
| `midweek_home` | MidweekMagic | Tue–Thu home |
| `midweek_away` | LateBloomer | Tue–Thu away |
| `high_ev_flex` | TheAnalyst | Flex 2.0–3.5, EV ≥0.07 |
| `longshot_flex` | HighRollerHQ | Expanded markets 2.8–6.0 major leagues |

### High-odds / underdog hardening

For `draw_value`, `draw_mid_odds`, `away_longshot`, and `longshot_flex`:
- Odds capped (no circus 10–16 prices)
- `major_leagues_only`
- `reject_coarse_api_pct` (drops placeholder 40/45/50/55/60% bins)
- `min_prob_edge`

Track settled ROI by `strategy_id`.

## Related code

| Piece | File |
|--------|------|
| Tipster list + personality | `backend/src/config/ai-tipsters.config.ts` |
| Generation + filters | `backend/src/modules/predictions/prediction-engine.service.ts` |
| API outcomes + advice/comparison | `backend/src/modules/fixtures/api-football-predictions.parser.ts` |
| API fetch | `backend/src/modules/fixtures/api-predictions.service.ts` |
| Dry simulation | `backend/scripts/test-ai-tipsters-from-api.ts` |
