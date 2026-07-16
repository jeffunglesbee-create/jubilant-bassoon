# Claude Code Command — Live game cards freeze at final score with a duplicate status line

**Date:** 2026-07-16
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }; git pull; git log --oneline -5.

Write findings to docs/outbox/cc-frozen-card-duplicate-status-2026-07-16.md. Commit the outbox manifest with `[skip ci]` in the message.

## CONTEXT

Two real, live screenshots (2026-07-16, ~11:15-11:19 PM ET, one iOS one Android — cross-platform, ruling out a device-specific timer-suspension theory) show three WNBA cards displaying `Q4 0.0`, `underway`, and a red live-style presentation for games that are genuinely, confirmedly final.

**Confirmed via direct live queries at investigation time, in this order — do not re-litigate, TASK 0 starts from here:**
1. Real ESPN scoreboard: all three games `state: STATUS_FINAL`, real final scores matching what the screenshots show exactly.
2. Real relay (`/v2/games?sport=wnba&date=2026-07-15`): already correctly serving `state: 'post'`, `periodLabel: 'F'` for the same three games, matching ESPN.

**So the staleness is confirmed client-side, not ESPN, not the relay.** The Android screenshot adds a real, specific second clue the iOS one didn't show: the Sparks/Lynx card displays `"Lynx 96-87 Sparks · underway"` **twice** — once normal, once as a faint, slightly-offset duplicate directly beneath it. This looks like a partial or failed DOM update — a leftover render fragment, not just data that never refreshed. Both symptoms (frozen score/clock, duplicate status line) are hypothesized to be two views of the same failed-update event, not two separate bugs — TASK 0 must confirm or refute this, not assume it.

**Relevant, real infrastructure to investigate against, established earlier this session (cite, don't re-derive):** the card-level reconciliation loop in `applyMainHTML` (keys on `data-gameid`, replaces a new card with the existing DOM node only if `outerHTML` byte-matches, otherwise commits the new one), the `_cardStringCache` fingerprint cache (`JSON.stringify(g)`-keyed, invalidated on any real data change), and the zero-change fast path (skips the whole commit if nothing changed, with a known historical gotcha around the LCP-anchor morph leaving `main` empty if not carefully ordered).

## TASK 0 — Probe, both layers, don't assume which one is broken

**Polling/fetch layer:** confirm whether the client genuinely re-fetches `/v2/games?sport=wnba` on a live-game polling interval, and whether that interval is still firing for a game that's been sitting at `Q4 0.0` for several minutes of real elapsed time. If the client's own copy of the game object `g` never updates after the real transition to final, this is a fetch/polling bug, not a render bug, and TASK 1 should focus there instead.

**Render/reconciliation layer:** if the client's `g` object *does* update correctly (confirm via a forced test: feed a real pre-transition and real post-transition game object through the actual render path, check what DOM results), investigate whether the reconciliation loop or the card's own internal template correctly replaces every stale sub-element — specifically the status-line text (`underway`) — when a card updates, or whether some part of the card's DOM can end up with two sibling nodes for the same content under specific conditions (a duplicate append without a corresponding old-node removal, a template that appends rather than replaces under some state transition).

**Service worker / PWA caching:** rule in or out whether a service-worker-cached response for `/v2/games` could be serving a stale snapshot independent of both the fetch-interval and render logic — this would explain the bug appearing identically cross-platform (iOS and Android share the same PWA/service-worker code, unlike a platform-specific timer issue).

## TASK 1 — Fix

Scoped entirely by TASK 0's real findings — do not guess a fix before the actual failing layer (fetch, render, or cache) is identified with real evidence.

## TASK 2 — Verify

Real forced-condition test reproducing the actual bug found: a game transitioning from live to final, run through the real client code path, confirming (a) the card's displayed state, score, and clock all update to the final values, and (b) no duplicate DOM nodes result. If a service-worker caching issue is found, a real cache-bypass/invalidation test. `node smoke.js index.html`: baseline plus new assertion(s) covering this transition.

## DONE CONDITION

A game that transitions from live to final while the app is open (or backgrounded and returns) is confirmed to update its card fully and cleanly — correct final score/state, no stale `Q4 0.0`/`underway` text, no duplicate DOM nodes — verified via a real forced test reproducing the actual failure mode found, not just a code-review assertion that it "should" work.

**Confidence scoring:**
- TASK 0 (40 pts): investigates fetch, render, and caching layers with real evidence rather than assuming one; correctly determines whether the frozen state and the duplicate line share one root cause or are separate
- TASK 1 (35 pts): fix matches the real root cause found, not a guess
- TASK 2 (25 pts): real forced test reproducing the actual bug, smoke confirmed

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop. Automate follow-ups. No fallbacks, only fixes.
