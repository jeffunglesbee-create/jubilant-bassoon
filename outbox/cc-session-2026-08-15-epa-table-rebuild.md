# CC session — the EPA table rebuild had never shipped

**Date:** 2026-08-15
**Repo:** jubilant-bassoon (sole)
**Branch:** main throughout — confirmed `git branch --show-current` = `main`
**Commits:** `606b2e6` (the fix), `f9bb6fd` (the rebuilt table, by the EPA-Build bot)
**Verification:** `build-epa-table.yml` run 31854656251 — **success** (first ever)

## What was actually wrong

Not "a failing test." The rebuild was a **silent no-op that had never once
shipped a table.** `build-epa-table.yml` runs build → test → push under `bash -e`.
The builder's primary path samples nflverse `ep` — which **is** nflfastR's model
output — but `test-epa.js` asserted hand-fit POLYNOMIAL point-anchors (6.05 at the
opp-10, 6.40 at 4th-and-goal) that the real EP surface misses by more than the
±0.3 tolerance. So the sequence every Aug 1 / Jan 1 was: real table builds → test
fails 8/14 → `bash -e` aborts before the push → the live `epa_table.json` stays
frozen at May's `polynomial-calibrated` version. Confirmed from run 30706486286
(the Aug 1 failure) and by reading the workflow's own step order.

The test's own comment called the anchors "published reference values from
nflfastR documentation." They weren't nflfastR's — they were the polynomial
fallback's, and the polynomial was a hand approximation that is simply wrong at
the field-position extremes.

## The fix, and why it isn't "make the test pass"

**Test now validates INVARIANTS, not point-values** (`606b2e6`). An EP surface has
properties any correct version must have, regardless of how it was built:

- completeness — every one of the 1120 grid cells present (a missing key computes
  a broken EPA at that situation),
- field-position monotonicity — 1st-and-10 EP rises as the offense nears the goal,
- down ordering — EP(1st) ≥ EP(2nd) ≥ EP(3rd) ≥ EP(4th) at a fixed spot,
- sane bounds, and
- wide nflfastR literature bands (own-20 low-positive, midfield ~2, red-zone high).

These pass for **both** the empirical and the polynomial surface, so a correct
rebuild ships regardless of which method ran — while a genuinely broken table
(flipped scale, non-monotonic, incomplete) still fails. That is the opposite of a
rubber stamp (Rule 90): it asserts real structure, not "whatever the builder
emitted." The two EPA-from-play assertions that were polynomial-anchored (a
3rd-down incomplete, a red-zone TD) are reframed as sign + plausible band, because
their exact magnitude is surface-dependent but their sign is not.

**Builder made complete and de-noised.** The raw nflverse group-median populated
only ~857 of 1120 cells (real games never see 4th-and-25 at the opp 1) and was
noisy at thin cells. `backfill_table()` keeps well-sampled cells as-is and fills
the rest from the empirical surface itself — a baseline 1st-and-10 field-position
curve plus a learned down/distance delta — so the grid is complete, smooth, and
still real nflfastR EP, just interpolated where the raw data was thin. An
in-builder invariant guard now fails loudly before the table is trusted, and the
spot-check that printed non-bucket keys as "missing" (`1_10_80` — 80 isn't a
bucket, 81 is) is fixed.

## Done-condition artifact

Run 31854656251 test output, against the REAL empirical table built from nflverse
2024 on the runner — **15 passed, 0 failed**:

```
✅ completeness: every grid cell present: 1120/1120
✅ monotonic: 1st-10 EP rises toward opponent goal
✅ down ordering: 2.578 ≥ 2.036 ≥ 1.269 ≥ 0.073
✅ bounds: all EP within [-4, 7.5]: [-2.741, 6.408]
✅ EP 1st-10 own 20 in [-0.2, 1.5]: 0.693
✅ EP 1st-10 opp 10 in [4, 6.5]: 5.005
✅ EPA: 3rd-7 incomplete is a real loss: -1.35
✅ EPA: TD run from opp 10 is positive and plausible: 1.96
```

And the table it shipped (`f9bb6fd`, pulled and confirmed):

```
method : nflverse-pbp-2024-backfilled   (was polynomial-calibrated, May 27)
cells  : 1120                            (complete)
own20=0.693  midfield=2.578  opp10=5.005  4th-goal-1=4.448
```

The live table went from a hand-fit May approximation to the real 2024 nflfastR EP
surface. It is served via `/nflverse/epa_table.json` (relay, 24h cache) and read by
`src/js/epa.js` — no client deploy needed; consumers pick it up within the TTL.

## What this does and does NOT do

- **Does:** the seasonal rebuild now works end-to-end and ships. Next Aug 1 / Jan 1
  it will refresh to that season's surface automatically instead of silently
  discarding it.
- **Does NOT:** wire live EPA to NFL cards. `epa.js` still exposes only `fromSRPlay`
  / `fromSRDrive` (SportRadar schema); `fromESPNPlay` / `_pollNFLEpa` do not exist.
  That is the separate, still-open blocker from the Drive checklist (P1-1/P1-2/P5-2)
  — this fix makes the *table* those functions will read trustworthy, which was a
  prerequisite, not the wiring itself.

## Confidence gate

**Score: 96 / 100.** Above 95; shipped.
- Root cause read from the workflow order + two run logs, not guessed.
- The invariant redesign is genuinely better (validates structure) AND method-
  agnostic AND unblocks the push — verified 15/0 against BOTH surfaces (polynomial
  locally, empirical on the runner).
- The rebuilt table is confirmed complete and on the real surface.

4 withheld: the backfill's interpolated cells (thin 4th-down/extreme-field
situations) are grounded in the empirical surface but are not themselves directly
sampled — reasonable, not ground truth; and the June doc's fuller approach (running
the nflfastR XGBoost model directly, Path A/B) is still the eventual upgrade over
sampling `ep` medians. Both disclosed, neither claimed as done.

## Rule compliance
- **Rule 77** — the failure was investigated to its mechanism (silent no-op), not rationalized.
- **Rule 90** — the test asserts real invariants, not a builder rubber-stamp.
- **Rule 69** — the polynomial method/anchors/key-funcs were kept and reused for backfill; not rewritten.
- **Rule 66** — `py_compile` + `node --check` clean; verified on the runner before declaring done.
