# CC Session Outbox — generateJournalismViaRelay (queue Bucket A #4, self-directed)

**Date:** 2026-07-13
**Scope:** jubilant-bassoon (sole). Continuing autonomously through
`docs/TYPED-RESULT-MIGRATION-QUEUE.md`'s ranked Bucket A list.

## Novel thinking: the queue's stated premise was investigated and found wrong

The queue entry claimed: "Proof-mode intentionally skips the relay path,
but the function returns a bare `null`... every caller's fallback then
hits the legacy direct-proxy API even when the skip was deliberate, an
unwanted live call." Per Rule 72 (inherited claims must be re-verified),
traced this through a real caller
(`renderSeriesPreviewCard`'s fallback, index.html ~L28745-28747:
`fetch(CLAUDE_PROXY_URL, {...})`) rather than trusting the prior
diagnosis.

**Found:** `_proofMode` globally monkey-patches `window.fetch`
(index.html ~L4866-4870) to return `{status:200, body:'{}'}` for *every*
request while proof mode is active — including the legacy proxy's own
fallback `fetch()` call. So even when a caller falls through to the
"unwanted" legacy path, that fetch is *also* intercepted: `data.content`
comes back `undefined`, `text` stays empty, and the caller returns `null`
regardless. **No real live API call happens whether or not the
proof-mode skip is distinguished from a genuine failure.** The premise
this migration was ranked on does not hold. Not fixing it — there is
nothing to fix here. Documented this directly in the function's own
header comment and corrected the queue file's entry, so a future session
doesn't re-attempt the same non-fix.

## What WAS real, found by reading the function in full

`generateJournalismViaRelay` has 3 real internal failure causes: HTTP
error (`!r.ok`), missing `data.text`, and model refusal
(`_isModelRefusal(data.text)`). The first two already call
`captureFieldError()`. **Model refusal did not** — despite its own
adjacent comment explicitly calling it a "CRITICAL user-facing fix"
(iPad-7: Haiku occasionally emits meta-commentary instead of a real
brief). This is a genuine, present asymmetry: the failure mode flagged as
most important had the weakest telemetry of the three.

## Fix

Added the same `captureFieldError('journalism:generate:'+briefType, ...)`
call the other two causes already use, to the model-refusal branch. No
return-contract change (still `null` in that branch, as before) — every
one of the 5 real callers is unaffected; this is purely additive
telemetry, same category of fix as `findESPNScore` earlier in this
session.

## Real verification (Node `vm`, function extracted verbatim)

| Test | Scenario | Return | `_fieldErrors` |
|---|---|---|---|
| A | Model refusal (Haiku meta-commentary) | `null` | **1** (was 0 — the fix) |
| B | HTTP failure (`!r.ok`) | `null` | 1 (unchanged — already worked) |
| C | Genuine success | real brief text | 0 (unchanged) |

All 3 assertions passed.

- `node -e "... new Function(s) ..."` per `<script>` block: clean.
- `node smoke.js index.html`: 919 passed, 0 failed.
- `node field_unit.js`: 66 passed, 0 failed.
- `node field_smoke.js index.html`: exit 0, no failures.

## Commit

- `index.html`: model-refusal branch gains `captureFieldError` telemetry;
  function header comment documents the disproven proof-mode premise so
  it isn't re-investigated from scratch later. `SW_VERSION` bumped
  `2026-07-12k` → `2026-07-12l`.
- `sw.js`: `SW_VERSION` synced.
- `docs/TYPED-RESULT-MIGRATION-QUEUE.md`: entry #4 corrected to reflect
  what was actually investigated and fixed, marked ✅ MIGRATED.
- This manifest.
