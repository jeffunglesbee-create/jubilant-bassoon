# CC-CMD-2026-08-09-park-badge-token-compliance — Result

## Status: DONE for the decided scope. **Confidence: 96.**

## Task 1 — real extent, measured not assumed

The CC-CMD warned against assuming the two known rules were the only
offenders. Correct: **20+ badge/chip rules carry raw hex** — `.free-badge`,
`.attn-chip.urgency-*`, `.importance-badge.*`, `.gotd-badge.*`,
`.conflict-chip`, `.crew-chip`, `.drama-dial-chip` and more.

Only the four `.mlb-park-badge` rules had a decided semantic mapping, so
only those were changed. The rest are deliberately untouched and carried
into `CC-CMD-2026-08-09-badge-chip-token-sweep`.

## Task 2 — decided, not swept

All four park variants → `var(--smoke)`, borders/backgrounds via
`color-mix` off the same token.

The reasoning matters more than the substitution: `#22c55e` maps
"cleanly" to `--sport-epl`, and making that swap would have been **worse
than the hex** — encoding "English football" onto a baseball badge in
compliant-looking form. The real defect was that four hues encoded a
**non-priority** dimension using globally-reserved priority meanings.
Direction survives in the badge text.

## Task 3 — artifacts

- raw hex in `.mlb-park-badge` rules: **12 → 0**
- `node smoke.js index.html`: **965 passed, 0 failed**
- new `#rrggbb` in the diff: **0**
- SW_VERSION `2026-08-08d` in `field.js` + `sw.js` + `index.html`

## Two of my own errors, both caught by the repo's guards

1. **I bumped SW_VERSION using the UTC date** (`2026-08-09a`). ET was
   still 2026-08-08. Smoke **A515** failed and named it exactly. Rule 4
   specifies ET; I used `date` without `TZ`.
2. That left `index.html`'s script block at `09a` while `field.js` said
   `08d`, so **sync-source's divergence guard blocked**. Fixed by
   restoring parity — the guard's own stated fix — not by bypassing it.

Both were caught by assertions rather than by me. Worth recording in a
session that has spent its time finding checks that *weren't* catching
things: these two did their job precisely.

## Residual
The 20+ remaining rules, in the sweep CC-CMD above. Not deferred — specced.
