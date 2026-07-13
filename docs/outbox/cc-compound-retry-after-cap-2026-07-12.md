# CC Session Outbox — uncapped backoff audit + fetchCompoundEditorial fix

**Date:** 2026-07-12
**Scope:** jubilant-bassoon (sole). Direct user request ("Verify the
backoffs aren't uncapped"), not a queue entry — follows directly on from
the completed 13-entry Bucket A sweep in the same session.

## Sweep methodology

Grepped `index.html` for every pattern that could indicate an unbounded
retry/backoff delay:

- `[Bb]ackoff` (all mentions)
- `Date.now\(\)\s*\+\s*[a-zA-Z_]` (future-timestamp computation, the shape
  every backoff-until value takes in this file)
- `Math.pow`/`\*\*`/`<<` near retry/backoff/delay text (exponential growth)
- non-literal `setTimeout`/`setInterval` delay arguments (variable, not a
  literal constant)
- `_attempts`/`retries`-multiplier patterns (linear backoff)

Every hit was cross-checked against its real surrounding code, not judged
from the grep match alone.

## Findings

| Mechanism | Cap | Status |
|---|---|---|
| `fetchCompoundEditorial` 429 handler — `_compoundRetryAfter` | **none** (raw `Retry-After` header, unclamped) | **BUG — fixed this session** |
| `slashGolfFetch` 429 backoff — `_slashGolf429Until` | fixed 60-minute constant | already capped |
| ESPN per-league error backoff | `Math.min(15000 * Math.pow(2, errCount-1), 300000)` | already capped (5 min ceiling) |
| GameSocket EventSource reconnect | `Math.min(delay, 60000)` + `MAX_RECONN = 5` | already capped (both time and attempt count) |
| BracketDO WebSocket reconnect | `MAX_RECONN = 3`, linear `3000 * _attempts` (max ~9s) | already capped (attempt count; delay is inherently small) |
| GameSocket `_retryMs` | fixed `5000` constant, never modified | not a growth pattern, N/A |

Three other non-literal `setTimeout` calls were found and ruled out as
unrelated to backoff after reading their context: an F1 session-end
cleanup timer, a fixed per-card series-preview render stagger, and a
literal idle-callback timeout — none compute a growing or
externally-controlled delay.

## The bug

`fetchCompoundEditorial`'s 429 handler read the `Retry-After` HTTP header
directly from the relay/proxy response and used it unclamped:

```js
const retryAfter = parseInt(r.headers.get('Retry-After') || '60');
_compoundRetryAfter = Date.now() + retryAfter * 1000;
```

`Retry-After` is a server-controlled value. A misconfigured or
compromised upstream (or a unit-mismatch bug — e.g. milliseconds sent
where seconds were expected) could set `_compoundRetryAfter` arbitrarily
far in the future, disabling compound editorial calls for the rest of the
session or effectively permanently — the value is also persisted to
`localStorage` (`field_compound_retry_after`), so it survives reloads.
The localStorage-restore path only reads back whatever was written, so
fixing this single write site is sufficient to bound the whole mechanism.

## Fix

```js
const rawRetryAfter = parseInt(r.headers.get('Retry-After') || '60');
const retryAfter = Number.isFinite(rawRetryAfter) && rawRetryAfter > 0
  ? Math.min(rawRetryAfter, 1800)
  : 60;
_compoundRetryAfter = Date.now() + retryAfter * 1000;
```

- 30-minute (1800s) ceiling — same order of magnitude as `slashGolfFetch`'s
  own flat 60-minute 429 backoff elsewhere in this file, not an arbitrary
  new constant.
- A non-numeric (`NaN`) or non-positive header value falls back to the
  existing 60s default rather than silently disabling the backoff
  (`Date.now() < NaN` is always `false`, which would fail open — i.e. the
  guard would never trigger, not "backoff off").

## Real verification (Node `vm`, clamp logic extracted verbatim)

| Scenario | Header value | Expected clamped seconds |
|---|---|---|
| Normal | `30` | 30 |
| Missing header | (absent) | 60 (default) |
| Hostile/buggy huge value | `31536000` (1 year) | 1800 (clamped) |
| Malformed non-numeric | `"abc"` | 60 (default) |
| Negative | `-100` | 60 (default) |
| Zero | `0` | 60 (default) |
| Exactly at cap | `1800` | 1800 |
| Just over cap | `1801` | 1800 (clamped) |

All 8 assertions passed. Harness printed: `Max possible backoff now: 1800
seconds = 30 minutes (was: unbounded)`.

- `node -e "... new Function(s) ..."` per `<script>` block: clean.
- `node smoke.js index.html`: 919 passed, 0 failed.
- `node field_unit.js`: 66 passed, 0 failed.
- `node field_smoke.js index.html`: exit 0, no failures.

## Commit

- `index.html`: `fetchCompoundEditorial`'s 429 handler clamps
  `Retry-After` to a 30-minute ceiling, with a documented fallback for
  malformed/non-positive values. `SW_VERSION` bumped `2026-07-12s` →
  `2026-07-12t`.
- `sw.js`: `SW_VERSION` synced.
- This manifest.

No other backoff mechanism in the codebase required a change — all five
others checked were already correctly bounded by either a fixed constant
or a `Math.min`/attempt-count ceiling.
