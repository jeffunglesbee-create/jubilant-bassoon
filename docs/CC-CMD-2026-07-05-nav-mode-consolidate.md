# CC-CMD: Consolidate nav-link listener attachment + mode exit-path — fix the shared cause, not four copies

**Date:** 2026-07-05
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main
**Scope:** One shared listener-attachment helper + one shared CSS pattern for full-viewport modes. Replaces the need for three more one-off patches.

**Why consolidate instead of patching wc-mode and the other three nav-links
separately, confirmed not hypothetical:**

1. **The `#upper-slots`-hides-`nav.controls` bug is confirmed present in
   wc-mode too** — checked directly: `body.wc-mode #upper-slots,` still
   unconditionally hides the whole wrapper, identical to the bug just
   fixed for pickem-mode in `8435247`. Not "very likely" — confirmed.
2. **All four nav-links attach their click listener via the identical
   copy-pasted pattern**, confirmed at index.html lines 11064
   (`desk-jump-link`), 11069 (`jrn-nav-link`), 11073 (`wc-nav-link`),
   11093 (`pickem-nav-link`) — same structure, same
   `renderAll()`-triggered re-registration risk `d46f2e7` already fixed
   for pickem's specifically.

Both bugs are the same root cause repeated, not independent findings.
This mirrors the exact lesson from this session's earlier identity-
resolver consolidation (`normAFL`/`WC_NAME_FIX`/`FIFA_NAME_ALIASES` —
three copy-pasted implementations of one idea, drifting independently).
Patching wc-mode and the other three nav-links individually would leave
the same copy-paste structure in place, guaranteeing a fifth instance of
this bug the next time a mode or nav-link is added.

**Target time:** ~40 min

## CONFIDENCE GATE
Do not commit unless confidence ≥ 95.

## PROBE BLOCK
```bash
grep -n "desk-jump-link\|jrn-nav-link\|wc-nav-link\|pickem-nav-link" index.html | grep -i "addEventListener"
grep -n "body.wc-mode #upper-slots\|body.pickem-mode #upper-slots\|body.journalism-mode #upper-slots" index.html
```
Re-confirm all four listener sites and every mode's current hide-rule
before consolidating — this doc's snapshot is 2026-07-05.

## TASK 1 — One shared, de-duped listener-attachment helper

Extract a single `attachNavLinkOnce(id, handler)` (or similar) that
attaches a click listener exactly once per element, guarding against
`renderAll()`'s repeated calls the same way `d46f2e7` already fixed for
`pickem-nav-link` specifically — but implemented as one shared function,
not copied inline for each of the four. Replace all four existing
inline `addEventListener` call sites with calls to this one helper.

## TASK 2 — One shared CSS pattern for full-viewport mode exit paths

Apply the same fix `8435247` made for pickem-mode's hide-list — hiding
`#upper-slots`' children individually via
`#upper-slots>*:not(header.masthead):not(nav.controls)` — to wc-mode's
identical rule. If journalism-mode has the same `#upper-slots` hide
pattern, check and fix it too rather than assuming it's fine because it
wasn't named in the original bug report.

## TASK 3 — Verify all three/four modes independently

For each full-viewport mode (pickem, wc, journalism if applicable):
enter the mode, confirm the exit nav-link is genuinely clickable at
desktop width (reuse the same live-probe pattern that caught the
original pickem bug), confirm no regression in what that mode
correctly hides.

## SCOPE BOUNDARY

DO:
- Build one shared listener helper, replace all four inline call sites
- Apply the confirmed-correct hide-pattern to every mode that needs it, not just wc-mode
- Verify each mode independently with a real live probe

DO NOT:
- Leave any of the four nav-links on the old inline-listener pattern
- Assume journalism-mode is fine without checking its actual CSS
- Change pickem-mode's already-fixed, already-verified behavior

## DONE CONDITIONS
- [ ] Probe block re-run, all four listener sites and all modes' hide-rules re-confirmed
- [ ] Shared listener helper built, all four call sites migrated
- [ ] Shared hide-pattern applied everywhere it's needed, not just wc-mode
- [ ] Each mode independently verified via a real live probe
- [ ] Outbox manifest written

## CONFIDENCE SCORING TABLE
+30  Shared listener helper correctly replaces all four inline sites
+30  Hide-pattern correctly applied to every mode that needs it, verified not assumed
+25  Each mode independently verified live
+15  No regression in pickem-mode's already-fixed behavior

## ONE-LINER
git pull. Read docs/CC-CMD-2026-07-05-nav-mode-consolidate.md. Two
confirmed bugs (not hypothetical) share one root cause each, repeated
across four nav-links and multiple modes: (1) build one shared, de-duped
listener-attachment helper and migrate desk-jump-link/jrn-nav-link/
wc-nav-link/pickem-nav-link onto it, replacing four inline copies. (2)
Apply the confirmed-working #upper-slots hide-pattern from pickem-mode's
fix (8435247) to wc-mode (confirmed still broken) and journalism-mode if
it has the same issue (check, don't assume). Verify every mode
independently via a real live probe. Do not commit unless confidence ≥
95. If score < 95 report verbatim and stop.
