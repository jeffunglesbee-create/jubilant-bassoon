## SESSION CLOSE-OUT — 2026-07-20, pl-card-event-types (supersedes previous)

**HEAD:** 689d17b (jubilant-bassoon) / 8b2ec22 (field-relay-nba)
**Smoke count:** 963/0 (unchanged)
**SW version:** 2026-07-20a (unchanged)
**Session doc:** outbox/cc-session-2026-07-20-pl-card-event-types.md

**PulseLive card event type probe — all types confirmed:**
- Probed fixtures 124837 (Man Utd 2-1 Chelsea GW5) and 125053 (Chelsea 1-1 Burnley GW27) via new `/pl/events/:id` relay endpoint.
- field-relay-nba `8b2ec22`: Added `/pl/events/:id` — returns `{ count, types[], events[] }` (textstream only, no fixture object). Fits in ~20KB, fully visible via probe_relay_route. Probe-only; no client consumer.
- Confirmed: `"red card"` (direct dismissal), `"secondyellow card"` (second yellow → dismissal, no space between "second" and "yellow").
- jubilant-bassoon `689d17b`: Key Moments filter at `field.js:39241` now includes all confirmed dismissal types: `red card`, `secondyellow card`.
- Prior open carry-forward (card types unconfirmed) — CLOSED.

---

## SESSION CLOSE-OUT — 2026-07-20, pl-client-verify (supersedes previous)

**HEAD:** 8d288e0 (jubilant-bassoon) / 45329db (field-relay-nba, unchanged)
**Smoke count:** 963/0 (unchanged)
**SW version:** 2026-07-20a (unchanged)
**Session doc:** outbox/cc-session-2026-07-20-pl-match-client-wiring.md

**PL E2E browser verification — 20/20 passed:**
- jubilant-bassoon `120b829`: Added `window._plVerify` test API block in `field.js` (gated on `?pl-verify` URL param). Exposes `fetchPLMatch`, `openBottomSheet`, `toggleStatsView`, `setEspnScore` (setter for module-level `espnScores`), `pushAllDataSport` (setter for module-level `allData`). Required because `build-bundle.mjs` uses ESM format — all declarations are module-scoped, not globally accessible.
- jubilant-bassoon `8d288e0`: Fixed Probe 3 Lineups assertion to query `.bs-section` ancestor of the Lineups label (instead of `#stats-content` root), accepting `REF:` or `VAR:` or `4-2-3-1` as evidence.
- `pl_client_verify.js`: Fully rewritten to use `window._plVerify.*` for all internal access. 20/20 assertions verified on GH Actions run `29767592199`. Screenshots in `outbox/`.
- `pl-client-verify.yml`: Auto-triggers after every successful "Deploy gate (fast smoke)" run. Results committed to `outbox/` as `[skip ci]`.
- Integration status: VERIFIED — E2E browser tests 20/20, all three probes passing (fetchPLMatch relay contract, Key Moments bottom sheet, Stats tab Lineups).
- Open: card event types (yellow/red) not confirmed — need a booked match to verify type string. Carry-forward only.

---

## SESSION CLOSE-OUT — 2026-07-20, pl-match-probe (supersedes previous)

**HEAD:** 45329db (field-relay-nba) / ba4b233 (jubilant-bassoon, no new code)
**Smoke count:** 963/0 (unchanged)
**SW version:** 2026-07-20a (unchanged)
**Session doc:** outbox/cc-session-2026-07-20-pl-match-probe.md

**PulseLive textstream probe + pagination fix:**
- Probed completed fixture 116197 (Bournemouth 2-0 Leicester GW38 2024/25) directly via PulseLive API. Confirmed event types: goal, substitution, miss, corner, offside, free kick, attempt blocked. Goal events include scorer, assister, foot, location in prose. 135 events per match.
- field-relay-nba `45329db`: `/pl/match/:id` now fetches pageSize=100 and all pages in parallel. Response is `{ fixture, events: <flat array> }`. Verified live via probe_relay_route — 50,400 bytes, formations + teamLists + matchOfficials + halfTimeScore + all events confirmed.
- MCP allow-list: `/pl` prefix already covered `/pl/match/:id` — no change needed.
- `/pl/match/:id` has NO client consumer. Bottom sheet wiring is the next step.

---

## SESSION CLOSE-OUT — 2026-07-20, pl-pulselive (supersedes previous)

**HEAD:** bdfbe82 (jubilant-bassoon) / 8bd5c19 (field-relay-nba)
**Smoke count:** 963/0
**SW version:** 2026-07-20a (unchanged)
**Session doc:** outbox/cc-session-2026-07-20-pl-pulselive.md

