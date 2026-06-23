# CC-CMD — Soccer xG via ESPN Core API

**Repo:** field-relay-nba (NOT jubilant-bassoon)
**Date:** 2026-06-23
**Replaces:** FBref pipeline (soccer-fbref-wc.yml, soccer-fbref-mls.yml, DataImpulse)

---

## BACKGROUND

FBref lost its Opta data licence in January 2026 and is no longer a
valid data source. DataImpulse proxy failed to unblock it. The ESPN
Core API (`sports.core.api.espn.com`) was verified to serve full
xG data per game for WC2026 — no proxy, no scraping, works from CF
Workers. xG confirmed on 2 WC games. Absent from Bundesliga (structural
— ESPN uses a richer feed for WC/premium leagues).

**Context assembler target:** replace `buildSoccerFBrefContext` (reads
dead R2 FBref data) with `buildSoccerXGContext` (calls new relay route).

---

## PRE-BUILD PROBES (Rule 68 — run before writing any code)

```bash
# 1. Verify xG present on a live WC game
curl -s "https://sports.core.api.espn.com/v2/sports/soccer/leagues/fifa.world/events/760456/competitions/760456/competitors/202/statistics" \
  | node -e 'const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")); const off=d.splits.categories.find(c=>c.name==="offensive"); console.log("xG fields:", off.stats.filter(s=>s.name.startsWith("expected")).map(s=>s.name+":"+s.displayValue))'

# 2. Verify competitor IDs come from scoreboard response
curl -s "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard" \
  | node -e 'const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")); d.events.slice(0,2).forEach(e => { const c=e.competitions[0]; c.competitors.forEach(comp => console.log("event:",e.id,"comp_id:",comp.id,"homeAway:",comp.homeAway,"team:",comp.team.displayName)) })'

# 3. Locate context-assembler.js and confirm buildSoccerFBrefContext exists
grep -n "buildSoccerFBrefContext\|soccer_fbref\|SOCCER STATS" src/context-assembler.js | head -20

# 4. Confirm /soccer/ route block in index.js
grep -n "/soccer/\|soccer-fbref" src/index.js | head -20

# 5. Check if game object carries espnEventId (what field name?)
grep -n "espnEventId\|espnId\|eventId\|game\.id" src/context-assembler.js src/journalism*.js 2>/dev/null | head -20

# 6. Verify espn-summary route still active (should not be removed)
grep -n "espn-summary\|/espn-summary" src/index.js | head -5
```

Write probe output to `outbox/cc-soccer-xg-2026-06-23.md` before coding.

---

## TASK 1 — New relay route `/soccer/xg`

Add to `src/index.js`. Insert near the existing `/soccer/` route block.

### Pattern: 3 fetches, 2 parallel

