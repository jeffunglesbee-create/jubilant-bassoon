# CC-CMD: Card brief line + live card line
**Date:** 2026-06-27
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main
**SW_VERSION:** bump once at end (single bump for all tasks)

---

## CONTEXT

`_gameBriefCache` already exists as a module-scope object, already populated
by fetchGameBriefOnDemand / compound editorial / MLB / WNBA brief functions.
`.card-stage-content` CSS already exists (L1197, font-size:.62rem, dim color).
The card template at L37622 reads `game.matchupNote` for post/final cards
but does NOT read `_gameBriefCache`. `fetchGameBriefOnDemand.then()` updates
the bottom sheet DOM but does NOT call scheduleRenderAll(), so the card face
never reflects the brief.

This CC-CMD adds three things:
1. `buildLiveCardLine(game, eData)` — pure synchronous template for live cards
2. Wire `_gameBriefCache` into the card template (post/final: brief before
   matchupNote; live: buildLiveCardLine output)
3. Page-load batch pre-population of `_gameBriefCache` from relay's new
   /journalism/game-lines endpoint, followed by scheduleRenderAll()
   Also: scheduleRenderAll() in fetchGameBriefOnDemand.then() so card
   updates immediately when brief resolves.

---

## PROBE BLOCK (Rule 68 — run before any edits)

```bash
# P1 — _gameBriefCache declaration line
grep -n '_gameBriefCache\s*=' index.html | grep -v '//' | head -5
# Expected: module-scope let/const declaration found (not inside a function)

# P2 — Card template matchupNote render — exact line
grep -n 'game\.matchupNote\|matchupNote' index.html | grep -v '//' | head -10
# Expected: L37622 area — matchupNote inside card-stage-content case 'post'/'final'

# P3 — card-stage-content CSS exists
grep -n 'card-stage-content' index.html | grep 'font-size' | head -3
# Expected: .card-stage-content{... font-size:.62rem ...} at L1197

# P4 — fetchGameBriefOnDemand.then() — no scheduleRenderAll inside
grep -n 'fetchGameBriefOnDemand' index.html | head -10
# Then read the .then() block:
sed -n '38356,38368p' index.html
# Expected: updates #bs-brief-pending DOM only, no scheduleRenderAll call

# P5 — _sseScoreTs structure (typed events)
sed -n '26798,26815p' index.html
# Expected: Map<gameId, Array<{type, ts, data?}>>

# P6 — buildLiveCardLine does NOT exist yet
grep -n 'buildLiveCardLine' index.html
# Expected: zero matches

# P7 — V2_RELAY_BASE constant (for game-lines fetch)
grep -n 'V2_RELAY_BASE' index.html | head -5
# Expected: constant defined, used in fetch calls

# P8 — scheduleRenderAll definition (confirm debounced)
sed -n '10062,10067p' index.html
# Expected: 150ms debounce via _renderAllPending

# P9 — smoke baseline
node smoke.js index.html
# Expected: N passed, 0 failed

# P10 — node --check inline script (baseline)
node --check index.html 2>/dev/null || echo "no inline check needed"
```

If any probe contradicts assumptions, STOP and document. Do not proceed.

---

## TASK 1 — buildLiveCardLine(game, eData)

Find: the `_gameBriefCache` declaration (from P1 above).
Insert AFTER it (or near the card rendering helpers — after buildMatchupNote
if that function exists, otherwise near the card template functions).

