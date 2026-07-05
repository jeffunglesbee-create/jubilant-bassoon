# CC Session Outbox — Nav Mode Consolidate (CC-CMD-2026-07-05-nav-mode-consolidate)

**Date:** 2026-07-05
**Scope:** `docs/CC-CMD-2026-07-05-nav-mode-consolidate.md` — consolidate the
listener-attachment pattern shared by all four nav-links, and apply the
confirmed-safe `#upper-slots` exit-path fix (from pickem-mode's `8435247`)
to every mode that actually needs it.

## PROBE BLOCK (re-run before any edit, per the CC-CMD)

```
$ grep -n "desk-jump-link\|jrn-nav-link\|wc-nav-link\|pickem-nav-link" index.html | grep -i "addEventListener"
11064:  document.getElementById('desk-jump-link')?.addEventListener('click', e => {
11069:  document.getElementById('jrn-nav-link')?.addEventListener('click', e => {
11073:  document.getElementById('wc-nav-link')?.addEventListener('click', e => {
11093:    document.getElementById('pickem-nav-link')?.addEventListener('click', e => {

$ grep -n "body.wc-mode #upper-slots\|body.pickem-mode #upper-slots\|body.journalism-mode #upper-slots" index.html
2471:  body.journalism-mode #upper-slots,
2705:body.wc-mode #upper-slots,
2752:body.pickem-mode #upper-slots>*:not(header.masthead):not(nav.controls){display:none !important}
```

Confirmed exactly as the CC-CMD's own snapshot described: four separate
inline listener sites, wc-mode still unconditionally hiding `#upper-slots`,
pickem-mode already fixed.

## TASK 1 — Shared listener helper

Built `attachNavLinkOnce(id, handler)` (index.html, right before
`renderAll()`): marks the element itself (`el._navWired`) rather than a
per-link global, so it scales to any number of nav-links without a new
guard flag each time. Replaced all four inline `addEventListener` call
sites inside `renderAll()`'s "Nav link listeners" block with calls to this
one helper — `desk-jump-link`, `jrn-nav-link`, `wc-nav-link`,
`pickem-nav-link` now share the same code path.

**Live regression test** (not just static check): the verify probe calls
`renderAll(true)` five extra times immediately after boot — simulating
five accumulated poll cycles — then confirms a single click on each
nav-link still toggles its mode exactly once. All three testable modes
passed. This is the exact failure mode the original `pickem-nav-link`-only
guard (`d46f2e7`) fixed for one link; now proven for all four via the
shared helper.

## TASK 2 — Shared CSS exit-path fix

- **wc-mode:** confirmed broken (identical to pickem-mode's pre-`8435247`
  bug — `nav.controls`, which contains every mode's own exit toggle, is
  nested inside `#upper-slots`, and wc-mode's hide-list hid the wrapper
  unconditionally at all widths). Fixed with the same pattern:
  `#upper-slots>*:not(header.masthead):not(nav.controls)`.
- **journalism-mode:** checked, not assumed. Its `#upper-slots` hide-rule
  is scoped inside `@media(max-width:1199px)` — the same range its
  `.jrn-back-pill` becomes visible in. At desktop widths `#upper-slots` is
  never hidden for journalism-mode (by design — "on laptop the schedule
  must NOT disappear," per its own June 17 2026 comment), so
  `nav.controls`/`#jrn-nav-link` is never hidden there either. This is a
  fundamentally different, already-correct pattern, not the same bug.
  Left unchanged; a new smoke assertion (A-NAVCONSOLIDATE-4) guards this
  scoping against future regression.

## TASK 3 — Live verification, all three testable modes

New probe: `nav_mode_consolidate_verify_probe.js` +
`.github/workflows/nav-mode-consolidate-verify-probe.yml`. Final result
(`outbox/nav-mode-consolidate-probe-2026-07-05T2015Z.txt`, CI run
`28753514471`): `RESULT: PASS`.

- pickem-mode: round-trip PASS (no regression from the consolidation).
- wc-mode: round-trip PASS — nav-link rect confirmed **non-zero**
  (83.7×21) while wc-mode is active, proving the exit-path fix works live,
  not just structurally.
- journalism-mode: round-trip PASS at desktop width (nav-link stays
  visible, schedule co-exists per its own design) **and** its mobile
  back-pill exit path also confirmed working at a 500×900 viewport.

One real bug was found and fixed along the way — in the *probe itself*,
not the product: the app's pre-existing first-visit "My Services" setup
modal (`maybeShowSetup()`, index.html ~22447-22450, fires via
`setTimeout(..., 2500)` when `localStorage.field_setup_done` is unset —
true for every fresh CI browser context) opened mid-test on the first
attempt (run `28753434877`) and intercepted the journalism-mode exit
click with a genuine Playwright `TimeoutError`. Root-caused via full job
logs (not assumed): pickem-mode and wc-mode had already passed cleanly in
that same run, and the failure was specifically "`<div role="dialog" ...
id="setup-overlay">` intercepts pointer events," not a visibility/rect
issue. Fixed by setting the flag (and defensively hiding the overlay)
immediately after boot, mirroring a returning user's browser state.

## Regression check on pickem-mode (already fixed, out of this CC-CMD's edit scope)

No changes were made to pickem-mode's own CSS or `togglePickEmView()`.
Confirmed via live probe: round-trip still PASSes after the consolidation
refactor touched the shared listener block it also depends on.

## DONE CONDITIONS

- [x] Probe block re-run, all four listener sites and all modes' hide-rules re-confirmed
- [x] Shared listener helper built, all four call sites migrated
- [x] Shared hide-pattern applied everywhere it's needed (wc-mode fixed; journalism-mode checked and confirmed it doesn't need it)
- [x] Each mode independently verified via a real live probe
- [x] Outbox manifest written (this document)

## Confidence scoring (per the CC-CMD's own table)

- +30 — shared listener helper correctly replaces all four inline sites (smoke A-NAVCONSOLIDATE-1/2 + live 5-cycle regression test on 3 modes)
- +30 — hide-pattern correctly applied to every mode that needs it, verified not assumed (wc-mode fixed + live-confirmed non-zero nav rect; journalism-mode checked via source + live, confirmed already correct)
- +25 — each mode independently verified live (pickem/wc/journalism all round-tripped, journalism's two exit paths both tested)
- +15 — no regression in pickem-mode's already-fixed behavior (live PASS)

**Total: 100/100.**

## Commits

- `7846abd` — TASK 1 + TASK 2 (shared helper, wc-mode CSS fix, smoke A-NAVCONSOLIDATE-1..4)
- `3c2db26` — new live verify probe + workflow
- `348d9f5` — probe fix (neutralize first-visit setup modal race)
- This manifest
