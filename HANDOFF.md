# FIELD HANDOFF
## Session: 2026-06-25 · Diagnostic (no code commits)

---

## FIELD — Current State

**CLIENT HEAD: fa57eb0 · 2026-06-24 · L28860-sport-filter-brief-fix**
**RELAY HEAD: e6cdd36 · 2026-06-24 · deployed (e97fffd)**
Smoke: 753/0 · SW_VERSION: 2026-06-24h
CF account: b57e9af57ab46c52ca9215804e689c29
D1 field-archive: cc49101c-0569-4d41-8e7a-be139cde4f26
D1 wc2026: f26669de-e772-4b56-a6d1-f8fdea08a4d4

---

## ⚠️ SESSION_HEALTH IS COMPROMISED — DO NOT TAKE AS ABSOLUTE TRUTH

Three verified failures in session_health:

1. **Quality threshold wrong** — uses `avg_score < 240` on a 300-point scale.
   Typical scores are 150–220. Almost everything shows as degraded. Noise.
   Ground truth: `/quality/report` endpoint directly.

2. **Incidents never close** — queries codex `WHERE category='incident'`, no
   resolved flag. All 15 newest incidents appear as "open" regardless of status.
   Confirmed stale: Stale Data Sentinel (LIVE), Odds Story Materializer (LIVE),
   smoke regression (now 753/0), assembleContext WC (FIXED June 24).

3. **Golf quality hidden** — code explicitly filters golf OUT of degraded list.
   Golf game_brief avg 106 is the worst quality in the system. session_health
   conceals it. Check /quality/report for golf rows directly.

Trustworthy from session_health: client_head, relay_head, deploy_match, checked_at.

---

## QUALITY SCORING — ACTUAL STATE

96% scored (563/585 briefs, 7 days). Journalism is running.

**Two genuine quality gaps (both one-liners in context-assembler.js):**

| Issue | Root cause | Fix |
|-------|-----------|-----|
| golf game_brief avg 106 | `'golf'` not in any CONTEXT_SOURCES sports array | Add `'golf'` to `espn_summary` sports list |
| game_recap/football: 0/14 NULL | `'football'` not in `_SPORT_NORMALIZE` | Add `'football': 'wc26'` to normalize map |

Single CC-CMD covers both. File: `src/context-assembler.js`.

---

## CARRY-FORWARDS — CORRECTED THIS SESSION

**CLOSED (were listed as open in prior HANDOFF):**
- Stale Data Sentinel — LIVE, `/health/sources` confirmed working
- Odds Story Materializer — LIVE, `/odds-story/preview` HTTP 200
- assembleContext WC/soccer — FIXED June 24 (5b2ea9e)
- assembleContext WNBA — was never broken, espn_summary covers it
- Quality scoring broken — was session_health threshold noise, 96% scored

---

## GENUINE OPEN ITEMS

- **context-assembler.js quality gaps** — golf + football one-liners (CC-CMD needed)
- **wentToOT hardcoded false** (L9107) — limited impact: affects newspaper
  `completed_games[].wentToOT` only, not drama scoring or journalism prompts
- **KV editorial keys not consulted** — resilience gap only, newspaper works via D1
- **session_health threshold** — re-baseline after June 29 (Phase 8b, one-liner)
- **session_health incident resolution** — no resolved flag in codex schema
- **CI/Deploy Reference doc** — severely outdated (last updated May 31),
  must be updated before next restore scenario
- **read_codemap relay tool** — L3 uses bash workaround until built
- **WC26 rate limiting** — persistent 503 retryable, API-Sports quota exhaustion
- NFL SPORT_TO_V2 — September 9
- **API-Sports Football Pro renewal — JUNE 29 ⚠️**

---

## L28860 SPORT-FILTER BRIEF FIX — SHIPPED (a50edcf / HEAD fa57eb0)

| Fix | Location | Change |
|-----|----------|--------|
| Remove activeFilter gate | L28864 | `activeFilter!=='all'\|\|!sections.length` → `!sections.length` only |
| Call site passes full array | L10593 | `initFIELDBrief(filtered&&…:visible)` → `initFIELDBrief(sports)` |
| A_BR_1 reworked | smoke.js | Asserts `initFIELDBrief(sports)` |
| A_BR_5 added | smoke.js | Asserts old `activeFilter` gate string is absent |
| SW_VERSION bump | both files | 2026-06-24g → 2026-06-24h |

---

## INFRASTRUCTURE — VERIFIED 2026-06-25

