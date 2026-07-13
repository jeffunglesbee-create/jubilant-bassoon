# CC Session Outbox — Wire WNBA into daily schedule discovery via existing V2 endpoint (CC-CMD-2026-07-13-wnba-daily-discovery)

**Date:** 2026-07-13
**Scope:** `scripts/build-field-data.js` only. Zero `index.html` changes.

## TASK 0 — Probe (real evidence, not assumed)

Direct sandbox `curl` to `field-relay-nba.jeffunglesbee.workers.dev` is blocked by org egress policy (confirmed via `$HTTPS_PROXY/__agentproxy/status` — `connect_rejected`, "gateway answered 403 to CONNECT"). Per `/root/.ccr/README.md`, this class of failure must be reported, not routed around — so I used the existing `mcp__FIELD_Handoff__probe_relay_route` self-probe tool (an allow-listed relay self-fetch built for exactly this class of sandbox-egress block, per CLAUDE.md Rule 87) instead of assuming the shape or skipping verification.

**Real pregame response** (`/v2/games?sport=wnba&date=2026-07-13`):
```json
{"sport":"wnba","date":"2026-07-13","games":[
  {"id":"espn:401857064","state":"pre","start":"2026-07-13T23:00Z","home":{"name":"Atlanta Dream","abbr":"ATL","score":0},"away":{"name":"Los Angeles Sparks","abbr":"LA","score":0},"venue":"Gateway Center", ...},
  {"id":"espn:401857065","state":"pre","start":"2026-07-14T01:00Z","home":{"name":"Minnesota Lynx", ...},"away":{"name":"Phoenix Mercury", ...},"venue":"Target Center", ...}
],"count":2,"source":"espn-wc","ts":1783967899016}
```

**Real final/post-game response** (`/v2/games?sport=wnba&date=2026-07-12`, per the CC-CMD's instruction to also check `state:'post'`): 4 real completed games with real scores and per-period `linescores` arrays (e.g. Toronto Tempo 93, New York Liberty 91, `linescores.home:[24,23,33,13]`). Confirms the response shape is stable across `pre`/`post` states — same top-level fields, `home`/`away`/`score` populated differently.

**Downstream consumption check:** grepped `index.html` for `schedules.nba`/`schedules.wnba`/`schedules.mlb`/`schedules.nhl`. Only `schedules.mlb` has an actual client-side reader (`_useJsonMlb` in `buildTodaySchedule`, ~L12117-12120). **NBA, NHL, and soccer have zero client-side `schedules.X` consumers either** — this script has been writing `schedules.nhl`/`schedules.nba`/`schedules.soccer` into `field-data-today.json` for a while with nothing on the client reading them yet, matching the file's own `_meta.note`: "Phase 1: schedules block added. index.html reads schedules.mlb for full schedule." So there is no existing "shape contract" from the client for WNBA to match — the real requirement is internal consistency with this script's own sibling sport shapes (`sport`/`home`/`away`/`start_time`/`venue`/`confirmed`), which `schedules.wnba` now matches.

**Real complication confirmed exactly as the CC-CMD warned:** the V2 endpoint's shape (`home`/`away` as `{name, abbr, score}` objects, `start` not `start_time`, no top-level `league` on the game object) is genuinely different from parseNBA()'s pre-fetched CDN JSON shape (`homeTeam.teamCity`/`teamName` composed into a string) — a real, distinct parser was written, not a copy-paste of parseNBA()'s logic.

## TASK 1 — Implementation

Added `parseWNBA()` (async, `https.request`-based, matching the `parseMLBFull()`/`parseESPNSoccer()` live-fetch pattern — not the NHL/NBA pre-fetched-`/tmp/*.json` pattern, since WNBA has no dedicated `/tmp/*.json` prep step). Flattens the V2 endpoint's nested `home`/`away` objects to plain name strings, maps `start` → `start_time`, `venue` passes through, tags `sport: 'WNBA'` / `league: 'WNBA'`. Wired into `main()`: `const wnbaGames = await parseWNBA();`, added to the summary console.log, added `wnba: wnbaGames.map(...)` to the `schedules` object (matching the sibling sports' per-sport shape), added `wnba: wnbaGames.length` to the `games_found` meta block.

## TASK 2 — Verify

Sandbox cannot make a real live end-to-end run of the whole script (NHL/NBA/MLB/soccer/WNBA parsers all hit hosts blocked by the same egress policy that blocked the initial probe). Instead: extracted `parseWNBA()` verbatim (same paren-depth-aware extraction technique used throughout this session's telemetry work) and ran it against a mocked `https` module returning the **exact real JSON** captured via the MCP probe tool above — not fabricated or hand-written test fixtures.

5 real assertions, all passing:
1. Real pregame data (2 games) → 2 correctly-flattened output objects (`home`/`away` as plain strings, `start_time`/`venue`/`sport`/`league` all correct).
2. Real final/post-game data (2 of the 4 games) → still parses correctly (confirms the parser handles `state:'post'` responses, not just pregame — the score/state/linescore fields are intentionally dropped from the `schedules.wnba` shape, matching how NBA/MLB's own `schedules.X` entries also omit live score fields, since this block is schedule/broadcast data, not live score data).
3. Network failure → graceful empty array (matches every sibling parser's own error handling convention).
4. Malformed JSON response → graceful empty array.
5. Real empty-slate shape (`games: []`, a genuinely possible response on an off-day) → 0 games, no crash.

`node --check scripts/build-field-data.js`: syntax OK. This repo has no dedicated lint/test step for `scripts/build-field-data.js` specifically (`npm test`/`npm run lint` both target `index.html` only; `field-data.yml` runs the script directly with no separate gate) — `node --check` plus the real-data forced test above is the applicable verification.

**Other sports confirmed byte-identical:** `git diff scripts/build-field-data.js` shows every changed line is a pure addition (`+`) — zero existing NHL/NBA/MLB/soccer parsing lines touched. Zero risk to other sports, confirmed by direct diff inspection, not just asserted.

Zero `index.html` changes confirmed via `git status --short`.

## DONE CONDITION

`schedules.wnba` will populate with real, live WNBA games via the confirmed-working V2 endpoint on the next scheduled `field-data.yml` run (or `workflow_dispatch`). Zero changes to any other sport's parsing. Real probe evidence captured above, not assumed shapes.

## Confidence score

- TASK 0 confirms real V2 response shape (both `pre` and `post` states) AND real downstream consumption shape (found: no client consumer exists for any sport except MLB) before writing any parser: 35/35
- TASK 1 correct, matches the established per-sport function pattern (specifically the live-fetch sub-pattern used by MLB/soccer, not the pre-fetched-JSON sub-pattern used by NHL/NBA, correctly distinguished per the CC-CMD's own warning): 35/35
- TASK 2 real verification against live-captured data (not fabricated fixtures), other sports confirmed unaffected via direct diff inspection: 30/30

**Total: 100/100.**

## Commit

- `scripts/build-field-data.js`: added `parseWNBA()`, wired into `main()`, `schedules.wnba`, `games_found.wnba`. Zero changes to any other sport's parsing.
- Zero `index.html` changes.
- This manifest.

**Note for a future session (client-side wiring, out of this CC-CMD's scope):** `schedules.wnba` now populates in `field-data-today.json` on the next scheduled run, but nothing in `index.html` reads it yet — same situation as `schedules.nhl`/`schedules.nba`/`schedules.soccer`, which have been sitting unconsumed since this script's Phase 1. Wiring a client-side `_useJsonWnba`-style reader (matching `buildTodaySchedule`'s existing `_useJsonMlb` pattern) is a separate, future CC-CMD.
