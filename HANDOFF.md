# FIELD HANDOFF
## Session: 2026-06-25 · Golf _derived + BSD Pipeline Complete

---

## FIELD — Current State

**CLIENT HEAD: 05a1aef · 2026-06-25 · bsdEventId + pitch A_BSD_7/8 · Smoke 757/0**
**RELAY HEAD: e8ccef1 · 2026-06-25 · deployed ✅ — golf _derived + syntax fix**
SW_VERSION: 2026-06-25a · CF account: b57e9af57ab46c52ca9215804e689c29

---

## CRITICAL: Silent Deploy Failure (resolved e8ccef1)

Every deploy from `647d627` → `6b501f8` silently failed at wrangler build due to
raw newlines inside single-quoted strings in `src/context-assembler.js:693`.
`continue-on-error: true` on wrangler step + `/deploy/verify` checking only
HEAD SHA (not bundle content) caused all CI runs to appear green.

**Detection:** `workers_get_worker_code` showed live bundle was pre-`647d627`.
**Fix:** `e8ccef1` — escape sequences corrected. All code since `647d627` now live.
**Process fix going forward:** CC now runs `node --check src/*.js` before every
commit and verifies via bundle content, not just `/deploy/verify`.

**Open governance item:** wrangler deploy step `continue-on-error: true` should
gate on `steps.wrangler_deploy.outcome` OR compare CF API `version_id` against
target SHA. Separate CC-CMD needed to harden the deploy gate.

---

## GOLF _DERIVED — LIVE ✅

`/v2/golf/enriched` now returns `stats._derived` for all players with complete
ESPN stats (20/72 players mid-R1). Live from Travelers Championship R1:

- Eric Cole (-7): sgPutt +1.11 · sgApp +1.64 · "earning every stroke"
- Nico Echavarria (-6): sgPutt -0.89 · sgApp +1.64 · "striping it but leaving putts"
- Ben Griffin (-6): sgPutt +2.41 · sgApp -2.36 · "putter carrying them"

Client `buildGolfPromptContext` consumes `_derived` at L15566–15580 (already wired).
Cache key bumped to v5 to invalidate pre-_derived KV entries.

---

## BSD PIPELINE — WIRED (a55ebd3 + 4202055)

When WC game goes final with `bsdEventId`:
1. `bsd_event_id` → `wc_results` D1 (54 rows, all null until tonight)
2. momentum + stats + incidents + avg-positions → R2 `bsd/wc26/{id}/{type}.json`
3. Auto-backfill fires via KV gate at first game-final per day
4. `buildBSDHistoryContext` CONTEXT_SOURCE reads R2 for prior match data

---

## ⚡ PENDING: CC-CMD-H (field-relay-nba)

**Run AFTER Ecuador vs Germany goes final (~22:00 UTC tonight)**

```
cd /home/claude/field-relay-nba && git pull && cat docs/CC-CMD-2026-06-25-H-bsd-history-context.md
```

Tasks: (1) BSD WC league_id discovery + MD1-MD2 backfill,
(2) `buildBSDHistoryContext` CONTEXT_SOURCE (already shipped 6170de0/54d1036),
(3) `/bsd/r2/list` relay route (already shipped).

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
| `647d627` | golf: pga→golf + golf_leaderboard CONTEXT_SOURCE ← **build was broken** |
| `6b501f8` | golf: _derived IIFE (deployed via e8ccef1 fix) |
| `0224ec6` | fix: _derived moved to correct handler |
| `461ed74` | fix: cache key v4→v5 |
| `e8ccef1` | fix: escape newlines in context-assembler (unblocked all above) |

---

## OPEN ITEMS

- **API-Sports Football Pro renewal — JUNE 29 ⚠️** (4 days) — DO NOT RENEW
- Deploy gate hardening CC-CMD (continue-on-error + version_id check)
- Golf win probability from golf odds normalization (The Odds API)
- Golf `notablePlayers` + `momentum` _derived fields (follow-ups to e8ccef1)
- identity-resolver.js: add Ecuador, Germany + MD3 teams before 20:00 UTC
- Wimbledon draw June 27 — ATP/WTA routes live
- All-Star Selector (July 6)
- session_health compromised — use /quality/report + live probes

---

## SESSION START PROTOCOL — Rule 85

L2: `tool_search("FIELD Handoff session health")` + `tool_search("codex commit write source")`
L3: `curl -s https://raw.githubusercontent.com/jeffunglesbee-create/jubilant-bassoon/main/CODE_MAP.json | python3 -c "import json,sys; m=json.load(sys.stdin); print(f'{len(m[\"functions\"])} functions')"`

NOTE: `/deploy/verify` match=True is NOT sufficient proof of deployment.
Verify via bundle content (`workers_get_worker_code`) or live endpoint probe.

## Drive Docs
The 33 — 1XDR6lzgP3vBH4Yg9Byb9C4GGAjKxuJRcV7bkF8pf4wk
Product Feature Inventory v2 — 1BbOqlV9JhFlCvwgfizNQW9LMG6lnNrNTp4yUgi7ZC2o

## STAT
HEAD: 2d18fff · 572 companies · smoke 213/213
