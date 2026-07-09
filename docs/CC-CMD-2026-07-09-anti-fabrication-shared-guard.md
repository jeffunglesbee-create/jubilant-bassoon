# CC-CMD: Anti-fabrication guard is missing from the shared prose style

**Date:** 2026-07-09
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR

## CONTEXT

Real, evidenced finding from a follow-up thread that was flagged and
never actioned earlier tonight: a scouts-pick test brief invented a
specific pitcher matchup ("Sonny Gray faces William Contreras") that
was nowhere in its prompt.

Root cause, confirmed directly against current source, not inferred:
`FIELD_PROSE_STYLE` (~line 25201) — the shared constant every brief
type includes — has real, comprehensive guards (league-boundary
anti-hallucination, verbatim-citation-if-present, cliché bans) but
**no general instruction against inventing facts that were never
provided at all**. `night-owl`'s own prompt array (~line 38439) has
exactly this guard, added locally to that one brief type only: *"Write
only from data above — never invent statistics or play-by-play... DO
NOT FABRICATE SPECIFICS."* It was never propagated to the shared
constant or to any sibling type. `scouts-pick` (~line 14809) has no
equivalent anywhere in its own 4 local rules either — confirmed via
direct read, not assumed.

**The right fix is the shared constant, not a scouts-pick patch.**
Copying night-owl's line into scouts-pick alone would close this one
instance and leave every other brief type sharing `FIELD_PROSE_STYLE`
exactly as exposed as scouts-pick was. Adding it once, at the shared
level, protects every current brief type and any future one built on
this same constant.

**Separate, deliberately not bundled here:** the same test batch also
found a night-owl brief that leaked its own prompt instruction into
output ("fell within the 80-100 words range of expected intensity").
That's a different failure mode — the model echoing meta-instructions
as content, not inventing ungrounded facts — with no existing sibling
pattern to copy from, unlike this fix. It needs its own investigation,
not a rushed fix folded into this one.

## PROBE BLOCK

```bash
git log --oneline -5
grep -n "const FIELD_PROSE_STYLE" -A20 index.html
# Re-confirm the exact current array contents and line number before
# editing — do not assume this doc's citation is still current.

grep -n "never invent statistics or play-by-play\|DO NOT FABRICATE" index.html
# Confirm night-owl's exact current wording, and confirm it's the only
# occurrence (i.e. genuinely not already present anywhere in the shared
# constant under different phrasing).
```

## TASK 1 — Add the guard to FIELD_PROSE_STYLE

Add one line to the shared array, worded generally enough to apply to
any brief type (not night-owl-specific phrasing like "play-by-play,"
which doesn't fit scouts-pick's format): something in the spirit of
"Write only from the data and context provided above — never invent
players, matchups, stats, or specifics not present in it." Place it
near the existing citation/league-boundary rules, matching their
existing tone and format.

## TASK 2 — Live verification against a real regenerated case

Re-run a test structurally similar to the one that originally surfaced
this (same brief type, same kind of sparse-context scenario likely to
tempt fabrication) against the live, patched code. Confirm the output
contains no invented specifics beyond what was in the test's own
context — check this by hand against the actual prompt sent, not by
assuming absence. If the guard doesn't fully prevent it on the first
retry, report that honestly rather than calling it fixed — this is a
prompt instruction, not a hard technical constraint, and full
elimination isn't guaranteed by one line of text.

## DONE CONDITIONS

- [x] Guard added once, to the shared `FIELD_PROSE_STYLE`, not
      duplicated per brief type
- [x] Wording confirmed general enough to fit every current brief type,
      not copied verbatim from night-owl's format-specific phrasing
- [x] Live regenerated test checked by hand against its actual prompt,
      not assumed clean

## CONFIDENCE SCORING

- +40 — guard correctly added once at the shared level
- +30 — wording genuinely general-purpose, checked against at least 2
  different brief types' formats
- +30 — live test checked by hand, result reported honestly either way

**Do not commit unless confidence >= 95. If score < 95, report verbatim
and stop.**

## ONE-LINER

```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git pull. Read docs/CC-CMD-2026-07-09-anti-fabrication-shared-guard.md. Execute all tasks. Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```
