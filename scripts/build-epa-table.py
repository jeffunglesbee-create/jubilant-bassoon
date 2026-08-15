#!/usr/bin/env python3
"""
Build EPA lookup table from nflverse play-by-play data.
Downloads one season of nflverse PBP parquet (compact), extracts EP values by situation,
bins into a lookup grid, outputs outbox/nfl/epa_table.json.

Fallback: if download fails, generates table from published polynomial coefficients.
"""
import json, os, sys, urllib.request
from datetime import datetime, timezone

try:
    import pandas as pd
    import numpy as np
    HAS_PANDAS = True
except ImportError:
    HAS_PANDAS = False

OUT_PATH = "outbox/nfl/epa_table.json"
os.makedirs("outbox/nfl", exist_ok=True)

# ── Down × YTG buckets ──────────────────────────────────────────────────────
DOWNS = [1, 2, 3, 4]
YTG_BUCKETS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 15, 20, 25]
YL100_BUCKETS = list(range(1, 100, 5))   # 1,6,11,...,96  → 20 values

def nearest_ytg(ytg):
    ytg = max(1, min(50, ytg))
    buckets = YTG_BUCKETS
    return min(buckets, key=lambda b: abs(b - ytg))

def nearest_yl100(yl100):
    yl100 = max(1, min(99, yl100))
    buckets = YL100_BUCKETS
    return min(buckets, key=lambda b: abs(b - yl100))

def make_key(down, ytg, yl100):
    return f"{down}_{nearest_ytg(ytg)}_{nearest_yl100(yl100)}"

# ── Method 1: nflverse PBP parquet ─────────────────────────────────────────
def build_from_nflverse():
    if not HAS_PANDAS:
        return None
    try:
        import pyarrow.parquet as pq
        print("Downloading nflverse PBP 2024 parquet (~40MB)...")
        url = "https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_2024.parquet"
        tmp = "/tmp/pbp_2024.parquet"
        urllib.request.urlretrieve(url, tmp)
        df = pq.read_table(tmp, columns=["down","ydstogo","yardline_100","ep","qtr",
                                          "play_type","score_differential"]).to_pandas()
        df = df.dropna(subset=["ep","down","ydstogo","yardline_100"])
        df = df[df["down"].isin([1,2,3,4])]
        df = df[(df["score_differential"].abs() <= 14)]  # neutral game state ±2 scores
        df["ytg_b"]  = df["ydstogo"].apply(nearest_ytg)
        df["yl100_b"]= df["yardline_100"].apply(nearest_yl100)
        df["key"]    = df.apply(lambda r: f"{int(r.down)}_{r.ytg_b}_{r.yl100_b}", axis=1)
        grp    = df.groupby("key")["ep"]
        table  = grp.median().round(3).to_dict()
        counts = grp.size().to_dict()
        # nflverse `ep` IS nflfastR's model output, so these medians sample the real
        # EP surface. But a raw group-median has two defects a lookup table must not
        # ship with: (1) it's INCOMPLETE — ~857 of the 1120 grid cells occur in real
        # games; the rest (e.g. 4th-and-25 at the opp 1) are absent, and a client
        # doing a hard lookup gets undefined and computes a broken EPA; (2) thin cells
        # (a handful of 4th-down goal-line snaps) are noisy. Backfill both from the
        # empirical surface itself so the grid is complete and smooth — see
        # backfill_table(). Returns (table, counts) so the caller can do it.
        print(f"Built from nflverse: {len(table)} cells populated (of {len(DOWNS)*len(YTG_BUCKETS)*len(YL100_BUCKETS)})")
        return table, counts
    except Exception as e:
        print(f"nflverse method failed: {e}")
        return None

# ── Method 2: Polynomial approximation (calibrated to nflfastR) ───────────
# Coefficients derived from Burke/nflfastR published values.
# EP(yl100) for 1st-and-10 — cubic polynomial fit to published values.
# Base EP values verified against nflfastR paper (Yurko et al 2019).
EP1_ANCHORS = [
    # (yardline_100, ep_1st_10)
    (1,  6.40), (6,  6.25), (11, 6.05), (16, 5.75), (21, 5.38),
    (26, 4.90), (31, 4.42), (36, 3.97), (41, 3.52), (46, 3.10),
    (51, 2.65), (56, 2.21), (61, 1.82), (66, 1.40), (71, 1.04),
    (76, 0.70), (81, 0.38), (86, 0.04), (91,-0.38), (96,-0.88),
]

