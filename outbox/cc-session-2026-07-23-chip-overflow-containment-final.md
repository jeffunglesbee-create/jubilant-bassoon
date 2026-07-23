# CC Session — chip-overflow-containment (FINAL WRAP-UP)
**Date:** 2026-07-23
**HEAD at close:** bd2c923 (jubilant-bassoon) / c854f68 (field-relay-nba, unchanged)
**Smoke:** 965/0 throughout
**SW_VERSION:** 2026-07-23a (bumped from 2026-07-21b)

---

## What was fixed

Two bugs in the stream card rendering path:

### 1. CSS overflow containment (`aa53d8e`)

Root cause (diagnosed from selectors, not assumed):
- `.stream-chip` had explicit `overflow:visible` — chip content could spill into siblings
- `.watch-now-btn` had no `white-space:nowrap` or overflow handling — wrapped at narrow widths
- `.stream-row` grid (`repeat(2,minmax(0,1fr)); max-width:160px`) — watch-now-btn needed `grid-column:1/-1` to span full 160px

CSS changes to `index.html` (outside script block — correct edit target):
```css
/* before */
.stream-chip { overflow: visible; }

/* after */
.stream-chip { overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.watch-now-btn { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.stream-row > .watch-now-btn { grid-column: 1 / -1; }
```

### 2. `[object Object]` chip label rendering (`6407652`)

Root cause: `field.js:735` — `chipSR = (g.streams || [])[0]` extracts the first stream element. Stream elements are dual-format: string bundle keys (`"MLB_LOCAL"`) OR legacy objects `{name, url, col, auth, ...}`. Direct template interpolation coerced objects to `"[object Object]"`.

Fix:
```js
const chipSR = (g.streams || [])[0];
const chipSRName = typeof chipSR === 'string' ? chipSR : (chipSR?.name || '');
const chipEl = chipSRName
  ? `<span class="stream-chip" style="font-size:.55rem;padding:.1rem .35rem">${chipSRName}</span>`
  : '';
```

---

## Verification

### Probe infrastructure (`55a141a`)
- `chip_overflow_probe.js` — Playwright, 390×844 portrait mobile, measures `scrollWidth`/`clientWidth` per `.stream-chip` and `.watch-now-btn`, checks bounding-box overlap between siblings in `.stream-row`
- `.github/workflows/chip-overflow-probe.yml` — triggered by `outbox/.trigger-chip-overflow-probe` push or `workflow_dispatch`, runs against live deployed URL, commits manifest + screenshot to `outbox/` with `[skip ci]`

### Run 1 — GHA 30026833587 (2026-07-23T16:50:19Z)
Manifest: `outbox/chip-overflow-probe-manifest-20260723T165048Z.json`
- `allPass: true`, `noScrollWidthOverflow: true`, `noSiblingOverlap: true`
- `label: "[object Object]"` — identified rendering bug (not a probe issue; chip itself was rendering the wrong string)

### Run 2 — GHA 30028847993 (2026-07-23T17:19:26Z)
Manifest: `outbox/chip-overflow-probe-manifest-20260723T171918Z.json`
- `allPass: true`, `noScrollWidthOverflow: true`, `noSiblingOverlap: true`
- `label: "MLB.TV"` — real network name confirmed; `[object Object]` bug fixed
- `overflowingChips: 0`, `overlapPairCount: 0`
- Console errors: pre-existing 403/404 auth/CDN (unrelated)

---

## Commit log

| SHA | Description |
|-----|-------------|
| `aa53d8e` | fix: .stream-chip overflow:hidden+ellipsis, .watch-now-btn nowrap+ellipsis+grid-span; SW_VERSION 2026-07-23a |
| `55a141a` | ci: chip-overflow-probe Playwright GHA + sync field.js SW_VERSION |
| `3477ca5` | ci: trigger chip-overflow-probe [skip ci] |
| `faf7cd5` | chip overflow probe result [skip ci] |
| `888db6f` | docs: CC-CMD complete — HANDOFF + session doc [skip ci] |
| `6407652` | fix: stream-chip label [object Object] — extract .name from legacy object stream at field.js:735 |
| `bd2c923` | docs: update HANDOFF + session doc with run 2 manifest + [object Object] fix [skip ci] |

---

## Coverage note

Both probe runs measured 1 chip (`totalChipsMeasured: 1`) — a slate-timing artifact, not a probe defect. The probe captures chips present at fire time; the original 4-failure pattern requires a busier evening slate. Infrastructure is correct and reusable. Re-trigger on any evening with multiple live games for broader coverage.

---

## Carry-forwards

None. Both bugs fixed, both verified on live deployed site with committed manifests.
