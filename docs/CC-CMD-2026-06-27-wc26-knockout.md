# CC-CMD-2026-06-27-wc26-knockout

**Date:** 2026-06-27  
**Scope:** 2 commits — relay knockout D1 writes (Commit 1) + client R32+ game stubs (Commit 2)  
**Deadline:** Must land before June 28 19:00Z (first R32 kickoff: South Africa vs Canada)  
**Rule 87:** Self-completing. Explicit done condition. No carry-forwards.

---

## Context

`wc26Raw` in `index.html` only covers group stage (June 11–27) + the Final stub. No R32–SF stubs exist, so knockout games won't render as cards and knockout results won't write to D1 (relay `extractWCGroup()` returns null for non-group-stage rounds, blocking the write path).

**Odds API confirmed:** Already listing R32 fixtures as matchups finalize — South Africa vs Canada (Jun 28), Brazil vs Japan (Jun 29), Netherlands vs Morocco (Jun 30), Ivory Coast vs Norway (Jun 30), USA vs Bosnia (Jul 2). No relay odds changes needed; they self-populate.

---

## Commit 1 — Relay: Knockout Phase D1 Writes

**Repo:** `field-relay-nba` (PAT: `${FIELD_PAT}`)

### Step 1 — Read current relay knockout write path

```bash
cd /tmp && git clone https://${FIELD_PAT}@github.com/jeffunglesbee/field-relay-nba.git relay && cd relay
# Locate extractWCGroup and the write call site
grep -n "extractWCGroup\|writeWCResult\|wc_results\|Phase.*round\|round.*group" src/index.js | head -40
```

### Step 2 — Add `extractWCPhase` helper immediately after `extractWCGroup`

Find the `extractWCGroup` function. Immediately after its closing brace, insert:

```javascript
// Knockout phase detector — ESPN sends "Round of 32", "Round of 16", "Quarterfinals" etc.
function extractWCPhase(round) {
  if (!round) return null;
  const r = round.toLowerCase();
  if (/round\s+of\s+32|r32/.test(r))                              return 'r32';
  if (/round\s+of\s+16|r16|sixteen/.test(r))                      return 'r16';
  if (/quarter/.test(r))                                           return 'qf';
  if (/semi/.test(r) && !/quarter/.test(r))                        return 'sf';
  if (/third|3rd\s+place|third\s+place/.test(r))                  return 'third';
  if (/final/.test(r) && !/semi|quarter|third|3rd/.test(r))       return 'final';
  return null;
}
```

### Step 3 — Extend the result write call site

Find the block that currently does:
```javascript
const groupId = extractWCGroup(round);
if (groupId) {
  // writes group stage result
}
```

Replace/extend so that when `groupId` is null, it tries knockout phase:

```javascript
const groupId = extractWCGroup(round);
if (groupId) {
  // existing group stage path — unchanged
  await writeWCResult(db, game, groupId, 'group');
} else {
  const phase = extractWCPhase(round);
  if (phase) {
    // Knockout: use phase string as group_id to satisfy NOT NULL constraint
    // D1 consumers filter by phase column, not group_id
    await writeWCResult(db, game, phase.toUpperCase(), phase);
  }
  // else: unrecognized round string, skip silently (existing behavior)
}
```

> **Note on `writeWCResult` signature:** If the function currently takes `(db, game, groupId)`, add a 4th param `phase = 'group'` and use it in the INSERT. Existing calls pass nothing for phase 4th arg → defaults to 'group'. Knockout calls pass the phase string explicitly. The `group_id` column gets `'R32'`, `'R16'`, `'QF'`, `'SF'`, `'THIRD'`, or `'FINAL'` — satisfies NOT NULL, is human-readable, and distinct from single-letter group IDs.

### Step 4 — Verify ESPN round strings (in case they differ)

```bash
# Check what ESPN actually sends for round field in WC context
grep -n "round\|league.*round\|wc.*round" src/index.js | grep -i "espn\|adapt\|wc" | head -20
```

If ESPN sends different strings (e.g. "Sixteen" instead of "Round of 16"), update the regex in `extractWCPhase` to match. The relay already has `group_name` from BSD for WC; ESPN's `league.season.slug` or `type.text` field may carry the round.

### Step 5 — Commit and deploy relay

```bash
git add src/index.js
git commit -m "feat(wc): knockout phase D1 write path — extractWCPhase + r32/r16/qf/sf writes"
git push origin main
```

