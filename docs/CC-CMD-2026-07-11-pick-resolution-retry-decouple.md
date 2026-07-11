# Claude Code Command — Decouple pick-resolution retry from saveEspnFinal's dedup guard

**Date:** 2026-07-11
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Scope:** A ChatGPT analysis flagged `saveEspnFinal()`'s pick-resolution call (`_resolvePickIfExists`, ~line 39192) as wrapped in a fully silent `catch(_){}`. Confirmed real via direct trace — but the actual severity is worse than "silent": `saveEspnFinal`'s own dedup guard (`existing.push(entry)`, ~line 39298, ~118 lines after the pick-resolution call in the same function body) fires unconditionally, regardless of whether pick resolution actually succeeded. Once a game's id lands in `existing`, the function's own early-exit guard (`if(existing.some(f=>f.id===id)) return`) means it will never run pick-resolution logic for that game again on any future poll cycle. A transient pick-resolution failure isn't just unlogged — it's structurally permanent, with no path to ever retry.

**Branch:** main — commit directly, do not create a feature branch or PR.

git pull. Read CLAUDE.md and STANDARDS.md's DO NOT INVENT rule before touching this.

Write findings to outbox/cc-pick-resolution-retry-decouple-2026-07-11.md.

## TASK 1 — Confirm the traced sequence from current HEAD

Re-confirm: (a) the pick-resolution call and its silent catch still exist as described; (b) the dedup-marking `existing.push(entry)` still happens later in the same function body, unconditional on pick-resolution's outcome; (c) no code between the two would prevent this sequence (e.g. no early return specifically gated on pick-resolution success that would already handle this). Report the exact current line numbers, which may have shifted.

## TASK 2 — Understand how pick-resolution already tracks "resolved" state

Before designing a fix, read `_resolvePickIfExists()` and the broader pick-storage mechanism (`_pickStorageKey()`, `localStorage['field_picks_v1']`, `makePick()`) to understand how a pick's own resolved/unresolved state is currently tracked, independent of `saveEspnFinal`'s own game-level dedup. This existing mechanism is what TASK 3's fix should reuse — do not invent a new "is this pick resolved" concept if one already exists.

## TASK 3 — Decouple pick-resolution retry from the save-dedup guard

The `existing`/`FINALS_KEY` dedup guard exists for a real, separate reason (preventing duplicate drama-persistence POSTs, D1 writes, and other one-time-per-final-game side effects from firing repeatedly) and must NOT be weakened or removed — that would reintroduce a different class of bug this function was built to prevent.

Instead: make pick-resolution retry independent of that guard. On every `saveEspnFinal` call for a game — including ones where the main dedup guard would otherwise return early — separately check whether *this specific game's pick* (via the existing pick-storage mechanism from TASK 2) is still unresolved, and if so, attempt `_resolvePickIfExists` again regardless of the game's own already-saved status. This means moving the pick-resolution attempt (or a check-and-retry wrapper around it) to run before or independent of the early-return dedup check — reasoned explicitly in the outbox, not just implemented, since this changes control flow in a function with other real side effects nearby.

Reuse `captureFieldError` for visibility on each attempt (success and failure), matching tonight's established pattern (tag: `pick:resolve-final`). Do not build a new queue/retry-scheduling mechanism — the poll loop that already calls `saveEspnFinal` repeatedly is the retry mechanism, once pick-resolution is no longer blocked by the unrelated dedup guard.

## TASK 4 — Confirm no double-firing of the other one-time side effects

After TASK 3's change, confirm directly (not assumed) that drama-persistence POST, D1 archive writes, and any other one-time side effect in `saveEspnFinal` still fire exactly once per game — the fix must isolate pick-resolution's retry path from these, not accidentally make them retry too.

## VERIFICATION

- Construct a real test: force `_resolvePickIfExists` to throw on its first call for a specific game with an active unresolved pick, confirm the game's other one-time side effects (drama persistence, D1 write) still fire exactly once on that first call, then simulate a second `saveEspnFinal` call for the same game (as the real poll loop would produce) and confirm pick-resolution is attempted again and can succeed on retry. Revert the test change afterward.
- Confirm `node smoke.js` passes clean.
- Confirm the existing "already saved" dedup behavior is unchanged for the normal, no-failure case — a game's other side effects still fire exactly once.

## DONE CONDITION

A pick-resolution failure for a given game can be retried on a subsequent poll cycle, independent of that game's own save-dedup status — verified with a real forced-failure-then-retry test, not asserted. All other one-time side effects in `saveEspnFinal` remain correctly deduplicated. Confidence ≥ 95.

**Confidence scoring:**
- TASK 1 confirms the exact current sequence, correct line numbers (10 pts)
- TASK 2 correctly identifies and reuses the existing pick-resolved-state mechanism, no new concept invented (20 pts)
- TASK 3 correctly decouples pick-retry from the save-dedup guard, reasoning stated for the control-flow change, `captureFieldError` reused (35 pts)
- TASK 4 confirms other one-time side effects remain correctly deduplicated, not accidentally made retryable too (15 pts)
- Real forced-failure-then-retry test constructed and verified (15 pts)
- `node smoke.js` clean (5 pts)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.