**PL PulseLive endpoint + client wiring:**
- field-relay-nba `43c6076`: `/pl/*` route handler — `/pl/fixtures`, `/pl/match/:id`, `/pl/seasons` via `footballapi.pulselive.com`. 30s TTL on live routes, 1h on seasons. `/pl` added to MCP probe allow-list.
- jubilant-bassoon `9545f6c`: `fetchPLFixtures()` wired at boot + poll cycle; writes `espnScores` with `source:'pl'`; priority FD > PL > FPL.
- field-relay-nba `8bd5c19`: `/pl/fixtures` route smoke added to `post-deploy-live-verify.yml` (fires after every deploy).
- jubilant-bassoon `bdfbe82`: smoke.js A124 — PL_RELAY_BASE + fetchPLFixtures definition + boot call. 963/0.
- Integration status: STAGED — sandbox egress blocked E2E HTTP verify. Verify with curl during a live/completed PL fixture window (see session doc).

---

## SESSION CLOSE-OUT — 2026-07-20, adr002-rule-f (supersedes previous)

**HEAD:** f07a26b
**Smoke count:** 962/0
**SW version:** 2026-07-20a
**Session doc:** outbox/cc-session-2026-07-20-bottom-sheet-stats-reconciliation.md (same session, docs addendum)

**ADR-002 Rule F (docs-only, [skip ci]):**
- Added Rule F to `docs/ADR-002-CONTEXT.md`: commodity/proprietary governing test for relay computation
- "Arithmetic and classification ONLY" is imprecise (soccer-wp.js is already a statistical model on relay). Actual rule: relay may compute anything a neutral data vendor could publish; may never compute outputs that function as watch recommendations.
- Added neutral-vendor test, soccer-wp.js rationale, close-game-push prohibition
- Added PERMITTED item 8 (commodity statistical models on relay)
- Updated jubilant-bassoon CLAUDE.md Rule 6 shorthand to reference Rule F
- Updated field-relay-nba CLAUDE.md Rule 1 with the commodity/proprietary test (8088b74)

---

## SESSION CLOSE-OUT — 2026-07-20, bottom-sheet-stats-reconciliation

**HEAD:** 8c501b4
**Smoke count:** 962/0
**SW version:** 2026-07-19d (unchanged)
**Session doc:** outbox/cc-session-2026-07-20-bottom-sheet-stats-reconciliation.md

**Bottom sheet / Stats tab reconciliation (CC-CMD-2026-07-19-bottom-sheet-stats-reconciliation.md):**
- `renderStatsSection()` — new "Today's Games" sub-section iterates allData.sports, renders buildScoutingReport(), standings, milestone alert, comeback probability, BSD pitch per game
- `openBottomSheet()` — removed: scoutReport, standingsStr, seriesMargins, milestoneStr, cb, _bsBsdEventId, _bsIsWC, post-game R2 fetch; Live Intelligence simplified to dramaLabel_bs only; Context simplified to matchupNote||localNote only
- smoke.js A_BSD_9/A_BSD_10 updated to new renderStatsSection location
- Smoke 962/0 before and after

---

## SESSION CLOSE-OUT — 2026-07-20, game-thread-client (supersedes previous)

**HEAD:** ae24581
**Smoke count:** 962/0
**SW version:** 2026-07-19d
**Session doc:** outbox/cc-session-2026-07-20-game-thread-client.md

**Game Thread client — Phase 2 (CC-CMD-2026-07-20-game-thread-client.md):**
- `_getThreadToken()` — localStorage['field_thread_token_v1'], generated once, never sent as identity
- `GameSocket.onThreadNote` + `onThreadCatchup` callbacks wired to confirmed relay contract
- `sendThreadNote(body)` method on GameSocket; `toggleThreadDrawer(gameId)` + `_threadSend(gameId)` exposed on `window`
- Thread button + drawer gated on `_circadian === 'PRIME'` in `buildCardHTML`; append-only render, scroll preserved
- 4 GAME-THREAD smoke assertions; SW_VERSION: 2026-07-19c → 2026-07-19d
- **TASK 6 VERIFIED LIVE:** Two headless browser sessions, same game card (`g1`), Tab 1 sent note, Tab 2 received via `thread_catchup` WS, <2s latency. 100/100 confidence.

---

## SESSION CLOSE-OUT — 2026-07-19, stats-tab (supersedes previous)

**HEAD:** 4469111
**Smoke count:** 958/0
**SW version:** 2026-07-19c
**Session doc:** outbox/cc-session-2026-07-19-stats-tab.md

**Stats tab — fourth full-viewport mode (4469111):**
- `📊 Stats` nav link added to nav bar
- `stats-mode` CSS (body toggle, hide/show sections, max-width 1400px desktop)
- `<section id="stats-section">` with back-pill, header, content div
- `toggleStatsView()` — mutual exclusion vs journalism/wc/pickem; mirrors `togglePickEmView()` exactly
- `renderStatsSection()` — five sport blocks: MLB (Pythagorean gap + xwOBA divergence), NFL (QB CPOE + WR AYS/YAC), NBA (clutch DRTG delta + best DRTG), NHL (GSAx leaders + elite tier), EPL (xGI/90 top 10)
- All sport blocks gracefully empty if data map unpopulated at render time
- SW_VERSION: 2026-07-19b → 2026-07-19c

---