```javascript
// ── /soccer/xg → ESPN Core API per-game xG (WC2026+) ──────────────────────
// Verified: xG present for fifa.world. Absent for ger.1 (structural).
// Returns _hasXG:false when ESPN feed lacks xG — caller degrades gracefully.
if (pathname === '/soccer/xg') {
  const league = url.searchParams.get('league');
  const eventId = url.searchParams.get('event');
  if (!league || !eventId) {
    return new Response(JSON.stringify({ error: 'league and event required' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...CORS } });
  }

  const CORE = 'https://sports.core.api.espn.com/v2/sports/soccer';
  const compBase = `${CORE}/leagues/${league}/events/${eventId}/competitions/${eventId}`;

  let competitors, homeId, awayId, homeName, awayName;
  try {
    const compRes = await fetch(`${compBase}/competitors`,
      { headers: { 'User-Agent': 'FIELD/1.0' } });
    if (!compRes.ok) throw new Error(`competitors ${compRes.status}`);
    const compData = await compRes.json();
    for (const item of compData.items || []) {
      if (item.homeAway === 'home') {
        homeId = item.id;
        homeName = item.team?.displayName || item.id;
      } else {
        awayId = item.id;
        awayName = item.team?.displayName || item.id;
      }
    }
    if (!homeId || !awayId) throw new Error('could not resolve competitors');
  } catch (e) {
    return new Response(
      JSON.stringify({ _hasXG: false, _error: e.message }),
      { headers: { 'Content-Type': 'application/json', ...CORS } }
    );
  }

  // Parallel stat fetches
  const [homeStats, awayStats] = await Promise.all([
    fetch(`${compBase}/competitors/${homeId}/statistics`,
      { headers: { 'User-Agent': 'FIELD/1.0' } }).then(r => r.ok ? r.json() : null).catch(() => null),
    fetch(`${compBase}/competitors/${awayId}/statistics`,
      { headers: { 'User-Agent': 'FIELD/1.0' } }).then(r => r.ok ? r.json() : null).catch(() => null),
  ]);

  function extractXG(statsObj) {
    if (!statsObj) return {};
    const XG_FIELDS = new Set([
      'expectedGoals', 'expectedGoalsNonPenalty', 'expectedGoalsOpenPlay',
      'expectedAssists', 'bigChanceCreated', 'bigChanceMissed',
      'ppda', 'expectedGoalsConceded',
    ]);
    const out = {};
    for (const cat of statsObj.splits?.categories || []) {
      for (const stat of cat.stats || []) {
        if (XG_FIELDS.has(stat.name)) {
          const v = parseFloat(stat.displayValue);
          if (!isNaN(v)) out[stat.name] = v;
        }
      }
    }
    return out;
  }

  const homeXG = extractXG(homeStats);
  const awayXG = extractXG(awayStats);
  const hasXG = 'expectedGoals' in homeXG;

  const payload = {
    event: eventId,
    league,
    _hasXG: hasXG,
    _source: 'espn-core',
    home: { id: homeId, name: homeName, ...homeXG },
    away: { id: awayId, name: awayName, ...awayXG },
  };

  // Cache: post-game 24h, live 60s, pre-game 300s
  // State detection: if expectedGoals present and > 0, game has started
  const ttl = !hasXG ? 300 : (homeXG.expectedGoals > 0 || awayXG.expectedGoals > 0) ? 86400 : 60;

  return new Response(JSON.stringify(payload), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `public, max-age=${ttl}`,
      'X-Source': 'espn-core',
      ...CORS,
    },
  });
}
```

---

## TASK 2 — Update context assembler

In `src/context-assembler.js`, replace `buildSoccerFBrefContext` / `soccer_fbref`
source entry with `buildSoccerXGContext` / `soccer_xg`.

### CONTEXT_SOURCES entry

Replace:
```javascript
{ id: 'soccer_fbref', priority: 7, budget: 180, builder: buildSoccerFBrefContext, sports: [...] }
```
With:
```javascript
{ id: 'soccer_xg', priority: 7, budget: 150, builder: buildSoccerXGContext,
  sports: ['epl','mls','ucl','wc26','laliga','seriea','bundesliga','ligue1'] }
```

### Builder

```javascript
async function buildSoccerXGContext(env, game) {
  // game must carry espnLeague (e.g. "fifa.world") and espnEventId
  // Field names: check probe output — may be espnId, eventId, or game.id
  const league = game.espnLeague;
  const eventId = game.espnEventId || game.espnId || game.id;
  if (!league || !eventId) return '';

  try {
    const RELAY = 'https://field-relay-nba.jeffunglesbee.workers.dev';
    const resp = await fetch(`${RELAY}/soccer/xg?league=${league}&event=${eventId}`);
    if (!resp.ok) return '';
    const d = await resp.json();
    if (!d._hasXG) return '';

    const h = d.home, a = d.away;
    const lines = ['[SOCCER XG CONTEXT]'];
    lines.push(
      `xG: ${h.name} ${h.expectedGoals?.toFixed(2)} (${h.expectedGoalsNonPenalty?.toFixed(2)} npxG) ` +
      `vs ${a.name} ${a.expectedGoals?.toFixed(2)} (${a.expectedGoalsNonPenalty?.toFixed(2)} npxG)`
    );
    if (h.expectedAssists != null) {
      lines.push(`xA: ${h.name} ${h.expectedAssists?.toFixed(2)} — ${a.name} ${a.expectedAssists?.toFixed(2)}`);
    }
    if (h.ppda != null) {
      lines.push(`PPDA: ${h.name} ${h.ppda?.toFixed(1)} — ${a.name} ${a.ppda?.toFixed(1)}`);
    }
    if (h.bigChanceCreated != null) {
      lines.push(
        `Big chances: ${h.name} created ${h.bigChanceCreated} missed ${h.bigChanceMissed} ` +
        `— ${a.name} created ${a.bigChanceCreated} missed ${a.bigChanceMissed}`
      );
    }
    return '\n' + lines.join('\n') + '\n';
  } catch (_) { return ''; }
}
```

