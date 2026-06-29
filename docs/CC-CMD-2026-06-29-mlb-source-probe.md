# CC-CMD — MLB Stats API Source Probe

**Date:** 2026-06-29
**Scope:** Prove what MLB Stats API actually returns, verify FIELD consumes it correctly
**Why:** Prior proof ran against invented fixture data. This proves the live source.
**Target time:** 40 min
**Rule 87:** Self-completing. Probe before every claim. Never invent data.

---

## ENVIRONMENT CONSTRAINTS (learned)

- `statsapi.mlb.com` is blocked from CC egress proxy (403 confirmed)
- `*.workers.dev:443` is blocked from CC Playwright (ERR_TUNNEL_CONNECTION_FAILED)
- GitHub Actions CI runners CAN reach both
- Relay CF Worker CAN fetch `statsapi.mlb.com` (public URL, no CF egress restriction)
- `api.github.com` and `*.workers.dev` are reachable from CC bash
- Confidence gate: never commit below 95
- No branch switching. No localhost Playwright. eslint baseline before any code edits.
- Feature branch push: 2 attempts max then stop

---

## DONE CONDITION

File `outbox/mlb-source-probe-2026-06-29.md` committed to main containing:
- Actual `statsapi.mlb.com` response for today (real fields, real values)
- Field-by-field comparison: API response vs `normalizeMLBGame` expectations
- Verdict on each expected field: PRESENT / MISSING / WRONG PATH
- Whether `fetchMLBFixtures` actually reaches MLB Stats API or falls through to ESPN
- Updated `docs/adapter-fixtures-mlb-ok.json` with real API data
- Confidence score ≥ 95 with breakdown

If any expected field is MISSING or WRONG PATH: report it. Do not paper over it.

---

## PHASE A — Read actual source code (never write before reading)

### A1: Read normalizeMLBGame from index.html

```bash
# Find the function and read its full body
grep -n "function normalizeMLBGame\|normalizeMLBGame = " index.html | head -5
# Then read 100 lines from that line number:
# sed -n '{LINE},{LINE+100}p' index.html
```

Extract and document:
- Every field path it reads from the raw API object `g`
  (e.g. `g.teams.home.score`, `g.linescore.currentInning`, `g.broadcasts`)
- Every field it writes to the normalized output
- The exact source trail assignment

### A2: Read fetchMLBFixtures and loadMLBSlate

```bash
grep -n "async function fetchMLBFixtures\|async function loadMLBSlate\|async function fetchMLBSchedule" index.html
# Then read each function body
```

Document:
- Does fetchMLBFixtures call loadMLBSlate first?
- What condition triggers the ESPN fallback?
- Is the fallback `null`, empty array, or exception?
- What URL does fetchMLBSchedule actually call?

### A3: Read relay src/index.js for MLB route

```bash
grep -n "mlb\|MLB\|statsapi\|baseball" src/index.js | head -30
```

Document:
- Does the relay have a `/mlb` route?
- Does it call `statsapi.mlb.com` or ESPN?
- What is `V2_LEAGUES.mlb` set to?

**STOP after Phase A. Document findings before proceeding. If normalizeMLBGame
reads fields that don't exist on the real API, Phase B will surface them.**

---

## PHASE B — Probe live MLB Stats API via relay CF Worker

The relay can fetch `statsapi.mlb.com`. Add a temporary probe endpoint,
deploy it, call it from CC, then remove it.

### B1: Add probe endpoint to relay src/index.js

