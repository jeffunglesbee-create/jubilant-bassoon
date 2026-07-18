# CC Session Doc — Gap 6: Push Notification → Debrief Link
**Date:** 2026-07-18
**Repos:** jubilant-bassoon (client) + field-relay-nba (relay)
**Branch:** main
**jubilant-bassoon HEAD start:** f4ffa9a → **end:** cab85fb
**field-relay-nba HEAD start:** e1c9441 → **end:** 1b4c6c1
**Smoke start:** 958/0 → **end:** 958/0
**SW_VERSION:** 2026-07-18a (unchanged)

---

## Commits

- `cab85fb` (jubilant-bassoon) feat: Gap 6 client — GAME_FINAL push handler + ?debrief= deep-link scroll
- `1b4c6c1` (field-relay-nba) feat: Gap 6 relay — /push/game-final route + GameDO final-state hook

---

## TASK 1 — Push send path confirmed

**Pre-build probe result:** The Debrief confirmed live (5 matches for `buildDebrief|injectDebriefCards|card-debrief`).

**Existing push send paths found:**
- `handleCron` (every 5 min): sends `SCORE_CHANGE` for live close/late games — no game-final push existed
- `handleTubiPreGameAlerts`: pre-game Tubi alerts only
- **No game-final push notification existed before this session.**

**GameDO final-state hook confirmed at game-do.js L395:**
```js
const isCompleted = s => s === 'final' || s === 'post';
if (isCompleted(facts.state) && !isCompleted(prevState)) {
    // archive → journalism → [GAP 6: push added here]
}
```
No pre-existing drama-score gating in this hook — clean.

---

## TASK 2 — Relay: /push/game-final + handleGameFinalPush

**New function `handleGameFinalPush(env, payload)` in index.js:**
- Lists all PUSH_SUBS subscribers
- Sends `GAME_FINAL` push to each via existing `sendWebPush`
- Payload: `{ type: 'GAME_FINAL', gameId, sport, home, away, homeScore, awayScore, watchUrl: '/?debrief=' + encodeURIComponent(gameId) }`
- **Send trigger: game-final state (objective event) ONLY — no drama score in any conditional**
- ADR-002 compliant: `drama_peak` absent from all send conditions

**New route `POST /push/game-final` in index.js:**
- Calls `handleGameFinalPush`, returns `{ok:true}`
- Added after `/push/unsubscribe` in the route block

**Patent-safety code-level verification:**
```
git diff src/index.js src/game-do.js | grep -E "drama|threshold|score.*>"
```
Output: Only comments stating "NOT gated on drama score" / "drama_peak never influences whether this fires". Zero conditional logic involving drama.

**GameDO wiring (game-do.js):**
Added `/push/game-final` fire-and-forget call alongside existing `/archive/game` and `/journalism/game-complete`. Failure is non-fatal (`.catch(() => {})`).

---

## TASK 3 — Client: service worker click handler

**Assessment:** No changes needed. Existing `notificationclick` handler reads `data.watchUrl`:
```js
const url = e.notification.data?.watchUrl || '/';
```
By setting `watchUrl: '/?debrief=gameId'` in the `GAME_FINAL` notification data, the existing handler navigates to the Debrief URL on click — zero changes to click handler.

---

## TASK 4 — Client: sw.js GAME_FINAL handler + field.js deep-link scroll

**sw.js `GAME_FINAL` handler added:**
```js
if (payload.type === 'GAME_FINAL') {
    const { gameId, sport, home, away, homeScore, awayScore, watchUrl } = payload;
    const scoreStr = (homeScore != null && awayScore != null)
      ? `${away||''} ${awayScore}–${homeScore} ${home||''}`
      : `${away||''} @ ${home||''}`;
    await self.registration.showNotification(`${sport ? sport.toUpperCase() + ' · ' : ''}Final`, {
      body: scoreStr + ' · Tap for Debrief',
      icon: '/icon-192.png', badge: '/icon-192.png',
      tag: `field-final-${gameId}`,
      data: { gameId, watchUrl: watchUrl || '/?debrief=' + encodeURIComponent(gameId), type: 'GAME_FINAL' },
    });
    return;
}
```
Body text varies based on game facts only — never gated on drama score. Patent-safe.

**field.js `?debrief=` param handler (after `goToDate(TODAY_ISO)`):**
```js
(function handleDebriefDeepLink() {
  const _debriefGid = new URLSearchParams(location.search).get('debrief');
  if (!_debriefGid) return;
  setTimeout(() => {
    const card = document.querySelector('.game-card[data-gameid="' + CSS.escape(_debriefGid) + '"]');
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 1500);
})();
```
`injectDebriefCards` already auto-populates `.card-debrief` for all final games at 600ms after `renderAll`. The 1500ms delay reliably fires after injection. No manual trigger needed.

---

## TASK 5 — Verification

**Patent-safety confirmed by direct code inspection:**
- `handleGameFinalPush`: no conditional on `drama_peak` or any drama value
- `POST /push/game-final`: passes `gameId`, `sport`, `home`, `away`, `homeScore`, `awayScore` — no drama value in payload
- GameDO hook: fires on `isCompleted(facts.state)` transition — objective state, not drama
- `handleCron` (existing): unchanged, continues to fire `SCORE_CHANGE` on late/close boolean

**Smoke:** 958/0 maintained

**Integration path (full):**
```
GameDO: game reaches 'final'/'post'
→ fetch /push/game-final (fire-and-forget)
→ handleGameFinalPush: fans out GAME_FINAL to all subscribers
→ SW handlePush: shows Final notification (score + "Tap for Debrief")
→ User taps notification
→ notificationclick: reads data.watchUrl = '/?debrief=MLB_MIL_MIA_20260717'
→ clients.openWindow or field.navigate to URL
→ app loads with ?debrief=MLB_MIL_MIA_20260717
→ handleDebriefDeepLink() fires at 1500ms
→ scrolls .game-card[data-gameid="MLB_MIL_MIA_20260717"] into view
→ injectDebriefCards (at 600ms) has already populated .card-debrief
→ Debrief visible ✓
```

**Live verification:** Cannot observe end-to-end in sandbox without a live game completing. Integration status: **VERIFIED (logic trace)** — confirmed by code inspection and path tracing. Live push not observable without real user subscription and game completion.

---

## Confidence: 97/100
- T1 (20/20): push send path confirmed from source; no pre-existing game-final push; no drama gating in hook
- T2 (25/25): relay payload, route, and GameDO wiring correct; patent-safety verified by direct code inspection (grep output shows only comments, zero conditionals on drama)
- T3 (15/15): notificationclick handler needs no changes — watchUrl approach reuses existing routing
- T4 (15/15): GAME_FINAL SW handler + ?debrief= scroll handler; timing accounts for injectDebriefCards cycle
- T5 (22/25): code-level patent-safety confirmed; live E2E not observable in sandbox (-3 per Rule 61)

---

## Integration state

**RELAY CONTRACT:**
- `POST /push/game-final` — `{sport, gameId, home, away, homeScore, awayScore}` → fans out `GAME_FINAL` push
- No response consumed by GameDO (fire-and-forget)

**CLIENT CONSUMER:**
- `sw.js handlePush` → `GAME_FINAL` type → shows notification, `data.watchUrl = '/?debrief=gameId'`
- `notificationclick` → navigates to `data.watchUrl`
- `field.js handleDebriefDeepLink` → reads `?debrief=` param → scrolls to card

**INTEGRATION STATUS: VERIFIED (logic trace)** — live push not observable without real game completion and active subscription.
