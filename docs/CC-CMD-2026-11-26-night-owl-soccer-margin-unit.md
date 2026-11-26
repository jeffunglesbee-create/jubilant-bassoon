# CC-CMD-2026-11-26-night-owl-soccer-margin-unit

**Repo:** jubilant-bassoon (the client). The symptom is read from the relay's archive (field-relay-nba `GET /archive/query`), the cause is in `src/legacy/field.js`.
**Branch:** main — commit directly, no feature branch, no PR. Edit target for JS is `src/legacy/field.js` only (the pre-commit hook syncs `index.html`).
**Status:** PARTIAL — Tasks 0, 1, 2 and 3 landed 2026-11-26 (the margin unit in `5be829f`, the series wording in `b8be893`, on the owner's "Fix the Night Owl soccer margin unit" and "Fix the series wording"); both done conditions are counts in the briefs table after the deploys and are read by an armed follow-up (2026-11-30).
**Filed by:** CC, as the second CC-CMD of field-relay-nba's `docs/CC-CMD-2026-10-27-bsd-event-id-on-game-rows.md`, "Addendum 2026-11-26, part 2" (Rule 87.4: out-of-scope work gets its own CC-CMD before the first is closed). Found while probing which briefs the product already writes for the EFL League One and League Two.

One-liner:
```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git pull. Read docs/CC-CMD-2026-11-26-night-owl-soccer-margin-unit.md. Execute all tasks.
Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```

---

## What was seen (2026-11-26, relay routes read with `probe_relay_route`, no vendor call)

Night Owl briefs (`brief_type` = `night_owl`, `source` = `client`) for soccer say things a soccer match cannot have:

| brief id | label | what it says | what the match was |
|---|---|---|---|
| `night_owl_2026-11-25_espn:401879237` | EPL | "establishing a **4-points margin**", "improves Brentford to a **1-0 record in this specific series matchup**" | a league match, 4-0 |
| `night_owl_2026-11-25_espn:401880823` | EFL League One | "a **0-points margin**", "the 1-1 draw ... **0-points margin**" | a 1-1 draw |
| `night_owl_2026-11-25_espn:401880824` | EFL League One | "the latest chapter in their **2024 series record**" | a league match |
| `night_owl_2026-11-26_espn:401880139` | EFL Championship | "a **2-goal margin**" and also "the aggregate series" | a league match, 2-0 |
| `night_owl_2026-11-24_espn:401879234` | EPL | "a **2-goal margin** that dictates the current **series record**" | a league match, 2-0 |

The same sport gets "points" in one brief and "goal" in another, and "series" wording in league matches in all of them. Quality scores stored on these briefs are 147 to 182 (the relay's threshold elsewhere is 240).

## Cause, read from the code (a hypothesis until Task 0 measures it)

`src/legacy/field.js` derives the margin unit from the game's `_sport` string in two places, both with `includes('soccer')` and no league names:
- the queue prompt, `_owlQ_unit` (~L40032): `run` for baseball or mlb; `goal` for hockey, nhl or **soccer**; otherwise **`point`**;
- the fallback, `_marginUnit` (~L40243): the same, plus `football` and `mls`.

`_sport` for a soccer game is often a display label with no "soccer" in it (L9351 to L9480 set `"Premier League"`, `"La Liga"`, `"Ligue 1"`, `"UEFA Champions League"`; only `"MLS Soccer"` contains it). Such a game falls through to `point`, and the prompt then says `MARGIN: 4-points`. The model repeats it. The "series" wording has two inputs in the same function: `game.seriesRecord` / `game.matchupNote` in the queue prompt, and the `[SERIES CONTEXT] Viewer has watched N prior game(s) in this series live` line (~L40520), which is written for any matchup the viewer has watched, a league fixture included.

The client already has the classifier: `detectSportClass(sport)` (~L25957) returns `'soccer'` for `league`, `liga`, `ligue`, `efl`, `epl`, `serie`, `bundesliga`, `ucl`, `fa cup`. It is also known to be loose (its `football` test returns `soccer` before the NFL test). Do not reuse it blind.

## Result 2026-11-26 (Tasks 0, 1, 3 for the margin unit)

**Task 0.1 — the defect, counted** (`outbox/night-owl-soccer-wording-2026-11-26.json`, a read-only D1 SELECT on `briefs`, counts only): of 444 soccer Night Owl briefs 2026-10-27 to 2026-11-26, 252 say "N-point(s) margin", all of them in the 410 non-MLS briefs; **MLS, the one label whose `_sport` ("MLS Soccer") the chains matched, has 0 of 34.** EPL 45 of 62, EFL Championship 48 of 89, EFL League One 42 of 65, Europa League 26 of 34, Bundesliga 23 of 36, Serie A 23 of 42, La Liga 22 of 46, EFL League Two 12 of 18, Ligue 1 8 of 12, Champions League 3 of 6. The "goal margin" briefs of those labels are the model following the same prompt's other line (`Sport: Football (soccer). Score in GOALS (NEVER "points")`, the terms chain, which already used a wide soccer test) over the `MARGIN:` line.

**Task 0.2 — the strings** (`outbox/night-owl-sport-strings-2026-11-26.json`): read from the client SOURCE (`V2_SECTION_LABEL`, the V2 injector's table, and the `SOCCER_LEAGUES` sections), not from the deployed page: 19 soccer labels, of which **1 gave `goal` before (MLS Soccer) and 19 give it now**, in both chains. The hypothesis held (not every soccer `_sport` contains "soccer"), so the CC-CMD went on. **Not run, and said plainly:** the Playwright read of the live page. A `_sport` that reaches a game from somewhere no table names is therefore not measured; `field_unit.js` covers the relay's labels (`EPL`, `MLS`, `UEFA Europa Conference League`) that arrive as `game.league`.

**Task 1 — built:** `isSoccerSportLabel` in `field_utils.js` with its identical inline copy in `src/legacy/field.js` (smoke A191 requires the inline copy), OR-ed into `_owlQ_unit` and `_marginUnit`. Soccer-only tokens; no bare `football` or `league`. Every other sport's unit is unchanged (the check below). `College Football` still gives `goal` in the fallback chain, as before: its `includes('football')` test, an existing quirk this CC-CMD does not touch.

**Task 3 — tests:** `field_unit.js` 5 tests (81 pass); smoke **A745** cuts both chains out of `index.html` and runs them for every soccer label in `V2_SECTION_LABEL` and `SOCCER_LEAGUES` plus NBA, WNBA, NFL, NHL, MLB and AFL; it went red on each of five deliberate breaks (either chain reverted, the helper narrowed, the helper taking `football`, the helper reduced to MLS). Smoke 1084 passed, 0 failed. `SW_VERSION` 2026-11-26a in `field.js` (synced to `index.html`) and `sw.js`.

**Deploy:** Deploy gate run `45865688146` on `5be829f`, success; its steps "Deploy to Cloudflare Workers" (17:14:13Z) and "Confirm — assert the LIVE site actually serves this deploy" (17:14:14Z) both passed. So `<deploy time>` below is `2026-11-26 17:15:00`.

**Done condition, still to read** (Rule 89): after the deploy and soccer finals, the count of soccer `night_owl` briefs created after the deploy that match `-points? margin` must be **0** with a non-zero number of briefs read. Query (read-only, counts only): `SELECT COUNT(*) n, SUM(brief_text LIKE '%-point margin%' OR brief_text LIKE '%-points margin%') points_margin FROM briefs WHERE brief_type='night_owl' AND created_at >= '2026-11-26 17:15:00' AND sport IN (<the soccer labels>)`. A brief is written once per game (`night_owl_<date>_espn:<id>`), so only games that go final after the deploy can show the fix.

## Task 0 — Probe first (Rule 68, Rule 100). Write nothing until both artifacts exist (done for the unit, see Result)

0.1 **The defect, counted.** For each soccer label (`EPL`, `MLS`, `La Liga`, `Serie A`, `Bundesliga`, `Ligue 1`, `UEFA Champions League`, `UEFA Europa League`, `EFL Championship`, `EFL League One`, `EFL League Two`, `EFL Cup`, `FA Cup`), read the last 30 days of `night_owl` briefs through `/archive/query?sport=<label>&brief_type=night_owl&limit=50&offset=N` (page until `hasMore` is false) and count per label: briefs, those matching `/\b\d+-points? margin/i`, those matching `/\b\d+-goals? margin/i`, those matching `/series (record|matchup)|aggregate series/i`. Write the table, with the dates read and the number of pages, to `outbox/night-owl-soccer-wording-<date>.json` (counts only). A runner may do this: the route is open and read-only.
0.2 **The cause, measured.** The two paths read `_sport`. Which strings does it hold for each soccer competition on the live page? Use the CI-as-proxy pattern of Rule 90 (a workflow triggered by an `outbox/.trigger-*` push, a real Chromium against the deployed URL, a committed manifest of booleans and strings), loading a soccer-heavy day and reading, for each soccer card, `game._sport`, `game.league` and what `detectSportClass` returns, plus the `MARGIN:` line each path would build. Reference implementation: `ambient-skeleton-probe.yml`. Write `outbox/night-owl-sport-strings-<date>.json`. If the strings contain "soccer" for every soccer game, STOP: the hypothesis is false, report verbatim, and re-read 0.1 for the real cause.

## Task 1 — One unit function, used at both sites (only if Task 0 confirms)

Add a small pure function that maps a `_sport` string to `run`, `goal` or `point` and replace the two inline chains with calls to it. It must give `goal` for every soccer competition in Task 0.2's table and for hockey, nhl, `mls`; `run` for baseball or mlb; `point` for everything else, **exactly as today** for each sport that works today (NBA, WNBA, NFL, CFL, AFL, golf, tennis). It must not say `goal` for American or Canadian football (the fallback's `football` test says it today; leave that behaviour as it is and record it in the outbox as a separate finding).
Do NOT touch `detectSportClass`, any other function, or `index.html` directly.

## Task 2 — No "series" in a league fixture (LANDED 2026-11-26, `b8be893`)

**The hypothesis of this CC-CMD was wrong, and reading the prompt found the real cause.** The three inputs named above do not reach a soccer league fixture: `game.seriesRecord` is empty for it, the `[SERIES CONTEXT]` line is gated on `topGame.seriesRecord` being non-empty and not `0-0`, and the soccer `statCtx` holds nothing (the snapshot adds box context only for NBA and NHL). What does reach it are **two unconditional instructions in the fallback prompt** (`src/legacy/field.js`, the `prompt` array of the Night Owl fallback):
1. the closing rule `- Explain what tactically swung the game. Series implication. Plain prose.`;
2. when there is no stat context (always, for soccer): `- No box stats available — write from score, margin, series record, and drama context only. Every sentence must include a specific number (final score, margin, series record, or drama peak if meaningful).`
For a match with no series record the second asks the model to invent one, and it did: "improves Brentford to a 1-0 record in this specific series matchup", "2024 series record", "the aggregate series". The relay's code holds none of this text (grepped, `src/*.js`). Task 0.1's counts agree: 104 of 444 soccer briefs carry the wording, **14 of 34 in MLS**, so it was never the unit's problem.

**Built:** `owlNoSeriesRule(sport, seriesRecord)` (`field_utils.js`, identical inline copy in `field.js` for smoke A191): a rule barring series, head-to-head, aggregate and earlier-season claims for a soccer sport whose `seriesRecord` is empty or `0-0`; `''` for every other sport and for a soccer game with a real record. The fallback prompt drops both instructions when it is non-empty (the no-box-stats rule then reads "write from score, margin, and drama context only ... (final score, margin, or drama peak if meaningful)") and carries the rule; the queue prompt carries the rule. **Every other sport's prompt is byte-for-byte what it was**, so NBA, NHL and MLB keep "Series implication" (MLB's three-game set is a real series; whether the other sports' regular-season games should keep it is not this CC-CMD's question).

**Tests:** `field_unit.js` 86 pass (5 new); smoke **A746** cuts the real closing-rule expression and the no-box-stats branches out of `index.html` and runs them, checks both prompts carry the rule, and runs the helper over every soccer label in `V2_SECTION_LABEL` and `SOCCER_LEAGUES`; smoke 1085 passed, 0 failed. A746 and the unit tests went red on each of eight deliberate breaks (the closing rule unconditional again, the no-box-stats branch keeping "series record", the rule missing from either prompt, the rule never firing, the helper always empty, the helper without its soccer guard, the helper ignoring a real record). `SW_VERSION` 2026-11-26b. **Deploy:** gate run `45896676592`, success; "Deploy to Cloudflare Workers" 21:15:44Z and the live-site confirm 21:15:45Z.

**Done condition, still to read:** soccer `night_owl` briefs created after `2026-11-26 21:16:00` that match `series record`, `series matchup` or `aggregate series`: **0**, with a non-zero number of briefs read (query: the Task 0.1 SELECT with `created_at >= '2026-11-26 21:16:00'`). **Not claimed:** that the prompt rule works. Whether the model obeys it, and whether the relay's quality chain (which scores "context anchoring" and retries below 240) pushes it back toward series wording, are read from that count, not from this change. If the count is above 0, the next read is the briefs' `created_at` against the deploy and the label, then the relay consumer's retry prompts.

**Left as it was, and said:** the fallback prompt's rule "Every sentence must include a specific number" and the soccer terms line "Use: shots, possession, xG" still sit beside a prompt with no soccer stat context. That invites an invented number as much as the series rule invited an invented record (the briefs carry possession percentages and xG figures); it is a separate defect, outside "the series wording", and is recorded here for the next CC-CMD rather than patched.

## Task 3 — Smoke, unit, and the done condition

Add to `smoke.js` an assertion that the unit function exists and is called at both sites; add to `field_unit.js` the table of (`_sport` string, expected unit) pairs from Task 0.2, every soccer one `goal`, plus one pair per other sport that works today. Smoke must show 0 failed. Bump `SW_VERSION` in `index.html` and `sw.js` together.

**Done condition (Rule 89).** After the deploy and one day of soccer finals: rerun 0.1 over the days since the deploy; the count of soccer `night_owl` briefs matching `/\b\d+-points? margin/i` is **0**, and the count matching `/series (record|matchup)|aggregate series/i` for league fixtures is **0**; write `outbox/night-owl-soccer-wording-after-<date>.json` beside the first. A bare "looks right" is not an artifact.

## Not in scope

The relay's briefs (`game_recap`, `game_live`, cron source) and their prompts; the briefs' quality threshold; any other sport's Night Owl wording. If 0.1 shows the wording problem in the cron's briefs, that is a finding for field-relay-nba, not a change here.
