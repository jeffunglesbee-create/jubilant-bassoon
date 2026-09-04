# CC session — one chart renderer for every FIELD series

**Date:** 2026-09-04
**Repo:** jubilant-bassoon
**Branch:** main (confirmed via `git branch --show-current`)

## Why

Seven series rendered seven ways. EPA per play as a single text chip — 149
plays fetched, one shown. Win probability as a number. Score events as a Pulse
Chip. Standing velocity as a text tag. Series margins as a bespoke 56×20 SVG.
Drama history as a bespoke 200×32 SVG. Odds probabilities as text. Two
hand-rolled SVG builders sharing no code and no conventions.

The ask was "a full graph available for everything so lots more things can be
read at once and fewer mistakes are made." That is a shared instrument, which
hand-rolled SVG cannot be — every one drifts.

## HEAD progression

| commit | what |
|---|---|
| `37b3f064` | uPlot vendored + `src/utils/chart.js` + the EPA drive chart |
| `3461bbb8` | win probability on the same renderer + `sweepDetachedCharts` |
| `ca59d2b0` | fix: unreferenced-css counted uPlot's classes as FIELD's dead ones |
| `e698fdd0` | the chart renderer probe |
| `6876920c` | fix: the probe read uPlot's scale before the draw resolved it |
| `f1734160` | the three probes run daily; one manifest per probe, not per run |

## Numbers

| | before | after |
|---|---|---|
| smoke | 988 / 0 | **1001 / 0** |
| units | 67 / 0 | **69 / 0** |
| SW_VERSION | 2026-09-04a | 2026-09-04f |
| uPlot cost | — | 134 KB raw, 50.8 KB min, **22.5 KB gzipped** vs a 2,583 KB index.html |

## What ships

- **`src/utils/chart.js`** — `fieldChart(el, data, opts)`, `destroyChart(el)`,
  `sweepDetachedCharts()`. Colours and fonts read from the page's own CSS
  tokens. A second call on the same element takes `setData`.
- **CSS** inlined between vendored markers with FIELD overrides below, plus
  `sync-uplot-css.mjs` to regenerate and `uplot-css-check.mjs` to catch drift.
- **Two consumers.** The NFL EPA drive (`state.plays` already held the whole
  drive) and home win probability (the `wp_update` ring buffer was captured for
  Pulse Chip's velocity signal and drawn nowhere).

## Verification (Rule 90)

`outbox/chart-renderer-manifest-latest.json`, from a real browser against the
deployed bundle. Run 33923935346, conclusion success:

```json
"mounted": true, "canvasCount": 1, "hasAriaLabel": true,
"ariaLabel": "6 points. probe series: 0.5 to 0.6",
"sameCanvasAfterUpdate": true, "instanceReused": true,
"rangeHonoured": true, "yMin": 0, "yMax": 1, "scaleResolved": true,
"sweptOnDetach": true, "consoleErrors": []
```

What that proves, and what it does not: it does **not** claim the EPA or WP
charts appeared on a card. Those call sites need a live NFL game through the
relay and an SSE `wp_update`, and a GitHub runner reaches neither —
site.api.espn.com is CORS-blocked from the page, measured across four runs. It
proves the renderer's contract against the shipped bundle, which is the part
that would silently rot.

## Three decisions worth keeping

**Fixed domains, never the series maximum.** `[-3, 7]` for EPA, `[0, 1]` for
WP. Auto-scaling draws every drive and every game as the same shape — the
failure field-laboratory's `spark-check.mjs` was written to catch.

**ADR-002: the renderer knows nothing about drama.** Win probability and EPA
are commodity under Rule F. The drama series keeps its amnesty gate at the call
site. A general instrument must not become a bypass for a specific rule.

**Separate mounts.** FIELD rebuilds cards and panels with innerHTML. A canvas
inside one is destroyed every poll — Rule 89 in a new place. Both charts mount
beside the rebuilt markup and are only ever handed new data.

## Rule 63, enforced by the bundler

With the module imported but uncalled, esbuild tree-shook `fieldChart` out
entirely — `fieldChart in bundle: false`. It does not ship until something uses
it. That was invisible until the bundle was grepped.

## Defects found in my own work, recorded because the pattern is the point

Nine failures across this session's probes. **Eight were the instrument, one
was the product.**

| what | why it passed / failed wrongly |
|---|---|
| `window._fieldDataCache` | module-level `let`; undefined by construction |
| navigate-then-assert | context destroyed; +2/+3 reported as failures without ever being asked |
| `ReferenceError: days` | my own fix deleted the declaration; `node --check` passes syntax |
| A75m regex | matched `// _mounted.add(el);` — commenting the call out still passed |
| A75g regex | pinned the exact export list; failed on a legitimate addition |
| `rangeHonoured` | read `scales.y.min` before the draw resolved it; `null === 0` is false |
| the css-drift guard | read comment-stripped output for a comment marker |
| pre-commit `BLOCK` | in the report list, not the blocking condition — never blocked |

Only mutation runs and three-state reporting distinguish these from working
checks. `rangeHonoured` now ships alongside `yMin`/`yMax` for exactly that
reason: unresolved, wrong and right are three states, and a boolean collapses
the first two into the second.

## Also fixed in passing

- **chrome inventory** failed on both chart commits: 18 of 0. uPlot's classes
  are emitted by bundled library code, not FIELD source, so the check's premise
  does not hold for them. Excluded by namespace — not by raising the budget —
  with a guard asserting FIELD owns nothing in that namespace (1092 classes,
  zero matches).
- **The pre-commit hook** reported `BLOCK` and `UPCSS` without blocking on
  them. Both are in the condition now, proved by mutation.

## Standing item, unchanged

The `home|away` match rate between ESPN `team.displayName` and statsapi names
is still UNVERIFIED — a runner cannot reach ESPN, so no fixture renders and
nothing enriches. The enrichment degrades to a no-op and records its count.
**Unblocks when:** open `?pl-verify`, step forward a day, read
`window._plVerify.enrichCount()`.

## Automation added

The three probes now run daily — 11:00, 11:20, 11:40 UTC — instead of on
demand. Each overwrites a single `-latest.json` rather than leaving a file per
run.

## Carry-forwards

None. The remaining uPlot question (field-laboratory, tasks #21/#22) has its
own CC-CMD: `docs/CC-CMD-2026-09-04-laboratory-chart-decision.md`.
