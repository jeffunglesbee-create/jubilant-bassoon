# CC-CMD-2026-08-09-ufl-epa-inline-token

**Repo:** jubilant-bassoon — commit directly to `main`.

**Origin:** found by `token_resolution_probe.js` while reconciling its
11 fatal references against the phantom-token audit's stop-list of 13. The
missing two were not in CSS at all.

## The finding — a live, silent rendering defect

`src/legacy/field.js` `_buildUFLEpaHTML()`:

```js
const c = lp.epa >= 0.5 ? 'var(--green)' : lp.epa <= -0.5 ? 'var(--red)' : 'var(--muted)';
```

`--green` and `--red` are **defined nowhere**. `--muted` is real. So the
positive and negative EPA branches emit `color:var(--green)` /
`color:var(--red)` as an inline style, both invalid at computed-value time,
both dropped — and the text inherits. The neutral branch works.

**EPA colour coding is therefore inverted in effect: only the "neutral"
case is coloured, and good and bad plays render identically.**

No CSSOM sweep can catch this. The value lives in a JS string and only
becomes a style when a UFL play renders, which is why
`token_resolution_probe.js` reports it under `jsInlineStyleSitesNotCovered`
rather than as an L1 row.

## Task 1 — probe from HEAD

```
git log --oneline -5
grep -n "_buildUFLEpaHTML" -A 6 src/legacy/field.js
for t in green red muted; do echo "--$t defined: $(grep -c -- "--$t *:" index.html)"; done
```
Expect `--green 0`, `--red 0`, `--muted 1`. If `--green`/`--red` are now
defined, STOP — someone added them and this is a different problem.

## Task 2 — decide the mapping, do not guess a hue

This is a Rule 37 decision, not a substitution. EPA good/bad is not one of
the seven reserved meanings, and:
- red is reserved for **"elimination urgency ONLY"**, so `--angle-elim` is
  wrong for "bad play";
- green has no reserved meaning at all.

So either a governance decision adds a token pair, or the display drops
colour and carries the sign in text (`+0.82` / `-0.61`), which the markup
already does — see the `s`/`ds` sign prefixes in the same function.

**Recommendation: use the existing sign prefixes and set all three branches
to `--muted`.** It removes an unreserved colour axis instead of inventing
one, and matches the park-badge resolution: when text already carries the
distinction, the hue is redundant.

Do NOT ship a new token without sign-off.

## Task 3 — scope boundary

`_buildUFLEpaHTML` only. Do not touch other `var(--green)`/`var(--red)`
sites; the CSS ones are on the audit's documented stop-list and are a
separate decision.

## Done condition (artifact, per Rule 90)

1. `node smoke.js index.html` → 0 failed.
2. `grep -c "var(--green)\|var(--red)" src/legacy/field.js` → `0`.
3. After deploy, dispatch `token-resolution-probe.yml`; the committed
   manifest's `jsInlineStyleSitesNotCovered` must **decrease**, and
   `l1.regressions` must stay `[]`.

## Task 4 — outbox

`outbox/cc-session-{date}-ufl-epa-inline-token.md` with a confidence score.
