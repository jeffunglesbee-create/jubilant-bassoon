# Claude Code Command — Wire dropGameSocket into real WebSocket lifecycle teardown

**Date:** 2026-07-15
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO — this CC-CMD targets jubilant-bassoon"; exit 1; }; git pull.

Write findings to docs/outbox/cc-drop-game-socket-2026-07-15.md. Commit with `[skip ci]`. **Treat with real care — this is resource-lifecycle code, not display.**

## CONTEXT

`dropGameSocket(sport, gameId)` calls `.disconnect()` on a tracked WebSocket and removes it from `_gameSockets` (a real `Map`). Never called anywhere. If sockets are opened somewhere in this codebase (confirmed to exist, given `_gameSockets` is a real, populated tracking structure) and never explicitly torn down via this function, they may be relying entirely on implicit browser/GC cleanup rather than deliberate disconnection — a real, if likely low-severity, resource-lifecycle gap, not cosmetic.

## TASK 0 — Probe

Find every real place a socket gets added to `_gameSockets` (the creation/subscription side). Determine the real, correct teardown trigger(s): game reaching a final state, a card being scrolled out of a tracked view, page/tab navigation away, or an explicit user action. Check whether any *implicit* cleanup already happens (e.g., a `beforeunload` handler, a different disconnect path not named `dropGameSocket`) before assuming this is a pure gap — if equivalent cleanup already exists under a different name, the real finding is "duplicate/orphaned helper," not "missing cleanup," and TASK 1 should be scoped accordingly.

## TASK 1 — Fix

Based on TASK 0's real findings: wire `dropGameSocket` at the correct real teardown point(s) if none exists today, or document (and only then decide whether to remove `dropGameSocket` as truly redundant) if equivalent cleanup is already handled elsewhere under a different name.

## TASK 2 — Verify

Real forced-condition test: a tracked socket, once its real teardown condition fires, is confirmed removed from `_gameSockets` and `.disconnect()` confirmed called. If TASK 0 found existing equivalent cleanup, confirm no double-disconnect/double-cleanup bug is introduced.

## DONE CONDITION

Every socket added to `_gameSockets` has a real, confirmed teardown path — either freshly wired via this dispatch, or confirmed to already exist under different code with `dropGameSocket` correctly identified as genuinely redundant rather than a gap.

**Confidence scoring:**
- TASK 0 (40 pts): finds every real socket-creation site and correctly determines whether teardown already exists elsewhere before assuming a gap
- TASK 1 (35 pts): fix matches the real finding — wiring a genuine gap, or a justified, disclosed decision to leave `dropGameSocket` unwired because it's redundant
- TASK 2 (25 pts): real forced test, no double-cleanup risk introduced

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop. Automate follow-ups. No fallbacks, only fixes.
