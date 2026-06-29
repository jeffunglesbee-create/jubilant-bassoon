# CC-CMD — Odds API Adapter Proof Phase 3: Live Odds + Story Verification

**Date:** 2026-06-29
**Repo:** jubilant-bassoon outbox + relay read only
**Scope:** Prove all three visible surfaces: live passthrough + [ODDS STORY] + WC
**Why:** MLB live today (13 games), WC26 NED vs MAR live, WNBA GSV vs NYL has
         opening + closing odds in D1 (confirmed). Three-surface proof.
**Target time:** 25 min
**Confidence gate: 95**

---

## CONFIDENCE GATE

Do not commit outbox unless confidence ≥ 95.
If score < 95 report verbatim and stop. Do not invent results.

---

## DONE CONDITION

outbox/odds-journalism-proof-2026-06-29.md committed with:
- Live MLB odds confirmed: BAL vs CWS h2h/spreads/totals from DraftKings
- Live WC26 odds confirmed: NED vs MAR 3-way h2h
- [ODDS STORY] verified: computeOddsStory(GSV_opening, NYL_closing) matches expectedOddsStory in fixture
- All four confidence factors ≥ threshold

---

## PHASE A: Relay state

```bash
curl -s https://field-relay-nba.jeffunglesbee.workers.dev/deploy/verify
# Expected: deployed 9fc71ac or later, match: true
```

---

## PHASE B: Live MLB odds

```bash
curl -s "https://field-relay-nba.jeffunglesbee.workers.dev/odds/v4/sports/baseball_mlb/odds?markets=h2h,spreads,totals&bookmakers=draftkings" | \
  python3 -c "
import sys, json
games = json.load(sys.stdin)
print(f'MLB games with odds: {len(games)}')
g = games[0]
print(f'Game: {g[\"home_team\"]} vs {g[\"away_team\"]}')
bk = next((b for b in g[\"bookmakers\"] if b[\"key\"]==\"draftkings\"), None)
if bk:
    for m in bk[\"markets\"]:
        print(f'  {m[\"key\"]}: {[(o[\"name\"], o.get(\"price\"), o.get(\"point\")) for o in m[\"outcomes\"]]}')
"
```

Expected: ≥13 MLB games, DraftKings h2h + spreads + totals, BAL ~1.35-1.40 / CWS ~2.90-3.10

---

## PHASE C: Live WC26 odds

```bash
curl -s "https://field-relay-nba.jeffunglesbee.workers.dev/odds/v4/sports/soccer_fifa_world_cup/odds?markets=h2h&bookmakers=draftkings" | \
  python3 -c "
import sys, json
games = json.load(sys.stdin)
print(f'WC games with odds: {len(games)}')
ned = next((g for g in games if 'Netherlands' in g.get('home_team','') or 'Netherlands' in g.get('away_team','')), None)
if ned:
    print(f'NED vs MAR: {ned[\"home_team\"]} vs {ned[\"away_team\"]}')
    bk = next((b for b in ned[\"bookmakers\"] if b[\"key\"]==\"draftkings\"), None)
    if bk:
        h2h = next((m for m in bk[\"markets\"] if m[\"key\"]==\"h2h\"), None)
        if h2h: print(f'  3-way h2h: {[(o[\"name\"], o[\"price\"]) for o in h2h[\"outcomes\"]]}')
"
```

Expected: NED ~2.2-2.5, MAR ~3.1-3.5, Draw ~2.9-3.2
Note: NED vs MAR may be final by the time this runs — any completed WC game is still valid.

---

## PHASE D: [ODDS STORY] verification

Verify computeOddsStory fires correctly with real WNBA D1 data:

```bash
curl -s "https://field-relay-nba.jeffunglesbee.workers.dev/odds/history/wnba-gsv-nyl-2026-06-28" 2>/dev/null || echo "not found"

# Direct D1 query approach — probe via CF MCP (ARCHIVE_DB cc49101c)
# Query: SELECT opening_odds, closing_odds FROM regular_season_games
#        WHERE date='2026-06-28' AND home='Golden State Valkyries'
```