**Key probe dependency:** The field names `game.espnLeague` and `game.espnEventId`
must be verified from probe output. Adjust to match actual game object shape.
If neither is present, add them to the game object passed into assembleContext()
from the journalism prompt builder. Do NOT assume field names — read the code first.

---

## TASK 3 — Deprecate FBref workflows

In jubilant-bassoon `.github/workflows/soccer-fbref-wc.yml`:
- Comment out or remove the `schedule:` block (keep `workflow_dispatch` for manual runs)
- Add a comment: `# DEPRECATED 2026-06-23: FBref lost Opta licence Jan 2026. Replaced by ESPN Core API xG.`

Same for `soccer-fbref-mls.yml`.

Do NOT delete the files — keep for reference.

Do NOT touch DataImpulse secrets — leave in place (used by STAT repo).

---

## TASK 4 — Smoke assertions

Add to `smoke.js` (field-relay-nba or jubilant-bassoon per existing pattern):

```javascript
// A-SOCCER-XG-1: route exists and returns JSON
// curl /soccer/xg?league=fifa.world&event=760456 → 200, Content-Type application/json
// A-SOCCER-XG-2: _hasXG field present in response
// A-SOCCER-XG-3: home and away objects present with id and name
// A-SOCCER-XG-4: missing params → 400
// A-SOCCER-XG-5: context assembler has soccer_xg not soccer_fbref in CONTEXT_SOURCES
```

---

## TASK 5 — Verify end-to-end

```bash
# After deploy:

# 1. Probe route directly
curl -s "https://field-relay-nba.jeffunglesbee.workers.dev/soccer/xg?league=fifa.world&event=760456" | node -e '
  const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8"));
  console.log("_hasXG:", d._hasXG);
  console.log("home:", d.home.name, "xG:", d.home.expectedGoals);
  console.log("away:", d.away.name, "xG:", d.away.expectedGoals);
'

# 2. Probe context assembler output (if /journalism/context-probe is in allow-list)
# If not, verify via AI Gateway logs that [SOCCER XG CONTEXT] appears in prompt

# 3. Verify Bundesliga returns _hasXG: false (graceful)
curl -s "https://field-relay-nba.jeffunglesbee.workers.dev/soccer/xg?league=ger.1&event=747015" | node -e '
  const d=JSON.parse(require("fs").readFileSync("/dev/stdin","utf8"));
  console.log("_hasXG:", d._hasXG, "(should be false)");
'
```

---

## SCOPE (Rule 69 — TOUCH-ONLY-A)

DO:
- Add `/soccer/xg` route block in `src/index.js`
- Replace `buildSoccerFBrefContext` → `buildSoccerXGContext` in `src/context-assembler.js`
- Update CONTEXT_SOURCES entry id/builder
- Comment out schedule trigger in 2 workflow YAMLs in jubilant-bassoon
- Add smoke assertions
- Single commit per repo (2 commits total)

DO NOT:
- Modify `buildFinalsContextBlock` or `buildWCTeamContextBlock`
- Modify FIELD_PROSE_STYLE or runQualityChain
- Remove DataImpulse secrets
- Touch any other relay routes
- Touch index.html

---

## UNKNOWNS (document, do not block on)

- `game.espnLeague` and `game.espnEventId` field names: verify from probe #5
- Club league xG availability (EPL/MLS/La Liga): `_hasXG: false` handles absence gracefully.
  Verified absent for Bundesliga. Others unknown until seasons resume.
- TTL logic assumes xG > 0 means game has started — may need refinement for 0-0 draws.
  Leave as-is for now; 60s live TTL is acceptable fallback.

---

## REFERENCES

- ESPN Core API xG verified: `/soccer/xg?league=fifa.world&event=760456` and `760457`
- FBref deprecation context: `docs/CC-CMD-2026-06-23-soccer-fbref-fetch.md` (original failed cmd)
- Context assembler spec: `docs/CC-CMD-2026-06-21-context-assembler.md`
