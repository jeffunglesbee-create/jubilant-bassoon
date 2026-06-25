# FIELD HANDOFF
## Session: 2026-06-25 · BSD Integration Complete + Pitch Component Queued

---

## FIELD — Current State

**CLIENT HEAD: 4d4b78e · 2026-06-25 · win prob chip A739, SW 2026-06-25a**
**RELAY HEAD: e49debf · 2026-06-25 · deployed ✅**
Smoke (client): 755/0 · SW_VERSION: 2026-06-25a
CF account: b57e9af57ab46c52ca9215804e689c29

---

## ⚡ PENDING: CC-CMD-G — jubilant-bassoon pitch component

**One-liner:**
```
cd /home/claude/jubilant-bassoon && git pull && cat docs/CC-CMD-2026-06-25-G-jb-pitch-component.md
```

Routed from field-relay-nba (where CC wrote it) to jubilant-bassoon/docs/ at `5399f9a`.
All relay dependencies are live. This is a client-only session.

**What CC-CMD-G builds (5 tasks):**
1. Transform util (`bsdCoordsToSVG`) — reads `/bsd/contract`, converts (x,y) to SVG px
2. Pitch SVG component (`renderBSDPitch`) — draws pitch outline, shot dots, ball dot
3. Live hook (`useBSDLive`) — SSE listener for `bsd:ball` and `bsd:stats` frames
4. Game-view wiring — shows pitch overlay when `game.bsdEventId` is set
5. Smoke assertions

**Timing:** First live verification available ~20:00 UTC tonight (Ecuador @ Germany).
USA vs Turkey at 02:00 UTC tomorrow is the primary WC target.

**If axis convention is wrong after first live game:**
One-line patch — either bump `awayPerspective: true` in `bsd-pitch.js` OR
change `/bsd/contract` axis description and bump `revision` to `2026-06-25-2`.
Contract is single source of truth; propagates to all clients on next refresh.

---

## RELAY — What Shipped This Session (CC-CMDs A–F)

| Commit | Feature |
|--------|---------|
| `8cdb23a` | BSD relay routes — shotmap, momentum, incidents, odds, tennis |
| `750cb85` | /bsd added to probe ALLOWED_PREFIX |
| `b5c9983` | ATP/WTA V2_LEAGUES + ESPN tennis + espn_summary |
| `7f9aaf1` | buildBSDMomentumContext CONTEXT_SOURCE |
| `e5b84f1` | BSD WebSocket → AmbientDO live ball tracking |
| `e5cddf5` | bsdEventId injection in handleV2Games |
| `e49debf` | /bsd/contract coordinate spec endpoint |

All deployed at `e49debf`. deploy/verify: deployed=e49debf ✅

**`/bsd/contract` live at:**
```
GET https://field-relay-nba.jeffunglesbee.workers.dev/bsd/contract
```
Returns: coordinateSystem, transformReference, frameShapes, revision, status.
No token required. 5-min cache. Status: provisional (pending live verification tonight).

**`bsdEventId` wiring:**
- 3 occurrences in index.js (enrichment assign + null-guard + string coercion)
- AbortSignal.timeout(3000) guards the BSD fetch
- Non-blocking — BSD outage never breaks V2 game response
- Will populate automatically when WC games go live tonight

---

## CLIENT — What Shipped This Session (CC-CMDs E)

| Commit | Feature |
|--------|---------|
| `4d4b78e` | Win probability chip A739, SW sync 2026-06-25a |

---

## OPEN ITEMS

- **API-Sports Football Pro renewal — JUNE 29 ⚠️** (4 days)
  All 9 subscriptions have free replacements confirmed. Recommend cancel all.
- Wimbledon draw tomorrow June 27 — ATP/WTA routes live and ready
- All-Star Selector (July 6)
- wpLowest relay enrichment (comeback badge — Rule 70 atomic, separate CC-CMD)
- context-assembler.js golf + football label one-liners (relay)
- The 33: 26 features + I3 pending

---

## SESSION START PROTOCOL — Rule 85

**L2:**
1. `tool_search("FIELD Handoff session health")`
2. `tool_search("codex commit write file source")`

**L3:**
```bash
curl -s "https://raw.githubusercontent.com/jeffunglesbee-create/jubilant-bassoon/main/CODE_MAP.json" \
  | python3 -c "import json,sys; m=json.load(sys.stdin); print(f'{len(m[\"functions\"])} functions')"
```

NOTE: session_health is compromised — use /quality/report + live probes.

---

## Drive Docs
The 33 — 1XDR6lzgP3vBH4Yg9Byb9C4GGAjKxuJRcV7bkF8pf4wk
Product Feature Inventory v2 — 1BbOqlV9JhFlCvwgfizNQW9LMG6lnNrNTp4yUgi7ZC2o
Session doc (2026-06-25 build) — 1JVSpkcZtV24OgbAuEwCZqSGh_ACKX145pkDq2scJq7Y
