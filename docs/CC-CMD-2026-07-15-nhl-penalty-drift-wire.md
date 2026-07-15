# Claude Code Command — Wire trackNHLPenaltyTransitions into the real ESPN poll cycle

**Date:** 2026-07-15
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }; git pull.

Write findings to docs/outbox/cc-nhl-penalty-drift-wire-2026-07-15.md. Commit with `[skip ci]`.

## CONTEXT — real bug found while executing CC-CMD-2026-07-15-string-referenced-verify

`trackNHLPenaltyTransitions(game, prevSit, curSit)` (index.html ~L20444) is the **only** function anywhere in the file that ever sets `game._homePenalties`/`game._awayPenalties` (confirmed via `grep -n "trackNHLPenaltyTransitions("` returning only its own declaration — zero real callers, despite its own comment explicitly claiming "Called from fetchESPNScores poll cycle (caller-side wiring)").

`computePenaltyDriftSignal(game._homePenalties, game._awayPenalties, ha, aa)` (~L20256) **is** genuinely called live, inside the real NHL analytics injection path ("Tier A #3 — Penalty Drift Indicator (live, needs game-state counts)"). Since nothing ever sets `game._homePenalties`/`game._awayPenalties`, both arguments are always `undefined` on every real game object — `parseInt(undefined)` → `NaN` → `computePenaltyDriftSignal` fails its own `Number.isFinite` guard and returns `null` on every single call, unconditionally. **This means the Penalty Drift Indicator can never fire in production**, silently, with no error — a real, live, currently-shipped NHL analytics feature that has never actually worked since it was built.

## TASK 0 — Probe

Confirm `fetchESPNScores`'s real current poll-cycle body (where per-game situation data — `curSit`/prior-poll `prevSit` — is read) and confirm the exact real shape `trackNHLPenaltyTransitions(game, prevSit, curSit)` expects, matching what the poll loop actually has available at that point (this function already exists and is fully correct internally — confirmed by this dispatch's own investigation — the gap is purely the missing call, not broken logic).

## TASK 1 — Fix

Call `trackNHLPenaltyTransitions(game, prevSit, curSit)` from the real NHL branch of the ESPN poll cycle, using the real prior/current situation snapshots already available there (check how the poll loop already tracks "previous" state for other signals — e.g. `_prevEspnScores` or similar — reuse the same pattern rather than inventing a new snapshot mechanism).

## TASK 2 — Verify

Real forced-condition test: simulate two consecutive poll cycles where a power play starts/ends, confirm `game._homePenalties`/`game._awayPenalties` increment correctly via the real wired call, and confirm `computePenaltyDriftSignal` — unmodified — now produces a real non-null signal when fed those genuinely-populated counts (proving the fix reaches the existing, already-correct downstream consumer, not just that the function gets called).

## DONE CONDITION

The Penalty Drift Indicator (Tier A #3) can genuinely fire for a real live NHL game with a real penalty differential — verified via a forced test proving the full real chain (poll cycle → trackNHLPenaltyTransitions → game._homePenalties/_awayPenalties → computePenaltyDriftSignal → a real non-null line), not just that trackNHLPenaltyTransitions gets called in isolation.

**Confidence scoring:**
- TASK 0 (25 pts): confirms the real poll-cycle shape and prior-state tracking pattern before designing the fix
- TASK 1 (45 pts): wired at the correct real point, reusing the established prior-state pattern rather than inventing one
- TASK 2 (30 pts): real forced test proving the full chain end-to-end, not just the isolated function call

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
