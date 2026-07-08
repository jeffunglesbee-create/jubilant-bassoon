# CC-CMD: Close the stale-final gap in pick resolution — guard the shared matcher, not each caller

**Date:** 2026-07-07 (v2 — corrects scope after finding the real extent
of the vulnerability)
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR

## WHY THIS IS v2

v1 patched only `checkForNewFinals()` directly. Investigating further
(prompted by a direct challenge before committing to it) found the
real shape of the problem: `findEspnEntry()` already exists as a
partial consolidation point ("Replaces 10 inline
`Object.values(espnScores).find(...)` patterns" per its own comment)
but carries no stale-final guard either, and `checkForNewFinals()`
never migrated to use it — it has its own independent, unguarded copy
of the same matching logic. **The right fix guards the shared helper
once, then migrates the resolution-triggering caller to use it** —
not adding a duplicate guard check at every scattered call site.

**Explicitly out of scope here, deliberately separate:** the deeper
structural issue (the `espnScores` cache is keyed by team names alone,
`${home}|${away}`, with no date — the root reason any name-only match
can collide across days at all) is real but far larger — dozens of
read and write sites would need to agree on a new key format
simultaneously. That's `CC-CMD-2026-07-07-espn-cache-date-qualification.md`,
a separate, carefully-staged piece of work, not this one.

**Confirmed via tracing, not assumed:** `saveEspnFinal()` and
`renderNightOwlRecap()` don't do their own independent matching — they
receive an already-matched game as a parameter from whichever caller
invokes them. Fixing the caller that feeds the real resolution path
protects both transitively. The CFL-specific caller (`index.html:~22451`)
matches by stable `_id`, not name-substring against the shared cache —
confirmed not vulnerable to this same bug, out of scope.

**A third target, found during systematic investigation of all 74
references, not part of v1:** an anonymous `visibilitychange` listener
(`index.html:~27974`) scans every currently-cached `espnScores` entry
and calls `recordPeakMissed()` — a real, permanent `_userDoRelay`
write — for any entry above a drama threshold, using whatever `id`
happens to be sitting on that entry. This doesn't do name-matching, but
carries a related risk from the same root cause: a stale, un-evicted
entry from an earlier day, still present when the tab is hidden, could
permanently record a missed-peak event for the wrong game. In scope
here alongside `checkForNewFinals`, since it also writes a permanent
record and the same investigation surfaced it.

## PROBE BLOCK
```bash
sed -n '10420,10428p' index.html   # findEspnEntry — the helper to guard
sed -n '20170,20183p' index.html   # the existing _staleFinalGuard to reuse, not duplicate
sed -n '40687,40700p' index.html   # checkForNewFinals — the caller to migrate
```
Confirm all three still match before editing.

## TASK 1 — Guard `findEspnEntry()` itself

Add the same stale-final check already proven in `findESPNScore()`
(`_staleFinalGuard`) directly inside `findEspnEntry()`, so every future
caller — not just the one migrated here — inherits the protection
automatically:
```javascript
function findEspnEntry(game) {
  if (!game) return null;
  const h = (game.home || '').toLowerCase().replace(/[^a-z]/g, '').slice(-6);
  const a = (game.away || '').toLowerCase().replace(/[^a-z]/g, '').slice(-6);
  const entry = Object.values(espnScores).find(v => {
    const vh = (v.homeName || '').toLowerCase().replace(/[^a-z]/g, '');
    const va = (v.awayName || '').toLowerCase().replace(/[^a-z]/g, '');
    return vh.endsWith(h) && va.endsWith(a);
  }) || null;
  if (entry && entry.state === 'post' && game.start_time &&
      new Date(game.start_time).getTime() > Date.now()) {
    return null; // stale-final guard — see findESPNScore's original June 10 comment
  }
  return entry;
}
```
Reuse the exact guard condition already established, do not write a
new variant of the check.

## TASK 2 — Migrate `checkForNewFinals()` to use it

Replace `checkForNewFinals()`'s own inline `Object.values(espnScores)
.find(...)` with a call to `findEspnEntry(game)`. Confirm the `game`
object it has in scope carries `start_time` (required for the guard to
actually apply) — if it doesn't, that's a real, separate prerequisite
gap to fix here, not something to silently work around.

## TASK 2b — Guard the visibilitychange peak-missed listener

The anonymous listener at `index.html:~27974` iterates every
`espnScores` entry directly rather than matching by name — it doesn't
call `findEspnEntry`, so Task 1's guard doesn't automatically protect
it. Add an equivalent staleness check inside the loop itself: skip any
entry where `eData.state === 'post'` if the corresponding game's
`start_time` (looked up from `allData.sports` by matching `gameId`) is
still in the future. If no matching game can be found in
`allData.sports` for a given cached entry, skip it rather than assume
it's safe — an orphaned cache entry with no current schedule match is
exactly the kind of stale data this guard exists to catch.

## TASK 3 — Salvage the one confirmed-affected pick

Reset the specific pick (`gameId: MLB_2026-07-07_dodgers_rockies`) back
to `resolved: false`, clearing `wasCorrect`/`revealedProbability`, using
whatever existing mechanism the DO provides (check for one before
inventing a new admin path). Confirm no other today's pick shows the
same pattern before touching only this one — report what you find.

## VERIFICATION

- `node smoke.js index.html` clean.
- Real test: with `findEspnEntry()` guarded, confirm a synthetic
  stale-final scenario (today's not-yet-started game, yesterday's final
  still sitting in `espnScores`) returns `null` instead of the stale
  entry — this is the exact scenario that just happened for real.
- Confirm a genuinely same-day final still resolves correctly through
  the now-shared path — this must not regress real resolutions.
- Confirm the salvaged pick shows unresolved after the reset.

## DONE CONDITIONS
- [ ] Probe block confirms all three citations before editing
- [ ] Guard added inside `findEspnEntry()` itself, reusing the existing check, not a new variant
- [ ] `checkForNewFinals()` migrated to call it, `start_time` availability confirmed
- [ ] Task 2b: visibilitychange listener guarded independently, orphaned entries skipped not assumed safe
- [ ] The one confirmed-affected pick reset and verified
- [ ] Other today's picks checked for the same pattern, reported
- [ ] Real synthetic test proves the stale scenario is now blocked
- [ ] Real same-day resolution confirmed still working
- [ ] Smoke clean
- [ ] Outbox explicitly notes the cache-key redesign is separate, deliberately deferred work

## CONFIDENCE SCORING TABLE
+20  Guard correctly added to `findEspnEntry()`, reusing the existing check
+15  `checkForNewFinals()` correctly migrated, `start_time` confirmed present
+15  Task 2b: visibilitychange listener independently guarded, verified
+15  Affected pick reset and verified
+15  Real synthetic test proves the fix
+10  Real same-day resolution confirmed unaffected
+10  Outbox correctly scopes this apart from the cache-key work

## ONE-LINER
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO -- this CC-CMD targets jubilant-bassoon"; exit 1; }
git pull. Read docs/CC-CMD-2026-07-07-pickem-stale-final-resolution-fix.md
(v2). Add the existing stale-final guard directly inside findEspnEntry()
(the already-existing, partially-adopted consolidation helper) rather
than patching checkForNewFinals in isolation, then migrate
checkForNewFinals to call it. Also guard the anonymous visibilitychange
peak-missed listener independently (Task 2b) -- it iterates espnScores
directly, not through findEspnEntry. Reset the one confirmed-affected
pick. Prove via a real synthetic test that the stale scenario is now
blocked for both paths, and that real same-day resolutions still work.
This is deliberately scoped apart from the deeper cache-key redesign,
which is a separate CC-CMD. Do not commit unless confidence >= 95. If
score < 95, report verbatim and stop.
