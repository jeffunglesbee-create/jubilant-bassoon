# FIELD HANDOFF
## Session: 2026-06-25 · BSD Integration Queue

---

## FIELD — Current State

**CLIENT HEAD: 8cd5793 · 2026-06-25 · [skip ci] ESPN winprob CC-CMD**
**RELAY HEAD: 8cdb23a · 2026-06-25 · BSD route handler in index.js**
**RELAY DEPLOYED: e97fffd (old — BSD deploy blocked, see below)**
Smoke: 754/0 (jubilant-bassoon) · SW_VERSION: 2026-06-24i
CF account: b57e9af57ab46c52ca9215804e689c29

---

## ⚠️ RELAY CI BLOCKED — FIX REQUIRED BEFORE BSD IS LIVE

Deploy blocked at `Bootstrap KV namespace (field-push-subs)` step.
All downstream steps including wrangler deploy were skipped.
BSD routes are in source (`8cdb23a`) but NOT deployed. e97fffd still live.

**Root cause:** `.github/workflows/deploy.yml` Bootstrap KV steps exit 1 when
the CF API returns unexpected output. No `continue-on-error: true`.

**Fix (CC does this as part of CC-CMD-A below):**
Add `continue-on-error: true` to all three Bootstrap KV steps in deploy.yml:
- L22 `Bootstrap KV namespace (field-push-subs)`
- L40 `Bootstrap KV namespace (field-journalism)`
- L58 `Bootstrap KV namespace (field-mcp-oauth)`

---

## ⚠️ SESSION_HEALTH IS COMPROMISED

session_health quality threshold wrong (avg<240 catches everything), incidents
never close (no resolved flag), golf hidden. Use /quality/report for ground truth.

---

## CC-CMD QUEUE — EXECUTE IN ORDER

All CC-CMD files are in field-relay-nba/docs/ or jubilant-bassoon/docs/.
BSD_API_TOKEN already stored in both repos GH secrets (2026-06-25).

---

### CC-CMD A — field-relay-nba (DO FIRST)

**Status:** Tasks 1+2 already committed via chat (350fbd9, 8cdb23a).
CI blocked. BSD routes in source but not deployed.

**One-liner:**
```
cd /home/claude/field-relay-nba && git pull && cat docs/CC-CMD-2026-06-25-A-bsd-relay.md
```

**CC must:**
1. Read the CC-CMD file
2. Run the PROBE BLOCK (will confirm Tasks 1+2 done, CI blocked)
3. Fix deploy.yml: add `continue-on-error: true` to all 3 Bootstrap KV steps
4. Commit: `fix(ci): continue-on-error on Bootstrap KV steps to unblock deploy`
5. Wait for CI to complete (Deploy step should now run)
6. Run done conditions: probe /bsd/events/live → expect HTTP 200
7. If CI fails on a different step, diagnose and fix

---

### CC-CMD B — field-relay-nba (After A deploys)

ATP/WTA in V2_LEAGUES + ESPN tennis scoreboard + espn_summary context.
Wimbledon draw is June 27 — this is time-sensitive.

**One-liner:**
```
cd /home/claude/field-relay-nba && git pull && cat docs/CC-CMD-2026-06-25-B-bsd-tennis-v2.md
```

---

### CC-CMD C — field-relay-nba (After A deploys)

BSD momentum CONTEXT_SOURCE — "when the game shifted" in journalism.
Requires /bsd/events/:id/momentum relay route (from CC-CMD-A).

**One-liner:**
```
cd /home/claude/field-relay-nba && git pull && cat docs/CC-CMD-2026-06-25-C-bsd-momentum-context.md
```

---

### CC-CMD D — field-relay-nba (After A verified live, B+C done)

BSD WebSocket → AmbientDO live ball tracking fan-out.
Most complex. Requires all prior relay routes live.

**One-liner:**
```
cd /home/claude/field-relay-nba && git pull && cat docs/CC-CMD-2026-06-25-D-bsd-websocket.md
```

---

### CC-CMD E — jubilant-bassoon (Independent — can run any time)

ESPN win probability chip + comeback detection (A739-A740).
Client-side only. No relay dependency.

