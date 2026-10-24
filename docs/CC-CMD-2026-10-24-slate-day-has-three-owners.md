# Claude Code Command — "the slate day" has three owners on the client, and they disagree from 00:00 to 04:00 ET

**Date:** 2026-10-24
**Repo:** jubilant-bassoon (served page); the relay is already consistent
**Branch:** main. Commit directly; no feature branch, no PR.
**Type:** A (shared state read three ways)
**Confidence gate:** >= 95 before any commit
**Status:** FILED, not dispatched
**Filed by:** the independent review of the four commits of
`docs/CC-CMD-2026-10-24-nhl-nba-today-sections.md` (workflow wf_aac1f46a-cb3),
Rule 87.4. Content search: no CC-CMD covers `fieldDatesToQuery`, a stale
`TODAY_ISO` or the tomorrow leak. `CC-CMD-2026-09-12-past-date-slate-from-relay.md`
is the nearest, and it concerns past dates only.

---

## What was measured

The review ran the real `fieldNowET`, `fieldDatesToQuery`, `fieldTodayIso`,
`isToday`, `mapV2ToESPN`, `_v2SectionGame`, `fetchV2AllScores` and
`injectV2SportSection` under a fake clock against the real relay boards for
2026-10-24 and 2026-10-25 (CFB, MLS, NFL, EPL, NHL, NBA).

**Three readings of "which day is today":**

| owner | reads | rolls over | assigned |
|---|---|---|---|
| `fieldDatesToQuery` (what the V2 poll asks the relay for) | the ET **calendar** date, plus tomorrow from 16:00 ET | 00:00 ET | every poll |
| `TODAY_ISO` / `fieldTodayIso`, and `isToday` against it | the ET date stepped back before **04:00 ET** | 04:00 ET | **once, at page load** |
| the midnight watcher | the **local** calendar date | local midnight | re-runs `fetchSchedule`, never recomputes `TODAY_ISO` |

The relay's boards are keyed by the ET slate day, with the same 4am step
(`getFieldDateKey`), so the relay and `TODAY_ISO` agree and the poll is the odd one out.

**What that does** (all on the real boards; none of it is new, and all of it
reaches every sport `injectV2SportSection` serves):
1. **Tomorrow's games sit in today's sections from 16:00 ET.** At 20:30Z the
   NHL section holds 17 games (12 from 10-24 and 5 from 10-25) and NBA 15
   (8 + 7). Manifest `outbox/odds-line-probe-manifest-20261022T200518Z.json`
   shows the same for the league sports.
2. **From 00:00 to 04:00 ET the poll never asks for the slate day's board.** It
   asks for the next calendar date only. A game still being played at 00:30 ET
   (the 02:00Z NBA tips) is refreshed by no poll, and the cards shown as "today"
   are the next day's games.
3. **A tab left open across 04:00 ET keeps yesterday's `TODAY_ISO`.** The
   watcher rebuilds the schedule against it, so the tab keeps yesterday's
   `isToday` for the rest of the session.

**Why this is filed instead of fixed in the NHL/NBA change.** A day filter on
`TODAY_ISO` in the shared injector was tried (it would stop 1), and the review
reproduced the cost: from 00:00 to 04:00 ET, and in any tab open across the
rollover, it rejected every game and 20 sports rendered no cards (30 of 30 games
dropped on the 10-25 boards). It was removed in the same push. The injector now
guards only against a past-date view. Fixing 1-3 means changing the poll's dates
and `TODAY_ISO`'s lifetime, which every sport reads, so it needs its own premises
and review.

## TASK 0 — premises, one command each (Rule 100)

1. **The poll never fetches the slate day between 00:00 and 04:00 ET.** Run the
   real `fieldDatesToQuery` at 2026-10-25T05:00Z. `["2026-10-25"]` confirms.
   A list that includes `2026-10-24` refutes.
2. **A game live at 00:30 ET is stale.** Take an NBA game that tips at 02:00Z.
   Trace `espnScores[...]` and the card's state at 05:00Z through two polls. A
   state that moves to final refutes it.
3. **`TODAY_ISO` is frozen.** Grep every assignment (`field.js:3161` is the only
   one) and read the watcher at `field.js:17397-17414`. A second assignment
   refutes it.
4. **Who else reads `TODAY_ISO` or `isToday`.** List every reader (the FIFA block,
   `buildTodaySchedule`, Night Owl, the ambient panel, `goToDate`) and what each
   does in the 00:00-04:00 ET window now.
5. **The relay agrees.** `/v2/games?sport=nhl&date=2026-10-24` at 05:00Z still
   returns the 10-24 slate, and `getFieldDateKey()` there steps back at 04:00 ET.

## TASK 1 — decided from TASK 0

Expected, if the premises hold:
- `fieldDatesToQuery` always includes the slate day (`fieldTodayIso`), so the
  board the filter compares against is fetched.
- `TODAY_ISO` is recomputed when the slate day changes, and the watcher keys on
  that instead of the local date. `viewingISO` moves with it when the reader was
  on today.
- Only then, a day filter in `injectV2SportSection` (and the FIFA block's existing
  one agrees with it).

## Done condition (Rule 90 artifacts)

1. TASK 0's five outputs committed.
2. `check-v2-section-inject.mjs` derives `TODAY_ISO` and the injected games from
   one fake clock with the real `fieldTodayIso` and `fieldDatesToQuery`, at
   05:00Z, 09:00Z and 20:30Z. At 05:00Z the previous slate day's games are
   injected and the next day's are not, and the check is red with the
   `fieldDatesToQuery` change reverted.
3. A long-tab case: load at 20:30Z, advance past 08:00Z, and the new day's
   games appear. Red with the watcher change reverted.
4. The `today-sections-probe` manifest, run at 05:00Z and at 17:00Z on the
   live URL, shows cards for every sport that has games on that slate day.
