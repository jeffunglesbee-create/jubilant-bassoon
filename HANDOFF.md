# FIELD HANDOFF — 2026-06-12 (WC D1 pipeline fix + iPad CSS fix)

## HEADS
- jubilant-bassoon HEAD: 92c615c (189e1ac post-CI HANDOFF update pending)
- field-relay-nba HEAD: 0a3faf1
- SW_VERSION: 2026-06-11h
- Smoke: 601/0 ✅ (CI: success 189e1ac)

## SMOKE COUNT CLARIFICATION
- `get_smoke_count` tool reports 538 — counts `^\s*assert(` at line start
- Actual runtime: 601 — includes 65 FEATURE_GUARDS forEach-dispatched asserts
- 601 is the truth. Tool undercounts by design. Not a regression.

## WHAT SHIPPED THIS SESSION

### fix: WC D1 write pipeline (relay: 0a3faf1)
Root cause: api-sports changed round format from "Group Stage - Group A"
to "Group Stage - 1" (matchday number) mid-tournament. extractWCGroup
regex required group letter in round string → returned null → writeWCResult
early-returned → D1 never written since tournament start.

Fix: `_WC_TEAM_GROUP` static map (32 teams + aliases) + NFD normalization
fallback in extractWCGroup when round string lacks group letter.
Both writeWCResult and advancement-probability path updated.
17/17 unit tests pass including Curaçao diacritic, Bosnia & Herzegovina
ampersand, USA/Turkey/Türkiye aliases.

Manual backfill: Mexico 2-0 South Africa (2026-06-11, Group A) written
directly to D1 via Cloudflare MCP. `/wc/standings?group=A` serving correctly.

Alias table: verified 100% bidirectional — all 32 api-sports team names
resolve to correct groups. Austria/Australia prefix collision is safe
(requires both home AND away to match simultaneously — impossible cross-group).

### fix: iPad wc-mode CSS (client: 189e1ac)
`@media(max-width:1199px)` wc-mode block had literal `\n` (backslash + n)
at opening brace instead of a real newline. Entire block silently dropped
by browser. On iPad (820-1199px): ambient panel and WC section competed
for space, schedule visible behind WC content, back pill not positioned,
margin overrides not applied.

Root cause: escaped newline from JS template literal context written into
static CSS during prior session edit.

SW_VERSION bumped g → h. A190 caught the missed sw.js sync on first push.

## ANALYSIS FINDINGS (no code shipped)

### 6e — revised to Option A (game state lifecycle strip)
Original spec (load-phase performance panel) retired — marks already
serve CLS attribution via clsObserver, not user-facing.
New spec: `tt-strip` on `.espn-live`/`.espn-final` cards recording named
state transitions (WORTH WATCHING, CRUNCH TIME, lead changes, OT, final)
driven by fieldEvents bus. Named states only (RUWT ADR-002). In-memory
Map per gameId. ~30 lines.

### 6f — Drama Spectrum RUWT-safe
Original spec holds. WC26 calibration (soccer thresholds) is parameter
addition only. RUWT conditional logic unchanged. ~60 lines.

### WC projections anomaly
Root cause confirmed: D1 empty → engine ran with zero played results →
MD0 uniform fallback inflated Ecuador/Ivory Coast. Not a projections bug.
Fixed by D1 pipeline fix above.

### Smoke 538 vs 601
Tool artifact (see above). Both numbers correct for what they measure.

## PRIORITY LIST

1. M5 — score ticker desktop fade (::after always-on regardless of overflow)
2. 6e — game state lifecycle strip (~30 lines, spec complete)
3. 6f — drama spectrum RUWT-safe (~60 lines)
4. Wimbledon draw context (hard deadline July 7)
5. Design system (~90 min TYPE C)
6. Multiview velocity grid

## WC D1 STATUS
- Results in D1: Mexico 2-0 South Africa (Group A, 2026-06-11) ✅
- Future results: auto-write via fixed extractWCGroup ✅
- All other groups: empty (no games played yet as of session end)
- South Korea vs Czech Republic (Group A) and Canada vs Bosnia &
  Herzegovina (Group B) play June 12 — will auto-write if relay
  detects finals on next /v2/games poll cycle

## RELAY STATE (field-relay-nba)
0a3faf1 — extractWCGroup team-name fallback (deployed, success)
03fff2c — CF edge cache + AmbientDO 15s (prior session)
