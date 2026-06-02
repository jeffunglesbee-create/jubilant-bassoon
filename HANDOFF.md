# FIELD Handoff — June 2 2026 PM-16 close (Tier A 1-3 NHL live metrics shipped pre-SCF G1)

**jubilant-bassoon HEAD:** 73f2872 last meaningful · Smoke: 371/0 · SW_VERSION source `2026-06-02b`
**field-relay-nba HEAD:** 880e3ae last meaningful (unchanged from PM-15) · OAuth feature commit: 8e7257d

**This session shipped:** TYPE B build. Three NHL Wave 2 forward-looking live metrics for Stanley Cup Final G1 tonight (8pm ET ABC, CAR vs VGK) and beyond. Tier A 1-3 from PM-15's novel-thinking ideation list, approved by Jeff in PM-16 open.

**Session Doc (this session — Drive):** `1XAgPOaMZDe4eJAR08lPstKdNX6TciTchXGonm0bF4zo`
**Previous session doc (PM-15 — Drive):** _written PM-15 close_
**CANONICAL BUILD BACKLOG (READ FIRST):** `1ugUh6UmeDkLR-gEH8hJPwXK2NiIrXYQY8gp2jO2p2Hk`
**CI/Deploy Ref (READ AT SESSION START):** `1UrOoYDGaK2ncPrnRNXt1w0OElOLpbjP_EYROjG2w1zo`
**FIELD Current State (READ AT SESSION START):** `1GvsfnTH9Xhqzg_NdYrPhPpk1d1Rnm0lkeG6ip-tLUlA`

## TIER 0 DEADLINES (unchanged)

- **Stanley Cup G1: TONIGHT (June 2 8pm ET, ABC)** — first live test of Tier A #1 (Pull Window) + #2 (PDO Signal) in J2/J3/J5
- **NBA Finals G1: TOMORROW (June 3 8:30pm ET, ABC)** — Tier A is NHL-only, unaffected
- **Stanley Cup G2: June 4**
- **World Cup 2026: June 11 HARD**
- **USPTO provisional: ~June 25**

## WHAT HAPPENED THIS SESSION (June 2 PM-16)

Scope was Tier A 1-3 from PM-15's hockey-metrics ideation. Three forward-looking live signals built, integrated into `getNHLAnalyticsContext()` (the journalism prompt-context emitter that feeds J2/J3/J5 chains). All commit on `73f2872`.

### #1 Pull Window Predictor — `predictGoaliePullState(game)`
Forward-looking goalie-pull state from clock + deficit in 3rd-period only.
- deficit 1 → window opens 3:00 left → likely_pulled 1:30 left
- deficit 2 → window opens 4:00 left → likely_pulled 2:30 left
- deficit 3 → window opens 5:00 left → likely_pulled 3:30 left
- Tied / OT / deficit >3 / period <3 → null

Emits `[PULL WINDOW APPROACHING]` (warming up) or `[6-ON-5 LIKELY]` (active window). Complementary to existing `#11a` situation bonus which fires AFTER `sit.goaliePulled` flips — this predicts ~90s earlier.

Unit-tested 7 cases, all pass including null-correctness on tied/OT/deficit-4/early-3rd/period-2.

### #2 PDO Regression Signal — `getNHLPDOSignal(abbrev)`
Reads existing `NHL_PDO` hardcoded table (6 teams: CAR, VGK, COL, MTL, BOS, OTT). Emits:
- `pdo > 1020` → `[REGRESSION WATCH]` running hot, due for negative variance
- `pdo < 985`  → `[REGRESSION DUE]` underperforming, due for positive variance
- 985–1020 → null (normal band)

Surfaces the forward-looking variance call that was previously buried as freeform `note` text on only some entries.

### #3 Penalty Drift Indicator — `computePenaltyDriftSignal(hp, ap, ha, aa)` + `trackNHLPenaltyTransitions`
Make-up call effect — refs even out penalties within games. Threshold: `|home - away| >= 2 PIMs` → `[MAKE-UP CALL DUE]` for trailing team.

**Data wiring deferred.** Current NHL.com `/v1/scoreboard/now` relay does not expose `situation` field (powerplay transitions). Tracker function `trackNHLPenaltyTransitions(game, prevSit, curSit)` is shipped and ready — accepts ESPN-style `sit.{home,away}PowerPlay` transitions and increments `game._homePenalties` / `game._awayPenalties`. Activates the moment a play-by-play relay route lands.

Until then, `computePenaltyDriftSignal` returns null (counts undefined) — degrades cleanly, zero false positives.

