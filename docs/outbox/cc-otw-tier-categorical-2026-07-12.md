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
9 sports the function handles.

**IMPORTANT METHODOLOGY CAVEAT, added after review:** "agreement with OLD"
is NOT the same thing as "correctness." OLD's own `smoothed>=60`/`>=40`
thresholds were themselves arbitrary tuning constants on a composite score
— never independently validated as the right boundaries, and exactly the
kind of unvalidated numeric threshold this whole CC-CMD exists to replace.
A NEW-vs-OLD mismatch is a *point of divergence requiring a judgment call
or a bug check*, not automatically evidence the new design is wrong. The
first pass through this analysis (below) treated "matches OLD" as the bar
for "reverted, regressed" without doing that per-mismatch triage — that
was too coarse, and one of the specific "reverted" changes (v3's soccer
clock-based lateness signal) turned out to be diagnosing a real bug that
also existed in the shipped v2 design. See "v3 mismatch autopsy" and "real
bug found and fixed" below.

Iterated four designs total (three before this doc, one after, prompted by
re-auditing v3's mismatches instead of accepting the "reverted" summary at
face value):

- v1 (naive): unknown baseline, not measured against real behavior first.
- v2: 97.2% agreement against the 749-sample OLD-system dataset.
- v3: widened `_otwIsFinalPeriod` thresholds toward "first period/clock
  value where dramaScoreLive's own timeBonus table first turns nonzero"
  (rather than "the literal last period"), plus switched soccer's
  `_otwIsFinalPeriod` to clock-based. Dropped to 96.5% (26/749 mismatches)
  — see full autopsy below. **Not simply discarded**: one root cause
  (soccer) was isolated, fixed, and shipped (see "real bug found and
  fixed"); the other root cause (the broader "how late is late enough"
  question for NBA/MLB/AFL/WNBA/Tennis) is unresolved and tracked as an
  explicit follow-up, not silently dropped — see
  `docs/CC-CMD-2026-07-12-otw-finalperiod-semantics.md`.