All workers live: relay ✅ field-deploy v4 ✅ field-claude-proxy ✅
All D1/R2/KV/DO/Queue/Analytics bindings declared in wrangler.toml ✅
All FIELD GH secrets present (jubilant-bassoon 7, field-relay-nba 11) ✅
GEMINI_KEY live (journalism/tonight returning prose) ✅
APISPORTS_KEY live (rate limit response = key valid) ✅
Dropbox: durable OAuth (APP_KEY + APP_SECRET + REFRESH_TOKEN) ✅
DROPBOX_TOKEN absent intentionally — replaced by OAuth ✅
ANTHROPIC_KEY: dangling in field-relay-nba GH Actions, not injected, wrong name
  in code (ANTHROPIC_API_KEY vs ANTHROPIC_KEY). L3283 feature dead.
  Journalism unaffected — Gemini is primary via field-claude-proxy.

STALE (expected, heals automatically):
- nba_clutch + nhl_series R2: seasons over, heals Oct/Nov
- WC26 /v2/games: 503 retryable — API-Sports quota exhaustion

---

## BRACKET COMPOUND — FULLY CLOSED

| Phase | Commit |
|-------|--------|
| 1–4b + fixes | ffe6911 → 55cef28 |

---

## MD3 STACK — ALL SHIPPED

| Item | Commit |
|------|--------|
| Group standings + PRE-GAME CONTEXT + permutations + night owl WC | bc2dc9c → 6f6bada |
| assembleContext soccer→wc26 league signal | 5b2ea9e |

---

## ALL-STAR SELECTOR — JULY 6 TARGET

Methodology: ESPN composite WAR. OPS/ERA+WHIP tiebreaker within 0.3 WAR.
Do NOT wire into pipeline. Do NOT build before June 29.

---

## ALL-STAR EDITORIAL BRIEF TYPE — ~JULY 10-12

gameType:"A" → briefType:"allstar_game" → skip JQ chain.
Do NOT build before June 29.

---

## SW ARCHITECTURE (verified June 24)

Two caches: SHELL_CACHE (SWR /index.html), API_CACHE (network-first isAPI).
Relay NOT in isAPI — all relay calls direct network, no cache, no fallback.

---

## STAT

HEAD: 2d18fff · 572 companies
Open: iOS Safari T1, hiringcafe, 4 ATS probes, UMMS, apply agent, Issue #7

---

## Drive Specs (permanent)
1. Archive Intelligence — 1fMZFs2WOi_hPcX5hUB1UJf5mWvItTLB6EwZ881LcC3s
2. Bracket Compound — 1Wm29D2KYtEPR1G3N-n__7KPm6FKR-0L6_4S99mtsAxU
3. Compound Architecture — 1cWgNEs3uanFh_PDi2ISSrIBTINdousbHcE1VQphvZ2I
4. Circadian + Gap Closers — 1NeAFkfKhBKhqeez-broEmb-q-ULB9u6L8pvwEWYyMeU
5. Context Dimensions — 1XulILxMMU4MtDI6NhwVs5kMv8XsKOmANWUly3_JsCwQ
6. Surface Compounds — 1UxVjbcsven_Nbf7L1g2mDGZA-KDT5D4HG-3rWxlwBQU
7. Info Disclosure — 11T6jE6z2R7WFVGFKrSq2JO7MU76Jr_xmAYGIMiafRug
8. Journalism Loop — 1PKkEGpe306ovRngvBCAZgoQyjeaj02SX0khAp0OrOfU
9. External API — 1kLEZnwLmmvvGdEtPn26jC8iUKbSR_9PK4ZxSpjDvkvE
Session doc (2026-06-25) — 1Ht9REDGoHUi_A_3dndTLqJV503_VQchBH866S0F1J_U

---

## SESSION START PROTOCOL — Rule 85 (SESSION-MEMORY-PROTOCOL-A)

Load all three layers before any work. Sessions without L3+L4 MUST NOT make
architectural decisions — mechanical edits only until both are loaded.

**L2 (two tool_search calls — both required):**
1. `tool_search("FIELD Handoff session health")` → session_health + read_handoff
   NOTE: session_health is compromised — see warning above. Use /quality/report
   and live endpoint probes for ground truth on quality and incidents.
2. `tool_search("codex commit write file source")` → codex_search, read_file,
   commit_file, write_handoff, get_head_sha

**L3 (bash only — read_file offloads to disk, never use it for CODE_MAP):**
```bash
curl -s "https://raw.githubusercontent.com/jeffunglesbee-create/jubilant-bassoon/main/CODE_MAP.json" \
  | python3 -c "import json,sys; m=json.load(sys.stdin); \
    [print(f) for f in m['functions'] if '{domain}' in f['name']]"
```
read_codemap relay tool not yet built — bash is the workaround.

**L4:**
`codex_search("{session domain}")` — include touched domain + neighbouring domains.

**Declare:** START · Type · Scope · Baseline (HEAD + drift + L3/L4 status)
First output = tool calls, no prose.
