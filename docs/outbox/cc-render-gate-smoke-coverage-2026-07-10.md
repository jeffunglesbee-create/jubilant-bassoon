# CC Session Outbox — Smoke Coverage for the Render-Signature Gate (CC-CMD-2026-07-10-render-gate-smoke-coverage)

**Date:** 2026-07-10
**Scope:** The render-signature gate (`a8ca7f3`) landed after the
16-item smoke-coverage sweep (`0e0189f`) was written, so it was never
in that sweep's scope despite being the newest, most consequential
piece of infrastructure shipped that session. Add real, specific
coverage mined from its own outbox.

## PROBE BLOCK

`git log --oneline -5` — confirmed at HEAD (`93ea373`) before starting.

Read `docs/outbox/cc-render-signature-gate-2026-07-10.md` in full
(already authored this session — no re-derivation needed). Confirmed
the 13 tested failure conditions, the C5/C5b Pick'em case, and the live
scroll-stability/DOM-node-identity proof cited in this CC-CMD's CONTEXT
are accurate to that doc's actual content.

`grep -n "function _fieldVisibleRenderSignature\|function
_fieldGameRenderPayload\|function scheduleRenderAll\|function
_fieldGamePickSignature" index.html` — re-confirmed current line
numbers and exact source (all four still match what was shipped in
`a8ca7f3`, no drift since).

## TASK 1 — 4 core assertions, mined from the gate's own outbox

1. **A-RENDERGATE-SKIP-1** — `scheduleRenderAll`'s signature-comparison
   `return` genuinely sits *before* `renderAll(true)` in source order
   (index comparison within the extracted function block), not just
   present somewhere in the function.
2. **A-RENDERGATE-REBUILD-1** — `_fieldVisibleRenderSignature`'s
   payload embeds the full per-game list via
   `(sec.games||[]).map(g => _fieldGameRenderPayload(g, pickCache))`
   plus the `date`/`filter` fields — the structural properties that
   make any real change (new/removed game, date, filter) produce a
   different signature string, not a summarized/lossy representation.
3. **A-RENDERGATE-PICKEM-1** — the exact confirmed-fixed bug: the
   payload includes `pick: _fieldGamePickSignature(g, pickCache)`, and
   that helper reads `predictedWinner`/`resolved`/`wasCorrect`/
   `probabilityLabel` — the specific fields whose change was proven
   (outbox C5/C5b, and live against a real production game) to alter
   the signature with every other game field held identical.
4. **A-RENDERGATE-NATBUNDLE-1** — both `nationalBundle: g.nationalBundle
   || ''` and the `weatherExtreme` ternary (mirroring
   `getGameReasonTags()`'s own formula verbatim) are present in the
   per-game payload — the TASK 0 gap-closure.

Matches the `A-` naming convention and assertion style established by
the prior 16-item sweep (extract function block via `indexOf` + fixed-
length `slice`, check `block.includes(...)`/index-ordering for exact
proven code shapes, not generic existence checks).

**One window-length bug caught and fixed during verification, not
shipped:** the first draft of `A-RENDERGATE-PICKEM-1` and
`A-RENDERGATE-NATBUNDLE-1` used a 1000-char extraction window for
`_fieldGameRenderPayload`, which cut off exactly before the
`weatherExtreme`/`pick` lines (the object literal is long enough that
1000 chars lands mid-`nationalBundle`). Both assertions initially
false-failed. Investigated rather than assumed the code was wrong —
confirmed via direct `node -e` inspection that the real source is
correct and the window was too short — widened both to 1300 chars.

## TASK 2 — All 4 assertions spot-verified to genuinely fail without their fix

Each done by temporarily editing the committed `index.html` (verified
clean via `git status --short` before starting, restored via `git
checkout -- index.html` after each):

1. **A-RENDERGATE-SKIP-1**: removed the entire skip branch (the
   signature comparison, `skippedStructuralRenders++`,
   `_fieldRefreshDynamicSurfaces()`, `return`) so `scheduleRenderAll`
   always falls through to `renderAll(true)` → assertion **failed**
   (❌). Restored, re-passed.
2. **A-RENDERGATE-REBUILD-1**: replaced the full mapped `sports` array
   with a lossy `sports.length` summary → **failed**. Restored,
   re-passed.
3. **A-RENDERGATE-PICKEM-1**: removed the `pick:` field from the
   payload object entirely → **failed**. Restored, re-passed.
4. **A-RENDERGATE-NATBUNDLE-1**: removed both `nationalBundle` and
   `weatherExtreme` from the payload (reproducing the exact TASK 0 gap
   the gate closed) → **failed**. Restored, re-passed.

All 4 reverts confirmed the assertions are real regression protection.
Final `git status --short index.html` clean after every restore; final
full smoke run confirms all 919 pass with `index.html` unchanged.

## TASK 3 — Authoritative count updated

`node smoke.js index.html`: **919 passed, 0 failed** (915 + 4 new).
`get_smoke_count` (MCP) confirmed **852** immediately before push
(852 + 63 known undercount = 915, matching the pre-this-CC-CMD baseline
exactly — no drift). Post-push value confirmed below.

## VERIFICATION (repo-level)

`node field_unit.js`: 66/0. `node field_smoke.js index.html`: 21
failures, matches the documented pre-existing baseline exactly. Both
inline `<script>` blocks syntax-checked via `node --check` (index.html
itself has zero content changes this pass — only `smoke.js` was
modified).

## DONE CONDITIONS

- [x] Real assertions added for skip-on-unchanged, rebuild-on-change,
      the specific Pick'em case, and nationalBundle/weatherExtreme
      coverage — each mined from the gate's own outbox, not invented
- [x] Every new assertion spot-verified to actually fail without its
      corresponding piece of the gate
- [x] Count updated (919), MCP delta re-confirmed

## CONFIDENCE SCORING

- +40 — all 4 core assertions added, correctly mined from the outbox:
  **met**
- +40 — each spot-verified to genuinely fail without its fix (4/4, not
  just a sample — small enough set to check exhaustively): **met**
- +20 — count updated, delta re-confirmed: **met**

**Total: 100/100.**

## Commit

- No `SW_VERSION` bump — `smoke.js`-only change, matching the
  established convention for smoke-only sweeps (confirmed against both
  prior sweeps this session, neither of which touched
  `index.html`/`sw.js`).
- `smoke.js`: 4 new structural assertions added (`A-RENDERGATE-SKIP-1`
  through `A-RENDERGATE-NATBUNDLE-1`).
- This manifest.
