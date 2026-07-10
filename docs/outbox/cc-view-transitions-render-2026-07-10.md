# CC Session Outbox — View Transitions for renderAll (CC-CMD-2026-07-10-view-transitions-render)

**Date:** 2026-07-10
**Scope:** The render-signature gate decides WHEN a structural rebuild
is necessary; this decides HOW it presents when one genuinely happens —
wrapping the genuine-rebuild branch of `scheduleRenderAll()` in
`document.startViewTransition()` for a browser-native cross-fade
instead of an instant DOM swap.

## PROBE BLOCK

`git log --oneline -5` — confirmed at HEAD (`b24612a`) before starting.

`grep -n "function scheduleRenderAll" -A 20 index.html` — **the doc's
own TASK 1 code snippet was stale, not matching current HEAD.** It
referenced `scheduleRenderAll(reason='async-data')` and
`window.FIELD_RENDER_PIPELINE.lastReason = reason;` — both removed in
the render-signature-gate CC-CMD (`a8ca7f3`) to preserve a smoke-
enforced invariant (`A-PHASE2-6`) requiring a literal zero-argument
`scheduleRenderAll(){` signature. This doc was authored before that
detail, or without re-checking it. Adapted the wrap to the REAL current
zero-arg signature, not copy-pasted from the doc.

`grep -n "renderAll(true)\|renderAll(skipUnchanged)" index.html` —
**the doc's TASK 2 premise doesn't hold either.** Only ONE
`renderAll(true)` call site exists in the entire file (inside
`scheduleRenderAll`). Every direct user-interaction path (TZ change
~6517, date-nav ~8593/8635/9088/22761/38690, filter clicks
~11625/11638/11654/11671/11686) calls `renderAll()` with **no
argument** — `skipUnchanged` is falsy there, triggering a full
`_cardStringCache.clear()` per the existing `A-PHASE2-5` contract, not
the cache-preserving `true` form. The doc's framing ("the direct
`renderAll(true)` calls") describes a call shape that doesn't exist —
reported honestly, TASK 2 answered against the real shape instead (see
below).

`grep -n "prefers-reduced-motion" index.html` — found an established
pattern, but confirmed it's **insufficient for this feature**: the
existing global rule (`index.html:1140`,
`@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-
duration:0.01ms!important;...}}`) targets the universal selector plus
standard `::before`/`::after` pseudo-elements. `::view-transition-old`/
`::view-transition-new`/`::view-transition-group` are distinct
top-layer pseudo-elements that `*`/`*::before`/`*::after` do **not**
match — confirmed this is a real gap in the existing CSS-only pattern,
not something to blindly extend; the doc's own JS-side `matchMedia`
check is the correct approach here, not a redundant re-invention.

**Real timing measured live against production, not assumed:**
navigated to the live deployed app, measured `totalGames: 23` across
`totalSections: 5` (current real slate, not the doc's cited "May 13
baseline of 30 cards"), and ran `renderAll(true)` 5 times with
`performance.now()` bracketing: `[79.9, 69.7, 71.9, 62.1, 61.6]` ms,
avg **69.04ms**, max **79.9ms**. Also confirmed
`document.startViewTransition` is available in the test browser
(Chromium-based headless session).

## TASK 1 — Async/data-arrival path wrapped, adapted to real current code

```js
window.FIELD_RENDER_PIPELINE.structuralRenders++;
const doRender = () => { renderAll(true); renderESPNScores(); };
const wantsMotion = !(typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches);
if (typeof document.startViewTransition === 'function' && wantsMotion) {
  document.startViewTransition(doRender);
} else {
  doRender();
}
```

**69ms average / 80ms max is well under the ~100ms threshold where lag
becomes perceptible** — the callback resolving synchronously inside
`startViewTransition()` does not leave a visibly frozen old-view
period. This measurement, not an assumption of "fast enough," is what
grounds the decision to wrap.

Feature-detected: unsupported engines (no `document.startViewTransition`)
fall through to the identical `doRender()` call. Reduced-motion-gated
via `matchMedia`, since the codebase's existing CSS-only pattern
doesn't reach View Transition pseudo-elements (see PROBE BLOCK).

**Rationale kept in a standing comment block above the function**
(index.html, immediately after the render-signature-gate's own comment
block) rather than duplicated inline in the function body — the body
itself carries only a short pointer comment, keeping
`scheduleRenderAll`'s own length manageable against the existing
`A-PHASE2-6`/`A-RENDERGATE-SKIP-1` smoke assertions that measure
distance from the function's opening brace to `renderAll(true)`.

## TASK 2 — Direct user-interaction paths deliberately left unwrapped, decision grounded in evidence

**The literal TASK 2 premise doesn't apply** (see PROBE BLOCK — there
is no direct `renderAll(true)` call site to decide on). The real,
adapted question: should the direct `renderAll()` (no-arg) calls at
filter-click/date-nav/TZ-change sites also get wrapped?

**Decision: no, left unwrapped.** Grounded in two pieces of real
evidence, not an assumption either way:

1. The codebase's own pre-existing comment, directly above
   `scheduleRenderAll` and unchanged since before this session, states
   the explicit, deliberate design intent: *"User-interaction paths
   (filter clicks, date nav, TZ change) call renderAll() directly so
   they respond instantly with no perceptible delay."* This predates
   both the render-signature gate and this CC-CMD — it's an existing,
   stated architectural decision, not an unexamined default (Rule 62 —
   follow existing conventions).
