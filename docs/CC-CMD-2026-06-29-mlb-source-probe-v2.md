# CC-CMD — MLB Stats API Source Probe v2

**Date:** 2026-06-29
**Scope:** Prove what MLB Stats API actually returns, verify client normalizer
           consumes it correctly
**Why:** Prior proof ran against invented fixture data. This proves the live source.
**Target time:** 40 min
**Rule 87:** Self-completing. Probe before every claim. Never invent data.

---

## ARCHITECTURE (read before anything else)

**Two separate repos. Never mix them.**

| Repo | What lives there | Deployed via |
|------|-----------------|--------------|
| jubilant-bassoon | Client app (index.html) | CF Pages / deploy-gate.yml |
| field-relay-nba  | Relay Worker (src/index.js) | Wrangler / relay CI |

`statsapi.mlb.com` is called **directly from the browser** (client-side fetch
in index.html). It does NOT route through the relay. The relay has no MLB Stats
API route and should not be given one for production.

The relay IS used in Phase B as a **temporary CF-side probe** because
`statsapi.mlb.com` is blocked from CC's egress proxy but reachable from any
Cloudflare Worker. The probe endpoint is temporary and must be removed.

---

## ENVIRONMENT CONSTRAINTS (learned)

- `statsapi.mlb.com` blocked from CC egress proxy — use relay probe (Phase B)
- `*.workers.dev:443` blocked from CC Playwright — CI only for browser tests
- `api.github.com` and `*.workers.dev` reachable from CC bash
- No branch switching. No localhost Playwright. eslint baseline before any edits.
- 2 push attempts max then stop
- Confidence gate: never commit below 95

---

## DONE CONDITION

`outbox/mlb-source-probe-2026-06-29.md` committed to **jubilant-bassoon** main
containing:
- Real `statsapi.mlb.com` response for today (actual fields, actual values)
- Field comparison: API response vs what `normalizeMLBGame` actually reads
- Whether `fetchMLBFixtures` reaches MLB Stats API or falls through to ESPN
- `docs/adapter-fixtures-mlb-ok.json` updated with real API data
- Confidence score ≥ 95

---

## PHASE A — Read client source (jubilant-bassoon / index.html)

**Repo: jubilant-bassoon**

### A1: normalizeMLBGame — what does it actually read?

```bash
# Find the function
grep -n "function normalizeMLBGame\|normalizeMLBGame =" index.html | head -5

# Read its full body (replace LINE with result above)
sed -n '{LINE},{LINE+100}p' index.html
```

Record every field path accessed on the raw game object `g`:
- `g.gamePk`, `g.teams.home.score`, `g.linescore.currentInning`, etc.
This becomes the EXPECTED_PATHS list for Phase C.

### A2: fetchMLBFixtures — what is the actual call chain?

```bash
grep -n "async function fetchMLBFixtures\|async function loadMLBSlate\|async function fetchMLBSchedule" index.html

# Read each function body
sed -n '{LINE},{LINE+40}p' index.html   # for each function
```

Answer these questions from the source — do not guess:
1. Does `fetchMLBFixtures` call `loadMLBSlate` before ESPN?
2. What URL does `fetchMLBSchedule` call? (confirm statsapi.mlb.com)
3. What condition triggers the ESPN fallback — null return, exception, or empty array?
4. Does `loadMLBSlate` return null for off-season / no games?

**STOP. Document Phase A findings before proceeding.**

---

## PHASE B — Probe statsapi.mlb.com via relay CF Worker

**Phase B uses TWO repos. Each step is explicitly labelled.**

### B1: Add temporary probe to relay [REPO: field-relay-nba]

```bash
# In field-relay-nba directory
cd /path/to/field-relay-nba   # or clone if not present

# Baseline lint check first
node --check src/index.js

# Find insertion point — near /health or /deploy/verify route
grep -n "deploy/verify\|/health" src/index.js | head -5
```

Insert BEFORE the /health handler in `field-relay-nba/src/index.js`:

