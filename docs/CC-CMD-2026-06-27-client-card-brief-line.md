# CC-CMD: Card brief line + live card line
**Date:** 2026-06-27
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main
**SW_VERSION:** bump once at end (single bump for all tasks)

---

## CONTEXT

`_gameBriefCache` already exists as a module-scope object (`const
_gameBriefCache = {};`), already populated by fetchGameBriefOnDemand /
compound editorial / MLB / WNBA brief functions. `.card-stage-content` CSS
already exists (L1197, font-size:.62rem, dim color).

CORRECTED 2026-06-30 (original spec's premise was wrong here — verified
against current code before proceeding, not assumed): `game.matchupNote`
is read in `case 'pre':` of the card-stage switch (~L37760-37787), NOT in
a post/final case. There is no `case 'post':` at all — the full case list
is `postponed, pre, soon, live, halftime, final`. `case 'final':`
(~L37864-37886) currently shows ONLY a score+result line (when score data
exists) or a drama-peak emoji/number fallback (when it doesn't) — no
narrative text slot exists there today. `fetchGameBriefOnDemand.then()`
updates the bottom sheet DOM but does NOT call scheduleRenderAll(), so the
card face never reflects the brief.

Design decision (confirmed with Jeff 2026-06-30): the brief renders
ALONGSIDE the existing final-card content, not replacing it — both the
score line (or peak fallback) and the brief sentence render together,
joined with the same ' · ' separator pattern already used elsewhere in
this function (see `case 'pre':`'s `parts.join(' · ')`).

This CC-CMD adds three things:
1. `buildLiveCardLine(game, eData)` — pure synchronous template for live cards
2. Wire `_gameBriefCache` into `case 'final':` — brief sentence joins the
   existing score-line/peak-fallback content via the established `parts`
   array pattern. `case 'pre':`'s matchupNote logic is UNTOUCHED — a
   pre-game card has no post-game brief to show, so there's nothing to
   wire there.
3. Page-load batch pre-population of `_gameBriefCache` from relay's new
   /journalism/game-lines endpoint, followed by scheduleRenderAll()
   Also: scheduleRenderAll() in fetchGameBriefOnDemand.then() so card
   updates immediately when brief resolves.

---

## PROBE BLOCK (Rule 68 — run before any edits)

```bash
# P1 — _gameBriefCache declaration line
grep -n '\(const\|let\|var\) _gameBriefCache' index.html | head -5
# Expected: `const _gameBriefCache = {};`. Do NOT use a `grep -v '//'`
# filter here — the real declaration line has a trailing comment and that
# filter silently drops it, producing a false "not found" (confirmed
# 2026-06-30).

# P2 — Confirm case 'final' current shape (corrected target, not matchupNote)
grep -n "case 'final': {" index.html
# Then read ~25 lines from that match to confirm it still matches the
# CONTEXT section's documented current shape before replacing it.
# P2b — confirm case 'pre' still owns matchupNote (must NOT be touched)
grep -n 'game\.matchupNote' index.html | head -5

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

`eData` is already confirmed (2026-06-30) as the correct live-state
variable name throughout this function — used directly in both `case
'final':` and the live-stage cases. No need to re-derive it.

**`case 'final':`** — read the current implementation first (confirm
against P2/P-final probes below, line numbers drift). Current shape:

```javascript
case 'final': {
  if (!eData) return '';
  if (eData.source === 'squiggle') return '';
  const fh = eData.homeScore ?? null, fa = eData.awayScore ?? null;
  if (fh !== null && fa !== null) {
    const fhN = teamNick(game.home||''), faN = teamNick(game.away||'');
    const fLeader = fh >= fa ? fhN : faN;
    const fTrailer = fh >= fa ? faN : fhN;
    const fLS = fh >= fa ? fh : fa, fTS = fh >= fa ? fa : fh;
    const peak = parseFloat(localStorage.getItem('field_drama_peak_'+(game._id||''))||'0');
    const peakStr = peak >= 65 ? ` ${peak >= 85 ? '🔥' : '⚡'}` : '';
    return `<div class="card-stage-content card-stage-live-basic">${fLeader} ${fLS}–${fTS} ${fTrailer} F${peakStr}</div>`;
  }
  const peak = parseFloat(localStorage.getItem('field_drama_peak_'+(game._id||''))||'0');
  if (peak < 50) return '';
  const peakIcon = peak >= 85 ? '🔥' : peak >= 65 ? '⚡' : '·';
  return `<div class="card-stage-content"><span class="stage-final-score">${peakIcon} ${Math.round(peak)}</span></div>`;
}
```

Replace the whole block with (brief joins existing content via the same
`parts.join(' · ')` pattern `case 'pre':` already uses — does not replace
the score line or peak fallback, renders alongside):

```javascript
case 'final': {
  if (!eData) return '';
  if (eData.source === 'squiggle') return '';
  const _cardBrief = (typeof _gameBriefCache !== 'undefined' && game._id)
    ? (_gameBriefCache[game._id] || '')
    : '';
  let _briefLine = '';
  if (_cardBrief) {
    const _firstSentence = _cardBrief.split(/\.\s+/)[0].trim();
    _briefLine = _firstSentence.endsWith('.') ? _firstSentence : _firstSentence + '.';
  }
  const fh = eData.homeScore ?? null, fa = eData.awayScore ?? null;
  if (fh !== null && fa !== null) {
    const fhN = teamNick(game.home||''), faN = teamNick(game.away||'');
    const fLeader = fh >= fa ? fhN : faN;
    const fTrailer = fh >= fa ? faN : fhN;
    const fLS = fh >= fa ? fh : fa, fTS = fh >= fa ? fa : fh;
    const peak = parseFloat(localStorage.getItem('field_drama_peak_'+(game._id||''))||'0');
    const peakStr = peak >= 65 ? ` ${peak >= 85 ? '🔥' : '⚡'}` : '';
    const parts = [`${fLeader} ${fLS}–${fTS} ${fTrailer} F${peakStr}`];
    if (_briefLine) parts.push(_briefLine);
    return `<div class="card-stage-content card-stage-live-basic">${parts.join(' · ')}</div>`;
  }
  const peak = parseFloat(localStorage.getItem('field_drama_peak_'+(game._id||''))||'0');
  if (peak < 50 && !_briefLine) return '';
  const parts = [];
  if (peak >= 50) {
    const peakIcon = peak >= 85 ? '🔥' : peak >= 65 ? '⚡' : '·';
    parts.push(`<span class="stage-final-score">${peakIcon} ${Math.round(peak)}</span>`);
  }
  if (_briefLine) parts.push(_briefLine);
  return `<div class="card-stage-content">${parts.join(' · ')}</div>`;
}
```

**`case 'pre':` is UNTOUCHED.** Its existing `game.matchupNote` logic
(~L37760-37787) stays exactly as-is — a pre-game card has no post-game
brief to show, so there is nothing to wire there. Do not modify it.

**Live case:** Find the live card stage case (`case 'live':`). Insert
before its return:

```javascript
const _liveLine = buildLiveCardLine(game, eData);
if (_liveLine) return `<div class="card-stage-content">${_liveLine}</div>`;
```

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
- [ ] `_cardBrief` read inserted in `case 'final':`, brief joins the score
      line / peak fallback via `parts.join(' · ')` — does not replace it
- [ ] `case 'pre':`'s matchupNote logic confirmed unchanged
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
