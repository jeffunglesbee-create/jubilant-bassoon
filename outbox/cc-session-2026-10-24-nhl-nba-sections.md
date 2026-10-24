# CC session 2026-10-24 — today's NHL and NBA games get cards

**Repo:** jubilant-bassoon (with field-relay-nba docs it depends on)
**CC-CMD:** `docs/CC-CMD-2026-10-24-nhl-nba-today-sections.md` (PARTIAL)
**HEAD:** `6e4b3947` (probe) → `eb8e74c4` (fix, SW 2026-10-24d) → `49a6bb1e` (slate-day CC-CMD) → `247da6cb` (results)
**Identity:** claude@field.dev / FIELD CI (owner, 2026-10-23)

## What was wrong

At 15:19Z the live page held 12 NHL and 8 NBA games in `espnScores` and
rendered 0 cards for either. The only creators of today's NHL and NBA sections
were `buildTodaySchedule`'s June finals lists (last match 2026-06-13 and 06-14);
`injectV2SportSection` was wired for every V2 sport except these two. Found as
TASK 0 premise 6 of the relay's v2-games-callers CC-CMD, by reading the live
page. The gate that should have caught it, `check-v2-key-has-card-path`,
exempted nba and nhl as "built elsewhere".

## Per commit

| commit | what |
|---|---|
| `6e4b3947` | `today_sections_probe.js` and its workflow: judges each watched sport on the LIVE page (PASS / FAIL / NO GAMES TODAY / UNJUDGEABLE), ET day computed by the probe itself. Pushed first so it could be shown red |
| `559ea858` | the shared injector no longer feeds today's games into a past-date slate (Yesterday's NHL 2 → 14 in the harness) |
| `d8af1668` | `injectV2SportSection('nhl','NHL')` and `('nba','NBA')`; gate exemptions removed; smoke A-NHLNBA-1..4 |
| `924a90fd` | the NBA brief goes to the section that holds the game, not the first `/NBA/i` match (WNBA) |
| `eb8e74c4` | the June finals lists and the `_seriesMap` build retired |
| `49a6bb1e` | `CC-CMD-2026-10-24-slate-day-has-three-owners.md` |
| `247da6cb` | the CC-CMD results |

Pushed as `eb8e74c4`; the deploy gate run is 40113474301.

## Verification

- **Before:** probe 2026-10-24T16:12Z: NHL 0 of 12, NBA 0 of 8, both FAIL.
- **After:** probe 16:55:43Z (SW 2026-10-24d): NHL 12, NBA 8, both PASS. The
  page read directly at 16:53:55Z agreed. Manifests and screenshots:
  `outbox/today-sections-probe-*`.
- Smoke 1061/0, per-day smoke, units, lint through the repo's pre-commit hook
  on every commit. Mutations: injector 6/6, labels 5/5, smoke 7/7.

## What the independent review changed

Workflow wf_aac1f46a-cb3 (three lenses, a refuter per finding): 12 confirmed, 1
refuted. The high-severity one reversed a design decision. The first version of
the injector commit filtered games by `isToday` against `TODAY_ISO`, which the
earlier plan critic had recommended. On the real 10-25 boards it dropped 30 of 30
games from 00:00 to 04:00 ET and in any tab left open across the 4am rollover,
so 20 sports would have rendered no cards. The filter was removed before the
push, and the commits were rewritten. Harness case 5 and mutation I5 pin it.

## Integration state (Rule 65)

- **RELAY CONTRACT:** `/v2/games?sport=nhl|nba&date=...` (CONTRACTS.md, both
  repos, identical). NHL ids `nhl:<id>`, NBA ids `espn:<id>`, finals
  `'final'`.
- **CLIENT CONSUMER:** `fetchV2AllScores` → `injectV2SportSection` → sections
  labelled 'NHL' and 'NBA', the labels `fetchRelayDateSections` gives past
  dates.
- **VERIFIED:** the live page and the CI probe, as above.
- **STAGED (Rule 74): none for this change.**
- **KNOWN MISMATCHES, each filed:**
  - tomorrow's games sit in today's sections from 16:00 ET, for every injected
    sport (`CC-CMD-2026-10-24-slate-day-has-three-owners.md`);
  - media cards say "NHL Playoffs Pregame", colours and standings are fallbacks,
    NHL analytics assumes the playoff roster, the ambient label says "MLB
    Playoffs": TASK 2 of the NHL/NBA CC-CMD;
  - WNBA, NFL, CFB, AFL and MLB finals read as live
    (`field-relay-nba docs/CC-CMD-2026-10-24-v2-final-word.md`, the owner's call).
