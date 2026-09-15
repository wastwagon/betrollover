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
    "AccaMediumBTTS-2026-08-14.json",
    "AccaMediumBTTS-2026-08-21.json",
    "AccaMediumBTTS-2026-08-28.json",
    "AccaMediumBTTS-2026-09-04.json",
    "AccaMediumBTTS-2026-09-11.json",
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


def score_shape(p: dict) -> str:
    hs, as_ = p.get("homeScore"), p.get("awayScore")
    if hs is None or as_ is None:
        return "unknown"
    try:
        h, a = int(hs), int(as_)
    except (TypeError, ValueError):
        return "unknown"
    if h == 0 and a == 0:
        return "0-0"
    if (h == 0 and a >= 1) or (a == 0 and h >= 1):
        return f"clean-sheet {h}-{a}"
    return f"BTTS {h}-{a}"


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
    print(f"{'bucket':<36} {'n':>4} {'W-L':>8} {'WR':>6} {'avg':>6} {'BE':>6} {'ROI':>8} {'P&L':>8}")
    items = []
    for k, rows in groups.items():
        s = summarize(rows)
        items.append((s["profit"], k, s))
    items.sort()
    for _, k, s in items:
        print(
            f"{k:<36} {s['n']:>4} {s['w']:>3}-{s['l']:<3} {s['wr']:5.1f}% {s['avg']:6.2f} {s['be']:5.1f}% {s['roi']:+7.1f}% {s['profit']:+7.2f}"
        )


