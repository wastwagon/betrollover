# AI tipsters — settings reference

**Source of truth:** [`backend/src/config/ai-tipsters.config.ts`](../backend/src/config/ai-tipsters.config.ts) (all 25 profiles, odds bands, bios).

## How the engine uses config

- **Single-fixture coupons** per pick; **global `usedFixtureIds`** so two AI tipsters never share the same fixture on a run.
- **Multi-outcome pool:** for each fixture the engine keeps the **best EV line per outcome** (`home`, `away`, `draw`, `over25`, `under25`, `btts`, `home_away`, `home_draw`, `draw_away`). Specialists only see their market.
- **`outcome_specialization`:** when set, the tipster **only** takes that outcome (after odds / API / EV filters). Omit for flex tipsters (`bet_types` only).
- **`team_filter: ['top_6']`:** enforced in [`prediction-engine.service.ts`](../backend/src/modules/predictions/prediction-engine.service.ts) via [`epl-big-six.config.ts`](../backend/src/config/epl-big-six.config.ts). For **home** specialists, the **home** team must be a Big 6 club; **away** specialists require Big 6 on the away side; otherwise either team may be Big 6.
- **`leagues_focus`:** matched with [`league-focus.util.ts`](../backend/src/config/league-focus.util.ts) (aliases for Premier League, La Liga, etc.). **TopSixSniper** uses **Premier League only** plus Big 6 home.
- **Odds bands:** most non–Gambler profiles use **2.0–5.0**; **draw** and **double-chance** specialists use **lower floors** (see config). **The Gambler** stays **1.41–2.2** with tighter API thresholds.
- **Legacy:** `selection_filter: 'home_only'` still works; prefer **`outcome_specialization: 'home'`** for new profiles.

## Related code

| Piece | File |
|--------|------|
| Tipster list + personality JSON | `backend/src/config/ai-tipsters.config.ts` |
| Generation + filters | `backend/src/modules/predictions/prediction-engine.service.ts` |
| Big 6 name matching | `backend/src/config/epl-big-six.config.ts` |
| League name matching | `backend/src/config/league-focus.util.ts` |
| API-only dry simulation | `backend/scripts/test-ai-tipsters-from-api.ts` |

Older deep-dive docs (`AI_TIPSTERS_WHY_ONLY_GAMBLER_WORKS.md`, etc.) may describe **historical** 2-leg acca behaviour; the live system is **single-leg** with the pool above.
