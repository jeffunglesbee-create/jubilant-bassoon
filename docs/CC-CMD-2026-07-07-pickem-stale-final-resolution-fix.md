# CC-CMD: Close the stale-final gap in pick resolution — guard the shared matcher, not each caller

**Date:** 2026-07-07 (v3 — adds a fourth target, `injectDramaBadges`'s
localStorage peak write, found via independently-verified review of
external suggestions; v2 corrected scope after finding the real extent
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

**A fourth target, confirmed via independent review before adding it —
not accepted on description alone:** `injectDramaBadges()`
(`index.html:~36182`) writes `localStorage.setItem(peakKey,
score.toString())`, gated by `if (score > prevPeak)` — a monotonic peak
tracker that only ever increases. Verified directly: if this ever
matches a stale, high-drama entry from a previous day, it permanently
inflates today's game's peak-drama badge, and no future correct value
can ever bring it back down without first exceeding the false peak.
This is durable false state, not self-correcting display — in scope
alongside the other three.

## PROBE BLOCK
```bash
sed -n '10420,10428p' index.html   # findEspnEntry — the helper to guard
sed -n '20170,20183p' index.html   # the existing _staleFinalGuard to reuse, not duplicate
sed -n '40687,40700p' index.html   # checkForNewFinals — the caller to migrate
sed -n '36175,36195p' index.html   # injectDramaBadges — its own inline match, to migrate
```
Confirm all four still match before editing.

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

## TASK 2c — Guard the drama-peak localStorage write

`injectDramaBadges()` (`index.html:~36182`) does its own independent,
unguarded `.find()` against `espnScores` before writing
`localStorage.setItem(peakKey, score.toString())`, gated by `if (score
> prevPeak)`. Since the peak value only ever increases, a single stale
match permanently corrupts it — no later correct value can undo it.
Migrate this function's matching to use `findEspnEntry()` (Task 1's
now-guarded helper) instead of its own inline `.find()`, same pattern
as Task 2.

## TASK 4 — Salvage the one confirmed-affected pick

Reset the specific pick (`gameId: MLB_2026-07-07_dodgers_rockies`) back
to `resolved: false`, clearing `wasCorrect`/`revealedProbability`, using
whatever existing mechanism the DO provides (check for one before
inventing a new admin path). Confirm no other today's pick shows the
same pattern before touching only this one — report what you find.

## VERIFICATION

- `node smoke.js index.html` clean.
- **The proof test, specified precisely:** create two synthetic games
  with the same home/away teams on different dates — yesterday's,
  already final and still sitting in `espnScores`, and today's, not
  yet started. Verify independently: (1) `checkForNewFinals()` does
  not resolve today's pick from yesterday's final; (2) `findEspnEntry()`
  itself refuses the stale candidate; (3) the visibilitychange/missed-
  peak path does not record yesterday's event as today's missed peak;
  (4) `injectDramaBadges()` does not write yesterday's peak as today's.
  Then confirm a fifth case: a genuinely valid same-date final still
  resolves and displays normally through all four paths — this must
  not regress real behavior.
- Confirm the salvaged pick shows unresolved after the reset.

## DONE CONDITIONS
- [ ] Probe block confirms all citations before editing
- [ ] Guard added inside `findEspnEntry()` itself, reusing the existing check, not a new variant
- [ ] `checkForNewFinals()` migrated to call it, `start_time` availability confirmed
- [ ] Task 2b: visibilitychange listener guarded independently, orphaned entries skipped not assumed safe
- [ ] Task 2c: `injectDramaBadges()` migrated to `findEspnEntry()`, no independent inline match remaining
- [ ] The one confirmed-affected pick reset and verified
- [ ] Other today's picks checked for the same pattern, reported
- [ ] All five proof-test cases verified individually, not just asserted
- [ ] Smoke clean
- [ ] Outbox explicitly notes the cache-key redesign is separate, deliberately deferred work

## CONFIDENCE SCORING TABLE
+15  Guard correctly added to `findEspnEntry()`, reusing the existing check
+15  `checkForNewFinals()` correctly migrated, `start_time` confirmed present
+15  Task 2b: visibilitychange listener independently guarded, verified
+15  Task 2c: `injectDramaBadges()` migrated, no independent inline match remaining
+10  Affected pick reset and verified
+15  All five proof-test cases verified individually
+10  Outbox correctly scopes this apart from the cache-key work

## ONE-LINER
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO -- this CC-CMD targets jubilant-bassoon"; exit 1; }
git pull. Read docs/CC-CMD-2026-07-07-pickem-stale-final-resolution-fix.md
(v3). Add the existing stale-final guard directly inside findEspnEntry()
(the already-existing, partially-adopted consolidation helper) rather
than patching checkForNewFinals in isolation, then migrate
checkForNewFinals AND injectDramaBadges (Task 2c -- its localStorage
peak write is durable false state, not display-only) to call it. Also
guard the anonymous visibilitychange peak-missed listener independently
(Task 2b) -- it iterates espnScores directly, not through
findEspnEntry. Reset the one confirmed-affected pick. Prove via the
five-case synthetic test (all four guarded paths blocked on stale data,
real same-date finals still work) that the fix is real, not asserted.
This is deliberately scoped apart from the deeper cache-key redesign,
which is a separate CC-CMD. Do not commit unless confidence >= 95. If
score < 95, report verbatim and stop.
