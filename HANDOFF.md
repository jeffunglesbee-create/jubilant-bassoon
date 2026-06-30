# FIELD HANDOFF

## Session: 2026-06-30 · Daily Update + API-Sports.io Removal + MLS Source Research

**CLIENT HEAD: 159814c**
**SW_VERSION: 2026-06-30a**
**RELAY HEAD: cbedf44**
**SMOKE: 803/0** (fixed this write — prior HANDOFF used "SMOKE" all-caps, A704 checks case-sensitive "Smoke")

---

## THIS SESSION — THREE PARTS

### Part 1: Daily update
- A190 fixed: sw.js SW_VERSION synced to 2026-06-30a
- A704 fixed (then re-broken by a later write, now fixed again — see above)
- NBA Finals closed: Knicks 4-1 over Spurs, Brunson MVP
- Health pipelines green: Oura, Whoop (+auto-auth), Night Owl

### Part 2: API-Sports.io complete removal
Already documented in prior HANDOFF body (commit 159814c was this write). Summary: 4 relay commits removed dead V2 fallback, handleV2Standings, fetchWCInjuries+routes, /apisports passthrough, /fixtures/fetch, 6 orphaned adapters, fixed an AmbientDO landmine (key-presence guard that would've killed SSE), fixed a deploy.yml CI bug (hardcoded health-string check). 1 client commit removed fetchV2Leaders. Codex incident `cf/2026-06-22/api-sports-football-pro-renewal--june-2` marked RESOLVED with full context — this was a deliberate June 26 decision, not an oversight, that just never got closed out.

### Part 3: MLS schedule/stats/competitions source research (NEW — no adapter built, research only)
ESPN confirmed as a working baseline. Then went further: read mlssoccer.com's actual page-source (3 pages: Schedule, Stats, Competitions — Jeff captured via browser save) and the application JS bundle (`base.js`, identical across all 3 pages) to reverse-engineer the real API rather than blind-guess paths. Used the relay's own egress as a temporary diagnostic probe (added → tested → removed, 6 iterations, all confirmed cleanly removed — `cbedf44` deploy verified, zero probe routes live) since mlssoccer.com domains weren't in the chat sandbox's network allowlist.

**Confirmed working: `stats-api.mlssoccer.com`** (no auth). Full details, endpoint shapes, error patterns, and key IDs written to **codex key `mls-schedule-stats-api-2026-06-30`** — read that before building the adapter, don't re-derive.

Headline findings:
- Single competitions registry (20 total) covers Regular Season, Leagues Cup, US Open Cup, Gold Cup, Nations League, Copa America, Club World Cup, FIFA World Cup, MLS NEXT Pro, and more — all through the same `matches/seasons/{season_id}?competition_id=X` shape. No per-competition page ingestion needed.
- `match_date[gte]`/`match_date[lte]` are REQUIRED query params on the matches endpoint, not optional — omitting them returns a validation error, not an empty list (this bit me mid-investigation — false "zero matches" reading until caught).
- Corrected the old `mls-schedule-seed.yml` date assumptions: resumption is July 22 (not 19), season ends Nov 7 Decision Day (not Oct 31).
- No bulk player-stats leaderboard exists in this API (searched exhaustively, confirmed absent) — team/club stats and standings are fully covered, player-level leaders are not.

**Network allowlist**: Jeff added `stats-api.mlssoccer.com`, `dapi.mlssoccer.com`, `sportapi.mlssoccer.com`, `www.mlssoccer.com` to the chat sandbox's egress allowlist. **Not confirmed live as of session close** — direct curl still returned 403 after the addition. Re-test at next session start before relying on direct access; fall back to the relay-probe pattern (documented in codex) if still blocked.

---

## PRIORITY LIST

### 🔧 QUEUED CC-CMDs
1. **Build MLS schedule adapter** using confirmed `stats-api.mlssoccer.com` shape (codex: mls-schedule-stats-api-2026-06-30) — replaces the removed `/fixtures/fetch`, needed before the post-WC MLS schedule (July 22–Nov 7) is otherwise unaccounted for
2. Relay: /journalism/game-lines (docs/CC-CMD-2026-06-27-relay-game-lines.md)
3. Client: card brief line (docs/CC-CMD-2026-06-27-client-card-brief-line.md)

### 🔨 INFRASTRUCTURE
4. Bosnia DB fix + identity-resolver CANONICAL map
5. team_form CONTEXT_SOURCE v3
6. Golf: wire Broadie proxy (Tier 1, $0)

### 📋 OPEN INCIDENTS
7. wentToOT hardcoded false
8. KV editorial keys not consulted
9. NFL SPORT_TO_V2 — September 9
10. Odds Daily Counter stale
11. night_stars phase degraded

### 🏗️ NEXT ADAPTER BACKFILL
NBA CDN → NHLE → Squiggle AFL → MLS (stats-api.mlssoccer.com, confirmed) → ...

---

## KEY CONSTANTS

- ARCHIVE_DB: cc49101c-0569-4d41-8e7a-be139cde4f26
- WC2026_DB: f26669de-e772-4b56-a6d1-f8fdea08a4d4
- Relay: field-relay-nba.jeffunglesbee.workers.dev
- CF account: b57e9af57ab46c52ca9215804e689c29
- Repo: jeffunglesbee-create/jubilant-bassoon
- MLS stats API: stats-api.mlssoccer.com (no key) — see codex mls-schedule-stats-api-2026-06-30

SESSION END: RELAY cbedf44 · CLIENT 159814c · 2026-06-30 · API-Sports removed + MLS source confirmed (research, no adapter) · via chat
