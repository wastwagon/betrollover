#!/usr/bin/env python3
"""AccaSureDC archive: slots, DC type, quality buckets, draw leaks."""
from __future__ import annotations

import json
import math
import os
import re
from collections import defaultdict
from datetime import datetime, timezone

BASE = "/Users/OceanCyber/Downloads/BetRolloverNew/.tmp-accasafe"
FILES = [
    "AccaSureDC-2026-08-14.json",
    "AccaSureDC-2026-08-21.json",
    "AccaSureDC-2026-08-28.json",
    "AccaSureDC-2026-09-04.json",
    "AccaSureDC-2026-09-15.json" if False else "AccaSureDC-2026-09-11.json",
]


def slot_from_title(title: str) -> str:
    m = re.search(r"·\s*(Early|Afternoon|Evening|Midnight)\s*·", title or "", re.I)
    if m:
        return m.group(1).title()
    return "Unknown"


def desk_day(title: str, created: str) -> str:
    m = re.search(r"(\d{4}-\d{2}-\d{2})\s*$", title or "")
    if m:
        return m.group(1)
    return (created or "")[:10]


def pnl(result: str, odds: float) -> float:
    r = (result or "").lower()
    if r == "won":
        return odds - 1
    if r == "lost":
        return -1.0
    return 0.0


YOUTH_RE = re.compile(
    r"\b(u23|u21|u20|u19|u18|res\.|reserves|\bii\b|iii\b)\b", re.I
)
WOMEN_RE = re.compile(r"\bW\b|women", re.I)

# Known clubs → competition quality / region. Last match wins if both sides map.
ELITE = {
    "manchester city", "borussia dortmund", "villarreal", "fc porto",
    "real betis", "eintracht frankfurt", "fc augsburg", "palmeiras",
    "sao paulo", "inter miami", "nashville sc", "atlanta united",
    "philadelphia union", "minnesota united", "fc dallas", "san diego",
    "leon", "atletico san luis", "toluca", "monterrey", "kashiwa reysol",
    "yokohama f. marinos", "kashima", "urawa", "kyoto sanga",
    "al-ahli jeddah", "al-qadisiyah", "wisla krakow", "jagiellonia",
    "gent", "oh leuven", "fc lugano", "servette", "hertha bsc",
    "holstein kiel", "1. fc heidenheim", "sturm graz", "lask linz",
    "norwich", "birmingham", "york", "swindon town", "port vale",
    "exeter city", "carlisle", "forest green", "midtjylland",
    "nordsjaelland", "kalmar", "djurgardens", "gwangju", "jeju united",
}
LATAM = {
    "river plate", "argentinos", "aucas", "universidad catolica",
    "manta fc", "emelec", "orense", "guayaquil", "ldu de quito",
    "tecnico universitario", "cumbayá", "gualaceo", "union la calera",
    "deportes limache", "antofagasta", "cobreloa", "curico unido",
    "union espanola", "deportes temuco", "santiago wanderers",
    "palestino", "universidad de concepcion", "universidad de chile",
    "coquimbo", "cienciano", "atletico torque", "sport huancayo",
    "sport boys", "alianza atletico", "utc cajamarca", "juan pablo",
    "alianza lima", "vila nova", "goias", "fortaleza", "avai",
    "paysandu", "brusque", "csa", "nacional am", "colegiales",
    "midland", "atletico mitre", "chaco for ever", "gimnasia y tiro",
    "tristan suarez", "claypole", "central ballester", "juventud unida",
    "el porvenir", "deportivo camioneros", "argentino quilmes",
    "universitario de vinto", "the strongest", "managua", "diriangén",
    "suchitepéquez", "guastatoya",
}
US_LOWER = {
    "portland timbers ii", "st. louis city ii", "philadelphia union ii",
    "columbus crew ii", "portland hearts of pine", "alta",
}
EAST_EURO_LOWER = {
    "meshakhte", "rustavi", "spaeri", "zaqatala", "baku sportinq",
    "şimal", "cəbrayıl", "moik", "şahdağ", "xankəndi", "səbail",
    "paok ii", "olympiakos piraeus ii", "ellas syros", "apollon pontou",
    "esenler erokspor", "kayserispor", "ska khabarovsk", "metallurg lipetsk",
    "spartak kostroma", "fk neftekhimik",
}
YOUTH_HINT = {
    "vizela u23", "marítimo u23", "moreirense u23", "sporting braga u23",
    "portimonense u23", "felgueiras u23", "estoril u23", "famalicão u23",
    "argentinos juniors res", "river plate res",
}


