# FIELD HANDOFF
## Session: 2026-06-25 · BSD Pipeline Complete

---

## FIELD — Current State

**CLIENT HEAD: 05a1aef · 2026-06-25 · bsdEventId + pitch A_BSD_7/8 · Smoke 757/0**
**RELAY HEAD: a55ebd3 · 2026-06-25 · deployed ✅ — R2 capture at WC game-final**
SW_VERSION: 2026-06-25a · CF account: b57e9af57ab46c52ca9215804e689c29

---

## BSD PIPELINE — FULLY WIRED (as of a55ebd3)

When a WC game goes final with `bsdEventId`:
1. `bsd_event_id` written to `wc_results` D1 (column added 2026-06-25)
2. BSD momentum, stats (shotmap), incidents, average-positions → R2 at:
   `bsd/wc26/{bsd_event_id}/{type}.json`
3. `bsdEventId` in client `espnScores[key]` → `_bsdActivateForWC()` → AmbientDO WebSocket subscribe
4. `_bsdRepaint()` renders shots + ball into `<div id="bsd-pitch">` (container not yet in DOM — see CC-CMD-H)
5. `buildBSDMomentumContext` → live momentum context in journalism brief (fires automatically)

**R2 bucket:** `FIELD_DATA` binding → `field-relay-data` bucket
**D1 WC:** `WC2026_DB` binding → `wc2026` (f26669de) — 54 rows, all `bsd_event_id=null` until tonight

---

## ⚡ PENDING: CC-CMD-H (field-relay-nba)

**Run AFTER first WC game tonight goes final (~22:00 UTC Ecuador vs Germany)**

**One-liner:**
```
cd /home/claude/field-relay-nba && git pull && cat HANDOFF.md
```
(CC-CMD-H is embedded below — copy to docs/ as CC-CMD-2026-06-25-H-bsd-history-context.md)

**Or read directly from HANDOFF if docs/ write is blocked.**

---

## CC-CMD-H SPEC

### WHAT THIS DOES

**TASK 1 — WC League ID discovery + MD1-MD2 backfill**
When Ecuador vs Germany goes final, BSD live endpoint returns WC `league_id`.
Query `/bsd/events/season?league_id={id}`, match completed events to `wc_results`
rows by team name, UPDATE `bsd_event_id` for MD1-MD2 games.

**TASK 2 — `buildBSDHistoryContext` CONTEXT_SOURCE**
Reads R2 `bsd/wc26/{id}/stats.json` + `momentum.json` for a team's prior WC matches.
Injects `[BSD HISTORY]` block into journalism prompt.
Registered in CONTEXT_SOURCES for `wc26`, priority 7, budget 200.

**TASK 3 — R2 list endpoint + `<div id="bsd-pitch">` in WC game card**
Add `/bsd/r2/list?prefix=bsd/wc26/` relay route for R2 key inspection.
Add `<div id="bsd-pitch">` inside the live WC game card in `renderWCSection`
(find where live game state renders in the Groups view — insert after score line).

### PROBE BLOCK

```bash
cd /home/claude/field-relay-nba && git pull

# 1. Confirm R2 capture in writeWCResult
grep -n 'bsd/wc26' src/index.js | head -5
# Expected: 3 lines (R2 key prefix in put calls)

# 2. Confirm bsd_event_id in wc_results (via relay)
curl -s https://field-relay-nba.jeffunglesbee.workers.dev/wc/results?group=D | \
  python3 -c "import json,sys; r=json.load(sys.stdin)['results']; \
    [print(f'{x[\"home\"]} vs {x[\"away\"]}: bsd={x.get(\"bsd_event_id\",\"MISSING\")}') for x in r]"
# Expected: bsd_event_id key present (null for old games, ID for tonight's if complete)

# 3. FIELD_DATA bound
grep 'FIELD_DATA' wrangler.toml
# Expected: binding = "FIELD_DATA"

# 4. buildBSDHistoryContext not yet present
grep -c 'buildBSDHistoryContext' src/context-assembler.js
# Expected: 0

# 5. CONTEXT_SOURCES bsd_momentum entry (insertion reference)
grep -n "id: 'bsd_momentum'" src/context-assembler.js
# Expected: 1 line at ~L590
```

### TASK 1 — League ID discovery (run after first WC game goes final)

