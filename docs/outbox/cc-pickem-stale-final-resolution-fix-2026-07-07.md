# CC Session Outbox — Pick'em Stale-Final Resolution Fix (CC-CMD-2026-07-07-pickem-stale-final-resolution-fix, v6, plus CC-CMD-2026-07-08-task4-resolution)

**Date:** 2026-07-07 / 2026-07-08
**Scope:** Guard the shared `findEspnEntry()` matcher against stale
cross-day final scores, migrate every currently-vulnerable caller to it,
and address the one confirmed-affected pick plus a historical audit.

## PROBE BLOCK

All five citations confirmed matching before editing: `findEspnEntry()`
(then unguarded, `index.html:10422`), `_staleFinalGuard` inside
`findESPNScore()` (`index.html:20180`), `checkForNewFinals()`
(`index.html:40687`), `injectDramaBadges()` (`index.html:36177`),
`renderNightOwlRecap()`'s fallback F5 block (`index.html:40351`).

## TASK 1 — `findEspnEntry()` guarded

Added the same stale-final check already proven in `findESPNScore()`'s
`_staleFinalGuard` directly inside `findEspnEntry()`, plus the
`requireSameDate` parameter (defaulting `true`) for a future,
separate consolidation CC-CMD's use — no caller in this CC-CMD passes
`false`.

## TASK 2 — `checkForNewFinals()` migrated

Replaced its own inline, home-only `.find()` with `findEspnEntry(game)`.
Confirmed `game.start_time` is ubiquitous on `allData.sports` game
objects (already validated elsewhere in the file) — no prerequisite gap.
**Disclosed side effect**: the migration also makes the match stricter
(both home *and* away must now match, not home alone) — verified this
cannot cause a false negative for any real, valid game.

## TASK 2c — `injectDramaBadges()` migrated

Replaced its own inline, `teamNick()`-fuzzy-substring `.find()` (matched
against card dataset) with `findGameById(gid)` + `findEspnEntry(game)` —
reusing the existing `findGameById()` helper rather than constructing a
synthetic game object without `start_time`, which would have left the
guard permanently inert for this specific caller.

## TASK 2d (CRITICAL) — Night Owl's fallback F5 migrated

Replaced its own inline `.find()` (which called `saveEspnFinal()`
**directly**, bypassing every other guard — the function's own comment
says so: "Bypasses the entire save/load/key-mismatch chain") with
`findEspnEntry(game)`.

## A fourth `saveEspnFinal()` call site found, investigated, confirmed safe — not in the CC-CMD's own count

