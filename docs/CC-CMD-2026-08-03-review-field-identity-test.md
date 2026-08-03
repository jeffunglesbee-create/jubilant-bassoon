# CC-CMD-2026-08-03-review-field-identity-test

**Repo:** jubilant-bassoon
**Branch:** main — commit directly, do not create a feature branch or PR

One-liner:
```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git pull. Read docs/CC-CMD-2026-08-03-review-field-identity-test.md. Execute all tasks.
Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```

---

## What this is, and what it explicitly isn't

A real visual-identity direction was tested in field-playground
(`src/components/FieldIdentity/`, live on the Lab tab, render-verified
clean). It's grounded in a real, unique FIELD product fact: the RUWT
constraint that live drama never shows as a raw composite number, only
named bracketed conditions. The test made that constraint the visual
signature — monospace, all-caps, tier-colored glow — rather than
working around it.

**This is one tested pass, not a validated final direction.** Real,
honest self-critique from the actual render (not just the code):
the signature bracketed-condition tags work — visually distinct,
legible, tied to something real. The supporting panel chrome around
them reads more generic by comparison — closer to a template than the
signature element is.

**This CC-CMD is scoped to the one real, low-risk, directly-applicable
piece: the bracketed-condition tag styling itself, applied to
production's existing drama-condition display.** It is explicitly NOT
a request to reskin the whole app, replace the color system, or change
typography site-wide — that would be a much larger, separate decision
this one playground test doesn't earn on its own.

## Task 1 — Re-verify from HEAD before writing anything (Rule 87)

- Read the real, current `FieldIdentity` component and its CSS module
  in field-playground fresh — the exact token values (hex colors, font
  stack, glow shadow values) live there; don't re-derive them from
  this doc's own description.
- Find production's real, current bracketed-condition rendering (the
  live drama-state display this constraint already governs) — confirm
  its actual current styling and where it lives in `field.js`/CSS
  before proposing a change.

## Task 2 — Apply the tag styling only, adapted to production's real constraints

- Bring the bracketed-condition visual treatment (monospace, uppercase,
  tier-colored glow) to production's existing display, matching the
  playground test's real values where production's own CSS
  architecture allows, adapting where it doesn't (e.g. if production
  doesn't already load IBM Plex Mono, decide honestly whether adding a
  new font is worth it for this one element or whether an existing
  monospace stack achieves the same effect — state the real reasoning
  either way).
- Do not change any other part of production's visual system as part
  of this task.

## Task 3 — Smoke + real verification

- `node smoke.js` — 0 failures required.
- Real, visual verification: a real screenshot of the changed element
  live (or via CI render), not just a code diff — confirm it actually
  looks like the intended tier-colored glow treatment, the same
  discipline used to verify the playground test itself.

## Task 4 — Honest recommendation on the rest

State plainly, as a real recommendation not a decision: is the wider
identity (color system, type pairing, panel treatment) worth pursuing
further as its own, separate, larger effort — and if so, what would
the next real step be? This is Jeff's call, not something to act on
unilaterally here.

---

## Explicitly NOT in scope

- Do not change production's background color, broader type system, or
  any component beyond the bracketed-condition display.
- Do not add new fonts/dependencies beyond what Task 2 concludes is
  actually needed for the one element in scope.

---

## Outbox

`outbox/cc-session-2026-08-03-review-field-identity-test.md`: the real
before/after of the bracketed-condition styling, a real screenshot, and
an honest recommendation on whether the wider identity is worth a
separate, larger effort.
