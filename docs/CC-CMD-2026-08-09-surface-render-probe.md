# CC-CMD-2026-08-09-surface-render-probe

**Repo:** jubilant-bassoon — commit directly to `main`.

**Origin:** the named ceiling on `CC-CMD-2026-08-09-phantom-css-token-audit`
(scored 95). That CC-CMD fixed 50 declarations that were invalid at
computed-value time and therefore rendering nothing. Each is now a visible
difference on the deployed site, and none is individually verified by an
image or a computed-style assertion.

## Why the existing probe cannot cover this

`badge_token_sweep_probe.js` reads computed style off elements that are
either present or can be synthesized as a bare `<span>`. These surfaces are
different in kind: they are hidden behind UI state, and their correctness
claim is about `background`, not `color`. A synthetic detached span cannot
stand in for `.privacy-modal`, because the claim is that the REAL modal,
in its REAL stacking context, is opaque.

## Task 1 — probe from HEAD before writing assertions

```
git log --oneline -5
grep -o "#privacy-banner{[^}]*}" index.html
grep -o "\.privacy-modal{[^}]*}" index.html
grep -o "body.journalism-mode \.jrn-companion{[^}]*}" index.html
```
Record the current `background` declaration for each. If any still reads
`var(--bg)` or `var(--bg2)`, STOP — the audit did not land and this probe
would certify a broken state.

## Task 2 — find how each surface is opened

Do NOT assume a class toggle. Read the code:
```
grep -n "privacy-banner\|privacy-modal\|journalism-mode" src/legacy/field.js | head -20
```
Record, per surface, the exact action that reveals it (a click target, a
class added to `body`, a localStorage key that suppresses it). A probe that
opens a surface the wrong way and finds it absent will report a false
FAIL — the failure mode the badge probe's `NOT-EMITTED` field exists to
distinguish.

## Task 3 — write `surface_render_probe.js`

Model on `badge_token_sweep_probe.js`: live deployed URL,
`waitUntil: 'domcontentloaded'`, structured manifest to `outbox/`, and a
`conclusive` flag that requires every surface decided.

Per surface, assert and record:
- `opened` — boolean, did the trigger actually reveal it
- `background` — the computed value
- `opaque` — `background !== 'rgba(0, 0, 0, 0)'` and not `'transparent'`
- a cropped screenshot of the surface

**A surface that could not be opened is `NOT-OPENED`, never a pass.** Same
rule as the badge probe's `NOT-EMITTED`.

## Task 4 — workflow

`.github/workflows/surface-render-probe.yml`, copied from
`badge-token-sweep-probe.yml` including its `if: always()` commit step (a
FAIL is the result worth keeping) and its per-pathspec `git add`.

## Done condition (artifact, per Rule 90)

A committed manifest at the current deployed `swVersion` showing, for each
of `#privacy-banner`, `.privacy-modal`, `body.journalism-mode
.jrn-companion`:

```
opened: true, opaque: true, background != "rgba(0, 0, 0, 0)"
```

plus the cropped screenshots. `conclusive: true`.

## Task 5 — outbox

`outbox/cc-session-{date}-surface-render-probe.md` with a confidence score.
If it closes, amend the phantom-token-audit doc's gate from 95 upward and
say so there.
