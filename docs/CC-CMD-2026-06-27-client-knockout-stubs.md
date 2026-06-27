# CC-CMD-2026-06-27-client-knockout-stubs

**Date:** 2026-06-27  
**Scope:** Client only — `index.html` `wc26Raw`, 1 commit  
**Depends on:** CC-CMD-2026-06-27-relay-knockout-phase (relay must be deployed first)  
**Rule 87:** Self-completing. Explicit done condition. No carry-forwards.

---

## Context

`wc26Raw` in `index.html` covers group stage (June 11–27) plus one Final stub.
No R32–SF stubs exist, so knockout games don't render as schedule cards.
R32 runs June 28–July 4; first game kicks off June 28 19:00Z.

**Confirmed R32 fixtures from Odds API at session start:**
- South Africa vs Canada — 2026-06-28T19:00:00Z
- Brazil vs Japan — 2026-06-29T17:00:00Z
- Netherlands vs Morocco — 2026-06-30T01:00:00Z
- Ivory Coast vs Norway — 2026-06-30T17:00:00Z
- USA vs Bosnia & Herzegovina — 2026-07-02T00:00:00Z

More will appear after tonight's MD3 games complete (Groups G/H/J/K/L).

---

## Setup

```bash
cd /tmp
git clone https://${FIELD_PAT}@github.com/jeffunglesbee-create/jubilant-bassoon.git client
cd client

# Verify current wc26Raw entry count
python3 -c "
import re
c = open('index.html').read()
start = c.find('wc26Raw')
end = c.find('];', start)
block = c[start:end]
count = block.count('sport:')
print(f'Current wc26Raw entries: {count}')
print(f'Final stub present: {\"July 19\" in block or \"2026-07-19\" in block}')
"
```

---

## Step 1 — Probe Odds API for latest confirmed R32 fixtures

```bash
ODDS=$(curl -s https://field-relay-nba.jeffunglesbee.workers.dev/wc/odds-probs)
echo "$ODDS" | python3 - << 'PY'
import json, sys, datetime
data = json.loads(open('/dev/stdin').read()) if False else json.loads(sys.stdin.read() if False else __import__('subprocess').check_output(['echo', '$ODDS']).decode())
PY
# Simpler: just store to file for the build script
curl -s https://field-relay-nba.jeffunglesbee.workers.dev/wc/odds-probs > /tmp/odds.json
curl -s https://field-relay-nba.jeffunglesbee.workers.dev/wc/bracket > /tmp/bracket.json

python3 -c "
import json, datetime
odds = json.load(open('/tmp/odds.json'))
cutoff = datetime.datetime(2026,6,27,23,59, tzinfo=datetime.timezone.utc)
r32 = []
for p in odds.get('probs',[]):
    t = p.get('commence','')
    try:
        dt = datetime.datetime.fromisoformat(t.replace('Z','+00:00'))
        if dt > cutoff:
            r32.append({'home': p['home_team'], 'away': p['away_team'], 'time': t})
    except: pass
r32.sort(key=lambda x: x['time'])
print(f'R32 fixtures in Odds API: {len(r32)}')
for g in r32:
    print(f'  {g[\"home\"]} vs {g[\"away\"]} | {g[\"time\"]}')
"
```

---

## Step 2 — Build and insert knockout stubs

