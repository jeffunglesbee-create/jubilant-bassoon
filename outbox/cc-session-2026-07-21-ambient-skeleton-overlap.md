# CC Session — Ambient Panel Skeleton Overlap Fix (ambient-panel-skeleton-overlap)
**Date:** 2026-07-21
**Repo:** jubilant-bassoon
**Session type:** CC-CMD implementation
**CC-CMD:** `docs/CC-CMD-2026-07-21-ambient-skeleton-overlap.md`

## HEAD Progression
- Start: `f227946` (CC-CMD fully-confirmed diagnosis doc — `[skip ci]`)
- Implementation: `0ac1075` fix: remove ambient-panel skeleton on Solid mount (ambient-panel-skeleton-overlap)

## Pre-Build Probe
`sed -n '32717,32730p' src/legacy/field.js` confirmed HEAD matches the diagnosed block exactly:
```js
if (!panel._solidMounted) {
  mountAmbientIsland(panel, _apScrollToFilter);
  panel._solidMounted = true;
}
```
Zero drift since diagnosis. Proceeded directly to TASK 1.

## What Was Built

### src/legacy/field.js (→ synced to index.html)
- Line 32729: Added `panel.querySelector('.ambient-skeleton')?.remove();` immediately after `panel._solidMounted = true` inside the `if (!panel._solidMounted)` block.
- Final block:
  ```js
  if (!panel._solidMounted) {
    mountAmbientIsland(panel, _apScrollToFilter);
    panel._solidMounted = true;
    panel.querySelector('.ambient-skeleton')?.remove();
  }
  ```
- SW_VERSION bumped `2026-07-21a` → `2026-07-21b`

### sw.js
- SW_VERSION bumped `2026-07-21a` → `2026-07-21b` (kept in sync)

### smoke.js
- **A602 updated**: regex now allows the `.remove()` call between `_solidMounted = true` and closing `}`. Old assertion would have false-failed without this update.
- **A602b added**: new assertion verifies `panel._solidMounted = true` is immediately followed by `panel.querySelector('.ambient-skeleton')?.remove()`. Structural proof the cleanup fires at the exact mount moment.
- Smoke count: 964 → 965

### CLAUDE.md
- **Rule 89 added** (RENDER-CHROME-A — "Surgical-render chrome cleanup"): Any ambient-panel chrome element (skeleton, loading state, spinner, or any future placeholder in `#ambient-panel`'s static HTML) MUST be explicitly removed in JS once real section content has mounted. Includes real causal explanation (wholesale-innerHTML cleared skeletons for free; surgical `reconcile()` rewrites need explicit cleanup), fix pattern, and `remove()` vs `display:none` rationale. Generalized to cover any future fine-grained-rendering conversion.

## Scroll Regression Check
`renderAmbientPanel()` still terminates via `updateAmbientData({otw,scores,soon,upcoming,ctx:ctxData,editorial,arb})` which flows data through `reconcile()`. The `.ambient-scroll-inner` node is never torn down — scroll position is preserved. Lines 32928-32930 confirm no scrollTop save/restore pattern was reintroduced. No scroll regression.

## Smoke Results
- Pre-commit: `965 passed, 0 failed`
- A602 ✅ (updated regex passes)
- A602b ✅ (new assertion passes)

## TASK 4 — Live Browser Verification Status

**VERIFIED — GitHub Actions probe run 3 (ID 29876685790), 2026-07-21T23:18:49Z.**

Live headless Chromium probe against `https://jubilant-bassoon.jeffunglesbee.workers.dev?wpt`.
wf-mode injected via `addInitScript` for desktop viewport. Waited up to 20s for `panel._solidMounted === true`.

### Results

| Viewport | solidMounted | skeletonPresent | skeletonCount | panelChildCount | Screenshot |
|---|---|---|---|---|---|
| wf_desktop_1440 (1440px) | true | **false** | 0 | 1 | `outbox/ambient-skeleton-probe-wf_desktop_1440-2026-07-21T23-18-46.png` |
| ipad_820 (820px) | true | **false** | 0 | 1 | `outbox/ambient-skeleton-probe-ipad_820-2026-07-21T23-18-48.png` |

Probe output: `✅ 2/2 viewports confirmed solid-mounted, 0 skeleton failures`

Screenshots and JSON manifest committed to `outbox/` at commit `0e36412` (`ambient skeleton probe result [skip ci]`).

## Confidence Score
- Probe (+35): pre-build probe confirmed field.js block matches diagnosis exactly; one-line fix applied at confirmed location
- CLAUDE.md rule (+15): Rule 89 added with real causal explanation (root cause from CC-CMD point 3 included)
- Smoke assertion (+15): A602b added and passing; A602 updated to not false-fail
- Live DOM verification (+25): VERIFIED — GitHub Actions probe 2/2 viewports, solidMounted=true, skeletonPresent=false, screenshots committed
- Commit/outbox (+10): clean commit, scroll regression confirmed, honest manifest

**Total: 100/100**

## Codex Incident
`ambient-panel-skeleton-overlap` — client side RESOLVED at commit `0ac1075`.

## What Was NOT Touched
- `ambient-island.jsx` — not modified
- `_solidMounted` idempotency pattern — preserved
- 6 call sites (7830, 7879, 7884, 20463, 26920, 32406) — none modified
- AMBIENT-SCROLL-SPEC.md — not modified
- Any section content logic — not modified
