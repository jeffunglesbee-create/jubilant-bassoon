# CC Session Outbox — Pick 'em Reconcile (CC-CMD-2026-07-05-pick-em-reconcile)

**Date:** 2026-07-05
**Scope:** Reconcile the card-based Pick 'em first slice (`702fb7b`) with the
superseding top-level-surface design, per
`docs/CC-CMD-2026-07-05-pick-em-reconcile.md`. Timing-race context: `702fb7b`
committed 18:52:07 UTC, before the surface-design conversation even started —
"a genuine 63-second timing race... not an error by either side," per the
CC-CMD doc itself.

## Commits (chronological)

1. `30c11d1` — Build `togglePickEmView()` / `pickem-mode` / `#pickem-nav-link`
   / `#pickem-section` / `renderPickEmSection()`, matching
   `toggleWCView()`/`toggleJournalismView()`'s pattern. Relocate
   `buildPickWidgetHTML()`'s render target from game cards to the new
   section. CSS hide-list chosen to mirror wc-mode's unconditional
   full-viewport-swap-at-all-widths pattern.
2. `3d1c667` — Fix #1 found via live verification: `g._id` was never assigned
   for games outside `renderAll()`'s own filtered per-card loop, so
   `renderPickEmSection()` could see games with no `._id`, silently producing
   zero widgets. Also fixed the verify probe's own incorrect assumption about
   `#pickem-back-pill` (mobile-only by design, not a bug).
3. `201da32` — Belated SW_VERSION bump for the above (self-caught omission).
4. `d46f2e7` — Fix #2 found via live verification: `renderAll()` re-registers
   the pickem-nav-link click listener every ~15-30s poll cycle using a fresh
   inline arrow function each time; the browser can't dedupe distinct
   function references, so listeners silently accumulated, and an even
   accumulated count net-cancelled a single click's toggle. Guarded with a
   one-time `window._pickemNavWired` flag, scoped to only the new listener.
5. `8435247` — Fix #3 found via live verification: `nav.controls` (containing
   all four nav-links, including the pickem-mode exit toggle itself) is
   nested inside `#upper-slots` (the PM-26-M-1 CLS-reservation wrapper,
   index.html ~4491-4581). pickem-mode's hide-list — copied verbatim from
   wc-mode's pattern — hid `#upper-slots` wholesale, which collaterally hid
   `nav.controls` too (a `display:none` ancestor cannot have a visible
   descendant, regardless of the descendant's own CSS). At desktop widths
   (mobile back-pill gated to `max-width:1199px`), this left **no way to
   exit pickem-mode** after a pick was made. Fixed by replacing the single
   `#upper-slots` hide rule with
   `#upper-slots>*:not(header.masthead):not(nav.controls)`, which hides
   every other slot-region child (loading banners, mv-panel, field-brief,
   night-owl, etc.) while leaving the masthead and nav bar in the render
   tree at every viewport width.

SW_VERSION progressed `2026-07-05c` → `d` → `e` → `f` across this session
(index.html and sw.js kept in sync at every step).

## TASK-by-TASK result

- **TASK 1 (new mode matches existing pattern):** Done. `togglePickEmView()`
  follows `toggleWCView()`/`toggleJournalismView()`'s exact shape (toggle
  body class → mutual-exclusion-dismiss the other two modes → nav-link
  active class → lazy-render). Confirmed via smoke A-PICKEMSURF-1/A-PICKEMSURF-3
  and live verification.
- **TASK 2 (widget relocated, logic untouched):** Done.
  `buildPickWidgetHTML()`/`makePick()`/`_resolvePickIfExists()` internal
  bodies are byte-identical to `702fb7b` — only the render *call site*
  moved. Confirmed via smoke A-PICKEMSURF-4.
- **TASK 3 (card genuinely decluttered):** Done. Confirmed via direct
  byte-for-byte diff of the current card template against
  `702fb7b~1:index.html`'s card template (proves true reversion, not a
  fuzzy class-name-absence check), corroborated by a live CI check
  (`.game-card .pick-widget` count === 0).
- **TASK 4 (new surface genuinely works end-to-end):** Done, after fixing
  the three bugs above. Final live run
  (`outbox/pickem-surface-probe-2026-07-05T1959Z.txt`, CI run `28753084033`):
  card decluttered (0 widgets), mode toggles on/off reliably, a real pick
  fired a genuine `pick_made` POST
  (`{"type":"pick_made","gameId":"g17","sport":"Baseball (MLB)","predictedWinner":"Toronto Blue Jays"}`),
  and re-clicking the nav-link now correctly restores the main feed.
  `RESULT: PASS`.

## Flagged for follow-up (out of this CC-CMD's scope, Rule 69/TOUCH-ONLY-A)

1. **Nav-link listener accumulation** affects `desk-jump-link` / `jrn-nav-link`
   / `wc-nav-link` identically to the bug fixed in `d46f2e7` for
   `pickem-nav-link` — all four listeners live inside the same `renderAll()`
   block and re-register every poll cycle. Not fixed for the other three
   (out of scope); worth its own CC-CMD.
2. **wc-mode likely shares the `#upper-slots`-hides-`nav.controls` bug** fixed
   in `8435247` for pickem-mode. wc-mode's own hide-list (index.html ~2705)
   unconditionally hides `#upper-slots` at all widths, identical to
   pickem-mode's pre-fix pattern — meaning `#wc-nav-link` is very likely also
   invisible (0×0 box) once `wc-mode` is active at desktop widths, with no
   working exit path other than a full page reload. **Not verified live this
   session** (World Cup nav-link is hidden out-of-season, so it couldn't be
   exercised) and **not fixed** (wc-mode's CSS is out of this CC-CMD's
   scope) — flagged here as a real, independently-derived architectural
   finding worth its own CC-CMD to verify and fix.

## Confidence scoring (per the CC-CMD's own table)

- +25 — new mode matches pattern exactly
- +25 — widget relocated correctly, internal logic untouched
- +25 — card decluttered via real count (byte-for-byte diff, strongest check)
- +25 — new surface verified working end-to-end (live CI run, `RESULT: PASS`)

**Total: 100/100.**