```javascript
// buildLiveCardLine — pure synchronous template for live game cards.
// Returns a factual one-liner from espnScores + _sseScoreTs Maps.
// No AI call. No drama math. RUWT-clean: named binary facts only.
// Priority in card: _gameBriefCache (post-game AI brief) beats this.
function buildLiveCardLine(game, eData) {
  if (!eData || eData.state !== 'in') return '';
  const hs = eData.home_score ?? 0;
  const as = eData.away_score ?? 0;
  const score = `${as}\u2013${hs}`;     // away–home (card shows away @ home)
  const clock = eData.clock ? ` ${eData.clock}'` : '';
  const gameId = game._id || game.id || '';
  const events = (typeof _sseScoreTs !== 'undefined'
    ? (_sseScoreTs.get(gameId) || [])
    : []);
  // Last two score events — show scorer names if data available
  const scorers = events
    .filter(e => e.type === 'score' || e.type === 'lead_change')
    .slice(-2)
    .map(e => e.data?.scorer || e.data?.player || '')
    .filter(Boolean);
  const redCards = events.filter(e => e.type === 'red_card').length;
  let line = `${score}${clock}`;
  if (scorers.length) line += ` \u2014 ${scorers.join(', ')}`;
  if (redCards) line += ` \xb7 ${redCards} red${redCards > 1 ? 's' : ''}`;
  return line;
}
```

---

## TASK 2 — Wire into card template

Find the exact string that renders `matchupNote` in the post/final card stage
(from P2 probe — around L37622). The function returns a `card-stage-content`
div. Read 20 lines around that area to understand the full case block.

**For the post/final case:** prepend `_gameBriefCache` read before matchupNote:

Find the `case 'post':` / `case 'final':` block. Near the top of it, before
`parts` is built, insert:

```javascript
// Card brief line: AI brief (first sentence) beats matchupNote when available
const _cardBrief = (typeof _gameBriefCache !== 'undefined' && game._id)
  ? (_gameBriefCache[game._id] || '')
  : '';
