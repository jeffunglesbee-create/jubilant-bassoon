# CC-CMD-2026-08-09-ufl-epa-inline-token — Result

## Status: DONE. Bug fixed, blind-spot CLASS closed, and the fix proven end-to-end on the deployed build. **Confidence: 98.** (Was 96 — see the amendment at the foot.)

SW_VERSION `2026-08-09d` -> `2026-08-09e` (ET). Deploy run `31324879201`
succeeded. Smoke 965/0 throughout.

## Task 1 — probed from HEAD, and the bug is worse than the CC-CMD said

Confirmed as written: `--green 0`, `--red 0`, `--muted 1`.

But reading `.epa-chip`'s own rule changed the diagnosis:

```
.epa-chip { font-weight:600;font-size:.7rem;letter-spacing:.01em }
```

**It sets no colour at all.** So when the inline `color:var(--green|--red)`
was dropped as invalid, the chip inherited `--white`. The real behaviour was
not "two branches broken" — it was:

| EPA | intended | actually rendered |
|---|---|---|
| ≥ 0.5 (good play) | green | **white** (inherited) |
| ≤ -0.5 (bad play) | red | **white** (inherited) |
| neutral | dim | `--muted`, dim — **the only branch that worked** |

**The emphasis was exactly inverted.** A nothing-happened play was the only
one visually distinguished, and it was distinguished by being *dimmer*. Good
and bad plays were indistinguishable from each other and from ordinary text.
This has been true since the function was written.

## Task 2 — I departed from my own CC-CMD's recommendation, with reasons

That CC-CMD recommended setting all three branches to `--muted`, relying on
the sign prefix already in the markup. Having read `.epa-chip`, that is the
wrong call: `--muted` everywhere would **dim the two branches users actually
see today**, and would discard an intent the code plainly has.

The author's intent is legible — emphasise a significant play, de-emphasise a
neutral one. Rule 37 reserves no good/bad colour pair, and red is
"elimination urgency ONLY", so neither hue is honestly restorable. But intent
survives on an axis that needs no new reserved meaning: **full vs dim
foreground.**

```js
const c = (lp.epa >= 0.5 || lp.epa <= -0.5) ? 'var(--white)' : 'var(--muted)';
```

- Zero visual change: the significant branches already render white.
- Preserves the row hierarchy — chip (`--white`) > `.epa-sit` (`--smoke`) >
  `.epa-drive-tot` (`--muted`).
- Fixes the inversion by making the emphasis intentional rather than
  accidental.
- Branch structure kept **verbatim** rather than collapsed to `Math.abs()`,
  so a non-numeric `epa` lands in exactly the arm it does today (Rule 71).

The CC-CMD said "Recommendation", not mandate, and forbade shipping a new
token. No new token was shipped.

## Task 3 — scope held

`_buildUFLEpaHTML` only. The CSS `var(--green)` / `var(--red)` sites are on
the phantom-token audit's documented stop-list and were not touched.

## The done condition was wrong as written — replaced, not quietly dropped

The CC-CMD's third done condition said the probe manifest's
`jsInlineStyleSitesNotCovered` must **decrease**. It cannot: that field is
computed by `derive-touched-selectors.mjs` from a fixed list of seven
historical commits, so it is a property of those commits, not of HEAD. My
fix could never move it.

Same defect class as the `jrn-companion` grep in the surface-render CC-CMD —
a done condition written from a mental model of the artifact rather than
from the artifact. Recording it rather than satisfying the other two and
staying quiet.

**Replaced with something stronger:** `scripts/check-js-var-tokens.mjs`,
which closes the *class* rather than this instance. It scans every `var(--x)`
in `field.js` against `index.html`'s `:root` plus tokens set at runtime via
`setProperty` (legitimate override hooks, not phantoms), and splits results
into the same two buckets the CSS probe uses — no-fallback (fatal) and
with-fallback (silent). Wired into `token-resolution-probe.yml` ahead of the
browser step, so it has a caller (Rule 63) and fails before spending a
Chromium launch.

## Two false-positive classes in the checker, found by running it

**1. It flagged prose.** The first run reported 2 "fatal" references, both
comments — one of them a comment *I had written minutes earlier describing
this very bug*. A checker that flags its own documentation is noise, and
noise is what gets a check switched off.

**2. The comment stripper cannot fully tokenise JS.** Telling a regex literal
from division needs a real parser, and a regex containing a quote flips a
hand-rolled state machine into string mode until the next matching quote.
Observed directly: a comment at `field.js:1258` survived stripping while one
at `:6509` did not.

Writing a JS lexer is the wrong tool for this. A deterministic guard
backstops the machine instead: a match whose raw line **starts** with `//` or
`*` is prose. That can only ever suppress a comment line — a real declaration
never begins its line with a comment marker — so it removes noise without
hiding a bug.

## Done condition — met

**1. Smoke:** 965 passed, 0 failed.

**2. Source grep:**
```
grep -c "var(--green)\|var(--red)" src/legacy/field.js  ->  0
```

**3. Static class check** (`scripts/check-js-var-tokens.mjs`):
```
UNRESOLVABLE, no fallback (fatal): 0
unresolvable, with fallback (silent): 2
  field.js:20699  --accent  var(--accent,#f97316)
  field.js:20702  --accent  var(--accent,#f97316)
```
Both silent hits are `--accent`, on the audit's documented stop-list.

