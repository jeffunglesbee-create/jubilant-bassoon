# CC-CMD: Add wentToOT to getWhatYouMissed's notability filter

**Date:** 2026-07-06
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR
**Depends on:** field-relay-nba CC-CMD-2026-07-06-wenttoot-newspaper-bundle-wire.md
— must be DONE and deployed first, or this ships a filter that checks a
field the bundle still hardcodes to `false`. Confirm its outbox exists
and its deploy is live (session_health `relay_deployed` matches or is
ahead of that CC-CMD's commit) before starting.

**Source:** `getWhatYouMissed` (`index.html:~21879`) receives
`bundle.completed_games` from `/analytics/newspaper`. Its filter
currently is:
```javascript
const notable = completedGames.filter(g =>
  g.margin <= 1 || g.wasUpset || g.isSeriesClinch || g.isElimination
);
```
`g.wentToOT` is not in this OR-chain at all — it was never wired,
independent of the relay hardcoding. The comment above it ("wentToOT is
not stored in D1 archive so it never qualifies") is now stale as of the
relay fix this depends on; remove or update it as part of this change.

**Target time:** ~10 min

## PROBE BLOCK
```bash
sed -n '21879,21895p' index.html
```
Confirm the citation matches before editing. Also spot-check that the
relay dependency is actually live: `curl -s
https://field-relay-nba.jeffunglesbee.workers.dev/analytics/newspaper/{yesterday's date}`
and confirm at least one `completed_games` entry shows `wentToOT: true`
or that none are `true` only because none of yesterday's games actually
went to OT (check `went_to_ot` in D1 directly for that date to tell the
difference) — don't proceed on faith that the dependency shipped.

## TASK 1 — Add wentToOT to the filter

```javascript
// Structural notability: close margin, upset, series clinch/elimination,
// or a game that went to overtime/extra time.
const notable = completedGames.filter(g =>
  g.margin <= 1 || g.wasUpset || g.isSeriesClinch || g.isElimination || g.wentToOT
);
```

## TASK 2 — Verification

- `node smoke.js index.html` clean
- If a real game from yesterday has `went_to_ot = 1` in D1, confirm it
  now appears in `getWhatYouMissed`'s output where it wouldn't have
  before (unless it also qualified via margin/upset/clinch already —
  if so, find or wait for a case where OT is the *only* qualifying
  reason, and state clearly which case was actually tested).
- If no real OT game exists yet to test against, say so honestly rather
  than claiming verification that didn't happen.

## DONE CONDITIONS
- [ ] Confirmed the relay dependency is actually deployed before starting
- [ ] Probe block confirms citation before editing
- [ ] `g.wentToOT` added to the filter's OR-chain
- [ ] Stale comment updated or removed
- [ ] Smoke clean
- [ ] Verified against a real OT-only-qualifying case, or honestly reported if none available
- [ ] Outbox written

## CONFIDENCE SCORING TABLE
+30  Filter updated correctly
+20  Stale comment corrected
+15  Smoke clean
+25  Verified against a real case where OT is the sole qualifying reason, or honestly reported as untestable yet
+10  Confirmed relay dependency was actually live before starting, not assumed

## ONE-LINER
git pull. Read docs/CC-CMD-2026-07-06-wenttoot-client-filter-wire.md.
First confirm field-relay-nba's wenttoot-newspaper-bundle-wire CC-CMD is
actually deployed (curl /analytics/newspaper and check a real
went_to_ot=1 game in D1 maps to wentToOT:true in the response) before
touching this file. Then add g.wentToOT to getWhatYouMissed's filter
OR-chain and update the now-stale comment above it. Verify against a
real case if one exists; report honestly if not. Do not commit unless
confidence >= 95. If score < 95, report verbatim and stop.