Find the existing `/health` or `/deploy/verify` route block.
Insert BEFORE it (so it's easy to find and remove):

```javascript
// TEMPORARY PROBE — remove after source verification
if (pathname === '/mlb/probe-raw' && request.method === 'GET') {
  const date = new URL(request.url).searchParams.get('date') || 
    new Date().toISOString().split('T')[0];
  try {
    const url = `https://statsapi.mlb.com/api/v1/schedule` +
      `?sportId=1&date=${date}` +
      `&hydrate=broadcasts(all),linescore,venue,teams`;
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json'
      }
    });
    const data = await r.json();
    const games = data?.dates?.[0]?.games ?? [];
    return new Response(JSON.stringify({
      ok: true,
      date,
      statusCode: r.status,
      gameCount: games.length,
      // Return first 2 games in full — don't truncate
      games: games.slice(0, 2),
      // Also return the raw shape of game[0] keys for field mapping
      game0_keys: games[0] ? Object.keys(games[0]) : [],
      game0_linescore_keys: games[0]?.linescore ? Object.keys(games[0].linescore) : [],
      game0_broadcasts: games[0]?.broadcasts ?? [],
      game0_teams_home_keys: games[0]?.teams?.home ? Object.keys(games[0].teams.home) : [],
    }, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
// END TEMPORARY PROBE
```

### B2: Deploy relay

```bash
# node --check src/index.js  ← must pass before commit
node --check src/index.js
git add src/index.js
git commit -m "temp: /mlb/probe-raw — MLB Stats API source verification [skip ci]"
git push origin main
# Wait for deploy
sleep 45
curl -s https://field-relay-nba.jeffunglesbee.workers.dev/deploy/verify
```

### B3: Call probe from CC and capture full response

```python
import urllib.request, json

url = "https://field-relay-nba.jeffunglesbee.workers.dev/mlb/probe-raw?date=2026-06-29"
req = urllib.request.Request(url, headers={"User-Agent": "FIELD-probe/1.0"})
with urllib.request.urlopen(req, timeout=20) as r:
    data = json.loads(r.read())

print(f"Date: {data['date']}")
print(f"API status: {data['statusCode']}")
print(f"Games today: {data['gameCount']}")
print(f"\ngame[0] top-level keys: {data['game0_keys']}")
print(f"game[0].linescore keys: {data['game0_linescore_keys']}")
print(f"game[0].teams.home keys: {data['game0_teams_home_keys']}")
print(f"\nBroadcasts: {json.dumps(data['game0_broadcasts'], indent=2)}")
print(f"\nFull game[0]: {json.dumps(data['games'][0] if data['games'] else {}, indent=2)}")

# Save for Phase C
with open("/tmp/mlb-probe-raw.json", "w") as f:
    json.dump(data, f, indent=2)
```

### B4: Remove probe endpoint immediately after

```bash
# Remove the TEMPORARY PROBE block from src/index.js
# (find "TEMPORARY PROBE" comment, delete to "END TEMPORARY PROBE")
grep -n "TEMPORARY PROBE\|END TEMPORARY PROBE" src/index.js

node --check src/index.js
git add src/index.js
git commit -m "temp(remove): /mlb/probe-raw — source verified [skip ci]"
git push origin main
```

**Do not leave the probe endpoint deployed.**

---

## PHASE C — Field-by-field comparison

Using the real API response from `/tmp/mlb-probe-raw.json` and the
normalizeMLBGame source from Phase A, compare every field:

```python
import json

with open("/tmp/mlb-probe-raw.json") as f:
    probe = json.load(f)

game = probe['games'][0] if probe['games'] else {}

# These are the fields normalizeMLBGame is expected to read
# (populated from Phase A source read — replace with ACTUAL paths found)
EXPECTED_PATHS = [
    ("gamePk",                    lambda g: g.get("gamePk")),
    ("teams.home.team.name",      lambda g: g.get("teams",{}).get("home",{}).get("team",{}).get("name")),
    ("teams.away.team.name",      lambda g: g.get("teams",{}).get("away",{}).get("team",{}).get("name")),
    ("teams.home.score",          lambda g: g.get("teams",{}).get("home",{}).get("score")),
    ("teams.away.score",          lambda g: g.get("teams",{}).get("away",{}).get("score")),
    ("status.statusCode",         lambda g: g.get("status",{}).get("statusCode")),
    ("status.detailedState",      lambda g: g.get("status",{}).get("detailedState")),
    ("linescore.currentInning",   lambda g: g.get("linescore",{}).get("currentInning")),
    ("linescore.inningHalf",      lambda g: g.get("linescore",{}).get("inningHalf")),
    ("linescore.outs",            lambda g: g.get("linescore",{}).get("outs")),
    ("venue.name",                lambda g: g.get("venue",{}).get("name")),
    ("gameDate",                  lambda g: g.get("gameDate")),
    ("broadcasts[].name",         lambda g: [b.get("name") for b in g.get("broadcasts",[])][:3]),
]

print("=== FIELD COMPARISON ===\n")
results = []
for path, extractor in EXPECTED_PATHS:
    try:
        val = extractor(game)
        status = "✅ PRESENT" if val is not None else "⚠️  NULL"
        results.append((path, status, val))
    except Exception as e:
        status = "❌ ERROR"
        results.append((path, status, str(e)))
    print(f"  {status:12} {path:40} = {val!r}")

missing = [r for r in results if "NULL" in r[1] or "ERROR" in r[1]]
print(f"\n{len(EXPECTED_PATHS) - len(missing)}/{len(EXPECTED_PATHS)} fields present")
if missing:
    print(f"Issues: {[r[0] for r in missing]}")

# IMPORTANT: If Phase A found different field paths in normalizeMLBGame,
# update EXPECTED_PATHS above to match what the code ACTUALLY reads.
# The goal is to compare the real API against what the code expects —
# not against our assumptions.
```

---

## PHASE D — Verify fetchMLBFixtures call path

After comparing fields, verify whether the live app is actually calling
MLB Stats API or falling through to ESPN for every request:

```bash
# Add one console.log to fetchMLBFixtures to trace the path
# ONLY if Phase A shows the fallback condition is not obvious from source

# Alternative: check relay logs / analytics for mlb-stats calls
# (Workers Analytics Engine or CF dashboard)
```

**If source read from Phase A clearly shows the fallback condition,
document it without adding code.**

---

## PHASE E — Update fixture with real data

Replace the invented `docs/adapter-fixtures-mlb-ok.json` with real
game data from the probe:

```python
import json

with open("/tmp/mlb-probe-raw.json") as f:
    probe = json.load(f)

# Use first 2 games from real API — one live/final, one pregame if available
real_fixture = {
    "sourceId": "mlb-stats-api-official",
    "date": probe["date"],
    "probeTimestamp": probe.get("probeTimestamp", "2026-06-29"),
    "note": "Real data from statsapi.mlb.com — not invented",
    "games": probe["games"][:2]
}

with open("docs/adapter-fixtures-mlb-ok.json", "w") as f:
    json.dump(real_fixture, f, indent=2)

print("Updated adapter-fixtures-mlb-ok.json with real data")
print(json.dumps(real_fixture, indent=2)[:500])
```

---

## PHASE F — Confidence scoring and commit

```python
score   = 0
factors = []

# Factor 1: MLB Stats API returned HTTP 200 (30 pts)
api_ok = probe.get("statusCode") == 200
score += 30 if api_ok else 0
factors.append(f"{'✅' if api_ok else '❌'} +{'30' if api_ok else ' 0'}  MLB Stats API returned HTTP {probe.get('statusCode')}")

# Factor 2: Games returned for today (20 pts)
game_count = probe.get("gameCount", 0)
score += 20 if game_count > 0 else 0
factors.append(f"{'✅' if game_count > 0 else '❌'} +{'20' if game_count > 0 else ' 0'}  {game_count} games returned for today")

# Factor 3: All expected fields present in real response (30 pts, 2pt each)
present = len(EXPECTED_PATHS) - len(missing)
field_pts = min(30, present * 2)
score += field_pts
factors.append(f"{'✅' if not missing else '⚠️ '} +{field_pts:2}  {present}/{len(EXPECTED_PATHS)} expected fields present in real API response")

# Factor 4: normalizeMLBGame source read — call path confirmed (10 pts)
# (set to True if Phase A conclusively showed the call chain)
call_path_confirmed = True  # update from Phase A findings
score += 10 if call_path_confirmed else 0
factors.append(f"{'✅' if call_path_confirmed else '❌'} +{'10' if call_path_confirmed else ' 0'}  fetchMLBFixtures call path confirmed from source")

# Factor 5: Real fixture written (10 pts)
import os
fixture_updated = os.path.exists("docs/adapter-fixtures-mlb-ok.json")
score += 10 if fixture_updated else 0
factors.append(f"{'✅' if fixture_updated else '❌'} +{'10' if fixture_updated else ' 0'}  adapter-fixtures-mlb-ok.json updated with real data")

print(f"\n{'='*50}")
print(f"CONFIDENCE SCORE: {score}/100")
print(f"{'='*50}")
for f in factors:
    print(f"  {f}")

if score < 95:
    print("\n⛔ BELOW 95 — DO NOT COMMIT. Investigate failures above first.")
    raise SystemExit(f"Confidence {score}/100")
else:
    print(f"\n✅ PASS — commit results")
```

Commit only if score ≥ 95:

```bash
git add docs/adapter-fixtures-mlb-ok.json
git commit -m "fix(fixtures): replace invented MLB ok fixture with real statsapi.mlb.com data [skip ci]"
# Write and commit outbox report
git add outbox/mlb-source-probe-2026-06-29.md
git commit -m "docs(outbox): MLB source probe results 2026-06-29 — confidence {score}/100 [skip ci]"
git push origin main
# 2 attempts max — if both fail, report and stop
```

---

## OUTBOX MANIFEST

| Item | Owner |
|------|-------|
| Read normalizeMLBGame source (Phase A) | CC |
| Read fetchMLBFixtures call chain (Phase A) | CC |
| Read relay MLB route (Phase A) | CC |
| Add probe endpoint to relay (Phase B) | CC |
| Deploy relay + call probe (Phase B) | CC |
| Remove probe endpoint (Phase B) | CC |
| Field-by-field comparison (Phase C) | CC |
| Verify call path (Phase D) | CC |
| Update fixture with real data (Phase E) | CC |
| Confidence score ≥ 95 (Phase F) | CC |
| Commit results (Phase F) | CC |

---

## WHAT SUCCESS LOOKS LIKE

`outbox/mlb-source-probe-2026-06-29.md` contains:

```
MLB Stats API returned: HTTP 200
Games today: 15

Field comparison:
✅ gamePk: 718900
✅ teams.home.score: 3
✅ teams.away.score: 1
✅ linescore.currentInning: 7
✅ linescore.inningHalf: "Bottom"
✅ linescore.outs: 2
✅ broadcasts[].name: ["ESPN", "NESN"]
...

Call path: fetchMLBFixtures → loadMLBSlate → fetchMLBSchedule → statsapi.mlb.com
Fallback condition: null return from loadMLBSlate (not currently triggering)

adapter-fixtures-mlb-ok.json updated with real game data from 2026-06-29.

Confidence: 100/100
```

If any field is MISSING from the real API: report it. Do not invent a value.
If the call path shows ESPN fallback always fires: report it. That is the answer.

---

**Session: 2026-06-29 · MLB Source Probe · 40 min target · Confidence gate: 95**
