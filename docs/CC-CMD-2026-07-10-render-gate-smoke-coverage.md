# CC-CMD: Smoke coverage for the render-signature gate's own behavior

**Date:** 2026-07-10
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR

## CONTEXT

Real, confirmed gap: the render-signature gate (`_fieldVisibleRenderSignature`,
`_fieldGameRenderPayload`, the rewritten `scheduleRenderAll`) landed
via commit `a8ca7f3`, *before* the 16-item smoke-coverage sweep
(`0e0189f`) was written — so it was never in that sweep's scope. Its
own outbox mentions widening an existing unrelated assertion's
matching window, which is not the same as a new assertion testing this
gate's own core logic. This is currently the newest, most consequential
piece of infrastructure shipped tonight with zero standing regression
protection.

**Same proven method as both prior sweeps tonight: mine the gate's own
outbox verification into real assertions, don't re-derive from
scratch.** The outbox (`docs/outbox/cc-render-signature-gate-2026-07-10.md`)
already documents 13 tested failure conditions, the specific Pick'em
case (C5/C5b), and the scroll-stability/DOM-node-identity proof — read
it in full before writing anything.

## PROBE BLOCK

```bash
git log --oneline -5

cat docs/outbox/cc-render-signature-gate-2026-07-10.md
# Read the full outbox — this is the source material for every
# assertion below. Do not write an assertion for a claim that doc
# didn't actually test.

grep -n "function _fieldVisibleRenderSignature\|function _fieldGameRenderPayload\|function scheduleRenderAll" -A 20 index.html
# Re-confirm current implementation before writing assertions against it.
```

## TASK 1 — Core assertions, mined from the gate's own outbox

At minimum, one real assertion each for:

- **Skip-on-unchanged:** two identical successive signature computations
  produce the same string; the second `scheduleRenderAll()` call does
  NOT trigger `renderAll(true)`.
- **Rebuild-on-structural-change:** a real structural change (new game
  added, date changed) produces a different signature and DOES trigger
  a full render.
- **The specific Pick'em case already proven in the outbox (C5/C5b):**
  a pick state change alone, with no other game field different,
  correctly changes the signature and triggers an update — this is the
  exact bug the gate was built to fix; it needs its own dedicated
  assertion, not just general coverage.
- **nationalBundle/weatherExtreme coverage:** confirm both fields
  correctly appear in the signature payload (the TASK 0 amendment),
  and that a change to either alone changes the signature.

Match the file's existing assertion style and naming convention
(`A-` prefix, matching the 16 added in the prior sweep).

## TASK 2 — Verify each new assertion actually fails without the fix

Same discipline as the prior sweep: temporarily revert the relevant
piece of the render-signature gate locally, confirm each new assertion
fails, restore, confirm clean. Report per assertion.

## TASK 3 — Update the authoritative count

`node smoke.js index.html`, update HANDOFF.md, re-confirm the
`get_smoke_count` MCP delta is still exactly 63 below the real total.

## DONE CONDITIONS

- [x] Real assertions added for skip-on-unchanged, rebuild-on-change,
      the specific Pick'em case, and nationalBundle/weatherExtreme
      coverage — each mined from the gate's own outbox, not invented
- [x] Every new assertion spot-verified to actually fail without its
      corresponding piece of the gate
- [x] Count updated, MCP delta re-confirmed

## CONFIDENCE SCORING

- +40 — all 4 core assertions added, correctly mined from the outbox
- +40 — each spot-verified to genuinely fail without its fix
- +20 — count updated, delta re-confirmed

**Do not commit unless confidence >= 95. If score < 95, report verbatim
and stop.**

## ONE-LINER

```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git pull. Read docs/CC-CMD-2026-07-10-render-gate-smoke-coverage.md. Execute all tasks. Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```
