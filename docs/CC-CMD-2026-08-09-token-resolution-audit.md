# CC-CMD-2026-08-09-token-resolution-audit

**Repo:** jubilant-bassoon — commit directly to `main`.

**Origin:** the stated ceiling on `CC-CMD-2026-08-09-phantom-css-token-audit`
(97): ~46 changed text-colour declarations with no individual artifact.

## The two reframes this CC-CMD is built on

**1. Verify the universal, not the instances.** A phantom token is
structurally detectable at runtime — a `var(--x)` whose `--x` resolves to
empty on `:root`. So do not ask "are these 46 right." Sweep the entire
deployed CSSOM and prove **zero** unresolvable references remain anywhere.
That covers rules never listed and never touched, and it keeps covering
them. Proof of absence beats 46 proofs of presence.

**2. Most of the 46 are provably invisible, so images were the wrong bar.**
The failure mode was: declaration invalid → dropped → element **inherits**.
`body` sets `color:var(--white)` and 41 of ~50 fixes target `--white`, so
for anything not overridden between it and `body` the fix turned "inherits
--white" into "explicitly --white" — identical pixels. The right question
is "was this change observable at all", and it needs no old build:
inheritance IS the old behaviour, still measurable now. Compare each
element's computed colour with its parent's — equal means provably
invisible and impossible to regress.

## Task 1 — probe from HEAD

```
git log --oneline -5
git log --oneline -25 --format="%h %s" | grep -E "fix\(colour\)"
```
Record the fix-commit hashes. Do not write them from memory.

## Task 2 — derive the target list from the commits, never by hand

`scripts/derive-touched-selectors.mjs` parses `index.html` at each fix
commit AND its parent with a real brace parse, and emits
`outbox/touched-selectors.json`.

A hand-written list only checks what the author remembered; the forgotten
selector is the one that breaks. It must also report, separately, changed
sites that have **no selector** (inline styles in JS templates) so the
coverage claim is bounded rather than implied.

**Artifact:** `outbox/touched-selectors.json` with a non-zero `selectors`
count and an explicit `jsInlineStyleSites` count.

## Task 3 — `token_resolution_probe.js` + workflow

L1: walk every rule of every stylesheet; for each `var(--x)`, check
resolution against `:root`. Report **two separate buckets** — no-fallback
(declaration invalid, fatal) and with-fallback (renders the fallback
forever, silent). Never merge them.

L2a: for each derived selector, find its rule in the deployed CSSOM and
confirm every `var()` in it resolves.
L2b: where an element renders, record computed vs parent computed and set
`observable`.

L1's verdict must be measured against the audit's **documented stop-list**
(`--green`, `--red`, `--orange`, `--accent`), so a known decision does not
hold the gate red forever while any NEW unresolvable token fails loudly.

## Done condition (artifact, per Rule 90)

A committed manifest at the current deployed `swVersion` showing:

- `l1.verdict: "PASS"` with `regressions: []`
- `l1.rulesScanned` > 1500 — a sweep that scanned 51 rules and passed is
  the failure mode this guards against
- `l2.verdict: "PASS"`, `fail: 0`, `ruleNotFound: 0`
- `observableChanges` + `provablyInvisibleChanges` accounting for every
  rendered row
- `conclusive: true`

## Task 4 — outbox

`outbox/cc-session-{date}-token-resolution-audit.md` with a confidence
score, and amend the phantom-token-audit doc's gate if this closes it.