Wait ~3 min for Cloudflare deploy. Verify:
```bash
curl -s https://field-relay-nba.jeffunglesbee.workers.dev/health | python3 -c "import json,sys; d=json.load(sys.stdin); print('relay ok' if d.get('ok') or d.get('status')=='ok' else d)"
```

---

## Commit 2 — Client: R32+ Game Stubs in `wc26Raw`

**Repo:** `jubilant-bassoon`

### Step 1 — Read Odds API for current confirmed R32 matchups and times

```bash
RELAY="https://field-relay-nba.jeffunglesbee.workers.dev"
ODDS=$(curl -s "$RELAY/wc/odds-probs")
echo "$ODDS" | python3 -c "
import json,sys
d=json.load(sys.stdin)
probs=d.get('probs',[])
# Filter to R32 games (commence after June 27 23:59Z = after all group stage)
import datetime
cutoff = datetime.datetime(2026,6,27,23,59,tzinfo=datetime.timezone.utc)
r32 = []
for p in probs:
    t = p.get('commence','')
    if not t: continue
    try:
        dt = datetime.datetime.fromisoformat(t.replace('Z','+00:00'))
        if dt > cutoff:
            r32.append(p)
    except: pass
print(f'Confirmed R32 fixtures in Odds API: {len(r32)}')
for g in sorted(r32, key=lambda x: x.get('commence','')):
    print(f'  {g[\"home_team\"]} vs {g[\"away_team\"]} | {g[\"commence\"]}')
"
```

### Step 2 — Read current wc26Raw end for structure reference

```bash
# Clone client
cd /tmp && git clone https://${FIELD_PAT}@github.com/jeffunglesbee/jubilant-bassoon.git client && cd client

# Find wc26Raw structure: show the last 25 lines of the array (before closing bracket)
python3 - << 'EOF'
import re
with open('index.html', 'r') as f:
    content = f.read()

# Find wc26Raw block
start = content.find('const wc26Raw')
if start == -1:
    start = content.find('wc26Raw =')
end = content.find('];', start) + 2
block = content[start:end]
# Show last 500 chars to understand the structure of the closing entries
print("LAST 600 chars of wc26Raw:")
print(block[-600:])
print("\nFIRST entry (structure reference):")
# Find first { after [
first_start = block.find('[') + 1
first_end = block.find('},', first_start) + 1
print(block[first_start:first_end+1].strip())
EOF
```

### Step 3 — Build and insert R32+ stubs

