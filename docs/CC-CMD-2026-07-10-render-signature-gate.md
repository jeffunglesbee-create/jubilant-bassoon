# CC-CMD: Render-signature gate — port the proposal, fix its own confirmed gap first

**Date:** 2026-07-10
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR

## CONTEXT

Source: a ChatGPT-authored rationale + implementation file
(`index-2026-07-10-no-rerender.html`, Drive), verified against this
codebase directly before writing this doc — not merged as-is.

**Real, valuable idea, confirmed genuinely missing from current code.**
`scheduleRenderAll()` today is pure timing — it debounces rapid calls
but the surviving call always runs `renderAll(true)` regardless of
whether anything structural actually changed. The proposal adds a
semantic signature comparison: skip the expensive structural rebuild
when the visible schedule state is unchanged, refresh only the dynamic
surfaces (score ticker, One To Watch, Watch Window, etc.) instead.
Confirmed via direct read: this genuinely doesn't exist today beyond
timing-based debouncing.

**Real, confirmed bug in the proposal's own implementation, found by
testing it against its own stated failure conditions.** The proposal
document explicitly lists "Pick'em state changes fail to appear" as a
condition that would prove the optimization wrong. Its own
`_fieldGameRenderPayload()` — the per-game signature input — includes
no Pick'em field anywhere (confirmed: no `pick`, `pickState`,
`userPick`, or equivalent). A pick being made or Pick'em locking/
resolving, with no other game field changing, would leave the
signature unchanged, skip the structural render, and silently fail to
update Pick'em UI — precisely the failure the source document itself
warned against. Do not port this function as-is; it must be fixed as
part of this build, not after.

**Also unconfirmed, worth checking rather than assuming either way:**
the payload includes `_fieldSafeGameBrief(g)` (presumably covering
FIELD Brief content changes) but no equivalent call for Night Owl
content — the document's failure list names both surfaces. May be
intentional if Night Owl keys off a separate mechanism; confirm via
probe, don't assume it's a second bug or that it's fine.

## PROBE BLOCK

```bash
git log --oneline -5

grep -n "function scheduleRenderAll" -A 15 index.html
# Re-confirm current (timing-only) implementation before replacing it.

grep -n "pickState\|userPick\|_pickState\|field_pickem" index.html | head -20
# Find the REAL current Pick'em state field names/shape — the proposal
# invented none of these, so the actual field names must come from
# this codebase's real Pick'em implementation, not be guessed.

grep -n "function.*NightOwl\|nightOwlBrief\|_owlBriefKey" index.html | head -10
# Determine whether Night Owl content changes are already covered by
# some other mechanism, or genuinely need adding to the signature.
```

## TASK 1 — Port the render-signature gate, with the Pick'em gap fixed

Adapt `_fieldVisibleRenderSignature()`, `_fieldGameRenderPayload()`,
`_fieldRefreshDynamicSurfaces()`, and the modified `scheduleRenderAll()`
from the source file, using this codebase's real field names
throughout (not the source file's, where they differ). Add the real
Pick'em state field(s) found by the probe to
`_fieldGameRenderPayload()` before this ships — this is a required
fix, not optional. If the probe confirms Night Owl content genuinely
isn't covered by anything else, add it too; if it's already covered
elsewhere, state that explicitly and don't duplicate.

## TASK 2 — Verify against the source document's own failure list

The source document lists 12 specific failure conditions. Test every
one directly against the ported implementation, including — with
particular attention, since it's the one confirmed broken in the
source — that a Pick'em state change alone (no other game field
different) correctly triggers a visible UI update. Report each
condition's real, observed pass/fail, not inferred from code reading.

## TASK 3 — Live verification, matching this session's standing bar

Real or realistic test data. Confirm: (a) identical successive polls
correctly skip structural rendering and only refresh dynamic surfaces,
(b) a genuine structural change (new game, date change, filter change)
correctly triggers a full render, (c) the previously-confirmed-broken
Pick'em case now correctly triggers an update, (d) `scroll position`
is preserved across a skipped-render score update (the core UX claim
the whole proposal is built around) — verify this observably, not just
assume it follows from the code shape.

## DONE CONDITIONS

- [x] Render-signature gate ported using this codebase's real field
      names, not the source file's
- [x] Pick'em field added to the per-game signature — confirmed fixed,
      not just ported broken
- [x] Night Owl coverage confirmed either already-present-elsewhere or
      added — not silently left as a gap
- [x] All 12 of the source document's own failure conditions tested
      directly, each with a real reported outcome
- [x] Scroll-stability claim verified observably, not assumed

## CONFIDENCE SCORING

- +25 — gate ported correctly with real field names throughout
- +25 — the confirmed Pick'em gap genuinely fixed, verified via a real
  test matching the exact failure mode found
- +15 — Night Owl coverage confirmed one way or the other, not left
  ambiguous
- +20 — all 12 failure conditions tested with real reported outcomes
- +15 — scroll-stability verified observably

**Do not commit unless confidence >= 95. If score < 95, report verbatim
and stop.**

## ONE-LINER

```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git pull. Read docs/CC-CMD-2026-07-10-render-signature-gate.md. Execute all tasks. Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```