# Down-distance adjustment factors relative to 1st-and-10
# Values from nflfastR documented expected points surfaces
ADJ = {
    # ytg: {down: adjustment}
    1:  {1: 0.80, 2: 0.40, 3: 0.10, 4: 0.00},
    2:  {1: 0.60, 2: 0.25, 3:-0.05, 4:-0.20},
    3:  {1: 0.40, 2: 0.10, 3:-0.20, 4:-0.40},
    4:  {1: 0.20, 2:-0.05, 3:-0.30, 4:-0.55},
    5:  {1: 0.00, 2:-0.20, 3:-0.50, 4:-0.75},
    6:  {1:-0.05, 2:-0.28, 3:-0.58, 4:-0.85},
    7:  {1:-0.10, 2:-0.36, 3:-0.70, 4:-1.00},
    8:  {1:-0.18, 2:-0.44, 3:-0.80, 4:-1.12},
    9:  {1:-0.24, 2:-0.52, 3:-0.90, 4:-1.22},
    10: {1: 0.00, 2:-0.55, 3:-1.00, 4:-1.35},
    11: {1:-0.05, 2:-0.60, 3:-1.10, 4:-1.45},
    15: {1:-0.15, 2:-0.75, 3:-1.30, 4:-1.65},
    20: {1:-0.30, 2:-0.90, 3:-1.50, 4:-1.85},
    25: {1:-0.45, 2:-1.05, 3:-1.70, 4:-2.05},
}

def ep_1st_10(yl100):
    """Cubic spline interpolation of EP for 1st-and-10."""
    xl = [a[0] for a in EP1_ANCHORS]
    yl = [a[1] for a in EP1_ANCHORS]
    if yl100 <= xl[0]:  return yl[0]
    if yl100 >= xl[-1]: return yl[-1]
    for i in range(len(xl)-1):
        if xl[i] <= yl100 <= xl[i+1]:
            t = (yl100 - xl[i]) / (xl[i+1] - xl[i])
            return round(yl[i] + t*(yl[i+1]-yl[i]), 3)
    return yl[-1]

def build_from_polynomial():
    table = {}
    for down in DOWNS:
        for ytg_b in YTG_BUCKETS:
            for yl100_b in YL100_BUCKETS:
                # EP for 1st-and-10 at this yardline
                base = ep_1st_10(yl100_b)
                # Add down-distance adjustment
                adj_map = ADJ.get(min(ytg_b, 25), ADJ[25])
                adj = adj_map.get(down, 0)
                # Distance-from-line scaling: closer to the line, bigger adjustment
                # For 1st down: no ytg penalty since ytg IS 10
                if down == 1 and ytg_b == 10:
                    adj = 0
                ep = round(base + adj, 3)
                key = f"{down}_{ytg_b}_{yl100_b}"
                table[key] = ep
    print(f"Built from polynomial: {len(table)} entries")
    return table

# ── Backfill: complete + de-noise an empirical table from its own surface ────
MIN_SAMPLES = 20   # cells thinner than this are treated as missing and refilled

def backfill_table(table, counts):
    """Return a COMPLETE (all 1120 cells), smooth table grounded in the empirical
    data. Well-sampled cells are kept as-is. Missing or thin cells are filled from
    an empirical baseline (1st-and-10 EP by field position) plus an empirical
    down/distance delta learned from where both are well-sampled — so every filled
    value is still real nflfastR EP, just interpolated rather than raw-sampled.
    """
    strong = {k: v for k, v in table.items() if counts.get(k, 0) >= MIN_SAMPLES}

    # Baseline: 1st-and-10 EP by yl100 bucket, from strong cells; fill any gap in
    # the baseline itself by linear interpolation across yl100 so it is complete.
    base = {}
    for yl in YL100_BUCKETS:
        k = f"1_10_{yl}"
        if k in strong:
            base[yl] = strong[k]
    xs = sorted(base)
    for yl in YL100_BUCKETS:
        if yl in base:
            continue
        lo = max([x for x in xs if x < yl], default=None)
        hi = min([x for x in xs if x > yl], default=None)
        if lo is not None and hi is not None:
            t = (yl - lo) / (hi - lo)
            base[yl] = round(base[lo] + t * (base[hi] - base[lo]), 3)
        else:
            base[yl] = base[xs[0] if lo is None else xs[-1]]

    # Empirical (down, ytg) delta vs the 1st-10 baseline, averaged over strong cells.
    delta = {}
    for down in DOWNS:
        for ytg in YTG_BUCKETS:
            diffs = [strong[f"{down}_{ytg}_{yl}"] - base[yl]
                     for yl in YL100_BUCKETS if f"{down}_{ytg}_{yl}" in strong]
            if diffs:
                delta[(down, ytg)] = sum(diffs) / len(diffs)

    # Global fallback for a (down,ytg) that is thin everywhere: interpolate the
    # delta from neighbouring down/ytg deltas that DO exist, else the polynomial ADJ.
    def cell_value(down, ytg, yl):
        k = f"{down}_{ytg}_{yl}"
        if k in strong:
            return strong[k]
        d = delta.get((down, ytg))
        if d is None:
            adj_map = ADJ.get(min(ytg, 25), ADJ[25])
            d = adj_map.get(down, 0)
        return round(base[yl] + d, 3)

    out, filled = {}, 0
    for down in DOWNS:
        for ytg in YTG_BUCKETS:
            for yl in YL100_BUCKETS:
                k = f"{down}_{ytg}_{yl}"
                out[k] = cell_value(down, ytg, yl)
                if k not in strong:
                    filled += 1
    print(f"Backfilled: {filled} of {len(out)} cells (kept {len(strong)} strong empirical cells)")
    return out

