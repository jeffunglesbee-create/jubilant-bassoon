# CC-CMD-2026-11-26-night-owl-soccer-invented-numbers

**Repo:** jubilant-bassoon (the client). Symptom read from the relay's archive (`briefs` table), cause to be measured in `src/legacy/field.js`.
**Branch:** main — commit directly, no feature branch, no PR. Edit target for JS is `src/legacy/field.js` only.
**Status:** FILED 2026-11-26. UNBLOCKED: Task 0 reads only.
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

## Task 0 — Probe first (Rule 68, Rule 100). Write nothing until the artifact exists

0.1 **Are the numbers in the input?** For one soccer game in each of EPL, EFL Championship, EFL League One and EFL League Two, build the Night Owl prompt exactly as `fetchNightOwlFromClaude` and the queue site do (the CI-as-proxy Playwright pattern of Rule 90, or the function run in a Node sandbox with the game object the page holds) and write, counts only, whether the assembled prompt contains an xG figure, a possession figure and a shots figure. Artifact `outbox/night-owl-soccer-prompt-numbers-<date>.json`.
0.2 **Which briefs carry numbers the prompt did not?** From 0.1: for a league with no figure in the prompt (League Two is the expected one), the share of its briefs that nevertheless carry an xG or possession figure is the invented share; write it beside the table.
If 0.1 shows the figures ARE in the prompt for every league, STOP: the briefs are grounded, report verbatim, and close this CC-CMD with that result.

## Task 1 — Only if Task 0 shows invented numbers

Make "every sentence must include a specific number" and the "Use: shots, possession, xG" list conditional on the number being in the data above (a soccer prompt with no stat context asks for the score, the margin and the form it was given, and says that no other figure exists). Do not touch another sport's prompt. Add the source-derived smoke assertion and unit tests the way A745 and A746 do, and show each red on a deliberate break first (Rule 90).

## Done condition (Rule 89)

After the deploy and a day of soccer finals: for the labels Task 0.1 found to have no figure in the prompt, the count of `night_owl` briefs created after the deploy that match `xG` or `possession` is **0**, with a non-zero number of briefs read; artifact `outbox/night-owl-soccer-numbers-after-<date>.json` beside the first.

## Not in scope

The other sports' Night Owl prompts, the relay's briefs, the quality threshold, and whether a lower-league recap should be 80 to 100 words at all (a product question for the owner).