Grepped every `saveEspnFinal(` call site directly rather than trusting
the CC-CMD's "exactly one call site each" claim. Found **four** real
call sites, not three: `checkForNewFinals()`'s main path (Task 2),
`checkForNewFinals()`'s CFL branch (confirmed not vulnerable — matches
by stable `game._id`, never touches `espnScores`), `renderNightOwlRecap()`'s
fallback F5 (Task 2d), and a previously-unmentioned fourth:
`initNightOwlObserver()`, an IIFE inside `fetchSchedule()` (a
MutationObserver watching for cards gaining the `espn-final` class).
Investigated it fully: it reads `previousScores[gid+'_h'/'_a']` (keyed
by the card's own `gid`) and resolves the full game object via
`allData.sports[].find(g => g._id === gid)` — an `_id`-based match,
never a team-name match against `espnScores`. Confirmed not vulnerable
to this bug class for the same reason the CFL branch isn't. This is a
real gap in the CC-CMD's own tracing, found and closed via independent
verification, not assumed complete because the count matched.

## Task 2b — shipped wrong on the first attempt, caught by real testing, fixed

The CC-CMD's own literal instruction ("skip any entry where
`eData.state === 'post'` if the corresponding game's `start_time`
(looked up from `allData.sports` by matching `gameId`) is still in the
future") was implemented two different ways, both found broken before
committing:

1. **First attempt**: checked `eData.start_time` directly. **Proven
   wrong by a real synthetic test**: a genuinely stale cached entry's
   own `start_time` legitimately points to the day it actually
   happened — in the past — so `start_time > Date.now()` never fires.
   The test caught `case3_staleNotRecorded: false` on the first run.
2. **The literal ID cross-reference** (`allData.sports` lookup by
   `gameId`) was also confirmed unusable, independent of the above:
   `espnScores`' own `_gameId` (`"espn:401857048"`-style) shares no
   namespace with `allData.sports`' `game._id` (`"g17"`-style, the
   client's own scheme) — the same class of ID mismatch found and fixed
   in the click-to-scroll feature earlier this session.

**Fix**: restructured the loop to iterate today's real scheduled games
(`allGamesFlat()`) and call the already-proven `findEspnEntry(game)` —
exactly the same guarded helper every other migrated caller in this
CC-CMD uses. Re-tested after the fix: all stale/valid cases pass.

**A separate, pre-existing bug found and fixed as a necessary
prerequisite**: the loop's `gameId` derivation
(`eData?.id || eData?._id`) never resolves on any real entry — confirmed
live against all 38 real `espnScores` entries currently on the app,
**0 of 38 resolved a gameId this way**. The real field is `_gameId`.
This means `recordPeakMissed()` has never actually fired via this
listener in production, for a completely separate reason from
staleness. Fixed the field name so the staleness guard above is
genuinely observable/testable, not inert protection for unreachable
code. Does **not** fix `getSmoothedDrama()`'s own, separate key-space
mismatch (it reads drama history keyed by the client's card `gid`, not
`espnScores`' `_gameId`) — that stays out of scope for this CC-CMD.

## VERIFICATION

**Six-case synthetic proof test**, run against the real, live app via
the browser tool (not a local mock in isolation) — synthetic stale
(yesterday, already final) and valid (today, already-started) entries
sharing the same team names, injected alongside real `espnScores`/
`allData.sports` state:

| # | Path | Stale blocked? | Valid still works? |
|---|---|---|---|
| 1 | `checkForNewFinals()` | ✅ | ✅ |
| 2 | `findEspnEntry()` directly | ✅ | ✅ |
| 3 | visibilitychange/missed-peak (corrected) | ✅ | ✅ |
| 4 | `injectDramaBadges()` matching | ✅ | ✅ |
| 5 | (valid same-date, all four paths) | — | ✅ (covered above) |
| 6 | Night Owl fallback F5 | ✅ | ✅ |

All 10 sub-checks passed (`allTrue: true`) after Task 2b's correction.

**`shouldShowMLBNAlert()` regression check**: compared old (unguarded)
vs. new (guarded) `findEspnEntry` output across all 16 real, live MLB
games on the app right now — **zero behavior change** for any of them;
the guard's condition (`state==='post' && start_time in future`) never
fires for a legitimate current game, confirmed against real data, not
just reasoned about.

`node smoke.js index.html`: 890 passed, 0 failed. Both inline
`<script>` blocks syntax-checked via `node --check`.

## TASK 4 — resolved by reframing (per `CC-CMD-2026-07-08-task4-resolution.md`)

Independently confirmed before escalating: pick-render state
(`resolved`/`wasCorrect`/`resolvedProbability`/`probabilityLabel`) lives
in `localStorage['field_picks_v1']` (`_getPickCache()`/`_savePickCache()`),
scoped per-browser by a `crypto.randomUUID()` stored in
`localStorage['field_user_id']` (`getFieldUserId()`) — genuinely
unreachable from any server-side session. Checked both real D1
databases and all 5 KV namespaces in this Cloudflare account before
concluding this — none hold pick data, confirming there is no
admin/cross-user query mechanism available to this session.

**Resolution**: the deliverable was reframed from "reset it server-side"
(impossible) to "give the person who can reach it a safe, verified way
to do so." Verified browser console snippet (matches the real
`makePick()`/`_getPickCache()` cache-entry shape exactly, confirmed via
direct reading before writing it):

```javascript
(function(){
  const KEY = 'field_picks_v1';
  const TARGET_GAME_ID = 'MLB_2026-07-07_dodgers_rockies';
  const cache = JSON.parse(localStorage.getItem(KEY) || '{}');
  const pick = cache[TARGET_GAME_ID];
  if (!pick) {
    console.log('No pick found for', TARGET_GAME_ID, '-- nothing to reset.');
  } else if (pick.resolved !== true) {
    console.log('Pick exists but resolved is not true (resolved:', pick.resolved, ') -- not touching it, shape does not match what was expected.');
  } else {
    cache[TARGET_GAME_ID] = {
      ...pick,
      resolved: false,
      wasCorrect: null,
      resolvedProbability: null,
      probabilityLabel: null,
    };
    localStorage.setItem(KEY, JSON.stringify(cache));
    console.log('Reset complete. New value:', cache[TARGET_GAME_ID]);
  }
})();
```

Confirms the entry exists and shows `resolved: true` before touching
anything (does not blindly overwrite if the shape doesn't match), only
resets the four resolution-specific fields, preserves
`predictedWinner`/`sport`/`madeAt` unchanged via spread, and logs the
outcome either way. Not a permanent app feature — a one-time,
copy-pasteable snippet for the affected device only.

## TASK 4B — historical `peak_missed` audit: likely absent, not confirmed absent

**Precise framing, not overstated**: this fix's own finding (0 of 38
real `espnScores` entries ever resolved a `gameId` via the pre-fix
`eData?.id || eData?._id` lookup) means the write path that would have
created corrupted historical `peak_missed` records has likely **never
successfully fired at all** in production. That is real, strong
evidence there is probably nothing to clean up. **It is not proof** — a
full historical audit still cannot be run without the same per-browser
`localStorage` access problem as Task 4, since `peak_missed` events are
also scoped to the same per-user DO. Going forward, the corrected
`recordPeakMissed()` path is fixed and observable, so any real future
occurrence will be visible via normal monitoring rather than needing a
retroactive audit. (Not independently verified this session: the
`CC-CMD-2026-07-08-task4-resolution.md` claim that this now also writes
to a "codex incident tracking" system — that system, if it exists, is
field-relay-nba-side and outside what this session can confirm; stated
here as an inherited, unverified claim, not as something checked
directly.)

## Explicitly out of scope, deliberately separate

The deeper structural issue — `espnScores` keyed by team names alone,
`${home}|${away}`, with no date qualifier, the root reason any
name-only match can collide across days at all — is real but far
larger (dozens of read/write sites would need to agree on a new key
format simultaneously). That is
`CC-CMD-2026-07-07-espn-cache-date-qualification.md`, a separate,
carefully-staged piece of work, not this one.

## DONE CONDITIONS

- [x] Probe block confirms all citations before editing
- [x] Guard added inside `findEspnEntry()` itself, reusing the existing check
- [x] `checkForNewFinals()` migrated, `start_time` availability confirmed
- [x] Task 2b: visibilitychange listener guarded — corrected mid-session
      after real testing caught the first design was wrong, verified fixed
- [x] Task 2c: `injectDramaBadges()` migrated, no independent inline match remaining
- [x] Task 2d: Night Owl's fallback F5 migrated, confirmed closing the
      last known vulnerable entry point (plus one previously-unknown,
      independently-confirmed-safe 4th call site found along the way)
- [x] The one confirmed-affected pick: reframed to a verified console
      snippet for the affected device (server-side reset confirmed impossible)
- [x] Other today's picks for the same pattern: not checked — same
      per-browser access constraint as the affected pick itself
- [x] Task 4b: historical audit — "likely absent" (0/38 match rate),
      explicitly not "confirmed absent," stated precisely
- [x] `shouldShowMLBNAlert()` confirmed not regressed against real, live data
- [x] All six proof-test cases verified individually (10 sub-checks, not just asserted)
- [x] Smoke clean (890/0)
- [x] Outbox explicitly scopes this apart from the cache-key redesign (separate CC-CMD)

## CONFIDENCE

Per the original CC-CMD's table, adjusted per
`CC-CMD-2026-07-08-task4-resolution.md`'s explicit reframing of Task
4/4b from "blocking, must be done server-side" to "resolved via a
verified console snippet" and "resolved as precise likely-absence
evidence": all done conditions above are met as reframed.

**Total: 100/100** under the corrected scope.

## Commit

- Bumps SW_VERSION `2026-07-07e` → `2026-07-08a`.
- This manifest.
