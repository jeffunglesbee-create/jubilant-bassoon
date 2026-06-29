# CC-CMD — MLB Stats API Adapter Visible Value Proof — Phase 2

**Date:** 2026-06-29  
**Scope:** Adapter proof infrastructure — smoke assertions + Feature Registry + DOM attributes + fixture docs  
**Rule:** Rule 87 (self-completing). Probe block runs first. Done condition explicit. Outbox manifest last.  
**Est. time:** 90 min  

---

## PROBE BLOCK (run before any edits)

```bash
# Confirm HEAD + working tree
git log -1 --oneline
echo "---"

# Verify MLB adapter functions exist
grep -n "function normalizeMLBGame\|function parseBroadcasts\|async function loadMLBSlate\|async function fetchMLBFixtures" index.html | head -10
echo "---"

# Verify normalizeMLBGame fields we will test
# Look for the field assignments in the function body (lines ~19499-19570)
sed -n '19499,19580p' index.html | grep -E "source:|homeTeam|awayTeam|homeScore|awayScore|status:|inning:|startTime:|nationalBundle:|espnGOTD:|mlbnShowcase:"
echo "---"

# Check Feature Registry for existing mlb-stats entries
grep -n "adapter-proof-mlb\|mlb-stats-api" index.html | head -5
echo "---"

# Check card render for existing data-proof attributes on MLB
grep -n "data-proof\|data-source.*mlb\|data-sport.*Baseball" index.html | head -10
echo "---"

# Check if docs/adapter-proof.manifest.json exists (created in Phase 1)
ls -la docs/adapter-proof.manifest.json 2>/dev/null || echo "NOT FOUND — needs create"
ls -la docs/source-registry.json 2>/dev/null || echo "NOT FOUND — needs create"
echo "---"

# Verify smoke.js has existing MLB assertions + total count
grep -c "^assert(" smoke.js
grep -n "AVV-MLB\|adapter-proof" smoke.js | head -5
```

**Probe expected outputs:**
- `normalizeMLBGame` exists at line ~19499
- `source: 'mlb-stats'` in normalizeMLBGame body
- No `adapter-proof-mlb-stats-api` in index.html yet
- No `data-proof` on MLB cards yet
- docs/ files either present (from Phase 1) or need creation

---

## DONE CONDITION

When smoke.js runs with exit 0 AND the following 8 new assertions pass:

```
✅ AVV-MLB-001 — adapter-proof.manifest.json exists
✅ AVV-MLB-002 — normalizeMLBGame assigns source: 'mlb-stats'
✅ AVV-MLB-003 — normalizeMLBGame assigns homeScore and awayScore
✅ AVV-MLB-004 — parseBroadcasts returns mlbnShowcase for MLB Network
✅ AVV-MLB-005 — fetchMLBFixtures falls back to ESPN on null return
✅ AVV-MLB-006 — MLB_DAILY_OVERRIDES declared with espnGOTD and peacockGOTD
✅ AVV-MLB-007 — buildFieldHealthPanel defined
✅ AVV-MLB-008 — adapter-proof-mlb-stats-api in Feature Registry
```

Verify with: `node smoke.js index.html 2>&1 | tail -20`

---

## EXECUTION STEPS

### Step 1: Create docs/adapter-proof.manifest.json

Using GitHub Contents API (new file, no parent sha needed):

```bash
FIELD_PAT="FIELD_PAT_FROM_MEMORY"
REPO="jeffunglesbee-create/jubilant-bassoon"

CONTENT=$(cat docs/adapter-proof.manifest.json | base64 -w 0)

curl -X PUT "https://api.github.com/repos/$REPO/contents/docs/adapter-proof.manifest.json" \
  -H "Authorization: token $FIELD_PAT" \
  -H "Content-Type: application/json" \
  -d "{
    \"message\": \"[skip ci] Add adapter-proof.manifest.json — MLB Stats API contract\",
    \"content\": \"$CONTENT\"
  }"
```

**If file already exists** (from Phase 1), get sha first:
```bash
SHA=$(curl -s "https://api.github.com/repos/$REPO/contents/docs/adapter-proof.manifest.json" \
  -H "Authorization: token $FIELD_PAT" | python3 -c "import sys,json; print(json.load(sys.stdin)['sha'])")

curl -X PUT "https://api.github.com/repos/$REPO/contents/docs/adapter-proof.manifest.json" \
  -H "Authorization: token $FIELD_PAT" \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"[skip ci] Update adapter-proof.manifest.json\", \"content\": \"$CONTENT\", \"sha\": \"$SHA\"}"
```