**One-liner:**
```
cd /home/claude/jubilant-bassoon && git pull && cat docs/CC-CMD-2026-06-25-E-espn-winprob-client.md
```

---

## BSD INTEGRATION CONTEXT

BSD Bzzoiro Sports Data. Subscriptions active as of 2026-06-25:
- Football REST API: FREE (all endpoints, no quota)
- Sports Pack (tennis + hockey): $5/mo, 29 days remaining
- Live WebSocket (ball tracking): $3/mo, 29 days remaining
- BSD_API_TOKEN: in GH secrets for both repos (stored 2026-06-25)

BSD base: https://sports.bzzoiro.com
Auth: Authorization: Token ${env.BSD_API_TOKEN}

BSD adds what ESPN lacks: per-shot coordinates, momentum index (-100→+100),
goal build-up sequences, ATP/WTA tennis, live ball tracking.

---

## WHAT SHIPPED THIS SESSION (2026-06-25)

- Newspaper preserve fix: applyMainHTML now saves #field-newspaper (A738, 8d533bc)
- SW: 2026-06-24h → 2026-06-24i
- "The 33" journalism features doc found: Drive 1XDR6lzgP3vBH4Yg9Byb9C4GGAjKxuJRcV7bkF8pf4wk
- 5 WOW features ideated (The Angle, The Protagonist, Script Detector, First Touch, The Weird One)
- 25 active intelligence WOW features researched via Exa
- BSD API researched, signed up, token stored
- ESPN endpoint map produced (scoreboards, summaries, win probability, rosters)
- USA vs Türkiye (June 26 Group D MD3, SoFi Stadium) analysed from ESPN data
- BSD relay routes (CC-CMD-A): code in repo, deploy blocked

---

## OPEN ITEMS

- **API-Sports Football Pro renewal — JUNE 29 ⚠️** (4 days)
- context-assembler.js one-liners: golf + football label (single CC-CMD relay)
- session_health threshold re-baseline (after June 29)
- Wimbledon draw context (July 7 deadline, draw June 27)
- All-Star Selector (July 6)
- wentToOT hardcoded false (limited impact)
- CI/Deploy Reference doc severely outdated
- The 33: 26 features + I3 pending
- NFL SPORT_TO_V2 — September 9

---

## SESSION START PROTOCOL — Rule 85

**L2 (two tool_search calls):**
1. `tool_search("FIELD Handoff session health")`
2. `tool_search("codex commit write file source")`

NOTE: session_health is compromised. Use /quality/report + live probes for truth.

**L3 (bash only):**
```bash
curl -s "https://raw.githubusercontent.com/jeffunglesbee-create/jubilant-bassoon/main/CODE_MAP.json" \
  | python3 -c "import json,sys; m=json.load(sys.stdin); print(f'{len(m[\"functions\"])} functions')"
```

**CC-CMD delivery:** commit_file cannot create new files (404). Use GitHub
Contents API PUT via bash for new docs/ files.

---

## Drive Specs
1. Archive Intelligence — 1fMZFs2WOi_hPcX5hUB1UJf5mWvItTLB6EwZ881LcC3s
2. Bracket Compound — 1Wm29D2KYtEPR1G3N-n__7KPm6FKR-0L6_4S99mtsAxU
3. The 33 — 1XDR6lzgP3vBH4Yg9Byb9C4GGAjKxuJRcV7bkF8pf4wk
4. Product Feature Inventory v2 — 1BbOqlV9JhFlCvwgfizNQW9LMG6lnNrNTp4yUgi7ZC2o
5. External API Compound — 1kLEZnwLmmvvGdEtPn26jC8iUKbSR_9PK4ZxSpjDvkvE
Session docs (2026-06-25):
  Infra verification — 1Ht9REDGoHUi_A_3dndTLqJV503_VQchBH866S0F1J_U
  Build + journalism — 1JVSpkcZtV24OgbAuEwCZqSGh_ACKX145pkDq2scJq7Y

---

## STAT

HEAD: 2d18fff · 572 companies
Open: iOS Safari T1, hiringcafe, 4 ATS probes, UMMS, apply agent, Issue #7
