# CC-CMD: Fix illegible pick'em text — wrong CSS variable, not a new bug class

**Date:** 2026-07-07
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR

**Source:** real screenshot showing pick'em matchup names and pick
values rendering dark-on-dark, illegible. Root-caused directly, not
guessed: both use `color:var(--ink,#e8e8f0)`. `--ink` is defined
(`:root`, line ~56) as `#0d0d1c` — near-black, clearly meant for
dark-text-on-light-background contexts elsewhere in the app. Because
`--ink` *is* defined, its real dark value wins; the light fallback
(`#e8e8f0`) never applies — CSS custom property fallbacks only trigger
when the variable is undefined, not when its value is merely
unsuitable for context. Confirmed exactly two occurrences of this exact
pattern in the whole file — not a wider class of bug.

**Target time:** ~5 min

## PROBE BLOCK
```bash
grep -n "var(--ink,#e8e8f0)" index.html
grep -c "var(--platinum)" index.html
```
Confirm both citations still match, and confirm `--platinum` is still
the establishedly-common light-text variable (38 uses as of this
writing) before using it as the fix.

## TASK — Replace both occurrences

Line ~698:
```css
.pick-widget .pick-choice{color:var(--platinum)}
```
Line ~2777:
```css
.pickem-matchup{font-size:.78rem;color:var(--platinum);font-weight:600}
```
Both changes are `var(--ink,#e8e8f0)` → `var(--platinum)`, nothing else
in either rule touched.

## VERIFICATION

- `node smoke.js index.html` clean.
- Confirm via the actual computed value that `--platinum` resolves to
  a real light color against the dark card background (`#a8a8c0` per
  the `:root` definition) — sufficient contrast against `--card`/
  `--card2`/`--card3`, not just "not pure black."
- Confirm no other element relying on `.pick-choice` or `.pickem-matchup`
  for a *different*, intentionally-dark context exists elsewhere (grep
  for both class names' full usage) — this should be a pure visual fix
  with no behavioral side effect, confirm that's actually true rather
  than assumed.

## DONE CONDITIONS
- [ ] Probe block confirms both citations before editing
- [ ] Both occurrences changed to `var(--platinum)`
- [ ] Confirmed no other, different-context usage of these two classes exists
- [ ] Smoke clean

## CONFIDENCE SCORING TABLE
+40  Both occurrences fixed correctly
+30  Confirmed no unintended-context usage of either class
+20  Contrast against real card background colors confirmed sufficient
+10  Smoke clean

## ONE-LINER
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO -- this CC-CMD targets jubilant-bassoon"; exit 1; }
git pull. Read docs/CC-CMD-2026-07-07-pickem-illegible-text-fix.md. Fix
the two CSS rules (.pick-widget .pick-choice, .pickem-matchup) that use
var(--ink,#e8e8f0) -- --ink is defined as near-black (#0d0d1c) for a
different context, so the light fallback never applies, producing
dark-on-dark illegible text. Change both to var(--platinum), the
already-established light-text variable used 38 times elsewhere.
Confirm no other context relies on the current dark rendering before
changing it. Do not commit unless confidence >= 95. If score < 95,
report verbatim and stop.
