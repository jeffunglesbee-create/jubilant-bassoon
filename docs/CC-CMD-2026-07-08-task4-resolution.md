# CC-CMD: Authorization — commit the verified code now, Task 4/4b resolved by reframing, not blocking

**Date:** 2026-07-08
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**This is an authorization + resolution, not new investigation work.**

## COMMIT NOW — Option 2, explicitly authorized

Tasks 1, 2, 2b, 2c, 2d are verified complete, including two real,
independently-caught issues along the way: Task 2b's original spec
(check the stale entry's own `start_time`) was provably wrong — a
stale entry's `start_time` is always in the past by definition, so
that check could never fire; fixed by inverting the loop to iterate
real scheduled games through the already-proven `findEspnEntry()`, and
along the way found `recordPeakMissed()` has never actually fired in
production due to an unrelated field-name bug (`eData?.id` vs the real
`_gameId`). Both real, both correctly caught by testing rather than
assumed away.

Commit this now, as its own correctly-scoped unit, per the split you
proposed. This is time-sensitive — the fix prevents *future* bad
resolutions, and waiting on Task 4/4b (which don't block that) only
delays the part that matters most tonight.

## TASK 4 / 4B — RESOLVED BY REFRAMING, NOT BLOCKED

**Your finding is correct and independently re-verified: pick-render
state lives in `localStorage['field_picks_v1']`, keyed by `gameId`,
scoped to a per-browser `crypto.randomUUID()` in
`localStorage['field_user_id']` — genuinely unreachable from any
server-side session, confirmed by reading `_getPickCache()`/
`makePick()` directly.** The original Task 4/4b were scoped as if this
were server-reachable data. It isn't, and no amount of additional
effort from a Claude Code session changes that — the constraint is
real, not a gap in trying.

**The actual resolution: the deliverable was never "Claude Code fixes
the data." It's "give the one person who *can* reach it a safe,
verified way to do so."** That's a different, achievable task:

Produce a single, safe, copy-pasteable browser console snippet (not
a permanent app feature, not a server action) that:
1. Reads `localStorage['field_picks_v1']`.
2. Finds the entry for `MLB_2026-07-07_dodgers_rockies`.
3. Confirms it shows `resolved: true` before touching anything — do
   not blindly overwrite if the shape doesn't match what's expected.
4. Resets it to `{ ...existing, resolved: false, wasCorrect: null,
   resolvedProbability: null, probabilityLabel: null }`, preserving
   `predictedWinner`/`sport`/`madeAt` unchanged.
5. Writes it back via the same `localStorage.setItem('field_picks_v1',
   ...)` pattern `_savePickCache()` already uses.

Print the exact snippet in your response, ready to paste into a
browser console on the affected device — do not describe it, provide
it verbatim, verified against the real key names in the file you're
looking at right now.

## TASK 4B — HISTORICAL AUDIT, RESOLVED AS "STRONG EVIDENCE OF LIKELY ABSENCE," NOT "PROVEN ABSENCE"

Your fix confirmed `recordPeakMissed()` has a 0/38 match rate against
real entries due to the `_gameId` field bug — meaning the write path
that would have created corrupted historical records has likely never
successfully fired at all. That's real, strong evidence there's
probably nothing to clean up. It is not proof — a full audit still
can't be run without the same browser-local access problem as Task 4.
State this precisely in the outbox: probably nothing to find, not
confirmed nothing exists, and note that if the corrected `recordPeakMissed`
path is monitored going forward (it now writes to the codex incident
tracking already built earlier tonight), any real future occurrence
will be visible immediately rather than needing a retroactive audit.

## DONE CONDITIONS
- [ ] Code portion (Tasks 1, 2, 2b, 2c, 2d) committed and pushed
- [ ] The `initNightOwlObserver` finding and the `_gameId` field bug both documented in the outbox as real, standalone findings
- [ ] A verified, exact, copy-pasteable console snippet provided for the one affected pick
- [ ] Task 4b's outbox note is precise about "likely absent" vs "confirmed absent"
- [ ] Deploy verified live via session_health

## ONE-LINER
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO -- this CC-CMD targets jubilant-bassoon"; exit 1; }
Read docs/CC-CMD-2026-07-08-task4-resolution.md. You are authorized to
commit the verified code (Tasks 1,2,2b,2c,2d) now -- this resolves the
confidence gate, it doesn't override it: Task 4/4b were scoped
incorrectly as server-reachable when they aren't (pick state lives in
the affected browser's own localStorage['field_picks_v1'], confirmed
against getFieldUserId/_getPickCache directly). Replace Task 4 with
producing a verified, exact browser console snippet for Jeff to run
himself against the one affected pick -- print it verbatim in your
response. Resolve Task 4b's outbox note as "strong evidence of likely
absence" (0/38 match rate before your fix means the write path
probably never fired), not "confirmed absent." Commit, push, verify
deploy.
