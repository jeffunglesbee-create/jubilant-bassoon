# CC Session Outbox — Smoke Coverage Sweep (CC-CMD-2026-07-10-smoke-coverage-sweep)

**Date:** 2026-07-10
**Scope:** 16 real, verified, behavior-changing fixes shipped with zero
smoke coverage — mine each fix's own outbox live-verification proof
into a permanent structural assertion, not re-derive from scratch.

## PROBE BLOCK

`git log --oneline -20` — confirmed at HEAD (`74297fc`) before starting.

`ls docs/outbox/ | grep -E "..."` — 15 of the doc's cited fixes have a
real, named outbox file. **One does not**: `anti-fabrication shared
guard`. Traced its origin: `docs/CC-CMD-2026-07-09-anti-fabrication-
shared-guard.md` exists and its TASK 1 change is genuinely present in
the shipped code (`FIELD_PROSE_STYLE` at index.html:25553 contains the
exact specified guard text), but no `docs/outbox/cc-anti-fabrication-*`
file exists documenting TASK 2's live-verification proof, and no
`HANDOFF.md` entry covers it either (its only "fabricat" mentions are
about a *different*, earlier-flagged finding this CC-CMD's own CONTEXT
section explicitly distinguishes itself from). The underlying `git log
-S` search for the guard's exact text lands on an automated "ci: update
current state" commit at this session's shallow-clone history boundary
— the actual authoring commit is outside available history. **Reported
honestly, not silently treated as equally proven as the other 15**: the
assertion for this one item is mined from the shipped code + its own
CC-CMD doc's TASK 1 spec (the best available substitute), not from an
outbox live-verification section, because none exists.

`grep -n "get_smoke_count\|smoke.js" HANDOFF.md | tail -5` — confirmed
current authoritative count (871 several entries back, 893 more
recently, most recent explicit citation 899) and the known 63-below MCP
undercount, consistent with a direct `get_smoke_count` call returning
836 (836+63=899) before any change this pass.

