# CC Session Outbox — OTW Tier Categorical (merged CC-CMDs)

**Date:** 2026-07-12
**Scope:** jubilant-bassoon (sole). Executes both
`docs/CC-CMD-2026-07-12-otw-tier-categorical.md` and
`docs/CC-CMD-2026-07-12-otw-live-tier-categorical.md` as one merged unit —
both target the exact same function (`_otwGetLiveTier`'s CLOSE_FINISH/
LIVE_GAME branches) and were dispatched the same day; running them
separately would mean two sessions racing to edit the same 20-line block.

## TASK 1 (both docs) — Confirm current state + full blast radius

Re-read `_otwFindLiveGame`, `_otwGetLiveTier`, `dramaScoreLive` fresh from
HEAD before touching anything. Confirmed:

- `_otwGetLiveTier(eData, sport, smoothed)`'s T1/T2 (CRUNCH/EXTRA_TIME)
  were already boolean-gated named conditions — unchanged by this work.
- T3/T4 compared `smoothed` (temporally-averaged composite drama score)
  against hardcoded thresholds: `margin <= 3 && smoothed >= 60` →
  CLOSE_FINISH, `smoothed >= 40` → LIVE_GAME. This is the real, still-live
  instance of the RUWT composite-threshold risk.
- `_otwFindLiveGame`'s own selection (which game becomes the OTW pick at
  all) already uses categorical `fieldGameTier()`/`fieldTierRank()`
  selection, NOT a `dramaScoreLive() > minScore` threshold — confirmed by
  direct read. STANDARDS.md Rule 95's MODERATE entry for this function was
  stale (see "Rule 95 correction" below).
- **Exactly 2 real call sites of `_otwGetLiveTier`** existed before this
  change (confirmed via grep, not assumed): `getGameReasonTags()`
  (~line 37399 pre-edit) and the OTW FIRE-state render block inside
  `renderOneToWatch()` (~line 38179 pre-edit). Both updated (see TASK 3).
