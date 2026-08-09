# CC-CMD-2026-08-09-observability-coverage

**Repo:** jubilant-bassoon — commit directly to `main`.

**Origin:** the stated bound on `CC-CMD-2026-08-09-token-resolution-audit`
(96). Its L2b partition — observable vs provably-invisible — measured only
**2 of 74** selectors, because the other 72 do not render at page load.

## What is already proven, and what is not

Proven: every one of the 74 rules resolves to a real token on the deployed
build (L2a), and zero unresolvable references exist anywhere outside the
documented stop-list (L1). **Correctness is closed.**

Not proven: that the changes were mostly invisible. That claim is argued
from `body{color:var(--white)}` plus 41 of ~50 fixes targeting `--white`,
and measured on two selectors — one of each class:

```
.np-divider     computed rgb(106,106,138)  parent rgb(242,242,250)  observable true
.privacy-modal  computed rgb(242,242,250)  parent rgb(242,242,250)  observable false
```

Both classes appearing is a good sign for the method, and a sample of two
is not a measurement.

## Task 1 — probe from HEAD

```
git log --oneline -5
python3 -c "import json;d=json.load(open('outbox/touched-selectors.json'));print(len(d['selectors']))"
```

## Task 2 — raise coverage by exercising app state, not by synthesising

`surface_render_probe.js` already established the pattern: open a surface
via the app's own path and record HOW. Apply it here. For each unrendered
selector, find the state that renders it — `toggleJournalismView()`, the WC
tab, a golf slate, night-owl mode — and record the reveal path per row, as
that probe does.

**Do NOT substitute a synthesised element.** The badge probe's synthetic
technique answers "does the rule resolve", which L2a already answers. The
question here is what an element INHERITS in its real ancestor chain, and a
detached span has no such chain — a synthetic node would return a confident
wrong answer.

Selectors whose state cannot be reached stay `NOT-RENDERED`, never a pass.

## Task 3 — extend the manifest, do not fork the probe

Add reveal paths to `token_resolution_probe.js`. One probe, one manifest.

## Done condition (artifact, per Rule 90)

A committed manifest at the current deployed `swVersion` with:
- `l2.rendered` ≥ 30 (from 2)
- every rendered row carrying `observable`, `computed`, `parentComputed`
  and the reveal path used
- `observableChanges + provablyInvisibleChanges === l2.rendered`
- `l1.regressions: []` — unchanged
- committed screenshots for every row where `observable === true`

## Task 4 — outbox

`outbox/cc-session-{date}-observability-coverage.md` with a confidence
score; amend the token-resolution-audit gate if this closes it.
