# Claude Code Command — Wire WNBA into daily schedule discovery via existing V2 endpoint

**Date:** 2026-07-13
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.
**Scope:** scripts/build-field-data.js only. No index.html changes in this CC-CMD.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO — this CC-CMD targets jubilant-bassoon"; exit 1; }; git pull.

Write findings to outbox/wnba-daily-discovery-2026-07-13.md.

## CONTEXT — real history, read before writing any code

May 23 2026: `daily-brief.yml`'s WNBA fetch was found to be silently broken — it appended `?leagueId=10` to `todaysScoreboard_00.json`, an NBA-only CDN file that ignores the parameter, meaning it was returning NBA games mislabeled as WNBA. The correct fix at the time: emit an explicit empty slate rather than publish wrong data, with `TODO: wire a real WNBA source, then restore a fetch + filter here` left in the comment.

That TODO was never completed — but a separate, unrelated project (the "ESPN Pivot" session) later built a real, verified, working WNBA path that nobody connected back to this gap: `field-relay-nba`'s `/v2/games?sport=wnba&date=YYYY-MM-DD` endpoint. Confirmed live and working — probed directly, returned 2 real games for 2026-07-13 (Atlanta Dream vs LA Sparks, Minnesota Lynx vs Phoenix Mercury), both with real venue, team, and start-time data.

**The real gap is narrower than "no WNBA source exists": it's specifically that `scripts/build-field-data.js` (which builds the daily `field-data-today.json` this session's investigation found completely empty across all sports) never learned this endpoint exists.**

**Real complication, do not assume this is a copy-paste of NBA's pattern:** this script's existing NBA/NHL/MLB parsers each read from their own dedicated, older relay paths (`/nba/liveData/scoreboard/todaysScoreboard_00.json`, `/nhl/v1/scoreboard/now`, `/mlb/schedule`) via pre-fetched `/tmp/*.json` files, NOT the V2 multi-sport endpoint. WNBA's only confirmed working path is the newer `/v2/games?sport=wnba` shape — a genuinely different response structure than what the existing `parseNHL()`/`parseNBA()` functions expect. Do not assume the shapes match.

**RUWT discipline (established convention from the original ESPN Pivot session, apply it here):** no adapter code gets written until the actual `/v2/games?sport=wnba` response shape is verified fresh via a real probe — not assumed from this doc's description of it, and not copied from NBA/NHL's parsing logic.

## TASK 0 — Probe

```bash
curl -sS "https://field-relay-nba.jeffunglesbee.workers.dev/v2/games?sport=wnba&date=$(date +%Y-%m-%d)" | jq .
```

Confirm the real, current field shape (not just today's specific two games) — check what fields exist for `state:'in'` (live) and `state:'post'` (final) games too if any recent WNBA games are available to inspect, since the pre-game shape alone may not reveal everything `schedules.wnba` downstream consumers will need.

Also confirm fresh: does `index.html` (or any downstream consumer of `field-data-today.json`) already expect a `schedules.wnba` key with a specific shape? Grep for how `schedules.nba` or `schedules.mlb` get consumed client-side, and match that shape — don't invent a new one.

## TASK 1 — Add a WNBA parser and wire it into `schedules`

Add a `parseWNBA()` function (matching this file's existing function-per-sport pattern) that fetches from the V2 endpoint and normalizes to whatever shape TASK 0 confirms the client expects. Add `wnba: wnbaGames.map(...)` to the `schedules` object alongside the existing `nhl`/`nba`/`mlb`/`soccer` keys. Update the `games_found` meta object and the console.log summary line to include WNBA's count.

## TASK 2 — Verify

- Real forced run of the script (or the relevant portion) against live data — confirm `schedules.wnba` populates with today's real 2 games, not a mock.
- Confirm the OTHER sports' output is byte-identical to before this change (this should be a pure addition, zero risk to NHL/NBA/MLB/soccer parsing).
- Whatever test/lint mechanism this repo runs for this script.

## DONE CONDITION

`schedules.wnba` populates with real, live WNBA games when they exist, using the confirmed-working V2 endpoint. Zero changes to any other sport's parsing. Real probe evidence in the outbox, not assumed shapes.

**Confidence scoring:**
- TASK 0 confirms real V2 response shape AND real downstream consumption shape before writing any parser (35 pts)
- TASK 1 correct, matches established per-sport function pattern, zero impact on other sports (35 pts)
- TASK 2 real verification against live data, other sports confirmed unaffected (30 pts)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
