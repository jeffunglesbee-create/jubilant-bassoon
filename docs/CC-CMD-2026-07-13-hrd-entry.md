# Claude Code Command — Add Home Run Derby entry to static schedule cards

**Date:** 2026-07-13
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.
**Scope:** one new entry in index.html's static schedule-card array only.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO — this CC-CMD targets jubilant-bassoon"; exit 1; }; git pull.

Write findings to outbox/hrd-entry-2026-07-13.md.

## CONTEXT

Today's automated `field-data-today.json` pipeline correctly returned zero regular games across every sport (MLB All-Star break, World Cup rest day, MLS World-Cup pause, NHL/NBA off-season — all independently verified this session, not assumed). But that pipeline only ever looks for regular games; it has no mechanism for special one-off events. Today's real, watchable content is the T-Mobile Home Run Derby — verified fresh via multiple independent sources tonight:

- Monday July 13, 2026, 8:00 PM ET (pre-show coverage from 7:00 PM ET)
- Citizens Bank Park, Philadelphia
- Streaming exclusively on **Netflix** — the first time this event has ever left cable/ESPN, a genuinely newsworthy broadcast shift worth surfacing prominently, matching FIELD's editorial-independence angle (a major sports event moving to a service most fans wouldn't expect)
- MLB All-Star Game itself is the following night, Tuesday July 14, 8 PM ET on FOX — not today, don't conflate the two

Note: the "Celebrity Softball Game" has been permanently replaced starting this year by "MLBx: All-Star 3-on-3" and already aired Sunday July 12 on NBC/Peacock — that's the day before today, not part of this entry.

## TASK 0 — Probe

Find the current, real insertion point in the static schedule-card array (grep for the most recent `startDate:"2026-07` entries, confirm exact current line numbers — this doc's context was pulled before this doc was written, re-verify). Confirm the exact object shape used by neighboring entries (comment line, startDate/endDate, card: show/network/chip/time/desc/journalNote/link) and match it precisely — don't invent a different shape.

Confirm whether a `netflix` chip value already exists elsewhere in the codebase (check chip-to-network resolution logic) — if not, this may be the first Netflix-carried event FIELD has ever listed, worth flagging explicitly in the outbox rather than silently guessing at a chip value that doesn't resolve to anything visually.

## TASK 1 — Add the entry

New entry for July 13, 2026, matching the established format:
- show: something like "T-Mobile Home Run Derby"
- network: "Netflix"
- chip: whatever TASK 0 confirms resolves correctly (or flag if none exists)
- time: "8:00 PM ET · Citizens Bank Park, Philadelphia" (mention 7 PM ET pre-show in desc)
- desc: factual, mentions the Netflix-exclusivity angle, notes MLB All-Star Game is the following night on FOX
- link: a real, correct URL (mlb.com or netflix.com, whichever the file's existing convention favors for similar entries)

## TASK 2 — Verify

- `node smoke.js` clean.
- Confirm the new entry actually renders for today's date (real check, not assumed) — this session's earlier investigation found the schedule rendering pipeline itself works correctly (field_smoke.js: 89 assertions, 0 failures) once given real data; confirm this specific entry is real data it correctly picks up.

## DONE CONDITION

One new, accurate schedule entry for the Home Run Derby, matching established format exactly, smoke clean, confirmed rendering for today.

**Confidence scoring:**
- TASK 0 confirms real insertion point and real chip/format matching, doesn't invent shape (30 pts)
- TASK 1 factually accurate (date/time/venue/network all correct per this doc's verified facts), matches format (40 pts)
- TASK 2 smoke clean, real render confirmation (30 pts)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