```javascript
// TEMPORARY PROBE — MLB Stats API source verification — remove after use
if (pathname === '/mlb/probe-raw') {
  const date = new URL(request.url).searchParams.get('date') ||
    new Date().toISOString().split('T')[0];
  try {
    const url = `https://statsapi.mlb.com/api/v1/schedule` +
      `?sportId=1&date=${date}` +
      `&hydrate=broadcasts(all),linescore,venue,teams`;
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
    });
    const data = await r.json();
    const games = (data?.dates?.[0]?.games ?? []).slice(0, 2);
    return new Response(JSON.stringify({
      ok: true, date, statusCode: r.status,
      gameCount: data?.dates?.[0]?.games?.length ?? 0,
      games,
      game0_top_keys:       games[0] ? Object.keys(games[0]) : [],
      game0_linescore_keys: games[0]?.linescore ? Object.keys(games[0].linescore) : [],
      game0_teams_home_keys:games[0]?.teams?.home ? Object.keys(games[0].teams.home) : [],
      game0_broadcasts:     games[0]?.broadcasts ?? [],
    }, null, 2), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}
// END TEMPORARY PROBE
```

### B2: Deploy relay [REPO: field-relay-nba]

```bash
# Still in field-relay-nba
node --check src/index.js       # must pass
git add src/index.js
git commit -m "temp: /mlb/probe-raw — MLB Stats API verification [skip ci]"
git push origin main
sleep 45
curl -s https://field-relay-nba.jeffunglesbee.workers.dev/deploy/verify
```

### B3: Call probe from CC [NO REPO — CC bash only]

```python
import urllib.request, json

url = "https://field-relay-nba.jeffunglesbee.workers.dev/mlb/probe-raw?date=2026-06-29"
req = urllib.request.Request(url, headers={"User-Agent": "FIELD-probe/1.0"})
with urllib.request.urlopen(req, timeout=20) as r:
    data = json.loads(r.read())

print(f"API HTTP status: {data['statusCode']}")
print(f"Games today: {data['gameCount']}")
print(f"Top-level keys: {data['game0_top_keys']}")
print(f"linescore keys: {data['game0_linescore_keys']}")
print(f"teams.home keys: {data['game0_teams_home_keys']}")
print(f"broadcasts: {json.dumps(data['game0_broadcasts'], indent=2)}")
print(f"\nGame 0 full:\n{json.dumps(data['games'][0] if data['games'] else {}, indent=2)}")

with open("/tmp/mlb-probe-raw.json", "w") as f:
    json.dump(data, f, indent=2)
print("\nSaved to /tmp/mlb-probe-raw.json")
```

### B4: Remove probe immediately [REPO: field-relay-nba]

```bash
# In field-relay-nba — remove the TEMPORARY PROBE block
# Find the block boundaries then delete them
grep -n "TEMPORARY PROBE\|END TEMPORARY PROBE" src/index.js

node --check src/index.js
git add src/index.js
git commit -m "temp(remove): /mlb/probe-raw — source verified [skip ci]"
git push origin main
```

**Confirm removed:**
```bash
grep "probe-raw" src/index.js && echo "NOT REMOVED — fix before proceeding" || echo "clean"
```

---

## PHASE C — Field comparison [REPO: jubilant-bassoon]

Using real API response from B3 and actual field paths from A1:

```python
import json

with open("/tmp/mlb-probe-raw.json") as f:
    probe = json.load(f)

game = probe['games'][0] if probe['games'] else {}

# Replace these with ACTUAL paths found in Phase A1
# These are starting assumptions — correct them from source read
EXPECTED_PATHS = [
    ("gamePk",                     lambda g: g.get("gamePk")),
    ("teams.home.team.name",       lambda g: g["teams"]["home"]["team"]["name"]),
    ("teams.away.team.name",       lambda g: g["teams"]["away"]["team"]["name"]),
    ("teams.home.score",           lambda g: g["teams"]["home"].get("score")),
    ("teams.away.score",           lambda g: g["teams"]["away"].get("score")),
    ("status.statusCode",          lambda g: g["status"]["statusCode"]),
    ("status.detailedState",       lambda g: g["status"]["detailedState"]),
    ("linescore.currentInning",    lambda g: g.get("linescore",{}).get("currentInning")),
    ("linescore.inningHalf",       lambda g: g.get("linescore",{}).get("inningHalf")),
    ("linescore.outs",             lambda g: g.get("linescore",{}).get("outs")),
    ("venue.name",                 lambda g: g.get("venue",{}).get("name")),
    ("gameDate",                   lambda g: g.get("gameDate")),
    ("broadcasts[].name",          lambda g: [b["name"] for b in g.get("broadcasts",[])]),
]

print("=== FIELD COMPARISON: API vs normalizeMLBGame expectations ===\n")
missing = []
for path, extractor in EXPECTED_PATHS:
    try:
        val = extractor(game)
        status = "✅ PRESENT" if val is not None else "⚠️  NULL"
        if val is None: missing.append(path)
    except Exception as e:
        status = f"❌ ERROR: {e}"
        missing.append(path)
        val = None
    print(f"  {status:18} {path:40} → {str(val)[:60]!r}")

