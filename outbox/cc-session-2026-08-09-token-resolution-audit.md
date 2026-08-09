# CC-CMD-2026-08-09-token-resolution-audit — Result

## Status: DONE. L1 and L2a PASS on the deployed build; L2b measured on 2 of 74. **Confidence: 96.**

No app code changed, so no SW_VERSION bump — the probe measures
`2026-08-09d`, already live. Smoke 965/0.

## The two reframes, and what each actually bought

**Reframe 1 — verify the universal, not the instances.** A phantom token is
structurally detectable at runtime. So rather than checking 46 instances,
sweep every rule of every stylesheet on the deployed page and prove zero
unresolvable references remain:

```
L1 PASS: 1891 rules / 1 sheet scanned (1 blocked — the cross-origin Google
         Fonts link, counted not ignored)
   unresolved NO-fallback: 11 — ALL 11 stop-listed, REGRESSIONS 0
   unresolved WITH fallback (silent): 19
```

This is stronger than 46 individual checks: it covers rules I never listed,
never touched, and rules that do not exist yet.

**It also independently rediscovered the audit's stop-list.** L1 was never
told what the stop-list was; it reported `--green` ×5, `--red` ×2,
`--orange` ×2, `--accent` ×2, which is exactly the set
`cc-session-2026-08-09-phantom-css-token-audit.md` documented as deliberate
decisions. Two independent methods agreeing is worth more than either alone.

**Reframe 2 — most of the fixes were provably invisible, so images were the
wrong bar.** The failure mode was: declaration invalid → dropped → element
**inherits**. `body{color:var(--white)}` — measured on the live page as
`rgb(242, 242, 250)` — and 41 of ~50 fixes target `--white`. For anything
not overridden between it and `body`, the fix turned "inherits `--white`"
into "explicitly `--white`": identical pixels. No screenshot could ever
distinguish them.

The test needs no before/after build, because **inheritance IS the old
behaviour and is still measurable in the current DOM**: compare each
element's computed colour to its parent's. Equal → provably invisible, and
incapable of being a regression.

Both classes appeared in the two rows that rendered:

```
.np-divider     computed rgb(106,106,138)  parent rgb(242,242,250)  observable TRUE
.privacy-modal  computed rgb(242,242,250)  parent rgb(242,242,250)  observable FALSE
```

## Task 2 — the target list is derived, not remembered

`scripts/derive-touched-selectors.mjs` parses `index.html` at each of the
seven `fix(colour)` commits **and at each commit's parent**, with a real
brace parse, and keeps every selector whose body changed and contains a
`var()`. Output: `outbox/touched-selectors.json`, 74 selectors.

A hand-written list checks only what the author recalled, and the forgotten
selector is the one that breaks. Deriving from the diff makes coverage a
function of the commits.

It also reports **8 changed sites that have no selector** — inline styles
inside JS template literals. Counted separately and carried into the
manifest as `jsInlineStyleSitesNotCovered`, so the coverage claim is
bounded rather than implied.

The first version of that script parsed diff *lines* and reported 16
anomalies, 9 of them multi-line CSS rules it could not see. Parsing whole
files at both revisions is slower and correct; the line parse was fast and
wrong.

## Three defects in my own probe, all caught locally before pushing

**1. The sweep scanned 51 of 1891 rules and reported PASS.** I wrote
`if (rule.cssRules) { walk(rule.cssRules); continue; }`, assuming only
`@media`/`@supports` carry `cssRules`. Modern Chromium gives **every**
`CSSStyleRule` an empty `.cssRules` because CSS nesting is supported, so
that branch recursed into nothing and `continue`d past all 1539 style
rules. Measured: `withCssRules: 1674` of 1676. This is precisely the false
green this probe exists to catch, produced by the probe itself.

**2. Shorthands were invisible.** An index walk over `rule.style` enumerates
**longhands**, and a shorthand carrying an unresolvable var
(`border-color:var(--red)`) cannot be expanded at parse time, so it never
appears. L1 reported 8 fatal references where reconciliation said more.
Switching to `rule.style.cssText` — the rule as parsed — found the missing
3, all `border-color` on `.vibe.*`.

