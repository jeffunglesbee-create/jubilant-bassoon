# FIELD HANDOFF
## Session: 2026-06-25 · Build + Journalism Audit

---

## FIELD — Current State

**CLIENT HEAD: 36e4c7d · 2026-06-25 · codemap refresh (code at 8d533bc)**
**RELAY HEAD: e6cdd36 · 2026-06-24 · deployed (e97fffd)**
Smoke: 754/0 · SW_VERSION: 2026-06-24i
CF account: b57e9af57ab46c52ca9215804e689c29
D1 field-archive: cc49101c-0569-4d41-8e7a-be139cde4f26
D1 wc2026: f26669de-e772-4b56-a6d1-f8fdea08a4d4

---

## SHIPPED THIS SESSION

### fix: preserve #field-newspaper across applyMainHTML (8d533bc, A738)

Root cause verified: `applyMainHTML()` → `main.replaceChildren()` wiped
`#field-newspaper` on every `renderAll()`. `bootNewspaper()` only fires
once per page load — newspaper was permanently gone after first schedule
re-render.

Fix: detach `#field-newspaper` at top of `applyMainHTML`, re-prepend at
all three exit paths (empty-html, morph catch, replaceChildren normal).
savedNewspaper count: 5. LCP morph logic unaffected.

SW: 2026-06-24h → 2026-06-24i (ET 23:55 on Jun 24; A515 caught incorrect
2026-06-25a attempt; corrected per Rule 77).

---

## ⚠️ SESSION_HEALTH IS COMPROMISED — DO NOT TAKE AS ABSOLUTE TRUTH

1. Quality threshold wrong — avg_score < 240 flags nearly everything
2. Incidents never close — no resolved flag in codex schema
3. Golf quality hidden — explicitly filtered out of degraded list
Ground truth: /quality/report endpoint + live probes

---

## "THE 33" JOURNALISM FEATURES

Drive: 1XDR6lzgP3vBH4Yg9Byb9C4GGAjKxuJRcV7bkF8pf4wk
"FIELD — The 33: Definitive Feature List" — June 20 2026

These are EDITORIAL OUTPUT features, not quality chain items.
5 Merged + 10 Candy + 4 Alcohol + 6 PTI + 8 Analytics Cron = 33
+ 3 infrastructure (I1 Cron, I2 Newspaper, I3 Debrief)

SHIPPED (7 of 36): I1 ✅ I2 ✅ M1 Morning Report ✅ M2 Field's Pick ✅
M5 Truth Is ✅ R1-1 Night Stars ✅ R2-1 Streak Board ✅
All confirmed live in /analytics/newspaper/2026-06-24.

PENDING: 26 features + I3 The Debrief (partial only).

---

## THE DEBRIEF (I3) — PARTIAL

What exists: DEBRIEF chip on post-state cards → toggleJournalismView()
(A636/639/640), WC-specific renderWCBracketImpact() (A735-737).
What's NOT built: general card transformation at final state, NIGHT mode
auto-trigger, Circadian System integration.
Blocks: Replay Engine (PF2), Circadian System (PF4).

---

## QUALITY SCORING — ACTUAL STATE

96% scored (563/585 briefs, 7 days). Journalism running.
Two genuine gaps (one-liners in context-assembler.js, field-relay-nba):
- golf not in CONTEXT_SOURCES → avg 106 (worst quality in system)
- 'football' not in _SPORT_NORMALIZE → 0/14 NULL scores

---

## 5 NEW WOW FEATURE IDEAS (first-principles, no new APIs)

1. SPOILER GATE — hold result behind tap if user hasn't checked in within
   20min of final. Uses WOW-39 stream delay infra.
2. THE ASTERISK — flag wins under compromised circumstances (back-to-back,
   missing starters, travel). Broadcaster honesty as a feature.
3. DEAD TIME DETECTOR — surface editorial during pitching changes/timeouts.
   GameDO knows game state. "You have ~2 min. Other game tied in 9th."
4. SLEEP CLOCK — compute finish time in user's local TZ as a chip.
   "~12:40 AM PT." Viewer's fiduciary thesis made literal.
5. MISS RATE — "You were present for 3 of your team's 7 highest-drama
   moments. Their avg drama peak without you: 81." Uses drama history +
   MY_TEAMS. Gives push notifications purpose beyond "game tonight."

---

## OPEN ITEMS

