# Claude Code Command — Surface fetchSlashGolfRankings in the golf card/context

**Date:** 2026-07-15
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO — this CC-CMD targets jubilant-bassoon"; exit 1; }; git pull.

Write findings to docs/outbox/cc-golf-rankings-2026-07-15.md. Commit with `[skip ci]`.

## CONTEXT

`fetchSlashGolfRankings()` (weekly-cached wrapper around `slashGolfFetch(/rankings?orgId=...)`) is genuinely never called. Its sibling `buildGolfLeaderNote(leaderboard)` — which formats a compact "Reitan -15 · Im -14 · Fowler -13" string — sits right next to it and is presumed to be live (was not in the orphan list); confirm this in TASK 0 rather than assume.

## TASK 0 — Probe

Confirm `buildGolfLeaderNote`'s real current call site(s) and what data currently feeds it (live leaderboard data, presumably from a different fetch than rankings). Fetch a real response from the rankings endpoint to see its actual shape — rankings (season-long standing) and leaderboard (this week's tournament) are conceptually different things; confirm what real, additional value rankings data would add beyond what leaderboard already surfaces before designing where it goes.

## TASK 1 — Fix

Wire `fetchSlashGolfRankings` into wherever TASK 0 determines is the right real surface — likely golf card context or a golf-specific journalism prompt addition, following the same pattern already established for `buildGolfLeaderNote`'s existing consumer.

## TASK 2 — Verify

Real live fetch confirms current rankings data renders correctly. Real forced-condition test for the formatting/display logic. Confirm the weekly cache behaves as intended (doesn't re-fetch more often than the 7-day TTL implies).

## DONE CONDITION

Golf rankings data is genuinely surfaced somewhere real, using the existing weekly-cached fetch, verified against real live data.

**Confidence scoring:**
- TASK 0 (30 pts): confirms real leaderboard vs. rankings distinction and existing consumer pattern before designing
- TASK 1 (40 pts): wired to a real, justified surface
- TASK 2 (30 pts): real live verification, cache behavior confirmed

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop. Automate follow-ups. No fallbacks, only fixes.
