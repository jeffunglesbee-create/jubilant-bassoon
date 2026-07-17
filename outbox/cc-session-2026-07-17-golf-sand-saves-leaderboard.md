# CC Session: Golf Sand Saves Leaderboard Column

**Date:** 2026-07-17  
**Repo:** jubilant-bassoon  
**Branch:** main

## HEAD Progression

- Before: `4d950d6` (docs: session doc for remove-vestigial-scoring cc-cmd)
- After:  `9f93fe4` (feat: add Sand Saves column to PGA leaderboard)

## Smoke

- Before: 958 passed, 0 failed
- After:  958 passed, 0 failed

## What Was Built

### Commit `9f93fe4` — feat: add Sand Saves column to PGA leaderboard

`stats.sandSaves` is in every enriched payload from the relay (field-relay-nba
`src/index.js` line 3255) and was already being read by `buildGolfPromptContext`
(line 17239) for journalism prompts — but was never surfaced as a visible column
in the leaderboard table.

Changes in `renderPGALeaderboard` (line ~16800):
- Added `const sand = (stats.sandSaves != null && stats.sandSaves > 0) ? ...`
- Added `<td class="pga-sand">${sand}</td>` to each row
- Added `<th>Sand</th>` to thead

Display: `XX%` when value present, blank when 0 or null (pre-tournament state).

No relay changes. No new data fetches. Pure client-side column addition using
an already-present stat in every enriched payload.

## Integration Status

**VERIFIED** (relay already serves `stats.sandSaves`; no new endpoint needed)

Known limitation: `sandSavesPossible` is not in the enriched per-player shape
(relay only surfaces the percentage, not the raw attempts). Sand Saves column
shows the percentage only, which is the industry-standard display anyway.

## CC-CMD Written for Follow-On Work

`docs/CC-CMD-2026-07-17-golf-green-light-wasted-green.md` — Green Light Rate
and Wasted Green columns. **STAGED** pending relay/ESPN field availability probe.

Reason: computing birdie-or-better/bogey-or-worse conversion on GIR holes
requires `birdiesOnGir` and `bogeysOnGir` counts, which are not currently in the
relay enriched endpoint shape. The CC-CMD includes the exact probe commands to
determine whether ESPN's `common/v3` stats API surfaces these fields.

## Open Carry-Forwards (not deferred work — genuine external dependencies)

1. Green Light Rate + Wasted Green: unblocked when probe confirms ESPN field
   availability. CC-CMD written.
2. `venueLocation` mismatch: relay serves `venueLocation`, client reads
   `ev.location || ev.course`. One-line fix in `renderPGALeaderboard` (line
   16782). Separate concern — not in scope of this session.
