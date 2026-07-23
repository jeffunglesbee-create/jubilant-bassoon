# CC-CMD: Chips must never visually escape their container

**Date:** 2026-07-23
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR
**Scope:** `.watch-now-btn` and `.stream-chip` CSS (`index.html`), plus
whatever parent container wraps them — probe determines exact scope.
**Governed by:** Rule VERIFY-ARTIFACT-A (added earlier today,
`CC-CMD-2026-07-23-verify-artifact-rule.md`) — this CC-CMD's own
verification step must produce a committed artifact, not a "looks right"
claim. Same CI-as-proxy Playwright pattern as `ambient-skeleton-probe.yml`.

**Why — real, confirmed bug from a real screenshot, not a hypothetical.**
IMG_9631 (portrait mobile, 2026-07-23) shows two distinct real failures,
both traced to real source:
1. `.watch-now-btn` (index.html ~2043): no `white-space`/overflow
   handling — browser default lets long labels wrap word-by-word into an
   ugly 3-line stack ("Watch / on YouTube / TV") inside a button clearly
   sized for one line. Visible on both AFL cards.
2. `.stream-chip` (index.html ~2036): has `white-space:nowrap` but no
   `max-width`+`overflow:hidden`+`text-overflow:ellipsis` — instead of
   wrapping, content visually spills past the chip's own box and
   overlaps whatever sits next to it. Visible as "Fox Soccer Pl..." cut
   off mid-word, and a calendar-icon badge sitting on top of "DirecTV
   $64.99/mo".

Codex decision `chip-overflow-containment` has the full diagnosis.

**Target time:** ~30 min (CSS fix is small; the Playwright verification
setup, if this repo doesn't already have a reusable probe pattern beyond
`ambient-skeleton-probe.yml`, is the larger part)

---

## Do NOT Touch

- Chip CONTENT/logic (which services show, ownership suppression,
  deeplink behavior) — this is a pure containment/overflow fix, not a
  redesign of what renders.
- `ambient-skeleton-probe.yml` itself — reference it, don't modify it.
- Any other CSS class not directly implicated in this diagnosis.

---

## Pre-Build Probe (run FIRST — this doc's line numbers are from a read
earlier today; re-verify)

```bash
git log --oneline -5
sed -n '2030,2055p' index.html
grep -n "watch-now-btn\|stream-chip" src/legacy/field.js
```
Additionally, find and report the actual PARENT container that wraps
multiple `.watch-now-btn`/`.stream-chip` elements together (search
backward from one of the render call sites at ~field.js:5397/5498 for
where the concatenated HTML string gets inserted into a larger card
template). Confirm whether that container is `display:flex` with
`flex-wrap:wrap` already, or whether chips are being forced onto a
single row with no wrap — this determines whether the fix is
truncation-only, or also needs a container-level flex-wrap fix. Do not
assume either way.

## TASK 1 — Fix `.watch-now-btn` and `.stream-chip` overflow

Both need, at minimum:
```css
max-width:100%;
white-space:nowrap;
overflow:hidden;
text-overflow:ellipsis;
```
`.stream-chip` already has `white-space:nowrap` — keep it, add the other
three. `.watch-now-btn` needs all four added. If the probe's container
finding shows chips aren't flex-wrapping onto new rows and are instead
being squeezed into a fixed-width single row, `max-width:100%` alone
won't be enough — in that case also add `min-width:0` to the parent
flex container (a common companion fix for text-overflow inside flex
children) and/or fix the container's own `flex-wrap` if it's missing.
Adapt based on what the probe actually finds, not this doc's guess.

## TASK 2 — Real behavioral verification (VERIFY-ARTIFACT-A compliant —
this is not optional scaffolding)

Build or extend a CI-as-proxy Playwright workflow (mirror
`ambient-skeleton-probe.yml`'s structure: triggered by an
`outbox/.trigger-*` path push, real browser against the LIVE deployed
URL, commits real screenshots + a structured JSON manifest to
`outbox/`). At minimum:
- Load a card known to have a long-label chip (a "Watch on YouTube TV"
  button, or a "FuboTV"/"Fox Soccer Plus"-style price chip) at a real
  mobile portrait viewport matching IMG_9631's proportions.
- Manifest must include, per chip checked: `scrollWidth` vs
  `clientWidth` (if `scrollWidth > clientWidth`, content is genuinely
  overflowing — this is the falsifiable check, not a screenshot alone)
  and whether any two chip elements' `getBoundingClientRect()` boxes
  overlap each other (the DirecTV/calendar-icon collision specifically).
- Screenshot the affected cards, committed to `outbox/`.
- Done condition per VERIFY-ARTIFACT-A: `scrollWidth <= clientWidth` for
  every checked chip, zero overlapping bounding boxes, confirmed by the
  manifest's own boolean/numeric fields — not by eyeballing the
  screenshot alone. The screenshot is corroborating evidence, not the
  proof; the manifest's measurements are the proof.

## TASK 3 — Commit + outbox manifest

Outbox manifest per Rule 67: the real parent-container finding from the
probe, exact CSS diff, the Playwright manifest's real measured values
(scrollWidth/clientWidth per chip, overlap booleans), and the committed
screenshot paths.

---

## Done Condition

Live-verified via the committed Playwright manifest: every checked chip
has `scrollWidth <= clientWidth` (no overflow) and zero overlapping
bounding boxes among sibling chips, at a real mobile portrait viewport.
Long labels render as single-line ellipsis-truncated text, not multi-line
wraps or silent overlaps.

**Confidence scoring:**
+15 Probe correctly identifies the parent container's real flex-wrap
    state (T0)
+30 CSS fix applied to both classes, adapted correctly if the container
    also needed a fix (T1)
+40 Real Playwright verification per VERIFY-ARTIFACT-A: manifest with
    real scrollWidth/clientWidth + overlap measurements, not just a
    screenshot (T2) — this is weighted highest on purpose, matching why
    the rule exists
+15 Clean commit, honest outbox manifest, committed artifacts present

Automate follow-ups. No fallbacks, only fixes — if a chip's label is
long enough that even full-container-width truncation still can't show
meaningful text, that's a content problem (label too long for any
mobile layout), not a CSS problem — flag it explicitly rather than
forcing a CSS-only fix to paper over it.

Do not commit unless confidence >= 95. If score < 95, report verbatim and
stop.

---

## ONE-LINER

git pull. Read docs/CC-CMD-2026-07-23-chip-overflow-containment.md --
fix .watch-now-btn (wraps ugly, no overflow handling) and .stream-chip
(overlaps siblings, nowrap but no ellipsis safety net) so chips never
visually escape their container. Check whether the parent container
needs a flex-wrap fix too, don't assume CSS-only. Verify per the new
VERIFY-ARTIFACT-A rule -- build a CI-as-proxy Playwright check (mirror
ambient-skeleton-probe.yml) that measures real scrollWidth/clientWidth
and sibling bounding-box overlap, commits the manifest + screenshots to
outbox/, and let those measurements (not a screenshot alone) be the
proof. Automate follow-ups. No fallbacks, only fixes.
Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
