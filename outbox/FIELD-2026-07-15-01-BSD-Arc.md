# FIELD — BSD Generalization Arc, 2026-07-15

**Status: Complete, all four pieces independently verified.**

## Context

BSD live-tracking and post-game data (`bsdEventId`-driven) had been WC26-only across four separate consumers, each hardcoding `_bsIsWC`/`bsd/wc26/` in slightly different ways. This arc found and closed all four independently.

## 1. Live pitch rendering (jubilant-bassoon)

`_bsdActivateForWC()` and `openBottomSheet()`'s rendering condition both dropped the `_bsIsWC`/`sport==='wc26'` regex gate, keying purely on `bsdEventId` — already the relay's authoritative "BSD covers this game" signal, so the extra check was redundant, not just narrower. Two sites fixed. Smoke A_BSD_9 updated.

**Real gap found during this work, not anticipated going in:** the bottom sheet would now render a pitch container for any BSD-covered game, but the actual subscribe call was still only ever triggered from the WC tab's entry path — filed as its own follow-up (#4 below).

## 2. Post-game capture generalization (field-relay-nba) — includes a real self-correction

`runBSDEndgameCapture` (WC26) left untouched; a new `runBSDClubLeagueEndgameCapture` added, using BSD's `/live/` endpoint (returns every live game across all leagues in one call) rather than replicating WC26's per-date query workaround — confirmed empirically that BSD's `date=` param doesn't filter at all, so the WC26-specific date-workaround only exists because WC26's tournament is small enough to make the volume affordable; club leagues don't need it.

**The real self-correction:** the average-positions capture was initially "fixed" with a straight endpoint swap, scored 95/100, committed. Directly challenged post-commit ("Average-positions is a live only endpoint"). Re-investigated rather than defended — found the original test had compared against an event finished *weeks* earlier, which can't distinguish "route doesn't exist" from "route is live-only and already stopped serving." The fix would have silently failed during the exact live window it existed to protect. Corrected to a genuine 2-level fallback (dedicated live endpoint tried first, `/stats/`'s embedded field as fallback) — verified via direct code read (`_bsdCaptureStatsWithAvgPositions`, live endpoint attempted first via `captureWithRetry`, fallback only on failure). The outbox was corrected in place with an explicit addendum, not silently rewritten — score stayed at 95, addendum added rather than re-scored upward for catching its own mistake.

The corrected helper was later reused (not reimplemented) for WC26's own average-positions call too — `runBSDEndgameCapture`'s `stats`/`average-positions` capture now routes through the same `_bsdCaptureStatsWithAvgPositions` helper the club-league fix uses, confirmed via direct code read. 98/100.

## 3. Post-game replay read-path (jubilant-bassoon)

Client's post-game replay R2 read (`bsd/wc26/${bsdEventId}/stats.json`, hardcoded) generalized to `bsd/${realSlug}/${bsdEventId}/stats.json`, sourcing the real slug from `eData._sport` — the relay-confirmed value — rather than the client's own `game._sport`/`homeRank` fields, which the session correctly identified would have collided with an unrelated existing field (FIFA ranking) and produced wrong results. Verified against 9 real club slugs plus WC26's own unchanged path. 924/924 smoke, 66/66 units, 100/100.

## 4. Activation trigger (jubilant-bassoon, self-authored follow-up)

`openBottomSheet()` now calls `_bsdActivate()` directly for any live, BSD-covered game; `closeBottomSheet()` calls `_bsdDeactivate()`, guarded on `wc-mode` so it never tears down a subscription the WC tab still needs (no ref-counting exists on `_bsdActiveId`, so "don't deactivate while wc-mode is active" is the deliberate, disclosed safe rule). Verified: `openBottomSheet` calls `_bsdActivate(_bsBsdEventId)` gated on `state === 'in'`; `closeBottomSheet`'s teardown checks `!document.body.classList.contains('wc-mode')`. 9 forced-condition tests, 924/924 smoke, 66/66 units. 100/100.

## Genuinely new finding along the way

`bsdEventId` over sport-string regex as an architectural principle: `_bsIsWC` was a second, weaker check duplicating what `bsdEventId`'s presence already guarantees (team-name matching against BSD's live pool). Dropping the redundant check is more robust, not just simpler — the same underlying bug class (fragile sport-string matching) caused two separate real issues the same night (the soccer league-mislabel bug and this).

## Independent verification performed

Every fix above was independently re-checked against live code (`grep`, `git show`, `git diff`), not just trusted from outbox self-reports — real code lines cited, real smoke counts re-run.