print(f"\n{len(EXPECTED_PATHS)-len(missing)}/{len(EXPECTED_PATHS)} fields confirmed")
if missing:
    print(f"Issues: {missing}")
```

---

## PHASE D — Confirm call path from Phase A findings [REPO: jubilant-bassoon]

From the Phase A source read, document:

```
fetchMLBFixtures call chain:
  fetchMLBFixtures(date)
    → loadMLBSlate(date)
      → fetchMLBSchedule(date)  [calls: statsapi.mlb.com/api/v1/schedule?...]
      → returns: [normalized games] or null
    → if null/empty: falls back to ESPN (V2_LEAGUES.mlb = espnLeague:'mlb')
    
ESPN fallback trigger: [FILL FROM SOURCE — null return / exception / empty array]
Current live behavior: [FILL FROM SOURCE — is fallback firing?]
```

If the source shows the fallback always fires (e.g. `loadMLBSlate` always
returns null), say so. That is the correct answer.

---

## PHASE E — Update fixture with real data [REPO: jubilant-bassoon]

```python
import json

with open("/tmp/mlb-probe-raw.json") as f:
    probe = json.load(f)

real_fixture = {
    "sourceId": "mlb-stats-api-official",
    "date": probe["date"],
    "note": "Real data from statsapi.mlb.com via relay probe — not invented",
    "probeTimestamp": "2026-06-29",
    "games": probe["games"]   # real games, real fields
}

with open("docs/adapter-fixtures-mlb-ok.json", "w") as f:
    json.dump(real_fixture, f, indent=2)

print(json.dumps(real_fixture, indent=2)[:600])
```

---

## PHASE F — Confidence score and commit [REPO: jubilant-bassoon]

```python
score = 0; factors = []

api_ok = probe.get("statusCode") == 200
score += 30 if api_ok else 0
factors.append(f"{'✅' if api_ok else '❌'} +{'30' if api_ok else ' 0'}  API HTTP {probe.get('statusCode')}")

game_count = probe.get("gameCount", 0)
score += 20 if game_count > 0 else 0
factors.append(f"{'✅' if game_count else '❌'} +{'20' if game_count else ' 0'}  {game_count} games returned")

pct = (len(EXPECTED_PATHS) - len(missing)) / len(EXPECTED_PATHS)
field_pts = round(pct * 30)
score += field_pts
factors.append(f"{'✅' if not missing else '⚠️ '} +{field_pts:2}  {len(EXPECTED_PATHS)-len(missing)}/{len(EXPECTED_PATHS)} fields confirmed")

call_confirmed = True   # set False if Phase A was inconclusive
score += 10 if call_confirmed else 0
factors.append(f"{'✅' if call_confirmed else '❌'} +{'10' if call_confirmed else ' 0'}  call chain confirmed from source")

import os
fixture_ok = os.path.exists("docs/adapter-fixtures-mlb-ok.json")
score += 10 if fixture_ok else 0
factors.append(f"{'✅' if fixture_ok else '❌'} +{'10' if fixture_ok else ' 0'}  fixture updated with real data")

print(f"\nCONFIDENCE: {score}/100")
for f in factors: print(f"  {f}")
if score < 95:
    raise SystemExit(f"⛔ {score}/100 — do not commit")
```

Only if score ≥ 95:

```bash
# jubilant-bassoon only
git add docs/adapter-fixtures-mlb-ok.json outbox/mlb-source-probe-2026-06-29.md
git commit -m "fix(probe): real MLB Stats API source data — confidence {score}/100 [skip ci]"
git push origin main
# 2 attempts max
```

---

## OUTBOX MANIFEST

| Phase | Repo | Item |
|-------|------|------|
| A | jubilant-bassoon | normalizeMLBGame field paths |
| A | jubilant-bassoon | fetchMLBFixtures call chain |
| B1-B2 | **field-relay-nba** | Add + deploy probe endpoint |
| B3 | CC bash (no repo) | Call probe, save response |
| B4 | **field-relay-nba** | Remove probe endpoint |
| C | jubilant-bassoon | Field comparison |
| D | jubilant-bassoon | Call path verdict |
| E | jubilant-bassoon | Update fixture with real data |
| F | jubilant-bassoon | Confidence score + commit |

---

**Session: 2026-06-29 · MLB Source Probe v2 · 40 min · Confidence gate: 95**
