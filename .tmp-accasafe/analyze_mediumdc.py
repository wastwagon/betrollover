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
    "AccaMediumDC-2026-08-14.json",
    "AccaMediumDC-2026-08-21.json",
    "AccaMediumDC-2026-08-28.json",
    "AccaMediumDC-2026-09-04.json",
    "AccaMediumDC-2026-09-11.json",
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

ELITE = {
    "manchester city", "borussia dortmund", "villarreal", "fc porto",
    "real betis", "eintracht frankfurt", "palmeiras", "sao paulo",
    "inter miami", "nashville", "atlanta united", "philadelphia union",
    "minnesota united", "fc dallas", "leon", "toluca", "monterrey",
    "kashiwa reysol", "kashima", "urawa", "kyoto sanga", "gent",
    "oh leuven", "fc lugano", "servette", "hertha", "holstein kiel",
    "heidenheim", "sturm graz", "lask linz", "norwich", "birmingham",
    "midtjylland", "nordsjaelland", "kalmar", "djurgardens", "gwangju",
    "jeju", "fc barcelona", "real madrid", "arsenal", "chelsea",
    "liverpool", "tottenham", "bayern", "psg", "juventus", "inter milan",
    "ac milan", "napoli", "roma", "ajax", "benfica", "sporting",
    "celtic", "rangers", "feyenoord", "psv", "galatasaray", "fenerbahce",
}
LATAM = {
    "aucas", "manta", "emelec", "ldu", "cumbayá", "gualaceo",
    "antofagasta", "cobreloa", "curico", "union espanola", "palestino",
    "coquimbo", "cienciano", "vila nova", "goias", "fortaleza", "avai",
    "paysandu", "brusque", "csa", "nacional", "colegiales", "midland",
    "claypole", "juventud unida", "el porvenir", "the strongest",
    "managua", "guastatoya", "river plate", "argentinos", "botafogo",
    "cuiaba", "alianza", "sport huancayo", "millonarios", "pereira",
}
US_LOWER = {
    "timbers ii", "city ii", "union ii", "crew ii", "hearts of pine",
}
EAST = {
    "meshakhte", "rustavi", "spaeri", "zaqatala", "şimal", "cəbrayıl",
    "moik", "şahdağ", "xankəndi", "səbail", "paok ii", "ellas syros",
}


def bucket_match(desc: str) -> str:
    d = (desc or "").lower()
    sides = d.split(" vs ")
    if YOUTH_RE.search(d) or any(s.strip().endswith(" ii") for s in sides):
        return "Youth / U23 / Reserves"
    if WOMEN_RE.search(d):
        return "Women"
    if any(h in d for h in US_LOWER):
        return "US second / MLS Next Pro"
    if any(h in d for h in EAST):
        return "East Europe / Caucasus lower"
    if any(h in d for h in LATAM):
        return "LATAM"
    if any(h in d for h in ELITE):
        return "Known top / established"
    return "Unclassified pro / other"


def dc_label(key: str) -> str:
    return {
        "home_draw": "1X",
        "draw_away": "X2",
        "home_away": "12",
    }.get(key or "", key or "?")


