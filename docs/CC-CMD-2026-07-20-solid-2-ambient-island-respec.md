# CC-CMD: Ambient Panel Solid Island — RESPEC (blocks CC-CMD-2026-07-19-solid-2)

**Date:** 2026-07-20
**Status:** Not started. Written because CC-CMD-2026-07-19-solid-2-ambient-island.md
was executed against and found non-viable as written (confidence ~5/100, no
code committed). This doc records why and what a corrected version needs,
per CLAUDE.md Rule 87 (#4 — no deferred work without a second CC-CMD).

## Why the original CC-CMD is blocked

Its own pre-build probe's "expected" output does not match current HEAD
(`e6d4bbc0`):

1. **`panel.innerHTML = _apWrapped` is at `src/legacy/field.js:32664`**, not
   ~32449. Minor on its own.

2. **`_gameRows` does not exist anywhere in `field.js`.** Task T3c's
   replacement code (`_gameRows.map(r => ({gid, sport, teams, score,
   status}))`) references a variable that was never real — running it as
   written throws `ReferenceError` on the first poll cycle. The real content
   assembled into `_apHTML` (`field.js:32653`) is NOT a homogeneous list of
   game rows. It's six heterogeneous sections, each with its own markup and
   in two cases inline interactivity:
   - OTW fire/soon card (`otwHTML`, `field.js:32431-32483`)
   - Live scores list (`scoresHTML`, `field.js:32490-32514`)
   - Soon list (`soonHTML`, `field.js:32527-32539`)
   - Upcoming list (`upcomingHTML`, `field.js:32541-32560`)
   - Season-context pill with an inline `onclick` scroll-to-filter handler
     (`ctxHTML`, `field.js:32565-32567`)
   - Editorial card — Night Owl or Brief variant, with text truncation,
     `onclick="_deskCardToggle(this)"` expand/collapse, and a `data-full`
     attribute carrying the untruncated text (`editorialHTML`,
     `field.js:32572-32625`)
   - Arbitrage summary card (`arbHTML`, `field.js:32629-32649`)

3. **The problem the CC-CMD sets out to solve is already solved.** Its
   stated "App behavior change" is "scroll position survives poll cycles."
   `renderAmbientPanel()` already does this (`field.js:32655-32668`, the
   "iPad-19" comment): a dirty-check against `panel.dataset.lastAp` skips
   no-op writes, and `scrollTop` is explicitly saved before the innerHTML
   write and restored after. Confirmed via `git log -L 32656,32668` this
   landed in `f2dfda2e` (Phase-2 esbuild migration, 2026-07-18) — the day
   before the original CC-CMD doc (`f45f4d3f`) was authored. There is no
   currently-reproducible scroll-jump bug for a Solid island to fix.

## What a corrected respec needs (not yet decided — needs product sign-off)

If there's still a reason to want a Solid island here (perf, or a genuine
architectural direction independent of the now-solved scroll bug), the
respec must:

- Name the ACTUAL reason (not scroll-position, since that's moot) — e.g.
  "avoid full-subtree re-render cost" or "prep for a future feature."
- Design Solid components for all six real section types above, including
  the two with inline handlers (`ctxHTML`'s scroll-to-filter, `editorialHTML`'s
  expand/collapse) — `onclick="..."` string attributes don't port directly;
  they need real Solid event handlers, and the `_deskCardToggle` truncation
  logic needs a decision on whether it moves into component state or stays
  a DOM-level toggle.
- Treat this as a real scope change, not "8 call sites + one boot mount" —
  per CLAUDE.md Rule 9/13, this is the kind of change that should get
  explicit sign-off on the redesigned shape before implementation, since it
  touches render logic for content used elsewhere (season context filter,
  editorial card shared with `#night-owl`/`#field-brief`).
- Re-run the pre-build probe against current HEAD at execution time (Rule 79)
  — this function is actively maintained (9 real call sites as of this probe,
  `field.js` grep) and line numbers will keep drifting.

## Recommendation

Given the original problem is already fixed, the lowest-risk option is to
**not build this island** unless there's a fresh, distinct justification.
If the user wants to proceed anyway, this doc is the accurate starting
probe for that follow-up CC-CMD.
