# FIELD Handoff — May 31 2026 (TYPE D — WOW 1 + WOW 2 + S0 Event Bus)
**jubilant-bassoon HEAD:** pending push · Smoke: 238/0 (gate) + 10 new post-gate (A328–A337)
**field-relay-nba HEAD:** 237e132 · Deploy: SUCCESS

## TIER 0 DEADLINES (carried forward)
- World Cup 2026: June 11 HARD — flip wc26:true in FIELD_V2_SOURCES
- Stanley Cup Final G1: June 2 — VGK @ CAR (already wired)
- NBA Finals G1: June 3 — SAS vs NYK (already wired)
- USPTO provisional: ~June 25

## WHAT WAS BUILT THIS SESSION

### WOW 1 — Real-Time Score Push (DurableObject + WebSocket)
**field-relay-nba (237e132 — DEPLOYED):**
- `src/game-do.js` — GameDO class using Hibernation WebSocket API
- Routes: /ws/game/:sport/:gameId, /signal/crunch/, /pin/game/, /unpin/game/
- wrangler.toml — GAME_DO binding + v1-game-do migration

**jubilant-bassoon (pending push):**
- `GameSocket` class + ensureGameSocket / dropGameSocket helpers
- Auto-reconnect with 5s backoff, 45s keepalive ping
- Dual-mode preserved — polling code untouched

### WOW 2 — Instant CRUNCH TIME Fan-Out
- Page-side CRUNCH signal in badge render path with per-period dedup
- SW-side CRUNCH signal in SCORE_CHANGE handler (backgrounded path)
- New CRUNCH_TIME_SIGNAL push handler in SW
- SW_VERSION synced to 2026-05-31b

### S0 — FIELD Event Bus
Spec source: Drive 1K4RAoaqbK7wUmauX-JjAonluS3MFjCZ6MEE8_6xYN48 (Update Arch v2)

**Implementation (7 of 7 items):**
1. ✅ `fieldEvents = new EventTarget()` + `_fieldEventCache` + `_dispatchIfChanged` + `emitScoreEvent` declared at module-level (near `_prevEspnScores`)
2. ✅ `detectAndStoreStoryMoment` now emits to bus after delta detection (source: 'poll')
3. ✅ F1 orphan emitter activated — `typeof fieldEvents !== 'undefined'` guard satisfied; sport field fixed from `{isGolf:false}` to `'f1'`
4. ✅ Subscribers wired:
   - `field:lead_change` → `_leadChangeBurst.set()` (mirrors inline detection for ALL emitters)
   - `field:final` → `checkForNewFinals()` (defers via setTimeout 0)
   - `_subscriberFired` dedup guard for one-shot per-game
5. ✅ `ensureGameSocket()` defaults `onFacts` to `emitScoreEvent` (source: 'ws') — WebSocket facts flow through the bus identically to polling facts
6. ✅ 5 new smoke assertions: A333 (bus defined), A334 (poll emitter), A335 (subscribers), A336 (WS path), A337 (FIELD_FEATURES)
7. ✅ HANDOFF.md updated (this doc)

**Event types in flight:**
- `field:score` — any score change (poll + WS sources)
- `field:lead_change` — leader flipped (poll + WS + F1 sources)
- `field:final` — game state = 'post'

**Dedup architecture:**
- `_fieldEventCache[gameId:type]` stores last scoreline → suppresses duplicate dispatches when poll + WS both fire
- `_subscriberFired[gameId:type]` per-game one-shot for expensive subscribers

### Smoke state
- Gate: **238/0** (unchanged from session start)
- Post-gate assertions: A328–A332 (WOW 1+2) + A333–A337 (S0) — all passing
- Pre-existing post-gate failures unchanged: A273 (EPL Layer 2), A313/A314 (PWA-A)

## REMAINING DEPLOY WORK (NEXT SESSION)

### 1. Cloudflare KV namespace creation — CRITICAL, manual (carry-forward)
PUSH_SUBS_PLACEHOLDER_REPLACE_WITH_REAL_ID + JOURNALISM_PLACEHOLDER_REPLACE_WITH_REAL_ID
GameDO (WOW 1+2) uses DO storage so it works without KV.
The original cron-driven PUSH B path still depends on PUSH_SUBS being real.