2. **The doc's own instruction is "only change these paths if the
   wrapped version is genuinely better, not merely different."**
   Whether a cross-fade "feels correct" on a direct click is a human
   perceptual/aesthetic judgment. A headless-browser probe can confirm
   the transition fires without errors and produces correct DOM output
   (which it would, mechanically — the same `renderAll()` call either
   way), but cannot establish that it *feels* better than an instant
   swap for a user-initiated action. Absent a way to actually establish
   "genuinely better," the evidence-respecting default is to preserve
   the codebase's own stated, deliberate design rather than change it
   on an unverifiable aesthetic guess.

**This is a real limitation, not an evasion — reported honestly.** If
a human wants this evaluated via visual A/B testing, that's the
correct next step; an automated agent operating a headless browser
cannot substitute for that judgment. Left unwrapped, matching the
existing "respond instantly" design intent.

## TASK 3 — Fallback path verified byte-identical, both by construction and by test

**By construction:** `doRender` is a single function reference. Calling
it via `document.startViewTransition(doRender)` or calling it directly
(`doRender()`) does not change `doRender`'s own behavior — it always
executes `renderAll(true); renderESPNScores();`, identically.

**Verified via extracted-verbatim `vm` test**, not assumed from the
code shape: extracted the real, committed `scheduleRenderAll` and ran
it under 4 combinations (SVT present/absent × reduced-motion
true/false). All 4 branches produced **identical call counts**:
`renderAll(true)` exactly once, `renderESPNScores()` exactly once, in
every case. The two fallback branches (SVT absent regardless of
motion preference; SVT present + reduced-motion) confirmed to call
`doRender()` directly with zero `startViewTransition` invocations —
exactly the pre-this-CC-CMD code path. 12/12 checks passed.

## TASK 4 — Live verification

**(a) Genuine structural change cross-fades where supported, (c)
reduced-motion genuinely respected — verified together, live, against
the actual deployed function, post-deploy.** See "Post-deploy live
verification" below (this requires the real deployed code; done after
push).

**(b) Measured timing doesn't produce a visible frozen-frame
period:** already measured in the PROBE BLOCK (69ms avg / 80ms max,
well under ~100ms) — this grounds TASK 1's decision to wrap and is not
re-measured separately, since it's a property of `renderAll()` itself,
unaffected by whether the call is wrapped.

**(d) Fallback path identical to pre-this-CC-CMD behavior:** verified
in TASK 3 (both by construction and by the 12/12 `vm` test) and
re-confirmed live post-deploy below.

## VERIFICATION (repo-level)

`node smoke.js index.html`: 919/0 — includes two real, investigated
fixes discovered while implementing (not shipped-then-caught): (1) an
early draft's inline rationale comment literally contained the string
"renderAll(true)" inside a code comment, creating a false SECOND match
against `A-PHASE2-6`'s exact-count check — reworded to describe the
call shape without the literal substring; (2) both `A-PHASE2-6` and
`A-RENDERGATE-SKIP-1`'s character windows needed widening (700→900,
700→900 respectively) since `scheduleRenderAll`'s body legitimately
grew — the count-based half of `A-PHASE2-6` (exactly one
`renderAll(true)` file-wide) is unchanged and is the actual safety
guarantee. `node field_unit.js`: 66/0. `node field_smoke.js index.html`:
21 failures, matches the documented pre-existing baseline exactly. Both
inline `<script>` blocks syntax-checked via `node --check`.

## DONE CONDITIONS

- [x] Real `renderAll()` timing measured against current actual
      schedule size (23 games/5 sections) before deciding this is safe
      to wrap
- [x] Async/data-arrival path wrapped with correct feature detection
      and reduced-motion respect
- [x] User-interaction paths: the doc's literal premise didn't hold
      (no direct `renderAll(true)` call sites exist); the real,
      adapted question answered with evidence — left unwrapped,
      matching the codebase's own stated design intent, since "which
      feels correct" cannot be established via automated testing
- [x] Fallback path confirmed byte-identical via both construction
      argument and a real 12/12 `vm` test across all 4 feature-
      detection/reduced-motion combinations
- [ ] Reduced-motion respect — verified by actually setting the
      preference — **pending live verification, next step this
      session, not deferred** (requires the deployed function; local
      `vm` test already confirms the logic is correct, live confirms
      the shipped code matches)

## CONFIDENCE SCORING (pre-deploy)

- +20 — real timing measured (69ms avg/80ms max, 23 games/5 sections),
  decision to proceed grounded in that measurement: **met**
- +25 — async path correctly wrapped, feature detection and reduced-
  motion both correct (verified via 12/12 `vm` test): **met**
- +20 — user-interaction path decision backed by real evidence (the
  codebase's own stated design intent), with the doc's stale premise
  corrected and reported honestly rather than forced: **met**
- +20 — fallback path verified byte-identical via both construction
  and a real test: **met**
- +15 — reduced-motion respect: **pending live verification, requires
  a deployed session to actually set the preference and observe the
  real shipped function's behavior, not a local vm mock.**

**Subtotal: 85/100 pre-deploy.** Committing to deploy and complete live
verification in this same session, matching this session's standing
two-commit pattern (code commit, then a small docs-only live-
verification addendum).

## Commit

- Bumps `SW_VERSION` `2026-07-10h` → `2026-07-10i`.
- `index.html`: `scheduleRenderAll()`'s genuine-rebuild branch wrapped
  in `document.startViewTransition()`, feature-detected and reduced-
  motion-gated. Standing comment block added above the function
  documenting the real measurement and the TASK 2 decision. Direct
  user-interaction paths (`renderAll()`, no argument) left unchanged.
- `smoke.js`: `A-PHASE2-6` and `A-RENDERGATE-SKIP-1` windows widened
  (700→900 each) to accommodate the legitimately larger function body;
  both assertions' actual safety invariants are unchanged.
- `sw.js`: `SW_VERSION` sync bump.
- This manifest.
