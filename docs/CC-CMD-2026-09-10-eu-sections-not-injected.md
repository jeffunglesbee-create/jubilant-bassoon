# Claude Code Command — Eight European competitions have an open gate and no section

**Date:** 2026-09-10
**Repo:** jubilant-bassoon
**Branch:** main — commit directly, no feature branch, no PR
**Type:** B (bug fix)
**Severity:** Live product defect. The gate fix shipped in `ec6e3859` is
necessary and not sufficient; European football still renders no cards.
**Written as the second CC-CMD required by Rule 87.4**, because the defect is
outside `CC-CMD-2026-09-07-soccer-season-gates-autoroll`'s stated scope.

## CONTEXT — measured 2026-09-10, not inferred

`ec6e3859` replaced eight hardcoded `false` values in `FIELD_V2_SOURCES` with
`_euSeasonActive()`. Verified in the deployed bundle: all eight bound, none
hardcoded false, `SW_VERSION 2026-09-09a`
(`outbox/eu-season-gate-live-manifest-2026-09-10T01-45-43-705Z.json`).

**And no card renders.** On the same probe run:

- `/v2/games?sport=eflchamp&date=2026-09-09` → **3 fixtures** on the ET date the
  app is rendering (the Championship plays midweek).
- Chip bar rendered, skeleton down:
  `ALL (55) · FREE · MLB (15) · AFL (1) · Tennis (16) · Golf (1) ·
   College Football (6) · NFL (2) · MLS (14)`.
- 15+1+16+1+6+2+14 = **55**, so the three EFL games are absent from the slate
  entirely — not merely unlabelled.

### Root cause, read from source

1. `buildFilters(allData.sports)` builds chips from **sections**, not from
   `espnScores`.
2. `injectV2SportSection(sportKey, sectionLabel)` is the only function that
   creates or merges a section into `allData.sports`. It filters `espnScores` by
   `_sport === sportKey`.
3. It is called for `cfb`, `nfl`, `wnba`, `mls` and `wc26`. **It is called for
   none of the eight European keys.**

The V2 poll loop's `enabled` list writes these games into `espnScores`. Nothing
lifts them into a section. Rule 61 end-to-end gap: data → relay → client all
work; the DOM step does not.

`SPORT_CHIP_LABELS` is not the blocker — it already carries `"Premier League"`,
`"La Liga"`, `"Serie A"`, `"Bundesliga"`, `"Ligue 1"`. Its EFL entries are
playoff-specific (`"EFL Championship Playoffs"`), which would cost a label, not a
chip.

## TASK 0 — PROBE (read from HEAD; do not trust this document)

```bash
git log --oneline -5
grep -n "injectV2SportSection(" src/legacy/field.js          # every call site
grep -n "const SPORT_CHIP_LABELS" -A 30 src/legacy/field.js  # exact label keys
grep -n "'MLS Soccer':" -B5 -A15 src/legacy/field.js         # the hardcoded soccer table
```

1. Record every existing `injectV2SportSection` call and its `sectionLabel`.
2. Record the exact `SPORT_CHIP_LABELS` keys for the five top-flight
   competitions and confirm what, if anything, exists for regular-season EFL.
3. **Determine whether any OTHER path can create a soccer section.**
   `ucl`/`europa`/`conference` have been `true` for months — find out whether
   they have ever rendered a section, and by what mechanism. If they render via
   a path this document does not know about, that path is the fix, not a new
   injection call.
4. Confirm what `_sport` value `mapV2ToESPN` stamps for each of the eight keys —
   `injectV2SportSection` filters on it, so a mismatch there is a silent no-op.

## TASK 1 — Inject a section per competition

Only after Task 0.3 establishes there is no existing path. Add beside the
existing calls, using labels that match `SPORT_CHIP_LABELS` **exactly** as read
in Task 0.2 — not as written here:

```js
if (FIELD_V2_SOURCES.epl)        injectV2SportSection('epl',        'Premier League');
if (FIELD_V2_SOURCES.laliga)     injectV2SportSection('laliga',     'La Liga');
if (FIELD_V2_SOURCES.seriea)     injectV2SportSection('seriea',     'Serie A');
if (FIELD_V2_SOURCES.bundesliga) injectV2SportSection('bundesliga', 'Bundesliga');
if (FIELD_V2_SOURCES.ligue1)     injectV2SportSection('ligue1',     'Ligue 1');
if (FIELD_V2_SOURCES.eflchamp)   injectV2SportSection('eflchamp',   'EFL Championship');
if (FIELD_V2_SOURCES.eflone)     injectV2SportSection('eflone',     'EFL League One');
if (FIELD_V2_SOURCES.efltwo)     injectV2SportSection('efltwo',     'EFL League Two');
```

**COLLISION CHECK, MANDATORY BEFORE COMMITTING.** The client carries hardcoded
soccer fixture tables whose display captions overlap these names. A section label
that collides produces a merged or duplicated section, which is the Rule 60/64
class this project has already been bitten by (`game.league` meaning two
different things — see `field-relay-nba` CONTRACTS.md). Grep every label above
against the hardcoded tables and report each result before writing any code.

## TASK 2 — Add the three missing regular-season chip labels

`SPORT_CHIP_LABELS` has only playoff EFL entries. Add regular-season keys so the
chips read `EFL Champ` / `EFL L1` / `EFL L2` rather than the full section name.
Do not touch the existing playoff entries.

## TASK 3 — Verification (inside this session, not deferred)

1. `node --check` on the **script block that actually contains
   `FIELD_V2_SOURCES`** — `index.html` has three blocks and a non-greedy match
   takes the wrong one. Search for the block by content.
2. `node smoke.js index.html` — record the real count. Baseline 1037/0.
3. Re-run `eu-season-gate-live-probe.yml` after deploy. It already reports the ET
   and UTC fixture counts and the chip list.

## DONE CONDITION (verifiable probe output)

`outbox/eu-season-gate-live-manifest-*.json` from a run whose
`relayGamesOnEtDate` shows a non-zero count for at least one of the eight, with
`europeanChipPresent` non-empty in the SAME manifest, and a committed screenshot
showing the chip.

**A run on a date with zero European fixtures does not satisfy this** — the
manifest's own verdict string already distinguishes NOT-TESTABLE-TODAY from a
pass, and the CC-CMD is not done until a real fixture produces a real chip.
Fixtures exist on the weekend of 2026-09-12–14; EFL Championship plays midweek.

## TASK 4 — Outbox manifest (last task)

`outbox/cc-session-2026-09-10-eu-sections.md`: Task 0's call-site and label
tables, the collision-check result for all eight labels, the commit SHA, the real
smoke count, and the Task 3.3 manifest showing a European chip.
