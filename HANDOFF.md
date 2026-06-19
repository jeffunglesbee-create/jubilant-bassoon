# FIELD HANDOFF
## HEAD: 95053ed (client) · a597a9a (relay) · 2026-06-19 · via chat

### Session Summary (June 19 2026)
Marathon analysis/strategy + build session (~1AM–4PM ET). 13 Drive docs produced. GameDO WebSocket fix deployed. Outbox cleaned (403MB→31MB). Scout's Pick gates tightened. Rule 67 governance shipped. Full canonical backlog reconciliation completed. Priority list rebuilt with verified compound spec status.

### What Shipped — Relay (field-relay-nba)
- GameDO ID mismatch fix (372640a): V2 prefixed IDs never matched client stripped IDs. WebSocket silently broken all WC week 1. Fix: strip prefix both sides.
- Rule 67 in CLAUDE.md (c3852f1): CC sessions must document to Drive
- FPL PROBE C dynamic GW (a597a9a): reads current GW from bootstrap, not hardcoded 37

### What Shipped — Client (jubilant-bassoon)
- Outbox cleanup (22c4725): 1,290→194 files, 403MB→31MB. outbox/fixtures/ created. Sensitive health data removed.
- Rule 67 in CLAUDE.md + STANDARDS.md (b08a7d1)
- SW_VERSION bump (4dcf3cf): 2026-06-18d → 2026-06-19a
- Scout's Pick tap handler (e3598a4): badge opens bottom sheet. role=button, tabindex=0, keyboard.
- Scout's Pick gate tightening (1e1f8fa): ERA 3.00→2.50, gap 1.20→2.00. 11/14→~2-3/14 qualifying.

### Smoke & Version
- Smoke: 692/0
- SW_VERSION: 2026-06-19c

### Documentation (13 Drive docs)
1. NFL Coverage Gap Analysis (1ymJhQZS)
2. GameDO Architecture & Fixes (1AFhEiAV)
3. Product Philosophy (10HSugxz)
4. Soccer Live Intelligence (1PLvTcUh)
5. Journalism Expansion (14owPhTY)
6. Multiview & Attention Management (1ldrB0Jf)
7. UserDO Sessions & Backfilling (1t0GKf7X)
8. UI Surface Optimization Spec (1GmDRpJx)
9. Outbox Value Assessment (14lHRaiobos)
10. Session Documentation (local, pending Drive)
11. CC Sessions June 14-18 Consolidated (1Uft9f5P)
12. June 11 Session Backfilled (1pfa7MjB)
13. Revised Priority List + Canonical Backlog Update (1WYHeVqsrySX)

Session doc: pending Drive upload

### Context Graph — VERIFIED
Spec complete (docs/CC-CMD-context-graph.md). Building blocks exist (finals-context.js, wc-team-context.js, ARCHIVE_DB). /context/game/{id} endpoint NOT wired. ~30 min relay build unblocks Debrief + Circadian + Replay (~12 hrs downstream).

### Compound Specs — VERIFIED (June 2-16, none fully built)
- Compound Architecture (1cWgNEs3): Schedule + Primitives + Debrief + Replay ~10.5 hrs
- Circadian (1NeAFkfKhBKhq): 5 phases ~6.5 hrs
- Live In-Play Odds (June 14): fully specced, approved ~3-4 hrs
- Journalism Tab (10udrJmsVd0FS): C1 scaffolded uncommitted ~4 hrs
- Archive Intelligence: partially shipped (CC smoke 650→664), audit needed

### API Spend — Decision PAUSED 1 week
- The Odds API: $59/mo (100K, reset June 19)
- API-Sports: 5 Pro plans expire June 29. Football ($19) must renew for WC R32. Basketball/Hockey/NBA ($57) off-season. Baseball ($19) needs evaluation.
- Cloudflare: $5/mo. Claude: $20-100/mo. Gemini: ~$0-5/mo.

### Verified Already Solved
- V2 UTC boundary: fieldDatesToQuery() dual-date query
- Golf stats zeros: buildGolfPromptContext > 0 guards
- GOLF_NBC "usa": cosmetic (ESPN path bypasses BUNDLES), T2

### Priority — Tier 1 (next session)
1. Golf T0: cut line projection (~45 min)
2. Golf T0: pack density badge (~20 min)
3. Desktop back-to-schedule (CSS 5 min)
4. WC group pill navigation bridge (15 min)
5. Context Graph endpoint (~30 min relay, highest leverage)
6. F09 REST Countries (10 min, 18 days overdue)
7. UserDO read loop (~45 min)

### Governance
Rules 60-67 active in both repos. Rule 67: CC sessions must document to Drive or outbox markdown. HANDOFF must reference session doc.

### Carry-Forward
- Build Backlog Canonical v1.0 (1ugUh6Um): 18 days stale, needs ~30 §A additions
- Doc 10 pending Drive upload
- Outbox patents (48 files) pending Drive move
- NFL pipeline: Sept 9 deadline, ~2-3 sessions
- DataGolf: $19/mo, deferred