**3. Two selector-matching faults.** Chromium re-serialises selector lists
as `a, b`, so diff-derived keys missed them; and `::-moz-range-thumb` rules
do not exist in this engine at all, which now gets its own verdict
(`NOT-IN-THIS-ENGINE`) rather than counting as a failure. Chromium cannot
speak to a Firefox-only rule either way, and pretending otherwise in either
direction would be false.

## Making L1 a usable gate rather than a permanent red light

L1's verdict is measured against the audit's **documented** stop-list
(`--green`, `--red`, `--orange`, `--accent`). Without that, `conclusive`
could never be true and the artifact would be ignored within a week. With
it, every known decision passes and any **new** unresolvable token fails
loudly — which is the regression this sweep is actually for.

## Done condition — met

`outbox/token-resolution-probe-2026-08-09T15-20-46-079Z-manifest.json`,
`swVersion: "2026-08-09d"`:

```
l1.verdict      PASS      rulesScanned 1891   regressions []   knownStopListed 11
l2.verdict      PASS      74 total, 73 pass, 0 fail, 0 ruleNotFound, 1 notInThisEngine
l2.rendered     2         observable 1, provably-invisible 1
conclusive      true
jsInlineStyleSitesNotCovered  8
```

Every done-condition threshold from the CC-CMD is met, including
`rulesScanned > 1500` — which exists precisely because a sweep that scanned
51 rules and passed is the failure mode being guarded against.

## Two findings routed to their own CC-CMDs (Rule 87)

**A live rendering defect, previously unnoticed.** Reconciling L1's 11
against the stop-list's 13 found the missing two are not in CSS at all.
`_buildUFLEpaHTML()` in `field.js` does:

```js
const c = lp.epa >= 0.5 ? 'var(--green)' : lp.epa <= -0.5 ? 'var(--red)' : 'var(--muted)';
```

`--green` and `--red` are undefined; `--muted` is real. So **only the
neutral EPA branch is coloured, and good and bad plays render identically**.
No CSSOM sweep can see it — the value is a JS string until a UFL play
renders. → `docs/CC-CMD-2026-08-09-ufl-epa-inline-token.md`.

**Six more dead override hooks.** Of the 19 silent with-fallback
references, `--i` is genuinely `setProperty`'d at runtime (3 sites), but
`--cols`, `--pulse-color`, `--pulse-speed` and the four
`--chip-*-opacity` tokens are **set nowhere** — knobs nothing turns. Same
class as the `--pulse-speed` finding the audit already recorded, now
enumerated. Folded into the observability CC-CMD's scope.

→ `docs/CC-CMD-2026-08-09-observability-coverage.md` also covers raising
L2b coverage from 2 to ≥30 by exercising app state, with an explicit
instruction NOT to substitute synthesised elements: a detached span has no
ancestor chain, so it would answer the inheritance question confidently and
wrongly.

## Confidence gate

**96.** The correctness claim is closed by two independent methods that
agree: a complete 1891-rule sweep of the deployed CSSOM with zero
regressions, and per-selector rule resolution across all 74 derived
selectors. The target list is generated from the commits, so it cannot
silently omit one, and three real defects in the probe were found and fixed
before it was trusted.

Not higher for two bounds I can state exactly:

1. **The observability partition is measured on 2 of 74.** Reframe 2 is
   argued from `body`'s colour and the token targets, and demonstrated on
   two rows — one of each class. That is a good sign for the method, not a
   measurement, and I am not going to describe it as one.
2. **8 changed sites have no selector and are structurally outside this
   probe** — and the UFL EPA bug proves that blind spot contains real
   defects, not just theoretical ones.

## The gate this closes upstream

`cc-session-2026-08-09-phantom-css-token-audit.md` was held at 97 because
its ~46 remaining declarations had no individual artifact. They now have a
stronger one than the screenshots it asked for: every rule verified to
resolve on the deployed build, plus a universal proof that no unresolvable
reference remains anywhere. Amended to **98** there.

Not 100 there either, because this audit's own bound is now that doc's
bound: the JS-inline blind spot, which contains at least one live bug.