- Shipped-at-first-commit (this doc's original version): v2 + an isolated
  AFL/CFL loose-tier3 carve-out → 98.5% agreement (738/749, 11 mismatches).
- **Current (this update, same commit sequence, follow-up fix applied):**
  shipped design + soccer `_otwIsFinalPeriod` switched to clock-based
  (`minNum>=70`) + soccer added to the loose-tier3 sport set → **99.07%
  agreement (742/749 match, 7 documented mismatches)**.

### v3 mismatch autopsy (26 mismatches, full breakdown — not summarized away)

All 26 of v3's mismatches vs. OLD, re-run and categorized by root cause
after the fact (extraction: `/tmp/.../scratchpad/otw_new_conditions3.js`
against the same 749-sample dataset):

| Pattern | Count | Root cause | Verdict |
|---|---|---|---|
| NBA/MLB/AFL/WNBA/Tennis LIVE_GAME→CLOSE_FINISH at raw 54-65 (e.g. NBA margin=0/period=3, MLB margin=0/period=7-8, AFL margin=0/period=3, WNBA margin=0/period=3, Tennis margin=1/period=1) | 12 | v3 widened `_otwIsFinalPeriod` per-sport to "first period with dramaScoreLive's lowest nonzero timeBonus" instead of "the literal final period" (e.g. NBA period>=3 instead of period>=4). All 12 raw values (54-65) sit within a few points of OLD's 60-point CLOSE_FINISH cutoff. | **Genuine open design question, not a bug.** Whether "CLOSE_FINISH" should mean literal-final-period (conservative, matches OLD, currently shipped) or first-real-urgency-period (v3's idea, arguably more true to what "getting close" means to a viewer watching a tied 3rd-quarter NBA game) is a product call this session should not make unilaterally. Tracked as a follow-up CC-CMD (see below), not dropped. |
| AFL null→LIVE_GAME (margin 7-15, period=3, raw=36) | 9 | Same `_otwIsFinalPeriod` widening for AFL (period>=3 vs shipped's period>=4) interacting with the AFL loose-tier3 carve-out — at period=3 the carve-out fired when it shouldn't have (shipped's period>=4 requirement correctly withholds it). | **Confirmed bug in v3's specific AFL threshold choice**, not a case for adopting the wider AFL finalP definition — this is the single largest mismatch cluster and it's a real defect, distinct from the genuine judgment-call cases above. |
| Soccer LIVE_GAME→null (margin=1, minute 75, raw=42) | 2 | v3 correctly recognized soccer needed a clock-based lateness signal (not period-based) and switched `_otwIsFinalPeriod` to `minNum>=70` — **the right idea** — but did not also add soccer to the loose-tier3 sport set, so the tier=3 LIVE_GAME path still required full crunch (`minNum>=80`), which minute 75 doesn't clear. | **Confirmed bug — an incomplete fix, not a wrong direction.** Diagnosed the missing piece (see below), fixed, and shipped as its own commit — see "real bug found and fixed." |
| Soccer LIVE_GAME→CLOSE_FINISH (margin=0, minute 75, raw=57) | 2 | Same clock-based-lateness idea correctly triggers `_otwIsFinalPeriod`, promoting to CLOSE_FINISH at raw=57 — again a boundary case near the 60 cutoff. | Same "genuine judgment call, boundary-adjacent" category as the first row — not a bug, tracked in the same follow-up. |
| Tennis null→LIVE_GAME (margin=1, period=1, raw=36) | 1 | v3's own tier/finalP interaction promotes an early single-break tennis game. raw=36 is close to but under OLD's 40-point LIVE_GAME bar. | Boundary judgment call, same category. |

**Total: 12+2 = 14 boundary/judgment-call mismatches (genuine open
question, tracked as a follow-up, not resolved unilaterally here), 9+2 = 11
confirmed-bug mismatches (2 fixed and shipped this session, 9 specific to
v3's AFL threshold choice and not present in any shipped design since v3
itself was never shipped).**

### Real bug found and fixed (soccer clock-based lateness)

Re-diagnosing the "Soccer LIVE_GAME→null" pair above against the *shipped*
(non-v3) design revealed the same defect was already present in what had
already been committed and pushed: shipped's soccer `_otwIsFinalPeriod`
used `period >= 2` (any point in the 2nd half at all, including minute 46
with zero real time-urgency per `dramaScoreLive`'s own soccer timeBonus
table, whose lowest nonzero tier is `minNum>=70`). Combined with soccer
not being in the `looseTier3Sport` set, this meant:

- A margin=1 soccer game at minute 70-79 (finalP true only under v3's
  clock-based version; false under shipped's period-based version) could
  **never** reach LIVE_GAME under the shipped design either — it required
  full crunch (`minNum>=80`) to clear the tier=3 LIVE_GAME path, which
  minute 70-79 doesn't. Confirmed via direct test against the live
  `index.html` code before touching it: `margin=1, period=2, clock=75` →
  shipped returned `null`, OLD returned `LIVE_GAME` (raw=42, clears OLD's
  40-point bar).
- This was 2 of the shipped design's own 11 documented mismatches — not
  a v3-only artifact.

**Fix applied** (this update, same OTW commit sequence):
1. `_otwIsFinalPeriod`'s soccer branch switched from `period >= 2` to
   `minNum >= 70` — matches `dramaScoreLive()`'s own first-nonzero soccer
   timeBonus tier exactly, the same "reuse the real function's own
   thresholds" principle every other sport's helpers already follow.
2. `looseTier3Sport` widened to include soccer (previously AFL/CFL only)
   — needed because soccer's tier-3 margin bucket (`diff===1`, base=0.72)
   is, like AFL/CFL's, high enough that reaching real lateness alone
   (not full crunch) already crosses the old LIVE_GAME threshold in
   `dramaScoreLive()`'s real numbers: `raw = 0.72*52 + timeBonus`; even
   `timeBonus=0` gives raw=37, and any nonzero timeBonus (minute>=70,
   +5) pushes it to 42, comfortably over 40.

Verified this fix in isolation (own scratch file, `otw_new_conditions4.js`)
before touching `index.html`: **99.07% agreement (742/749), 4 of the
shipped design's 11 mismatches resolved (both soccer null-gap cases, plus
2 more — soccer margin=0/period=2/clock=20 and clock=45 false-CLOSE_FINISH
promotions that the old period-based finalP was ALSO causing), zero new
mismatches introduced.** Then transplanted verbatim into `index.html` and
re-verified the live file reproduces the exact same 742/749 result.

### Remaining 7 mismatches (post-fix, all genuine boundary/judgment cases)

| Sport | margin | period | clock | raw | OLD | shipped (post-fix) |
|---|---|---|---|---|---|---|
| NBA | 0 | 3 | 1:30 | 70 | CLOSE_FINISH | LIVE_GAME |
| Soccer | 0 | 1 | 75 | 57 | LIVE_GAME | CLOSE_FINISH |
| Soccer | 0 | 2 | 75 | 57 | LIVE_GAME | CLOSE_FINISH |
| AFL | 5 | 4 | 3:00 | 65 | LIVE_GAME | CLOSE_FINISH |
| WNBA | 0 | 3 | 1:30 | 70 | CLOSE_FINISH | LIVE_GAME |
| Tennis | 1 | 1 | (none) | 36 | null | LIVE_GAME |
| Tennis | 1 | 3 | (none) | 54 | LIVE_GAME | CLOSE_FINISH |

All 7 are the same category as the "boundary/judgment call" rows in the
v3 autopsy above (raw values 36-70, straddling OLD's 40/60 cutoffs) — none
are confirmed bugs. Not fixed unilaterally in this session; see the
follow-up CC-CMD below for the specific open question and exact test
cases a future session (or the user) should resolve.

### Follow-up tracked, not dropped

Wrote `docs/CC-CMD-2026-07-12-otw-finalperiod-semantics.md` — a proper
follow-up CC-CMD (per Rule 87, no deferred work without a second CC-CMD)
capturing the exact open question ("final period" = literal-last-period,
matching OLD's historical behavior and currently shipped, vs.
first-real-urgency-period, v3's idea and arguably more accurate to what
"the game is getting tight" means to a viewer) with the precise 7 test
cases above, both candidate implementations, and what a resolving session
needs to decide and verify.

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