if (_cardBrief) {
  const _firstSentence = _cardBrief.split(/\.\s+/)[0].trim();
  parts.push(_firstSentence.endsWith('.') ? _firstSentence : _firstSentence + '.');
}
```

Then in the matchupNote block (around L37622), wrap the existing push inside
`if (!_cardBrief)` so matchupNote only shows when no brief is cached:

```javascript
if (!_cardBrief && game.matchupNote) {
  // existing matchupNote truncation + push logic unchanged
  ...
}
```

**For the live case (case 'in' or equivalent):** Find the live card stage
case. Insert before the return:

```javascript
const _liveLine = buildLiveCardLine(game, eData);
if (_liveLine) return `<div class="card-stage-content">${_liveLine}</div>`;
```

Where `eData` is the ESPN live state for this game. Identify the exact
variable name used for live state in the card stage function from the probes —
it may be `eData`, `liveData`, `espnGame`, or similar. DO NOT ASSUME the
variable name — read the function signature from the code.

---

## TASK 3 — Page-load batch pre-population

Find: the initialization block that fires after the schedule first renders.
A good anchor: the `setTimeout` that calls `initFIELDBrief` (around L10593)
or the post-renderAll callback. Insert AFTER the existing brief init, inside
the same callback scope.

```javascript
// Pre-populate _gameBriefCache from relay batch endpoint.
// Fires once per page session, ~100ms after first render settles.
// If relay returns 0 lines (cold cache / off-hours), no-ops cleanly.
(async () => {
  try {
    const _glBase = (typeof V2_RELAY_BASE !== 'undefined')
      ? V2_RELAY_BASE
      : 'https://field-relay-nba.jeffunglesbee.workers.dev';
    const _glResp = await fetch(`${_glBase}/journalism/game-lines`, { cache: 'no-store' });
    if (!_glResp.ok) return;
    const _glData = await _glResp.json();
    if (!_glData?.lines || !Object.keys(_glData.lines).length) return;
    // Match relay espnEventId to game._id / _espnId in the active game list
    let _glUpdated = 0;
    (typeof allData !== 'undefined' ? allData.sports || [] : [])
      .flatMap(sec => sec.games || [])
      .forEach(g => {
        const eid = g._espnId || g.espnEventId || '';
        if (!eid || !_glData.lines[eid]) return;
        if (_gameBriefCache[g._id]) return; // already populated — don't overwrite
        _gameBriefCache[g._id] = _glData.lines[eid];
        _glUpdated++;
      });
    if (_glUpdated > 0) scheduleRenderAll();
  } catch (_) {}
})();
```

Confirm `allData` is the variable holding the full schedule data in this scope.
If it has a different name, use the correct one. DO NOT ASSUME — grep for it.

---

## TASK 4 — scheduleRenderAll after fetchGameBriefOnDemand resolves

Find: the `.then(text =>` block of `fetchGameBriefOnDemand` around L38358.
Probe confirms it updates `#bs-brief-pending` only. Add `scheduleRenderAll()`
after the bottom sheet update so the card face also reflects the new brief:

```javascript
fetchGameBriefOnDemand(game, sport).then(text => {
  const placeholder = document.getElementById('bs-brief-pending');
  if (!placeholder || !text) { placeholder?.remove(); return; }
  placeholder.querySelector('.bs-section-body').textContent = text;
  placeholder.querySelector('.bs-section-body').style.cssText = 'font-size:.74rem;line-height:1.6';
  placeholder.id = '';
  scheduleRenderAll(); // ← ADD: update card face with brief line
}).catch(() => {
  document.getElementById('bs-brief-pending')?.remove();
});
```

---

## TASK 5 — Smoke assertions + SW bump

Add to smoke.js:

```javascript
assert('A_CARD_BRIEF_LINE_1 — buildLiveCardLine defined',
  html.includes('function buildLiveCardLine('));

assert('A_CARD_BRIEF_LINE_2 — _gameBriefCache read in card template',
  html.includes('_cardBrief') && html.includes('_firstSentence'));

assert('A_CARD_BRIEF_LINE_3 — game-lines batch pre-population present',
  html.includes('/journalism/game-lines'));

assert('A_CARD_BRIEF_LINE_4 — scheduleRenderAll in fetchGameBriefOnDemand.then',
  (() => {
    const idx = html.indexOf('fetchGameBriefOnDemand(game, sport).then');
    if (idx < 0) return false;
    const block = html.slice(idx, idx + 400);
    return block.includes('scheduleRenderAll');
  })());
```

Bump SW_VERSION in both index.html and sw.js.
Run `node smoke.js index.html` — must pass all assertions including A_CARD_BRIEF_LINE_1–4.

---

## TASK 6 — Commit + push

```bash
git add index.html sw.js smoke.js
git commit -m "feat(card): inline brief line + live card line — _gameBriefCache on card, buildLiveCardLine, game-lines pre-pop"
git push origin main
```

CI deploys automatically (no [skip ci]).
Poll deploy status. Verify smoke green in CI output.

---

## DONE CONDITIONS

- [ ] P1–P10 probes all pass before any edit
- [ ] `buildLiveCardLine` defined, returns '' when eData.state !== 'in'
- [ ] `_cardBrief` read inserted in post/final card stage — matchupNote
      wrapped in `if (!_cardBrief)` guard
- [ ] Live card line wired in live card stage case
- [ ] Page-load batch fetch present, fires after render, updates
      _gameBriefCache only for uncached games
- [ ] `scheduleRenderAll()` present in fetchGameBriefOnDemand.then()
- [ ] A_CARD_BRIEF_LINE_1–4 smoke assertions added and passing
- [ ] SW_VERSION bumped in index.html and sw.js
- [ ] node smoke.js → N passed, 0 failed
- [ ] CI deploy green
- [ ] Outbox manifest written to docs/outbox/cc-card-brief-line-{date}.md

## WHAT SUCCESS LOOKS LIKE

Post-game card: first sentence of AI brief replaces matchupNote.
Live card: "1–0, 67' — Baena" or "0–0, 45'" depending on event data.
Pre-game card: matchupNote unchanged (no brief cached yet).
On bottom sheet open: brief resolves, card face updates without user
needing to close and re-open.

## COMPLIANCE

- Rule 5: batch fetch in try/catch, errors no-op silently
- Rule 7: single commit covering these four related wires
- Rule 47/ADR-002: buildLiveCardLine uses factual binary conditions
  (scorer name, clock, red card count). No drama scoring, no interest
  level. RUWT clean.
- Rule 68: all ten probes must run and pass before any edit
- Rule 87: done conditions checkable in-session, no carry-forwards