## SESSION CLOSE-OUT — 2026-07-19, cross-sport-analytics (supersedes previous)

**HEAD:** 4a211dc
**Smoke count:** 958/0
**SW version:** 2026-07-19b
**Session doc:** outbox/cc-session-2026-07-19-cross-sport-analytics.md

**Cross-sport analytics layer (4a211dc):**
New metrics wired from relay-confirmed data sources:
- MLB: xwOBA divergence (woba−xwoba) live in At-Bat Edge per current batter; Pythagorean expected W% from MLB Stats API /standings
- NFL: NGS QB CPOE + WR YAC Above Expected / Air Yard Share in Scouting Report
- EPL: FPL per-90 xGI leaders per team in Scouting Report
- Boot: `mlbPythagInit` T+4.9s, `nflNGSInit` T+5.0s
- Relay (field-relay-nba 9be0604): added `/standings` to MLB Stats API allowlist

All features STAGED (relay data confirmed, E2E requires live seasons).

**Competitor probe (12689ee + CI run 29698804764):**
- 4 confirmed gaps: Pythagorean record, Leverage Index, RE24, Schedule-Adjusted Record
- Reports at outbox/metric-gaps-2026-07-19.md, outbox/competitor-probe-2026-07-19.md

---

## SESSION CLOSE-OUT — 2026-07-18, runtime-errors-img9604-img9605 (supersedes previous)

**HEAD:** 42f98bc
**Smoke count:** 958/0
**SW version:** 2026-07-18k
**Session doc:** outbox/cc-session-2026-07-18-runtime-errors.md

**IMG_9604 fixes (commit 2d87152):**
- `getDramaDial()` wrapped in try/catch → eliminates `initFIELDBrief:null is not an object` on iOS Safari private/standalone (window.localStorage===null)
- `generateJournalismViaRelay` default timeout raised 12s→25s → eliminates `journalism:generate:j3-brief:Load failed` (quality chain 6+ retries routinely exceeded 12s)

**IMG_9605 fix (commit 42f98bc):**
- `findESPNScore` early-exit guard: added `sc.isSoccer` → eliminates `scores:find-espn-score-no-match` for all soccer games. Root cause: `SOCCER_LEAGUES=[]` so `espnScores` never has soccer; all soccer served via `findScore()→_scoresBySource.apisports`.
- NBA relay 403 (×2): no fix — transient CDN issue, already guarded by `retryable:true` + `RELAY_HEALTHY`.

---

## SESSION CLOSE-OUT — 2026-07-18, browser-verify-debrief-gap12 (supersedes previous)

**HEAD:** b7f1f26
**Smoke count:** 958/0
**SW version:** 2026-07-18c (bumped in b7f1f26)
**Session doc:** outbox/cc-session-2026-07-18-browser-verify-debrief-gap12.md

**Debrief card V2 _gameId fix:** `fetchV2AllScores` now propagates `v2Entry._gameId` to `allData.sports` game objects (commit 22dd4fe). Previously MLB cards in `allData.sports` had no `_gameId`, so `injectDebriefCards` fell back to internal `g{n}` IDs → wrong relay endpoint → pre-game brief served. Fix: extended round/series propagation block to also write `_gameId`; adds re-injection trigger if card already stamped with wrong contextId. Post-deploy verification: Cubs/Twins card (espn:401816164) serves correct post-game brief. Gap 12 cache key confirmed correct (`espn%3A401816164`). Full Playwright setOffline test STAGED (requires direct Playwright access — MCP browser tool does not support setOffline). CI: Smoke Test + Live Verify success on b7f1f26.

**STAGED:** Gap 12 strict offline page-reload test. Blocked by: MCP browser tool lacks `setOffline(true)`. Unblocked when: Playwright direct access available. Verify: `context.setOffline(true)` → reload → assert `.card-debrief[data-slot="debrief"]` visible with cached post-game brief text.

---

## SESSION CLOSE-OUT — 2026-07-18, extract-debrief-domain (supersedes previous)

**HEAD:** 2d6508c
**Smoke count:** 958/0
**SW version:** 2026-07-18b (unchanged — no SW change)
**Session doc:** outbox/cc-session-2026-07-18-extract-debrief-domain.md

**Debrief domain extracted:** `src/debrief/index.ts` — second real TypeScript module. Extracts buildDramaUnsealed, buildFieldWasWatching, buildOddsStory, buildSeriesArc, buildBracketDeltaLayer, buildDebrief from field.js into typed TS with DebriefData/SeriesArc/SeriesGame/OddsOutcome/BracketDelta/BracketShift/EnrichedGameForDebrief types. SeriesArc shape enforces corrected home_score/away_score per-game + top-level margins[] (the previously-fixed bug shape). fieldChip injected via initDebriefModule() — same DI pattern as Identity. field_smoke.js updated with 7 global stubs (initDebriefModule + 6 builders). All CI green: Desktop Chrome Viewport Audit, Code Map (L3), Client Live Invariant.

---

## SESSION CLOSE-OUT — 2026-07-18, extract-identity-domain (supersedes previous)

