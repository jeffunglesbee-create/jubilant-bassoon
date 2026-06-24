# CC-CMD: WC Debrief Renderer — Bracket Impact Card
**Date:** 2026-06-24  
**Repo:** jubilant-bassoon  
**Depends on:** CC-CMD-2026-06-24-bracket-impact-pre-snapshot.md (relay) deployed first.
**Rule 87:** Self-completing.

---

## CONTEXT

When a WC game brief is fetched (in the V2 WC poll loop, ~L17029), it's injected
as `g.matchupNote` and displayed as text in the game card. There is no separate
visual component for the bracket impact data (pChamp deltas, state transitions).

This CC-CMD adds `renderWCBracketImpact(gameId, homeTeam, awayTeam, gameCardEl)` —
a function that fetches `/archive/bracket-replay?triggered_by={key}` and renders
a compact impact table adjacent to the finished game card.

Data shape confirmed via hypothetical test (2026-06-24):
```
Canada:      P(82%) → QUALIFIED  ↑1.3%
Switzerland: P(82%) → QUALIFIED  ↓0.5%
```

The function is called from the existing WC brief fetch block (L17029 area),
fire-and-forget, never blocks the brief display.

---

## PROBE BLOCK

1. Find the WC brief fetch block (~L17029). Read the async IIFE that calls
   `/journalism/game/{gameId}` and sets `g.matchupNote`. Locate the closing
   `scheduleRenderAll()` call — the debrief render goes after it, still inside
   the async IIFE.

2. Confirm `_wcRelayBase` is in scope at that location.

3. Confirm `bracketTriggeredBy` format: `{home}_{away}_{YYYY-MM-DD}` with
   spaces replaced by underscores (matches BracketDO Step 10 key format).

4. Confirm no `.wc-bracket-impact-card` CSS class exists yet.

5. Confirm highest smoke assertion number (tail smoke.js) — currently A734.

---

## TASK 1 — Add `renderWCBracketImpact` function

Add the function near the WC brief fetch block (search for `_wcBriefsFetched`
to find the right area). Place it as a named async function before the poll
loop, not inside it:

```javascript
// renderWCBracketImpact — fetches bracket impact from D1 and renders
// a compact delta table adjacent to a finished WC game card.
// Called fire-and-forget from the V2 WC poll loop after brief is fetched.
// Requires relay CC-CMD-2026-06-24-bracket-impact-pre-snapshot deployed.
async function renderWCBracketImpact(gameId, home, away, relayBase) {
  try {
    const today = new Date().toLocaleDateString('en-CA', {timeZone: 'America/New_York'});
    const key   = `${home}_${away}_${today}`.replace(/\s+/g, '_').slice(0, 120);
    const r = await fetch(
      `${relayBase}/archive/bracket-replay?triggered_by=${encodeURIComponent(key)}`,
      { signal: AbortSignal.timeout(2500) }
    );
    if (!r.ok) return;
    const d = await r.json();
    const rows = d.rows || [];
    if (rows.length < 2) return;  // need pre + post rows

    // Build impact: rows ordered by team, created_at — first = before, second = after
    const byTeam = {};
    for (const row of rows) {
      const t = row.team;
      if (!byTeam[t]) {
        byTeam[t] = { before: row.champion_prob, r32Before: row.r32_prob };
      } else {
        byTeam[t].after    = row.champion_prob;
        byTeam[t].r32After = row.r32_prob;
      }
    }
    const entries = Object.entries(byTeam)
      .filter(([, d]) => d.before != null && d.after != null
                      && Math.abs(d.after - d.before) >= 0.002)
      .map(([team, d]) => {
        const change = Math.round((d.after - d.before) * 1000) / 1000;
        const pct    = Math.round(Math.abs(change) * 100 * 10) / 10;
        const arrow  = change > 0 ? '↑' : '↓';
        const stB    = d.r32Before >= 0.98 ? 'QUALIFIED' : d.r32Before <= 0.02 ? 'ELIMINATED' : `P(${Math.round(d.r32Before*100)}%)`;
        const stA    = d.r32After  >= 0.98 ? 'QUALIFIED' : d.r32After  <= 0.02 ? 'ELIMINATED' : `P(${Math.round(d.r32After *100)}%)`;
        const state  = stB !== stA ? `${stB} → ${stA}` : stA;
        return { team, state, arrow, pct, change };
      })
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
      .slice(0, 5);
    if (!entries.length) return;

    // Find the game card in the DOM
    const gameCard = document.querySelector(`[data-gameid="${CSS.escape(gameId)}"]`);
    if (!gameCard) return;
    if (gameCard.nextElementSibling?.classList.contains('wc-bracket-impact-card')) return;

    const card = document.createElement('div');
    card.className = 'wc-bracket-impact-card';
    card.innerHTML =
      '<div class="wc-impact-label">BRACKET IMPACT</div>'
      + entries.map(e =>
          `<div class="wc-impact-row">`
          + `<span class="wc-impact-team">${e.team}</span>`
          + `<span class="wc-impact-state">${e.state}</span>`
          + `<span class="wc-impact-delta ${e.change > 0 ? 'pos' : 'neg'}">${e.arrow}${e.pct}%</span>`
          + `</div>`
        ).join('');
    gameCard.insertAdjacentElement('afterend', card);
  } catch (_) { /* non-blocking */ }
}
```

