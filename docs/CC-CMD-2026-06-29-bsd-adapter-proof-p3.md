# CC-CMD — BSD Adapter Proof Phase 3: Live Journalism Proof via CI

**Date:** 2026-06-29
**Repo:** jubilant-bassoon (CLIENT) + field-relay-nba check (READ ONLY)
**Scope:** Prove [BSD MOMENTUM] appears in a WC journalism brief — via CI log fetch
**Why:** BSD visible value is journalism context, not a card score line. The
         proof is: relay receives request for WC brief → buildBSDMomentumContext
         fires → [BSD MOMENTUM] block in response. Cannot test from CC
         (*.workers.dev blocked). Must use CI or relay probe.
**Target time:** 30 min
**Confidence gate: 95**

---

## ENVIRONMENT CONSTRAINTS

- *.workers.dev blocked from CC egress (same as MLB Playwright pattern)
- CI runners CAN reach the relay
- Relay momentum fix deployed (cd68c60) — /bsd/events/:id/momentum now returns data
- Germany vs Paraguay kicking off ~20:30 UTC — first live R32 game with BSD data

---

## DONE CONDITION
**CONFIDENCE GATE: Do not commit unless score ≥ 95. Report score verbatim if below threshold.**


Outbox file `outbox/bsd-journalism-proof-2026-06-29.md` committed with:
- `/bsd/events/live` showing at least 1 live event during execution
- `buildBSDMomentumContext` response containing `[BSD MOMENTUM]` block
- `/v2/games?sport=wc26` showing at least 1 game with `bsdEventId` set
- Confidence score ≥ 95

---

## PHASE A: Verify relay state

```bash
# Confirm momentum fix deployed
curl -s https://field-relay-nba.jeffunglesbee.workers.dev/deploy/verify | python3 -m json.tool

# Expected: deployed: cd68c60 or later

# Check live BSD events
curl -s https://field-relay-nba.jeffunglesbee.workers.dev/bsd/events/live | python3 -m json.tool

# Check WC26 relay games — do any have bsdEventId?
curl -s "https://field-relay-nba.jeffunglesbee.workers.dev/v2/games?sport=wc26" | \
  python3 -c "import sys,json; d=json.load(sys.stdin); [print(g.get('home',{}).get('name'), g.get('bsdEventId','MISSING')) for g in d.get('games',[])]"
```

**If bsdEventId is MISSING on all games:**
- Games may not be live yet (Germany vs Paraguay ~20:30 UTC)
- Wait until a game goes live, re-check
- The injection only fires during BSD's live window

**If bsdEventId is present:**
- Proceed to Phase B immediately

---

## PHASE B: Probe buildBSDMomentumContext directly

The context assembler lives in the relay (`src/context-assembler.js`).
Probe via the journalism endpoint with a game that has a known bsd_event_id:

```bash
# Brazil vs Japan is finished with bsd_event_id=8360 — use as test case
# The relay's journalism/game-context endpoint accepts a game object
curl -s -X POST "https://field-relay-nba.jeffunglesbee.workers.dev/journalism/game-context" \
  -H "Content-Type: application/json" \
  -d '{
    "game": {
      "id": "espn:760487",
      "sport": "wc26",
      "bsdEventId": "8360",
      "home": {"name": "Brazil", "abbr": "BRA", "score": 2},
      "away": {"name": "Japan", "abbr": "JPN", "score": 1},
      "state": "final"
    }
  }' | python3 -c "
import sys, json
d = json.load(sys.stdin)
ctx = d.get('context', d.get('assembled', d))
# Look for BSD MOMENTUM block
if '[BSD MOMENTUM]' in str(ctx):
    print('✅ [BSD MOMENTUM] block found in journalism context')
    # Find and print the block
    import re
    match = re.search(r'\[BSD MOMENTUM\].*?(?=\[|$)', str(ctx), re.DOTALL)
    if match: print(match.group()[:500])
else:
    print('❌ [BSD MOMENTUM] not found')
    print('Context keys:', list(d.keys()) if isinstance(d, dict) else 'not a dict')
    print('First 500 chars:', str(ctx)[:500])
"
```

**If journalism endpoint doesn't exist or returns 404:**
Probe context-assembler output differently — check what routes the relay has:
```bash
curl -s https://field-relay-nba.jeffunglesbee.workers.dev/health | grep -i "journalism\|context\|bsd"
```

---

## PHASE C: Confidence scoring

```python
score = 0
factors = []

# Factor 1: Relay momentum fix deployed (40 pts)
# Check deploy/verify matches cd68c60 or later
relay_ok = True  # from Phase A
score += 40 if relay_ok else 0
factors.append(f"{'✅' if relay_ok else '❌'} +{'40' if relay_ok else ' 0'}  Relay momentum fix deployed (cd68c60)")

# Factor 2: bsdEventId present on at least 1 live game (20 pts)
bsd_live = False  # from Phase A — set True if any game has bsdEventId
score += 20 if bsd_live else 0
factors.append(f"{'✅' if bsd_live else '⚠️ '} +{'20' if bsd_live else ' 0'}  bsdEventId on live game (0 = no live games yet)")

# Factor 3: [BSD MOMENTUM] in journalism context (25 pts)
momentum_in_context = False  # from Phase B
score += 25 if momentum_in_context else 0
factors.append(f"{'✅' if momentum_in_context else '❌'} +{'25' if momentum_in_context else ' 0'}  [BSD MOMENTUM] block in journalism context")

# Factor 4: R2 captures exist for WC games (15 pts)
# bsd/wc26/ has 40 files (verified in probe) — 20 games captured
score += 15
factors.append("✅ +15  R2 captures confirmed (40 files, 20 games)")

if score < 95:
    print(f"Score: {score}/100 — BELOW THRESHOLD")
    # bsdEventId absence is expected if no live games — note it
    if not bsd_live:
        print("NOTE: bsdEventId missing because no games are currently live.")
        print("Factor 2 score will improve automatically when a game goes live.")
        print("Re-run this phase after Germany vs Paraguay kicks off (~20:30 UTC)")
else:
    print(f"Score: {score}/100 — PASS")
```

---

## PHASE D: Write outbox and commit

Commit `outbox/bsd-journalism-proof-2026-06-29.md` with all findings.
If score < 95 due to no live games: commit partial results with note about timing.

```bash
git add outbox/bsd-journalism-proof-2026-06-29.md
git commit -m "docs(outbox): BSD journalism proof 2026-06-29 [skip ci]"
git push origin main  # 2 attempts max
```

---

## WHAT SUCCESS LOOKS LIKE

```
✅ Relay momentum fix: cd68c60 deployed
✅ bsdEventId on Germany vs Paraguay: 8361
✅ [BSD MOMENTUM] block in context:
   Game shifted at 67': pressure index +23 → +71 (home dominance)
   Peak home pressure: +78
   Current: +65 (home)
✅ R2 captures: 20 games (40 files)
Confidence: 100/100
```

If no live games yet (pre-kickoff): score is 55/100 — expected and honest.
Come back after 20:30 UTC for full proof.

**Session: 2026-06-29 · RELAY READ + CLIENT OUTBOX · 30 min · Confidence gate: 95**
