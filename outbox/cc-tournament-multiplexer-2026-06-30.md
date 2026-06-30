# CC Session — Tournament Competition Multiplexer
**Date:** 2026-06-30  
**Branch:** claude/elegant-shannon-t2dvt0  
**CC-CMD:** docs/CC-CMD-2026-06-30-tournament-multiplexer.md  

---

## Probe Results

### Probe 1 — /archive/game endpoint (PASS)
GET returns 404 "Archive endpoint not found" — expected for POST-only route (handler explicitly returns 404 on non-POST).  
STOP CONDITION NOT MET: endpoint exists. POST path confirmed in relay index.js:7685.  
series_key routing: confirmed via CC-CMD BACKGROUND (written by session that read index.js:7710-7760 directly).

### Probe 2 — Real MLS club roster count
UNVERIFIABLE from CC sandbox:  
- relay `/mls/stats/clubs/*` → "MLS Stats path not allowed" (not in relay allowlist)  
- stats-api.mlssoccer.com not in browser_quick allowlist  
- Direct HTTP to relay blocked by proxy (403 Tunnel)  

CC-CMD BACKGROUND claim: 30 clubs, verified at session write time.  
Script's `get_real_club_roster()` fetches live roster on every run — count verified at CI execution time.

### Probe 3 — Competition registry (PASS)
Source: relay `/mls/stats/competitions` via browser_quick  
Result: 20 total competitions, 15 tagged `competition_type: "Tournament"`  
Matches CC-CMD claims exactly.  
Tournaments include: MLS Cup Playoffs (MLS-COM-000002), US Open Cup (MLS-COM-00002U),  
Leagues Cup (MLS-COM-000006), Campeones Cup (MLS-COM-000007), Concacaf Champions Cup (MLS-COM-00000K),  
plus Copa America, Nations League, Gold Cup, FIFA World Cup, MLS All-Star Game, etc.

### Probe 4 — US Open Cup bracket shape (PASS)
Source: relay `/mls/stats/matches/seasons/MLS-SEA-0001KA?competition_id=MLS-COM-00002U` via browser_quick  
Confirmed:  
- `bracket_structure_id` present: F-01, SF-01, SF-02, QF-01..QF-04 etc.  
- TBC teams confirmed: `home_team_id: "MLS-CLU-00001H"`, `away_team_id: "MLS-CLU-00001J"`  
- `series_type: ""` on all sampled matches — NO two-legged ties confirmed for 2026 Open Cup  
- 32 total matches across 7 rounds (First Round → Final)

Two-legged tie status: NOT PRESENT in 2026 US Open Cup data. `game_number: 1` hardcoded in script is correct.  
If a future competition uses two-legged ties, `series_type` will be non-empty — that becomes the trigger for a future enhancement.

---

## Files Delivered

| File | Type | Notes |
|------|------|-------|
| `scripts/seed-mls-tournaments-2026.py` | NEW | Entity-filtered tournament sync, iterates all 15 Tournament-type comps |
| `.github/workflows/mls-tournaments-seed.yml` | NEW | Daily 11am UTC cron, workflow_dispatch |
| `smoke.js` | MODIFIED | +4 assertions (A-TOURN-1 through A-TOURN-4), 803→807 |

Smoke: 807/0 ✅ (on local main branch)

---

## D1 Verification — STAGED

### Pre-seed state (confirmed via D1 MCP direct query, 2026-06-30)
```
postseason_games: NBA 15, NHL 15, UFL 2, MLS 0
```
MLS rows confirmed absent — seed has not run yet. Table exists with correct schema.

### Blocker
Two proxy restrictions prevent in-session execution:
1. `*.workers.dev:443` → 403 Tunnel from CC bash — relay `/archive/game` POST blocked
2. `stats-api.mlssoccer.com` → 403 Tunnel from CC bash — roster fetch blocked
3. Workflow dispatch → 404 because `.github/workflows/mls-tournaments-seed.yml` is only on feature branch, not `main` (GitHub only registers workflows from default branch)

### Unblock criteria (per Rule 74 — STAGED-GATE-A)
**Blocked by:** PR merge to main  
**Unblocked when:** `mls-tournaments-seed.yml` lands on main  
**Auto-runs:** daily at 11am UTC from that point  
**Manual trigger:** `workflow_dispatch` via GitHub Actions UI or `gh workflow run mls-tournaments-seed.yml`

### Verification queries (run after first CI execution)
```sql
-- Row count by competition
SELECT league, COUNT(*) as cnt FROM postseason_games WHERE sport='MLS' GROUP BY league ORDER BY cnt DESC;

-- All MLS rows (spot-check bracket IDs, rounds, teams)
SELECT id, league, round, home, away, date FROM postseason_games WHERE sport='MLS' ORDER BY date LIMIT 20;

-- TBC exclusion (expect 0)
SELECT COUNT(*) as tbc_count FROM postseason_games WHERE sport='MLS' AND (home LIKE '%TBC%' OR away LIKE '%TBC%');
```

**Expected:**
- Leagues with rows: MLS Cup Playoffs, US Open Cup, Leagues Cup, Campeones Cup, CONCACAF Champions Cup
- TBC count = 0 (entity filter excludes MLS-CLU-00001H / MLS-CLU-00001J)
- Idempotency: rerun → same total count, no duplicates (COALESCE UPSERT)

---

## Known Gaps (per CC-CMD)

1. `espn_event_id` null on all tournament rows — cross-referencing with ESPN for xG/stats is a separate identity-resolution problem
2. Client-side card rendering for `round` field (e.g. "Quarterfinal" badge) unverified — dozens of existing read paths serve postseason_games generically, cards should appear, but tournament-specific display untested
3. Two-legged ties not built — `series_type` was empty on all 2026 Open Cup samples; if a future comp has them, flag at that time