Run computeOddsStory simulation:
```python
import json

opening = {"source":"draftkings","moneyline":{"home":-112,"away":-108},"spread":{"home":-1.5,"away":1.5},"total":{"over":163.5,"under":163.5}}
closing = {"source":"fanduel","moneyline":{"home":100,"away":-128},"total":{"over":151.5,"under":151.5}}

parts = []
diff_ml = closing["moneyline"]["home"] - opening["moneyline"]["home"]
if abs(diff_ml) >= 10:
    direction = "favorite-ward" if diff_ml < 0 else "underdog-ward"
    parts.append(f'ML moved {abs(diff_ml)} pts {direction} (opened {opening["moneyline"]["home"]}, closed {closing["moneyline"]["home"]})')

diff_t = closing["total"]["over"] - opening["total"]["over"]
if abs(diff_t) >= 0.5:
    direction = "over pressure" if diff_t > 0 else "under pressure"
    parts.append(f'Total moved {abs(diff_t):.1f} (opened {opening["total"]["over"]}, closed {closing["total"]["over"]}) — {direction}')

story = "[ODDS STORY] " + ". ".join(parts) + "."
print(story)

expected = "[ODDS STORY] ML moved 212 pts underdog-ward (opened -112, closed 100). Total moved 12.0 (opened 163.5, closed 151.5) — under pressure."
print(f"Match: {story == expected}")
```

Expected output: `[ODDS STORY] ML moved 212 pts underdog-ward (opened -112, closed 100). Total moved 12.0 (opened 163.5, closed 151.5) — under pressure.`

---

## PHASE E: CI log fetch fallback

If relay blocked from CC egress, use CI pattern:

```python
import requests, time, zipfile, io
REPO = "jeffunglesbee-create/jubilant-bassoon"
PAT  = "FIELD_PAT_FROM_MEMORY"
H    = {"Authorization": f"token {PAT}"}

requests.post(
    f"https://api.github.com/repos/{REPO}/actions/workflows/adapter-visible-value.yml/dispatches",
    headers=H, json={"ref": "main"}
)
time.sleep(15)
for i in range(45):
    runs = requests.get(
        f"https://api.github.com/repos/{REPO}/actions/workflows/adapter-visible-value.yml/runs",
        headers=H, params={"per_page": 1}
    ).json()
    run = runs["workflow_runs"][0]
    if run["status"] == "completed": break
    time.sleep(20)

log_resp = requests.get(
    f"https://api.github.com/repos/{REPO}/actions/runs/{run['id']}/logs",
    headers=H, allow_redirects=True
)
with zipfile.ZipFile(io.BytesIO(log_resp.content)) as zf:
    for name in zf.namelist():
        content = zf.read(name).decode("utf-8", errors="replace")
        if "AVV-ODDS" in content or "odds" in content.lower():
            for line in content.split("\n"):
                if any(x in line for x in ["AVV-ODDS", "passed", "failed", "moneyline", "ODDS STORY"]):
                    print(line.strip()[:120])
```

---

## CONFIDENCE SCORING

| Factor | Points | Evidence needed |
|--------|--------|-----------------|
| 1 — Relay deployed 9fc71ac+ | 20 | /deploy/verify match: true |
| 2 — MLB live odds: ≥13 games with h2h+spreads+totals | 25 | Phase B output |
| 3 — WC26 live odds: NED vs MAR 3-way h2h present | 25 | Phase C output |
| 4 — [ODDS STORY] simulation matches expected | 20 | Phase D Python output match: True |
| 5 — D1 has opening + closing for ≥1 completed game | 10 | D1 query or /odds/history |

Score < 95: report which factor failed. Stop. Do not commit.

---

## OUTBOX MANIFEST

| Item | Status |
|------|--------|
| Phase A: deploy verified | ⏳ |
| Phase B: MLB live odds | ⏳ |
| Phase C: WC26 live odds | ⏳ |
| Phase D: [ODDS STORY] simulation match | ⏳ |
| Phase E: CI log fetch (if needed) | ⏳ |
| Confidence score ≥ 95 | ⏳ |
| Write outbox/odds-journalism-proof-2026-06-29.md | ⏳ |
| Commit [skip ci] + push (only if ≥ 95) | ⏳ |

---

**Session: 2026-06-29 · CLIENT + RELAY READ · 25 min · Confidence gate: 95**
