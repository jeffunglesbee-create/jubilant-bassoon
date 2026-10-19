# Claude Code Command — sw.js handles a push the relay no longer sends

**Date:** 2026-10-19
**Repo:** jubilant-bassoon
**Branch:** main. Commit directly; do not create a feature branch or a PR.
**Confidence gate:** >= 95 before any commit
**Status:** FILED, not dispatched
**Filed by:** CC, from field-relay-nba
`docs/CC-CMD-2026-10-14-push-cron-gambit-path.md` (option 1, ruled
2026-10-18, landed 2026-10-19). This is Rule 87.4's second CC-CMD for the
client half, which that relay CC-CMD may not touch (Rule 69).

---

## What changed in the relay, and what it leaves here

The relay's push cron (`handleCron`) had a live-game loop:
- It polled the `/espn-gambit` proxy for each sport's site-API scoreboard.
- It kept late, close games.
- It pushed them to every subscriber as `{ type: 'SCORE_CHANGE', ... }`.

`/espn-gambit` allows only `/apis/v1/challenges/`, so every poll got a 403,
and the loop pushed nothing for a period nobody measured. On 2026-10-19 it
was deleted as a stated absence, and
`scripts/check-push-cron-live-absence.mjs` now fails the relay's deploy if
any relay source builds a `SCORE_CHANGE` payload.

So in this repo, read at `bb6aa446`:

1. **`sw.js:230-277`, the `SCORE_CHANGE` branch of the push handler, has no
   producer.** It calls `isCrunchLikePush()` (`sw.js:161-169`). It POSTs
   `/signal/crunch/<sport>/<gameId>` to the relay. Then it shows a "CRUNCH
   TIME" notification.
2. **The `DRAMA_THRESHOLD` branch (`sw.js:280` on) has had no producer for
   longer.** Its own comment says "pre-refactor server still sends these".
   `grep -c DRAMA_THRESHOLD` over the relay's `src/` is 0. It is the other
   reader of `isCrunchLikePush` (`sw.js:285`), so that function becomes
   deletable only if both branches go.
3. **These comments describe the relay as pushing SCORE_CHANGE, and are now
   false:** `sw.js:154-159`, `sw.js:175` and `src/legacy/field.js:5817-5819`.
   `field.js:3110` and `:23376` name `isCrunchLikePush` as the push trigger.
4. **`docs/ADR-002-CONTEXT.md:141-147` (Rule B) describes a path that no
   longer exists.** It says the relay's `latePhase && closeGame` gates
   "remain free to trigger the existing `SCORE_CHANGE` push path directly,
   exactly as before". Those gates and that push were deleted on 2026-10-19.
   The relay ruling's second reason cited Rule A *against* such a push, and
   this Rule B text says it is permitted. **That disagreement is an ADR-002
   question for the owner (Rule 45), not for this CC-CMD to settle.** The
   factual correction is in scope: no such path exists now. Whether one would
   be permitted is out of scope.
5. **`/signal/crunch` itself stays live.** Two page-side emitters remain:
   `src/legacy/field.js:15727` and `:37080`. The relay route
   (`src/index.js` ~10298) and the GameDO fan-out (`src/game-do.js:195`)
   still serve them. Do NOT remove those.

## TASK 0 — probe before writing (Rule 87.1, Rule 100)

1. Confirm no relay source still sends `SCORE_CHANGE`:
   `grep -rn "SCORE_CHANGE" ../field-relay-nba/src/`. Expect only the
   stated-absence comment in `handleCron`.
2. Confirm the relay's other pushes and the types they use. The Tubi
   pre-game alert is in `handleTubiPreGameAlerts`. GameDO pushes
   `CRUNCH_TIME_SIGNAL`. Read each payload's `type` from source, not from
   this document.
3. List what else reads `isCrunchLikePush` or the `field-drama-<gameId>`
   notification tag before deleting either. Read at `bb6aa446`, the readers
   were:
   - `isCrunchLikePush`: `sw.js:233` and `:285`;
   - the tag: `sw.js:272` and `:291`.
4. Confirm the relay sends no `DRAMA_THRESHOLD`:
   `grep -rn "DRAMA_THRESHOLD" ../field-relay-nba/src/` returns nothing.

## TASK 1 — the choice (owner's, or delegated)

1. **Recommended: delete both producerless branches, as a stated absence.**
   This mirrors the relay ruling:
   - remove the `SCORE_CHANGE` and `DRAMA_THRESHOLD` branches;
   - remove `isCrunchLikePush`, which then has no reader;
   - in their place, leave one comment saying the relay sends neither type
     (SCORE_CHANGE stopped on 2026-10-19, when its only producer was deleted
     for sending nothing), citing the relay CC-CMD. Do not give an ADR-002
     reason; item 4 leaves that question open for the owner;
   - correct the comments listed in item 3 above;
   - correct the Rule B sentence in `docs/ADR-002-CONTEXT.md` as fact only:
     the `SCORE_CHANGE` push path it names was deleted on 2026-10-19. Leave
     the permission question to the owner.
2. **Keep the branch** and record why it stays with no producer. That is the
   relay ruling's rejected option 3 in another repo: an unreachable branch
   that reads as a working path.

## Done condition (Rule 90 artifacts)

1. `grep -nE "SCORE_CHANGE|DRAMA_THRESHOLD" sw.js` shows only the
   stated-absence comment.
2. `node smoke.js index.html` reports 0 failed. SW_VERSION is bumped in both
   `index.html` and `sw.js`, and they match.
3. `grep -c "remain free to trigger the existing" docs/ADR-002-CONTEXT.md`
   is 0, and the corrected sentence names the 2026-10-19 deletion.
4. `/signal/crunch` still has its two page-side emitters:
   `grep -c "signal/crunch" src/legacy/field.js` is unchanged at 2.
5. The deploy-gate run is green, with its run id recorded.

## FORBIDDEN

- Do not touch `/signal/crunch`, the relay route, or the GameDO fan-out.
- Do not restore a relay-side live-game push. That reopens the 2026-10-18
  ruling and the open ADR-002 question in item 4.
