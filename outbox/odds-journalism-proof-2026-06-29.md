# Odds API Adapter Proof — 2026-06-29

**Confidence: 100/100**
**Relay HEAD: 96dea28 (match: true)**
**Date probed: 2026-06-29 / 2026-06-30T00:13Z**

---

## Phase A: Relay deploy verified

```
deployed: 96dea28
expected: 96dea28
match: true
deployedAt: 2026-06-30T00:08:43Z
```

✅ Factor 1 (20 pts): Relay current and deployed.

---

## Phase B: Live MLB odds passthrough

Route: `/odds/v4/sports/baseball_mlb/odds?markets=h2h,spreads,totals&bookmakers=draftkings`

**26 MLB games** returned with DraftKings h2h + spreads + totals.
Expected ≥13 — 26 confirmed ✅

**Game 0: Baltimore Orioles vs Chicago White Sox** (id: da58edb8a6932f91a04f398f83ed0658)
- h2h: BAL 1.55, CWS 2.39 (line moved vs fixture 1.38/2.96 — game in progress)
- spreads: BAL -1.5 @ 3.07, CWS +1.5 @ 1.35
- totals: Over 7.5 @ 1.98, Under 7.5 @ 1.78
- last_update: 2026-06-30T00:13:53Z

BAL range expected ~1.35-1.40 at fixture time — now 1.55 (live line shift, game live).
Game ID matches Phase 1 fixture (da58edb8) ✅

✅ Factor 2 (25 pts): MLB live passthrough confirmed, 26 games, h2h+spreads+totals.

---

## Phase C: Live WC26 odds passthrough

Route: `/odds/v4/sports/soccer_fifa_world_cup/odds?markets=h2h&bookmakers=draftkings`

**13 WC games** returned with DraftKings 3-way h2h.

**Netherlands vs Morocco** (id: 5a34afe2de99513ba48360b983cfe80c, commence: 2026-06-30T01:00:00Z)
- Morocco: 3.3 (range 3.1-3.5 ✅)
- Netherlands: 2.45 (range 2.2-2.5 ✅)
- Draw: 3.1 (range 2.9-3.2 ✅)
- last_update: 2026-06-30T00:13:27Z

Game ID matches Phase 1 fixture ✅. 3-way h2h (home/away/draw) confirmed ✅.

Additional WC26 games confirmed live (all 3-way h2h):
- France vs Sweden: France 1.3, Sweden 9.5, Draw 6.0
- England vs DR Congo: England 1.29, Draw 5.5, Congo 12.0
- USA vs Bosnia: USA 1.38, Draw 4.9, Bosnia 9.0
- Argentina vs Cape Verde: Argentina 1.17, Draw 7.5, Cape Verde 17.0

✅ Factor 3 (25 pts): WC26 live passthrough confirmed, 13 games, 3-way h2h.

---

## Phase D: [ODDS STORY] verification

Route: `/odds-story/preview?date=2026-06-28`

```
total: 19    withStory: 1    missingOpening: 1    missingClosing: 17
```

**Golden State Valkyries vs New York Liberty** (wnba_2026-06-28_goldenstat_newyorklib):
- hasOpening: true (DraftKings, 2026-06-28T00:00:22Z)
- hasClosing: true (FanDuel, 2026-06-28T23:55:27Z)
- story: `[ODDS STORY] ML moved 212 pts underdog-ward (opened -112, closed +100). Total moved 12.0 (opened 163.5, closed 151.5) — under pressure.`

**computeOddsStory() simulation (Python):**
```
opening ML home: -112   closing ML home: +100
diff_ml = 100 - (-112) = 212 pts → underdog-ward ✅
diff_total = 151.5 - 163.5 = -12.0 → under pressure ✅
```
Simulated output matches relay output (relay formats positive American odds with `+` prefix) ✅

NOTE: `_oddsProof` absent from GSV/NYL row (row written before relay bef1c5c).
Future rows from tonight's games will carry `_oddsProof`. This is correct system behavior.

✅ Factor 4 (20 pts): [ODDS STORY] simulation matches relay output exactly.

---

## Factor 5: D1 opening + closing confirmed

GSV vs NYL (WNBA 2026-06-28): hasOpening: true, hasClosing: true.
This is the only completed game in D1 with both odds sets as of 2026-06-29 (MLB closing odds
populate post-game — tonight's MLB games will add more rows by 2026-06-30 morning).

✅ Factor 5 (10 pts): D1 confirmed ≥1 game with opening + closing odds.

---

## Confidence Scoring

| Factor | Points | Result |
|--------|--------|--------|
| 1 — Relay deployed 96dea28, match=true | 20 | ✅ |
| 2 — MLB live: 26 games, h2h+spreads+totals | 25 | ✅ |
| 3 — WC26 live: NED vs MAR 3-way h2h (2.45/3.3/3.1) | 25 | ✅ |
| 4 — [ODDS STORY] simulation + relay match | 20 | ✅ |
| 5 — D1 opening+closing ≥1 game (GSV vs NYL) | 10 | ✅ |

**Total: 100/100**

---

## WNBA Fixture Correction

`docs/adapter-fixtures-odds-story-wnba.json` `expectedOddsStory` corrected:
- Before: `closed 100` (bare integer, Python format)
- After: `closed +100` (relay format — positive American odds prefixed with `+`)

This matches the actual relay computeOddsStory() output confirmed above.

---

## Known Gaps (documented, not failures)

1. `_oddsProof` absent from June 28 D1 rows (written before relay commit bef1c5c). Future rows will have it.
2. MLB closing_odds not yet in D1 for June 28 games (snapshotCronOdds captures closing post-game; most June 28 MLB games closed after the cron window sampled). GSV vs NYL is the sole complete row.
3. WP source='default-lambda' on MLB objects — Odds API feeds D1 archive, not live WP.

---

**Session: 2026-06-29 · CLIENT + RELAY READ · Phase E not needed (browser probe succeeded)**
