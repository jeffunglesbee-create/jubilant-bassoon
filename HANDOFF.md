# FIELD Handoff — May 28 2026

## HEAD
`c677e42` — MLBN: Puppeteer workflow + array schedule + today's 3 confirmed games

## Smoke
224/0 ✅

## Last session — MLBN full implementation

**What was wrong:** statsapi broadcasts(all) does NOT include MLBN for regular carry
games. The tracker only covers Showcase (1/week). MLBN carries multiple games daily.
Screenshot confirmed 3 games today the old system missed entirely.

**What shipped:**
- MLBN_SCHEDULE: redesigned as arrays (multiple games per day)
  Today: ['LAA@DET','ATL@BOS','TOR@BAL'] confirmed from screenshot
  May 29-Jun 2 upcoming games added
- Auto-tag logic: handles string | Array.isArray for MLBN_SCHEDULE
- scripts/mlbn-fetch.js: Puppeteer parser — loads MLBN page, executes JS,
  extracts table, parses "or" games, outputs byDate lookup JSON
- .github/workflows/mlbn-schedule.yml: daily cron 9AM UTC (5AM ET)
  + manual trigger via outbox/.trigger-mlbn-fetch push
  + workflow_dispatch
- outbox/mlbn-schedule.json: seed file with today's data live now

**How MLBN now works:**
1. Daily: mlbn-schedule.yml runs Puppeteer → updates outbox/mlbn-schedule.json
2. TYPE A pending: FIELD reads mlbn-schedule.json from raw.githubusercontent.com
   at load time to auto-tag games dynamically (bypasses static table entirely)
3. For now: static MLBN_SCHEDULE table + seed JSON both active

**TYPE C daily MLBN checklist:**
- Check outbox/mlbn-schedule.json was updated today (see fetched timestamp)
- If stale: manually trigger mlbn-schedule workflow via workflow_dispatch
  OR write to outbox/.trigger-mlbn-fetch and push
- Verify byDate for today matches what's expected
- Update MLBN_SCHEDULE static table for upcoming week if JSON is ahead

**Daily Update Ref (Drive) needs MLBN section** — same paste as previous HANDOFF
Drive ID: 1oSHqnDskN04p95g6e85--4hhgIsKISZ3ZflLXKPM08E

## TIER 0 — DO FIRST NEXT SESSION
1. BNI Patent Fix (~15 min)
2. EMBER Patent Fix (~30 min)
3. NBA Finals G1 Shell TYPE A — update after WCF G6 TONIGHT (OKC or SAS wins)
4. NHL Stanley Cup Final shell — after ECF G5 (May 29, CAR leads 3-1)
5. World Cup 2026 — JUNE 11 DEADLINE
6. TYPE A: FIELD reads mlbn-schedule.json at runtime (raw.githubusercontent.com)
   Wire fetchMLBNSchedule() → replaces static table → full dynamic MLBN detection

## Tonight
WCF G6 OKC@SAS 8:30pm ET NBC/Peacock — determines Finals G1 venue

## Canonical docs
- CI/Deploy Ref: 18JMUd-Uq_m2DomuCua2B5UMiWOel81yzc1JU7SY6f20
- Current State: 1gumlOLcrOOYQlGWpdcYoziIhQQTsmD4Oi3KdVfMpps8
- Daily Update Ref: 1oSHqnDskN04p95g6e85--4hhgIsKISZ3ZflLXKPM08E ← needs MLBN paste

## Repo
jeffunglesbee-create/jubilant-bassoon
PAT: [PAT-in-memory-only] (exp May 2027)