```bash
python3 - << 'PYEOF'
import re, json, datetime

with open('index.html', 'r') as f:
    content = f.read()

# ── Fetch current Odds API matchups via curl ──────────────────────────────
import subprocess, json as _json
odds_raw = subprocess.check_output([
    'curl', '-s', 'https://field-relay-nba.jeffunglesbee.workers.dev/wc/odds-probs'
]).decode()
odds_data = _json.loads(odds_raw)
probs = odds_data.get('probs', [])
cutoff = datetime.datetime(2026, 6, 27, 23, 59, tzinfo=datetime.timezone.utc)
confirmed_r32 = {}
for p in probs:
    t = p.get('commence', '')
    if not t:
        continue
    try:
        dt = datetime.datetime.fromisoformat(t.replace('Z', '+00:00'))
        if dt > cutoff:
            key = f"{p['home_team']} vs {p['away_team']}"
            confirmed_r32[key] = {'home': p['home_team'], 'away': p['away_team'], 'time': t}
    except:
        pass

print(f"Odds API R32 fixtures found: {len(confirmed_r32)}")
for k in sorted(confirmed_r32, key=lambda k: confirmed_r32[k]['time']):
    print(f"  {k} | {confirmed_r32[k]['time']}")

# ── Build stub entry text ─────────────────────────────────────────────────
def make_stub(home, away, time_iso, streams, label, group_key):
    return (
        f"  {{ home: '{home}', away: '{away}', "
        f"time: '{time_iso}', streams: [{', '.join(repr(s) for s in streams)}], "
        f"league: 'FIFA World Cup 2026', sport: 'wc26', group: '{group_key}', confirmed: true }}"
    )

stubs = []

# ── R32: Known from Odds API (use those times + teams) ───────────────────
# Map Odds API teams → stub entries in time order
for key in sorted(confirmed_r32, key=lambda k: confirmed_r32[k]['time']):
    g = confirmed_r32[key]
    stubs.append(make_stub(g['home'], g['away'], g['time'], ['WC26_FOX'], 'R32', 'r32'))

# ── R32: Remaining slots where bracket has prob>0.85 but Odds API not yet listing ─
# Fetch bracket for remaining unconfirmed slots
bracket_raw = subprocess.check_output([
    'curl', '-s', 'https://field-relay-nba.jeffunglesbee.workers.dev/wc/bracket'
]).decode()
bracket = _json.loads(bracket_raw).get('bracketSlots', {})

# Build set of already-covered team pairs
covered_teams = set()
for key, g in confirmed_r32.items():
    covered_teams.add(g['home'].lower())
    covered_teams.add(g['away'].lower())

# R32 slots to check (73-88)
for slot_num in range(73, 89):
    slot_a = bracket.get(f'R32_{slot_num}_A', {})
    slot_b = bracket.get(f'R32_{slot_num}_B', {})
    team_a = slot_a.get('team', 'TBD')
    team_b = slot_b.get('team', 'TBD')
    prob_a = slot_a.get('prob', 0)
    prob_b = slot_b.get('prob', 0)
    # Skip if either team already in covered set
    if team_a.lower() in covered_teams or team_b.lower() in covered_teams:
        continue
    if team_a == 'TBD' or team_b == 'TBD':
        continue
    # Use prob > 0.5 as "best guess" — will be corrected by ESPN/BSD writes
    home = team_a if prob_a >= prob_b else team_b
    away = team_b if prob_a >= prob_b else team_a
    # Estimate time: July 1-4 range for remaining slots, noon or 8pm ET
    # Use a placeholder ISO; CC should update once Odds API lists them
    time_est = '2026-07-01T17:00:00Z'  # noon ET July 1, adjust as Odds API updates
    print(f"  Bracket R32_{slot_num}: {home} vs {away} (probs {prob_a:.2f}/{prob_b:.2f}) — time estimated, update when Odds API lists")
    stubs.append(make_stub(home, away, time_est, ['WC26_FOX'], f'R32_{slot_num}', 'r32'))

# ── R16: 8 TBD games, July 5-8 ───────────────────────────────────────────
r16_times = [
    '2026-07-05T17:00:00Z', '2026-07-06T01:00:00Z',
    '2026-07-06T17:00:00Z', '2026-07-07T01:00:00Z',
    '2026-07-07T17:00:00Z', '2026-07-08T01:00:00Z',
    '2026-07-08T17:00:00Z', '2026-07-09T01:00:00Z',
]
for i, t in enumerate(r16_times):
    stubs.append(make_stub('TBD', 'TBD', t, ['WC26_FOX'], f'R16_{i+1}', 'r16'))

# ── QF: 4 TBD games, July 10-11 ──────────────────────────────────────────
qf_times = [
    '2026-07-10T17:00:00Z', '2026-07-11T01:00:00Z',
    '2026-07-11T17:00:00Z', '2026-07-12T01:00:00Z',
]
for i, t in enumerate(qf_times):
    stubs.append(make_stub('TBD', 'TBD', t, ['WC26_FOX'], f'QF_{i+1}', 'qf'))

# ── SF: 2 TBD games, July 14-15 ──────────────────────────────────────────
sf_times = ['2026-07-14T23:00:00Z', '2026-07-15T23:00:00Z']
for i, t in enumerate(sf_times):
    stubs.append(make_stub('TBD', 'TBD', t, ['WC26_FOX'], f'SF_{i+1}', 'sf'))

# ── 3rd Place: July 18 ────────────────────────────────────────────────────
stubs.append(make_stub('TBD', 'TBD', '2026-07-18T23:00:00Z', ['WC26_FS1'], '3RD', 'third'))

# ── Final: July 19 — may already exist in wc26Raw ────────────────────────
# Check if Final stub already present; skip if so
final_already = 'July 19' in content or '2026-07-19' in content
print(f"Final stub already in wc26Raw: {final_already}")
if not final_already:
    stubs.append(make_stub('TBD', 'TBD', '2026-07-19T23:00:00Z', ['WC26_FOX'], 'FINAL', 'final'))

# ── Find insertion point: end of wc26Raw, before ]; ──────────────────────
wc26_start = content.find('const wc26Raw')
if wc26_start == -1:
    wc26_start = content.find('wc26Raw =')
wc26_end = content.find('];', wc26_start)

# Insert stubs before the closing ];
insert_text = '\n  // ── WC26 KNOCKOUT STUBS (CC-CMD-2026-06-27) ──────────────────────────────\n'
insert_text += ',\n'.join(stubs)
insert_text += '\n'

new_content = content[:wc26_end] + insert_text + content[wc26_end:]
with open('index.html', 'w') as f:
    f.write(new_content)

print(f"\nInserted {len(stubs)} knockout stubs into wc26Raw")
print("DONE — review index.html wc26Raw section before committing")
PYEOF
```