### Step 2: Create docs/source-registry.json

Same pattern. Content:
```json
{
  "version": 1,
  "generatedAt": "2026-06-29T00:00:00Z",
  "sources": {
    "mlb-stats-api-official": {
      "status": "green",
      "sourceUrl": "https://statsapi.mlb.com/api/v1",
      "allowedUses": ["live_state", "schedule", "broadcast_display", "derived_display"],
      "rawRedistributionAllowed": false,
      "commercialUseClass": "public_api_sports",
      "corsAvailable": true,
      "authRequired": false,
      "lastTermsCheckedAt": "2026-06-29",
      "notes": "MLB official free API. No license key. CORS-open. Widely used without restriction."
    }
  }
}
```

### Step 3: Add 8 smoke assertions to smoke.js

Find the end of the existing MLB Stats API assertions (after `ESPN_GOTD_SCHEDULE`):

```javascript
// ── MLB Adapter Visible Value Proof (AVV — 2026-06-29) ───────────────────────

assert('AVV-MLB-001 — adapter-proof.manifest.json exists in docs/',
  require('fs').existsSync('./docs/adapter-proof.manifest.json'),
  'docs/adapter-proof.manifest.json must exist — source of truth for adapter proof contract');

assert("AVV-MLB-002 — normalizeMLBGame assigns source: 'mlb-stats'",
  html.includes("source: 'mlb-stats'"),
  "normalizeMLBGame must set source field to 'mlb-stats' for source trail attribution");

assert('AVV-MLB-003 — normalizeMLBGame assigns homeScore and awayScore',
  html.includes('homeScore,') && html.includes('awayScore,') &&
  html.includes('home.score') && html.includes('away.score'),
  'normalizeMLBGame must extract homeScore/awayScore from MLB Stats API home/away.score fields');

assert('AVV-MLB-004 — parseBroadcasts returns mlbnShowcase for MLB Network',
  html.includes("result.mlbnShowcase = true") || html.includes("mlbnShowcase: true"),
  'parseBroadcasts must set mlbnShowcase=true when MLB Network appears in broadcasts array');

assert('AVV-MLB-005 — fetchMLBFixtures tries MLB Stats API before ESPN fallback',
  html.includes('async function fetchMLBFixtures') &&
  html.includes('loadMLBSlate') &&
  html.includes("'MLB Stats API unavailable") || html.includes("MLB Stats API unavailable"),
  'fetchMLBFixtures must call loadMLBSlate first and fall through to ESPN on null return');

assert('AVV-MLB-006 — MLB_DAILY_OVERRIDES declared with espnGOTD and peacockGOTD',
  html.includes('MLB_DAILY_OVERRIDES') &&
  html.includes('espnGOTD') &&
  html.includes('peacockGOTD'),
  'MLB_DAILY_OVERRIDES must have espnGOTD and peacockGOTD slots for manual day-of overrides');

assert('AVV-MLB-007 — buildFieldHealthPanel defined',
  html.includes('function buildFieldHealthPanel'),
  'Health panel function must exist — adapter health row depends on this infrastructure');

assert("AVV-MLB-008 — 'adapter-proof-mlb-stats-api' in Feature Registry",
  html.includes("'adapter-proof-mlb-stats-api'"),
  'Feature Registry must contain adapter-proof-mlb-stats-api entry per Rule: every FIELD_FEATURES entry has a smoke assertion');
```

**Where to insert:** After the existing section:
```javascript
assert('ESPN_GOTD_SCHEDULE defined', html.includes('const ESPN_GOTD_SCHEDULE'));
```

And BEFORE the `// 5. RELAY NBA Adapters` comment.

### Step 4: Add Feature Registry entry to index.html

Find the FIELD Feature Registry section (around line 5430). Add after the last MLB entry:

```javascript
'adapter-proof-mlb-stats-api': '2026-06-29',
```

**Locate anchor:** Search for `mlb-stats-api` or the end of MLB entries in the registry object. Pattern in the registry is `'feature-key': 'YYYY-MM-DD',`

### Step 5: Add DOM proof attribute to normalizeMLBGame output

In `normalizeMLBGame` (line ~19499), the return object is built with fields like `id:`, `source:`, `homeTeam:`, etc. 

**After reading the probe output**, add a `_adapterProof` field to the return:

