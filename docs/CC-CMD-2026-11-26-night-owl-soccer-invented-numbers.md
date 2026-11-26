# CC-CMD-2026-11-26-night-owl-soccer-invented-numbers

**Repo:** jubilant-bassoon (the client). Symptom read from the relay's archive (`briefs` table), cause to be measured in `src/legacy/field.js`.
**Branch:** main — commit directly, no feature branch, no PR. Edit target for JS is `src/legacy/field.js` only.
**Status:** PARTIAL — Task 0 done and Task 1 built and deployed 2026-11-26 (`5d98ffb`, then `287b368`; the owner's "Fix the invented numbers"); the done condition is a count in the briefs table after the deploys, read by the follow-up armed for 2026-11-30 12:13Z. Task 2 (a soccer voice for the labels that reach none) is in `docs/CC-CMD-2026-11-26-night-owl-sport-label-predicates.md`, blocked on this done condition.
**Filed by:** CC, as the second CC-CMD of `docs/CC-CMD-2026-11-26-night-owl-soccer-margin-unit.md` (Rule 87.4), the open item its Task 2 recorded: fixing the "series" wording left a neighbouring defect in the same prompt untouched.

One-liner:
```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git pull. Read docs/CC-CMD-2026-11-26-night-owl-soccer-invented-numbers.md. Execute all tasks.
Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```

---

## What was seen (2026-11-26; briefs table, read-only counts, no text copied)

Of 452 soccer `night_owl` briefs (2026-10-27 to 2026-11-26), **233 mention "xG" and 258 mention "possession"**; by label, xG in the EFL Championship 48 of 89, EFL League One 29 of 65, EPL 21 of 62, La Liga 31 of 46, Serie A 31 of 42, Bundesliga 23 of 36, MLS 16 of 34, **EFL League Two 5 of 18**. The relay's registry has no BSD analytics for League One or League Two (`bsdLeagueId: null`; `LOWER_SOCCER` in `src/analytics-engine.js` exists because "no xG, shotmap, or momentum context available"), and the Night Owl snapshot of a soccer game's stats (`statCtx`, built when the game goes final) adds box context only for NBA and NHL.

## What the prompt says (read from the code, not run)

The fallback prompt's terms line for soccer ends "Use: shots, possession, xG, clean sheet ..." and, with no stat context, its rule reads "No box stats available — write from score, margin, and drama context only. **Every sentence must include a specific number** (final score, margin, or drama peak if meaningful)". With the series wording fixed (`b8be893`), the number requirement is the pressure left on a prompt that holds a score and a margin: a model that must put a number in every sentence of an 80 to 100 word recap, and is told to use possession and xG, will supply them.

## Result 2026-11-26

**Task 0 (done; `scripts/probe-night-owl-soccer-numbers.mjs`, artifact `outbox/night-owl-soccer-prompt-numbers-2026-11-26.json`, brief counts `outbox/night-owl-brief-counts-by-sport-2026-11-26.json`).** The probe cuts the real `_terms` chain, the P6B `[MATCH STATS]` gate and the no-box-stats pair out of `src/legacy/field.js` and runs them for the 19 soccer labels the client builds. Read from the source, not run on the page.
- **No xG figure can enter any soccer prompt.** `xG` appears twice in the whole function, both inside the two soccer vocabulary strings; the saved stat snapshot (`saveEspnFinal`) has no soccer branch. The 0.1 "STOP if the figures ARE in the prompt" condition is false.
- **Possession, shots and corners enter for 2 labels of 19:** only `MLS Soccer` and `FIFA World Cup 2026` pass the P6B gate (`soccer`, `wc26`, `world cup`, `epl`, `mls`, `ucl` as substrings of the lower-cased label; "Premier League" and "UEFA Champions League" contain none of `epl` and `ucl`). All 19 vocabulary lists said "Use: shots, possession, xG".
- **The share (0.2):** in the 11 labels with briefs and no such line, **270 of 439 briefs (61.5%) carry an xG mention or possession with a % sign** (xG alone: 227 of 439). League Two 6 of 18, League One 35 of 65, EFL Championship 55 of 89, La Liga 35 of 46. Pattern counts, an upper bound per brief (a "possession" and a "%" can sit in unrelated sentences), not a parse.
- **Found on the way and filed:** a College Football brief says "xG" and "clean sheet" because the same prompt sent it to the soccer vocabulary, margin unit and voice, and nine of 26 labels reach the wrong voice or none: `docs/CC-CMD-2026-11-26-night-owl-sport-label-predicates.md`.
- **A second source of the pressure, not in the CC-CMD's hypothesis:** `getQualityTarget(sport)` appends "use more specific numbers (ERA, OPS, pitch counts, percentages, scores)" and "add more specific facts (names, numbers, stats with units)" when a browser's stored brief scores average low on stat depth, and a soccer prompt with no figures scores low by construction. Read from the code only: the stored scores are per browser.

**Task 1 (built, two commits, both single-concern).**
- `5d98ffb`: `owlSoccerNumbersRule(sport, statCtx)` (`field_utils.js`, identical inline copy), naming the kinds with no figure in the prompt's own stat context by the labels the `[MATCH STATS]` builder writes; in both prompts, and in the fallback AFTER the voice block (`FIELD_SOCCER_VOICE` says "If xG is available, cite it"). The soccer no-stats rule now reads "Cite a figure only where it is written above; a sentence with no number is fine." The two soccer vocabulary lists lose "shots, possession, xG". The other sports' lines, and the non-soccer branch of the no-stats pair, are unchanged (A747 pins the non-soccer branch and the NHL line).
- `287b368`: `owlSoccerNoFigures(sport, statCtx)`; the fallback prompt leaves `getQualityTarget` out for a soccer prompt that carries none of the four, and only that case.

**Tests.** `field_unit.js` +12 over the two commits (86 to 98); smoke **A747** (runs the real vocabulary chain for every soccer label, the no-stats pair, the placement of the rule and of the coaching omission, and that the three inline copies equal `field_utils.js`); `scripts/mutate-night-owl-soccer-numbers.mjs`: **26 of 26 mutants red**, each naming A747 or the unit test it breaks. Smoke 1086 passed, 0 failed at both commits. `SW_VERSION` 2026-11-26c and 2026-11-26d.

**Deploy.** Deploy gate run `45905479701` (`5d98ffb`), success, "Deploy to Cloudflare Workers" 22:34:13Z to 22:34:30Z, live-site confirm 22:34:31Z. Run `45905977465` (`287b368`), success, deploy step from 22:38:38Z, run complete 22:38:56Z. The boundary for the done condition below is `2026-11-26 22:39:00`, after both.

**What is not claimed.** That the briefs are fixed. Nothing has been written since the deploy (a brief is written when someone has the page open as a game goes final). Whether the rule alone is enough, or the quality chain's own retries re-introduce figures, is what the count below answers. The relay's quality chain scores stat depth and retries below its threshold; a soccer prompt that no longer demands numbers may now score lower there, so the mean `quality_score` is read beside the count (before: 163.7 EFL Championship, 166 League One, 168.1 EPL, 164.6 La Liga, 165.5 Serie A, 165.6 Bundesliga, per the counts file).

## Task 0 — Probe first (Rule 68, Rule 100). Write nothing until the artifact exists (done, see Result)

0.1 **Are the numbers in the input?** For one soccer game in each of EPL, EFL Championship, EFL League One and EFL League Two, build the Night Owl prompt exactly as `fetchNightOwlFromClaude` and the queue site do (the CI-as-proxy Playwright pattern of Rule 90, or the function run in a Node sandbox with the game object the page holds) and write, counts only, whether the assembled prompt contains an xG figure, a possession figure and a shots figure. Artifact `outbox/night-owl-soccer-prompt-numbers-<date>.json`.
0.2 **Which briefs carry numbers the prompt did not?** From 0.1: for a league with no figure in the prompt (League Two is the expected one), the share of its briefs that nevertheless carry an xG or possession figure is the invented share; write it beside the table.
If 0.1 shows the figures ARE in the prompt for every league, STOP: the briefs are grounded, report verbatim, and close this CC-CMD with that result.

## Task 1 — Only if Task 0 shows invented numbers (BUILT 2026-11-26, see Result)

Make "every sentence must include a specific number" and the "Use: shots, possession, xG" list conditional on the number being in the data above (a soccer prompt with no stat context asks for the score, the margin and the form it was given, and says that no other figure exists). Do not touch another sport's prompt. Add the source-derived smoke assertion and unit tests the way A745 and A746 do, and show each red on a deliberate break first (Rule 90).

## Done condition (Rule 89)

After the deploys and a day of soccer finals: for the 11 labels Task 0 found to have no figure in the prompt (EPL, La Liga, Serie A, Bundesliga, Ligue 1, UEFA Champions / Europa / Conference League, EFL Championship, League One, League Two; the briefs table stores the Premier League as `EPL`), the count of `night_owl` briefs created after `2026-11-26 22:39:00` that carry an xG mention or possession with a % sign is **0**, with a non-zero number of briefs read. Query (read-only, counts only): `SELECT sport, COUNT(*) n, SUM(brief_text LIKE '%xG%' OR (brief_text LIKE '%possession%' AND brief_text LIKE '%\%%' ESCAPE '\')) invented, ROUND(AVG(quality_score),1) avg_q FROM briefs WHERE brief_type='night_owl' AND created_at >= '2026-11-26 22:39:00' AND sport IN (<the 11 labels>) GROUP BY sport`. Artifact `outbox/night-owl-soccer-numbers-after-<date>.json` beside `outbox/night-owl-soccer-prompt-numbers-2026-11-26.json`. `MLS` and the World Cup are excluded: they can carry real possession and shots. A residual above 0 is investigated first (Rule 77): the times against the deploy, then the relay's quality-chain retry prompts, before anything else is changed.

## Not in scope

The other sports' Night Owl prompts, the relay's briefs, the quality threshold, and whether a lower-league recap should be 80 to 100 words at all (a product question for the owner).
