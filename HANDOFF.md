# FIELD HANDOFF
## Session: 2026-06-25 · BSD Pipeline Complete

---

## FIELD — Current State

**CLIENT HEAD: 05a1aef · 2026-06-25 · bsdEventId + pitch A_BSD_7/8 · Smoke 757/0**
**RELAY HEAD: a55ebd3 · 2026-06-25 · deployed ✅ — R2 capture at WC game-final**
SW_VERSION: 2026-06-25a · CF account: b57e9af57ab46c52ca9215804e689c29

---

## BSD PIPELINE — WIRED (a55ebd3)

When WC game goes final with `bsdEventId`:
1. `bsd_event_id` → `wc_results` D1 (column added 2026-06-25, 54 rows all null until tonight)
2. momentum + stats + incidents + avg-positions → R2 `bsd/wc26/{id}/{type}.json`
3. Client `_bsdActivateForWC()` → AmbientDO subscribe → `_bsdRepaint()` SVG pitch
4. `buildBSDMomentumContext` → `[BSD MOMENTUM]` journalism block (live games)

R2 binding: `FIELD_DATA` → `field-relay-data`

---

## ⚡ PENDING: CC-CMD-H (field-relay-nba)

**Run AFTER Ecuador vs Germany goes final (~22:00 UTC tonight)**

```
cd /home/claude/field-relay-nba && git pull && cat docs/CC-CMD-2026-06-25-H-bsd-history-context.md
```

Tasks: (1) BSD WC league_id discovery + MD1-MD2 bsd_event_id backfill via live probe,
(2) `buildBSDHistoryContext` CONTEXT_SOURCE reading R2 for prior match data,
(3) `/bsd/r2/list` relay route + `<div id="bsd-pitch">` in WC game card DOM.

---

## RELAY COMMITS (2026-06-25)

| Commit | Feature |
|--------|---------|
| `8cdb23a` | BSD relay routes — shotmap, momentum, incidents, odds, tennis |
| `750cb85` | /bsd to probe ALLOWED_PREFIX |
| `b5c9983` | ATP/WTA V2_LEAGUES + tennis branch + espn_summary |
| `7f9aaf1` | buildBSDMomentumContext CONTEXT_SOURCE |
| `e5b84f1` | BSD WebSocket → AmbientDO live ball tracking |
| `e5cddf5` | bsdEventId injection in handleV2Games |
| `e49debf` | /bsd/contract + /bsd/events/season + /bsd/events/by-date |
| `0af35ca` | bsd_event_id persisted to wc_results at game-final |
| `a55ebd3` | R2 capture at game-final (all 4 BSD endpoints) |
| `f9b4c09` | docs: CC-CMD-H [skip ci] |

---

## CLIENT COMMITS (2026-06-25)

| Commit | Feature |
|--------|---------|
| `4d4b78e` | Win probability chip A739 + SW sync 2026-06-25a |
| `05a1aef` | bsdEventId through mapV2ToESPN + bsd:ball/stats SSE + pitch A_BSD_7/8 |

---

## OPEN ITEMS

- **API-Sports Football Pro renewal — JUNE 29 ⚠️** (4 days) — DO NOT RENEW
- identity-resolver.js: add Ecuador, Germany, Japan, Sweden + other MD3 teams before 20:00 UTC
- Wimbledon draw June 27 — ATP/WTA routes live and ready
- All-Star Selector (July 6)
- wpLowest relay enrichment (comeback badge — Rule 70 atomic)
- session_health compromised — use /quality/report + live probes
- The 33: 26 features + I3 pending

---

## SESSION START PROTOCOL — Rule 85

L2: `tool_search("FIELD Handoff session health")` + `tool_search("codex commit write source")`
L3: `curl -s https://raw.githubusercontent.com/jeffunglesbee-create/jubilant-bassoon/main/CODE_MAP.json | python3 -c "import json,sys; m=json.load(sys.stdin); print(f'{len(m[\"functions\"])} functions')"`

NOTE: session_health compromised. Use /quality/report + live probes.

---

## Drive Docs
The 33 — 1XDR6lzgP3vBH4Yg9Byb9C4GGAjKxuJRcV7bkF8pf4wk
Product Feature Inventory v2 — 1BbOqlV9JhFlCvwgfizNQW9LMG6lnNrNTp4yUgi7ZC2o
Session doc (2026-06-25 build) — 1JVSpkcZtV24OgbAuEwCZqSGh_ACKX145pkDq2scJq7Y

---

## STAT
HEAD: 2d18fff · 572 companies · smoke 213/213
