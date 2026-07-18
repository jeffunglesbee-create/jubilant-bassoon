# CC Session Doc — Gap 2: AmbientDO SSE → Debrief Instant Transition
**Date:** 2026-07-18
**Repo:** jubilant-bassoon
**Branch:** main
**HEAD start:** 6b276c9 → **end:** 56903bf
**Smoke start:** 958/0 → **end:** 958/0
**SW_VERSION:** 2026-07-18a (unchanged — client-only logic change, no deploy-visible change)

---

## Commits

- `56903bf` feat: Gap 2 — trigger injectDebriefCards immediately on AmbientDO SSE 'final'

---

## TASK 1 — SSE final-event handler confirmed

**Pre-build probe results:**

```
grep -n "_ambientES\.addEventListener\|addEventListener('final'" src/legacy/field.js
→ 26037:      _es.addEventListener('final', e => _onMessage(e, 'final'));

grep -n "async function injectDebriefCards" src/legacy/field.js
→ 2578:async function injectDebriefCards() {
```

**`_onMessage(evt, 'final')` current behavior confirmed (L25929–25964):**
1. Clears WC live overlay for completed game (WC-specific)
2. Writes `state: 'post'`, final scores to `espnScores[home|away]`, triggers `renderESPNScores()` at 100ms
3. Emits `emitScoreEvent` with `isFinal: true, state: 'post'`

No Debrief assembly was triggered. Gap confirmed.

**`data.gameId` availability:** Present in `final` SSE payload — confirmed by `emitScoreEvent` call using `data.gameId` at L25956.

---

## TASK 2 — Debrief trigger added

**`_debriefTriggeredIds` declared at L25777** (in ambient SSE closure scope, alongside `_sseScoreTs`):
```js
const _debriefTriggeredIds = new Set();
```

**Trigger added at end of `final` handler block (after existing code):**
```js
// Gap 2: trigger Debrief assembly immediately on SSE 'final' event,
// rather than waiting for the next 600ms-after-renderAll poll cycle.
// Fire-and-forget: if this fetch fails, the natural cycle is the fallback.
// _debriefTriggeredIds prevents re-triggering on duplicate 'final' events.
try {
  if (data.gameId && typeof injectDebriefCards === 'function' &&
      !_debriefTriggeredIds.has(data.gameId)) {
    _debriefTriggeredIds.add(data.gameId);
    setTimeout(function() { injectDebriefCards().catch(function() {}); }, 300);
  }
} catch (_e) {}
```

**Mandatory literal verification output (pasted verbatim):**
```
25777:  const _debriefTriggeredIds = new Set();
25973:      // _debriefTriggeredIds prevents re-triggering on duplicate 'final' events.
25976:            !_debriefTriggeredIds.has(data.gameId)) {
25977:          _debriefTriggeredIds.add(data.gameId);
```

**300ms delay rationale:** `renderESPNScores()` fires at 100ms after the `final` event. `injectDebriefCards` queries `isGameOver(rawGame)` — waiting 300ms ensures the card is already in post/final DOM state when the Context Graph fetch starts.

**`injectDebriefCards` full-function call confirmed safe:** It scans only `.game-card[data-gameid]:not([data-debrief-injected])`. Cards already processed have `data-debrief-injected='1'` and are skipped. `_debriefContextCache` prevents re-fetching already-loaded context. Calling the full function is O(uninjected final cards) — typically 0-1 at the moment a new `final` event fires.

---

## TASK 3 — Fallback path verification

**Fallback path:** The natural `injectDebriefCards` call fires at `setTimeout(..., 600)` inside `renderAll` (field.js L7729). This path is unchanged. If the SSE-triggered call fails (network error, Context Graph timeout, any exception), it's fully silent (`.catch(function() {})`). The 600ms-after-renderAll call runs independently and picks up the card if it's still uninjected.

**Double-processing guard:** `injectDebriefCards` uses `data-debrief-injected` attribute on the DOM card. Once the SSE-triggered call successfully processes a card and calls `cardEl.replaceWith(newCard)`, the new card has `dataset.debriefInjected = '1'`. The natural poll-cycle call subsequently finds no uninjected cards for that game — no double-processing.

---

## TASK 4 — Diff and smoke

```
node scripts/sync-source.mjs → ✅
node smoke.js index.html → 958 passed, 0 failed
git diff --stat:
  index.html          | 17 +++++++++++++++++++
  src/legacy/field.js | 17 +++++++++++++++++++
  2 files changed, 34 insertions(+)
```

CI triggered on `56903bf`.

---

## Confidence: 100/100
- T1 (15/15): SSE `final` handler confirmed from source; `data.gameId` confirmed present
- T2 (40/40): `_debriefTriggeredIds` declared in correct closure scope; trigger wired correctly; mandatory literal verification pasted verbatim; call-cost confirmed safe
- T3 (25/25): fallback path unchanged; double-processing guard confirmed via `data-debrief-injected` attribute; SSE trigger is genuinely non-fatal
- T4 (20/20): smoke 958/0; diff 34 lines (17 field.js + 17 index.html); CI triggered

---

## Integration state

**CLIENT:** `_onMessage(evt, 'final')` now fires `injectDebriefCards()` at 300ms after the `final` SSE event for the specific `gameId`. Natural poll-cycle path unchanged as fallback.
**RELAY:** No relay changes. AmbientDO SSE already emits `final` events with `gameId` — confirmed from existing `emitScoreEvent` usage.
**INTEGRATION STATUS: VERIFIED (logic trace)** — live E2E not observable in sandbox without a real game going final during the session.