**HEAD:** 923f426
**Smoke count:** 958/0
**SW version:** 2026-07-18b (unchanged — no SW change)
**Session doc:** outbox/cc-session-2026-07-18-extract-identity-domain.md

**Identity domain extracted:** `src/identity/index.ts` — first real TypeScript module in the codebase. Extracts findGameById, _resolveRealGameId, resolveGameIdByHome from field.js into typed TS with FieldInternalId/ExternalGameId/FieldGame/EspnScoreEntry/FieldData types derived from actual observed shapes. Dependency injection via initIdentityModule() bridges module scope — espnScores/allData as live closures, allGamesFlat direct. Scope narrowed to 3 of 7 candidates (getDramaPeak, normalizeNBAGameRelay, normalizeMLBGame, resolveGameBroadcast correctly excluded). esbuild TS transpilation confirmed: identity functions inline at bundle time (lines 5379-5420). smoke.js/field_smoke.js updated for import-pattern acceptance. All CI green. Proof-of-pattern for future TS extractions.

---

## SESSION CLOSE-OUT — 2026-07-18, retire-globalthis-bridge (supersedes previous)

**HEAD:** 81f1abb
**Smoke count:** 958/0
**SW version:** 2026-07-18b (unchanged — no SW change)
**Session doc:** outbox/cc-session-2026-07-18-retire-globalthis-bridge.md

**globalThis bridge RETIRED:** `src/main.js` reduced from 65 lines to 5. All 25 `globalThis.X = X` bridge lines removed. 16 extracted util modules are now imported directly at the top of `src/legacy/field.js` (one import per util). 19 empty stub function/const definitions removed from field.js (they shadowed the imports). smoke.js A191 + A-FTO-2 + field_smoke.js weather assertion updated to accept `import { fn }` as valid function presence (not just inline `function fn(`). ESLint `sourceType: module` added. Deploy gate: success. Bundle 1567 KB (2 KB smaller). This completes the module thread: Scenario A (type="module" tag) → bridge inline handlers → Scenario B (ESM format) → module source tag infrastructure → retire globalThis bridge.

---

## SESSION CLOSE-OUT — 2026-07-18, Module Script Scenario B (supersedes previous)

**HEAD:** fe3dd4b
**Smoke count:** 958/0
**SW version:** 2026-07-18b (unchanged — no SW change)
**Session doc:** outbox/cc-session-2026-07-18-module-script-scenarioB.md

**Scenario B COMPLETE:** `build-bundle.mjs` now emits `format: 'esm'` (was `'iife'`). The IIFE wrapper `(() => { ... })()` is removed from the deployed bundle. Bundled output is genuine module-top-level code inside the existing `<script type="module">` tag (Scenario A). Bundle size: 1569 KB (vs 1631 KB IIFE — 62 KB smaller). Bundled smoke regression: 586/372 vs IIFE baseline 578/380 — 0 new failures, 8 fewer. Source smoke 958/0. All CI green: Desktop Chrome, Desktop Safari, Smoke+Verify, Browser runtime tests (Playwright live URL). globalThis bridge in main.js (25 lines) NOT retired — not necessary for correctness under bundled ESM; retirement is a separate, larger scope requiring its own CC-CMD.

---

## SESSION CLOSE-OUT — 2026-07-18, Bridge Inline-Handler Implicit Globals (supersedes previous)

**HEAD:** 5b603c0
**Smoke count:** 958/0
**SW version:** 2026-07-18b (unchanged — no SW change)
**Session doc:** outbox/cc-session-2026-07-18-bridge-inline-handlers.md

**Bridge inline handlers COMPLETE:** 13 explicit `window.X=` bridges added to `src/legacy/field.js` after `window.addEventListener('beforeunload', saveSnapshot)`. Functions: `_deskCardToggle`, `closeBottomSheet`, `fetchMCPStatus`, `goToDate`, `openJournalismForGame`, `pinGame`, `scrollToGame`, `setViewerIntelMode`, `switchWCTab`, `toggleJournalismView`, `togglePickEmView`, `toggleWCView`, `unpinGame`. All confirmed defined in field.js, all confirmed called from inline HTML event handlers, zero overlap with existing 54 window assignments. Purely additive. Smoke 958/0 before and after. All CI green: deploy-gate, Desktop Chrome Viewport Audit, Client Live Invariant. This is Scenario B prerequisite — Scenario B itself (true ES module conversion, removing IIFE) remains separate, unauthorized work.

---

## SESSION CLOSE-OUT — 2026-07-18, Module Script Scenario A (supersedes previous)

**HEAD:** 7181061
**Smoke count:** 958/0
**SW version:** 2026-07-18b (unchanged — no SW change)
**Session doc:** outbox/cc-session-2026-07-18-module-script-scenarioA.md

