#!/usr/bin/env python3
from __future__ import annotations

import json
import math
import os
import re
from collections import defaultdict
from datetime import datetime

BASE = "/Users/OceanCyber/Downloads/BetRolloverNew/.tmp-accasafe"
FILES = [
    "AccaSafeDC-2026-08-14.json",
    "AccaSafeDC-2026-08-21.json",
    "AccaSafeDC-2026-08-28.json",
    "AccaSafeDC-2026-09-04.json",
    "AccaSafeDC-2026-09-11.json",
]


def slot_from_title(title: str) -> str:
    m = re.search(r"·\s*(Early|Afternoon|Evening|Midnight)\s*·", title or "", re.I)
    return m.group(1).title() if m else "Unknown"


def desk_day(title: str, created: str) -> str:
    m = re.search(r"(\d{4}-\d{2}-\d{2})\s*$", title or "")
    return m.group(1) if m else (created or "")[:10]


def pnl(result: str, odds: float) -> float:
    r = (result or "").lower()
    if r == "won":
        return odds - 1
    if r == "lost":
        return -1.0
    return 0.0


YOUTH_RE = re.compile(r"\b(u23|u21|u20|u19|u18|res\.|reserves)\b", re.I)
WOMEN_RE = re.compile(r"\bW\b|women", re.I)


def bucket_match(desc: str) -> str:
    d = (desc or "").lower()
    sides = re.split(r"\s+vs\.?\s+", d)
    if YOUTH_RE.search(d) or any(s.strip().endswith(" ii") for s in sides):
        return "Youth / U23 / Reserves"
    if WOMEN_RE.search(d):
        return "Women"
    return "Other"


def dc_label(key: str, pred: str = "") -> str:
    k = (key or "").lower()
    p = (pred or "").lower()
    if k == "home_draw" or "1x" in p or "home or draw" in p:
        return "1X"
    if k == "draw_away" or "x2" in p or "draw or away" in p:
        return "X2"
    if k == "home_away" or "12" in p or "home or away" in p:
        return "12"
    return k or pred or "?"


def load():
    seen = {}
    for fn in FILES:
        d = json.load(open(os.path.join(BASE, fn)))
        for c in d.get("archived_coupons") or []:
            seen[c["id"]] = c
        for c in d.get("marketplace_coupons") or []:
            if (c.get("result") or "").lower() in ("won", "lost", "void"):
                seen[c["id"]] = c
    return list(seen.values())


def summarize(rows, stake=1.0):
    w = l = v = 0
    profit = 0.0
    odds_sum = 0.0
    n_odds = 0
    for r, o in rows:
        rr = (r or "").lower()
        if rr == "won":
            w += 1
            profit += (o - 1) * stake
        elif rr == "lost":
            l += 1
            profit -= stake
        else:
            v += 1
        if o:
            odds_sum += o
            n_odds += 1
    n = w + l
    wr = 100 * w / n if n else 0
    avg = odds_sum / n_odds if n_odds else 0
    be = 100 / avg if avg else 0
    roi = 100 * profit / (n * stake) if n else 0
    return dict(n=n, w=w, l=l, v=v, wr=wr, avg=avg, be=be, roi=roi, profit=profit)


def group_print(title, groups):
    print(f"\n=== {title} ===")
    print(f"{'bucket':<40} {'n':>4} {'W-L':>8} {'WR':>6} {'avg':>6} {'BE':>6} {'ROI':>8} {'P&L':>8}")
    items = []
    for k, rows in groups.items():
        s = summarize(rows)
        items.append((s["profit"], k, s))
    items.sort()
    for _, k, s in items:
        print(
            f"{k:<40} {s['n']:>4} {s['w']:>3}-{s['l']:<3} {s['wr']:5.1f}% {s['avg']:6.2f} {s['be']:5.1f}% {s['roi']:+7.1f}% {s['profit']:+7.2f}"
        )


def ticket_mix(t):
    keys = sorted(dc_label(p.get("outcomeKey") or "", p.get("prediction") or "") for p in t.get("picks") or [])
    return "+".join(keys)


def youth(t):
    return any(bucket_match(p.get("matchDescription") or "").startswith("Youth") for p in t.get("picks") or [])


def has_12(t):
    return any(dc_label(p.get("outcomeKey") or "", p.get("prediction") or "") == "12" for p in t.get("picks") or [])


def stacked_same(t):
    keys = [dc_label(p.get("outcomeKey") or "", p.get("prediction") or "") for p in t.get("picks") or []]
    return len(keys) == 2 and keys[0] == keys[1]