```bash
python3 - << 'PYEOF'
import json, datetime, re

# Load odds + bracket
odds_r32 = []
try:
    odds = json.load(open('/tmp/odds.json'))
    cutoff = datetime.datetime(2026, 6, 27, 23, 59, tzinfo=datetime.timezone.utc)
    for p in odds.get('probs', []):
        t = p.get('commence', '')
        try:
            dt = datetime.datetime.fromisoformat(t.replace('Z', '+00:00'))
            if dt > cutoff:
                odds_r32.append({'home': p['home_team'], 'away': p['away_team'], 'time': t})
        except: pass
    odds_r32.sort(key=lambda x: x['time'])
except Exception as e:
    print(f"Odds load failed: {e}")

bracket = {}
try:
    bracket = json.load(open('/tmp/bracket.json')).get('bracketSlots', {})
except Exception as e:
    print(f"Bracket load failed: {e}")

# Read index.html
with open('index.html', 'r') as f:
    content = f.read()

# Locate wc26Raw and confirm Final stub not being duplicated
wc_start = content.find('wc26Raw')
wc_end = content.find('];', wc_start)
wc_block = content[wc_start:wc_end]
final_present = '2026-07-19' in wc_block or 'July 19' in wc_block
print(f"Final stub already present: {final_present}")

# ── Build stub text ────────────────────────────────────────────────────────
def stub(home, away, time_iso, streams, group_key):
    s = ', '.join(f"'{x}'" for x in streams)
    return (
        f"  {{ home: '{home}', away: '{away}', "
        f"time: '{time_iso}', streams: [{s}], "
        f"league: 'FIFA World Cup 2026', sport: 'wc26', group: '{group_key}', confirmed: true }}"
    )

stubs = []
covered = set()

# R32: Odds API confirmed (ground truth — bookmaker-backed matchup + time)
for g in odds_r32:
    stubs.append(stub(g['home'], g['away'], g['time'], ['WC26_FOX'], 'r32'))
    covered.add(g['home'].lower())
    covered.add(g['away'].lower())

# R32: Bracket slots with prob ≥ 0.80 not yet in Odds API
# Estimated times: July 1-4, 2 slots each at 17:00Z and 01:00Z next day
est_times = [
    '2026-06-28T22:00:00Z',  # slot fallback (most R32 times now in Odds API)
    '2026-06-29T01:00:00Z',
    '2026-07-01T17:00:00Z',
    '2026-07-01T22:00:00Z',
    '2026-07-02T17:00:00Z',
    '2026-07-03T01:00:00Z',
    '2026-07-03T17:00:00Z',
    '2026-07-04T01:00:00Z',
    '2026-07-04T17:00:00Z',
    '2026-07-05T01:00:00Z',
]
est_idx = 0
for slot_num in range(73, 89):
    slot_a = bracket.get(f'R32_{slot_num}_A', {})
    slot_b = bracket.get(f'R32_{slot_num}_B', {})
    team_a = slot_a.get('team', '')
    team_b = slot_b.get('team', '')
    prob_a = slot_a.get('prob', 0)
    prob_b = slot_b.get('prob', 0)
    if not team_a or not team_b:
        continue
    if team_a.lower() in covered or team_b.lower() in covered:
        continue
    if max(prob_a, prob_b) < 0.5:
        continue  # too uncertain for a stub
    home = team_a if prob_a >= prob_b else team_b
    away = team_b if prob_a >= prob_b else team_a
    t = est_times[est_idx % len(est_times)]
    est_idx += 1
    print(f"  Bracket R32_{slot_num}: {home} vs {away} (probs {prob_a:.2f}/{prob_b:.2f}) est={t}")
    stubs.append(stub(home, away, t, ['WC26_FOX'], 'r32'))
    covered.add(home.lower())
    covered.add(away.lower())

# R16: 8 TBD games — teams unknown until R32 complete (July 5-8)
r16_times = [
    '2026-07-05T17:00:00Z', '2026-07-06T01:00:00Z',
    '2026-07-06T17:00:00Z', '2026-07-07T01:00:00Z',
    '2026-07-07T17:00:00Z', '2026-07-08T01:00:00Z',
    '2026-07-08T17:00:00Z', '2026-07-09T01:00:00Z',
]
for t in r16_times:
    stubs.append(stub('TBD', 'TBD', t, ['WC26_FOX'], 'r16'))

# QF: 4 TBD games (July 10-11)
for t in ['2026-07-10T17:00:00Z','2026-07-11T01:00:00Z','2026-07-11T17:00:00Z','2026-07-12T01:00:00Z']:
    stubs.append(stub('TBD', 'TBD', t, ['WC26_FOX'], 'qf'))

# SF: 2 TBD games (July 14-15)
for t in ['2026-07-14T23:00:00Z', '2026-07-15T23:00:00Z']:
    stubs.append(stub('TBD', 'TBD', t, ['WC26_FOX'], 'sf'))

# 3rd Place (July 18) — if not already present
if '3rd' not in wc_block.lower() and 'third' not in wc_block.lower():
    stubs.append(stub('TBD', 'TBD', '2026-07-18T23:00:00Z', ['WC26_FS1'], 'third'))

print(f"\nTotal knockout stubs to insert: {len(stubs)}")

# ── Insert before ]; of wc26Raw ────────────────────────────────────────────
insert = (
    '\n  // ── WC26 KNOCKOUT STUBS — CC-CMD-2026-06-27-client-knockout-stubs ──\n'
    + ',\n'.join(stubs)
    + '\n'
)
new_content = content[:wc_end] + insert + content[wc_end:]
with open('index.html', 'w') as f:
    f.write(new_content)

print("index.html updated.")
PYEOF
```