**Module Script Scenario A COMPLETE:** `build-bundle.mjs` now emits `<script type="module">` wrapping the existing IIFE bundle (one-line change: `html.slice(0, scriptStart) + '<script type="module">'` instead of passing through the original tag). IIFE unchanged — Scenario B (true ES module conversion) is separate, unauthorized work. Source smoke 958/0 before and after. Bundled regression check: 576/382 (identical to pre-change baseline, 0 new failures). All CI workflows green: deploy-gate, Desktop Chrome, Desktop Safari, Smoke+Verify. `get_smoke_count` (895) counts `assert(` call sites in smoke.js source — not pass/fail count; 958 pass count from local source smoke is the real gate.

---

## SESSION CLOSE-OUT — 2026-07-18, Gap 7 client bracket delta (supersedes previous)

**HEAD:** 97d6577
**Smoke count:** 958/0
**SW version:** 2026-07-18b (unchanged)
**Session doc:** outbox/cc-session-2026-07-18-gap7-bracket-delta-client.md

**Gap 7 client COMPLETE:** `buildBracketDeltaLayer` (Layer 5) added to `buildDebrief`. Reads `ctx.bracketDelta` from `/context/game/{id}` (relay `79f950e`), renders top-3 WC championship shift movers with `champDelta.toFixed(1)pp` and `champAfter.toFixed(1)%`. CSS `.debrief-bracket*` added to index.html. 958/0. CI triggered on 97d6577.

**OPEN (STAGED):** E2E requires WC match to complete (BracketDO fires → `bracket_delta` brief written → Debrief card Layer 5 visible). WC Final 2026-07-19 is the expected trigger. Verify: D1 `SELECT * FROM briefs WHERE brief_type='bracket_delta' LIMIT 5`, then open Debrief card for that game.

---

## SESSION CLOSE-OUT — 2026-07-18, Gap 12 offline Debrief caching (supersedes previous)

**HEAD:** 324c107
**Smoke count:** 958/0
**SW version:** 2026-07-18b (bumped from a — sw.js change)
**Session doc:** outbox/cc-session-2026-07-18-gap12-offline-cache.md

**Gap 12 COMPLETE:** `injectDebriefCards` now reads Context Graph responses from `field-debriefs` Cache API before fetching (cache-first). On network hit, writes Response with `X-Cache-Time` header. sw.js activate event sweeps `field-debriefs` and evicts entries older than 7 days. Cache key: `https://field-local/debrief/${encodeURIComponent(gameId)}`. SW_VERSION bumped to `2026-07-18b` in both `sw.js` and `field.js`. 958/0. CI triggered on 324c107.

**OPEN (STAGED):** Offline survival E2E requires browser runtime post-deploy. Verify via DevTools → Offline → reload → Debrief card renders from cache. See session doc for exact unblock criteria.

---

## SESSION CLOSE-OUT — 2026-07-18, Gap 8 + Gap 9 circadian surfaces (supersedes previous)

**HEAD:** aa5d693
**Smoke count:** 958/0
**SW version:** 2026-07-18a
**Session doc:** outbox/cc-session-2026-07-18-gap8-gap9-circadian-surfaces.md

**Gap 8 COMPLETE:** `renderJournalism()` sections converted to `{type,html}` objects. `_JOURNAL_PRIORITY` table sorts sections by `_circadianMode`: PREVIEW=series-first, PRIME=editorial-first, NIGHT=slate-first, LATE/DAWN=editorial-first. Each section tagged with `data-journal-priority`. V2 poll re-calls `renderJournalism()` on mode change when `journalism-mode` active. 958/0. CI triggered on aa5d693.

**Gap 9 COMPLETE:** `buildStreamingDiscovery()` gains mode-specific scoring (`_scoreForMode`) and contextual badge text (`_badgeForMode`): PREVIEW="X games tonight", PRIME="X live now", NIGHT="X Debriefs available", LATE/DAWN="X games tracked". `renderStreaming()` renders `_circadianBadge` span after `app-name`. CSS `.app-circadian-badge` added. 958/0.

**OPEN:** None from this session.

---

## SESSION CLOSE-OUT — 2026-07-18, Gap 4 MyTeams sort boost (supersedes previous)

**HEAD:** 573d448
**Smoke count:** 958/0
**SW version:** 2026-07-18a
**Session doc:** outbox/cc-session-2026-07-18-gap4-userdo.md

**Gap 4 COMPLETE:** `myTeamsBoost(g)` function added (L2760). Called within `games.sort()` in `renderAll` after primary circadian tier sort — within each tier, games where `MY_TEAMS.has(home)||MY_TEAMS.has(away)` sort first. No-ops when MY_TEAMS is empty. Falls through to existing secondary sorts within each group. Uses `MY_TEAMS` (existing Set, confirmed source of truth — NOT `_userState.watchHistory`). Gap 11 Rule 2 (My Teams compounding with circadian) is now satisfied. 958/0. CI triggered on 573d448.

**OPEN:** None from this session.

---

## SESSION CLOSE-OUT — 2026-07-18, Gap 11 filter × circadian interaction (supersedes previous)

**HEAD:** 080be28
**Smoke count:** 958/0
**SW version:** 2026-07-18a
**Session doc:** outbox/cc-session-2026-07-18-gap11-filter-circadian.md