def bucket_match(desc: str) -> str:
    d = (desc or "").lower()
    if YOUTH_RE.search(d) or any(h in d for h in YOUTH_HINT):
        return "Youth / U23 / Reserves"
    if WOMEN_RE.search(d):
        return "Women"
    if any(h in d for h in US_LOWER):
        return "US second / MLS Next Pro"
    if any(h in d for h in EAST_EURO_LOWER):
        return "East Europe / Caucasus lower"
    if any(h in d for h in LATAM):
        return "LATAM (AR/BR/CL/EC/PE/MX/GT)"
    if any(h in d for h in ELITE):
        return "Known top / established"
    return "Unclassified pro / other"


def dc_label(key: str) -> str:
    return {
        "home_draw": "1X (home or draw)",
        "draw_away": "X2 (draw or away)",
        "home_away": "12 (no draw)",
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
            f"{k:<36} {s['n']:>4} {s['w']:>3}-{s['l']:<3} {s['wr']:5.1f}% {s['avg']:6.3f} {s['be']:5.1f}% {s['roi']:+7.1f}% {s['profit']:+7.2f}"
        )


def main():
    tickets = load()
    settled = [t for t in tickets if (t.get("result") or "").lower() in ("won", "lost")]
    voided = [t for t in tickets if (t.get("result") or "").lower() == "void"]
    print("tickets", len(tickets), "settled", len(settled), "void", len(voided))

    overall = summarize([(t["result"], float(t["totalOdds"])) for t in settled])
    print("OVERALL", overall)
    print("break-even WR needed", round(overall["be"], 2), "observed", round(overall["wr"], 2),
          "edge pp", round(overall["wr"] - overall["be"], 2))

    # slots
    by_slot = defaultdict(list)
    by_day = defaultdict(list)
    by_iso = defaultdict(list)
    for t in settled:
        o = float(t["totalOdds"])
        by_slot[slot_from_title(t.get("title") or "")].append((t["result"], o))
        dd = desk_day(t.get("title") or "", t.get("createdAt") or "")
        by_day[dd].append(t)
        dt = datetime.fromisoformat(dd)
        by_iso[dt.isocalendar().week].append((t["result"], o))
    group_print("SLOT", by_slot)
    group_print("ISO WEEK", {f"W{k}": v for k, v in sorted(by_iso.items())})

    over = sum(1 for d, ts in by_day.items() if len(ts) > 2)
    print("\nDesk days", len(by_day), "days with >2 slips", over,
          "avg slips/day", round(sum(len(v) for v in by_day.values()) / max(len(by_day), 1), 2),
          "max", max(len(v) for v in by_day.values()))

    # DC mix per ticket
    by_combo = defaultdict(list)
    by_leg_dc = defaultdict(list)
    by_bucket = defaultdict(list)
    by_leg_bucket = defaultdict(list)
    draw_12_losses = []
    youth_legs = []
    lost_legs = []

    for t in settled:
        picks = t.get("picks") or []
        keys = tuple(sorted(p.get("outcomeKey") or "?" for p in picks))
        labels = "+".join(dc_label(k).split()[0] for k in keys)
        by_combo[labels].append((t["result"], float(t["totalOdds"])))
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
                    "id": t["id"],
                    "slot": slot_from_title(t.get("title") or ""),
                    "dc": dc_label(p.get("outcomeKey") or ""),
                    "bucket": b,
                    "match": p.get("matchDescription"),
                    "score": f"{p.get('homeScore')}-{p.get('awayScore')}",
                    "draw": is_draw(p),
                    "odds": float(p.get("odds") or 0),
                    "pred": p.get("prediction"),
                })
            if (p.get("outcomeKey") == "home_away" and is_draw(p)
                    and (p.get("result") or "").lower() == "lost"):
                draw_12_losses.append(p.get("matchDescription"))
            if bucket_match(p.get("matchDescription") or "").startswith("Youth"):
                youth_legs.append((p.get("result"), float(p.get("odds") or 0), p.get("matchDescription")))

    group_print("TICKET DC MIX", by_combo)
    group_print("LEG DC TYPE", by_leg_dc)
    group_print("TICKET QUALITY BUCKET", by_bucket)
    group_print("LEG QUALITY BUCKET", by_leg_bucket)

    print("\n=== 12 (no-draw) legs lost to an actual draw ===")
    print("count", len(draw_12_losses))
    for m in draw_12_losses:
        print(" ", m)

    print("\n=== Lost legs detail ===")
    by_lost = defaultdict(int)
    for x in lost_legs:
        key = f"{x['slot']}|{x['dc']}|{x['bucket']}|draw={x['draw']}"
        by_lost[key] += 1
    for k, n in sorted(by_lost.items(), key=lambda kv: -kv[1]):
        print(f"  {n:2d}  {k}")

    print("\n=== Lost matches ===")
    for x in lost_legs:
        print(f"  {x['slot']:<10} {x['dc']:<22} {x['score']:<5} {x['bucket']:<32} {x['match']}")

    # counterfactual: drop youth tickets
    def cf(pred, label):
        keep = [t for t in settled if pred(t)]
        s = summarize([(t["result"], float(t["totalOdds"])) for t in keep])
        print(f"CF {label:<40} n={s['n']:3d} WR={s['wr']:5.1f}% ROI={s['roi']:+6.1f}% P&L={s['profit']:+7.2f}")

    print("\n=== COUNTERFACTUALS ===")
    cf(lambda t: True, "as published")
    cf(lambda t: slot_from_title(t.get("title") or "") != "Midnight", "no Midnight")
    cf(lambda t: not any(bucket_match(p.get("matchDescription") or "").startswith("Youth") for p in t.get("picks") or []), "no Youth/U23/Res tickets")
    cf(lambda t: not any(bucket_match(p.get("matchDescription") or "") == "East Europe / Caucasus lower" for p in t.get("picks") or []), "no East-EU lower")
    cf(lambda t: not any((p.get("outcomeKey") == "home_away") for p in t.get("picks") or []), "no 12 (no-draw) legs")
    cf(lambda t: all(bucket_match(p.get("matchDescription") or "") == "Known top / established" for p in t.get("picks") or []), "only known-top both legs")
    cf(lambda t: slot_from_title(t.get("title") or "") in ("Early", "Afternoon"), "Early+Afternoon only")
    cf(lambda t: slot_from_title(t.get("title") or "") != "Midnight" and not any(
        bucket_match(p.get("matchDescription") or "").startswith("Youth") or
        bucket_match(p.get("matchDescription") or "") == "East Europe / Caucasus lower" or
        bucket_match(p.get("matchDescription") or "") == "US second / MLS Next Pro"
        for p in t.get("picks") or []
    ), "no Midnight + no youth/lower/US2")

    # overposting P&L: first 2 vs extras per day
    first2 = []
    extra = []
    for dd, ts in by_day.items():
        ts_sorted = sorted(ts, key=lambda t: t.get("createdAt") or "")
        for i, t in enumerate(ts_sorted):
            row = (t["result"], float(t["totalOdds"]))
            (first2 if i < 2 else extra).append(row)
    print("\n=== CADENCE ===")
    print("first 2 of day", summarize(first2))
    print("3rd+ of day   ", summarize(extra))

    # equity by desk day
    days = sorted(by_day)
    eq = 0.0
    series = []
    peak = 0
    max_dd = 0
    for d in days:
        day_p = sum(pnl(t["result"], float(t["totalOdds"])) for t in by_day[d])
        eq += day_p
        peak = max(peak, eq)
        max_dd = min(max_dd, eq - peak)
        series.append((d[5:], round(eq, 2), len(by_day[d]), day_p))
    print("\n=== EQUITY (last 12 days) ===")
    for row in series[-12:]:
        print(row)
    print("peak", round(peak, 2), "maxDD", round(max_dd, 2), "end", round(eq, 2))

    # t-stat
    xs = [pnl(t["result"], float(t["totalOdds"])) for t in settled]
    n = len(xs)
    mean = sum(xs) / n
    var = sum((x - mean) ** 2 for x in xs) / (n - 1)
    se = math.sqrt(var / n)
    tstat = mean / se if se else 0
    print("\nt-stat vs 0 ROI", round(tstat, 2), "mean", round(mean, 4), "n", n)

    # pending live
    print("\nvoid tickets", len(voided))


if __name__ == "__main__":
    main()
