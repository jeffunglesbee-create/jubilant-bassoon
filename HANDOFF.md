# FIELD HANDOFF
## HEAD: ccc244b (client) · 5fede09 (relay) · 2026-06-18 · via chat + CC

### Session Summary (June 18 2026)
Golf layer end-to-end build for US Open R1. Governance overhaul (Rules 60-66) after cross-session integration failures. DataGolf reassessment: ESPN stats are POST-ROUND ONLY.

### What Shipped — Relay (field-relay-nba)
- Canonical response shape in handleGolfEnriched (CC a2df1e4): eventName→name, pos→position, flat stats→nested stats
- Date normalization: accepts YYYY-MM-DD and YYYYMMDD (226fe19, 516b89b)
- thru + today extracted from linescores (1d0227a)
- Broadcasts from ESPN competitions (5fede09)
- Golf cron context: buildGolfCronContext (14e9cc6)
- External probes non-blocking: continue-on-error (8e6ea98)
- Cache key v2: golf:enriched:v2:{date_clean}
- Rules 60-66 in CLAUDE.md

### What Shipped — Client (jubilant-bassoon)
- ESPN PRIMARY Golf section creator (3048dc7). SlashGolf removed from PGA Tour.
- buildSlashGolfGamesForToday wired (CC 17721de → db0d7d0)
- Band-aids removed: normalization, date conversion, auto-create hack (CC fc8b62b)
- computeGolfDerivedMetrics standalone function (CC fc8b62b)
- Broadcast from relay data, not hardcoded GOLF_CBS (a17fb01)
- Zero-stat gate in journalism prompt (55de318)
- Estimated SG engine: Putting/Approach/OTT/ball-striking/momentum (ce83266)
- Outbox→Drive workflow fix (3d12453)
- Rules 60-66 + case studies + governance principle in CLAUDE.md + STANDARDS.md
- A649: ESPN primary assertion. A650: band-aid regression guard.
- CI-as-proxy golf contract probe workflow

### Smoke & Version
- Smoke: 690/0
- SW_VERSION: 2026-06-18c

### CRITICAL: ESPN stats are POST-ROUND ONLY
ESPN returns ALL ZEROS for GIR/driving/accuracy/putts during live rounds.
Verified US Open R1: Burns thru 5, McDowell thru 6 — all stats zero.
Stats populate after round completion. FIELD estimated SG engine non-functional during live play.
DataGolf ($19/mo) is the ONLY source of live analytics.
Correction doc: 11uLW4P3uOzhZHNtC52X0mkgdREBgf-BLaUCDcHqKD_4

### Governance — Rules 60-66
- R60: Relay owns data contract
- R61: End-to-end before done (STAGED vs SHIPPED)
- R62: Follow existing conventions
- R63: No dead code
- R64: Band-aid detection
- R65: Handoff includes integration state
- R66: Mandatory smoke before push
- Principle: "Be fast but don't hurry" — John Wooden

### Carry-Forward
- DataGolf subscription ($19/mo) — urgent given ESPN limitation
- Golf T0: cut line projection, pack density, drama score
- Drift detection agent (~1hr CC)
- CFL data source (ESPN stale)
- CC web sandbox can't curl relay — use CI-as-proxy
- CC pushes to main, not branches
