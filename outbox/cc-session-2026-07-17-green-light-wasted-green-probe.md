# CC Session: Green Light Rate / Wasted Green — Probe and Relay CC-CMD

**Date:** 2026-07-17  
**Repo:** jubilant-bassoon (probe) + field-relay-nba (relay CC-CMD written)  
**Branch:** main (both repos)

## HEAD Progression

**jubilant-bassoon:**
- Before: `3aec84e` (docs: golf leaderboard session doc + CC-CMD for green light / wasted green)
- After:  `a9c685b` (docs: update green-light CC-CMD — relay pair written, blocked pending ESPN probe)

**field-relay-nba:**
- Before: `a61406b` (pre-session remote state — codemap refresh from prior CC run)
- After:  `ff70463` (docs: relay CC-CMD for birdiesOnGir + bogeysOnGir)

## Smoke

- Before: 958 passed, 0 failed
- After:  958 passed, 0 failed (no index.html changes; docs-only commits)

## Probe Output

```
Relay enriched endpoint probe (2026-07-17):
- Sandbox blocks outbound HTTP to relay worker (proxy returns 403 Forbidden)
- Code inspection of field-relay-nba/src/index.js confirmed: pickStat() calls
  do NOT include birdiesOnGir or bogeysOnGir (lines 3024-3046, 3087-3104)
- Relay enriched stats shape (lines 3250-3256) only contains:
    gir, drivingDistance, drivingAccuracy, puttsPerGir, sandSaves
```

## Decision Gate Result

**Relay does NOT serve these fields.** Two atomic commits required (Rule 70).

- `birdiesOnGir` and `bogeysOnGir` are absent from both ESPN pickStat call
  sites in index.js and from the enriched endpoint stats shape.
- ESPN stat names for these two metrics are unknown — sandbox blocks the
  ESPN competitor-stats probe.
- Cannot write relay code without confirmed ESPN stat names (Rule 2/68).

## What Was Done This Session

1. Ran full CC-CMD probe block from `docs/CC-CMD-2026-07-17-golf-green-light-wasted-green.md`
2. Confirmed relay doesn't serve required fields via code inspection
3. Confirmed sandbox blocks outbound HTTP (403 from proxy agent) 
4. Wrote paired relay CC-CMD: `field-relay-nba/docs/CC-CMD-2026-07-17-golf-green-light-wasted-green-relay.md`
   (commit `ff70463`, pushed to `field-relay-nba/main`)
5. Updated client CC-CMD to reference relay pair and document block reason

## Integration Status

**STAGED** — relay change required first.

**Relay CC-CMD:** `field-relay-nba/docs/CC-CMD-2026-07-17-golf-green-light-wasted-green-relay.md`  
**Client CC-CMD:** `jubilant-bassoon/docs/CC-CMD-2026-07-17-golf-green-light-wasted-green.md`

**Execution order:**
1. Execute relay CC-CMD (probe ESPN stat names → add to relay → deploy)
2. Verify relay done-condition probe prints `RELAY UNBLOCKED`
3. Execute client CC-CMD (adds GRN% and WG% columns to leaderboard)

## Unblock Criteria

```bash
# Probe must return non-empty stat names — replace with real event/athlete IDs
curl -s "https://sports.core.api.espn.com/v2/sports/golf/leagues/pga/events/EVENT_ID/competitions/EVENT_ID/competitors/ATHLETE_ID/statistics/0" \
  | node -e "
    const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    const flat = [];
    if (Array.isArray(d?.splits?.categories))
      for (const cat of d.splits.categories)
        if (Array.isArray(cat?.stats)) flat.push(...cat.stats.map(s => s.name));
    const gir = flat.filter(n => /gir|birdie|bogey|green|conversion/i.test(n));
    console.log('GIR/birdie/bogey stat names:', gir);
  "

# After relay deploys:
curl -s "https://field-relay-nba.jeffunglesbee.workers.dev/v2/golf/enriched" \
  | node -e "
    const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    const p = (d.leaderboard||[])[0];
    console.assert('birdiesOnGir' in (p?.stats||{}), 'birdiesOnGir missing');
    console.assert('bogeysOnGir' in (p?.stats||{}), 'bogeysOnGir missing');
    console.log('RELAY UNBLOCKED — run client CC-CMD');
  "
```