def main():
    tickets = load()
    settled = [t for t in tickets if (t.get("result") or "").lower() in ("won", "lost")]
    print("tickets", len(tickets), "settled", len(settled))
    overall = summarize([(t["result"], float(t["totalOdds"])) for t in settled])
    print("OVERALL", overall)
    print("edge pp", round(overall["wr"] - overall["be"], 2))
    if settled and settled[0].get("picks"):
        print("pick sample keys", sorted(settled[0]["picks"][0].keys()))
        print("sample", json.dumps(settled[0]["picks"][0], indent=2)[:600])

    by_slot = defaultdict(list)
    by_day = defaultdict(list)
    by_iso = defaultdict(list)
    by_mix = defaultdict(list)
    by_leg = defaultdict(list)
    by_bucket = defaultdict(list)
    odds_list = []
    lost_legs = []
    wins = []

    for t in settled:
        o = float(t["totalOdds"])
        odds_list.append(o)
        by_slot[slot_from_title(t.get("title") or "")].append((t["result"], o))
        dd = desk_day(t.get("title") or "", t.get("createdAt") or "")
        by_day[dd].append(t)
        by_iso[datetime.fromisoformat(dd).isocalendar().week].append((t["result"], o))
        by_mix[ticket_mix(t)].append((t["result"], o))
        buckets = [bucket_match(p.get("matchDescription") or "") for p in t.get("picks") or []]
        ticket_bucket = "Youth / U23 / Reserves" if any(b.startswith("Youth") for b in buckets) else (
            "Women" if any(b == "Women" for b in buckets) else "Other"
        )
        by_bucket[ticket_bucket].append((t["result"], o))
        for p in t.get("picks") or []:
            lab = dc_label(p.get("outcomeKey") or "", p.get("prediction") or "")
            by_leg[lab].append((p.get("result"), float(p.get("odds") or 0)))
            if (p.get("result") or "").lower() == "lost":
                lost_legs.append({
                    "slot": slot_from_title(t.get("title") or ""),
                    "dc": lab,
                    "bucket": bucket_match(p.get("matchDescription") or ""),
                    "match": p.get("matchDescription"),
                    "score": f"{p.get('homeScore')}-{p.get('awayScore')}",
                    "odds": float(p.get("odds") or 0),
                })
        if (t.get("result") or "").lower() == "won":
            wins.append({
                "odds": o,
                "slot": slot_from_title(t.get("title") or ""),
                "mix": ticket_mix(t),
                "legs": [p.get("matchDescription") for p in t.get("picks") or []],
            })

    group_print("SLOT", by_slot)
    group_print("ISO WEEK", {f"W{k}": v for k, v in sorted(by_iso.items())})
    group_print("TICKET MIX", by_mix)
    group_print("LEG DC", by_leg)
    group_print("TICKET QUALITY", by_bucket)
    odds_list.sort()
    print("odds min/med/max", round(odds_list[0], 3), round(odds_list[len(odds_list)//2], 3), round(odds_list[-1], 3))
    print("desk days", len(by_day), ">2 slips", sum(1 for v in by_day.values() if len(v) > 2),
          "avg", round(sum(len(v) for v in by_day.values()) / max(len(by_day), 1), 2),
          "max", max((len(v) for v in by_day.values()), default=0))

    print("\n=== Lost DC counts ===")
    by_lost = defaultdict(int)
    for x in lost_legs:
        by_lost[f"{x['slot']}|{x['dc']}|{x['bucket']}"] += 1
    for k, n in sorted(by_lost.items(), key=lambda kv: -kv[1]):
        print(f"  {n:3d}  {k}")

    print("\n=== Lost matches ===")
    for x in lost_legs:
        print(f"  {x['slot']:<10} {x['dc']:<3} {x['score']:<5} {x['odds']:.2f} {x['bucket']:<28} {x['match']}")

    def cf(pred, label):
        keep = [t for t in settled if pred(t)]
        s = summarize([(t["result"], float(t["totalOdds"])) for t in keep])
        print(f"CF {label:<48} n={s['n']:3d} WR={s['wr']:5.1f}% avg={s['avg']:.2f} BE={s['be']:5.1f}% ROI={s['roi']:+6.1f}% P&L={s['profit']:+7.2f}")

    print("\n=== COUNTERFACTUALS ===")
    cf(lambda t: True, "as published")
    cf(lambda t: slot_from_title(t.get("title") or "") != "Midnight", "no Midnight")
    cf(lambda t: slot_from_title(t.get("title") or "") not in ("Evening", "Midnight"), "no Evening+Midnight")
    cf(lambda t: slot_from_title(t.get("title") or "") in ("Early", "Afternoon"), "Early+Afternoon")
    cf(lambda t: slot_from_title(t.get("title") or "") == "Afternoon", "Afternoon only")
    cf(lambda t: slot_from_title(t.get("title") or "") == "Evening", "Evening only")
    cf(lambda t: not youth(t), "no Youth")
    cf(lambda t: not has_12(t), "no 12 legs")
    cf(lambda t: not stacked_same(t), "no stacked same DC")
    cf(lambda t: not youth(t) and not has_12(t), "no Youth no 12")
    cf(lambda t: not youth(t) and slot_from_title(t.get("title") or "") not in ("Evening", "Midnight"), "no Youth Early+Aft")
    cf(lambda t: ticket_mix(t) == "X2+X2", "X2+X2 only")
    cf(lambda t: ticket_mix(t) == "1X+1X", "1X+1X only")
    cf(lambda t: "X2" in ticket_mix(t) and "1X" not in ticket_mix(t) and "12" not in ticket_mix(t), "X2-only tickets")
    cf(lambda t: float(t["totalOdds"]) <= 2.50, "combined <= 2.50")
    cf(lambda t: 2.20 <= float(t["totalOdds"]) <= 2.50, "2.20-2.50")

    first2, extra = [], []
    for ts in by_day.values():
        ts_sorted = sorted(ts, key=lambda t: t.get("createdAt") or "")
        for i, t in enumerate(ts_sorted):
            row = (t["result"], float(t["totalOdds"]))
            (first2 if i < 2 else extra).append(row)
    print("\n=== CADENCE ===")
    print("first 2", summarize(first2))
    print("3rd+", summarize(extra) if extra else "none")

    print("\n=== ODDS BUCKETS ===")
    for lo, hi, lab in [(0, 2.10, "<2.10"), (2.10, 2.30, "2.10-2.30"), (2.30, 2.50, "2.30-2.50"), (2.50, 2.80, "2.50-2.80"), (2.80, 99, ">2.80")]:
        rows = [(t["result"], float(t["totalOdds"])) for t in settled if lo <= float(t["totalOdds"]) < hi]
        if rows:
            print(f"  {lab:<12}", summarize(rows))

    days = sorted(by_day)
    eq = peak = 0.0
    max_dd = 0.0
    series = []
    for d in days:
        day_p = sum(pnl(t["result"], float(t["totalOdds"])) for t in by_day[d])
        eq += day_p
        peak = max(peak, eq)
        max_dd = min(max_dd, eq - peak)
        series.append((d[5:], round(eq, 2), len(by_day[d]), round(day_p, 2)))
        print(series[-1])
    print("peak", round(peak, 2), "maxDD", round(max_dd, 2), "end", round(eq, 2))
    print("DAYS", [s[0] for s in series])
    print("UNITS", [s[1] for s in series])

    xs = [pnl(t["result"], float(t["totalOdds"])) for t in settled]
    n = len(xs)
    mean = sum(xs) / n
    var = sum((x - mean) ** 2 for x in xs) / (n - 1)
    se = math.sqrt(var / n)
    print("t-stat", round(mean / se, 2), "mean", round(mean, 4))

    win_profits = sorted([float(t["totalOdds"]) - 1 for t in settled if (t.get("result") or "").lower() == "won"], reverse=True)
    print("top 5 win units", [round(x, 2) for x in win_profits[:5]], "share", round(sum(win_profits[:5]) / sum(win_profits) * 100, 1) if win_profits else 0)

    print("\n=== SLOT x MIX ===")
    mix = defaultdict(lambda: defaultdict(list))
    for t in settled:
        mix[slot_from_title(t.get("title") or "")][ticket_mix(t)].append((t["result"], float(t["totalOdds"])))
    for s in ["Early", "Afternoon", "Evening", "Midnight", "Unknown"]:
        for k, rows in mix[s].items():
            print(f"  {s:<10} {k:<8}", summarize(rows))

    print("\n=== SLOT x YOUTH ===")
    for s in ["Early", "Afternoon", "Evening", "Midnight"]:
        for lab, pred in [("other", lambda t, s=s: slot_from_title(t.get("title") or "") == s and not youth(t)),
                         ("youth", lambda t, s=s: slot_from_title(t.get("title") or "") == s and youth(t))]:
            rows = [(t["result"], float(t["totalOdds"])) for t in settled if pred(t)]
            if rows:
                print(f"  {s:<10} {lab:<6}", summarize(rows))

    print("\n=== WINS top ===")
    for w in sorted(wins, key=lambda x: -x["odds"])[:10]:
        print(f"  {w['odds']:5.2f} {w['slot']:<10} {w['mix']:<10} {w['legs']}")

    legs = []
    for t in settled:
        for p in t.get("picks") or []:
            legs.append(float(p.get("odds") or 0))
    legs.sort()
    print("\nleg odds n", len(legs), "min", legs[0], "p10", legs[len(legs)//10], "med", legs[len(legs)//2], "p90", legs[int(len(legs)*0.9)], "max", legs[-1])


if __name__ == "__main__":
    main()
