# CC-CMD: View Transitions for renderAll — smooth structural rebuilds, real fallback

**Date:** 2026-07-10
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR

## CONTEXT

The render-signature gate (shipped earlier tonight) correctly decides
*when* a structural rebuild is necessary — it does not, and was never
meant to, make that necessary rebuild feel smooth. This CC-CMD
addresses the complementary problem: when `renderAll(true)` genuinely
must run, present it via a browser-native cross-fade instead of an
instant DOM swap.

**Verified before writing this, not assumed:** the View Transitions
API's same-document variant (exactly what a single-page structural
rebuild needs — this is not a page navigation) is confirmed fully
supported in Chrome, Edge, and Safari 18+ as of this session. Cross-
document support still lags on Safari, but is irrelevant here. Zero
existing use of `startViewTransition`/`view-transition` found in this
codebase — this is genuinely new ground, not a revisit of something
previously tried or rejected.

**Real, load-bearing technical constraint, not a footnote:**
`startViewTransition`'s callback must resolve before the animation
starts. A slow synchronous rebuild inside it leaves the old view
frozen on screen until the callback returns — this needs measured,
real timing against this file's actual `renderAll()`, not an
assumption that it's fast enough.

## PROBE BLOCK

```bash
git log --oneline -5

grep -n "function scheduleRenderAll" -A 20 index.html
grep -n "renderAll(true)\|renderAll(skipUnchanged)" index.html
# Full, fresh enumeration of every real renderAll(true) call site —
# both inside scheduleRenderAll and the direct user-interaction paths
# (filter clicks, date nav, TZ change). Report all of them, not just
# the ones this doc anticipates.

grep -n "prefers-reduced-motion" index.html | head -10
# Confirm whether this codebase already has an established pattern for
# respecting reduced-motion elsewhere — match it rather than inventing
# a new one, since the View Transitions API does NOT skip transitions
# for reduced-motion users automatically; this needs explicit handling.
```

Then, empirically: measure real `renderAll()` execution time against
this file's actual current schedule size (not the May 13 baseline of
30 cards — get the current real count), using `performance.now()`
before/after a real call. Report the actual measured duration before
deciding whether wrapping it in `startViewTransition` risks a visible
frozen-frame period.

## TASK 1 — Wrap the async/data-arrival path first

```js
function scheduleRenderAll(reason='async-data'){
  window.FIELD_RENDER_PIPELINE.scheduled++;
  window.FIELD_RENDER_PIPELINE.lastReason = reason;
  if(_renderAllPending) clearTimeout(_renderAllPending);
  _renderAllPending = setTimeout(()=>{
    _renderAllPending=null;
    const nextSig = _fieldVisibleRenderSignature();
    if(window.FIELD_RENDER_PIPELINE.lastSignature && nextSig === window.FIELD_RENDER_PIPELINE.lastSignature){
      window.FIELD_RENDER_PIPELINE.skippedStructuralRenders++;
      _fieldRefreshDynamicSurfaces(reason);
      return;
    }
    window.FIELD_RENDER_PIPELINE.structuralRenders++;
    const doRender = () => { renderAll(true); renderESPNScores(); };
    const wantsMotion = !(typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (document.startViewTransition && wantsMotion) {
      document.startViewTransition(doRender);
    } else {
      doRender();
    }
  }, 150);
}
```

Reuse this codebase's existing reduced-motion pattern if the probe
finds one already established elsewhere; only write the check above
from scratch if none exists.

## TASK 2 — Decide the user-interaction paths based on real evidence, not assumption

The direct `renderAll(true)` calls (filter clicks, date nav, TZ change)
are currently immediate specifically to feel instant. Whether wrapping
these in a view transition too improves or hurts that feeling is a
real UX question — do not assume either answer. Test both ways with
real interaction, report which feels correct, and only change these
paths if the wrapped version is genuinely better, not merely different.

## TASK 3 — Verify the fallback path is byte-identical to current behavior

For any engine without `startViewTransition` (or with reduced-motion
active), confirm the executed code path — `renderAll(true);
renderESPNScores();` — produces identical output to today's unwrapped
behavior. This is a hard regression requirement: today's users on
unsupported engines must see zero change.

## TASK 4 — Live verification

Confirm via real testing: (a) a genuine structural change (new game,
date change) now cross-fades smoothly where supported, (b) the
measured `renderAll()` timing from the probe doesn't produce a visible
frozen-frame period, (c) reduced-motion preference is genuinely
respected — verify by actually setting it, not just reading the code,
(d) the fallback path (feature-detection false, or reduced-motion
true) produces output identical to pre-this-CC-CMD behavior.

## DONE CONDITIONS

- [x] Real `renderAll()` timing measured against current actual
      schedule size before deciding this is safe to wrap
- [x] Async/data-arrival path wrapped with correct feature detection
      and reduced-motion respect
- [x] User-interaction paths tested both ways, changed only if
      genuinely better based on real interaction testing
- [x] Fallback path confirmed byte-identical to current behavior via
      real test, not assumed from the code shape
- [x] Reduced-motion respect verified by actually setting the
      preference, not inferred

## CONFIDENCE SCORING

- +20 — real timing measured, decision to proceed grounded in that
  measurement
- +25 — async path correctly wrapped, feature detection and reduced-
  motion both correct
- +20 — user-interaction path decision backed by real interaction
  testing, not assumed either way
- +20 — fallback path verified byte-identical via real test
- +15 — reduced-motion respect verified by actually setting the
  preference

**Do not commit unless confidence >= 95. If score < 95, report verbatim
and stop.**

## ONE-LINER

```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git pull. Read docs/CC-CMD-2026-07-10-view-transitions-render.md. Execute all tasks. Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```
