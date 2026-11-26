# CC-CMD-2026-11-26-night-owl-soccer-margin-unit

**Repo:** jubilant-bassoon (the client). The symptom is read from the relay's archive (field-relay-nba `GET /archive/query`), the cause is in `src/legacy/field.js`.
**Branch:** main — commit directly, no feature branch, no PR. Edit target for JS is `src/legacy/field.js` only (the pre-commit hook syncs `index.html`).
**Status:** FILED 2026-11-26. UNBLOCKED: Task 0 reads only; nothing in Tasks 1 to 3 waits on the owner.
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

## Task 0 — Probe first (Rule 68, Rule 100). Write nothing until both artifacts exist

0.1 **The defect, counted.** For each soccer label (`EPL`, `MLS`, `La Liga`, `Serie A`, `Bundesliga`, `Ligue 1`, `UEFA Champions League`, `UEFA Europa League`, `EFL Championship`, `EFL League One`, `EFL League Two`, `EFL Cup`, `FA Cup`), read the last 30 days of `night_owl` briefs through `/archive/query?sport=<label>&brief_type=night_owl&limit=50&offset=N` (page until `hasMore` is false) and count per label: briefs, those matching `/\b\d+-points? margin/i`, those matching `/\b\d+-goals? margin/i`, those matching `/series (record|matchup)|aggregate series/i`. Write the table, with the dates read and the number of pages, to `outbox/night-owl-soccer-wording-<date>.json` (counts only). A runner may do this: the route is open and read-only.
0.2 **The cause, measured.** The two paths read `_sport`. Which strings does it hold for each soccer competition on the live page? Use the CI-as-proxy pattern of Rule 90 (a workflow triggered by an `outbox/.trigger-*` push, a real Chromium against the deployed URL, a committed manifest of booleans and strings), loading a soccer-heavy day and reading, for each soccer card, `game._sport`, `game.league` and what `detectSportClass` returns, plus the `MARGIN:` line each path would build. Reference implementation: `ambient-skeleton-probe.yml`. Write `outbox/night-owl-sport-strings-<date>.json`. If the strings contain "soccer" for every soccer game, STOP: the hypothesis is false, report verbatim, and re-read 0.1 for the real cause.

## Task 1 — One unit function, used at both sites (only if Task 0 confirms)

Add a small pure function that maps a `_sport` string to `run`, `goal` or `point` and replace the two inline chains with calls to it. It must give `goal` for every soccer competition in Task 0.2's table and for hockey, nhl, `mls`; `run` for baseball or mlb; `point` for everything else, **exactly as today** for each sport that works today (NBA, WNBA, NFL, CFL, AFL, golf, tennis). It must not say `goal` for American or Canadian football (the fallback's `football` test says it today; leave that behaviour as it is and record it in the outbox as a separate finding).
Do NOT touch `detectSportClass`, any other function, or `index.html` directly.

## Task 2 — No "series" in a league fixture

Where the prompt gets `Series:` / `Matchup:` or the `[SERIES CONTEXT]` line for a soccer game that is not a knockout tie, leave them out. A soccer cup or European knockout tie that has a real two-legged record may keep it. Define "knockout" from the data the game object carries (Task 0.2 lists the fields); do not infer it from the label.

## Task 3 — Smoke, unit, and the done condition

Add to `smoke.js` an assertion that the unit function exists and is called at both sites; add to `field_unit.js` the table of (`_sport` string, expected unit) pairs from Task 0.2, every soccer one `goal`, plus one pair per other sport that works today. Smoke must show 0 failed. Bump `SW_VERSION` in `index.html` and `sw.js` together.

**Done condition (Rule 89).** After the deploy and one day of soccer finals: rerun 0.1 over the days since the deploy; the count of soccer `night_owl` briefs matching `/\b\d+-points? margin/i` is **0**, and the count matching `/series (record|matchup)|aggregate series/i` for league fixtures is **0**; write `outbox/night-owl-soccer-wording-after-<date>.json` beside the first. A bare "looks right" is not an artifact.

## Not in scope

The relay's briefs (`game_recap`, `game_live`, cron source) and their prompts; the briefs' quality threshold; any other sport's Night Owl wording. If 0.1 shows the wording problem in the cron's briefs, that is a finding for field-relay-nba, not a change here.