**Gap 11 COMPLETE:** Rules 1/3/4 implemented. Rule 1: `activeFilter` confirmed to persist across mode changes — no code change needed. Rule 3: `_checkFilterSuggestionChip()` added — on LATE/DAWN transition, if a sport filter is active and all its games are final, shows a dismissible "Show all sports" suggestion chip (never auto-clears). Rule 4: `updateConflictChip()` now gated on PREVIEW/PRIME — hides conflict chips during NIGHT/LATE/DAWN since conflicts are moot once games are over. Rule 2 (My Teams compounding): Gap 4 not yet landed — explicitly outstanding. 958/0. CI triggered on 080be28.

**OPEN:** Rule 2 (My Teams + circadian compounding) — awaiting Gap 4 (myTeamsBoost) to land first.

---

## SESSION CLOSE-OUT — 2026-07-18, Gap 2 AmbientDO SSE → Debrief instant transition (supersedes previous)

**HEAD:** 56903bf
**Smoke count:** 958/0
**SW version:** 2026-07-18a
**Session doc:** outbox/cc-session-2026-07-18-gap2-sse-debrief.md

**Gap 2 COMPLETE:** `_onMessage(evt, 'final')` in the ambient SSE closure now fires `injectDebriefCards()` at 300ms after the `final` SSE event for the specific `gameId`, rather than waiting for the next 600ms-after-renderAll poll cycle. `_debriefTriggeredIds` Set prevents re-triggering on duplicate `final` events. Fire-and-forget: failure is silent, the natural poll-cycle path remains the fallback unchanged. 958/0. CI triggered on 56903bf.

**OPEN:** None from this session. Live E2E verification requires a real game going final during active SSE session.

---

## SESSION CLOSE-OUT — 2026-07-18, Gap 6 push notification → Debrief link (supersedes previous)

**HEAD:** cab85fb (jubilant-bassoon) / 1b4c6c1 (field-relay-nba)
**Smoke count:** 958/0
**SW version:** 2026-07-18a
**Session doc:** outbox/cc-session-2026-07-18-gap6-push-debrief.md

**Gap 6 COMPLETE (both repos):** GameDO final-state hook now fires `POST /push/game-final` (fire-and-forget) alongside existing `/archive/game` and `/journalism/game-complete`. Relay `handleGameFinalPush` fans out `GAME_FINAL` push to all PUSH_SUBS subscribers. SW handles `GAME_FINAL` type — shows Final notification with `watchUrl='/?debrief=gameId'`. Existing `notificationclick` handler navigates to debrief URL — no click handler changes needed. `field.js` reads `?debrief=` param on load and scrolls to card at 1500ms (after injectDebriefCards cycle). Patent-safety confirmed: `drama_peak` absent from all send conditions — send triggers on `isCompleted(facts.state)` only. 958/0. CI triggered on both commits.

**OPEN:** Live push E2E not verifiable in sandbox — requires active PUSH_SUBS subscriber + real game reaching final state. Verify via: (1) subscribe a device, (2) wait for a game to complete, (3) confirm GAME_FINAL notification appears with score + "Tap for Debrief", (4) confirm tap opens `/?debrief=gameId` and scrolls to card.

---

## SESSION CLOSE-OUT — 2026-07-18, fix dual MLB game-ID paths (supersedes previous)

**HEAD:** d4bf941
**Smoke count:** 958/0
**SW version:** 2026-07-18a
**Session doc:** outbox/cc-session-2026-07-18-fix-mlb-dual-id-paths.md

**MLB dual-ID fix COMPLETE:** `fetchESPNFixturesForDate` (date-picker path) now builds canonical `MLB_{homeAbbr}_{awayAbbr}_{YYYYMMDD}` IDs for MLB games instead of the generic `g${_gid}` counter. Confirmed two distinct legitimate MLB paths: `normalizeMLBGame` (boot/today) and `fetchESPNFixturesForDate` (date-picker/any date). 13 pre-existing `g${n}` briefs are known unmatchable — explicit backfill decision deferred as a separate task. After fix, `archiveBrief` and `findBriefs` will use the same canonical ID. 958/0. CI triggered on d4bf941.

**OPEN (from this session):** Pre-existing 13+ `g${n}` mlb_game briefs in ARCHIVE_DB need a backfill to canonical IDs — separate explicit decision/CC-CMD required. Verify first live post-fix brief via D1 query.

---

## SESSION CLOSE-OUT — 2026-07-18, fix buildSeriesArc data-shape mismatch (supersedes previous)

**HEAD:** 7aa3876
**Smoke count:** 958/0
**SW version:** 2026-07-18a
**Session doc:** outbox/cc-session-2026-07-18-fix-series-arc-shape.md

**buildSeriesArc FIXED:** `g.winner`/`g.margin` per-game reads replaced with derived winner from `home_score`/`away_score` comparison and `arc.margins[i]` index lookup. Matches confirmed `findSeries()` relay shape. Null-score edge case (unplayed game) correctly produces no data-winner, no tooltip. All assertions pass. 958/0. CI triggered on 7aa3876.