```bash
# Step 1a: Get WC league_id from BSD live
LIVE=$(curl -s https://field-relay-nba.jeffunglesbee.workers.dev/bsd/events/live)
echo $LIVE | python3 -c "
import json,sys
d=json.load(sys.stdin)
for e in d.get('events',[]):
    print(f'bsd_id={e[\"id\"]} league_id={e[\"league_id\"]} {e[\"home_team\"]} vs {e[\"away_team\"]} status={e[\"status\"]}')
"
# Note the league_id for WC events

# Step 1b: Get all BSD WC events
WC_LEAGUE_ID=<paste_from_1a>
curl -s "https://field-relay-nba.jeffunglesbee.workers.dev/bsd/events/season?league_id=${WC_LEAGUE_ID}" | \
  python3 -c "
import json,sys
d=json.load(sys.stdin)
print(f'Total: {d[\"count\"]}')
fin=[e for e in d.get('results',[]) if e.get('status','').lower() in ('finished','ft','ended','completed')]
print(f'Finished: {len(fin)}')
for e in fin[:10]:
    print(f'  {e[\"id\"]} {e[\"home_team\"]} {e[\"home_score\"]}-{e[\"away_score\"]} {e[\"away_team\"]} {e[\"event_date\"][:10]}')
"

# Step 1c: Match to wc_results and backfill
# If finished WC games visible above, run:
python3 << 'PYEOF'
import json, re, urllib.request, os

relay = "https://field-relay-nba.jeffunglesbee.workers.dev"
wc_lid = os.environ.get('WC_LEAGUE_ID','')
if not wc_lid: print("Set WC_LEAGUE_ID"); exit(1)

bsd = json.loads(urllib.request.urlopen(f"{relay}/bsd/events/season?league_id={wc_lid}").read())
wc  = json.loads(urllib.request.urlopen(f"{relay}/wc/results").read())

def n(s): return re.sub(r'[^a-z0-9]','',( s or '').lower())

fin = [e for e in bsd.get('results',[]) if e.get('status','').lower() in ('finished','ft','ended','completed')]
updates = []
for wr in wc.get('results',[]):
    if wr.get('bsd_event_id'): continue
    for be in fin:
        bh,ba = n(be.get('home_team','')), n(be.get('away_team',''))
        wh,wa = n(wr['home']), n(wr['away'])
        if (bh[:5]==wh[:5] and ba[:5]==wa[:5]) or (bh[:5]==wa[:5] and ba[:5]==wh[:5]):
            updates.append((wr['game_id'], str(be['id']), wr['home'], wr['away']))
            break

print(f"Matched {len(updates)} games:")
for gid,bid,h,a in updates:
    print(f"  {h} vs {a} → bsd_id={bid}")
    sql = f"UPDATE wc_results SET bsd_event_id='{bid}' WHERE game_id='{gid}' AND bsd_event_id IS NULL"
    print(f"  SQL: {sql}")
PYEOF
# Apply SQLs via CF D1 API (need CF_API_TOKEN) or via admin POST /wc/result endpoint
```

### TASK 2 — `buildBSDHistoryContext` in src/context-assembler.js

Add before `// ── Source registry` comment:

```javascript
async function buildBSDHistoryContext(game, env) {
    if (!env?.FIELD_DATA || !env?.WC2026_DB) return '';
    const homeName = game.home?.name || game.home || '';
    const awayName = game.away?.name || game.away || '';
    if (!homeName || !awayName) return '';
    try {
        const { results: prior } = await env.WC2026_DB.prepare(`
            SELECT home, away, home_score, away_score, match_date, bsd_event_id
            FROM wc_results
            WHERE bsd_event_id IS NOT NULL
              AND (home = ? OR away = ? OR home = ? OR away = ?)
            ORDER BY match_date DESC LIMIT 4
        `).bind(homeName, homeName, awayName, awayName).all();
        if (!prior?.length) return '';
        const sections = [];
        for (const match of prior) {
            const teamLabel = [match.home,match.away].includes(homeName) ? homeName : awayName;
            const opponent  = match.home === teamLabel ? match.away : match.home;
            const parts = [`${teamLabel} vs ${opponent} (${match.home_score}-${match.away_score})`];
            try {
                const statsObj = await env.FIELD_DATA.get(`bsd/wc26/${match.bsd_event_id}/stats.json`);
                if (statsObj) {
                    const stats = await statsObj.json();
                    const shots = stats?.statistics || stats?.shots || [];
                    if (shots.length) {
                        const xg = shots.reduce((s,sh) => s+(sh.xg||0), 0);
                        parts.push(`${shots.length} shots xG ${xg.toFixed(2)}`);
                    }
                }
            } catch(_) {}
            try {
                const momObj = await env.FIELD_DATA.get(`bsd/wc26/${match.bsd_event_id}/momentum.json`);
                if (momObj) {
                    const mom = await momObj.json();
                    const entries = mom?.momentum || mom?.data || [];
                    if (entries.length) {
                        const peak = entries.reduce((b,e) =>
                            Math.abs(e.value||0)>Math.abs(b.value||0)?e:b, entries[0]);
                        parts.push(`peak ${peak.value>0?'+':''}${peak.value} at ${peak.minute||'?'}'`);
                    }
                }
            } catch(_) {}
            sections.push(`  ${match.match_date}: ${parts.join(' | ')}`);
        }
        return sections.length ? `[BSD HISTORY]\n${sections.join('\n')}\n` : '';
    } catch(_) { return ''; }
}
```

Add to CONTEXT_SOURCES after `bsd_momentum` entry:
```javascript
    { id: 'bsd_history', priority: 7, budget: 200, builder: buildBSDHistoryContext,
      sports: ['wc26'] },
