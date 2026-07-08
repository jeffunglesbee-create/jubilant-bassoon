# CC-CMD: Close the stale-final gap in pick resolution, and salvage today's wrongly-resolved pick

**Date:** 2026-07-07
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR

## THIS IS A RECURRENCE OF A DOCUMENTED BUG, IN A DIFFERENT CODE PATH

`findESPNScore()` already has a stale-final guard, added June 10, 2026,
with its own detailed comment explaining exactly this failure mode: a
previous day's final score matching today's card by team name alone,
with no time check. That fix was applied to the *display* path.

**`checkForNewFinals()` — the function that actually triggers
`pick_resolved` — never went through that fix, because it doesn't call
`findESPNScore()` at all.** It has its own, separate matching logic
(`index.html:~40693`): pure home-team-name substring matching against
the global `espnScores` cache, zero date awareness, zero guard. Same
bug class, different function, never patched.

**Confirmed live, not theorized:** Rockies @ Dodgers (today, July 7,
first pitch 10:10 PM ET per ESPN's own live gamecast) is marked
resolved and wrong in the pick ledger, while the archive shows `null`
scores for that exact game ID. These two teams played *yesterday*
(July 6, Dodgers won 8-7 in extras) — consistent with exactly the
cross-day matching failure this comment already describes.

## PROBE BLOCK
```bash
sed -n '20170,20220p' index.html
sed -n '40687,40700p' index.html
```
Confirm both citations still match — the existing guard, and the
unguarded resolution-path matcher — before editing either.

## TASK 1 — Root cause: route pick resolution through the guarded path

In `checkForNewFinals()`, replace the direct `espnScores` substring
match with a call to `findESPNScore(game)` — the same, already-guarded
function the display path uses. Do not duplicate the stale-final guard
logic here; reuse the existing function so there is one guarded path,
not two independently-maintained ones (the exact situation that let
this gap exist for a month unnoticed).

Confirm `findESPNScore` accepts the same shape `game` object
`checkForNewFinals` already has in scope — check the function
signature carefully rather than assuming the two callers pass
equivalent objects.

## TASK 2 — Salvage: reset the one wrongly-resolved pick

This is a real, targeted data correction, not a schema change. Using
the relay's existing user-event mechanism (check for an existing
admin/correction path in `UserDO` before inventing a new one — if none
exists, this may need a small, narrowly-scoped one added here), reset
the specific pick (`gameId: MLB_2026-07-07_dodgers_rockies`, whichever
user made it) back to `resolved: false`, `wasCorrect` and
`revealedProbability` cleared — so it can correctly re-resolve once
the real game actually finishes tonight.

**Do this for the one confirmed-affected pick only.** Do not run a
broad sweep resetting other picks without first confirming they're
actually affected — check whether any other today's picks show a
similar cross-day mismatch pattern before touching them, and report
what you find either way.

## VERIFICATION

- `node smoke.js index.html` clean.
- Confirm the salvaged pick, once reset, correctly shows as unresolved
  (not `✓`/`✗`) — report the actual state, not assumed.
- Real test of the fix itself: with `checkForNewFinals()` now routing
  through `findESPNScore()`, confirm a synthetic stale-final scenario
  (today's not-yet-started game, yesterday's final score still in
  `espnScores`) no longer triggers `pick_resolved` — this is the
  scenario that just happened for real; prove it can't happen again.
- Confirm this doesn't regress real, legitimate resolutions — a game
  that has genuinely finished today should still resolve correctly
  through the now-shared path.

## DONE CONDITIONS
- [ ] Probe block confirms both citations before editing
- [ ] `checkForNewFinals()` routes through `findESPNScore()`, no duplicated guard logic
- [ ] The one confirmed-affected pick reset to unresolved, verified
- [ ] Checked whether any other today's picks show the same pattern, reported either way
- [ ] Real test confirms the stale-final scenario no longer triggers resolution
- [ ] Confirmed legitimate same-day resolutions still work correctly
- [ ] Smoke clean
- [ ] Outbox explicitly names this as a recurrence of the June 10 bug in an unpatched second path

## CONFIDENCE SCORING TABLE
+25  checkForNewFinals correctly routed through the existing guarded function, no duplication
+20  The affected pick correctly reset, verified in its new state
+15  Other today's picks checked for the same pattern, reported honestly
+20  Real test proves the stale-final scenario is now blocked
+10  Legitimate resolutions confirmed unaffected
+10  Outbox correctly frames this as the same bug, second path

## ONE-LINER
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO -- this CC-CMD targets jubilant-bassoon"; exit 1; }
git pull. Read docs/CC-CMD-2026-07-07-pickem-stale-final-resolution-fix.md.
This is the June 10 stale-final bug recurring in a second, unpatched
code path -- checkForNewFinals() has its own unguarded team-name match
instead of using findESPNScore()'s existing guard. Route it through the
existing guarded function rather than duplicating the fix. Reset the
one confirmed-affected pick (Dodgers/Rockies, today) to unresolved, and
check whether any other today's picks show the same pattern before
touching them. Prove via a real test that the stale-final scenario can
no longer trigger resolution. Do not commit unless confidence >= 95. If
score < 95, report verbatim and stop.