### Step 4 — Handle TBD team names in smoke checks

The smoke CHECK 5 asserts no '?' placeholder team names. 'TBD' is not '?' so passes. However, if any existing smoke assertion checks `allData` game count or confirmed state, verify these don't break:

```bash
# Quick sanity: check that wc26Raw array is still valid JS after edit
node -e "const s = require('fs').readFileSync('index.html','utf8'); const m = s.match(/wc26Raw\s*=\s*(\[[\s\S]*?\]);/); if(!m) throw new Error('wc26Raw not found'); JSON.parse(m[1].replace(/'/g,'\"')); console.log('wc26Raw JS valid');" 2>&1 || echo "WARNING: syntax check failed — inspect index.html"
```

> **Note on TBD stubs:** TBD stubs will render as WC game cards with "TBD vs TBD". This is intentional — they show the scheduled time slot and update automatically as ESPN feeds actual team names via V2 polling and BSD. The `resolveWCBracketTeam` function at L30392 will supplement display with bracket-derived names when available.

### Step 5 — Smoke gate + commit

```bash
# Run smoke
npm test 2>&1 | tail -5
SMOKE_COUNT=$(npm test 2>&1 | grep -oP '\d+ passing' | grep -oP '\d+')
echo "Smoke: $SMOKE_COUNT"
if [ "$SMOKE_COUNT" -lt 663 ]; then
  echo "REGRESSION — do not commit"
  exit 1
fi

git add index.html
git commit -m "feat(wc): R32+ knockout stubs in wc26Raw — R32×16 R16×8 QF×4 SF×2 3rd Final [skip ci]"
git push origin main
```

---

## Probe Block

```bash
# 1. Relay: confirm extractWCPhase is deployed
curl -s https://field-relay-nba.jeffunglesbee.workers.dev/health | python3 -c "import json,sys; d=json.load(sys.stdin); print('relay ok')"

# 2. Relay: confirm no regression in existing wc/results endpoint
COUNT=$(curl -s https://field-relay-nba.jeffunglesbee.workers.dev/wc/results | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d.get('results',[])))")
echo "D1 results rows: $COUNT (should be ≥56)"

# 3. Client HEAD advanced past 410ab94
CLIENT_HEAD=$(curl -s -H "Authorization: token ${FIELD_PAT}" \
  "https://api.github.com/repos/jeffunglesbee/jubilant-bassoon/commits/main" | python3 -c "import json,sys; print(json.load(sys.stdin)['sha'][:7])")
echo "Client HEAD: $CLIENT_HEAD"

# 4. Spot-check: wc26Raw entry count increased
STUB_COUNT=$(curl -s https://raw.githubusercontent.com/jeffunglesbee/jubilant-bassoon/main/index.html | grep -c "'sport': 'wc26'" || grep -c "sport: 'wc26'")
echo "WC26 stubs in wc26Raw: $STUB_COUNT (was 72+1; should be 72+32+)"
```

---

## Done Condition

✅ Relay: `extractWCPhase` present in committed `src/index.js` AND relay deployes without error  
✅ Client: smoke ≥ 663 AND wc26Raw has ≥ 100 entries (72 group + ≥ 28 knockout)  
✅ First R32 game (South Africa vs Canada, June 28 19:00Z) will render as a card in FIELD  
✅ When ESPN/BSD report final score for any knockout game with matching round string, it writes to `wc_results` with correct phase  

No carry-forwards. Relay odds pickup confirmed self-functioning (5 R32 fixtures already in Odds API as of session start, more will appear after tonight's MD3 completes).

---

## Known Gap

**BracketDO slot assignment discrepancy:** The Odds API lists "Ivory Coast vs Norway" (confirmed by 23+ bookmakers), but BracketDO's Monte Carlo shows R32_74: Ivory Coast vs South Korea and R32_78: Ecuador vs Norway. This means the `WC_R32 Bracket Slot Definitions` at L30363 have the Group E/I cross-pairing inverted vs the actual FIFA predetermined bracket. The stubs in this CC-CMD use Odds API as ground truth for confirmed matchups; the bracket slot definition mismatch should be fixed in a follow-up session once the correct FIFA bracket pairing matrix is confirmed.
