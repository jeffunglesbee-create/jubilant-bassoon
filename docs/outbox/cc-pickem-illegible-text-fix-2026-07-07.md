# CC Session Outbox — Pick'em Illegible Text Fix (CC-CMD-2026-07-07-pickem-illegible-text-fix)

**Date:** 2026-07-07
**Scope:** `docs/CC-CMD-2026-07-07-pickem-illegible-text-fix.md` — fix two
CSS rules using `var(--ink,#e8e8f0)` where `--ink` is defined as
near-black, making the light fallback never apply.

## PROBE BLOCK

Both citations confirmed matching exactly:
- `index.html:698` — `.pick-widget .pick-choice{color:var(--ink,#e8e8f0)}`
- `index.html:2777` — `.pickem-matchup{font-size:.78rem;color:var(--ink,#e8e8f0);font-weight:600}`

`--ink` confirmed `#0d0d1c` (near-black, `:root` line 56). `--platinum`
confirmed `#a8a8c0`, used 38 times elsewhere (`grep -c` before editing).

## FIX

Both occurrences changed from `var(--ink,#e8e8f0)` to `var(--platinum)`,
nothing else in either rule touched. `git diff` confirms exactly two
lines changed.

## VERIFICATION

**No other context relies on the current dark rendering — confirmed, not
assumed.** Grepped both class names' full usage across the entire file:
- `.pick-choice`: exactly one CSS rule (the one fixed) and one HTML
  template call site (`index.html:27841`, inside a `.pick-widget`).
- `.pickem-matchup`: exactly one CSS rule (the one fixed) and one HTML
  template call site (`index.html:32056`, inside a `.pickem-row`).

Neither class is reused anywhere else in the codebase for a different,
intentionally-dark context.

**Contrast confirmed via real computed WCAG ratios, not visual
inspection.** Computed contrast for both `--ink` and `--platinum` against
all three real card background variables actually used in this app's
theme (`--card:#121224`, `--card2:#181830`, `--card3:#1e1e38`):

| Background | `--ink` (current, broken) | `--platinum` (fix) |
|---|---|---|
| `--card` | 1.04:1 | 7.93:1 |
| `--card2` | 1.11:1 | 7.45:1 |
| `--card3` | 1.19:1 | 6.95:1 |

WCAG AA requires ≥4.5:1 for normal text, ≥3:1 for large/bold text
(`.pickem-matchup` is `font-weight:600`). The current state (~1.0-1.2:1)
confirms the reported illegibility is real and severe — essentially
invisible against all three real backgrounds. The fix (6.95-7.93:1)
comfortably clears WCAG AA on all three, with meaningful margin.

`node smoke.js index.html`: **890 passed, 0 failed.** Both inline
`<script>` blocks syntax-checked via `node --check`.

## DONE CONDITIONS

- [x] Probe block confirms both citations before editing
- [x] Both occurrences changed to `var(--platinum)`
- [x] Confirmed no other, different-context usage of these two classes exists
- [x] Smoke clean

## CONFIDENCE SCORING (per the CC-CMD's own table)

- +40 — both occurrences fixed correctly, diff confirmed minimal (exactly two lines)
- +30 — confirmed no unintended-context usage of either class, via exhaustive grep of both class names
- +20 — contrast against real card background colors confirmed sufficient via actual computed WCAG ratios, not just "lighter than before"
- +10 — smoke clean

**Total: 100/100.**

## Commit

- Bumps SW_VERSION `2026-07-07a` → `2026-07-07b`.
- This manifest.
