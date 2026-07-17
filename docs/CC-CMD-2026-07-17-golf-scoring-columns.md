# CC-CMD: Golf Scoring Columns (Birdies / Bogeys / Doubles)

**Repo:** jubilant-bassoon (client-side only — relay already serves these fields)  
**File:** `index.html` (`renderPGALeaderboard`, line ~16763)  
**Branch:** main — commit directly, do not create a feature branch or PR.  
**Date:** 2026-07-17  
**Replaces:** `CC-CMD-2026-07-17-golf-green-light-wasted-green.md` (permanently
blocked — ESPN has no per-GIR birdie/bogey breakdown; see that doc for details)

## Background

ESPN's competitor-stats API provides raw scoring counts per player per
tournament. Three columns are confirmed available and not yet displayed:

| ESPN stat name       | Column | Display |
|----------------------|--------|---------|
| `birdies`            | B      | raw count, e.g. `4` |
| `bogeys`             | Bo     | raw count, e.g. `2` |
| `doubleBogeysAndWorse` | D+  | raw count, e.g. `1` |

These complement the existing GIR%, driving distance, and sand saves columns
by showing scoring pattern — a player with high GIR and high bogeys is
wasting greens; a player with low GIR and high birdies is scrambling well.

**Probe confirmation (2026-07-17, GitHub Actions runner, event 401811957,
athlete 10343):**
- `birdies` → present, value type: integer count
- `bogeys` → present, value type: integer count
- `doubleBogeysAndWorse` → present, value type: integer count

**Relay:** These stats are NOT currently in the enriched endpoint stats shape.
Relay must be updated first (two atomic commits per Rule 70).

## Probe Block (run before writing any code)

```bash
git log --oneline -5

# Confirm relay competitor-stats handler picks up these ESPN stat names
grep -n "birdies\|bogeys\|doubleBogeysAndWorse" ../field-relay-nba/src/index.js | head -10

# Confirm enriched stats shape
grep -n "birdies\|bogeys\|doubleBogeysAndWorse" ../field-relay-nba/src/index.js | grep -A2 "stats:"
```

## Changes

### Part A — Relay (field-relay-nba, commit first)

In `handleGolfCompetitorStats` (src/index.js, line ~3091), after `sandSavesPossible`:

```javascript
birdies:              pickStat('birdies'),
bogeys:               pickStat('bogeys'),
doublesOrWorse:       pickStat('doubleBogeysAndWorse'),
```

In the enriched endpoint `stats:` block (line ~3250), after `sandSaves`:

```javascript
birdies:        s?.birdies       ?? null,
bogeys:         s?.bogeys        ?? null,
doublesOrWorse: s?.doublesOrWorse ?? null,
```

Use `null` not `0` — client distinguishes "no data" (null, pre-round) from
zero (confirmed zero for the round).

### Part B — Client (jubilant-bassoon, commit after relay deploys)

In `renderPGALeaderboard` (index.html, line ~16800), in the `rows = players.map()` block
after the sand line:

```javascript
const birds = (stats.birdies != null) ? String(stats.birdies) : "";
const bogs  = (stats.bogeys != null)  ? String(stats.bogeys)  : "";
const dubs  = (stats.doublesOrWorse != null && stats.doublesOrWorse > 0)
  ? String(stats.doublesOrWorse) : "";
```

Add to each row:
```javascript
<td class="pga-birds">${birds}</td>
<td class="pga-bogs">${bogs}</td>
<td class="pga-dubs">${dubs}</td>
```

Add to thead:
```javascript
<th>B</th><th>Bo</th><th>D+</th>
```

Display rationale:
- Show `0` for birdies/bogeys (a round with 0 birdies is meaningful info)
- Hide doubles (`""`) when 0 (most rounds have no doubles; showing `0` everywhere is noise)

## Scope Boundary — Do Not Touch

- `buildGolfPromptContext` — keep as-is
- `computeGolfDerivedMetrics` / `_attachDerived` — keep
- Any other render function
- `sw.js` — do not touch

## Commits

**Relay (first):**
1. `feat: add birdies, bogeys, doublesOrWorse to golf competitor-stats handler`
2. `feat: expose birdies, bogeys, doublesOrWorse in golf enriched stats shape`

**Client (after relay deploys):**
3. `feat: add Birdies, Bogeys, Doubles+ columns to PGA leaderboard`

## Done Condition

```bash
# After relay deploys
curl -s "https://field-relay-nba.jeffunglesbee.workers.dev/v2/golf/enriched" \
  | node -e "
    const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    const p = (d.leaderboard||[])[0];
    console.assert('birdies' in p.stats, 'birdies missing');
    console.assert('bogeys' in p.stats, 'bogeys missing');
    console.assert('doublesOrWorse' in p.stats, 'doublesOrWorse missing');
    console.log('relay READY');
  "

# After client commits
node smoke.js index.html
# → 0 failed

grep -n "pga-birds\|pga-bogs\|pga-dubs" index.html
# → results present in renderPGALeaderboard
```

## Outbox Manifest (last task)

Write `outbox/cc-session-{date}-golf-scoring-columns.md` containing:
- HEAD before and after (relay + client commits)
- Smoke count before and after
- Done-condition curl output confirming relay fields
- Integration status: STAGED or VERIFIED
