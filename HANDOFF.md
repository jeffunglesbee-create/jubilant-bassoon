# FIELD HANDOFF

## Session: 2026-06-30 · MLS Adapter Build (Part 2: Tournament Multiplexer)

**CLIENT HEAD: fb78e38**
**SW_VERSION: 2026-06-30a**
**RELAY HEAD: d78db9d4**
**Smoke: 807/0**

---

## THIS SESSION

### Relay fix (1 commit: d78db9d4)
- Added missing `const MLS_STATS_BASE = 'https://stats-api.mlssoccer.com'` — route handler referenced it but constant was never defined (caused 1101 JS exception on every `/mls/stats/*` request)
- Fixed `/competitions` allowlist prefix: changed `'/competitions/'` to `'/competitions'` so bare `/competitions` path (full registry endpoint) passes the allowlist check
- Fixed `mlsStatsTtl()` to match same prefix pattern
- Deploy verified: both `/mls/stats/competitions` and `/mls/stats/matches/seasons/...` confirmed working

### Network confirmation
- `stats-api.mlssoccer.com` **now accessible from chat sandbox** (was blocked at prior session close; Jeff's allowlist addition took effect between sessions)

### D1 schedule seed (live execution, not committed to CI yet)
- Deleted 262 stale api-sports rows (all unscored, `date >= 2026-07-22`)
- Fetched 279 games from stats-api (3 pages, `next_page_token` pagination)
- Inserted 279 rows with canonical three-letter-code IDs (`{date}-mls-{h}-{a}`)
- Final state: 289 MLS games (12 pre-WC + 277 post-WC), March 7 to Nov 7
- 2 rescheduled games (originally Mar/Apr, moved post-WC) have their original `start_date` in pre-WC range — harmless
- **Decision Day Nov 7 fully covered** (16 games, missing in old seed)

### Client commits (2, both [skip ci])
1. `5c80f5d3` — Rewrote `scripts/seed-mls-return-2026.py` for stats-api (was api-sports.io)
2. `d7f9a4c6` — Updated `.github/workflows/mls-schedule-seed.yml` with weekly Monday cron

### Key learnings / gotchas (Part 1)
- D1 `/d1/execute` batch INSERT fails at 20 rows (500 error); 5 rows per batch works
- Python urllib default UA triggers Cloudflare Bot Fight Mode (1010); browser-like UA required
- stats-api `match_date[gte/lte]` filters by effective date but `start_date` field reports original date — rescheduled games have date mismatch

### Part 2: Tournament Multiplexer (branch: claude/elegant-shannon-t2dvt0, commit fb78e38)
- `scripts/seed-mls-tournaments-2026.py` — entity-filtered sync of all 15 Tournament-type competitions via relay `/archive/game` COALESCE UPSERT
- `.github/workflows/mls-tournaments-seed.yml` — daily 11am UTC cron + workflow_dispatch
- `smoke.js` — +4 assertions (A-TOURN-1 through A-TOURN-4), 803→807
- Probes confirmed: 20 competitions / 15 Tournament, Open Cup bracket_structure_id shape OK, series_type empty (no two-legged ties), /archive/game exists at relay index.js:7685
- D1 pre-seed state confirmed: postseason_games = NBA 15 / NHL 15 / UFL 2 / MLS 0
- **STAGED: end-to-end verification blocked** — relay POST and stats-api both blocked by CC sandbox proxy; workflow dispatch requires file on main branch. Unblock: merge PR → workflow auto-registers, cron fires daily 11am UTC or manual dispatch. See outbox/cc-tournament-multiplexer-2026-06-30.md for exact verification SQL.

### CC bash environment limits (this session)
- `*.workers.dev:443` — 403 Tunnel from CC bash proxy (relay POST/GET blocked)
- `stats-api.mlssoccer.com` — 403 Tunnel from CC bash proxy
- Relay accessible ONLY via `mcp__FIELD_Handoff__browser_quick` for allow-listed GET paths (`/mls/stats/competitions`, `/mls/stats/matches/*`)
- D1 MCP (`mcp__Cloudflare_Developer_Platform__d1_database_query`) works for direct DB queries

---

## WHAT'S AUTOMATED vs. STILL MANUAL

**Now automated:**
- MLS schedule seed runs weekly (Monday 10am UTC cron) — catches rescheduled games
- Relay `/mls/stats/*` passthrough operational — competitions, standings, schedule, match data all accessible
- MLS tournament sync: `mls-tournaments-seed.yml` ready (daily 11am UTC) — **activates after PR merge to main**

**Still manual / not yet built:**
- No client-side MLS adapter function (no `adaptMls` or equivalent) — ESPN still provides live MLS scores via `usa.1` league, so game cards work, but stats-api enrichment (venue, match_day, sub_league) isn't consumed
- No journalism context integration from stats-api (FBref is the current MLS context source)
- The weekly Regular Season cron hasn't run yet (first scheduled run: Monday July 6 2026)

---

## PRIORITY LIST

### 🔧 QUEUED CC-CMDs
1. Relay: /journalism/game-lines (docs/CC-CMD-2026-06-27-relay-game-lines.md)
2. Client: card brief line (docs/CC-CMD-2026-06-27-client-card-brief-line.md)

### 🔨 INFRASTRUCTURE
3. Bosnia DB fix + identity-resolver CANONICAL map
4. team_form CONTEXT_SOURCE v3
5. Golf: wire Broadie proxy (Tier 1, $0)

### 📋 OPEN INCIDENTS
6. wentToOT hardcoded false
7. KV editorial keys not consulted
8. NFL SPORT_TO_V2 — September 9
9. Odds Daily Counter stale
10. night_stars phase degraded

### 🏗️ NEXT ADAPTER BACKFILL
NBA CDN → NHLE → Squiggle AFL → MLS (✅ relay + seed done) → client enrichment TBD

---

## KEY CONSTANTS

- ARCHIVE_DB: cc49101c-0569-4d41-8e7a-be139cde4f26
- WC2026_DB: f26669de-e772-4b56-a6d1-f8fdea08a4d4
- Relay: field-relay-nba.jeffunglesbee.workers.dev
- CF account: b57e9af57ab46c52ca9215804e689c29
- Repo: jeffunglesbee-create/jubilant-bassoon
- MLS stats API: stats-api.mlssoccer.com (no key) — see codex mls-schedule-stats-api-2026-06-30

SESSION END: RELAY d78db9d4 · CLIENT fb78e38 · 2026-06-30 · MLS tournament multiplexer (script + workflow + smoke 807) · branch claude/elegant-shannon-t2dvt0 · via CC
