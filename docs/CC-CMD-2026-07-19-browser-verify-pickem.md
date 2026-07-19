# CC-CMD — Real browser verification: Pick 'em selection, results display, record stats

**Date:** 2026-07-19
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly if any real code fix is needed. No PRs.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }; git log --oneline -5

---

## CONTEXT

Three real fixes shipped this session (commits 529d075, e14d087, 83766ac) —
all honestly self-reported as STAGED, since the prior session's sandbox
couldn't run a real browser: the `window.makePick` bridge for the
click-to-pick flow, the Results sub-section showing resolved picks, and a
new Record-stats block (overall/by-sport/by-team). This CC-CMD closes the
real, visual gap using genuine browser automation, matching the same real
standard the Debrief card and Gap 12 verification already used tonight.

**Real, confirmed pick-cache schema** (from the prior session's own
outbox): `{ predictedWinner, sport, home, away, madeAt, resolved,
wasCorrect, resolvedProbability, probabilityLabel }`, read via
`_getPickCache()`.

---

## TASK 1 — Real click verification of the makePick fix

Using real browser automation:
1. Navigate to the real, live deployed app
2. Locate a real, current Pick 'em widget for an upcoming (PREVIEW-state)
   game
3. Click a real pick button
4. Confirm, via real DOM inspection or a real console check of
   `_getPickCache()`, that a real pick entry was genuinely created —
   correct `predictedWinner`, `sport`, `home`, `away` fields, `resolved:
   false`

Report the real, literal outcome — if the click does nothing or throws,
describe exactly what happened (console error text, no visible change,
etc.), not just pass/fail.

## TASK 2 — Real display verification of Results + Record stats

A genuinely resolved pick won't exist naturally without waiting for a real
game to finish. To test the real display logic directly and quickly, seed
one real, schema-accurate resolved entry directly into the pick cache via
the browser's own console/JS execution (matching the confirmed real
schema above) — this tests real rendering logic against real, correctly-
shaped data, not a live game dependency:

```js
// Real, schema-accurate seed — adapt the exact storage key/write function
// to whatever _getPickCache()/its real counterpart actually uses; confirm
// the real, current storage mechanism first via source inspection rather
// than guessing.
```

After seeding, reload the page and confirm via real screenshot/DOM
inspection:
1. The Results sub-section is visible and shows the seeded pick with
   correct correct/incorrect display
2. The Record stats block appears above it, showing a real Overall W-L
   line, a By Sport breakdown, and a By Team breakdown — all reflecting
   the seeded real data correctly
3. If more than one sport/team is seeded, confirm real sort-by-volume
   ordering is correct

Report the real, literal outcome, including a real screenshot if the tool
supports it.

## TASK 3 — If either test reveals a real bug

Fix it as a real, direct, minimal change — matching tonight's established
discipline (find the precise root cause via direct inspection, don't
guess, verify the fix against the same real failing case).

---

## DONE CONDITION

Real, visual/DOM-level confirmation (not just structural code presence)
that clicking a pick genuinely registers it, and that the Results and
Record-stats sections genuinely render correct content from real,
schema-accurate data — not assumed from the prior session's own structural
verification alone.

**Confidence scoring:**
- TASK 1 (40 pts): real click-to-pick confirmed via DOM/console inspection, literal outcome reported
- TASK 2 (45 pts): real seeded-data display confirmed via screenshot/DOM inspection, literal outcome reported
- TASK 3 (15 pts): any real bug found is fixed and re-verified against the same case

Do not commit unless confidence >= 95 (if a code fix is needed). If no code fix is needed, report the real verification outcome directly.
