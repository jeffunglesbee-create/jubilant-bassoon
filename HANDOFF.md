# FIELD Handoff — May 28 2026

## HEAD
`b2eb3c0` — Phase 2: Schedule Automation — live JSON at startup

## Smoke
228/0 ✅ (includes A223-A226 Phase 2 assertions)

## Last session — Schedule Automation Phase 2 COMPLETE

### What shipped:
- `_fieldDataCache`: fetches `field-data-today.json` (schema 2.0) from raw.githubusercontent.com
- `_mlbnDataCache`: fetches `mlbn-schedule.json` byDate lookup from raw.githubusercontent.com
- `fetchScheduleData()`: parallel fetch with 1500ms timeout before first render
  Fast connections get live data on first render. Offline/slow = hardcoded fallback.
- `mlbGames` source: `_fieldDataCache.schedules.mlb` when fresh (dated today, schema 2.0)
  Falls back to hardcoded `mlbRaw` when JSON stale/unavailable
- `game_overlays`: AI matchupNotes from Gemini auto-applied to MLB games
- Postponed games: `_postponed` flag removes game from schedule automatically  
- MLBN: `_mlbnDataCache[TODAY_ISO]` checked before static `MLBN_SCHEDULE`
- SW_VERSION: 2026-05-28b

### MLBN spec update (for Drive doc 1XiXo3jQ6f9k0S7YgwpQ6OwBrBoT0R80-5sSmeMefo_U):
Add to BROADCAST RULES section:
  MLB NETWORK: NOT in statsapi broadcasts(all) — confirmed cors-probe May 28.
  Source: mlbn-schedule.json (Puppeteer workflow mlbn-schedule.yml, daily 9AM UTC)
  Client reads _mlbnDataCache via fetchScheduleData() — same Phase 2 fetch chain
  MLBN carries multiple games daily (3 today: LAA@DET, ATL@BOS, TOR@BAL)
  Static MLBN_SCHEDULE table remains as fallback

Update STATUS to: Phase 1 COMPLETE (May 28 2026), Phase 2 COMPLETE (May 28 2026)
Update PHASE 3 to: immediate next action (update TYPE A protocol docs ~30 min)

### Phase 3 still needed (~30 min):
- Update Daily Update Reference (Drive 1oSHqnDskN04p95g6e85--4hhgIsKISZ3ZflLXKPM08E)
  Remove: "Research all games, write all entries, verify broadcasts"
  Add: "Verify field-data JSON output (run workflow_dispatch if stale), add playoff matchupNotes"
  Add MLBN section (paste from previous HANDOFF)
- Update STANDARDS.md Rule 11 TYPE A checklist

## TIER 0 — DO FIRST NEXT SESSION
1. BNI Patent Fix (~15 min)
2. EMBER Patent Fix (~30 min)
3. NBA Finals G1 Shell TYPE A — update venue after WCF G6 result TONIGHT
4. NHL Stanley Cup Final shell — after ECF G5 (May 29)
5. World Cup 2026 — JUNE 11 DEADLINE
6. Phase 3: update TYPE A protocol docs (~30 min)

## Tonight
WCF G6 OKC@SAS 8:30pm ET NBC/Peacock — Finals G1 venue determined

## Current automation stack:
- field-data.yml: 7:30 AM UTC daily → outbox/field-data-today.json (schema 2.0)
  MLB: 6+ games with broadcast assignment, ESPN/Peacock GOTD flags
  NHL/NBA: series records, playoff flags
  AI: Gemini matchupNotes for national broadcast + playoff games
- mlbn-schedule.yml: 9:00 AM UTC daily → outbox/mlbn-schedule.json
  Puppeteer scrapes mlb.com/network/shows/regular-season-games
  byDate lookup for all MLBN games including non-Showcase carry games
- Phase 2 client: fetchScheduleData() on page load, 1500ms timeout
  MLB from JSON replaces mlbRaw for regular season games
  MLBN from JSON replaces static table for today's detection

## Canonical docs
- CI/Deploy Ref: 18JMUd-Uq_m2DomuCua2B5UMiWOel81yzc1JU7SY6f20
- Current State: 1gumlOLcrOOYQlGWpdcYoziIhQQTsmD4Oi3KdVfMpps8
- Schedule Automation Spec: 1XiXo3jQ6f9k0S7YgwpQ6OwBrBoT0R80-5sSmeMefo_U ← update status+MLBN
- Daily Update Ref: 1oSHqnDskN04p95g6e85--4hhgIsKISZ3ZflLXKPM08E ← Phase 3 update needed

## Repo
jeffunglesbee-create/jubilant-bassoon
PAT: [PAT-in-memory-only] (exp May 2027)
