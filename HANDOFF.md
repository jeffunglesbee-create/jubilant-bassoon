# FIELD Handoff — June 1 2026 PM-6 TYPE B (NBA playoff leaders feed shipped end-to-end · ADR-003 logged)

**jubilant-bassoon HEAD:** 5c266fa (PM-6 close: NBA playoff leaders feed + ADR-003 attribution guardrail) · Smoke: 241/0 pre-gate · A360–A368 green post-gate · A313/A314 known post-gate red · SW_VERSION 2026-06-01j
**field-relay-nba HEAD:** 6144d17 (PM-6: /nba-stats/* route → stats.nba.com/stats/leagueLeaders; ADR-003 scope-limited to /leagueLeaders only)

**🆕 ADR-003 (this session):** Drive `1XUPoayJUTh2Ki_DYXgw8uOAYZoGtpDt2c7510vGq64w` — stats.nba.com Source Acceptance. Rule 45.3 satisfied: ToS quoted with date, scope limits explicit, risks acknowledged, re-evaluation triggers documented, Jeff's explicit accept-the-risk recorded BEFORE any code wiring.

**CANONICAL BUILD BACKLOG (READ FIRST FOR ANY BUILD QUESTION):** Drive `1ugUh6UmeDkLR-gEH8hJPwXK2NiIrXYQY8gp2jO2p2Hk` — §D "NBA PLAYOFF LEADERS SOURCE" CLOSED by ADR-003 (option A shipped). Move to §A on next §G update pass.

**Session Doc (PM-6, this session — Drive):** 1fF-5hrXThTw7cawgIxEz2rD5PussHAP7iYJV4Y8Vp-Q
**Session Doc (PM-5 prior — Drive):** 1po-q4yp3qFg5AXzCYvf-IazI9Q1OviyaoZu4HysjBuQ
**Session Doc (PM-4 prior — Drive):** 1QxI13vHVxN9W4Kmo0O5ABgSQPsN2qEfVaHVQ-wQsnJg
**Session Doc (PM-3 prior — Drive):** 1lcrLKehfzdcUmKvZU-gttxTEyyp3a2zUqDGGrCpuTD4
**ADR-003 — stats.nba.com Source Acceptance (NEW):** 1XUPoayJUTh2Ki_DYXgw8uOAYZoGtpDt2c7510vGq64w

## TIER 0 DEADLINES

- **NBA Finals G1: June 3** — SAS @ NYK · **ALL FOUR context tags now live for NBA** ([PLAYOFF STATS:] fires for the first time this postseason)
- **Stanley Cup G2: June 4** — VGK @ CAR (all four tags live since PM-4)
- **World Cup 2026: June 11 HARD** — flip `wc26:true` in FIELD_V2_SOURCES (~5 min)
- **USPTO provisional: ~June 25**

## WHAT HAPPENED THIS SESSION (PM-6)

User opener: "Determine session type, run NBA playoff leaders feed relay side." Resolved to TYPE B Option A from PM-4/PM-5 carry (Build Backlog §D NBA PLAYOFF LEADERS SOURCE recommendation A). Session extended via "keep going" to cover app-side wiring + attribution guardrail.

### Key finding surfaced this session

PM-4 assumed stats.nba.com required custom headers (`x-nba-stats-token`, `Referer`, `x-nba-stats-origin`) per nba_api Python convention. Probe-verified WRONG: plain curl from cloud egress returned 200 with `Access-Control-Allow-Origin: *`. The relay still sends browser-like headers as a stability hedge, but they aren't strictly required. Worth noting if future stats.nba.com endpoints are added (under a NEW Rule 45 review — see ADR-003 scope limits).

### Probes run (cors-probe protocol — 2 probes this session, 7 cumulative)

- `c27f64b` → `stats.nba.com/stats/leagueLeaders?...&Season=2025-26&SeasonType=Playoffs&StatCategory=PTS` → 200, CORS open, 153 playoff scorers ✓
- `c5863c6` → `field-relay-nba.jeffunglesbee.workers.dev/nba-stats/leagueLeaders?...` (through-relay end-to-end) → 200, identical shape ✓

### Rule 45 source-clearance gate

After probe verified technical viability, surfaced Rule 45 BEFORE writing code. Read `nba.com/termsofuse` via web_search, quoted the actual ToS language ("NBA Statistics may only be used... for legitimate news reporting or private, non-commercial purposes"), presented 3 concrete risks (commercial carve-out, attribution requirement, IP-ban risk), asked for explicit decision instead of silently green-lighting. Jeff response: "A1" (accept + wire). Recorded ADR-003 to Drive BEFORE any code commit.

### Code changes (three single-concern commits, Rule 7)

**field-relay-nba commit `6144d17`** (+49 lines):
- `NBA_STATS_BASE`, `NBA_STATS_HEADERS`, `NBA_STATS_CACHE_TTL=900`, `NBA_STATS_ALLOWED_PATHS=['/leagueLeaders']`, `nbaStatsAllowed()`
- `/nba-stats/*` routing branch placed BEFORE `/nba/*` catch-all (with comment explaining the prefix-strip trap)

**jubilant-bassoon commit `74aa5cd`** (+189/-7 across index.html / smoke.js / sw.js):
- `_nbaPlayoffLeadersCache`, `_parseNBALeagueLeaders`, `buildNBAPlayoffLeadersByTeam`, `fetchNBAPlayoffLeaders`, `getNBAPlayoffLeadersForGame`, `nbaPlayoffLeadersPrefetch`
- 4 parallel category fetches (PTS/REB/AST/FG3M), `TOP_N=30` (Castle is at array index 25)
- `populateSeriesContext` Subtask 9 chains NHL → NBA, sets `game._playoffLeadersAttribution = 'NBA.com'`
- `buildSeriesContextTags` inlines ` — Stats: NBA.com` into the `[PLAYOFF STATS:]` tag
- Init prefetch scheduled at T+3100ms (between NHL 3000 and ESPN injuries 3200)
- A367 smoke assertion (NBA leaders end-to-end wiring + attribution)
- SW_VERSION 2026-06-01h → 2026-06-01i

**jubilant-bassoon commit `5c266fa`** (+48/-5):
- `_enforceNBAAttributionFooter(briefText, sections)` — post-process guardrail
- Wrapped at all three FIELD Brief render paths: relay KV, compound editorial, standalone fallback
- A368 smoke assertion (≥4 helper occurrences: 1 def + 3 calls)
- SW_VERSION 2026-06-01i → 2026-06-01j

### Functional verification

For Finals G1 (SAS @ NYK) — verified end-to-end against real probe data:
```
[PLAYOFF STATS: SAS V. Wembanyama 23.2 pts; SAS S. Castle 19.2 pts;
                NYK J. Brunson 26.9 pts; NYK O. Anunoby 19.7 pts — Stats: NBA.com]
```
Attribution guardrail tested across 7 cases: no-NBA → unchanged · already-credited → no duplicate · missing-credit → footer appended · no-trailing-punct → period + footer · empty/null inputs → safe.

### Decisions / rules invoked

- **Rule 45** — source-clearance gate satisfied via ADR-003 (terms quoted with date + accept-the-risk recorded BEFORE wiring)
- **ADR-001** — counter discipline preserved (NBA leaders from feed, not hardcoded)
- **Rule 7** — three single-concern commits
- **Rule 23** — SW_VERSION bumped twice (h→i→j)
- **Rule 47** — RELAY-CPU-A respected (relay = pure proxy + cache; no editorial intelligence)
- **DO NOT INVENT** — 2 probes before any code (cors-probe protocol now 7× cumulative)
- **"I don't know" rule** — explicit acknowledgment ADR-003 is not legal opinion; counsel review required before commercial launch

## PRIORITY LIST FOR NEXT SESSION

### P0 — Live verification (NBA Finals G1 tomorrow June 3)
1. **SW 2026-06-01j active in browser**
2. **Generate / inspect a J3 brief for NBA Finals G1.** Verify ALL FOUR tags fire with live data:
   - `[COACH: Spurs — Johnson; Knicks — Brown]`
   - `[HISTORICAL: Knicks' first NBA Finals since 1999...]`
   - `[INJURY: <ESPN live feed for SAS/NYK>]` — first NBA exercise of ESPN injuries feed
   - `[PLAYOFF STATS: ... — Stats: NBA.com]` — **NEW LIVE THIS SESSION**
3. Verify "Stats: NBA.com" appears in brief prose (preserved by AI OR appended by guardrail)
4. Regression check: Cup Final tags still fire NHL leaders correctly
5. Regression check: non-NBA non-NHL games don't emit `[PLAYOFF STATS:]` (sport gate)

### P0 — TIER 0 game-day
6. NBA Finals each game (June 3, 5, 7, …) tests NBA leader freshness (15-min TTL) + attribution rendering
7. Cup Final each game (June 4, 6, …) tests NHL leader freshness (unchanged)

### P1 — Smoke gate fix (carried from PM-3/PM-4/PM-5)
8. Move `if (fail > 0) process.exit(1)` from line ~1040 to end of smoke.js. A361–A368 currently post-gate.

### P1 — PWA-A manifest fix (A313 + A314, carried)
9. Split `manifest.json` icons (any + maskable) + `prefer_related_applications:false`. Spec: PWA Android Spec (Drive `1n5-HFuzQfUA5NRH2Rxizgma6fTsU2Tb-qNTEokCo46s`).

### P1 — STANDARDS.md duplicate-rule audit (carried PM-5, TYPE D)
10. Four pairs of duplicate-numbered rules (39/40/41/42). Renumber-only.

### P1 — Documentation amendments
11. **Update CI/Deploy Ref** to document new `/nba-stats/*` relay route (currently lists `/nba/*` only)
12. **Add ADR-003 to STANDARDS.md ADR list** (currently lists ADR-001 + ADR-002)
13. **Update Build Backlog Canonical v1.0** — move §D NBA PLAYOFF LEADERS to §A SHIPPED with commits `6144d17` + `74aa5cd` + `5c266fa`
14. **Investigate PM-5 relay tracking gap** — commits `fff6e3c` + `0e9a9d9` landed outside documented sessions. Provenance unclear. Back-tag or document.

### P1 — NBA Playoff Leaders follow-ups (not blocking but worth queuing)
15. **Audit attribution surfaces beyond J3 Brief** — current guardrail covers FIELD Brief only. If NBA leader data appears in bottom-sheet game detail, ambient panel card, share cards, etc., those also need attribution. ADR-003 §IMPLEMENTATION NOTES has the spec.
16. **Consider extending NBA `[PLAYOFF STATS:]` to non-Finals NBA playoff games.** Currently fires only for SAS/NYK due to `SERIES_HISTORICAL_ANCHORS` Subtask 7 scope. The leader data is league-wide; the tag-emission gate is the limit. If desired: extend `populateSeriesContext` NBA branch to fire for any NBA playoff game.

### P1 — GREEN-path successor (carried from §C Build Backlog)
17. Investigate paid NBA stats sources (Sportradar NBA, Stats Perform, BDL GOAT $9.99/mo) as licensed replacement. Goal: swap before USPTO non-provisional triggers ADR-003 re-evaluation. Relay architecture is swap-ready — only `NBA_STATS_BASE` + headers change required.

### P0 — Hardcoded calendar flip
18. **June 11 HARD** — flip `wc26:true` in FIELD_V2_SOURCES (~5 min)

### P2 — USPTO provisional prep (~June 25)
19. Patent narrative now includes:
    - Full Phase B (all 9 subtasks live for both NHL and NBA)
    - ESPN injuries swap-in (PM-4) demonstrating single-integration-point architecture
    - NBA playoff leaders (PM-6) demonstrating new-source acceptance discipline
    - **ADR-003 attribution discipline** — documented Rule 45 acceptance pattern with prompt-level inlining + post-process guardrail (defense-in-depth attribution)
    - cors-probe-first methodology as verifiable DO-NOT-INVENT discipline (7 successful endpoint verifications cumulative)

### P2 — Build backlog highlights
20. **WC2026 mini-build (~35 min, before June 11)** — F09 REST Countries + F08 Nager.Date Holidays. Both PASS restraints, both have clean Drive specs.
21. **Voice Positioning Moves 1+2** (pending Exemplar B v2 approval).
22. `[MOBILE-INTEL-A]` (HIGHEST priority per v7.27) — Right Now mobile hero card (~50 min). Prereq `[PWA-A]`.

### P2 — Decisions waiting on Jeff (§D in canonical)
23. SeatGeek affiliate revenue link — A vs B
24. BDL milestone vs removal (recommend B per PM-4 finding)
25. F07 TheSportsDB attribution terms read (Rule 45 gate)
26. F12 Google Trends alpha stability (Rule 45 + Rule 48 Class B)
27. Voice Positioning Exemplar B v2 approval (Moves 1+2 blocked)

### P3 — Deferred console errors (carried)
- `/espn-summary/.../nba/summary` 404
- `/mlb-umpire-scrape` 502
- `api.openf1.org` URL encoding
- WNBA Aces logo path 404

## STATE INVARIANTS AT END OF SESSION

- jubilant-bassoon: smoke 241/0 pre-gate, deploys SUCCESS on `5c266fa`
- field-relay-nba: deploys SUCCESS on `6144d17`
- Pre-existing post-gate reds: A313, A314 (PWA-A) — hidden by gate position
- Post-gate greens: **A360, A361, A362, A363, A364, A365, A366, A367, A368** (Phase A scaffolding + four Phase B subtasks + ESPN injuries + NBA playoff leaders + ADR-003 attribution guardrail)
- SW_VERSION `2026-06-01j` live
- **NBA Playoff Leaders feed end-to-end** — covers both relay-side and app-side:
  - Relay `/nba-stats/leagueLeaders` route (NBA_STATS_HEADERS, 900s TTL, /leagueLeaders only)
  - App `_nbaPlayoffLeadersCache` (15-min TTL + localStorage + inFlight dedup)
  - `fetchNBAPlayoffLeaders` → 4-category parallel fetch
  - `_parseNBALeagueLeaders` + `buildNBAPlayoffLeadersByTeam` (TOP_N=30, 4-per-team cap)
  - `getNBAPlayoffLeadersForGame` sync consumer
  - `nbaPlayoffLeadersPrefetch` scheduled at init T+3100ms
- **ADR-003 attribution at three layers**:
  - `populateSeriesContext` sets `game._playoffLeadersAttribution = 'NBA.com'`
  - `buildSeriesContextTags` inlines ` — Stats: NBA.com` into `[PLAYOFF STATS:]` tag
  - `_enforceNBAAttributionFooter` post-process guardrail wraps all three FIELD Brief render paths
- ADR-003 logged to Drive `1XUPoayJUTh2Ki_DYXgw8uOAYZoGtpDt2c7510vGq64w` BEFORE any code wiring
- All prior session state preserved:
  - PM-5 carry: ESPN injuries feed (NHL + NBA), Phase B subtasks 6+7+8
  - PM-4 carry: ESPN injuries feed routing fix
  - PM-3 carry: NHL playoff leaders feed (api-web.nhle.com)
  - PM-2 carry: Axis 3 Phase A + B scaffolding