def is_draw(p: dict) -> bool:
    hs, as_ = p.get("homeScore"), p.get("awayScore")
    if hs is None or as_ is None:
        return False
    return hs == as_


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
        dt = datetime.fromisoformat(dd)
        by_iso[dt.isocalendar().week].append((t["result"], o))
    group_print("SLOT", by_slot)
    group_print("ISO WEEK", {f"W{k}": v for k, v in sorted(by_iso.items())})
    odds_list.sort()
    print("odds min/med/max", odds_list[0], odds_list[len(odds_list)//2], odds_list[-1])
    print("desk days", len(by_day), ">2 slips", sum(1 for v in by_day.values() if len(v) > 2),
          "avg", round(sum(len(v) for v in by_day.values()) / max(len(by_day), 1), 2),
          "max", max((len(v) for v in by_day.values()), default=0))

    by_combo = defaultdict(list)
    by_leg_dc = defaultdict(list)
    by_bucket = defaultdict(list)
    by_leg_bucket = defaultdict(list)
    lost_legs = []
    wins = []

    for t in settled:
        picks = t.get("picks") or []
        keys = tuple(sorted(dc_label(p.get("outcomeKey") or "") for p in picks))
        by_combo["+".join(keys)].append((t["result"], float(t["totalOdds"])))
        buckets = [bucket_match(p.get("matchDescription") or "") for p in picks]
        ticket_bucket = "Youth / U23 / Reserves" if any(b.startswith("Youth") for b in buckets) else (
            buckets[0] if len(set(buckets)) == 1 else "Mixed quality"
        )
        by_bucket[ticket_bucket].append((t["result"], float(t["totalOdds"])))
        for p, b in zip(picks, buckets):
            by_leg_dc[dc_label(p.get("outcomeKey") or "")].append((p.get("result"), float(p.get("odds") or 0)))
            by_leg_bucket[b].append((p.get("result"), float(p.get("odds") or 0)))
            if (p.get("result") or "").lower() == "lost":
                lost_legs.append({
                    "slot": slot_from_title(t.get("title") or ""),
                    "dc": dc_label(p.get("outcomeKey") or ""),
                    "bucket": b,
                    "match": p.get("matchDescription"),
                    "score": f"{p.get('homeScore')}-{p.get('awayScore')}",
                    "draw": is_draw(p),
                    "odds": float(t["totalOdds"]),
                    "pred": p.get("prediction"),
                })
        if (t.get("result") or "").lower() == "won":
            wins.append({
                "odds": float(t["totalOdds"]),
                "title": t.get("title"),
                "legs": [p.get("matchDescription") for p in picks],
                "dcs": [dc_label(p.get("outcomeKey") or "") for p in picks],
                "slot": slot_from_title(t.get("title") or ""),
            })

    group_print("TICKET DC MIX", by_combo)
    group_print("LEG DC TYPE", by_leg_dc)
    group_print("TICKET QUALITY", by_bucket)
    group_print("LEG QUALITY", by_leg_bucket)

    print("\n=== WINS (all) ===")
    for w in sorted(wins, key=lambda x: -x["odds"]):
        print(f"  {w['odds']:5.2f} {w['slot']:<10} {'+'.join(w['dcs']):<8} {w['legs']}")

    print("\n=== Lost legs ===")
    by_lost = defaultdict(int)
    for x in lost_legs:
        by_lost[f"{x['slot']}|{x['dc']}|{x['bucket']}|draw={x['draw']}"] += 1
    for k, n in sorted(by_lost.items(), key=lambda kv: -kv[1]):
        print(f"  {n:2d}  {k}")
    print("\n=== Lost match list ===")
    for x in lost_legs:
        print(f"  {x['slot']:<10} {x['dc']:<4} {x['score']:<5} {x['bucket']:<32} {x['match']}")

    def cf(pred, label):
        keep = [t for t in settled if pred(t)]
        s = summarize([(t["result"], float(t["totalOdds"])) for t in keep])
        print(f"CF {label:<44} n={s['n']:3d} WR={s['wr']:5.1f}% ROI={s['roi']:+6.1f}% P&L={s['profit']:+7.2f}")

    print("\n=== COUNTERFACTUALS ===")
    cf(lambda t: True, "as published")
    cf(lambda t: slot_from_title(t.get("title") or "") != "Midnight", "no Midnight")
    cf(lambda t: not any(bucket_match(p.get("matchDescription") or "").startswith("Youth") for p in t.get("picks") or []), "no Youth")
    cf(lambda t: not any(dc_label(p.get("outcomeKey") or "") == "12" for p in t.get("picks") or []), "no 12 legs")
    cf(lambda t: len({dc_label(p.get("outcomeKey") or "") for p in t.get("picks") or []}) > 1, "distinct DC keys only")
    cf(lambda t: slot_from_title(t.get("title") or "") in ("Early", "Afternoon"), "Early+Afternoon")
    cf(lambda t: slot_from_title(t.get("title") or "") in ("Evening", "Midnight"), "Evening+Midnight")

    first2, extra = [], []
    for ts in by_day.values():
        ts_sorted = sorted(ts, key=lambda t: t.get("createdAt") or "")
        for i, t in enumerate(ts_sorted):
            row = (t["result"], float(t["totalOdds"]))
            (first2 if i < 2 else extra).append(row)
    print("\n=== CADENCE ===")
    print("first 2", summarize(first2))
    print("3rd+", summarize(extra) if extra else "none")

    days = sorted(by_day)
    eq = 0.0
    series = []
    peak = 0
    max_dd = 0
    lose_run = 0
    max_lose = 0
    # chronological by settlement-ish: desk day then created
    chrono = []
    for d in days:
        for t in sorted(by_day[d], key=lambda x: x.get("createdAt") or ""):
            chrono.append((d, t))
    run = 0
    for d, t in chrono:
        r = (t.get("result") or "").lower()
        if r == "lost":
            run += 1
            max_lose = max(max_lose, run)
        else:
            run = 0
        p = pnl(t["result"], float(t["totalOdds"]))
        eq += p
        peak = max(peak, eq)
        max_dd = min(max_dd, eq - peak)
        series.append((d[5:], round(eq, 2), round(p, 2)))
    print("\n=== EQUITY daily ===")
    day_eq = []
    eq = 0
    peak = 0
    max_dd = 0
    for d in days:
        day_p = sum(pnl(t["result"], float(t["totalOdds"])) for t in by_day[d])
        eq += day_p
        peak = max(peak, eq)
        max_dd = min(max_dd, eq - peak)
        day_eq.append((d[5:], round(eq, 2), len(by_day[d]), round(day_p, 2)))
        print(day_eq[-1])
    print("peak", round(peak, 2), "maxDD", round(max_dd, 2), "end", round(eq, 2), "max lose run", max_lose)

    xs = [pnl(t["result"], float(t["totalOdds"])) for t in settled]
    n = len(xs)
    mean = sum(xs) / n
    var = sum((x - mean) ** 2 for x in xs) / (n - 1)
    se = math.sqrt(var / n)
    print("t-stat", round(mean / se, 2), "mean", round(mean, 4))

    # contribution of biggest wins
    win_profits = sorted([float(t["totalOdds"]) - 1 for t in settled if (t.get("result") or "").lower() == "won"], reverse=True)
    print("top 5 win units", [round(x, 2) for x in win_profits[:5]], "share of gross wins", round(sum(win_profits[:5]) / sum(win_profits) * 100, 1) if win_profits else 0)


if __name__ == "__main__":
    main()