- **API-Sports Football Pro renewal — JUNE 29 ⚠️**
- context-assembler.js: golf + football label (single CC-CMD, relay)
- session_health threshold re-baseline (after June 29)
- WIMBLEDON draw context (July 7)
- All-Star Selector (July 6)
- wentToOT hardcoded false (L9107, limited impact — newspaper only)
- CI/Deploy Reference doc severely outdated
- The 33: 26 features + I3 pending
- NFL SPORT_TO_V2 — September 9

---

## SESSION START PROTOCOL — Rule 85 (SESSION-MEMORY-PROTOCOL-A)

**L2 (two tool_search calls — both required):**
1. `tool_search("FIELD Handoff session health")` → session_health + read_handoff
   NOTE: session_health is compromised. Use /quality/report + live probes for
   ground truth on quality and incidents.
2. `tool_search("codex commit write file source")` → codex_search, read_file,
   commit_file, write_handoff, get_head_sha

**L3 (bash only — read_file offloads to disk):**
```bash
curl -s "https://raw.githubusercontent.com/jeffunglesbee-create/jubilant-bassoon/main/CODE_MAP.json" \
  | python3 -c "import json,sys; m=json.load(sys.stdin); \
    [print(f) for f in m['functions'] if '{domain}' in f['name']]"
```

**L4:** `codex_search("{session domain}")`

**CC-CMD delivery:** relay commit_file cannot create new docs/ files (404 on
non-existent path). Use GitHub Contents API PUT via bash with FIELD PAT for new files.

**Declare:** START · Type · Scope · Baseline (HEAD + drift + L3/L4 status)
First output = tool calls, no prose.

---

## INFRASTRUCTURE — VERIFIED 2026-06-25

All workers live: relay ✅ field-deploy v4 ✅ field-claude-proxy ✅
APISPORTS_KEY ✅ GEMINI_KEY ✅ All FIELD secrets present (both repos) ✅
Dropbox: durable OAuth (APP_KEY + APP_SECRET + REFRESH_TOKEN) ✅
Stale Data Sentinel: LIVE ✅ Odds Story Materializer: LIVE ✅
WC26 /v2/games: 503 retryable (API-Sports quota exhaustion, persistent)

---

## BRACKET COMPOUND — FULLY CLOSED (ffe6911→55cef28)

---

## ALL-STAR — TARGET DATES

Selector: July 6 · Editorial brief type: July 10-12
Do NOT build before June 29.

---

## STAT

HEAD: 2d18fff · 572 companies
Open: iOS Safari T1, hiringcafe, 4 ATS probes, UMMS, apply agent, Issue #7

---

## Drive Specs
1. Archive Intelligence — 1fMZFs2WOi_hPcX5hUB1UJf5mWvItTLB6EwZ881LcC3s
2. Bracket Compound — 1Wm29D2KYtEPR1G3N-n__7KPm6FKR-0L6_4S99mtsAxU
3. Compound Architecture — 1cWgNEs3uanFh_PDi2ISSrIBTINdousbHcE1VQphvZ2I
4. Circadian + Gap Closers — 1NeAFkfKhBKhqeez-broEmb-q-ULB9u6L8pvwEWYyMeU
5. Context Dimensions — 1XulILxMMU4MtDI6NhwVs5kMv8XsKOmANWUly3_JsCwQ
6. Surface Compounds — 1UxVjbcsven_Nbf7L1g2mDGZA-KDT5D4HG-3rWxlwBQU
7. Info Disclosure — 11T6jE6z2R7WFVGFKrSq2JO7MU76Jr_xmAYGIMiafRug
8. Journalism Loop — 1PKkEGpe306ovRngvBCAZgoQyjeaj02SX0khAp0OrOfU
9. External API — 1kLEZnwLmmvvGdEtPn26jC8iUKbSR_9PK4ZxSpjDvkvE
The 33 — 1XDR6lzgP3vBH4Yg9Byb9C4GGAjKxuJRcV7bkF8pf4wk
Product Feature Inventory v2 — 1BbOqlV9JhFlCvwgfizNQW9LMG6lnNrNTp4yUgi7ZC2o
Session doc (2026-06-25 build) — 1JVSpkcZtV24OgbAuEwCZqSGh_ACKX145pkDq2scJq7Y
Session doc (2026-06-25 infra) — 1Ht9REDGoHUi_A_3dndTLqJV503_VQchBH866S0F1J_U
