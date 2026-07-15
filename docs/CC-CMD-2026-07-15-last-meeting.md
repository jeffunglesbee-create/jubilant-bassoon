# Claude Code Command — Surface fetchLastMeeting head-to-head history in the UI

**Date:** 2026-07-15
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO — this CC-CMD targets jubilant-bassoon"; exit 1; }; git pull.

Write findings to docs/outbox/cc-last-meeting-2026-07-15.md. Commit with `[skip ci]`.

## CONTEXT

`fetchLastMeeting(teamA, teamB)` calls a real, live relay endpoint (`/archive/last-meeting`, confirmed deployed since June 15 2026 via `ARCHIVE_RELAY_READY = true`) that returns head-to-head history between two teams. Genuinely built, genuinely working, never called anywhere in the client. Its sibling `fetchArchiveDate` (same file, same relay base) is a real, live-called reference for the intended usage pattern.

## TASK 0 — Probe

Read `fetchArchiveDate`'s real call site(s) to understand the established pattern for consuming this relay's responses. Fetch a real response from `/archive/last-meeting` for a real, current matchup to confirm the actual response shape (field names, whether it includes a formatted summary or raw results needing client-side formatting) — do not assume the shape from the function's own request-building code alone.

Decide the right UI surface based on what's actually there already: bottom-sheet content (matching tonight's BSD bottom-sheet pattern) is the most likely fit for a genuinely new content section, but check whether `matchupNote`-adjacent card content would be a lower-effort, still-real integration point before committing to a bigger UI addition.

## TASK 1 — Fix

Wire `fetchLastMeeting` into the chosen surface, called with real team names at the point a game card/bottom-sheet is being built. Format the real response into something genuinely useful ("Lakers lead the season series 2-1" style, or whatever the real response shape supports) — don't just dump raw JSON.

## TASK 2 — Verify

Real forced-condition test with a real response shape (from TASK 0's live fetch). Real live check: at least one real current matchup's H2H content renders correctly. Confirm graceful behavior when no prior meeting exists (real, expected case for a first-ever matchup) — no broken UI, sensible fallback (omit the section, don't show an error).

## DONE CONDITION

Head-to-head history is genuinely visible somewhere real users would see it, using the already-live relay endpoint, verified against real response data.

**Confidence scoring:**
- TASK 0 (30 pts): confirms the real response shape via a live fetch, makes an evidence-based surface choice
- TASK 1 (40 pts): wired correctly, formats real data usefully
- TASK 2 (30 pts): real forced test, real live check, no-prior-meeting case handled gracefully

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop. Automate follow-ups. No fallbacks, only fixes.