### Wiring summary
- All three feed `getNHLAnalyticsContext()` journalism emitter
- `FIELD_FEATURES` entries dated 2026-06-02 (`nhl-pull-window-predictor`, `nhl-pdo-regression-signal`, `nhl-penalty-drift-signal`)
- `SW_VERSION` bumped `2026-06-02a` → `2026-06-02b` (Rule 23 — live behavior change on same day)
- Smoke `A374-A377` enforce presence + integration
- Smoke: 367/0 baseline → **371/0** post-build

### Unit-test standalone results
15/15 cases passed including boundary conditions (tied score, OT exclusion, deficit 4 out-of-reach, PDO band boundary at 985, unknown abbrev, undefined penalty counts, tracker idempotency on first poll). Cosmetic fix late in session: pull-threshold display "1.5:00" → "1:30" (M:SS not decimal minutes).

## STATE INVARIANTS AT END OF SESSION

- jubilant-bassoon HEAD: `73f2872` last meaningful (Tier A 1-3 shipped)
- jubilant-bassoon smoke: **371/0**
- jubilant-bassoon SW_VERSION: `2026-06-02b`
- field-relay-nba HEAD: `880e3ae` last meaningful (unchanged)
- field-relay-nba /mcp: LIVE with four auth paths
- KV bindings on relay: PUSH_SUBS, FIELD_JOURNALISM, MCP_OAUTH
- claude.ai connector "FIELD Handoff": LIVE
- claude.ai connector "Cloudflare Developer Platform": connected per registry, tools still not surfacing via tool_search (PM-15 finding holds)
- STANDARDS.md Rule 48 Class E: in effect
- T3 memory anchor: will be updated to `73f2872` on SESSION END (via bash)

## NEXT SESSION P1 IMMEDIATE

**Watch tonight's SCF G1 output.** Tier A #1 (Pull Window) and #2 (PDO Signal) will fire live in the J5 Night Owl recap if CAR or VGK has a 3rd-period goalie-pull scenario. Pull-window message construction has not been observed in production yet — this is the first prod exposure. Verify the lines read cleanly in the brief without sounding canned.

P1 — **Wire NHL play-by-play relay route** (~45 min). Candidate: NHL.com `/v1/gamecenter/{gameId}/play-by-play`. No auth needed, allowed origin. Once wired, `trackNHLPenaltyTransitions` activates from the situation transitions and `computePenaltyDriftSignal` starts emitting `[MAKE-UP CALL DUE]` lines. ADR-001 aligned. This is the data-wiring half of Tier A #3.

P1 — **Cloudflare connector mismatch** (carry-forward from PM-15). Try fresh chat / re-auth / Anthropic support. `cf-api-probe.yml` stays primary.

P1 — **R2 Finals Narrative Context** (carry-forward from PM-14, still PAST deadline). Salvage scope for SCF use cases.

P1 — **Queues / WOW 8** — hard deadline June 11 World Cup.

P1 — **R2 World Cup Team Context** — before June 11.

P1 — `get_smoke_count` MCP tool reports 268 vs canonical 371 (was 367; need to also fix regex pattern). Bug from PM-13.

## OTHER NEXT-SESSION PRIORITIES

P2 — Extend `logRequest()` to capture body (truncated 8KB).
P2 — Verify claude.ai connector traffic actually hits `logRequest`.
P2 — USPTO provisional toward ~June 25.
P2 — `tool_search "handoff"` ranking tuning.
P2 — Probe-outbox cleanup in jubilant-bassoon.

P3 — Tier A Wave 2.5 candidates from PM-15 ideation if Wave 2 lands cleanly: **Lead Vulnerability Index** (~45 min, reuses ESPN gambit), **Goalie Hot Hand / Wavering** (~45 min, in-game SV% drift via ESPN PBP).

P3 — `index.html:3137` dead `MCP` var cleanup.
P3 — `field_smoke.js` 4 pre-existing failures (A30, A53, A67, A69).
P3 — Memory edit path-string cleanup.

## CLOSED THIS SESSION

- **Tier A #1 Pull Window Predictor** — fully shipped + unit-tested, integrated into journalism emitter, live tonight at SCF G1.
- **Tier A #2 PDO Regression Signal** — fully shipped + unit-tested, live tonight.
- **Tier A #3 Penalty Drift Indicator** — function shipped, integrated, dormant pending NHL PBP relay (P1 next session).
- **PM-15 hockey-metric ideation** — Tier A 1-3 graduated from ideation to shipped. Tier B (#4–7) still in §C of canonical backlog if revisited.

## TIER 1/2/3 HANDOFF CHANNEL HIERARCHY

**Tier 1 (LIVE):** MCP server on field-relay-nba at /mcp. Four auth paths. 8 tools.

**Tier 2 (NOT NEEDED).**

**Tier 3 (LIVE):** userMemories anchor edit. Updated to `73f2872` at PM-16 SESSION END.
