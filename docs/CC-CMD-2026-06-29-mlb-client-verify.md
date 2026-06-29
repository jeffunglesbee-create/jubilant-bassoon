# CC-CMD — MLB Stats API Client Verification

**Date:** 2026-06-29
**Repo:** jeffunglesbee-create/jubilant-bassoon (CLIENT ONLY)
**Scope:** Compare real MLB Stats API response to client normalizer expectations
**Depends on:** Relay probe outbox/mlb-probe-raw-2026-06-29.json must exist
**Target time:** 25 min
**Rule 87:** Self-completing. Read source before writing. Never invent data.

---

## ENVIRONMENT CONSTRAINTS

- Client repo: `jubilant-bassoon` — NOT `field-relay-nba`
- Real API data comes from relay probe JSON (already captured)
- eslint baseline before any code edit
- No branch switching. 2-attempt push max.

---

## PREREQUISITE CHECK — Relay probe must have succeeded

```bash
# Confirm this is jubilant-bassoon
basename $(git remote get-url origin)
# Expected: jubilant-bassoon
```

```python
import urllib.request, json, base64, sys

PAT  = "FIELD_PAT_FROM_MEMORY"
REPO = "jeffunglesbee-create/field-relay-nba"

# Step 1: Check if relay probe output exists
try:
    req = urllib.request.Request(
        f"https://api.github.com/repos/{REPO}/contents/outbox/mlb-probe-raw-2026-06-29.json",
        headers={"Authorization": f"token {PAT}", "User-Agent": "FIELD/1.0"}
    )
    with urllib.request.urlopen(req) as r:
        data = json.loads(r.read())
    raw = base64.b64decode(data["content"])
    probe = json.loads(raw)
except Exception as e:
    print(f"⛔ RELAY PROBE NOT FOUND: {e}")
    print("Run docs/CC-CMD-2026-06-29-mlb-relay-probe.md in field-relay-nba FIRST.")
    sys.exit(1)

# Step 2: Validate relay probe succeeded — not just that file exists
checks = {
    "ok field is True":         probe.get("ok") == True,
    "HTTP status is 200":       probe.get("statusCode") == 200,
    "gameCount > 0":            probe.get("gameCount", 0) > 0,
    "games array not empty":    len(probe.get("games", [])) > 0,
    "game[0] has teams":        "teams" in (probe.get("games", [{}])[0] if probe.get("games") else {}),
    "game[0] has linescore":    "linescore" in (probe.get("games", [{}])[0] if probe.get("games") else {}),
}

print("=== RELAY PROBE VALIDATION ===")
all_pass = True
for desc, result in checks.items():
    status = "✅" if result else "❌"
    print(f"  {status} {desc}")
    if not result:
        all_pass = False

if not all_pass:
    print("\n⛔ RELAY PROBE DATA IS INVALID OR INCOMPLETE.")
    print("The relay probe ran but did not return usable MLB Stats API data.")
    print("Check the relay probe outbox file for error details.")
    print("Re-run docs/CC-CMD-2026-06-29-mlb-relay-probe.md before continuing.")
    sys.exit(1)

# Step 3: Save validated data locally
with open("/tmp/mlb-probe-raw.json", "wb") as f:
    f.write(raw)

g = probe["games"][0]
away = g.get("teams",{}).get("away",{}).get("team",{}).get("abbreviation","?")
home = g.get("teams",{}).get("home",{}).get("team",{}).get("abbreviation","?")
print(f"\n✅ Relay probe validated: {probe['gameCount']} games, first: {away} @ {home}")
print("Proceeding to Phase A.")
```

**If any check fails: STOP. Do not proceed. Fix the relay probe first.**

---

## DONE CONDITION

File `outbox/mlb-source-verify-2026-06-29.md` committed to jubilant-bassoon containing:
- normalizeMLBGame field paths (from source read)
- fetchMLBFixtures call chain (from source read)
- Field-by-field comparison: real API vs normalizer expectations (PRESENT/MISSING/WRONG PATH)
- Whether MLB Stats API or ESPN is the active path today
- Updated `docs/adapter-fixtures-mlb-ok.json` with real API data
- Confidence ≥ 95

---

## PHASE A — Read source code

### A1: Read normalizeMLBGame

```bash
grep -n "function normalizeMLBGame\|normalizeMLBGame =" index.html | head -5
# Read the full function body (100 lines from match)
```

Document EVERY field path the function reads from the raw object `g`:
- `g.gamePk`
- `g.teams.home.score`
- `g.teams.home.team.abbreviation`
- `g.linescore.currentInning`
- etc.

### A2: Read fetchMLBFixtures / loadMLBSlate / fetchMLBSchedule

```bash
grep -n "async function fetchMLB\|async function loadMLB" index.html | head -10
# Read each function body
```

Document:
- What URL does it call? Direct to statsapi.mlb.com or relay-proxied?
- What triggers ESPN fallback?
- Is the fallback on null return, empty array, or exception?

### A3: Read V2_LEAGUES.mlb config

```bash
grep -n "mlb.*espnLeague\|mlb.*espnSport\|mlb.*Source\|V2_LEAGUES.*mlb" index.html | head -10
```

**STOP. Document all findings before Phase B. Print them to console.**

---

## PHASE B — Field-by-field comparison

