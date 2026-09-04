# CC-CMD — Does field-laboratory need uPlot at all? Decide on evidence.

**Date:** 2026-09-04
**Repo:** jeffunglesbee-create/field-laboratory
**Branch:** main — commit directly. No PRs.

```
git remote get-url origin | grep -q field-laboratory || { echo "WRONG REPO"; exit 1; }
git log --oneline -5
```

**Status:** OPEN. Written to close tasks #21 and #22 as a decision rather than
leaving them as an open question. Rule 87 #4: no deferred work without a second
CC-CMD.

---

## Why this is a decision and not a build

Tasks #21 and #22 were approved as "vendor uPlot into field-laboratory, add a
UPlot.fs binding and one real chart." Reading the repo before building says the
premise needs testing first, and I said so rather than building it:

**The laboratory already has a chart, and it is better than uPlot would be
here.** `src/Scoreboard.fs:104`, `renderSparkline`:

```fsharp
/// The 30-bar sparkline. Post-game only, for the same reason the peak is.
///
/// `barHeightStyle` needs an `AmnestyZone`, so this cannot be called for a live
/// game. Deleting the guard in `dramaText` would not leak a chart of a live
/// composite; it would stop compiling.
```

`scripts/spark-check.mjs` gates it against the two failures that actually
shipped once:

> **FIXED DOMAIN.** A bar's height in percent IS the drama value. The failure
> it replaces is normalising to the series maximum, which renders every game as
> a wall topping out at 100% — the committed arc spans 51-81 and would draw as
> 63-100%.
> **BUCKETED MAX.** The maximum of the output equals the maximum of the input.
> That is FALSE for every-Nth sampling, which is what shipped.

uPlot does neither by default, and **it conflicts with the compliance
architecture**: `SealedArc` and `SealedDrama` are private union cases so the
values can be passed and never read; `barHeightStyle` returns a CSS length.
uPlot takes raw numeric arrays. Handing it a `SealedArc`'s contents breaks the
seal that exists to stop exactly that.

So the honest question is not "when do we add uPlot here" but **"is there a
series in this repo that the existing sparkline cannot serve?"**

---

## TASK 1 — Probe: what series exist, and what does the sparkline refuse

Run before writing any code; paste output into the outbox.

```
grep -rn "float list\|int list\|: float\[\]\|Series\|Trend\|History" src/*.fs | head -30
grep -n "sparklineBars\|DRAMA_DOMAIN_MAX\|bucketMax\|arcOutOfDomain" src/*.fs
grep -rn "renderSparkline" src/*.fs
npm run check:spark
```

**Artifact required:** a table, in the outbox, with one row per candidate
series and these columns — name, source file, length, whether it is a
composite drama value (sealed) or commodity, and whether the existing
`sparklineBars` can render it as-is.

A series is a genuine uPlot candidate only if ALL of:

1. it is **commodity**, not a sealed composite (otherwise it cannot leave the
   seal and the question is moot);
2. the existing bar sparkline is **inadequate for a stated reason** — needs
   two series on one axis, a real time axis, a crosshair, or more points than
   30 buckets can carry without hiding structure;
3. it has a **real render target** today, not a hypothetical one.

---

## TASK 2 — The decision, written down either way

**If zero series qualify:** write
`outbox/decision-2026-09-XX-laboratory-no-uplot.md` recording that, close
tasks #21 and #22 as WONTDO with the evidence, and stop. Do NOT vendor a
dependency to satisfy a plan. jubilant-bassoon's renderer stays where it is;
the laboratory keeps its own.

This is the expected outcome on current evidence, and reaching it is a
successful completion of this CC-CMD, not a failure of it.

**If one or more qualify:** proceed to TASK 3 for exactly those, and name them
in the commit.

---

## TASK 3 — Only if TASK 2 says yes

1. Vendor uPlot the way `build-site.mjs` already vendors solid.js —
   `node_modules` → `public/vendor/`, not a CDN. Read that code first; it
   documents an export-condition trap.
2. Generate the chart's colours and fonts from `Palette.fs` / `Typography.fs`
   through the existing `<!--DESIGN-TOKENS-->` mechanism. Do not hand-write a
   palette; the token generator is the source.
3. `src/UPlot.fs` — a Fable binding narrow enough to state its own limits. It
   must NOT accept a `SealedArc` or a `SealedDrama`. If that requires an
   explicit commodity-only type at the boundary, build it; the seal is the
   point.
4. One real chart at one real call site. Rule 63: no binding without a caller.

**Fixed domain is mandatory**, matching `spark-check.mjs`'s finding. A chart
that auto-scales to its own maximum is a regression against a check this repo
already passes.

---

## TASK 4 — Verification (Rule 90)

Not "the chart renders."

1. **`npm run check:spark` still passes**, and the existing sparkline is
   untouched. A diff showing zero lines changed in `Scoreboard.fs`'s
   `renderSparkline` unless TASK 2 explicitly replaced it.
2. **Compile count before and after**, both stated. The repo compiles 71/71
   today; a binding that breaks compilation is not a binding.
3. **A type-level proof that the seal holds:** a commented-out line in the
   commit body showing that passing a `SealedArc` to the new binding fails to
   compile, with the compiler's actual error quoted.
4. If a chart ships, the **CI-as-proxy Playwright pattern** — this repo's
   `computed-chrome-check.mjs` is the local precedent, and jubilant-bassoon's
   `chart-renderer-probe.yml` is the remote one. Manifest booleans, not prose.
   All-false is a FAIL.

---

## Scope boundary

**In:** the probe, the decision document, and — only if the decision is yes —
vendoring, the binding, one chart, and its gate.

**Out:** replacing `renderSparkline`; touching `SealedDrama`, `SealedArc`,
`AmnestyZone` or `barHeightStyle`; field-playground (task #23, its own
question); anything in jubilant-bassoon, which is done.

---

## Done condition

`outbox/decision-2026-09-XX-laboratory-*.md` exists, states the outcome, and
cites the TASK 1 table as its evidence. Tasks #21 and #22 are closed in that
document as either DONE with a shipped chart or WONTDO with a reason.

"uPlot was added" is not a done condition. Neither is "uPlot was not added."
The decision plus its evidence is.

## Confidence scoring

- TASK 1 (40 pts): the probe ran; the table has a row per series and a verdict per criterion
- TASK 2 (30 pts): the decision is written down with its evidence, either way
- TASK 3 (20 pts): only if yes — vendored from node_modules, tokens generated, seal intact, a caller exists
- TASK 4 (10 pts): check:spark still green; compile count stated before and after

**Do not commit unless confidence >= 95. If below 95, report verbatim and stop.**
No fallbacks, only fixes.
