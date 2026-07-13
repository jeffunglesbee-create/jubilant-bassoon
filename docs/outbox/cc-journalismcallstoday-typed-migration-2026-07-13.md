# CC Session Outbox — journalismCallsToday migration (queue Bucket A #5, self-directed)

**Date:** 2026-07-13
**Scope:** jubilant-bassoon (sole). Continuing autonomously through
`docs/TYPED-RESULT-MIGRATION-QUEUE.md`'s ranked Bucket A list.

## Novel thinking: reading all 9 real callers surfaced a confirmed bug, not just a hypothetical

The queue's finding: `canCall()` collapses "budget exhausted" (permanent
for the day) and "429 backoff active" (temporary, `_compoundRetryAfter`
IS the known expiry) into the same `false`. Rather than assume every
caller would benefit equally from differentiation (a mechanical read of
the finding), read all 9 real call sites individually:

- **`fetchFIELDBriefFromClaude`** (~L31296): already deliberately
  bypasses `canCall()` entirely — its own comment: "J3 brief is served
  from relay KV (no Gemini call); compound 429 backoff must not gate it.
  Hard ceiling only — read the counter directly, bypassing canCall()
  backoff bleed." Already correct, sophisticated handling. Nothing to fix.
- **`fetchCompoundEditorial`** (~L28308): **a real, confirmed bug.** This
  function already had a SEPARATE 429-backoff check a few lines after its
  `canCall()` check, specifically to set a more informative
  `window._compoundLastError` message with a countdown
  (`in 429 backoff (${N}s left)`). But `canCall()` itself already returns
  `false` under the exact same `Date.now() < _compoundRetryAfter`
  condition — meaning the function always exited at the FIRST check
  whenever backoff was active, and the second, more informative check
  could never execute. Confirmed via direct read: nothing between the two
  checks could change `_compoundRetryAfter`. **This diagnostic message —
  a countdown the Health Panel's debug UI is built to display — has never
  once fired.**
- The other 5 call sites (`fetchSeriesPreviewFromClaude`,
  `fetchMLBGameBriefFromClaude`'s own-budget-check branch,
  `fetchEPLMatchBriefFromClaude`, `fetchNightOwlFromClaude`, and the
  Scout's-Pick div-removal site ~L42351) all just do a plain
  `if (!budget.canCall()) return null;` — no existing differentiation
  attempt, so no dead-code bug to fix there. Adding new differentiated
  behavior to these 5 without a confirmed present need would be inventing
  speculative behavior, not fixing a real bug — same restraint applied to
  `findESPNScore`'s 25+ untouched callers earlier this session.

## Fix

- `journalismCallsToday()` gained `blockedReason()` — additive only,
  returns `'budget-exhausted' | 'backoff' | null`. `canCall()`'s boolean
  contract is completely unchanged; all 9 real callers keep working
  exactly as before with zero risk.
- `fetchCompoundEditorial`'s guard restructured to check
  `budget.blockedReason()` at the point that actually exits (the first
  `!budget.canCall()` check), so the countdown diagnostic now genuinely
  fires. The now-fully-unreachable second check removed (not just left as
  more dead code).

## Real verification (Node `vm`, functions extracted verbatim)

**`journalismCallsToday()` (3 scenarios):**

| Scenario | `canCall()` | `blockedReason()` |
|---|---|---|
| Available | `true` | `null` |
| Budget exhausted (50/50 used) | `false` | `'budget-exhausted'` |
| In 429 backoff | `false` | `'backoff'` |

**`fetchCompoundEditorial`'s guard (3 scenarios):**

| Scenario | Return | `window._compoundLastError` |
|---|---|---|
| 429 backoff (45s left) | `null` | `"in 429 backoff (45s left)"` — **was never set before this fix** |
| Budget exhausted | `null` | `""` — correctly does NOT set a misleading backoff message |
| Neither blocked | proceeds past the guard | (unchanged) |

All 6 assertions passed.

- `node -e "... new Function(s) ..."` per `<script>` block: clean.
- `node smoke.js index.html`: 919 passed, 0 failed.
- `node field_unit.js`: 66 passed, 0 failed.
- `node field_smoke.js index.html`: exit 0, no failures.

## Commit

- `index.html`: `journalismCallsToday()` gains `blockedReason()`;
  `fetchCompoundEditorial`'s dead-code backoff message fixed to actually
  fire. `SW_VERSION` bumped `2026-07-12l` → `2026-07-12m`.
- `sw.js`: `SW_VERSION` synced.
- `docs/TYPED-RESULT-MIGRATION-QUEUE.md`: entry #5 marked ✅ MIGRATED with
  the real finding documented (not the originally-hypothesized one).
- This manifest.