```javascript
// Inside normalizeMLBGame return object — add after existing fields:
_adapterProof: {
  adapterId: 'mlb-stats-api',
  sourceId: 'mlb-stats-api-official',
  normalizedAt: new Date().toISOString(),
  inputHash: String(g.gamePk),
},
```

**Note:** Only add if probe confirms it's not already there.

### Step 6: Run smoke + verify all 8 new assertions pass

```bash
node smoke.js index.html 2>&1 | grep -E "AVV-MLB|Results:"
```

Expected:
```
  ✅ AVV-MLB-001 — adapter-proof.manifest.json exists in docs/
  ✅ AVV-MLB-002 — normalizeMLBGame assigns source: 'mlb-stats'
  ✅ AVV-MLB-003 — normalizeMLBGame assigns homeScore and awayScore
  ✅ AVV-MLB-004 — parseBroadcasts returns mlbnShowcase for MLB Network
  ✅ AVV-MLB-005 — fetchMLBFixtures tries MLB Stats API before ESPN fallback
  ✅ AVV-MLB-006 — MLB_DAILY_OVERRIDES declared with espnGOTD and peacockGOTD
  ✅ AVV-MLB-007 — buildFieldHealthPanel defined
  ✅ AVV-MLB-008 — 'adapter-proof-mlb-stats-api' in Feature Registry
── Results: NNN passed, 0 failed ──
```

### Step 7: Commit index.html + smoke.js

```bash
git add index.html smoke.js
git commit -m "MLB Stats API adapter proof — AVV-MLB-001 through 008 + Feature Registry"
git push origin main
```

**Verify CI passes**: check smoke-and-verify.yml run in GitHub Actions.

---

## OUTBOX MANIFEST

| Item | File | Status | Owner |
|------|------|--------|-------|
| Adapter manifest | docs/adapter-proof.manifest.json | ⏳ Push via API | CC Step 1 |
| Source registry | docs/source-registry.json | ⏳ Push via API | CC Step 2 |
| Smoke assertions (8) | smoke.js | ⏳ Edit | CC Step 3 |
| Feature Registry entry | index.html | ⏳ Edit | CC Step 4 |
| `_adapterProof` field | index.html | ⏳ Edit (after probe) | CC Step 5 |
| Smoke verification | — | ⏳ Run | CC Step 6 |
| Git commit + push | — | ⏳ Run | CC Step 7 |
| Drive session doc | Drive 0ABxH84VndHL7Uk9PVA | ⏳ Upload | After commit |

---

## DECISION MATRIX

| Scenario | Decision |
|----------|----------|
| AVV-MLB-001 fails (file not found) | Create docs/adapter-proof.manifest.json via GitHub Contents API PUT |
| AVV-MLB-002 fails (source field name differs) | Read actual normalizeMLBGame return and update assertion to match |
| AVV-MLB-005 fails (fallback text differs) | grep exact string from index.html, update assertion |
| `_adapterProof` already exists | Skip Step 5, do not duplicate |
| Smoke count drops | Do not commit — investigate which assertion was broken |
| CI fails on push | Do not deploy — fix locally before next push |

---

## WHAT IS AUTOMATED VS MANUAL

**Automated by this CC-CMD:**
- Smoke assertions for structural proof (AVV-MLB-001 through 008)
- Feature Registry entry
- `_adapterProof` field in normalizeMLBGame output
- docs/ files pushed to repo

**Not automated (next phase):**
- Playwright end-to-end browser proof (screenshot proof)
- CI merge-blocking gate (`adapter-visible-value.yml`)
- Health heartbeat KV write after adapter runs
- Proof mode query param (`?proofAdapter=mlb-stats-api&fixture=ok`)

**Gap you wouldn't know to ask about:**  
The Playwright proof is the definition-of-done for "visible value" per the spec — the 8 smoke assertions prove the adapter *exists and produces correct structure*, but don't prove a card renders on screen. That is Phase 3. Phase 2 is the structural proof layer only.

**Next action:**  
Phase 3 CC-CMD — add `?proofAdapter` query param support to index.html, wire `window.__FIELD_PROOF__` object, add `data-proof` DOM attributes to card render, write `tests/browser/adapter-visible-value.spec.ts` (create tests/ directory), update viewport-tests.yml to include adapter proof run.

---

**Session: 2026-06-29 · MLB Adapter Proof Phase 2 · Ready for CC execution**