```

Add `buildBSDHistoryContext` to module.exports.

### TASK 3 — R2 list route + pitch div

**In src/index.js**, before `/health/sources` block:
```javascript
        if (pathname === '/bsd/r2/list') {
            if (!env.FIELD_DATA) return new Response('{"error":"FIELD_DATA not bound"}',
                {status:503,headers:{'Content-Type':'application/json',...CORS}});
            const pfx = url.searchParams.get('prefix') || 'bsd/wc26/';
            const lst = await env.FIELD_DATA.list({prefix:pfx,limit:200});
            return new Response(JSON.stringify({
                keys: lst.objects.map(o=>({key:o.key,size:o.size})),
                truncated: lst.truncated,
            }),{status:200,headers:{'Content-Type':'application/json','Cache-Control':'no-store',...CORS}});
        }
```

**In jubilant-bassoon index.html**, find the live WC game card render in `renderWCSection`
(search for where `state === 'in'` is checked for WC games, or where scores render).
Add after the score line when `bsdEventId` is set:
```javascript
// Inside live WC game card render, after score:
if (eData?.bsdEventId) {
    el.insertAdjacentHTML('beforeend',
        '<div id="bsd-pitch" style="width:100%;aspect-ratio:1.5;margin-top:8px"></div>');
    setTimeout(_bsdRepaint, 100);
}
```

### DONE CONDITIONS

```bash
# 1. buildBSDHistoryContext wired
grep -c 'buildBSDHistoryContext' src/context-assembler.js  # Expected: 3

# 2. R2 list endpoint live after deploy
curl -s https://field-relay-nba.jeffunglesbee.workers.dev/bsd/r2/list?prefix=bsd/wc26/
# Expected: {"keys":[],"truncated":false} before games finish, populated after

# 3. Smoke passes
node smoke.js 2>&1 | tail -3

# 4. After game-final (check R2 populated)
curl -s https://field-relay-nba.jeffunglesbee.workers.dev/bsd/r2/list?prefix=bsd/wc26/ | \
  python3 -c "import json,sys; [print(k['key']) for k in json.load(sys.stdin)['keys']]"
# Expected: bsd/wc26/{id}/momentum.json, stats.json, incidents.json, average-positions.json
```

### COMMIT
```bash
git add src/index.js src/context-assembler.js
git commit -m "feat(bsd): buildBSDHistoryContext CONTEXT_SOURCE + R2 list endpoint + pitch div"
git push origin main
# Also commit jubilant-bassoon index.html if pitch div was added
```

---

## RELAY COMMIT HISTORY (2026-06-25)

| Commit | What |
|--------|------|
| `8cdb23a` | BSD relay routes (8 endpoints) |
| `750cb85` | /bsd to probe ALLOWED_PREFIX |
| `b5c9983` | ATP/WTA V2_LEAGUES + tennis branch |
| `7f9aaf1` | buildBSDMomentumContext CONTEXT_SOURCE |
| `e5b84f1` | BSD WebSocket → AmbientDO |
| `e5cddf5` | bsdEventId injection in handleV2Games |
| `e49debf` | /bsd/contract + /bsd/events/season + /bsd/events/by-date |
| `0af35ca` | bsd_event_id persisted to wc_results at game-final |
| `a55ebd3` | R2 capture at game-final (momentum/shotmap/incidents/avg-pos) |

---

## CLIENT COMMIT HISTORY (2026-06-25)

| Commit | What |
|--------|------|
| `4d4b78e` | Win probability chip A739 + SW sync 2026-06-25a |
| `05a1aef` | bsdEventId through mapV2ToESPN + bsd:ball/stats SSE + pitch renderer A_BSD_7/8 |

---

## OPEN ITEMS

- **API-Sports Football Pro renewal — JUNE 29 ⚠️** (4 days) — DO NOT RENEW
- CC-CMD-H (embedded above) — run after Ecuador vs Germany final tonight
- identity-resolver.js: add Ecuador, Germany, Japan, Sweden + other MD3 teams
- Wimbledon draw June 27 — ATP/WTA routes live
- All-Star Selector (July 6)
- wpLowest relay enrichment (comeback badge — Rule 70 atomic)
- The 33: 26 features + I3 pending
- session_health compromised — use /quality/report + live probes

---

## SESSION START PROTOCOL — Rule 85

L2: `tool_search("FIELD Handoff session health")` + `tool_search("codex commit write source")`
L3: `curl -s https://raw.githubusercontent.com/jeffunglesbee-create/jubilant-bassoon/main/CODE_MAP.json | python3 -c "import json,sys; m=json.load(sys.stdin); print(f'{len(m[\"functions\"])} functions')"`

## STAT
HEAD: 2d18fff · 572 companies · smoke 213/213
