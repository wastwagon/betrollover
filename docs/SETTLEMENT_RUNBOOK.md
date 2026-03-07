# Settlement runbook

Short checklist for deployment and day-to-day settlement (fixtures, multi-sport, escrow).

---

## After deploy

1. **Run settlement once** so any pending results get applied:
   - **Admin → Dashboard** → “Run Settlement Now”, or  
   - **Admin → Multi-Sport** → “Sync Results & Settle”.
2. **Optional (one-time):** If you had tickets that were fully settled but still showed as Active before the fix, run:
   - `scripts/fix-already-settled-tickets.sql` (see file header for `psql` / docker command).
3. **Check diagnostic:** `GET /admin/settlement/diagnostic` (or Admin UI if wired) — confirm `lastSettlementAt` / `lastOddsApiResultsAt` and `stuckPendingPicksPastCutoff` (should be 0 after a successful run).

---

## When to use which flow

| Goal | Where | Action |
|------|--------|--------|
| Fetch **football** results and settle | **Admin → Fixtures** | “Fetch Results & Settle” |
| Fetch **other sports** (Basketball, Rugby, MMA, Volleyball, Hockey, Tennis, Amer. Football) results and settle | **Admin → Multi-Sport** | “Sync Results & Settle” |
| Only run settlement (no new result fetch) | **Admin → Dashboard** | “Run Settlement Now” |
| Manually set result for one **sport event** (e.g. match >3 days old, Odds API no longer returns it) | **Admin → Multi-Sport** → select sport | “Settle” on the event row, enter home/away score |

**Mixed coupons (e.g. football + basketball):** Use **Fixtures → Fetch Results & Settle** first for football, then **Multi-Sport → Sync Results & Settle** so other sports get results and full settlement runs.

---

## Cron / scheduling

- **ENABLE_SCHEDULING=true** — required for:
  - Fixture/settlement cron (football results + settlement).
  - Odds API results sync every 2h (multi-sport).
- Check **lastSettlementAt** and **lastOddsApiResultsAt** in the settlement diagnostic to confirm crons (or manual runs) are executing.

---

## Stuck picks

- **stuckPendingPicksPastCutoff** in the diagnostic = pending picks on fixtures/events that are >2h in the past and not FT.
- **Fix:** Either run “Fetch Results & Settle” / “Sync Results & Settle” again (if the API has the result now), or for **sport_events** use **Settle** on that event with the correct score. For **fixtures** that are postponed/cancelled, settlement will auto-void picks on PST/CANC; if a fixture is still missing results, fix the fixture (or data source) and re-run settlement.