- **Broader sweep for every other `smoothed`/`dramaScoreLive()` output
  feeding a threshold → categorical/selection outcome** (per the
  `otw-live-tier-categorical` doc's TASK 1, "this may not be the only
  remaining instance") found **two more, both genuinely out of scope for
  this CC-CMD** (different features entirely, not touched):
  1. `recordPeakMissed()` / its `visibilitychange` listener (~line 28978):
     `smoothed >= 75` (via `getSmoothedDrama`) gates whether a
     `peak_missed` telemetry event fires, powering the Smart Catch-Up
     Brief ("you missed a fire game"). Composite-threshold → binary
     selection outcome — same risk class, different feature.
  2. `buildWatchWindowReason()` (~line 34988, now ~35000+): `if (smoothed
     && smoothed >= 50) parts.push('drama ' + smoothed)` — gates whether a
     "why" chip appears AND displays the raw composite number directly
     (`'drama 87'`) — arguably a worse violation than a threshold alone,
     since it's a raw score DISPLAY, not just a selection gate.
  Neither feeds `_otwGetLiveTier` or the OTW flagship feature this CC-CMD
  targets. Flagging both here per Rule 69 (document adjacent issues for a
  future prompt) rather than expanding scope mid-CC-CMD.

## TASK 2 — Understand what smoothed>=60/40 were approximating, decompose

`dramaScoreLive()` blends `base` (sport-calibrated score-margin closeness,
0-1) and `timeBonus` (sport-calibrated period+clock lateness) into
`raw = base*52 + timeBonus + sitBonus + upsetBonus`, clamped. The T3/T4
thresholds were really asking "is the margin tight enough AND the game
late enough" — both raw observables already available directly on `eData`.
Built three new helpers reusing `dramaScoreLive()`'s own per-sport
calibration tables (not reinvented):

- `_otwMarginTier(eData, sport)` — 3 margin tiers per sport, boundaries
  taken directly from `dramaScoreLive()`'s `base` bucket cutoffs.
- `_otwIsFinalPeriod(eData, sport)` — in the final regulation period at
  all (T2/EXTRA_TIME already handles overtime before this is reached).
- `_otwIsCrunchTime(eData, sport)` — `dramaScoreLive()`'s own highest
  non-overtime `timeBonus` tier per sport, reused as a boolean.

## TASK 3 — Replace T3/T4, update call sites

`_otwGetLiveTier(eData, sport)` — **dropped the `smoothed` parameter
entirely**, not just stopped using it. New T3/T4:

```
if ((tier === 1 && finalP) || (tier === 2 && crunch)) return 'CLOSE_FINISH';
if (tier === 1 || tier === 2 || (tier === 3 && (crunch || (looseTier3Sport && finalP)))) return 'LIVE_GAME';
```

`looseTier3Sport` (AFL/CFL only) is a documented, empirically-confirmed
carve-out: their tier-3 margin bucket is proportionally wide enough that
reaching the final period alone (not full crunch) already crossed the old
`smoothed>=40` bar in the characterization data (TASK 3/VERIFICATION
below) — not assumed uniformly across sports.

Both call sites updated to match the new 2-arg signature, and the
now-dead `smoothed`/`score` fallback computations removed (not just left
unused):
- `getGameReasonTags()`: removed `const smoothed = getSmoothedDrama(...)
  ?? dramaScoreLive(...)`, now calls `_otwGetLiveTier(eData, sport)`
  directly.
- `renderOneToWatch()` FIRE-state block: removed `score` from the `{g,ed,
  sport,score}=fire` destructure (confirmed via full-function grep it was
  used nowhere else), now calls `_otwGetLiveTier(ed, sport)`.
- `_otwFindLiveGame()`: removed the `score:_s = dramaScoreLive(_dramaEd,
  sec.sport)` computation (including the soccer FIFA-rank threading that
  existed solely to feed it) — its own comment said it was "retained for
  back-compat with downstream `_otwGetLiveTier` call (smoothed-drama
  fallback)"; that downstream consumer no longer exists after this
  change, so keeping the computation would be dead code, not preserved
  back-compat. Confirmed `getCachedTeamRank()` still has a live consumer
  elsewhere (`renderCardBadges`'s soccer branch, ~line 37522) — not left
  orphaned by this removal.

## TASK 3 (live-tier doc) / VERIFICATION — Real-data regression check

**Synthetic characterization** (this session, prior to this doc):
extracted `dramaScoreLive()` + the OLD `_otwGetLiveTier()` verbatim from
HEAD, swept 749 realistic (margin, period, clock) combinations across all
9 sports the function handles. Iterated three designs:
- v1 (naive): unknown baseline, not measured against real behavior first.
- v2: 97.2% agreement against the 749-sample OLD-system dataset.
- v3: widened `_otwIsFinalPeriod` thresholds + soccer clock-based crunch
  — **regressed to 96.5%** (e.g. NBA margin=0/period=3/clock=11:00 was
  incorrectly promoted to CLOSE_FINISH; OLD correctly held it at
  LIVE_GAME since period=3-without-crunch only reaches raw=57, under the
  60 bar). Reverted.
- **Final (shipped): v2 + the isolated AFL/CFL loose-tier3 carve-out only
  → 98.5% agreement (738/749 match, 11 documented mismatches)**.

**Real-data check** (this doc's TASK 3 requirement — "not synthetic
examples only"), performed via live ESPN scoreboard fetches through the
FIELD_Handoff browser tool (site.api.espn.com, real production data,
2026-07-12 ~19:45 ET):

- MLB scoreboard: all 15 today's games already `state:post` (Sunday day
  games finished) — no live MLB games at check time, correctly and
  honestly reported rather than fabricated.
- WNBA scoreboard: **1 genuinely live game** — DAL@CHI, period 2, clock
  2:22, 39-36 (margin 3). `dramaScoreLive` raw=43. OLD=LIVE_GAME,
  NEW=LIVE_GAME. **Match.**
- Soccer (FIFA World Cup 2026): 1 game found, France vs Spain, `state:pre`
  (not yet started) — no live soccer sample available at check time.
- Extended the check to today's 4 completed WNBA/MLB games' final-moment
  states (margin/period/clock as they ended) as additional real data
  points: TOR@NY (margin=2, Q4 buzzer): both LIVE_GAME, match. WSH@SEA
  (margin=5, Q4 buzzer): both null, match. NYM@BOS (margin=1, 10th
  inning — MLB extra innings): both EXTRA_TIME, match. TEX@HOU (margin=1,
  9th): both CLOSE_FINISH, match. SD@TOR (margin=1, 9th): both
  CLOSE_FINISH, match.
- **6/6 real games matched between OLD and NEW logic.** (One initial test
  run against the live DAL@CHI game produced a false mismatch —
  `dramaScoreLive` returned raw=0 because the test omitted `eData.state:
  'in'`, which the function short-circuits to 0 without; corrected the
  test and re-ran per Rule 77 investigate-before-explaining-away, not
  assumed away.)

Extracted (not reimplemented) both the live in-file `_otwGetLiveTier` and
`dramaScoreLive` via Node `vm` for every comparison above — the same
verbatim-extraction discipline used for the synthetic sweep.

## The 11 documented synthetic mismatches (98.5% agreement)

Not reproduced verbatim here (see the sweep script output in this
session's scratchpad, not committed — synthetic edge cases at sport-
specific tier boundaries, none reproduced against real data above).
General pattern: a small number of tier-3-margin, borderline-crunch
combinations where the OLD composite score crossed 40 by a few points
due to `sitBonus`/`wpBonus`/`upsetBonus` contributions the NEW logic
deliberately excludes per this CC-CMD's own instruction to use only
`margin`/`period`/`clock` — not situational bonuses. This is intentional,
not a defect: the CC-CMD's explicit brief was to decompose using
`dramaScoreLive()`'s two RAW inputs (`base`, `timeBonus`), not to
preserve every point the composite score could accrue from other
sources.

## Two additional real findings surfaced during characterization

- **MLB's effective CLOSE_FINISH margin is ≤1, not ≤3.** `dramaScoreLive`'s
  MLB `base` calibration (`diff===0?1.0:diff===1?0.85:diff===2?0.55:...`)
  means margin=2 in the 9th inning (base=0.55*52=28.6 + timeBonus=16 = 44.6)
  clears LIVE_GAME (40) but not CLOSE_FINISH (60) — the OLD code's uniform
  `margin<=3` gate never actually fired for MLB margin=2/3 CLOSE_FINISH in
  practice; `_otwMarginTier`'s MLB branch (`diff===0?1:diff===1?2:diff===2?3:0`)
  makes this explicit rather than accidental.
- **LIVE_GAME can trigger on margin alone, regardless of lateness,** for
  tier-1/tier-2 margins in every sport — this matches OLD behavior exactly
  (a very close early-game margin's `base` alone often already clears the
  40-point LIVE_GAME bar without any `timeBonus`) and is preserved
  intentionally, not a new behavior.

## Rule 95 correction

STANDARDS.md Rule 95 updated: the stale `_otwFindLiveGame` MODERATE entry
(claimed it still used `dramaScoreLive() > 50` for selection) replaced
with a "CORRECTED 2026-07-12" note — direct read confirms that function
already selects via `fieldGameTier()`/`fieldTierRank()`, not a composite
threshold; exact date that shipped isn't determinable from the code alone
(not invented). A new "FIXED 2026-07-12" entry documents the real
`_otwGetLiveTier` T3/T4 fix this CC-CMD performed.

## VERIFICATION

- `node smoke.js index.html`: 919 passed, 0 failed (updated A495's literal
  3-arg-call assertion to match the intentionally-changed 2-arg signature
  — the old assertion string-matched `_otwGetLiveTier(ed, sport,` with a
  trailing comma; investigated per Rule 77 before touching smoke.js,
  confirmed this was a stale assertion tied to the exact signature this
  CC-CMD was commissioned to change, not a real regression).
- `node field_unit.js`: 66 passed, 0 failed.
- `node field_smoke.js index.html`: exit 0, no failures.
- `node --check` equivalent (extract + `new Function()` per `<script>`
  block): clean.
- Grep confirms exactly 2 real call sites of `_otwGetLiveTier` remain,
  both updated to the 2-arg form; zero call sites still pass a 3rd arg.

## Browser end-to-end verification — STAGED

Per Rule 18 (browser-confirmed discipline) and Rule 61 (end-to-end before
"done"): the OTW header chip's rendering was NOT re-verified live against
the deployed production page as part of this session, because the fix is
still local/uncommitted at the point this doc was written — production
currently runs the OLD `_otwGetLiveTier`. **STAGED. Blocked by:** commit +
push + deploy-gate CI completing. **Unblocked when:** this commit is live
on Cloudflare. **Verify:** with a genuinely live game active (WNBA DAL@CHI
was live at check time, margin 3, period 2 — should classify LIVE_GAME
post-deploy), browser-navigate to the deployed FIELD app and confirm the
OTW FIRE/LIVE chip renders a named tier label, not a raw number, and
matches the classification computed above.

## Commit

- `index.html`: `_otwMarginTier`/`_otwIsFinalPeriod`/`_otwIsCrunchTime`
  added; `_otwGetLiveTier` T3/T4 rewritten, signature dropped `smoothed`;
  both call sites updated; `_otwFindLiveGame`'s dead `score` computation
  removed. `SW_VERSION` bumped `2026-07-12c` → `2026-07-12d`.
- `sw.js`: `SW_VERSION` synced.
- `smoke.js`: A494/A495 updated to match the new 2-arg signature (no
  behavior-test change, description/assertion-string sync only).
- `STANDARDS.md`: Rule 95 corrected (stale `_otwFindLiveGame` MODERATE
  entry replaced with a dated correction note; new `_otwGetLiveTier`
  FIXED entry added).
- This manifest.