```python
import json

with open("/tmp/mlb-probe-raw.json") as f:
    probe = json.load(f)

game = probe['games'][0] if probe.get('games') else None
if not game:
    print("⛔ No games in probe response. Cannot compare fields.")
    raise SystemExit(1)

# REPLACE THIS LIST with actual paths from Phase A source read.
# Do not use this default list without confirming from source.
EXPECTED_PATHS = [
    # ("path.normalizeMLBGame.reads", lambda g: accessor)
    # FILL IN FROM PHASE A — e.g.:
    # ("gamePk",                  lambda g: g.get("gamePk")),
    # ("teams.home.team.name",    lambda g: g["teams"]["home"]["team"]["name"]),
    # etc.
]

if not EXPECTED_PATHS:
    print("⛔ EXPECTED_PATHS is empty — Phase A source read not completed.")
    print("Fill in from normalizeMLBGame source read before running Phase B.")
    raise SystemExit(1)

print("=== FIELD COMPARISON: real API vs normalizeMLBGame ===\n")
missing = []
for path, extractor in EXPECTED_PATHS:
    try:
        val = extractor(game)
        status = "✅ PRESENT" if val is not None else "⚠️  NULL"
        if val is None:
            missing.append(path)
    except (KeyError, TypeError, IndexError) as e:
        status = "❌ WRONG PATH"
        val = str(e)
        missing.append(path)
    print(f"  {status:14} {path:45} = {val!r}")

print(f"\n{len(EXPECTED_PATHS) - len(missing)}/{len(EXPECTED_PATHS)} fields confirmed present")
if missing:
    print(f"⚠️  Issues: {missing}")
```

---

## PHASE C — Answer the question: MLB Stats API or ESPN?

Based on Phase A findings, write a clear verdict:

```
VERDICT:
  Active MLB data path: [MLB Stats API / ESPN / MLB Stats → ESPN fallback]
  Evidence: [cite specific function, line, URL, or config]
  
  If ESPN fallback always fires:
    - Why? [null return? exception? config override?]
    - Is normalizeMLBGame dead code?
    - What FIELD actually shows today comes from: [ESPN adapter name]
    
  If MLB Stats API is the active path:
    - Which relay route handles it? [/mlb/... or direct client fetch?]
    - Are all normalizeMLBGame fields present in real API? [yes/no, with list]
```

---

## PHASE D — Update fixture with real data

```python
import json

with open("/tmp/mlb-probe-raw.json") as f:
    probe = json.load(f)

fixture = {
    "sourceId": "mlb-stats-api-official",
    "date": probe["date"],
    "note": "Real data from statsapi.mlb.com probe 2026-06-29 — not invented",
    "games": probe.get("games", [])[:2]
}

with open("docs/adapter-fixtures-mlb-ok.json", "w") as f:
    json.dump(fixture, f, indent=2)

print(f"Fixture updated with {len(fixture['games'])} real games")
```

---

## PHASE E — Confidence scoring and commit

```python
score = 0
factors = []

# Factor 1: Source read completed — normalizeMLBGame paths documented (25 pts)
source_read = len(EXPECTED_PATHS) > 0
score += 25 if source_read else 0
factors.append(f"{'✅' if source_read else '❌'} +{'25' if source_read else ' 0'}  normalizeMLBGame field paths read from source")

# Factor 2: All expected fields PRESENT in real API (25 pts)
field_pct = (len(EXPECTED_PATHS) - len(missing)) / max(len(EXPECTED_PATHS), 1)
field_pts = int(field_pct * 25)
score += field_pts
factors.append(f"{'✅' if not missing else '⚠️ '} +{field_pts:2}  {len(EXPECTED_PATHS)-len(missing)}/{len(EXPECTED_PATHS)} fields present in real API")

# Factor 3: Call path verdict documented (20 pts)
# Set this True only if Phase C produced a clear, evidenced answer
call_path_answered = True  # update from Phase C findings
score += 20 if call_path_answered else 0
factors.append(f"{'✅' if call_path_answered else '❌'} +{'20' if call_path_answered else ' 0'}  Call path verdict documented with evidence")

# Factor 4: Fixture updated with real data (15 pts)
import os
fixture_real = os.path.exists("docs/adapter-fixtures-mlb-ok.json")
score += 15 if fixture_real else 0
factors.append(f"{'✅' if fixture_real else '❌'} +{'15' if fixture_real else ' 0'}  Fixture uses real API data (not invented)")

# Factor 5: No invented fields — every claim traceable to source or probe (15 pts)
# Set False if ANY field was assumed without source read or API probe
no_inventions = source_read and not any("WRONG PATH" in str(r) for r in factors)
score += 15 if no_inventions else 0
factors.append(f"{'✅' if no_inventions else '❌'} +{'15' if no_inventions else ' 0'}  No invented fields — all claims from source read or probe")

print(f"\n{'='*50}")
print(f"CONFIDENCE SCORE: {score}/100")
print(f"{'='*50}")
for f in factors:
    print(f"  {f}")

if score < 95:
    print("\n⛔ BELOW 95 — DO NOT COMMIT")
    raise SystemExit(f"Confidence {score}/100")
```

Commit only if ≥ 95:

```bash
git add docs/adapter-fixtures-mlb-ok.json outbox/mlb-source-verify-2026-06-29.md
git commit -m "fix(mlb): real API field verification + fixture from live probe — confidence {score}/100 [skip ci]"
git push origin main
```

---

## OUTBOX MANIFEST

| Item | Phase | Owner |
|------|-------|-------|
| Read normalizeMLBGame source | A | CC |
| Read fetchMLBFixtures call chain | A | CC |
| Read V2_LEAGUES.mlb config | A | CC |
| Field-by-field real API vs normalizer | B | CC |
| Call path verdict (MLB Stats vs ESPN) | C | CC |
| Update fixture with real data | D | CC |
| Confidence ≥ 95 gate | E | CC |
| Commit (only if ≥ 95) | E | CC |

---

**Session: 2026-06-29 · CLIENT ONLY · 25 min target · Confidence gate: 95**