**4. Live probe unchanged** —
`outbox/token-resolution-probe-2026-08-09T16-55-33-941Z-manifest.json`,
`swVersion: "2026-08-09e"`:
```
l1 PASS  rules 1891  regressions 0  knownStopListed 11
l2 PASS  74 total, 73 pass, 0 fail, 0 ruleNotFound, 1 not-in-this-engine
conclusive true
```
No regression introduced by the fix.

## One governance item, stop-listed rather than deferred

`check-js-var-tokens.mjs` runs in CI on probe dispatch. Making it a
**pre-commit blocker** would catch this bug class at the moment it is
written rather than when a probe is next run. That is a change to the commit
gate, which is a governance decision of the same kind as the Rule 37
stop-list items — so it is raised here for sign-off, not taken unilaterally
and not carried forward as pending work.

## Confidence gate

**96.** The defect is fixed at the source with the fix's own reasoning
recorded, smoke is clean, the deploy is live, the source grep is zero, and
the blind-spot class now has a checker with a caller in CI — verified to
report 0 fatal and to name the 2 known silent references correctly.

Not higher because **the fix's runtime effect is unverified end-to-end.**
Proving it needs a live UFL play with `|epa| >= 0.5` rendering in a browser,
and UFL is out of season — no such element can be produced on demand. What is
proven is that the code emits `var(--white)`, that `--white` resolves on the
deployed build, and that no unresolvable reference remains in `field.js`. The
last step, an actual coloured chip in a screenshot, is blocked by the
calendar rather than by anything I can route around. Unblocks when the UFL
season starts: dispatch `token-resolution-probe.yml` and screenshot a live
UFL card's `.epa-chip`.

---

# Amendment — the 96 resolved: the calendar was never in the way

## What I got wrong

I wrote that proving the fix end-to-end "needs a live UFL play with
`|epa| >= 0.5`, and UFL is out of season... blocked by the calendar rather
than by anything I can route around."

That conflated two claims — the third time this session, and the same shape
each time:

1. **Does a live UFL game exist right now?** — seasonal, and irrelevant.
2. **When `_buildUFLEpaHTML` runs with a significant epa, does the chip
   render `--white`?** — what was actually unproven.

Only (2) is the claim, and **`_buildUFLEpaHTML` is a pure function of its
argument**. ESPN supplies `state` in production; a probe can supply it
here. Same function, same template, same stylesheet, same browser. Nothing
about the fix depends on a game being played.

Calling something "blocked" when it is merely unfamiliar is the rationalising
reflex Rule 77 names, and "out of season" made a comfortable-sounding
blocker — the same way "August slate" and "sandbox egress" did earlier.

## The fix: execute the real function, inject its real output

`ufl_epa_render_probe.js` extracts `_buildUFLEpaHTML` from
`src/legacy/field.js` — brace-counted from its declaration, so a `}` inside
the template literal cannot truncate it — executes it with synthetic states
covering all three branches, and injects **the string the function itself
returns** into a real `.game-card` on the deployed page.

The markup is deliberately not hand-written. Re-typing the template would
prove only that I can copy it accurately — the trap that let four dead
`.mlb-park-badge` variant rules read as verified for weeks. Injection targets
a real card rather than `document.body` because `.epa-chip` inherits, and the
question is what it resolves to in its production ancestor chain.

Two assertions per case, **not merged**: `emissionOk` (the function emitted
the right token) and `resolvedOk` (that token resolves in situ). The original
bug passed the first and failed the second — one combined boolean would hide
precisely this class of defect.

A `swMatch` guard asserts the repo's `SW_VERSION` equals the deployed one.
Without it the probe could measure one build's function against another
build's stylesheet, and the result would mean nothing.

## Artifact — an enumerated set of input/output pairs, all passing

`outbox/ufl-epa-render-probe-2026-08-09T17-07-50-241Z-manifest.json`,
`repoSW 2026-08-09e / deployedSW 2026-08-09e`, `swMatch: true`:

```
PASS  epa= 0.9  emitted=color:var(--white)  computed=rgb(242,242,250)  want=rgb(242,242,250)
PASS  epa=-0.9  emitted=color:var(--white)  computed=rgb(242,242,250)  want=rgb(242,242,250)
PASS  epa= 0.1  emitted=color:var(--muted)  computed=rgb(122,122,154)  want=rgb(122,122,154)

emphasisCorrect: true    conclusive: true
```

`emphasisCorrect` is the regression this CC-CMD exists for, asserted rather
than eyeballed: good and bad take the same arm so they **must** match each
other, and the significant arm **must** differ from neutral. Before the fix
that assertion would have failed — good and bad rendered white by accident
while neutral was the only branch that worked.

## Confidence gate — revised

**98.** The fix is proven on the deployed build by executing the real
function against the real stylesheet, with emission and resolution asserted
separately, three input/output pairs all passing, and a build-identity guard
ensuring the two halves came from the same deploy.

Not 100 because the probe injects into a synthesised wrapper inside a real
card rather than into a card that ESPN populated with UFL data — the ancestor
chain is real, the sibling context is not. If some future rule targets
`.ufl-epa-live` only as a descendant of a UFL-specific container, this probe
would not see it. No such rule exists today (`.epa-chip` has no colour rule at
all, which is the whole reason this bug existed), so the gap is theoretical —
but it is a gap, and worth a line rather than a rounding-up.
