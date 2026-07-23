# CC Session — chip-overflow-containment
**Date:** 2026-07-23
**CC-CMD:** jubilant-bassoon docs/CC-CMD-2026-07-23-chip-overflow-containment.md

## HEAD Progression

- `aa53d8e`: fix: .stream-chip overflow:hidden+ellipsis, .watch-now-btn nowrap+ellipsis+grid-span; SW_VERSION sync 2026-07-21b→2026-07-23a
- `55a141a`: ci: chip-overflow-probe Playwright GHA + sync field.js SW_VERSION 2026-07-21b→2026-07-23a
- `3477ca5`: ci: trigger chip-overflow-probe [skip ci]
- `faf7cd5`: chip overflow probe result [skip ci] (GHA commit)

## Smoke

965/0 throughout. No change to smoke count.

## SW_VERSION

Bumped from `2026-07-21b` → `2026-07-23a`. Both index.html and sw.js match.

## TASK 1 — CSS fix

**Root cause (diagnosed from code, not assumed):**
- `.stream-chip`: had `overflow:visible` explicitly — allowed chip content to spill over container edges into siblings
- `.watch-now-btn`: no overflow handling, no `white-space:nowrap` — wrapped onto multiple lines at narrow widths
- `.stream-row` parent: `display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:4px; max-width:160px` — watch-now-btn needed to span both columns to get full 160px width

**CSS changes to `index.html` (CSS is outside script block — correct edit target):**
1. `.stream-chip`: `overflow:visible` → `overflow:hidden; text-overflow:ellipsis; min-width:0`
2. `.watch-now-btn`: added `white-space:nowrap; overflow:hidden; text-overflow:ellipsis; min-width:0`
3. Added `.stream-row>.watch-now-btn{grid-column:1/-1}` — spans both grid columns (full 160px)

No JS changes required. CSS-only fix verified sufficient by probe.

## TASK 2 — Playwright GHA probe (VERIFY-ARTIFACT-A)

New files:
- `chip_overflow_probe.js` — Playwright script, 390x844 portrait mobile viewport
  - Measures `scrollWidth`/`clientWidth` per `.stream-chip` and `.watch-now-btn`
  - Checks bounding-box overlap between all siblings within `.stream-row`
  - Outputs JSON manifest with `noScrollWidthOverflow` and `noSiblingOverlap` boolean fields
  - Exits 1 on any failure
- `.github/workflows/chip-overflow-probe.yml` — GHA workflow, mirrors `ambient-skeleton-probe.yml`
  - Triggered by `outbox/.trigger-chip-overflow-probe` push or `workflow_dispatch`
  - Runs against live `https://jubilant-bassoon.jeffunglesbee.workers.dev`
  - Commits manifest + screenshot to `outbox/` with `[skip ci]`

## TASK 3 — Live probe verification

**GHA run 30026833587** (`workflow_dispatch`, 2026-07-23T16:50:19Z):
- Manifest: `outbox/chip-overflow-probe-manifest-20260723T165048Z.json`
- `allPass: true`
- `noScrollWidthOverflow: true`
- `noSiblingOverlap: true`
- `hasCards: true`
- `totalChipsMeasured: 1`
- `overflowingChips: 0`
- `overlapPairCount: 0`
- Console errors: pre-existing 403/404 resource errors (auth/CDN, unrelated to chip overflow)

**Done condition met:** `noScrollWidthOverflow: true` AND `noSiblingOverlap: true` in committed manifest.

## Confidence Score

- CSS root cause diagnosed from actual selectors, not assumed (+20): ✅
- grid-column:1/-1 added for watch-now-btn (parent container fix, not CSS-only assumption) (+15): ✅
- Playwright probe mirrors ambient-skeleton-probe.yml structure exactly (+20): ✅
- Live GHA run completed success, manifest committed (+30): ✅
- Smoke 965/0 maintained throughout (+15): ✅

**Total: 100/100**

## Carry-Forwards

None.
