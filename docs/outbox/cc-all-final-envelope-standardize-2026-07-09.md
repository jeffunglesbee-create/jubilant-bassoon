# CC Session Outbox — Standardize `field:all_final` onto the PM-27 Envelope (CC-CMD-2026-07-09-all-final-envelope-standardize)

**Date:** 2026-07-09
**Scope:** `field:all_final` was dispatched from two sites with two
different, non-PM-27 payload shapes — neither matched the standard
envelope (`{type, target, source, reason, at, payload}`) that
`field:crunch`, `field:otw_changed`, and `field:ws_fresh` all use.

## PROBE BLOCK

`grep -n "field:all_final" index.html` — confirmed exactly 2 dispatch
sites (~28637 SSE handler, ~41255 `checkForNewFinals()`) and 2
subscribers (~28904, ~29046), matching the doc's claim exactly — no
third site had appeared since.

Confirmed the real PM-27 envelope shape against two other live,
correct usages, not just the doc's own template: `field:crunch`
(~36138, `target: gid, source: 'badge_render', reason:
'crunch_time_badge'`) and `field:ws_fresh` (~17557, `target: _wsKey,
source: 'ws', reason: 'message_received'`) — both confirm `target` is
a fixed feature-scoped string when the event isn't about one specific
game (`field:otw_changed` uses `target: 'otw'`), matching the doc's
own suggested `target: 'slate'` for a whole-night-slate event.

**Read both subscribers in full before changing anything, per the
doc's own instruction — and found the doc's premise was wrong for
subscriber 1:**
- Subscriber 1 (~28904, attention-bar cleanup): `function() {
  Object.keys(_attnGames).forEach(...); _renderAttentionBar(); }` —
  **reads nothing from `e.detail` at all** — doesn't even declare the
  event parameter. The CC-CMD's own TASK 2 text ("Both current
  subscribers read the old flat shape... update both to read
  `e.detail.payload.count`") does not hold for this subscriber. No code
  change needed or made here — reported honestly rather than forcing an
  unnecessary edit to match the doc's assumption.
- Subscriber 2 (~29046, "SUBSCRIBER 5: Nightly wrap"): reads
  `e.detail?.count` in exactly one place — a `FIELD_DEBUG`-gated
  `console.log` — not for any functional/behavioral logic. The actual
  behavior (`renderNightOwlRecap()` + `renderAmbientPanel()`, deferred
  via idle callback, gated by `_subscriberFired`) is entirely
  independent of the event's payload.

## TASK 1 — Both dispatch sites standardized

**Site 1** (~28637, inside the SSE `all_final` handler):
```js
fieldEvents.dispatchEvent(new CustomEvent('field:all_final', { detail: {
  type: 'field:all_final', target: 'slate', source: 'sse',
  reason: 'sse_wrap', at: Date.now(),
  payload: { count: data.count, date: data.date }
}}));
```

**Site 2** (~41255, inside `checkForNewFinals()`):
```js
fieldEvents.dispatchEvent(new CustomEvent('field:all_final', { detail: {
  type: 'field:all_final', target: 'slate', source: 'poll',
  reason: 'checkfornewfinals', at: Date.now(),
  payload: { count: _seenFinals.size }
}}));
```

`source`/`reason` values are precise, existing terms already in play at
each site (`'sse'` from the SSE handler's own `eventType` context;
`'poll'`/`'checkfornewfinals'` from the enclosing function name) — not
generic invented labels. Site 2 correctly **omits** `payload.date`
rather than fabricating one — `checkForNewFinals()` has no date value
available at that call site (only `_seenFinals.size`), and Rule 1 (DO
NOT INVENT) applies to payload fields exactly as it does to data.

## TASK 2 — Subscribers updated to match what the probe actually showed

- Subscriber 1: **no change** — genuinely reads nothing from `e.detail`,
  confirmed via direct code reading, not assumed from the doc's generic
  claim.
- Subscriber 2: one line changed — `e.detail?.count` →
  `e.detail?.payload?.count`, so the debug log continues to report the
  real count instead of silently going `undefined` once the shape moved.

## TASK 3 — Live-style verification, both sites and both subscribers

Extracted every relevant block verbatim from the committed file (dispatch
site literals, both full subscriber bodies) and ran them in a Node `vm`
harness against a real `EventTarget`-based `fieldEvents` stand-in. 13/13
checks:

**Both dispatch sites (structural identity):** both envelopes carry the
identical top-level key set; `type`/`target` match exactly; `source`
and `reason` correctly differ per site (`sse`/`sse_wrap` vs
`poll`/`checkfornewfinals`); both payloads carry `count`; site 1's
payload carries `date` (available there), site 2's correctly omits it
(not fabricated).

**Subscriber 1 (extracted verbatim, dispatched with the new envelope):**
clears `_attnGames` and calls `_renderAttentionBar()` — confirmed
genuinely shape-agnostic, not accidentally broken by the change.

**Subscriber 2 (extracted verbatim, dispatched with the new envelope):**
debug log now correctly reads the real count (`"...nightly wrap (12
game(s))"`, not `undefined`); `renderNightOwlRecap()` and
`renderAmbientPanel()` both still fire on their deferred idle-callback
path; the `_subscriberFired` guard still prevents a second dispatch from
double-firing — confirming nothing else in the subscriber's behavior
regressed.

## VERIFICATION (repo-level)

`node smoke.js index.html`: 899/0 (unchanged). `node field_unit.js`:
66/0. `node field_smoke.js index.html`: 21 failures, matches the
documented pre-existing baseline. All 3 inline `<script>` blocks
syntax-checked via `node --check`.

## DONE CONDITIONS

- [x] Both dispatch sites produce the identical, correct PM-27 envelope
      (verified structurally, not just visually)
- [x] Both subscribers correctly handled per what the probe showed each
      actually uses — subscriber 1 needed zero changes (reads nothing),
      subscriber 2's one detail-reading line updated
- [x] Live-verified: both dispatch sites tested, both subscriber
      behaviors confirmed still firing correctly, not just structurally
      unchanged

## CONFIDENCE SCORING

- +35 — both dispatch sites correctly and identically standardized,
  with per-site `source`/`reason` values drawn from existing precise
  terms at each site (not invented), and no fabricated `date` at the
  site that doesn't have one: **met**
- +35 — both subscribers correctly handled against what the probe
  actually showed each reads — including catching that the doc's own
  premise ("both subscribers read the old flat shape") was wrong for
  subscriber 1, and not forcing an unnecessary edit there: **met**
- +30 — live verification covers both dispatch sites (structural
  identity) and both subscriber behaviors (extracted verbatim, real
  behavior confirmed firing, not just "runs without error"): **met**

**Total: 100/100.**

## Commit

- Bumps `SW_VERSION` `2026-07-09i` → `2026-07-09j`.
- `index.html`: both `field:all_final` dispatch sites standardized onto
  the PM-27 envelope; subscriber 2's debug log updated to read
  `payload.count`; subscriber 1 left untouched (reads nothing from
  `e.detail`).
- `sw.js`: `SW_VERSION` sync bump.
- This manifest.