---

## TASK 2 — CSS for `.wc-bracket-impact-card`

Add to the CSS section (near other WC styles or near `.sport-game-brief-card`):

```css
.wc-bracket-impact-card {
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.08);
  border-top: none;
  border-radius: 0 0 6px 6px;
  padding: 8px 12px;
  margin-bottom: 8px;
  font-size: 11px;
}
.wc-impact-label {
  font-size: 9px;
  font-weight: 600;
  letter-spacing: .08em;
  opacity: .5;
  text-transform: uppercase;
  margin-bottom: 5px;
}
.wc-impact-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 0;
}
.wc-impact-team  { flex: 0 0 120px; font-weight: 500; }
.wc-impact-state { flex: 1; opacity: .75; }
.wc-impact-delta { font-weight: 600; font-variant-numeric: tabular-nums; }
.wc-impact-delta.pos { color: #4ade80; }
.wc-impact-delta.neg { color: #f87171; }
```

---

## TASK 3 — Call from WC brief fetch block

Find the WC brief fetch async IIFE (~L17029). After `scheduleRenderAll()`, add:

```javascript
              scheduleRenderAll();
              // Render bracket impact debrief card if snapshots exist
              renderWCBracketImpact(gameId, game.home || '', game.away || '', _wcRelayBase)
                .catch(() => {});
```

**Note for CC:** `game` at this location is the `wg` object (WC game from
schedule). Confirm the exact variable name for the game's home/away fields
(`wg.home`, `wg.away`, or `g.home`, `g.away`) by reading the async IIFE context.

---

## TASK 4 — Smoke assertions

```javascript
assert('A735 — WC debrief: renderWCBracketImpact function defined',
  html.includes('async function renderWCBracketImpact('),
  'renderWCBracketImpact must be defined');

assert('A736 — WC debrief: bracket-replay endpoint called with triggered_by key',
  html.includes('/archive/bracket-replay?triggered_by='),
  'debrief renderer must call /archive/bracket-replay');

assert('A737 — WC debrief: CSS class wc-bracket-impact-card present',
  html.includes('.wc-bracket-impact-card'),
  'CSS for debrief card must be present');
```

---

## TASK 5 — Smoke + SW_VERSION + commit

1. `node smoke.js` — 0 failures.
2. Bump SW_VERSION in `index.html` and `sw.js`.
3. Commit:
   ```
   feat: WC bracket impact debrief renderer

   renderWCBracketImpact() — fetches /archive/bracket-replay after a WC
   game brief loads, builds per-team pChamp delta table, inserts as
   .wc-bracket-impact-card immediately after the game card.

   Data shape confirmed via hypothetical test (2026-06-24):
   Canada: P(82%) → QUALIFIED ↑1.3%
   Switzerland: P(82%) → QUALIFIED ↓0.5%

   Fires only when relay CC-CMD-2026-06-24-bracket-impact-pre-snapshot
   is deployed (pre + post snapshots in D1). Graceful no-op otherwise.
   ```
4. Push.

---

## DONE CONDITIONS

- [ ] `async function renderWCBracketImpact(` defined
- [ ] `/archive/bracket-replay?triggered_by=` called inside it
- [ ] `.wc-bracket-impact-card` CSS present
- [ ] Called after `scheduleRenderAll()` in WC brief fetch block
- [ ] A735-A737 smoke pass, 0 failures total
- [ ] SW_VERSION bumped
- [ ] Deploy green
- [ ] Outbox manifest pushed (no [skip ci])
