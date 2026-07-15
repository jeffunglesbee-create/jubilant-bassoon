# Claude Code Command — Wire dispatchFieldScore into the real score-update path

**Date:** 2026-07-15
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO — this CC-CMD targets jubilant-bassoon"; exit 1; }; git pull.

Write findings to docs/outbox/cc-dispatch-field-score-2026-07-15.md. Commit with `[skip ci]`.

## CONTEXT

`dispatchFieldScore(gameId, homeScore, awayScore, period, state)` calls `emitScoreEvent(...)`, pushing onto an event bus real subscribers ("S0 Subscribers," documented directly below it in the source) listen on. Never called. Either something was meant to feed real score updates through this specific entry point and doesn't, or score updates already reach subscribers through a different, equally-real path and this is a genuinely redundant, never-adopted entry point — TASK 0 must determine which before any fix is designed.

## TASK 0 — Probe

Read the real "S0 Subscribers" block in full to understand what they actually expect/react to. Find how score updates currently reach the app in practice (the real polling/ESPN-fetch path already confirmed extensively elsewhere this session) and confirm whether that real path already calls `emitScoreEvent` directly, or some other bus-emission function, bypassing `dispatchFieldScore` entirely. If real subscribers are already firing correctly via a different real path, this may be a genuinely redundant, unused entry point rather than a missing wire — say so plainly if that's what's found, don't force a fix onto a non-gap.

## TASK 1 — Fix

If TASK 0 confirms a genuine gap (real score updates arrive but never reach these subscribers): wire `dispatchFieldScore` (or route the real update path to call `emitScoreEvent` the same way it does) at the correct point. If TASK 0 finds subscribers are already correctly fed via a different real path, document that finding and do not force an artificial second call site.

## TASK 2 — Verify

Real forced-condition test proving a real score-state change now reaches at least one real subscriber via the fixed path, or real evidence confirming subscribers already receive updates via the alternate real path (whichever TASK 0 found true).

## DONE CONDITION

Score updates reliably reach every real S0 subscriber through a confirmed, real, live path — verified with evidence, not just "the function got called."

**Confidence scoring:**
- TASK 0 (45 pts): correctly determines whether this is a genuine gap or a redundant unused entry point, with real evidence either way
- TASK 1 (30 pts): fix matches the real finding, doesn't force an unnecessary change if subscribers already work
- TASK 2 (25 pts): real evidence for whichever conclusion TASK 0 reached

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop. Automate follow-ups. No fallbacks, only fixes.
