# CC-CMD-2026-07-30-fix-savant-wp-scale

**Repo:** jubilant-bassoon
**Branch:** main — commit directly, do not create a feature branch or PR

One-liner:
```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git pull. Read docs/CC-CMD-2026-07-30-fix-savant-wp-scale.md. Execute all tasks.
Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```

---

## The bug, confirmed today with live data — read this before touching anything

`fetchSavantGameFeed` (~line 17407) has its own adjacent comment stating
the contract explicitly:

```
// Returns: { wp: homeTeamWinProbability (0-1), lastWpa: homeTeamWinProbabilityAdded }
// WP scale: 0-1 fraction (e.g. 0.72 = 72% home win prob) — same as ESPN WP
// Confirmed live: gamePk 778507 showed homeTeamWinProbability 24x in gameWpa array
```

**Live probe today, real gamePk (823440), real game (Mets @ Phillies):**
`homeTeamWinProbability: 52.2`, not `0.522`. Confirmed on 28 real games via
CI-as-proxy (baseballsavant.mlb.com is sandbox-blocked; GitHub Actions
reached it directly) — every single value is on a 0-100 scale, none
below 1 except very late in blowouts. The "confirmed live" comment
appears to have checked the field was *present*, not that its range
matched the stated contract.

**`fetchESPNWinProb` (NBA, ~line 17378) is CONFIRMED CORRECT — do not
touch it.** Verified independently today via ESPN's own baseball summary
endpoint (same relay, same `homeWinPercentage` field name, real MLB
game): first entry `0.555`, last entry `0.0` — genuinely 0-1. The
Savant comment's claim ESPN uses the same scale was actually right
about ESPN; the bug is specific to Savant's own raw response not
matching what the original author assumed when they wrote the adjacent
comment.

## Downstream impact — why this matters beyond a display glitch

`dramaScoreLive`'s `wpBonus` term (~line 21990-21996):
```js
const wpDelta = Math.abs(wpNow - wpPrev) * 100; // API is 0-1 scale
wpBonus = Math.min(wpDelta * 1.5, 25);
```
For any Savant-sourced value (already 0-100), `wpDelta` computes on a
scale 100x too large — any real WP movement instantly saturates the
`*1.5` term past the 25-point cap. **`wpBonus` can currently only ever
be exactly 0 or pinned at 25 for live MLB games via Savant — never
anything between.** This is an active contributor to the drama-score
coarseness investigated across the day's other work (field-playground
docs/outbox/chat-update-2026-07-30-drama-scoring-*.md).

The WP chip (~line 36805-36824) computes `awayWp = 1 - homeWp`. For a
0-100 `homeWp` (e.g. 65.0), this goes negative (-64), which then always
satisfies `trailingWp <= 0.25` — the chip fires unconditionally on
every live Savant-sourced MLB game with a garbled negative percentage,
regardless of whether the game is actually close.

---

## Task 1 — Re-verify from HEAD before writing anything (Rule 87)

- Re-read `fetchSavantGameFeed`'s current full body fresh — confirm line
  numbers and the exact return statement shape, which may have shifted.
- Re-probe Savant live for at least one current or recent real game
  (`baseballsavant.mlb.com/gf?game_pk={real gamePk}`) — confirm the
  0-100 scale still holds. If it does not (Savant's API could plausibly
  have changed), STOP and report rather than applying a fix for a bug
  that may no longer exist.
- Confirm `fetchESPNWinProb` has not changed in a way that would alter
  today's "already correct" finding.

## Task 2 — Fix, single function, single point

Inside `fetchSavantGameFeed`, before the `return wp !== null ? { wp, wpa } : null;`
line: divide both `wp` and `wpa` by 100. `wpa` must be normalized by the
same factor as `wp` — it is a delta computed from consecutive WP
readings, so it lives in the same scale space as `wp` itself; fixing
`wp` alone while leaving `wpa` on the old scale would leave the two
internally inconsistent within the same returned object.

Update the function's own comment to state what the code now actually
does, rather than leaving a corrected implementation next to a comment
that was already wrong before this fix (that mismatch is what let the
bug ship unnoticed in the first place).

## Task 3 — Do NOT touch any consumer

`dramaScoreLive`'s `wpBonus` calculation and the WP chip's
`awayWp = 1 - homeWp` logic are both already correct FOR a 0-1 input.
Do not add defensive scale-detection at either consumer — that would
mask the fix's correctness and reintroduce exactly the kind of
scattered, ad-hoc unit-handling this bug came from. Fix the one source;
verify the existing consumers work unmodified.

## Task 4 — Verify the fix actually changes behavior, not just the code

- Construct a synthetic or real test case feeding a realistic sequence
  of Savant-shaped WP values (e.g. 52.2 → 55.5 → 48.0) through the fixed
  `fetchSavantGameFeed` and then through `dramaScoreLive`'s `wpBonus`
  calculation. Confirm `wpBonus` now produces a genuinely varying value
  proportional to the real swing, not 0-or-25.
- Confirm the WP chip's `trailingWp` computation no longer goes negative
  for a plausible in-range value.
- `node field_smoke.js` — 0 failures required.

---

## Explicitly NOT in scope

- Do not touch `fetchESPNWinProb` — confirmed correct today, independently.
- Do not touch `dramaScoreLive`'s formula weights, caps, or any other
  component (base/timeBonus/sitBonus/upsetBonus) — this is a units fix,
  not a recalibration.
- Do not add scale-normalization at any consumer site — fix the source only.

---

## Outbox

`outbox/cc-session-2026-07-30-fix-savant-wp-scale.md`: the fresh live
re-probe's result (confirming or refuting today's 0-100 finding before
the fix was applied), the exact diff, and the synthetic test case's
before/after `wpBonus` values proving the fix changes real behavior.