### 2. File rotation — pre-existing 1.285MB overage
Run `node scripts/rotate-schedule.js` next session.
Pre-existing condition; not caused by this session.

### 3. Live verification (browser, *.workers.dev blocked from sandbox)
- GET https://field-relay-nba.jeffunglesbee.workers.dev/health → expect "ws-game-do"
- Console: `const ws = new WebSocket('wss://field-relay-nba.jeffunglesbee.workers.dev/ws/game/nba/12345')`
- Console: `fieldEvents.addEventListener('field:score', e => console.log('BUS:', e.detail))` then watch a live game

### 4. Documentation updates
- STANDARDS.md: add rule reference for GameDO + Event Bus architecture
- Current State doc (1GvsfnTH9Xhqzg_NdYrPhPpk1d1Rnm0lkeG6ip-tLUlA): update HEAD, file size, FIELD_FEATURES
- Update Architecture Spec v2 (1K4RAoaqbK7wUmauX-JjAonluS3MFjCZ6MEE8_6xYN48): mark S0 DONE
- Infrastructure Backlog (1RQovuK208W6v6AEouA-w6DFU70Cgia4uxmOMkp0eOJU): move [UPDATE S0] from PENDING to COMPLETED
- Push Architecture (1DanThEy0VSUQxF7GDAIGhtqmMSXfeyvXvhuVVV3TCHM): correct "LIVE" status claim — components were never actually shipped pre-WOW

## ARCHITECTURE NOTES — CONSTRAINTS UPHELD

**ADR-002 (relay-is-dumb):**
- Bus carries facts only ({homeScore, awayScore, period, clock, state})
- No drama scores, no thresholds, no composite values
- All consumers (page, DO, push) compute intelligence locally from facts

**RUWT (US 9,421,446 B2):**
- Bus is a fact distribution layer, not an interest level evaluator
- Subscribers do their own named-condition checks before acting
- Bus events do not carry "is this exciting" determinations

**DO NOT INVENT:**
- emitScoreEvent payload schema matches handleV2Games adapter output
- All emitter sources are observable (delta math from _prevEspnScores)
- F1 dispatch uses real OpenF1 driver positions, not derived rankings

**DUAL-MODE PRESERVATION:**
- Polling-only deployments: bus still works (polling path emits)
- WebSocket-only deployments: bus still works (WS path emits)
- Both: dedup via _fieldEventCache prevents double-fire

## FIELD_V2_SOURCES — UNCHANGED
nba:true, nhl:true, mlb:true, wnba:true, mls:true (LIVE)
epl/ucl/europa/conference/eflchamp/eflone/efltwo/laliga/seriea/bundesliga/ligue1: false
wc26: false — re-enable June 11

## SESSION START (next session)
1. `cd /home/claude && git clone {PAT-URL}/jubilant-bassoon.git`
2. `node smoke.js index.html` — must be 238/0 gate
3. Read CI/Deploy Ref: `18JMUd-Uq_m2DomuCua2B5UMiWOel81yzc1JU7SY6f20`
4. Verify field-relay-nba commit 237e132 deployed (GameDO live)
5. If KV namespaces still placeholder, create them
6. In browser console: confirm `typeof fieldEvents === 'object'` and a live game emits

## KEY DOC IDs
- CI/Deploy Ref: `18JMUd-Uq_m2DomuCua2B5UMiWOel81yzc1JU7SY6f20`
- STANDARDS.md: `1g6ZfxRkRPrk2g9NK-pANPHgJ1Zf-WwrcV25V-aC7zHM`
- ADR-002: `1exp7zmdtiADes-8pA9QaLJum1m1EigbsfrXLQxyJdvM`
- Update Arch v2 (S0 spec): `1K4RAoaqbK7wUmauX-JjAonluS3MFjCZ6MEE8_6xYN48`
- 10 Wow Factors: `1O_JueImuL7JkqToDOr1OaXDOqMPVPLjm-CPW2OK_qoQ`
- Push Architecture: `1DanThEy0VSUQxF7GDAIGhtqmMSXfeyvXvhuVVV3TCHM`
- Infrastructure Backlog: `1RQovuK208W6v6AEouA-w6DFU70Cgia4uxmOMkp0eOJU`
