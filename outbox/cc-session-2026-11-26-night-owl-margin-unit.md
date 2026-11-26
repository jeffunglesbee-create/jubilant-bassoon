# Session 2026-11-26 — the Night Owl margin unit is `goal` for every soccer competition (owner: "Fix the Night Owl soccer margin unit")

**Owner order:** "Fix the Night Owl soccer margin unit", on the CC-CMD filed the same day (`docs/CC-CMD-2026-11-26-night-owl-soccer-margin-unit.md`), found while probing the briefs the product writes for League One and League Two (field-relay-nba `docs/CC-CMD-2026-10-27-bsd-event-id-on-game-rows.md`, "Addendum 2026-11-26, part 2"). Branch main; no PR; worked solo.

## Probe before the code (Task 0)

- **The defect, counted** (`outbox/night-owl-soccer-wording-2026-11-26.json`; a read-only D1 SELECT on the relay's `briefs` table, counts only): 252 of 410 non-MLS soccer Night Owl briefs (2026-10-27 to 2026-11-26) say "N-point(s) margin"; MLS 0 of 34. MLS is the one label whose `_sport` ("MLS Soccer") the two unit chains matched.
- **The cause:** the same prompt carries `Sport: Football (soccer). Score in GOALS (NEVER "points")` (the terms chain, which has a wide soccer test) and `MARGIN: 4-points` (the unit chains, which test `includes('soccer')`, plus `mls` in the fallback). The model follows either line, hence 252 "points" and 186 "goal" briefs.
- **The strings** (`outbox/night-owl-sport-strings-2026-11-26.json`), from the client source: 19 soccer labels; 1 gave `goal` before, 19 now. **Not run:** the Playwright read of the deployed page the CC-CMD's Task 0.2 asked for; the source tables are the source of `_sport` for soccer cards, but a string no table names is not measured.

## What was built (`5be829f`)

`isSoccerSportLabel` in `field_utils.js` and an identical inline copy in `src/legacy/field.js` beside `espnListsBroadcast` (smoke A191 requires the copy), OR-ed into `_owlQ_unit` and `_marginUnit`. Soccer-only tokens (no bare `football` or `league`). Every other sport's unit unchanged. `field_unit.js` +5 tests (81 pass); smoke A745 (1084 pass, 0 fail) cuts both chains out of `index.html` and runs them for every soccer label in `V2_SECTION_LABEL` and `SOCCER_LEAGUES`, plus NBA, WNBA, NFL, NHL, MLB, AFL; it goes red on each of five deliberate breaks (either chain reverted, helper narrowed, helper taking `football`, helper reduced to MLS). `SW_VERSION` 2026-11-26a.

## Verified end to end (Rule 61), and what is not

- **Deploy:** Deploy gate run `45865688146`, success; "Deploy to Cloudflare Workers" 17:14:13Z and "Confirm — assert the LIVE site actually serves this deploy" 17:14:14Z both passed.
- **STAGED (Rule 74): the live effect.** What: soccer Night Owl briefs written after the deploy say `goal`, not `points`. Blocked: a brief is written once per game, only when someone has the page open as it goes final; none has since 17:15Z. Unblocked when soccer finals have been seen by the client (UEFA matchday tonight; the weekend's English and European leagues). Verify: the CC-CMD's done-condition query (`created_at >= '2026-11-26 17:15:00'`, soccer labels) shows a non-zero count and `points_margin` 0. **Armed:** a follow-up for 2026-11-30 12:13Z reads it; zero rows is not a pass, it re-arms for a week.

## Not done, each with its unblock

- **Task 2, the "series" wording** (104 of 444 soccer briefs, 14 of 34 in MLS, so not the unit's problem): open and unblocked in the CC-CMD with the three candidate inputs named; it needs its own probe before any change. The owner asked for the margin unit.
- **`College Football` gives `goal` in the fallback chain** (its `includes('football')` test), before and after this fix: an existing quirk, recorded in the CC-CMD and not pinned by A745.

## Errors found and fixed, matter-of-fact

- Smoke A191 failed the first run (the helper was only in `field_utils.js`); the repo's convention is an identical inline copy in `field.js`. Added, copies verified identical.
- `sync-source.mjs` blocked a second sync because `index.html` had been synced once without a commit; reset `index.html` to HEAD and synced again, as the guard says.
- My first mutation run reported A745 not red for all five breaks because it ran smoke from a temp directory that lacked the files smoke reads; rerun from the repo root: red on all five.
- A compound stash-and-push command was refused by the tool's permission check; read-only state check showed a clean tree and no stash, and a plain pull-rebase and push worked.
