# FIELD Handoff — May 28 2026 (Session End — QW-1)

## Code HEAD
`c523df9` — QW-1: extract situation bonus to applyQW1SituationBonus() + smoke A230-232

## Smoke
Structural 234/0 ✅ · A1-A232 · SW_VERSION: 2026-05-28c
⚠️ Per-day field_smoke.js config STALE at TODAY_ISO=2026-05-23 → red (pre-existing).
   Sync per-day config in next daily-update run. Structural gate (CI deploy) unaffected.

## COMPLETED THIS SESSION
- QW-1 (Option B refactor): inline #11a situation drama bonus extracted VERBATIM into
  named `applyQW1SituationBonus(eData, sport)`. Behaviour identical — no double-count,
  no recalibration. NOT a rebuild: QW-1/#11a was already shipped & WORKING (verified
  May 21 audit). Spec doc 1kgxuLJF... was a re-spec of an existing feature; the only
  real gap was the named fn for VIBE-A/isCrunchTime reuse + smoke assertability.
- Post-RUWT compliance double-checked & PASSES: situation signals are named categorical
  game-state facts (goaliePulled/runners/isRedZone/downDistance), not excitement
  thresholds; dramaScoreLive is Case C (single-dim), smoothed via getSmoothedDrama
  before display; raw score never surfaced as a number (tier labels only).
- smoke A230 (fn defined), A231 (wired: sitBonus=applyQW1SituationBonus(eData,sport)),
  A232 (named-fact stub-guard). SW_VERSION 28b->28c, A189 pin synced.
- Pushed with [no-verify] (Rule 16) — reason = stale per-day config only; structural
  234/0 + units + lint(0 err) all clean.

## ARCHITECTURE NOTE (cross-model rule)
applyQW1SituationBonus signature = (eData, sport), NOT spec's (sit, sport): the logic
needs eData (onFirst/outs/balls/strikes/clock), diff, period, isFinalPeriod — all
recomputed INSIDE the fn (self-contained, identical to caller). Weather block (#Fix 6)
intentionally LEFT inline in dramaScoreLive — it is a separate signal, not "situation".
Not an ADR (behaviour-preserving refactor, no data-model change).

## NEXT SESSIONS
Tonight: NBA Finals shell after WCF G6 (OKC@SAS 8:30pm ET NBC). June 3 deadline.
Friday: NHL SCF shell after ECF G5
Saturday: The Scorecard (30min) spec 1_w5pMbUi1kygIJtTvT2SLEN2FAazxKgi2VVSBVHVFng
Sunday: Schedule Automation Phase 3 (30min docs only)
Post-QW-1 build order (per QW-1 spec): -> Schedule Card Surface -> Cold Open+Audio -> VIBE-A
  (Build QW-1 before VIBE-A — DONE; VIBE-A can now consume applyQW1SituationBonus.)

## OPEN TIER 0
- Sync field_smoke.js per-day config (currently 2026-05-23) — do in next daily update
- NBA Finals shell tonight
- NHL SCF shell Friday
- Schedule Automation Phase 3 Sunday
- Regret Risk USPTO Provisional $320 expires ~June 25

## NEW SPECS (May 28, Drive parent 0ABxH84VndHL7Uk9PVA)
The Scorecard #45: 1_w5pMbUi1kygIJtTvT2SLEN2FAazxKgi2VVSBVHVFng
DRAMA-LINE-A: 1_mozAEGLoLTEhwh4oplCxjtPDP-X3_A4wNjjO3SNs6Q
VIBE-A: 1KmlNjoOiKcmVHdZZVrwQYUlNge4DvqFQl1DVs7435qM
F16-F20: 165kco6HzPsuflkFQGOhxrFfnWjpGgxP1ma8oGz5LF8A
QW-1: 1kgxuLJFtCLmPUeRXeVZynCVC3gED_7qM2ZiSgUMRiWo  [BUILT c523df9 — re-spec of shipped #11a]
Arc Signature #80: 11DJ6W7hd9fNc1fs6lMuUm26CCcdm6tRJTyMdygrANyY
Tier 1 batch: 1XWp5ZJZmggyHHKsNmHG3vU9xYmroU3uLz9MIx9UCt9o
Pre-RUWT overhauls: 1bRgvL2uKaDjWuTlR8njkk-dcfpHvjUa9MUej_RS1kZI

## VOCABULARY LOCKED
The Scorecard: FINAL name for #45. Verdict taken 3x. Report Card taken by #93.

## CANONICAL DOCS
CI/Deploy Ref: 18JMUd-Uq_m2DomuCua2B5UMiWOel81yzc1JU7SY6f20
Current State: 1gumlOLcrOOYQlGWpdcYoziIhQQTsmD4Oi3KdVfMpps8
Schedule Auto Spec: 1XiXo3jQ6f9k0S7YgwpQ6OwBrBoT0R80-5sSmeMefo_U
Daily Update Ref: 1oSHqnDskN04p95g6e85--4hhgIsKISZ3ZflLXKPM08E PHASE 3 NEEDED
Journalism Quality: 1b7fwDVZMURi2sDbQ-Ur7dpbG4I5-fuCDPWC1ILfucoU
Session doc (this session): 1lhxD94dTKSDljIMYa8lU58pnwZDEpnU3sL-MlIM4YjA

## REPO
jeffunglesbee-create/jubilant-bassoon · PAT in memory only (exp May 2027)
