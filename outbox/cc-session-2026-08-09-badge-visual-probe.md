# CC-CMD-2026-08-09-badge-visual-probe — Result

## Status: probe BUILT and it found a real bug. Re-verification of the fix PENDING.

**Confidence in the finding: 97. In the fix being live: unverified.**

## Task 1–2 — the probe

`badge_visual_probe.js` + `.github/workflows/badge-visual-probe.yml`,
derived from `ambient-skeleton-probe.yml` by substitution so this repo
keeps ONE probe pattern. Manifest is booleans and computed values:
`assert_colorIsSmoke`, `assert_noRetiredHue`, `assert_collapsedToOne`,
`assert_isMonospace`, `distinctColors`, `badgeComputedColor`.

## What it found on its first successful run (31293587581)

```
"variant":    "park-badge",
"color":      "rgb(242, 242, 250)",
"fontFamily": "\"DM Mono\", ui-monospace, monospace"
FAILED: assert_colorIsSmoke
```

Monospace applied. **Colour did not.** `rgb(242,242,250)` is `#f2f2fa` —
`--white`, inherited from the parent.

**Root cause:** the markup emits
`class="mlb-park-badge mlb-park-${pf.badgeClass}"` → `mlb-park-hitter`,
while the CSS selected `.mlb-park-badge.park-hitter`. **The selectors
never matched.**

## The part that matters most

**Those four variant rules have been dead since they were written.** The
original `#f59e0b` / `#22c55e` / `#60a5fa` / `#818cf8` were never
rendering.

So the earlier commit — *"raw hex in these rules: 12 → 0"*, which I
reported at **96 confidence** — tokenised CSS that had no effect. The
Rule 37 violation was real in the source and invisible on screen. Every
claim in that commit about the source was true; the implied claim that it
changed what users see was not.

Three things had already passed on that change: `smoke` 965/0, a
zero-new-hex diff check, and my own review. **None of them could see
it.** Only a real render could. That is the entire argument for Rule 90's
artifact requirement, demonstrated on the first run of the first probe
written to satisfy it.

## Fix applied (`6bebf06e`)

Dead variant rules deleted; colour moved to the base `.mlb-park-badge`
rule where it actually applies. Since all four collapse to `--smoke` per
the accepted resolution, no per-variant rule is needed at all — the dead
selectors were redundant as well as broken.

SW_VERSION `2026-08-09a` (ET). smoke **965 passed, 0 failed**.

## NOT DONE — stated plainly

**The probe has not been re-run against the deployed fix.** Until
`assert_colorIsSmoke` is true and `distinctColors` is 1 from a real
render, the colour claim is unverified — which is exactly the state that
produced this CC-CMD. One dispatch of `badge-visual-probe.yml` after
deploy-gate completes closes it.

## Two probe defects of my own, both fixed not worked around

1. **`waitUntil: 'networkidle'`** against a PWA holding an SSE connection
   and polling every 15–30s. That is not a slow wait, it is a wait that
   *cannot resolve*; run 31293519479 hung to timeout. The reference probe
   uses `domcontentloaded` — I wrote my own instead of copying the proven
   one (Rule 62).
2. **Variant regex `/park-[a-z-]+/`** matched `park-badge` from the base
   class rather than the real variant. Cosmetic in the manifest, but it
   would have made `variantsFound` misleading for the next reader.