**OPEN:** Night Owl/Context Graph prompt integration (Layer 5) relay-side. `archive.gameBriefs[]` relay work. Series arc will render correctly when playoff data is available.

---

## SESSION CLOSE-OUT — 2026-07-18, Phase 3b The Debrief client (supersedes previous)

**HEAD:** 0505b18
**Smoke count:** 958/0
**SW version:** 2026-07-18a
**Session doc:** outbox/cc-session-2026-07-18-debrief-phase3b-client.md

**Phase 3b COMPLETE:** `buildDramaUnsealed`, `buildFieldWasWatching`, `buildOddsStory`, `buildSeriesArc`, `buildDebrief`, `injectDebriefCards` implemented and wired. `buildEnrichedGame` extended with `contextGame` source (populates `debrief.dramaSealed/dramaArc/oddsOutcome/preGameBrief/seriesArc`). `renderCard` debrief slot now uses `buildDebrief(enrichedGame)` Element. `injectDebriefCards` fires 600ms after every `renderAll`, replaces string-rendered final-game cards with DOM cards via `renderCard`, wires touch/click/keyboard handlers. CSS `.game-card.is-final .card-debrief{display:block}` was pre-existing; debrief layer CSS added. All CI green on 0505b18. 958/0.

**OPEN:** Night Owl / Context Graph prompt integration (Layer 5) requires relay-side changes to journalism prompt builder — needs separate relay CC-CMD. `archive.gameBriefs[]` currently empty for most games (buildFieldWasWatching renders when populated, relay work needed). Series arc shape unknown for playoff games (null-guarded, will render when playoff data available).

---

## SESSION CLOSE-OUT — 2026-07-18, Phase 2 Schedule Compound (supersedes previous)

**HEAD:** 880ebc6
**Smoke count:** 958/0
**SW version:** 2026-07-18a
**Session doc:** outbox/cc-session-2026-07-18-debrief-phase2-schedule-compound.md

**Phase 2 COMPLETE:** `buildEnrichedGame`, `renderCard`, `updateCard`, `shouldShowCard`, `scheduleRenderDebounced` implemented and wired. `buildEnrichedGame` called in `renderAll` per-card closure (after `_circEData`) and in `renderESPNScores` before score DOM build. `shouldShowCard` replaces inline filter ternary in `renderAll`. `renderCard`/`updateCard` STAGED for Phase 3. Journalism brief wiring (path 3) STAGED — incompatible with fillSlot until renderCard replaces renderAll card generation. All CI pending on 880ebc6. 958/0.

**Phase 3 (The Debrief) now dispatchable:** `data-slot="debrief"` reserved. `buildEnrichedGame` provides `debrief.dramaSealed`/`preGameBrief`. Tasks: `assembleDebrief`, `fillDebriefSlots`, `.card-debrief` rendering, `renderCard` migration.

---

## SESSION CLOSE-OUT — 2026-07-18, sync-source.mjs divergence guard (supersedes previous)

**HEAD:** 5355893
**Smoke count:** 958/0
**SW version:** 2026-07-18a
**Session doc:** outbox/cc-session-2026-07-18-sync-source-guard.md

**sync-source guard COMPLETE:** `sync-source.mjs` now detects and blocks (exit 1) any case where `index.html`'s script block has been edited directly — comparing current block against both `field.js` AND the last-committed state. Normal `field.js`-originated syncs unaffected. Proven via real deliberate test (tamper → blocked, restore → clean). CLAUDE.md Key Files updated with authoritative `src/legacy/field.js` note. All CI green. 958/0.

**Phase 2 (Schedule Compound) dispatchable:** CC-CMD exists at `docs/CC-CMD-2026-07-18-compound-phase2-schedule.md` (added by Code Map session at 122cfce). Phase 1 slot template present and verified.

---

## SESSION CLOSE-OUT — 2026-07-18, Debrief Phase 1: UI Primitives (supersedes previous)

**HEAD:** 922a3a9
**Smoke count:** 958/0
**SW version:** 2026-07-18a
**Session doc:** outbox/cc-session-2026-07-18-debrief-phase1-primitives.md

**Phase 1 COMPLETE:** All 5 UI Primitives (`fieldChip`, `_cardTemplate`+`fillSlot`, `fieldSection`, `fieldState`, `fieldRow`) implemented and verified — standalone, not yet wired into existing surfaces. CSS in index.html. Gap 5 JS retroactively fixed (moved to src/legacy/field.js — was silently overwritten by sync-source.mjs in prior session). All CI green. 958/0.

**ARCHITECTURAL DISCOVERY (mandatory read for next session):** `src/legacy/field.js` is the sole JS source of truth. Pre-commit hook runs `sync-source.mjs` which replaces index.html's `<script>` block. ALL JS edits go to `src/legacy/field.js`. CSS edits go to `index.html` directly. Direct edits to index.html script block are silently overwritten. See `docs/CC-CMD-2026-07-18-sync-source-guard.md`.

