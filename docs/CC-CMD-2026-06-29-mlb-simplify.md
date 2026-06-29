# CC-CMD — MLB Schedule Simplification (Layers 1–3)

**Date:** 2026-06-29
**Repo:** jeffunglesbee-create/jubilant-bassoon (CLIENT ONLY)
**Scope:** Simplify parseBroadcasts, enrich normalizeMLBGame, wire standings badges
**Why:** Fetch path audit confirmed all 5 opportunities are DIRECT client calls.
         No relay changes needed.
**Target time:** 30 min

---

## WHAT CHANGES (3 layers, all client, all same commit)

**Layer 1 — parseBroadcasts reads API fields instead of manual maps**
- Read `b.isNational` instead of inferring from chip map
- Read `b.homeAway === 'home' && !b.isNational` for RSN instead of `MLB_TEAM_RSN[abbr]`
- Read `b.freeGame` for free game detection
- `MLB_TEAM_RSN` becomes fallback, not primary source
- `MLB_BROADCAST_CHIP_MAP` stays (still needed for display chip codes)

**Layer 2 — normalizeMLBGame carries new fields**
- `isPlayoff: !['R','S','E','A'].includes(g.gameType ?? 'R')`
- `freeGame: broadcasts.some(b => b.freeGame)`
- `startTimeTBD: g.status?.startTimeTBD || false`
- `availableForStreaming: broadcasts.some(b => b.availableForStreaming)`

**Layer 3 — fetchMLBStandingsParsed reads 3 additional fields**
- `magicNumber` (already on response, not read)
- `clinchIndicator` (already on response, not read)
- `eliminationNumber` (already on response, not read)

---

## PROBE BLOCK

```bash
# P1: Current parseBroadcasts — full function
grep -n "function parseBroadcasts" index.html
# Read full body (L19494-19547 per render audit)
sed -n '19490,19555p' index.html

# P2: Current normalizeMLBGame return object — where to add new fields
sed -n '19564,19640p' index.html

# P3: MLB_TEAM_RSN constant — what we're demoting to fallback
grep -n "MLB_TEAM_RSN" index.html | head -5
sed -n '7270,7310p' index.html  # adjust based on grep

# P4: fetchMLBStandingsParsed — current push() call
grep -n "fetchMLBStandingsParsed" index.html
# Read the function + what it pushes to the array
sed -n '27615,27660p' index.html

# P5: isPlayoff re-derive sites — what Layer 2 eliminates
grep -n "isPlayoff\|gameType.*P\|postseason" index.html | grep -v "//" | head -15

# P6: eslint baseline
npx eslint index.html 2>&1 | tail -3

# P7: smoke baseline
node smoke.js index.html 2>&1 | tail -3
```

**Read all output before writing any code. Adjust line numbers from grep results.**

---

## LAYER 1: parseBroadcasts upgrade

Read the probe output. Find where `parseBroadcasts` currently sets `localRsn` and `localBlackedOut`.

**Change 1a — RSN from API instead of hardcoded map:**

Find the line that reads `MLB_TEAM_RSN[homeAbbr]` or similar. Replace with:

```javascript
// Primary: API broadcast with homeAway='home' and not national
const apiRsn = broadcasts.find(b => b.homeAway === 'home' && b.isNational === false);
const localRsn = apiRsn ? apiRsn.name : (MLB_TEAM_RSN[homeAbbr] || null);
```

**Change 1b — localBlackedOut from isNational:**

Find where `localBlackedOut` is derived. Add/replace:

```javascript
const hasNational = broadcasts.some(b => b.isNational === true);
```

Use `hasNational` wherever `localBlackedOut` was previously computed from the chip map.

**Change 1c — freeGame flag:**

After the broadcasts loop, add:

```javascript
result.freeGame = broadcasts.some(b => b.freeGame === true);
result.availableForStreaming = broadcasts.some(b => b.availableForStreaming === true);
```

