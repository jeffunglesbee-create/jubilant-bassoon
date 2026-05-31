# FIELD Handoff — May 31 2026 (TYPE D — WOW 1 + WOW 2 — DurableObject score push + crunch fan-out)
**jubilant-bassoon HEAD:** pending push · Smoke: 238/0 (gate) + 5 new post-gate (A328–A332)
**field-relay-nba HEAD:** 237e132 · Deploy: pending verification

## TIER 0 DEADLINES (carried forward)
- World Cup 2026: June 11 HARD — flip wc26:true in FIELD_V2_SOURCES
- Stanley Cup Final G1: June 2 — VGK @ CAR (already wired)
- NBA Finals G1: June 3 — SAS vs NYK (already wired)
- USPTO provisional: ~June 25

## WHAT WAS BUILT THIS SESSION

### WOW 1 — Real-Time Score Push (DurableObject + WebSocket)
**field-relay-nba (237e132):**
- New `src/game-do.js` — `GameDO` class using Hibernation WebSocket API
  - One DO per game (keyed by `sport:gameId`)
  - Polls API-Sports `/v2/games` once per cycle (25s default)
  - Broadcasts raw facts `{homeScore, awayScore, period, clock, state}` to all WS clients
  - Hibernates between polls — alarm-driven, idle shutdown after 5 min
- New routes in `src/index.js`:
  - `GET /ws/game/:sport/:gameId` (WebSocket upgrade)
  - `POST /signal/crunch/:sport/:gameId`
  - `POST /pin/game/:sport/:gameId` + `/unpin/game/:sport/:gameId`
- `wrangler.toml` — `[[durable_objects.bindings]]` GAME_DO + migration `v1-game-do`

**jubilant-bassoon (pending push):**
- New `GameSocket` class in `index.html` (lines ~10952+)
  - Auto-reconnect with 5s backoff
  - Keepalive ping every 45s
  - HTTP fallback for signalCrunch when WS not open
- `ensureGameSocket()` / `dropGameSocket()` lifecycle helpers
- **Dual-mode preserved:** polling code untouched, GameSocket is additive

### WOW 2 — Instant CRUNCH TIME Fan-Out
**Page-side signal (index.html):**
- CRUNCH TIME badge render path now signals the DO with full game state
- `data-crunchSignaledP` attr dedupes per period at the card level
- HTTP fallback when no WebSocket open

**SW-side signal (sw.js):**
- `SCORE_CHANGE` push handler: when SW determines isCrunch locally, POST `/signal/crunch/` to DO
- New `CRUNCH_TIME_SIGNAL` push handler (DO → SW direction): shows 🔥 CRUNCH TIME notification with full body
- `SW_VERSION` bumped to `2026-05-31b` (synced in both index.html and sw.js)

### Smoke
- 5 new post-gate assertions (A328–A332) — all passing
- Gate still 238/0 (pre-existing post-gate failures A273/A313/A314 unchanged)
- Pre-existing condition: index.html is 1.285MB (rotation pending — see below)

## REMAINING DEPLOY WORK (NEXT SESSION OR JEFF)

### 1. Cloudflare KV namespace creation — CRITICAL, manual
The pre-existing PUSH_SUBS KV namespace was never created (per May 24 HANDOFF).
GameDO doesn't depend on this KV directly (it uses DO storage), but the
existing PUSH A/B/C delivery chain still does.

Steps (browser, CF dashboard):
1. Workers & Pages → KV → Create namespace "field-push-subs"
2. Copy namespace ID
3. Update wrangler.toml: replace `PUSH_SUBS_PLACEHOLDER_REPLACE_WITH_REAL_ID`
4. Same for FIELD_JOURNALISM KV (`JOURNALISM_PLACEHOLDER_REPLACE_WITH_REAL_ID`)
5. Push → CI deploys with both bindings live

### 2. DurableObject deployment verification
After field-relay-nba CI runs (~30s after commit 237e132 push):
- Health check (browser, since *.workers.dev blocked from sandbox):
  GET https://field-relay-nba.jeffunglesbee.workers.dev/health
  Expect: "RELAY OK ... + ws-game-do"
- WebSocket test (browser console on FIELD):
  const ws = new WebSocket('wss://field-relay-nba.jeffunglesbee.workers.dev/ws/game/nba/12345');
  ws.onopen = () => console.log('OPEN');
  ws.onmessage = e => console.log('MSG', e.data);

### 3. File rotation — pre-existing 1MB overage
**Not caused by this session** — pristine was 1.328MB before my changes.
Recent `data: auto-overlay` commit (6b4e250) ballooned it.
Run `node scripts/rotate-schedule.js` next session to recover.

### 4. STANDARDS.md / Current State doc
- Add Rule reference for GameDO architecture
- Update FIELD_FEATURES section to reflect WOW 1 + WOW 2 entries
- New file size baseline note

## ARCHITECTURE NOTES — CONSTRAINTS UPHELD

**ADR-002 (relay-is-dumb):**
- DO ships only raw facts; drama computation stays browser-side
- DO's _fanoutCrunch payload type `CRUNCH_TIME_SIGNAL` contains zero composite values
- DO never evaluates "is this exciting" — only "did the client ask me to deliver"

**RUWT (US 9,421,446 B2):**
- The originating browser computes the named binary condition (ViewingConditions.evaluate)
- DO fans out the notification on behalf of the client
- Server-side: no interest level value, no threshold comparison, no editorial decision

**ESPN ToS:**
- DO polls API-Sports primary (`/v2/games`), ESPN is browser polling fallback only
- N user polls → 1 DO poll per game = ~99% upstream load reduction

**DO NOT INVENT:**
- All FieldGame schema fields copied from handleV2Games adapters
- All push payload fields match existing sendWebPush expectations
- No new API shapes invented — only reused existing patterns

## FIELD_V2_SOURCES — UNCHANGED
nba:true, nhl:true, mlb:true, wnba:true, mls:true (LIVE)
epl/ucl/europa/conference/eflchamp/eflone/efltwo/laliga/seriea/bundesliga/ligue1: false
wc26: false — re-enable June 11

## SESSION START (next session)
1. `cd /home/claude && git clone {PAT-URL}/jubilant-bassoon.git`
2. `node smoke.js index.html` — must be 238/0 gate
3. Read CI/Deploy Ref: `18JMUd-Uq_m2DomuCua2B5UMiWOel81yzc1JU7SY6f20`
4. Check field-relay-nba deploy status for commit 237e132
5. If KV namespaces still placeholder, create them (item 1 above)

## KEY DOC IDs
- CI/Deploy Ref: `18JMUd-Uq_m2DomuCua2B5UMiWOel81yzc1JU7SY6f20`
- STANDARDS.md: `1g6ZfxRkRPrk2g9NK-pANPHgJ1Zf-WwrcV25V-aC7zHM`
- ADR-002: `1exp7zmdtiADes-8pA9QaLJum1m1EigbsfrXLQxyJdvM`
- 10 Wow Factors (Workers Plus): `1O_JueImuL7JkqToDOr1OaXDOqMPVPLjm-CPW2OK_qoQ`
- Push Architecture (S0+PUSH A/B/C): `1DanThEy0VSUQxF7GDAIGhtqmMSXfeyvXvhuVVV3TCHM`
- PAT: ghp_***redacted*** (see memory) (exp May 2027)
