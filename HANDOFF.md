# FIELD HANDOFF
## Session: 2026-06-26 · Final State

---

## FIELD — Current State

**CLIENT HEAD: 05a1aef · 2026-06-25 · bsdEventId + pitch A_BSD_7/8 · Smoke 757/0**
**RELAY HEAD: 1e355cb · 2026-06-25 · deployed ✅ — BSD endgame capture + score fix**
SW_VERSION: 2026-06-25a · CF account: b57e9af57ab46c52ca9215804e689c29

---

## ⚡ PENDING: outbox/ WRITE_ALLOWLIST (field-relay-nba)

**Requires: `jeffunglesbee-create/field-relay-nba` in session scope**

Two-step task:

**Step 1 — Add `outbox/` to WRITE_ALLOWLIST in field-relay-nba source:**
```javascript
var WRITE_ALLOWLIST = [
  "docs/",
  "HANDOFF.md",
  "CODE_MAP.json",
  "outbox/"    // ← add this line
];
```
Commit + push → CI redeploys worker.

**Step 2 — Once deployed, write verification file via `commit_file`:**
Path: `outbox/whoop-status.json`
Content should include:
```json
{
  "updated_at": "<ISO timestamp>",
  "source": "field-relay-nba /whoop/fetch",
  "token_valid": true,
  "token_expires_at": "2026-06-26T18:34:15.552Z",
  "refresh_token_present": true,
  "cycle": { "strain": 4.09, "avg_hr": 60 },
  "body": { "weight_kg": 82.93 },
  "profile": { "user_id": 31127063, "email": "jeffunglesbee@gmail.com" }
}
```

**Context:** WHOOP OAuth re-auth completed 2026-06-26T17:34Z. D1 `wc2026.whoop_tokens` has valid access + refresh tokens. `/whoop/fetch?days=1` returns HTTP 200 with live data. Documented in `health-protocol` repo, branch `claude/health-protocol-worker-docs-jeeqel`, file `docs/CC-CMD-2026-06-26-health-protocol-worker.md` (commit `fce4039`).

---

## BSD PIPELINE — FULLY OPERATIONAL

Pipeline confirmed live 2026-06-25 against Curaçao vs Ivory Coast (8341)
and Ecuador vs Germany (8342):
- `bsd_event_id` written to D1 for both matched games ✅
- R2: incidents.json + stats.json captured for 8341 ✅
- WC league_id = 27 confirmed ✅
- Ecuador score corrected to 2-1 via D1 direct UPDATE ✅

Endgame capture (1e355cb — live):
- `runBSDEndgameCapture` fires every 5 min via existing cron
- Captures all 4 BSD endpoints at current_minute >= 83
- `captureWithRetry` in writeWCResult: 7 attempts × 15s post-final backstop
- Score UPDATE added after INSERT OR IGNORE — future games correct own score

R2 state: bsd/wc26/8341/incidents.json (3569b) + stats.json (14886b)
Momentum + average-positions: not captured for today's games (deployed too late)
Next test: Japan vs Sweden + Tunisia vs Netherlands tonight

---

## ⚡ PENDING: CC-CMD-H (field-relay-nba)

```
cd /home/claude/field-relay-nba && git pull && cat docs/CC-CMD-2026-06-25-H-bsd-history-context.md
```

Tasks: (1) WC league_id=27 backfill for MD1-MD2 rows,
(2) buildBSDHistoryContext already deployed (6170de0/54d1036),
(3) /bsd/r2/list already deployed.
Note: Use POST /admin/wc/bsd-backfill with leagueId=27 — no CF_API_TOKEN needed.

---

## RELAY COMMITS (2026-06-25)

| Commit | Feature |
|--------|---------|
| `8cdb23a` | BSD relay routes |
| `b5c9983` | ATP/WTA + tennis |
| `7f9aaf1` | buildBSDMomentumContext |
| `e5b84f1` | BSD WebSocket → AmbientDO |
| `e5cddf5` | bsdEventId injection |
| `e49debf` | /bsd/contract + season routes |
| `0af35ca` | bsd_event_id → wc_results D1 |
| `a55ebd3` | R2 capture at game-final |
| `6170de0` `54d1036` | buildBSDHistoryContext + /bsd/r2/list |
| `4202055` | auto-backfill + admin endpoint |
| `647d627`→`e8ccef1` | golf layer (syntax fix unblocked all) |
| `1e355cb` | endgame cron capture + retry + score fix |

---

## WC D1 STATE (2026-06-25 games)

| Game | Score | bsd_event_id |
|------|-------|--------------|
| South Africa vs S. Korea | 1-0 | null |
| Curaçao vs Ivory Coast | 0-2 | 8341 |
| Ecuador vs Germany | 2-1 | 8342 |
| Czechia vs Mexico | 0-3 | null |

Czechia/Mexico + South Africa/Korea: null (different BSD league_id or pre-enrichment)
Score bug (INSERT OR IGNORE) fixed in 1e355cb — future games self-correct

---

## GOLF LAYER — LIVE

_derived SG proxy live: e8ccef1 deployed
Travelers Championship R1: Cole -7, SG +1.11 putt / +1.64 approach
golf_leaderboard CONTEXT_SOURCE: 647d627 (syntax fix via e8ccef1)

---

## OPEN ITEMS

- **outbox/ WRITE_ALLOWLIST** — requires field-relay-nba session scope (see top of HANDOFF)
- **API-Sports Football Pro renewal — JUNE 29 ⚠️** (4 days) — DO NOT RENEW
- CC-CMD-H: MD1-MD2 backfill with leagueId=27 (use /admin/wc/bsd-backfill)
- Deploy gate hardening CC-CMD (continue-on-error fix)
- Golf win probability from The Odds API golf outrights
- Golf notablePlayers + momentum _derived fields
- identity-resolver.js: Ecuador + Germany missing (5-char prefix worked today)
- Wimbledon draw June 27 — ATP/WTA routes live
- All-Star Selector (July 6)
- session_health compromised — use /quality/report + live probes

---

## VERIFIED PROCESS NOTES

- /deploy/verify match=True is NOT proof of deployment — verify via bundle
- node --check src/*.js before every relay commit (CC responsibility)
- No credentials in docs/ — use env var references
- HANDOFF = state + one-liners only, no CC-CMD specs

## SESSION START PROTOCOL — Rule 85

L2: tool_search("FIELD Handoff session health") + tool_search("codex commit write source")
L3: curl -s https://raw.githubusercontent.com/jeffunglesbee-create/jubilant-bassoon/main/CODE_MAP.json | python3 -c "import json,sys; m=json.load(sys.stdin); print(f'{len(m[\"functions\"])} functions')"

## Drive Docs (2026-06-25 session)
Build Record — 1Gh1fiPPuVqAEw4DMwtElfbzVE6HnSz-zxOHArRvOuXA
Golf Intelligence Research — 1b7mQWlHzpca6fHg-lUm4iUEaacG-gjAlvikLbwTJpLo
Incident Report + Process — 1eNvq5XBHM3O07pwla2BcvkmsqDrDtNdTaxqpoGRJEdM

## STAT
HEAD: 2d18fff · 572 companies · smoke 213/213
