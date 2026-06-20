# HANDOFF.md — FIELD

## Current State
- **Client HEAD:** f313a00 (jubilant-bassoon)
- **Relay HEAD:** 8766f2b (field-relay-nba)
- **Client SW:** 2026-06-20c
- **Client Smoke:** 702/0
- **Session:** June 19-20, 2026 (~1 AM – 9 AM ET, two-part marathon)

## Session: 17 prompts, 32 commits

### Client commits (P1-P14): 15 code commits
| # | Commit | What |
|---|---|---|
| P1 | 80ba46a | Desktop back-to-schedule pills at ≥1200px |
| P2 | 2c17fa4 | WC group pill bridge (openWcGroup + gold flash) |
| P3 | 813c142 | Golf pack density (computeGolfPackDensity) |
| P4 | db645d6 | Golf cut-line projection (3 modes) |
| P5 | a98bb72 | Golf leaderboard inject timing fix (setTimeout 300) |
| P6A | bf57555 | Persist V2 soccer situation stats to localStorage |
| P6B | e564e0d | Inject persisted soccer stats into Night Owl |
| P9 | 033893b | F09 REST Countries (fetchCountryContext) |
| P10 | 8b5a8a1 | UserDO read loop + Context Graph hydration + Night Owl personalization |
| P11B | 99929e9 | Drama persistence client signal at final state |
| P12B | 4fd7dcf | AFL V2 client wiring (FIELD_V2_SOURCES afl:true) |
| P12C | ba43307 | Golf archive hook (saveGolfRoundFinal) |
| P14 | 78fce57 | Golf venue read fix (pgaData.venue fallback chain) |
| — | 0ff6cd8 | Rule 68 governance (CLAUDE.md + STANDARDS.md) |

### Relay commits (P7-P15): 17 code commits
| # | Commit | What |
|---|---|---|
| P7 | 8 commits | Context Graph API (/context/game, /context/date) |
| P8 | 2 commits | Archive enrichment + backfill endpoint |
| P11A | 8e35b79 | Drama persistence schema + POST /archive/drama |
| P12A | 8330a54 | AFL V2 adapter (V2_LEAGUES + adaptAFL + GameDO) |
| P13 | 1498a63 | Golf enriched: round status + course/venue |
| P15 | 8766f2b | Archive catch-up cron + brief type classification |
| — | 8d202d3 | Rule 68 governance (CLAUDE.md) |

## P15 KNOWN BUG — OPEN

Archive catch-up block is placed BEFORE the morning brief guard (verified by P15B pre-build probe). However, the catch-up has its own ESPN fetch loop independent of gameLines. The Valkyries game (bball:494889, final 75-81) has NOT been verified as archived yet. Manual trigger returned early before catch-up could be confirmed. Next cron tick should fill it — verify with:

```
curl -s "https://field-relay-nba.jeffunglesbee.workers.dev/context/game/bball:494889" \
  | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
     console.log(d.game ? 'PASS' : 'STILL MISSING');"
```

## P16 NOT EXECUTED — READY

Retroactive drama estimation (client). Prompt written but not executed. Fills drama_peak for overnight finals that have scores but no drama. Boot at T+6000ms, fetches Context Graph, estimates drama from score differential per sport.

## Rule 68 — SHIPPED

CC prompts must include executable terminal commands, not prose. Pre-build probes discover actual data shapes. Post-build assertions verify output. Control flow analysis required when inserting into existing functions (grep for early returns). Added to CLAUDE.md + STANDARDS.md in both repos.

## Architecture shipped this session

1. **Context Graph API** — /context/game/{id} and /context/date/{iso}. Both live, 138+ briefs per date.
2. **Archive enrichment** — GameDO writes complete rows (team names, venue, league) at final state.
3. **Drama persistence** — Client signals drama_peak + drama_arc to relay at final. Schema: drama_peak REAL + drama_arc TEXT on both game tables.
4. **UserDO read loop** — fetchUserState at boot + visibility re-fetch. hydrateMissedRecaps via Context Graph. Night Owl [USER CONTEXT] + [MISSED PEAKS] injection.
5. **AFL V2 adapter** — API-Sports AFL through V2 pipeline. GameDO opens for AFL. Squiggle coexists.
6. **Golf archive hook** — saveGolfRoundFinal mirrors saveEspnFinal. Pack density + cut line + leader margin drama.
7. **Golf enriched upgrade** — status ("Play Complete") + venue ("Shinnecock Hills Golf Club") + venueLocation ("Southampton, NY") from ESPN event details.
8. **Server-side archive catch-up** — Cron fills game rows for finals no client saw. Brief type classification (narrative_context vs game_recap).

## Pending

- [ ] P15 Valkyries game verification (check after next cron tick)
- [ ] P16 retroactive drama estimation (prompt ready, not executed)
- [ ] Analytics cron (~45 min relay) — daily WOW feature computation
- [ ] Night Stars client render (~25 min) — first WOW feature
- [ ] NFL in SPORT_TO_V2 (one-line, before Sept 9)
- [ ] HANDOFF session doc to Drive (quota permitting)
- [ ] API-Sports Football Pro renewal decision (before June 29)

## WOW Features Specced (10 total)

Round 1 (Context Graph): Jinx Counter, Sport of the Week, Night Stars, Contradiction Finder, Composite Brief
Round 2 (described): Streak Board, Cross-Exam, The Rewrite, The Flip Side, The Broken Record

Spec file: /home/claude/wow-context-graph-spec.md (local to session)

## API Spend
| Service | Cost | Status |
|---|---|---|
| API-Sports (5 Pro) | $95/mo | Active, Football Pro expires ~June 29 |
| The Odds API (100K) | $59/mo | Reset June 19, 99,996 remaining |
| Cloudflare Workers+ | $5/mo | Active |

## Usage
- CC weekly: 5% used (resets Tue 9:59 AM)
- CC session: 56% at last check (5-hr rolling window)
