# CC Session Outbox — fetchMLBGameBriefFromClaude (queue Bucket A #9, self-directed)

**Date:** 2026-07-13
**Scope:** jubilant-bassoon (sole). Continuing autonomously through
`docs/TYPED-RESULT-MIGRATION-QUEUE.md`'s ranked Bucket A list.

## Novel thinking: not every "conflated causes" entry needs caller differentiation

The queue's finding for this entry mirrored #8 (`fetchFIELDBriefFromClaude`):
"budget-exceeded, HTTP failure, and exceptions all collapse to the same
`card.remove()`... no distinction between retry-worthy and not." Read
both real callers before assuming the same fix applied.

**Found the shape is genuinely different from #8.** `fetchFIELDBriefFromClaude`
had a pre-existing static fallback already rendered, which the caller
could simply leave alone for intentional/expected reasons — that's what
made differentiation valuable there. Neither of `fetchMLBGameBriefFromClaude`'s
2 real callers has an equivalent: both show a "pending" loading card with
no content to fall back to, and the codebase's own established rule
(stated explicitly in a sibling comment elsewhere) is "Always remove card
on failure — never leave 'Loading brief…' stuck." Card removal is
correct regardless of the specific failure reason — there's no
better alternative UI a caller could offer, even for a hypothetical
budget-exhausted case (the card budget resets daily; leaving a "pending"
card stuck until tomorrow would violate the codebase's own established
UX rule). Building caller-side reason-branching here would have been
inventing complexity with no real behavior to attach it to.

**What WAS real:** this function's 2 failure paths (`!r.ok` and the
`catch`) had **zero telemetry** — not a `console.warn`, not
`captureFieldError`, nothing. The Health Panel has been completely blind
to MLB brief failures. Its sibling function `generateJournalismViaRelay`
(fixed earlier this session) already establishes the right pattern for
this exact kind of function.

## Fix

Added `captureFieldError('journalism:mlb-brief', ...)` to both the
`!r.ok` branch and the `catch` block. No return-contract change (still
`null` on any failure, as before) — both real callers are completely
unaffected; this is purely additive telemetry.

## Real verification (Node `vm`, function extracted verbatim)

| Test | Scenario | Return | `_fieldErrors` |
|---|---|---|---|
| A | HTTP 500 | `null` | **1** (was 0 — the fix) |
| B | Thrown network exception | `null` | **1** (was 0 — the fix) |
| C | Genuine success | real brief text | 0 (unchanged) |

All 3 assertions passed.

- `node -e "... new Function(s) ..."` per `<script>` block: clean.
- `node smoke.js index.html`: 919 passed, 0 failed.
- `node field_unit.js`: 66 passed, 0 failed.
- `node field_smoke.js index.html`: exit 0, no failures.

## Commit

- `index.html`: `fetchMLBGameBriefFromClaude` gains `captureFieldError`
  telemetry on both failure paths; no caller changes (confirmed not
  needed). `SW_VERSION` bumped `2026-07-12o` → `2026-07-12p`.
- `sw.js`: `SW_VERSION` synced.
- `docs/TYPED-RESULT-MIGRATION-QUEUE.md`: entry #9 marked ✅ MIGRATED.
- This manifest.
