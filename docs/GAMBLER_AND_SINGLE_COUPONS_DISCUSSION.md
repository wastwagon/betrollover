# Gambler Volume, Over/Under 2.5, and Single Coupons — Discussion & Changes

## 1. What you raised

- **The Gambler** is picking too many coupons and losing a lot.
- The product / tipster is **Over 2.5**-heavy but you want it to **mostly play Under 2.5**.
- You want **single coupons** allowed for the Gambler and everyone (gamblers and tipsters), so combined odds drop and you don’t need high combined odds.
- You shared a **football API key** for investigation — see **API key security** below.

---

## 2. API key security (important)

**Do not commit API keys to the repo.** Store the key in:

- **Environment:** `API_SPORTS_KEY=your_key` in `.env` (and ensure `.env` is in `.gitignore`), or  
- **Admin → Settings:** if your app supports storing the API key in the database (e.g. `api_settings.api_sports_key`).

The backend already reads the key from `process.env.API_SPORTS_KEY` or from admin settings. Use one of those; never paste the key into source code or docs.

---

## 3. Why The Gambler was “Over 2.5” and posting a lot

### 3.1 Over vs Under

- The **prediction engine** picks **one outcome per fixture** by **highest expected value (EV)**. So for each game it chooses either Over 2.5 or Under 2.5 (or 1X2/BTTS) depending on which has better EV.
- **The Gambler** had `bet_types: ['1X2', 'BTTS', 'Over/Under', 'Double Chance']`. So he **allowed both** Over 2.5 and Under 2.5. The engine therefore often gave him **Over 2.5** when the API/odds favored Over.
- If the API or odds tend to favor Over 2.5 in many matches, the Gambler’s “goals” legs will be mostly Over 2.5, which doesn’t match “mostly Under 2.5”.

**Change made:** The Gambler’s `bet_types` are restricted to **Under 2.5** for goals (no generic “Over/Under”). So his goals-market legs are **Under 2.5 only**. He can still use 1X2 and BTTS.

### 3.2 Too many coupons

- The Gambler had `max_daily_predictions: 999`. The engine runs once (or a few times) per day and, **per tipster**, keeps building **2-pick accas** until it runs out of valid pairs or hits `max_daily_predictions`. So he could get **many** 2-pick coupons per day (different fixture pairs), which increases variance and can feel like “picking too many and losing much”.

**Change made:** `max_daily_predictions` for The Gambler is reduced to **2** (or 1 if you prefer). So he posts at most 1–2 coupons per day.

---

## 4. Single coupons: what was already true vs what we added

### 4.1 Humans (create-pick flow)

- **Backend:** `accumulators.service` only requires `selections.length >= 1` and `<= 20`. So **single-pick coupons are already allowed** for any user (gambler or tipster) creating a coupon manually.
- **Frontend:** Create-pick page only enforces “Add at least one selection”. So **no backend or frontend change** was needed for humans to create single coupons.

### 4.2 AI tipsters (prediction engine)

- **Change made:** AI coupons are **single-fixture only**. The engine no longer builds 2-pick accas. Each AI tipster gets at most `max_daily_predictions` coupons per run, each with **one** fixture (best by EV). Odds stay lower; humans can still create multi-pick coupons via the create-pick flow.

---

## 5. Summary of product impact

| Topic | Before | After |
|------|--------|--------|
| **Gambler goals market** | Over/Under (both) | **Under 2.5 only** (1X2, BTTS unchanged) |
| **Gambler volume** | Up to 999 coupons/day | **Max 2** coupons/day |
| **Single coupons (humans)** | Already allowed (1–20 selections) | Unchanged |
| **Single coupons (AI)** | Only 2-pick accas | **Single-fixture only** (one pick per coupon) |

---

## 6. Optional next steps

- **Tighten further:** Set The Gambler’s `max_daily_predictions` to **1** if you want at most one coupon per day.
- **Over 2.5 specialist:** Keep “Over 2.5 Daily” (OverUnderGuru) as the Over 2.5 specialist; Gambler stays Under 2.5–focused.
- **API key:** Ensure production uses `API_SPORTS_KEY` from env or Admin → Settings; never commit the key.
- **Monitoring:** Watch Gambler’s ROI and volume after these changes; adjust `max_daily_predictions` or bet_types if needed.