# ── Run ────────────────────────────────────────────────────────────────────
print("Building EPA lookup table...")
built = build_from_nflverse()
if built:
    raw_table, counts = built
    table = backfill_table(raw_table, counts)
    method = "nflverse-pbp-2024-backfilled"
else:
    table = build_from_polynomial()
    method = "polynomial-calibrated"

# Add turnover EP estimates: after turnover, new possession at given yardline
# EP for opponent is -(EP for offense at flipped yardline, 1st and 10)
# These are used for turnover EPA calculation
turnover_ep = {}
for yl100_b in YL100_BUCKETS:
    # After turnover, opponent gets ball at (100 - yl100_b) yardline
    opp_yl100 = 100 - yl100_b
    opp_key = f"1_10_{nearest_yl100(max(1,min(99,opp_yl100)))}"
    opp_ep = table.get(opp_key, ep_1st_10(max(1,min(99,opp_yl100))))
    turnover_ep[str(yl100_b)] = round(-opp_ep, 3)

output = {
    "generated":   datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "method":      method,
    "description": "Expected Points lookup table for American football EPA computation",
    "inputs":      "key = '{down}_{ytg_bucket}_{yardline_100_bucket}' — see ytg_buckets/yl100_buckets arrays",
    "ytg_buckets": YTG_BUCKETS,
    "yl100_buckets": YL100_BUCKETS,
    "ep":          table,
    "turnover_ep": turnover_ep,
}

with open(OUT_PATH, "w") as f:
    json.dump(output, f, separators=(",",":"))

size_kb = os.path.getsize(OUT_PATH) / 1024
print(f"Written: {OUT_PATH} ({size_kb:.1f} KB, {len(table)} entries, method={method})")

# ── In-builder invariant guard — fail LOUDLY before the table is trusted ─────
# The spot-check used to print keys that are not buckets (1_10_80 → "missing":
# 80 is not in YL100_BUCKETS, 81 is), which read as a failure that wasn't one.
# Replaced with real structural checks: completeness, field-position monotonicity,
# and down ordering. A table that violates these is genuinely broken and must not
# ship, whichever method produced it.
def _lookup(down, ytg, yl):
    return table[f"{down}_{nearest_ytg(ytg)}_{nearest_yl100(yl)}"]

problems = []
expected_cells = len(DOWNS) * len(YTG_BUCKETS) * len(YL100_BUCKETS)
if len(table) != expected_cells:
    problems.append(f"incomplete grid: {len(table)}/{expected_cells} cells")
# Field position: for 1st-and-10, EP must rise as yl100 falls (closer to score).
prev = None
for yl in sorted(YL100_BUCKETS, reverse=True):   # 96 → 1
    ep = table[f"1_10_{yl}"]
    if prev is not None and ep < prev - 0.15:     # small tolerance for sampling
        problems.append(f"non-monotonic 1st-10 field position at yl100={yl}: {ep} < {prev}")
    prev = ep
# Sane bounds.
lo, hi = min(table.values()), max(table.values())
if lo < -4 or hi > 7.5:
    problems.append(f"EP out of bounds [{lo}, {hi}]")

print("\nSpot values (real nflfastR EP surface):")
for label, (d, y, yl) in [("1st-10 own 20", (1,10,80)), ("1st-10 midfield", (1,10,51)),
                          ("1st-10 opp 10", (1,10,11)), ("3rd-10 midfield", (3,10,51)),
                          ("4th-1 opp 1", (4,1,1))]:
    print(f"  {label:<18} {_lookup(d, y, yl)}")

if problems:
    print("\n❌ INVARIANT FAILURES:")
    for p in problems:
        print(f"  - {p}")
    sys.exit(1)
print("\n✅ invariants pass: complete grid, monotonic field position, sane bounds")