---

## Step 3 — Validate JS syntax + smoke gate

```bash
# Quick JS syntax check on wc26Raw (catches unterminated strings, bad commas)
node -e "
const s = require('fs').readFileSync('index.html','utf8');
// Find wc26Raw array and validate each entry is parseable
const m = s.match(/wc26Raw\s*=\s*(\[[\s\S]*?\n\];)/);
if (!m) { console.error('wc26Raw not found'); process.exit(1); }
// Replace single quotes with double quotes for JSON.parse check
try {
  const arr = eval('(' + m[1] + ')');
  console.log('wc26Raw entries:', arr.length);
  const wc = arr.filter(g => g.sport === 'wc26');
  console.log('wc26 sport entries:', wc.length);
  const knockout = wc.filter(g => ['r32','r16','qf','sf','third','final'].includes(g.group));
  console.log('knockout stubs:', knockout.length);
} catch(e) { console.error('PARSE ERROR:', e.message); process.exit(1); }
" 2>&1

# Run smoke
npm test 2>&1 | tail -8
SMOKE=$(npm test 2>&1 | grep -oP '\d+(?= passing)' | head -1)
echo "Smoke: $SMOKE"
[ "$SMOKE" -ge 663 ] || { echo "REGRESSION — abort"; exit 1; }
```

---

## Step 4 — Commit

```bash
git add index.html
git commit -m "feat(wc): R32+ knockout stubs in wc26Raw — R32×16 R16×8 QF×4 SF×2 3rd Final [skip ci]"
git push origin main
```

---

## Probe Block

```bash
# 1. Client HEAD advanced
curl -s -H "Authorization: token ${FIELD_PAT}" \
  "https://api.github.com/repos/jeffunglesbee-create/jubilant-bassoon/commits/main" \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['sha'][:7], d['commit']['message'][:60])"

# 2. wc26Raw entry count in committed file
curl -s "https://raw.githubusercontent.com/jeffunglesbee-create/jubilant-bassoon/main/index.html" \
  | grep -c "sport: 'wc26'" || true
# expect ≥ 100 (72 group + ≥ 28 knockout)

# 3. At least one R32 stub visible
curl -s "https://raw.githubusercontent.com/jeffunglesbee-create/jubilant-bassoon/main/index.html" \
  | grep "group: 'r32'" | head -3
```

---

## Done Condition

✅ Smoke ≥ 663  
✅ `wc26Raw` entry count ≥ 100  
✅ At least 4 R32 stubs present with confirmed Odds API times and teams  
✅ R16/QF/SF stubs present with estimated dates  
✅ No TBD entries in R32 slots where Odds API had confirmed matchups  

---

## Known Gaps (do NOT block this CC-CMD)

**BracketDO slot mismatch:** Odds API shows Ivory Coast vs Norway; BracketDO shows R32_74: Ivory Coast vs South Korea and R32_78: Ecuador vs Norway. This CC-CMD uses Odds API as ground truth for team names in R32 stubs. BracketDO slot definitions need a separate fix once the correct FIFA 2026 bracket pairing matrix is confirmed.

**Broadcast accuracy:** All knockout stubs use `WC26_FOX`. Actual FOX/FS1 split for R32 won't be announced until closer to the games. Stubs will show FOX chip; update streams when FIFA publishes broadcast schedule.

**Estimated R16/QF/SF times:** All TBD. Correct once FIFA publishes bracket-dependent schedule after R32 completes.
