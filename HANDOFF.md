# FIELD HANDOFF

## Session: 2026-06-30 · Daily Update + API-Sports.io Complete Removal

**CLIENT HEAD: 91d9f78**
**SW_VERSION: 2026-06-30a**
**RELAY HEAD: f2f2bc0**
**SMOKE: 803/0**

---

## API-SPORTS.IO — COMPLETE REMOVAL (this session)

### Context
June 26 2026 session (Drive 1Dk-Uv6LMBToLZj7HTafFNWg3_n4SIQUgCPC7PpAhRfc) migrated all V2_LEAGUES sports off API-Sports onto ESPN/NBA-CDN/NHLE/BSD and resolved the Football Pro billing as **do-not-renew** (deliberate decision, not an oversight). The codex incident tracking the June 29 deadline was never closed out, so it kept surfacing as stale. Today's live probe confirmed the account is on free tier ("Free plans do not have access to this season") — consistent with do-not-renew.

A full audit beyond the June 26 session's scope found additional orphaned/active API-Sports surface area that migration missed:

### Relay (field-relay-nba) — 4 commits
- **2463320** — removed: dead V2 fallback in handleV2Games (unreachable since June 26, confirmed via comments), handleV2Standings + route, fetchWCInjuries + /wc/injuries + /wc/injuries/refresh, generic /apisports/* passthrough + APISPORTS_HOSTS/APISPORTS_ALLOWED/apiSportsAllowed/apiSportsTtl, /fixtures/fetch admin route, 6 orphaned adapter functions (adaptBasketball/adaptApiNba/adaptHockey/adaptBaseball/adaptAFL/adaptFootball + parseFootballStats/deriveManAdvantage) + v2State/v2Period/v2Clock helpers (zero remaining callers, verified)
- **c56251b** — fixed: AmbientDO `_poll()` had `if (!this.env.APISPORTS_KEY) return;` — a landmine that would have silently killed the entire SSE ambient stream the moment the secret was deleted, despite `_fetchSport` never actually needing it (self-calls already-migrated `/v2/games`)
- **6f9ae21** — relabeled: GameDO `source: 'apisports'` → `source: 'v2'` (was never actually calling api-sports.io — self-calls `/v2/games`)
- **f2f2bc0** — fixed: deploy.yml CI health gate had a hardcoded `grep -q "apisports"` check against `/health` — broke the moment the string was removed from the health response. Replaced with `squiggle`. **This is why 2 of the first 3 deploys showed as CI failures even though the actual Worker deploy succeeded both times** — pure CI-script bug, not a deployment problem.

### Client (jubilant-bassoon) — 1 commit (fbe5a63)
- Removed `fetchV2Leaders` + `_v2LeaderCache` + `V2_LEADER_TTL` + call site (NBA/WNBA in-game leaders — separate basketball-tier API-Sports product the June 26 migration didn't cover, since it tracked only the primary score pipeline)
- A245 converted to removal-confirmation assertion (A243 pattern)
- `_scoresBySource[key].apisports` witness labeling left intact (deliberate, in-scope decision) — confirmed it's populated from the already ESPN/CDN/NHLE-sourced `/v2/games` response, not a direct api-sports.io call. Naming-only staleness, not a functional dependency; renaming would touch smoke.js assertions (A397 etc.) for zero behavior change. Flagged as optional follow-up, not executed.

### Verification
- Local full-clone smoke: 803/0
- Client CI: Deploy gate + Code Map + both viewport audits green on fbe5a63
- Relay deploy/verify: f2f2bc0 deployed, match: true
- Live re-probe: `/apisports/*` → 403, `/v2/standings` → 404, `/wc/injuries` → 404 (all correctly gone, no more silent calls to a dead paid API)
- Live production (jubilant-bassoon.jeffunglesbee.workers.dev) confirmed serving updated index.html, zero `fetchV2Leaders`/`_v2LeaderCache` occurrences
- Codex incident `cf/2026-06-22/api-sports-football-pro-renewal--june-2` updated to RESOLVED with full context

### Gap surfaced (not actioned — needs your decision)
`/fixtures/fetch` was the only data source for `mls-schedule-seed.yml` (post-WC MLS schedule, July 19–Oct 2026 window, not yet run). That seed would have failed anyway once executed (api-sports football free tier rejects season=2026), so removing the route doesn't create a new failure — but the post-WC MLS schedule now has **no data source** lined up. Needs a replacement (ESPN schedule endpoint, most likely) before mid-July.

---

## EARLIER THIS SESSION — Daily Update

- A190 fixed: sw.js SW_VERSION synced to 2026-06-30a (commit cce3738)
- A704 fixed: HANDOFF.md refreshed with required fields
- NBA Finals closed: Knicks 4-1 over Spurs, Brunson Finals MVP
- Health pipelines green: Oura ✅, Whoop ✅ (+ auto-auth), Night Owl ✅

---

## DATA HEALTH (last check)

6/10 sources healthy. 4 stale are expected off-season (NBA Clutch x2, NHL Series) or under investigation (Odds Daily Counter).

---

## PRIORITY LIST

### 🔧 QUEUED CC-CMDs
1. Relay: /journalism/game-lines (docs/CC-CMD-2026-06-27-relay-game-lines.md)
2. Client: card brief line (docs/CC-CMD-2026-06-27-client-card-brief-line.md)

### 🔨 INFRASTRUCTURE
3. Post-WC MLS schedule seed — needs new data source (see gap above)
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
NBA CDN → NHLE → Squiggle AFL → ...

---

## KEY CONSTANTS

- ARCHIVE_DB: cc49101c-0569-4d41-8e7a-be139cde4f26
- WC2026_DB: f26669de-e772-4b56-a6d1-f8fdea08a4d4
- Relay: field-relay-nba.jeffunglesbee.workers.dev
- CF account: b57e9af57ab46c52ca9215804e689c29
- Repo: jeffunglesbee-create/jubilant-bassoon

SESSION END: RELAY f2f2bc0 · CLIENT 91d9f78 · 2026-06-30 · API-Sports.io removed, 803/0 · via chat
