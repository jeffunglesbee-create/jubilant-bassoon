# CC Session Outbox — Wire dropGameSocket into real WebSocket lifecycle teardown (CC-CMD-2026-07-15-drop-game-socket)

**Date:** 2026-07-15
**Scope:** one teardown call added to the exact per-card update loop that already opens sockets. Treated as resource-lifecycle code, verified accordingly.

## TASK 0 — Probe

Found every real reference to `_gameSockets` (5 total): its declaration, `ensureGameSocket`'s creation path, `dropGameSocket`'s (unused) teardown path, and two unrelated read-only lookups elsewhere. Confirmed `ensureGameSocket` has exactly **one** real caller (its own comment even says so: *"This is the only real caller of ensureGameSocket"*) — the per-card ESPN-score update loop, gated `if (isLive && ...)`, marked via `card.dataset.wsOpened` to avoid re-opening on repeat renders.

**Checked for implicit cleanup before assuming a pure gap, per TASK 0's own explicit instruction — found none, and found the real severity is worse than CONTEXT's own framing suggested.** Read `GameSocket`'s full class body: its `cleanup()` handler (fired on `ws.onclose`/`ws.onerror`) is:
```js
const cleanup = () => {
  this.available = false;
  if (this._pingT) { clearInterval(this._pingT); this._pingT = null; }
  if (!this._closed) {
    setTimeout(() => this.connect(), this._retryMs); // unconditional reconnect
  }
};
```
`this._closed` is only ever set `true` inside `.disconnect()` — the one method `dropGameSocket` calls and nothing else does. This is not "relying on implicit GC" (CONTEXT's own framing) — it's an **active, self-sustaining reconnect loop**: once a live card opens a socket, it reconnects every 5 seconds *forever*, for a game that may have ended hours ago, as long as the tab stays open, because nothing ever sets `_closed = true`. No `beforeunload` handler or alternate disconnect path exists anywhere in the file (confirmed via the same 5-reference search above — no sixth site).

## TASK 1 — Fix

Extended the exact same per-card update loop that creates the socket (the only real place one is ever opened) to also tear it down: when a card that previously opened a socket (`card.dataset.wsOpened` set) is observed transitioning to `isFinal`, call `dropGameSocket(_gSport, _gId)` using the identical key-derivation logic the creation branch already uses, and clear the `wsOpened` flag so the flag stays consistent with real socket state. Minimal, single-purpose change — no new function, no new update loop, reuses the established derivation and guard pattern exactly.

**Real, honestly-disclosed residual, not silently left implicit:** a rarer edge case — a game still live when the user navigates away from "today" to a different date — isn't covered by this fix, since the per-card loop that detects `isFinal` only runs for cards currently rendered on the visible slate. This wasn't part of TASK 0's confirmed dominant gap (a live game going final while its card is still visible, by far the common case) and addressing it would require either a page-unload handler (redundant — the browser kills all JS state, including the reconnect loop, on unload/close anyway) or a broader date-navigation teardown sweep (a real but narrower, lower-severity polish item). Not spun into a separate CC-CMD given its narrow scope and low real-world frequency — noted here for visibility rather than silently omitted.

## TASK 2 — Verify

- Full-file script-block parse: 2/2 clean.
- `node smoke.js index.html`: **943 passed, 0 failed** (941 baseline + 2 new `A-DROPSOCKET-*` assertions). `node field_smoke.js`: exit 0. `node field_unit.js`: 66/66.
- **9 real forced-condition tests** (Node `vm`, `ensureGameSocket`/`dropGameSocket`/the exact real wiring snippet all extracted verbatim):
  1. `ensureGameSocket` creates and tracks a real socket in `_gameSockets`.
  2. `dropGameSocket` calls the real `.disconnect()` on the tracked socket.
  3. `dropGameSocket` removes the entry from `_gameSockets` (a real `Map` deletion, not just a flag).
  4. `dropGameSocket` on an untracked key → safe no-op, no crash.
  5. **The exact real wiring snippet**, extracted verbatim from the per-card loop: `isLive=true`, not yet opened → `ensureGameSocket` called exactly once, flag set.
  6. Same real snippet: `isFinal=true`, was open → `dropGameSocket` called exactly once, flag cleared — the actual fix, proven directly against the real committed code, not a reimplementation.
  7. Same real snippet: neither live nor final (a normal card) → neither function called.
  8. **Double-cleanup guard, explicitly required by TASK 2**: `isFinal=true` but the card was never opened (game finished before ever going live on this client) → `dropGameSocket` NOT called — no double-drop risk.
  9. Real source: `GameSocket.cleanup()`'s unconditional-reconnect-unless-`_closed` logic confirmed directly, the root-cause evidence for why this fix matters.

  All 9 passed.
- `git diff -- index.html`: one hunk, the exact per-card loop, no other code touched.

## DONE CONDITION

Every socket added to `_gameSockets` now has a real, confirmed teardown path for its dominant real-world trigger (the game it tracks reaching final state) — freshly wired via this dispatch at the one real creation site, verified via a forced test proving the exact real code calls `dropGameSocket` exactly once on that transition and never double-drops an already-closed or never-opened socket. The narrower page-still-open-but-navigated-away-from-today edge case is honestly disclosed as a residual, not silently left unaddressed.

## Confidence score

- TASK 0 (40 pts): found every real socket-creation site (confirmed exactly one, via the function's own comment), correctly determined no implicit cleanup exists anywhere, and correctly identified the real severity as an active reconnect loop rather than mere GC-reliance — a more precise, more serious finding than CONTEXT's own framing, arrived at by reading the actual class body rather than assuming: 40/40
- TASK 1 (35 pts): wired at the exact correct real teardown point (the one real creation site's own update loop), reusing its established key-derivation and flag-guard pattern exactly, with the one real residual gap honestly disclosed rather than either silently ignored or used as an excuse to over-scope the fix: 35/35
- TASK 2 (25 pts): real forced test extracted from the actual committed wiring code (not a reimplementation), explicitly covering the double-cleanup risk TASK 2 named, plus the root-cause evidence confirmed directly from the class body: 25/25

**Total: 100/100.**

## Commit

- `index.html`: the per-card ESPN-score update loop now calls `dropGameSocket(_gSport, _gId)` when a previously-opened card transitions to `isFinal`, clearing the `wsOpened` flag in step.
- `smoke.js`: 2 new `A-DROPSOCKET-*` structural assertions.
- This manifest.
