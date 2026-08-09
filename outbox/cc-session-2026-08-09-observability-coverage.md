# CC-CMD-2026-08-09-observability-coverage — Result

## Status: DONE, but its numeric done condition was NOT met as written. 32 of 74 decided; 42 remain. **Confidence: 93 — below the 95 gate, disclosed.**

No app code changed, so no SW_VERSION bump — the probe measures
`2026-08-09e`, already live. Smoke 965/0.

## The headline: the CC-CMD asked for ≥30 rendered, and 16 rendered

```
measuredByRender      16   (was 2)
decidedStatically     16
undecided             42
observableChanges     25
provablyInvisibleChanges 7
```

32 of 74 are decided. **The done condition said `l2.rendered >= 30`, and the
render-measured count is 16.** Reporting the 32 as if it satisfied that
threshold would be exactly the kind of number-that-flatters this session has
been trying to stamp out, so: **the threshold was missed on its own terms.**

Why the metric split in two is explained below, and the split is a
correctness fix rather than an excuse — but it does not retroactively make 16
into 30.

## The correctness fix the CC-CMD did not anticipate

I wrote the original partition as "compare the element's computed colour to
its parent's". That rule is **only valid for inherited properties**. The
pre-fix value of a dropped declaration is whatever the property would have
been without the rule, and that differs by property:

| property class | pre-fix value | test |
|---|---|---|
| inherited (`color`, `font-family`) | the **parent's** computed value | observable iff computed ≠ parent's |
| non-inherited (`background`, `border-*`) | the property's **initial** value (transparent / none) | observable iff computed ≠ initial — **needs no ancestor chain** |

The first version applied the inherited rule to everything **and then only
evaluated `color`**, so 24 non-inherited property-instances were both
mis-modelled and skipped. They are now decided statically: a background that
was transparent and now resolves to an opaque token differs by construction.

Property census across the 74 selectors: `color` 60, `background` 13,
`font-family` 7, `border` 4, `border-color` 3, `border-left` 2,
`border-top` 1, `border-bottom` 1.

## Coverage — 12 app states, all opened through the app's own API

```
load                  rendered  4  new 4
journalism            rendered  8  new 4
wc-groups             rendered 10  new 2
wc-bracket            rendered 13  new 3
wc-off                rendered 13  new 0
pickem / pickem-off   rendered 13  new 0
stats                 rendered 15  new 3
stats-off             rendered 16  new 0
viewer-intel x2       rendered 16  new 0
thread                rendered 16  new 0
```

Every state reports its own error field and its own counts, so a state that
failed to open can never be mistaken for a state with nothing in it. All
twelve returned `err=None` on the deployed build.

Signatures were read from source rather than guessed — `toggleThreadDrawer`
takes a gameId and returns early with no matching card, and
`setViewerIntelMode` accepts only `stories|myteams|stakes`. A wrong argument
would mount nothing and be indistinguishable from "this view has no touched
selectors": a false NOT-RENDERED.

**No element was synthesised.** The CC-CMD forbade it and the reasoning
holds: the inherited-property question is literally "what does this
inherit", and a detached node has no ancestor chain, so a synthetic stand-in
would answer confidently and wrongly.

## Why the remaining 42 are not reachable by toggling

They need **data**, not a view:

```
night-owl 3   epl-brief 2   field-row 2   golf-lb 2   jrn-slate 2
series-preview 2   wc-bar 2   ap-* 4   atp-score 1   card-brief 1
cascade-line 1   crew-chip 1   desk-card 1   drama-dial 1   fan-out 1  ...
```

These mount when a journalism brief exists in KV, a golf event is live, a
tennis match is in progress, or a game has gone final. Twelve view states
produced none of them, which is the correct result rather than a probe
failure.

The UFL EPA trick — call the pure function with synthetic state — does not
transfer, and I checked rather than assumed: those renderers are
module-scoped, and the app ships as an ES module, so nothing is callable
except the ~55 names assigned to `window`.

## What remains proven regardless

- **L1 PASS**: 1891 rules swept on the deployed build, `regressions: []`,
  11 unresolved references all on the documented stop-list.
- **L2a PASS**: all 74 selectors' rules resolve — 73 pass, 1
  `NOT-IN-THIS-ENGINE` (a `::-moz-` rule Chromium never parses), 0 fail, 0
  not-found.

So **correctness is not in question for any of the 42.** What is unproven for
them is only whether the change was *observable*, which is a property of the
past, not a defect risk.

## Follow-up written, not carried forward (Rule 87)

`docs/CC-CMD-2026-08-10-data-dependent-observability.md` frames the residue
as a three-way decision — expose renderers on `window` for testability (a
design change needing sign-off), drive real data via `goToDate` (buys
coverage at the cost of date-staleness), or accept the residue and add an
`undecidedBudget` guard so the count can never silently grow. It recommends
the third and requires the decision to be recorded **before** implementation,
because a decision made after the code exists is a justification.

## Confidence gate

**93 — below the gate.**

The partition is now correct per property class, coverage rose 2 → 16 by
render plus 16 static, all twelve states opened cleanly through the app's own
API with per-state errors captured, and the universal L1/L2a guarantees are
unchanged and green.

Held below 95 because **the CC-CMD's numeric done condition was not met.** It
asked for `l2.rendered >= 30`; the answer is 16. The honest reading is that
the threshold was written before I understood that observability splits by
property class, and that a corrected model reached 32 decided by a different
route — but "I later found a better metric" is not the same as meeting the
one I set, and treating it as such would be the rationalising move this
session has repeatedly had to correct.

**What would close it:** the follow-up CC-CMD's Option C. Once `undecided`
is bounded by a documented budget with a failing-case test, the residue stops
being an open question and becomes a monitored constant — at which point this
doc's gate can be amended.