def main():
    tickets = load()
    settled = [t for t in tickets if (t.get("result") or "").lower() in ("won", "lost")]
    print("tickets", len(tickets), "settled", len(settled))
    overall = summarize([(t["result"], float(t["totalOdds"])) for t in settled])
    print("OVERALL", overall)
    print("edge pp", round(overall["wr"] - overall["be"], 2))

    by_slot = defaultdict(list)
    by_day = defaultdict(list)
    by_iso = defaultdict(list)
    odds_list = []
    for t in settled:
        o = float(t["totalOdds"])
        odds_list.append(o)
        by_slot[slot_from_title(t.get("title") or "")].append((t["result"], o))
        dd = desk_day(t.get("title") or "", t.get("createdAt") or "")
        by_day[dd].append(t)
        by_iso[datetime.fromisoformat(dd).isocalendar().week].append((t["result"], o))
    group_print("SLOT", by_slot)
    group_print("ISO WEEK", {f"W{k}": v for k, v in sorted(by_iso.items())})
    odds_list.sort()
    print("odds min/med/max", round(odds_list[0], 3), round(odds_list[len(odds_list)//2], 3), round(odds_list[-1], 3))
    print("desk days", len(by_day), ">2 slips", sum(1 for v in by_day.values() if len(v) > 2),
          "avg", round(sum(len(v) for v in by_day.values()) / max(len(by_day), 1), 2),
          "max", max((len(v) for v in by_day.values()), default=0))

    by_bucket = defaultdict(list)
    by_leg_bucket = defaultdict(list)
    by_shape = defaultdict(int)
    lost_legs = []
    wins = []

    for t in settled:
        picks = t.get("picks") or []
        buckets = [bucket_match(p.get("matchDescription") or "") for p in picks]
        ticket_bucket = "Youth / U23 / Reserves" if any(b.startswith("Youth") for b in buckets) else (
            "Women" if any(b == "Women" for b in buckets) else (
                buckets[0] if len(set(buckets)) == 1 else "Mixed"
            )
        )
        by_bucket[ticket_bucket].append((t["result"], float(t["totalOdds"])))
        for p, b in zip(picks, buckets):
            by_leg_bucket[b].append((p.get("result"), float(p.get("odds") or 0)))
            shape = score_shape(p)
            if (p.get("result") or "").lower() == "lost":
                kind = "0-0" if shape == "0-0" else ("clean-sheet" if shape.startswith("clean-sheet") else shape)
                by_shape[kind] += 1
                lost_legs.append({
                    "slot": slot_from_title(t.get("title") or ""),
                    "bucket": b,
                    "match": p.get("matchDescription"),
                    "score": f"{p.get('homeScore')}-{p.get('awayScore')}",
                    "shape": kind,
                    "odds": float(p.get("odds") or 0),
                })
        if (t.get("result") or "").lower() == "won":
            wins.append({
                "odds": float(t["totalOdds"]),
                "slot": slot_from_title(t.get("title") or ""),
                "legs": [p.get("matchDescription") for p in picks],
            })

    group_print("TICKET QUALITY", by_bucket)
    group_print("LEG QUALITY", by_leg_bucket)
    print("\n=== Lost BTTS shapes ===")
    for k, n in sorted(by_shape.items(), key=lambda kv: -kv[1]):
        print(f"  {n:3d}  {k}")

    print("\n=== WINS (top 12 by odds) ===")
    for w in sorted(wins, key=lambda x: -x["odds"])[:12]:
        print(f"  {w['odds']:5.2f} {w['slot']:<10} {w['legs']}")

    print("\n=== Lost matches ===")
    for x in lost_legs:
        print(f"  {x['slot']:<10} {x['score']:<7} {x['shape']:<12} {x['bucket']:<28} {x['odds']:.2f} {x['match']}")

    def cf(pred, label):
        keep = [t for t in settled if pred(t)]
        s = summarize([(t["result"], float(t["totalOdds"])) for t in keep])
        print(f"CF {label:<44} n={s['n']:3d} WR={s['wr']:5.1f}% ROI={s['roi']:+6.1f}% P&L={s['profit']:+7.2f}")

    print("\n=== COUNTERFACTUALS ===")
    cf(lambda t: True, "as published")
    cf(lambda t: slot_from_title(t.get("title") or "") != "Midnight", "no Midnight")
    cf(lambda t: slot_from_title(t.get("title") or "") not in ("Evening", "Midnight"), "no Evening+Midnight")
    cf(lambda t: slot_from_title(t.get("title") or "") in ("Early", "Afternoon"), "Early+Afternoon")
    cf(lambda t: slot_from_title(t.get("title") or "") == "Afternoon", "Afternoon only")
    cf(lambda t: slot_from_title(t.get("title") or "") == "Evening", "Evening only")
    cf(lambda t: not any(bucket_match(p.get("matchDescription") or "").startswith("Youth") for p in t.get("picks") or []), "no Youth")
    cf(lambda t: float(t["totalOdds"]) <= 4.10, "combined <= 4.10")
    cf(lambda t: float(t["totalOdds"]) <= 4.20, "combined <= 4.20")
    cf(lambda t: 3.50 <= float(t["totalOdds"]) <= 4.20, "3.50-4.20")

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
    buckets = [(0, 3.2, "<3.20"), (3.2, 3.7, "3.20-3.70"), (3.7, 4.1, "3.70-4.10"), (4.1, 4.5, "4.10-4.50"), (4.5, 99, ">4.50")]
    for lo, hi, lab in buckets:
        rows = [(t["result"], float(t["totalOdds"])) for t in settled if lo <= float(t["totalOdds"]) < hi]
        if not rows:
            continue
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

    run = max_lose = 0
    for d in days:
        for t in sorted(by_day[d], key=lambda x: x.get("createdAt") or ""):
            if (t.get("result") or "").lower() == "lost":
                run += 1
                max_lose = max(max_lose, run)
            else:
                run = 0
    print("max lose run", max_lose)

    print("\n=== SLOT x QUALITY ===")
    mix = defaultdict(lambda: defaultdict(list))
    for t in settled:
        picks = t.get("picks") or []
        youth = any(bucket_match(p.get("matchDescription") or "").startswith("Youth") for p in picks)
        mix[slot_from_title(t.get("title") or "")]["Youth" if youth else "Other"].append((t["result"], float(t["totalOdds"])))
    for s in ["Early", "Afternoon", "Evening", "Midnight", "Unknown"]:
        for k, rows in mix[s].items():
            print(f"  {s:<10} {k:<8}", summarize(rows))

    legs = []
    for t in settled:
        for p in t.get("picks") or []:
            legs.append(float(p.get("odds") or 0))
    legs.sort()
    print("\nleg odds n", len(legs), "min", legs[0], "p10", legs[len(legs)//10], "med", legs[len(legs)//2], "p90", legs[int(len(legs)*0.9)], "max", legs[-1])


if __name__ == "__main__":
    main()
