# CC-CMD: Swap public Streak Board card to real win/loss streaks

**Date:** 2026-07-21
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR
**Scope:** Swap the data source the client's Streak Board card reads from
`bundle.streak_board` (editorial quality) to `bundle.record_streak_board`
(real win/loss), wherever that rendering currently lives.
**Prerequisite — HARD BLOCKER:** `field-relay-nba` CC-CMD
`docs/CC-CMD-2026-07-21-record-streak-board.md` MUST be deployed and its
own TASK 6 verification MUST have passed against the LIVE relay URL before
this CC-CMD is dispatched. If `curl -s
https://field-relay-nba.jeffunglesbee.workers.dev/analytics/newspaper/<today>`
does not contain a populated, non-null `record_streak_board` key, STOP —
do not proceed, do not fall back to any other data source.

**Why — real, confirmed bug, not a hypothetical.** The public "STREAK
BOARD" card currently displays FIELD's own journalism-quality streak per
team, styled and labeled exactly like a real win/loss streak tracker.
Confirmed live 2026-07-21 (Codex incident `streak-board-metric-mismatch`,
status open until this ships). This is a correctness fix, not a redesign —
keep the existing visual treatment (fire/ice, chip grid, "STREAK BOARD"
label) since it will now be TRUE, not misleading.

**Real, honest scope acknowledgment:** the exact current rendering code for
this card is NOT fully known going into this CC-CMD. The original June 22
2026 spec (`docs/CC-CMD-2026-06-22-newspaper-client.md`) built it as an
inline `.np-streaks` section inside `renderNewspaper()`, using CSS classes
`np-hot`/`np-cold`/`np-streak-chip`. A grep confirmed those exact class
names do NOT appear anywhere in the current file outside that original
doc — meaning the card has very likely been visually redesigned since
(the live screenshot shows a standalone bordered card with a 3-column chip
grid, not an inline single row). The probe block below is REQUIRED, not
optional, to find the real current implementation before touching anything.

**Target time:** ~20 min (more if the probe reveals a larger restructure
than expected — if so, STOP and write a follow-up CC-CMD per Rule 87 point
4 rather than improvising a larger change than this doc authorizes)

---

## Do NOT Touch

- Any other section of the newspaper bundle (Night Stars, Morning Report,
  Truth Is, Tonight's Pick, Preview) — this is a single-section swap.
- The relay repo.
- Visual styling/CSS, UNLESS the probe shows the current hot/cold split
  needs new classes because the old `np-hot`/`np-cold` genuinely no longer
  exist anywhere relevant — in which case match whatever the current real
  pattern is, do not invent new classes.

---

## Pre-Build Probe (run FIRST — this is the real point of this CC-CMD; do
not skip or skim)

```bash
git log --oneline -5
grep -n "STREAK BOARD" src/legacy/field.js
grep -n "streak_board" src/legacy/field.js
grep -n "np-streak\|np-hot\|np-cold" src/legacy/field.js
grep -n "streak_board" index.html
```
Confirm exactly where and how `bundle.streak_board` (or whatever the
current live variable/field path is — it may no longer be named `bundle`)
is read and rendered. If the grep results don't match a clear single
render site, widen the search (e.g. `grep -n "streakBoard\|StreakBoard"`)
before writing any edit. Report the real current shape found here in the
outbox manifest, since this doc could not fully specify it in advance.

## TASK 1 — Swap the data source

Wherever the probe finds `.streak_board` (or `.hot`/`.cold` sourced from
it) being read, change it to read from `.record_streak_board` instead —
same `{ hot: [...], cold: [...] }` shape, same per-entry
`{ team, sport, streak, dates }` fields, deliberately identical on the
relay side specifically so this is a data-source swap, not a rendering
rewrite. Do not change the hot/cold split logic, the sort order, or the
chip markup — only the source object the hot/cold arrays are read from.

## TASK 2 — Confirm degraded-handling still works

The original spec gates rendering on `!bundle.streak_board.degraded` —
confirm the equivalent guard now checks `record_streak_board.degraded`
(Phase 13 sets this the same way Phase 7 does: `degraded: true` when fewer
than 3 qualifying rows exist in the lookback window). Do not remove this
guard.

## TASK 3 — Smoke assertions

Update or add assertions confirming the card reads from
`record_streak_board`, not `streak_board` (adapt whichever existing
assertion IDs cover this section — probe for A692-A696 first per the
original spec; if renumbered/replaced since, use the real current IDs).

## TASK 4 — Real behavioral verification

```bash
node scripts/build-bundle.mjs 2>&1
git checkout HEAD -- index.html
node scripts/sync-source.mjs
node smoke.js index.html 2>&1 | tail -3
```
Then live-verify in a headless browser session: load the Desk view,
confirm the Streak Board card renders with real team chips, and confirm
(via a temporary console log or the Playwright DOM read) that the numbers
now match `record_streak_board`'s values from the relay, NOT the old
`streak_board` values for the same teams — pull both from the live relay
bundle and diff them as part of this verification, don't assume the swap
took effect just because the code compiles.

## TASK 5 — Commit + outbox manifest

```bash
git config user.email "noreply@anthropic.com"
git config user.name "Claude"
git add src/legacy/field.js index.html
git commit -m "fix: Streak Board card now reads real win/loss data (record_streak_board) instead of journalism-quality streak_board (fixes streak-board-metric-mismatch)"
git push -u origin main
```
Outbox manifest per Rule 67: commit hash, deploy run ID, the real current
render-site location found in the probe (since this doc couldn't specify
it in advance), the before/after value diff from TASK 4, and confirmation
no other newspaper section was touched.

---

## Done Condition

Live Desk view's Streak Board card renders real per-team win/loss streak
data sourced from `record_streak_board`, confirmed via direct comparison
against the relay's live bundle for the same date (not assumed from code
inspection alone). Degraded-state guard still present. Smoke passing at
current real count. No other newspaper section touched.

**Confidence scoring:**
+20 Probe correctly located the real current render site (not assumed
    from the June 22 spec without checking)
+30 Data source swapped correctly, same shape, hot/cold/degraded logic
    unchanged, only the source object changed
+15 Smoke assertions updated/added, scoped to this section only
+25 Real behavioral verification — live-rendered numbers directly diffed
    against the relay's live `record_streak_board` values, not just "it
    compiles" or "it renders something"
+10 Clean commit, honest outbox manifest including the real render-site
    location this doc couldn't specify in advance

Automate follow-ups. No fallbacks, only fixes — if the current render site
turns out to be more entangled with other newspaper sections than expected,
do not patch around it with a duplicate/parallel render path; stop and
write a follow-up CC-CMD per Rule 87 point 4.

Do not commit unless confidence >= 95. If score < 95, report verbatim and
stop.

---

## ONE-LINER (DO NOT DISPATCH until the relay CC-CMD above is deployed and
verified — check `curl -s https://field-relay-nba.jeffunglesbee.workers.dev/analytics/newspaper/<today>`
for a populated `record_streak_board` key first)

git pull. Read docs/CC-CMD-2026-07-21-streak-board-client-swap.md.
Swap the public Streak Board card from `streak_board` (journalism quality)
to `record_streak_board` (real win/loss) -- probe for the real current
render site first, the exact code location is not fully known going in.
Same hot/cold shape on both sides, so this should be a data-source swap,
not a rewrite. Verify by diffing live-rendered numbers against the relay's
live record_streak_board values directly, not just that it compiles.
Automate follow-ups. No fallbacks, only fixes.
Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
