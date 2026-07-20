# CC-CMD — PL match data client wiring: split between bottom sheet (narrative) and Stats tab (factual/analytical)

**Date:** 2026-07-20
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole — `/pl/match/:id` is already relay-complete and verified live)
**Branch:** main — commit directly. No PRs.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }; git log --oneline -5

---

## CONTEXT

`/pl/match/:id` is relay-complete, verified live tonight (135 real events
for a real match, `halfTimeScore`, `matchOfficials`, `teamLists` with
nested per-team `formation`, all confirmed present via direct probe). No
client consumer exists — this CC-CMD is that wiring.

**Real, precise content split, applying the same narrative-vs-analytical
test already used for `CC-CMD-2026-07-19-bottom-sheet-stats-reconciliation.md`
— not a new framework, the same one:**

**→ Bottom sheet (narrative, per-game story):**
- `events[]`, filtered to `goal`/`substitution`/card types only (NOT all
  135 — corner/offside/miss/attempt-blocked/free-kick are too high-volume
  and not narratively meaningful). Each event's own real `text` field is
  already human-readable prose — use it directly, do not reformat or
  re-derive.
- `halfTimeScore` — small addition to the existing Game Summary section.

**→ Stats tab, Today's Games sub-section (factual, per-game analytical
context — same bucket as the already-relocated Scouting Report):**
- `teamLists` — starting XI + subs, position, formation label, per team.
- `matchOfficials` (referee + VAR) — same real category as MLB's
  umpire-tendency data already living here, not narrative.

**Real, honest scope note:** `teamLists` includes nationality/DOB per
player — do not surface these; position, shirt number, and name are the
real, relevant fields for a lineup display. Don't add fields not asked
for here just because they're present in the payload.

---

## PRE-BUILD PROBE BLOCK

```bash
git log --oneline -5
sed -n '30699,30760p' src/legacy/field.js
grep -n "bs-section-label\">Game Summary" src/legacy/field.js
grep -n "async function fetchPLFixtures" src/legacy/field.js
curl -s "https://field-relay-nba.jeffunglesbee.workers.dev/pl/match/116197" | head -c 800
```

Re-confirm the real, current line numbers and exact structure of both
target sections fresh — this doc's own line numbers (30699-30760,
~39122) are from tonight's probe and may have drifted by execution time.
Re-confirm the real, current `/pl/match/:id` response shape directly too
— don't trust this doc's description of it without a live check.

---

## TASK 1 — Fetch PL match data for cards with a PL fixture ID

Add `fetchPLMatch(fixtureId)` near the existing `fetchPLFixtures()`
(~L18626). Real, direct fetch of `${PL_RELAY_BASE}/match/${fixtureId}`,
cached per-fixture (30s TTL matches relay's own cache — don't re-fetch
more often than that). Only called when a card is actually opened
(bottom sheet) or rendered in Today's Games (Stats tab) — not proactively
for every PL fixture on poll, to avoid unnecessary load.

## TASK 2 — Bottom sheet: Key Moments section

In `openBottomSheet()`, near the existing Game Summary section (~L39122),
add a new `bs-section` labeled "Key Moments" — only rendered when
`game.plFixtureId` (or equivalent — confirm the real field name
`fetchPLFixtures` actually attaches, via probe) exists and the fetch
resolves. Real, filtered event list: `goal`, `substitution`, and any
confirmed card-type events (the relay session honestly flagged these as
unconfirmed — verify directly against a real match with bookings before
assuming the type string; if none can be confirmed live, ship
goal/substitution only and note the gap, don't guess at the type name).

Each event renders its own real `text` field directly — no
reformatting, no re-deriving a summary. Sort by `time.secs` ascending.

Add `halfTimeScore` as a small, real addition to the existing Game
Summary section's body — do not create a separate section for one field.

## TASK 3 — Stats tab: Lineups sub-section

In the Today's Games loop (~L30710), add `_tgLineups` and `_tgOfficials`
following the exact same real pattern as `_tgScout`/`_tgStandingsStr` —
same variable-then-append structure, same `stats-subsection` container.
Real content: starting XI (name, position, shirt number) + formation
label per team; referee + VAR names. Include in the existing
`if (!_tgScout && ...)` early-return guard so an empty result doesn't
render an empty subsection.

## TASK 4 — Real, direct verification

Real browser check: open a bottom sheet for a completed PL game with a
real `plFixtureId`, confirm Key Moments renders real goal/sub text
matching what a direct API probe shows for the same fixture. Separately
confirm the Stats tab's Today's Games shows real lineup/formation data
for the same or a different real PL fixture. Confirm smoke passes at
current real count with any new structural assertions added.

---

## DONE CONDITION

A real PL game's bottom sheet shows genuine, human-readable match events
(not all 135 raw incidents) sourced from the real relay data, and the
Stats tab's Today's Games shows real lineup/formation/official data for
the same game — verified via direct browser check against live data, not
just structural presence.

**Confidence scoring:**
- TASK 1 (20 pts): real fetch function, correctly cached, not over-fetching
- TASK 2 (35 pts): real, correctly-filtered event list in the bottom sheet, card-type handling honest if unconfirmed
- TASK 3 (30 pts): real lineup/officials data in Stats tab, following the established per-game pattern exactly
- TASK 4 (15 pts): real, direct browser verification against live data

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