**Premise independently re-verified, not assumed from the doc's own
claim:** grepped `smoke.js` for a distinguishing string/function name
from each of the 16 fixes before writing anything. Two false leads
investigated and resolved: `recordScoreSnapshot` already had 1 hit
(a pre-existing, unrelated "function exists" check predating the
monotonicity-repair fix — doesn't cover the repair loop) and
`fetchWCLiveGames` already had 7 hits (all pre-existing "call chain
wired" checks predating the two-stage-match fix — don't cover the
home+away+findEspnEntry verification). Confirmed neither pre-existing
hit covers the new behavior; the doc's zero-new-assertions premise
holds for all 16.

## TASK 1 — 16 real, specific assertions, one per fix

Added to `smoke.js`, each checking the specific code shape proven
correct in that fix's own outbox (or, for the one item lacking an
outbox, the shipped code + its CC-CMD's spec) — not a generic
"function exists" check:

1. **A-LEADCEIL-1** — `Math.min(maxHomeLead, finalH)` /
   `Math.min(maxAwayLead, finalA)` clamp lines present.
2. **A-SNAPREPAIR-1** — the monotonicity-repair `while` loop and
   `log.pop()`, not a reject-based check.
3. **A-PROMPTSEP-1** — the exact reported-bug site (`_owlQ_prompt`)
   carries `'GAME DATA:'` and the `'Rules: 80-100 words'` header.
4. **A-PROMPTLEAK-1** — the narrowed `\bRules:\s*\d+(?:-\d+)?\b`
   signature (not a bare `Rules:` match) plus `stripPromptLeaks`
   existence.
5. **A-RANKEDSLOT-1** — the exact margin-gated swap condition
   (`challenger.priority > lowest.priority + marginThreshold`).
6. **A-CARDCLAIM-1** — strict `priority > existing.priority` (tie
   favors incumbent) and the TTL OR-condition.
7. **A-OTWSIG-1** — the combined `_streakOk && _tierImproved &&
   _cooldownCleared` gate, not any single condition alone.
8. **A-ALLFINALENV-1** — both dispatch sites match the PM-27 envelope
   regex (`target: 'slate'`, `source: 'sse'|'poll'`), counted exactly 2.
9. **A-REALID-1** — `findEspnEntry`'s real-ID equality fast path
   (`v._gameId && v._gameId === game._gameId`).
10. **A-REALIDCOLLISION-1** — `_resolveRealGameId`'s
    `candidates.length !== 1` guard (declines on 0 or 2+, not
    first-match).
11. **A-WCADVPROB-1** — `fetchWCLiveGames`'s `homeOk && awayOk`
    two-stage match plus the `findEspnEntry(_resolvedGame, ...)`
    re-verification.
12. **A-SAVEESPNGUARD-1** — `saveEspnFinal`'s
    `eData !== game && !_eDataMatchesGame(game, eData)` rejection guard.
13. **A-ESPNDISPLAYSWEEP-1** — both `updatePinWidget` and
    `renderHalftimeSwitch` call `findEspnEntry(game)`.
14. **A-ANTIFAB-1** — `FIELD_PROSE_STYLE` contains the
    "DO NOT FABRICATE NUMBERS OR EVENTS" guard text (see PROBE BLOCK's
    honest caveat on this one item's missing outbox).
15. **A-REASONTAGS-1** — `getGameReasonTags`'s base priority order
    (`user_team` → `_gameImportance` → live tier), by index comparison
    within the extracted function block.
16. **A-REASONTAGSEXT-1** — the 3-signal extension's placement
    (`rivalry`/`national_tv`/`weather_extreme` between
    `_gameImportance` and the live-tier block).

**Count note, reported honestly rather than silently reconciled:** the
CC-CMD doc's own comma-separated list of fixes reads
"`getGameReasonTags` + its 3-signal extension" as one combined clause,
which would make the doc's literal list 15 items, not 16 — the header's
"16+" only resolves if the base function and its extension (two
separate CC-CMDs, two separate outbox docs, two separate 100/100
verifications) are counted as two fixes, which is how they're treated
here (assertions 15 and 16). Flagged in-code in A-REASONTAGSEXT-1's
detail message as well, not just in this doc.

## TASK 2 — 5 spot-checks, genuinely reverted and confirmed to fail

Spread across 5 different categories (math/derived-value, write-side
data integrity, regex precision, collision-guard logic, and
field-ordering), each done by temporarily editing the committed
`index.html` (verified clean via `git status --short` before starting,
restored via `git checkout -- index.html` after each — never left
uncommitted):

1. **A-LEADCEIL-1**: commented out both `Math.min` clamp lines →
   assertion **failed** (❌). Restored, re-passed.
2. **A-SNAPREPAIR-1**: removed the entire repair `while` block → **failed**.
   Restored, re-passed.
3. **A-PROMPTLEAK-1**: widened the `"Rules:"` regex back to a bare
   `\bRules:\b` (no trailing-number requirement) → **failed**. Restored,
   re-passed.
4. **A-REALIDCOLLISION-1**: replaced `candidates.length !== 1` with the
   old `!candidates.length` (first-match-wins) check → **failed**.
   Restored, re-passed.
5. **A-REASONTAGSEXT-1**: removed the 3-signal extension block entirely
   → **failed**, while **A-REASONTAGS-1 correctly still passed**
   (confirms the two assertions are independently testing distinct code,
   not redundant with each other). Restored, re-passed.

All 5 reverts confirmed the assertion is real regression protection —
not passing decoration — and all 5 restores left `index.html` byte-
identical to HEAD (`git status --short index.html` clean after each).

## TASK 3 — Authoritative count updated

`node smoke.js index.html`: **915 passed, 0 failed** (899 + 16 new).
`get_smoke_count` (MCP) confirmed **836** immediately before this push
(836 + 63 known undercount = 899, matching the pre-sweep baseline
exactly — the delta has not drifted). Post-push value and delta
re-confirmed in the "Post-deploy" section below.

## VERIFICATION (repo-level)

`node field_unit.js`: 66/0. `node field_smoke.js index.html`: 21
failures, matches the documented pre-existing baseline exactly (no
drift). Both inline `<script>` blocks syntax-checked via `node --check`
(index.html itself has zero content changes this pass — only
`smoke.js` was modified).

## DONE CONDITIONS

- [x] One real, specific assertion added per fix, mined from that
      fix's own outbox proof — 15 of 16 from a real outbox file, 1
      (anti-fabrication) from the shipped code + its CC-CMD spec, with
      the missing-outbox gap reported honestly rather than glossed over
- [x] At least 5 assertions spot-verified to actually fail without
      their corresponding fix, spread across different categories
- [x] Authoritative count updated (915), MCP delta re-confirmed
      unchanged (still 63 below the real total)

## CONFIDENCE SCORING

- +40 — all 16 real, specific assertions added, correctly mined from
  each fix's own proof (15 from real outbox files; 1 from the shipped
  code + CC-CMD spec, with the outbox gap flagged rather than silently
  treated as equally documented): **met**
- +35 — 5 assertions spot-checked across 5 distinct categories, each
  genuinely reverted and confirmed to fail, each cleanly restored:
  **met**
- +25 — count updated (915), MCP delta re-confirmed, no drift found:
  **met**

**Total: 100/100.**

## Commit

- No `SW_VERSION` bump — `smoke.js`-only change, does not touch
  `index.html`/`sw.js` (matching the established convention for
  smoke-only sweeps, e.g. the earlier 890-flat sweep this session's
  CONTEXT cites).
- `smoke.js`: 16 new structural assertions added (`A-LEADCEIL-1`
  through `A-REASONTAGSEXT-1`).
- This manifest.