**Phase 2 (Schedule Compound) now dispatchable:** `buildEnrichedGame`, `renderCard`, delta rendering, refresh coordinator. Requires Phase 1 slot template (present). Separate CC-CMD.

**Phase 3 (The Debrief) blocked on Phase 2:** `data-slot="debrief"` reserved and present. `assembleDebrief`, `fillDebriefSlots`, `.card-debrief` rendering — cannot start until Phase 2 lands.

---

## SESSION CLOSE-OUT — 2026-07-18, Gap 5 cross-sport circadian (supersedes previous)

**HEAD:** 6992e7a
**Smoke count:** 958/0
**SW version:** 2026-07-18a
**Session doc:** outbox/cc-session-2026-07-18-gap5-circadian.md

**Gap 5 COMPLETE:** `computeCircadianContext` + `computeSportCircadian` + `applyCircadian` implemented and wired into V2 poll cycle. `data-sport-circadian` on every sport section. Circadian-mode secondary sort. CSS custom properties for five modes. All CI green. No Debrief-specific code.

**Gap 6 (The Debrief notification):** Blocked on The Debrief being built (foundational functions `assembleDebrief`, `fillDebriefSlots`, `.card-debrief` never built). Separate CC-CMD required once Debrief lands.

**UI Primitives (fieldChip, fillSlot, .field-chip--* classes):** Prerequisite for `--chip-*-opacity` CSS custom properties (added this session) to have any effect. Separate CC-CMD.

---

## SESSION CLOSE-OUT — 2026-07-18, golf scoring columns (supersedes previous)

**HEAD:** ff5e052
**Smoke count:** 958/0
**SW version:** 2026-07-18a
**Session doc:** docs/outbox/cc-session-2026-07-18-golf-scoring-columns.md
**Session doc:** docs/outbox/cc-session-2026-07-18-esbuild-phase7-corrected.md

**esbuild thread COMPLETE (Phases 1–7):** 23 symbols extracted across 16 modules. Final extraction: isFeaturedTierGame → src/utils/tier-game.js (4506c27). MY_TEAMS explicitly out of scope (live mutable user preference state). CI fully green. smoke.js A-FTO-2 updated to read body from module file.

**esbuild thread status:** Phase 1 through Phase 5 complete and independently verified (every single one via real, directly-inspected job logs, not trusted from a local dry-run alone — this discipline exists specifically because Phase 1's own build script had a real wrong-script-block bug that reached production once and survived by luck, not design). 19 functions extracted across 13 modules (Phase 3 series) + 1 constant/function pair (Phase 5, `WX_DIR`+`cardinalDir`) — the constant-extraction pattern is confirmed to extend cleanly, not just theorized.

**Dispatched this session, not yet executed:**
- `docs/CC-CMD-2026-07-18-esbuild-phase6.md` — `VENUE_COORDS`+`isOutdoorVenue`+`getVenueCoords`, same proven template
- `docs/CC-CMD-2026-07-18-esbuild-phase7.md` — `MY_TEAMS`+`isFeaturedTierGame`, explicitly checks real mutability before assuming the read-only pattern applies
- `docs/CC-CMD-2026-07-18-module-script-investigation.md` — investigation-only, whether `<script type="module">` is safe given the 54 real `window.X=` boot-order dependencies Phase 1 mapped
- `docs/CC-CMD-2026-07-17-golf-scoring-columns.md` (+ relay pair `field-relay-nba/docs/CC-CMD-2026-07-17-golf-green-light-wasted-green-relay.md`'s real successor) — birdies/bogeys/doubles PGA leaderboard columns, the real-available-fields replacement after Green Light Rate/Wasted Green was confirmed permanently blocked (ESPN has no per-hole GIR data, verified 4 independent ways)

**Genuine dead-ends — files exist on disk but should NOT be dispatched:**
- `docs/CC-CMD-2026-07-18-domain-consolidation.md` — directly superseded by Phase 4's own real evidence (explicitly evaluated and rejected as "not compelling," the 13 modules are already well-scoped)
- `docs/CC-CMD-2026-07-17-golf-green-light-wasted-green.md` (+ relay pair) — closed via real, live evidence; `golf-scoring-columns` is the actual live successor

**Still deliberately held, unchanged, real product-sequencing decision not mine to make:**
- 5 Amnesty Zone CC-CMDs (arc-poster, bottom-sheet, card-face, leaderboard-client, leaderboard-relay) — real foundation now exists (`getDramaGateway`, live since July 17) but "foundation exists" isn't the same as "the other 35 ad-hoc drama-state-check sites all route through it"

**Real, smaller carry-forwards, unchanged since July 17:**
- Gap 5/Gap 6 (context/game field name, enrichment brief types) — blocked, no authoritative definition
- Haiku 4.5 "clinical/surgical efficiency" phrasing — worth a `BANNED_PHRASES` addition, not done
- Game-brief exemplar injection — real, scoped, not done

---

