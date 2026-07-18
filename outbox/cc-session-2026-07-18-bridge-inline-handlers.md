# CC Session Doc — Bridge Inline-Handler Implicit Globals
**Date:** 2026-07-18
**Repo:** jubilant-bassoon
**Branch:** main
**CC-CMD:** docs/CC-CMD-2026-07-18-bridge-inline-handlers.md

---

## Summary

Added explicit `window.X=` bridges for 13 inline HTML event-handler functions in `src/legacy/field.js`. These functions were pure implicit globals (top-level `function name(){}` in classic script) — reachable from inline `onclick`/`onchange`/etc. attributes, but not explicitly assigned to `window`. This is a prerequisite for Scenario B (true ES module conversion), where module-scoped functions do not auto-promote to `window`. Purely additive — no existing behavior changed.

**Commit:** `5b603c0` — `feat: add explicit window bridges for 13 inline-handler implicit globals`

---

## Task 1 — Fresh re-derivation

Re-ran ripgrep extraction against index.html:
```
rg -o '(onclick|onchange|oninput|onsubmit|onkeydown|ondblclick)="([a-zA-Z_$][\w$]*)\(' index.html -r '$2' | sort -u
```
Output confirmed 13 names (after excluding `if` false positive from `onkeydown="if(event.key===...)"`):
`_deskCardToggle`, `closeBottomSheet`, `fetchMCPStatus`, `goToDate`, `openJournalismForGame`, `pinGame`, `scrollToGame`, `setViewerIntelMode`, `switchWCTab`, `toggleJournalismView`, `togglePickEmView`, `toggleWCView`, `unpinGame`

Zero overlap with existing 54 `window.X=` assignments confirmed.

## Task 2 — Function definition confirmation

All 13 verified as genuine `function name(...)` definitions in `field.js`:
- `_deskCardToggle` — line ~870
- `closeBottomSheet` — line ~882
- `fetchMCPStatus` — line ~891 (`async function`)
- `goToDate` — line ~4590
- `openJournalismForGame` — line confirmed
- `pinGame`, `scrollToGame`, `setViewerIntelMode`, `switchWCTab` — all confirmed
- `toggleJournalismView`, `togglePickEmView`, `toggleWCView` — all confirmed
- `unpinGame` — confirmed

## Task 3 — Bridges added

Inserted after `window.addEventListener('beforeunload', saveSnapshot)` (line ~39578):

```js
// ── Explicit window bridges for inline HTML event handlers ──
// These functions are called by onclick/onchange/etc. attributes in index.html.
// Under the current IIFE + classic-script setup they resolve automatically via
// implicit globals. These assignments make them explicit window properties —
// prerequisite for Scenario B (true ES module conversion) where implicit globals
// would no longer exist. Additive only: existing behavior is unchanged.
window._deskCardToggle       = _deskCardToggle;
window.closeBottomSheet      = closeBottomSheet;
window.fetchMCPStatus        = fetchMCPStatus;
window.goToDate              = goToDate;
window.openJournalismForGame = openJournalismForGame;
window.pinGame               = pinGame;
window.scrollToGame          = scrollToGame;
window.setViewerIntelMode    = setViewerIntelMode;
window.switchWCTab           = switchWCTab;
window.toggleJournalismView  = toggleJournalismView;
window.togglePickEmView      = togglePickEmView;
window.toggleWCView          = toggleWCView;
window.unpinGame             = unpinGame;
```

Mandatory verification:
```
grep -c "window\.\(_deskCardToggle\|closeBottomSheet\|...\)\s*=" src/legacy/field.js
→ 13
```

## Task 4 — Non-breaking confirmation

Purely additive. Inline `onclick="functionName()"` calls resolve exactly as before via classic-script/IIFE implicit global scope. The new `window.X=` lines add a second, explicit reference — no conflict, no override. Smoke 958/0 before and after. Pre-commit hook (sync-source + smoke + units + lint) passed.

## Task 5 — CI verification

| Check | Result |
|-------|--------|
| Source smoke before | 958/0 ✓ |
| Pre-commit hook | ✓ |
| Source smoke after | 958/0 ✓ |
| Deploy gate (fast smoke) | success ✓ (5b603c0, 2026-07-18T17:05:39Z) |
| Desktop Chrome Viewport Audit | success ✓ (5b603c0, 2026-07-18T17:06:15Z) |
| Client Live Invariant | success ✓ (6078a6d, 2026-07-18T17:07:25Z) |

---

## Confidence: 100/100

- T1 (20/20): fresh re-derivation, false-positive excluded, 13 confirmed
- T2 (15/15): all 13 function definitions verified in field.js
- T3 (30/30): 13 bridges added, grep -c = 13 confirmed
- T4 (15/15): additive-only, smoke 958/0, pre-commit hook passed
- T5 (20/20): all CI workflows green, confirmed via real job logs

---

## No Carry-forwards

Scenario B (true ES module conversion, removing the IIFE) remains explicitly unauthorized and separate. Nothing staged for it here.
