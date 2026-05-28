# FIELD Handoff — May 28 2026

## HEAD
`1921435` — TYPE C: Add MLBN_SCHEDULE table + auto-tag wiring

## Smoke
224/0 ✅

## Last session
TYPE C continued — MLBN implementation + cors-probe fix

- MLBN_SCHEDULE static table: 14 Showcase games Apr-Jul 2026
- Auto-tag wired: MLBN_SCHEDULE[TODAY_ISO] fires mlbnShowcase:true
- Non-exclusive: local RSN still airs, MLBN chip shows alongside RSN chip
- cors-probe.yml fixed: set +e prevents curl HEAD failures aborting step
- statsapi.mlb.com confirmed CORS-open (access-control-allow-origin: *)
- No MLBN game today confirmed via cors-probe

## How MLBN works (all future sessions)
Primary: mlb.com/network/shows/regular-season-games is JS-rendered — cannot web_fetch
Sandbox workaround: cors-probe → statsapi broadcast data
  Trigger: url=https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=YYYY-MM-DD&hydrate=broadcasts%28all%29,team
  limit=45000 on second line. Commit, wait 60s, git pull, read cors-result-*.txt
  Grep for 'MLB Network' in broadcasts array
Update MLBN_SCHEDULE table when new games found.
TYPE A pending: fetchMLBNBroadcasts() runtime auto-detect (statsapi CORS-open in browser)

## Daily Update Ref NEEDS MANUAL UPDATE
Drive ID: 1oSHqnDskN04p95g6e85--4hhgIsKISZ3ZflLXKPM08E
Add MLBN section after PEACOCK GOTD (paste from HANDOFF above). Cannot write Drive from sandbox.

## TYPE C daily checklist (updated)
1. ESPN GOTD: compare against ESPN_GOTD_SCHEDULE block
2. Peacock GOTD: peacocktv.com/blog weekly
3. MLB Network: cors-probe statsapi OR verify in MLBN_SCHEDULE for today

## TIER 0 — DO FIRST NEXT SESSION
1. BNI Patent Fix (~15 min)
2. EMBER Patent Fix (~30 min)
3. NBA Finals G1 Shell TYPE A — update after WCF G6 TONIGHT (OKC or SAS wins)
4. NHL Stanley Cup Final shell — add after ECF G5 (May 29)
5. World Cup 2026 — JUNE 11 DEADLINE
6. TYPE A: fetchMLBNBroadcasts() runtime auto-detect

## Watch tonight
WCF G6 OKC@SAS 8:30pm ET NBC/Peacock — determines Finals G1 venue

## Canonical docs
- CI/Deploy Ref: 18JMUd-Uq_m2DomuCua2B5UMiWOel81yzc1JU7SY6f20
- Current State: 1gumlOLcrOOYQlGWpdcYoziIhQQTsmD4Oi3KdVfMpps8
- Daily Update Ref: 1oSHqnDskN04p95g6e85--4hhgIsKISZ3ZflLXKPM08E

## Repo
jeffunglesbee-create/jubilant-bassoon
PAT: [PAT-in-memory-only] (exp May 2027)
