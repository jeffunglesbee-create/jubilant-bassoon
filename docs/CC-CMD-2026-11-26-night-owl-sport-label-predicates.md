# CC-CMD-2026-11-26-night-owl-sport-label-predicates

**Repo:** jubilant-bassoon (the client). Symptom read from the relay's archive (`briefs` table), cause read from `src/legacy/field.js` and run from the source.
**Branch:** main — commit directly, no feature branch, no PR. Edit target for JS is `src/legacy/field.js` only.
**Status:** PARTIAL 2026-11-26 — Tasks 0, 1 and 3 built and deployed (see Result); Task 2 BLOCKED on the invented-numbers done condition (unblock criteria below); the done condition for Task 1 is a count in the briefs table, read by the armed follow-up.
**Filed by:** CC, as the third CC-CMD of `docs/CC-CMD-2026-11-26-night-owl-soccer-margin-unit.md` (Rule 87.4). Found by Task 0 of `docs/CC-CMD-2026-11-26-night-owl-soccer-invented-numbers.md`: counting xG mentions per sport showed 6 of 13 College Football briefs saying "xG", which no football-code prompt should.

One-liner:
```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git pull. Read docs/CC-CMD-2026-11-26-night-owl-sport-label-predicates.md. Execute all tasks.
Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```

---

## BUILD-ON-A check (2026-11-26)

Searched `docs/CC-CMD-*.md` by content (`college football`, `cfb`, `getFieldVoice`, `FIELD_SOCCER_VOICE`, `getQualityTarget`, `includes('football')`). The only hit that bears on this is one sentence in `docs/CC-CMD-2026-11-26-night-owl-soccer-margin-unit.md`, Task 1: "`College Football` still gives `goal` in the fallback chain, as before: its `includes('football')` test, an existing quirk this CC-CMD does not touch." That is a recorded exclusion, not a ruling, hold or VOID window; this CC-CMD is the follow-up it named. Nothing here undoes or works around a ruling.

## What was seen (2026-11-26; `briefs` table, read-only counts, no text copied; `outbox/night-owl-brief-counts-by-sport-2026-11-26.json`)

Night Owl briefs 2026-10-27 to 2026-11-26, sport = `College Football`: **13 briefs, all dated 2026-11-14; 12 mention "goal", 4 "clean sheet", 6 "xG", 0 "touchdown"**, 2 mention "points". A football game with no touchdown and a clean sheet is a soccer prompt.

## Cause, run from the source (`scripts/probe-night-owl-sport-label-branches.mjs`, artifact `outbox/night-owl-sport-label-branches-2026-11-26.json`)

The Night Owl fallback prompt chooses a sport's vocabulary three times from the game's `_sport` label with substring tests: the `_terms` line, the margin unit and `getFieldVoice`. The probe cuts the three real expressions out of the source and runs them for the 26 labels the client builds (`V2_SECTION_LABEL` plus the `SOCCER_LEAGUES` sections): **9 of 26 labels land on the wrong sport or on none.**

| label | vocabulary line | margin unit | voice |
|---|---|---|---|
| College Football | **soccer** | **goal** | **soccer** |
| Australian Football (AFL) | AFL (correct) | point (correct) | **soccer** |
| Premier League, UEFA Champions League, Europa League, Conference League, and the three Qualifying labels (7) | soccer (correct) | goal (correct) | **none** |

The soccer branch of the vocabulary line and of `getFieldVoice` tests `includes('football')`, and so does the fallback margin unit; "College Football" and "Australian Football (AFL)" contain it. The seven soccer labels reach no voice because `getFieldVoice` tests the codes (`epl`, `ucl`, `uel`) and the labels are display strings ("Premier League", "UEFA Champions League").

`getQualityTarget(sport)` has the same two faults in its own table: its soccer tags (with bare `football`) are listed before NFL, AFL and CFL, so College, Australian and Canadian football match soccer first; and its coaching text names the sport "soccer" for every key except MLB, NHL and NBA/WNBA, so an NFL, AFL, CFL or tennis game is coached on "recent soccer briefs". Read from the code; the stored scores are per browser and cannot be read from here.

## Result 2026-11-26

**Task 0 (done):** the two artifacts above and the probe.

**Task 1 (built):** `isNonSoccerFootballLabel` in `field_utils.js` with its identical inline copy in `src/legacy/field.js` (smoke A191): true for a label with the word "football" and one of college, ncaa, american, canadian, australian. Used at the fallback margin unit (`!isNonSoccerFootballLabel(_sp) && _sp.includes('football')`) and in `getFieldVoice`'s soccer clause. The `_terms` line sends `college football`, `ncaa football` and `cfb` to the American football line. After: College Football gets `Sport: American Football`, `MARGIN: N-points`, the American football voice; Australian Football gets its own voice; every soccer label keeps what it had (`outbox/night-owl-sport-label-branches-after-2026-11-26.json`: 7 mismatches left, all the soccer-voice case of Task 2).

**Task 3 (built):** `getQualityTarget`'s sport table gains `cfb`, puts `soccer` last, and its coaching text names the sport from a map (MLB, NHL, NBA/WNBA, NFL, college football, AFL, CFL, tennis, soccer).

**Tests:** `field_unit.js` +5 (103 pass); smoke **A748** (the three expressions, run for College / NCAA / CFB, Australian, Canadian, eight soccer labels and four other sports, plus the inline helper identical to the pure one) and **A749** (the real `getQualityTarget` run with a stored-scores stub for 15 labels, each coached on the right sport and no other); `A745` now passes the helper to its margin chain. Smoke 1088 passed, 0 failed. `scripts/mutate-night-owl-sport-label-predicates.mjs`: **19 of 19 mutants red** (the first run reported one anchor that occurred twice and one unit gap, the missing "football word required" test; both fixed before this count). `SW_VERSION` 2026-11-26e.

## Task 2 — A soccer voice for the seven labels that reach none (BLOCKED, Rule 74)

What: `getFieldVoice` should return `FIELD_SOCCER_VOICE` for Premier League and the UEFA labels (the soccer clause tests `epl`, `ucl`, `uel`, `uecl`, none of which is in a display label; `isSoccerSportLabel` is the right test). Blocked by: that voice says "Expected goals (xG) tell you more than the scoreline. If xG is available, cite it." and gives "72% possession" as its example, and adding it to about 130 briefs a month (Premier League 62, Europa League 42, Conference League 21, Champions League 6) before the invented-numbers fix (`docs/CC-CMD-2026-11-26-night-owl-soccer-invented-numbers.md`) has been read would extend the voice that invites the numbers. Unblocked when: that CC-CMD's done condition reads 0 with a non-zero number of briefs (read by the follow-up armed for 2026-11-30 12:13Z). Verify after: `node scripts/probe-night-owl-sport-label-branches.mjs` prints `"mismatches": 0`, and A748 gains the seven labels.

## Done condition for Task 1 (Rule 89)

After the deploy, `night_owl` briefs with sport `College Football` created after the deploy: those matching `goal` or `clean sheet` or `xG` is **0** with a non-zero number of briefs read; artifact `outbox/night-owl-college-football-after-<date>.json`. College football is in season through the bowl games (to mid-January), so a Saturday finishes the read; if the count of briefs is 0, re-arm, never call it passed on zero rows.

## Not in scope

The soccer prompts (the invented-numbers CC-CMD), the relay's briefs, the `getQualityTarget` thresholds and scale, and a single sport-class function replacing the three substring chains (a refactor; its own prompt, commit and smoke run, Rule 69).