**Do NOT remove MLB_TEAM_RSN or MLB_BROADCAST_CHIP_MAP.** They become fallbacks.

---

## LAYER 2: normalizeMLBGame enrichment

In the return object of `normalizeMLBGame` (around L19600), add after existing fields:

```javascript
isPlayoff: !['R', 'S', 'E', 'A'].includes(g.gameType ?? 'R'),
startTimeTBD: g.status?.startTimeTBD || false,
```

`freeGame` and `availableForStreaming` already come through from `parseBroadcasts`
result (Layer 1). Confirm by reading the spread pattern in normalizeMLBGame.

After adding `isPlayoff` to the normalized output, find and remove the 4 re-derive
sites identified in the render audit. Each should be a regex or string check like
`game.league === 'postseason'` or similar — replace with `game.isPlayoff`.

---

## LAYER 3: fetchMLBStandingsParsed enrichment

Find the `push()` or object creation in `fetchMLBStandingsParsed` (L27621+).
Add three fields from the same API response object:

```javascript
magic: rec.magicNumber ?? null,
clinch: rec.clinchIndicator ?? null,
elim: rec.eliminationNumber ?? null,
```

These are read-only additions. The card template doesn't need to consume them
yet — that's a separate UI task. This just makes them available in the data layer.

---

## VERIFY

```bash
# eslint must not add new violations
npx eslint index.html 2>&1 | tail -5

# smoke must pass (existing + any new assertions)
node smoke.js index.html 2>&1 | tail -3
```

---

## ADD SMOKE ASSERTIONS

```javascript
assert("MLB-SIMP-001 — isPlayoff derived from gameType in normalizeMLBGame",
  html.includes("g.gameType") && html.includes("isPlayoff"),
  "normalizeMLBGame must derive isPlayoff from gameType, not re-compute elsewhere");

assert("MLB-SIMP-002 — parseBroadcasts reads b.isNational",
  html.includes("b.isNational") || html.includes(".isNational"),
  "parseBroadcasts must read isNational from API broadcast object");

assert("MLB-SIMP-003 — fetchMLBStandingsParsed reads magicNumber",
  html.includes("magicNumber") && html.includes("clinchIndicator"),
  "Standings must read magicNumber and clinchIndicator from API response");
```

---

## COMMIT

```bash
git add index.html smoke.js
git commit -m "feat(mlb): schedule simplification — isPlayoff/isNational/magicNumber from API fields

- parseBroadcasts: RSN from b.homeAway, blackout from b.isNational, freeGame from b.freeGame
- normalizeMLBGame: isPlayoff from gameType, startTimeTBD from status
- fetchMLBStandingsParsed: magicNumber + clinchIndicator + eliminationNumber
- MLB_TEAM_RSN demoted to fallback (not removed)
- 3 smoke assertions added (MLB-SIMP-001/002/003)"
git push origin main
```

---

## CONFIDENCE SCORING

| Factor | Points | Check |
|--------|--------|-------|
| parseBroadcasts reads isNational from API | 20 | grep confirms b.isNational |
| RSN from API with MLB_TEAM_RSN fallback | 15 | grep confirms homeAway + fallback |
| isPlayoff from gameType (not re-derived) | 20 | grep confirms, re-derive sites removed |
| Standings reads magicNumber + clinchIndicator | 15 | grep confirms |
| Smoke passes (existing + MLB-SIMP-001/002/003) | 20 | exit 0 |
| eslint clean (no new violations) | 10 | same count as baseline |

Score < 95: do not push. Investigate.

---

## WHAT THIS DOES NOT CHANGE

- No relay edits (all 5 opportunities are DIRECT client calls)
- No UI changes (data layer only — surfaces consume later)
- MLB_TEAM_RSN not removed (fallback)
- MLB_BROADCAST_CHIP_MAP not removed (display codes still needed)
- No new fetch calls (all fields from existing API responses)

---

**Session: 2026-06-29 · CLIENT ONLY · 30 min target · Confidence gate: 95**
