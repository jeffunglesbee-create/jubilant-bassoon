# CC-CMD-2026-08-09-badge-visual-probe — Result

## Status: DONE. Bug found, fixed, and the fix VERIFIED on a real render. **Confidence: 97.**

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

## Re-verified after deploy — the done condition, met

Deploy `6bebf06e` completed success; probe re-run **31293745342**
completed success. Manifest
`outbox/badge-visual-probe-manifest-2026-08-09T04-04-06-265Z.json`,
screenshot committed alongside:

```
badgePresent:              True
badgeCount:                4
badgeComputedColor:        rgb(106, 106, 138)      <- --smoke #6a6a8a
distinctColors:            1
badgeFontFamily:           "DM Mono", ui-monospace, monospace
assert_colorIsSmoke:       True
assert_noRetiredHue:       True
assert_collapsedToOne:     True
assert_isMonospace:        True
retiredHuesStillRendering: []
```

`badgeComputedColor` is the *computed* value from a live browser, not the
CSS source — `rgb(106,106,138)` is exactly `#6a6a8a`. `distinctColors: 1`
across 4 rendered badges proves the collapse landed. `retiredHuesStillRendering`
is empty against the named known-bad set.

**Before → after on the same measurement:**
`rgb(242,242,250)` (--white, inherited, colour rule dead) →
`rgb(106,106,138)` (--smoke, applied).

## One honest note on the manifest

`variantsFound: ['park-badge']` is my regex still matching the base class
rather than the real variant — the cosmetic defect noted below. It does
not affect any assertion (all four assertions read colour and font, not
variant names), but the field is misleading and should be corrected
before anyone relies on it.

## Two probe defects of my own, both fixed not worked around

1. **`waitUntil: 'networkidle'`** against a PWA holding an SSE connection
   and polling every 15–30s. That is not a slow wait, it is a wait that
   *cannot resolve*; run 31293519479 hung to timeout. The reference probe
   uses `domcontentloaded` — I wrote my own instead of copying the proven
   one (Rule 62).
2. **Variant regex `/park-[a-z-]+/`** matched `park-badge` from the base
   class rather than the real variant. Cosmetic in the manifest, but it
   would have made `variantsFound` misleading for the next reader.
