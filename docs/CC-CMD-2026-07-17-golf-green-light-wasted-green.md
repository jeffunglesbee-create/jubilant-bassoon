# CC-CMD: Golf Green Light Rate and Wasted Green columns

**Repo:** jubilant-bassoon (client-side only if relay already serves fields;
otherwise field-relay-nba + jubilant-bassoon atomic pair)  
**File:** `index.html` (`renderPGALeaderboard`, line ~16763)  
**Branch:** main — commit directly, do not create a feature branch or PR.  
**Date:** 2026-07-17  
**Dependency:** Probe block must confirm ESPN/relay field availability before
writing any code. If fields are absent, the relay change must land first
(field-relay-nba CC-CMD, then this one).

## Background

July 10 spec identified two owned metrics visible in FIELD's golf card:

- **Green Light Rate** — birdie-or-better conversion rate on GIR holes.
  Formula: `birdiesOnGir / girHit * 100`. A player who hits 12 greens and
  makes birdie or better on 5 of them has a 42% Green Light Rate.

- **Wasted Green** — bogey-or-worse rate despite hitting the green.
  Formula: `bogeysOnGir / girHit * 100`. Inverse signal: a high Wasted Green
  means a player is hitting greens but not converting.

These are exact, owned metrics (not estimated SG), computed from ESPN data
FIELD already has legal confirmed access to. Sand Saves column shipped
2026-07-17 (commit 9f93fe4). These two are the remaining gap.

## Probe Block (run before writing any code)

```bash
# Confirm HEAD
git log --oneline -5

# Check what the relay currently serves per player in the enriched endpoint
# (look at stats object shape — does it include birdiesOnGir or similar?)
grep -n "birdiesOnGir\|bogeysOnGir\|greenLight\|wastedGreen\|birdie.*gir\|gir.*birdie" \
  ../field-relay-nba/src/index.js | head -20

# Check what ESPN's common/v3 athlete stats API actually provides by name
# (look for the pickStat calls and what stat names are accessed)
grep -n "pickStat\|birdies\|bogeys\|scramble" \
  ../field-relay-nba/src/index.js | head -30

# Check the live relay endpoint to see real per-player stat fields
# (run this if network access is available; sandbox blocks if not)
curl -s "https://field-relay-nba.jeffunglesbee.workers.dev/v2/golf/enriched" \
  | node -e "
    const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    const p = (d.leaderboard||[])[0];
    if (!p) { console.log('no leaderboard'); process.exit(1); }
    console.log('stats keys:', Object.keys(p.stats||{}));
    console.log('sample stats:', JSON.stringify(p.stats, null, 2));
  "

# If no live probe is possible, probe the ESPN competitor-stats shape
# to see if birdiesOnGir or similar exists in the raw API response
# (use a known PGA event ID + athlete ID from recent tournament)
```

## Decision Gate

**If relay already serves `birdiesOnGir` and `bogeysOnGir`:**  
→ Client-only change. Add columns to `renderPGALeaderboard` and
`computeGolfDerivedMetrics`. No relay CC-CMD needed.

**If relay does NOT serve these fields:**  
→ Two atomic commits required (ATOMIC-A Rule 70):  
1. Relay CC-CMD adds `birdiesOnGir` and `bogeysOnGir` to the enriched
   per-player stats shape, sourced from ESPN's athlete stats API.
   Confirm which ESPN stat name maps to each (probe `pickStat` calls first).
2. This CC-CMD (client) adds the columns, reading the new relay fields.

## Changes (client side — only if relay probe confirms field availability)

### 1. Add Green Light Rate to `renderPGALeaderboard` (line ~16763)

In the `rows = players.map(p => {...})` block:

```javascript
// Add after existing sand line:
const glr = (stats.birdiesOnGir != null && stats.gir > 0)
  ? `${Math.round(stats.birdiesOnGir)}%` : "";
const wg  = (stats.bogeysOnGir != null && stats.gir > 0)
  ? `${Math.round(stats.bogeysOnGir)}%` : "";
```

Add `<td class="pga-glr">${glr}</td>` and `<td class="pga-wg">${wg}</td>`  
Add `<th>GRN%</th>` and `<th>WG%</th>` to thead.

### 2. Add to `computeGolfDerivedMetrics` if field-relative comparison is useful

If relay serves raw counts (e.g. `birdiesOnGirCount`/`girHit`), compute the
percentage client-side. If relay serves the percentage directly, display as-is.

## Scope Boundary — Do Not Touch

- `buildGolfPromptContext` — keep as-is
- `computeGolfPackDensity` — keep
- `computeCutLineProjection` — keep
- `computeGolfDerivedMetrics` — keep (only add if needed for computation)
- `sw.js` — do not touch
- Any relay code unless probe confirms relay change is needed

## Commits

One concern per commit:

1. `feat: add Green Light Rate column to PGA leaderboard` (client)
2. `feat: add Wasted Green column to PGA leaderboard` (client)

If relay changes are needed, relay commits go first.

## Done Condition

```bash
node smoke.js index.html
# → 0 failed

# Confirm new columns appear in rendered HTML
grep -n "pga-glr\|pga-wg\|GRN%\|WG%" index.html
# → results present

# Confirm relay field reads exist in renderPGALeaderboard
grep -n "birdiesOnGir\|bogeysOnGir" index.html
# → results in renderPGALeaderboard function
```

## STAGED Status

**STAGED** pending relay CC-CMD execution.

**Blocked by:** Relay enriched endpoint does not serve `birdiesOnGir` or
`bogeysOnGir` (confirmed probe 2026-07-17: relay `pickStat` calls do not
include these fields). ESPN stat names unknown — sandbox blocks external HTTP.

**Relay CC-CMD written:**
`field-relay-nba/docs/CC-CMD-2026-07-17-golf-green-light-wasted-green-relay.md`
(commit `ff70463` on `field-relay-nba/main`)

**Unblocked when:** That relay CC-CMD is executed (it probes ESPN for stat
names, adds the fields to `handleGolfCompetitorStats` and the enriched
endpoint, and deploys). The relay CC-CMD's done-condition probe must print
`RELAY UNBLOCKED` before executing this client CC-CMD.

**Verify when unblocked:**
```bash
curl -s "https://field-relay-nba.jeffunglesbee.workers.dev/v2/golf/enriched" \
  | node -e "
    const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    const p = (d.leaderboard||[])[0];
    console.assert(p.stats.birdiesOnGir != null, 'birdiesOnGir missing');
    console.assert(p.stats.bogeysOnGir != null, 'bogeysOnGir missing');
    console.log('UNBLOCKED — proceed with client CC-CMD');
  "
```

## Outbox Manifest

Write `outbox/cc-session-{date}-golf-green-light-wasted-green.md` after
completing all tasks, containing:

- HEAD before and after
- Smoke count before and after
- Probe output confirming relay field availability
- Integration status: STAGED or VERIFIED
