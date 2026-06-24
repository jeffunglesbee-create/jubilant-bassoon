# CC-CMD: Bracket Client — Named States + TRAP Chip + Elimination Traps
**Date:** 2026-06-24  
**Repo:** jubilant-bassoon  
**Rule 87:** Self-completing. All probes, edits, smoke, and outbox manifest run inside this session.

---

## CONTEXT

Three relay features shipped but have no client-side surface:
1. Named advancement states (THROUGH/STRONG/ALIVE/DANGER/LIFE SUPPORT/ELIMINATED)
   — projections table shows raw percentages instead
2. TRAP chip on game cards — games involving path-trapped teams look identical to others
3. Elimination trap display — `/wc/elimination-traps` endpoint is live, never fetched

Debrief `buildBracketImpact` is deliberately out of scope — relay carry-forward
(bracket_snapshots `triggered_by` wiring) is not complete. Do not attempt.

---

## PROBE BLOCK — read before writing anything

1. Grep `index.html` for `advancementState` — confirm it does NOT exist yet.

2. Read the projections table render block (search for `wc-proj-table`). Confirm:
   - Table columns: Team | Grp | R32 | R16 | QF | SF | Final | Win
   - `cls(v)` currently maps: ≥0.5 → 'hi', ≥0.15 → 'mid', else 'lo'
   - `pct(v)` = `Math.round(v * 100)`
   - Each cell: `<span class="wc-proj-pct ${cls(t.pR32)}">${pct(t.pR32)}%</span>`

3. Read `buildWCMediaCards()` (search for that function name). Confirm:
   - Cards push an object with: `show`, `network`, `chip`, `time`, `desc`, `link`,
     `journalNote`, `_gameId`, `_scoutPick`
   - No `_trapTeams` or trap field exists yet on the card object

4. Read `renderWCTournamentBracket()` fetch block. Confirm it fetches:
   - `/wc/projections`, `/wc/movers`, `/wc/brief/tournament`, `/wc/traps`
   - Does NOT currently fetch `/wc/elimination-traps`

5. Confirm highest smoke assertion number (tail smoke.js, last assert line).
   New assertions start at that number + 1.

6. Confirm `V2_RELAY_BASE` is the correct relay base variable name in this file.

---

## TASK 1 — `advancementState()` helper function

Add this function near the top of the WC section of `index.html`, before
`renderWCTournamentBracket`. Search for `async function renderWCTournamentBracket`
and insert immediately before it:

```javascript
// advancementState — maps pR32 probability to named advancement state.
// Live DOM: named label only. Debrief DOM (game final): label + pct.
// Thresholds match relay's advancementState in context-assembler.js.
function advancementState(prob) {
  if (prob <= 0)    return { label: 'ELIMINATED',   cls: 'state-elim' };
  if (prob < 0.15)  return { label: 'LIFE SUPPORT', cls: 'state-danger' };
  if (prob < 0.40)  return { label: 'DANGER',       cls: 'state-caution' };
  if (prob < 0.70)  return { label: 'ALIVE',        cls: 'state-info' };
  if (prob < 0.90)  return { label: 'STRONG',       cls: 'state-watch' };
  return                   { label: 'THROUGH',      cls: 'state-through' };
}
```

---

## TASK 2 — Named states in the projections table

### 2a. Replace the `cls` helper inside `renderWCTournamentBracket`

Find this exact block inside `renderWCTournamentBracket`:

```javascript
      const pct = v => Math.round(v * 100);
      const cls = v => v >= 0.5 ? 'hi' : v >= 0.15 ? 'mid' : 'lo';
```

Replace with:

```javascript
      const pct = v => Math.round(v * 100);
      const cls = v => v >= 0.5 ? 'hi' : v >= 0.15 ? 'mid' : 'lo';
      const stateLabel = v => advancementState(v).label;
      const stateCls   = v => advancementState(v).cls;
```

### 2b. Replace the R32 column cell only

The R32 column is the advancement gate — it's the most meaningful state to name.
R16–Win remain as percentages (they're conditional probabilities, less meaningful
as named states). Find the `<td>` for R32 inside the teams loop:

```javascript
          <td><span class="wc-proj-pct ${cls(t.pR32)}">${pct(t.pR32)}%</span></td>
```

Replace with:

```javascript
          <td><span class="wc-proj-state ${stateCls(t.pR32)}" title="${pct(t.pR32)}%">${stateLabel(t.pR32)}</span></td>
```

All other columns (R16 through Win) keep the `wc-proj-pct` percentage display unchanged.

### 2c. Add CSS for named state spans

Find `.wc-proj-pct{font-family:var(--ff-cond,'monospace');font-size:.62rem}` in the CSS block.
Add immediately after:

```css
.wc-proj-state{font-family:var(--ff-cond,'monospace');font-size:.56rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap}
.state-through{color:#4ade80}
.state-watch{color:var(--gold)}
.state-info{color:var(--platinum)}
.state-caution{color:#f97316}
.state-danger{color:#ef4444}
.state-elim{color:var(--smoke);text-decoration:line-through}
```

**Verification:** After edit, `node --check index.html` passes. Search for
`wc-proj-state` — must appear in both CSS and the table cell template.

---

## TASK 3 — TRAP chip on WC game cards

### 3a. Fetch `/wc/traps` once at schedule render time

The path trap data is already available in `renderWCTournamentBracket`, but that
only runs when the user opens the WC bracket tab. The game cards on the main
schedule need trap data too.

Find `_fetchWCTournBriefForSchedule` (the async function that fetches and injects
the tournament brief into schedule cards). It already uses `Promise.all`. Add a
window-scoped cache for trap data.

Search for this declaration near `_fetchWCTournBriefForSchedule`:

```javascript
let _wcTournBriefFetched = false;
```

Add immediately after it:

```javascript
let _wcPathTraps = null; // cached bracketTraps array for TRAP chip on game cards
```

Inside `_fetchWCTournBriefForSchedule`, find the `Promise.all` call and add
`/wc/traps` to the fetch list. After the Promise.all resolves, add:

```javascript
  // Cache path traps for game card TRAP chip
  const trapsResult = /* the resolved traps fetch */;
  if (trapsResult?.bracketTraps?.length) {
    _wcPathTraps = trapsResult.bracketTraps;
  }
```

Adapt to the exact Promise.all structure CC finds — do not guess the variable names,
read the actual resolved values.

### 3b. Add `_trapTeams` field to `buildWCMediaCards` cards

Find the `cards.push({...})` block inside `buildWCMediaCards`. The object currently
has `show`, `network`, `chip`, `time`, `desc`, `link`, `journalNote`, `_gameId`,
`_scoutPick`. Add `_trapTeams` by checking `_wcPathTraps` at card-build time:

```javascript
      // Trap teams: which path-trapped team(s) are playing in this game?
      const _trapTeams = (_wcPathTraps || [])
        .filter(t => t.team === game.home || t.team === game.away ||
                     t.fifaCode === game.home || t.fifaCode === game.away)
        .map(t => ({ team: t.team, delta: t.delta }));
```

Add `_trapTeams` to the card push object.

### 3c. Render the TRAP chip inside the card

Find where WC cards are rendered to HTML (search for where `card._scoutPick` is
checked and a scout chip is added, or where `card.journalNote` is rendered).
After the journalNote/scout rendering, add:

```javascript
      // TRAP chip — game involves a path-trapped team
      if (card._trapTeams?.length) {
        for (const tr of card._trapTeams) {
          const dp = Math.round(tr.delta * 100);
          el.insertAdjacentHTML('beforeend',
            `<div class="wc-trap-chip">⚠ TRAP · ${tr.team} +${dp}pp as runner-up</div>`
          );
        }
      }
```

### 3d. Add CSS for the trap chip

Find `.wc-trap-row{` CSS block. Add immediately after the last `.wc-trap-*` rule:

```css
.wc-trap-chip{font-size:.58rem;font-weight:700;color:var(--gold);background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.25);border-radius:4px;padding:.18rem .4rem;margin-top:.3rem;display:inline-block;letter-spacing:.03em}
```

**Verification:** grep `wc-trap-chip` — must appear in CSS and in the render block.

---

## TASK 4 — Elimination trap section in WC bracket tab

### 4a. Add `/wc/elimination-traps` to the `renderWCTournamentBracket` fetch list

Find the `Promise.allSettled` call that fetches `/wc/projections`, `/wc/movers`,
`/wc/brief/tournament`, `/wc/traps`. Add `/wc/elimination-traps` as a fifth fetch:

```javascript
      fetch(`${RELAY}/wc/elimination-traps`, { cache: 'no-store' }),
```

Destructure the result as `elimTrapsRes` and parse:

```javascript
    const elimTrapsData = elimTrapsRes?.status === 'fulfilled' && elimTrapsRes.value.ok
      ? await elimTrapsRes.value.json() : null;
```

### 4b. Render elimination traps section

Find the closing of the path traps section (the `html += '</div>'` that ends the
`wc-traps` block). After it, add:

```javascript
      // Elimination traps — idle teams at risk from today's other games
      const elimTraps = elimTrapsData?.traps || [];
      if (elimTraps.length) {
        html += `<div class="wc-traps"><div class="wc-traps-head">🚨 Elimination Risk — at risk from today's other games</div>`;
        for (const t of elimTraps) {
          html += `<div class="wc-trap-row">
            <span class="wc-trap-team">${t.team}</span>
            <span class="wc-trap-grp">Grp ${t.group}</span>
            <span class="wc-trap-stat"><strong>${t.type === 'ELIMINATION_TRAP' ? 'ELIMINATION' : 'DANGER'}</strong></span>
            <span class="wc-trap-delta" style="color:${t.type === 'ELIMINATION_TRAP' ? '#ef4444' : '#f97316'}">${t.type === 'ELIMINATION_TRAP' ? '☠' : '⚠'}</span>
          </div>`;
        }
        html += `</div>`;
      }
```

If `elimTrapsData?.traps` is empty (as it is today — no teams crossing threshold),
the section simply doesn't render. Correct behavior.

---

## TASK 5 — Smoke assertions

Add after the last existing assertion (A715 or whatever CC confirms as highest).
Use consecutive numbers:

```javascript
assert('A[N+1] — WC named states: advancementState() defined',
  html.includes('function advancementState(prob)'),
  'advancementState helper must be defined');

assert('A[N+2] — WC named states: wc-proj-state CSS class defined',
  html.includes('.wc-proj-state{'),
  'wc-proj-state CSS must be present');

assert('A[N+3] — WC named states: R32 column uses stateLabel not pct',
  html.includes('wc-proj-state') && html.includes('stateLabel(t.pR32)'),
  'R32 column must use stateLabel not raw pct');

assert('A[N+4] — WC TRAP chip: wc-trap-chip CSS defined',
  html.includes('.wc-trap-chip{'),
  'wc-trap-chip CSS must be present');

assert('A[N+5] — WC elimination traps: /wc/elimination-traps fetched in renderWCTournamentBracket',
  html.includes('/wc/elimination-traps'),
  'renderWCTournamentBracket must fetch /wc/elimination-traps');
```

---

## TASK 6 — Smoke + SW_VERSION + commit + push

1. `node smoke.js` — must pass 0 failures. Fix any failures before proceeding.
2. Bump SW_VERSION in `index.html` and `sw.js` (find current value, increment letter).
3. Commit:
   ```
   feat: bracket client — named states, TRAP chip, elimination traps display
   
   - advancementState() helper: THROUGH/STRONG/ALIVE/DANGER/LIFE SUPPORT/ELIMINATED
   - Projections table R32 column: named state label + color tier (pct on hover)
   - TRAP chip on WC game cards: fires when path-trapped team is playing
   - /wc/elimination-traps fetched in renderWCTournamentBracket; section renders
     when elimination-risk teams exist (correctly silent today)
   - Smoke A[N+1]–A[N+5]
   ```
4. Push to main.

---

## TASK 7 — Outbox manifest

Write `outbox/cc-bracket-client-2026-06-24.md` with:
- Tasks completed (list with ✓)
- `advancementState` thresholds (copy the 6 tiers)
- Smoke count before and after
- SW_VERSION old → new
- Commit hash
- What a user sees now that they didn't before:
  - R32 column shows THROUGH/STRONG/ALIVE etc instead of "100%"/"87%"
  - TRAP chip on game cards when a path-trapped team is playing
  - Elimination trap section in bracket tab (silent today, fires on knife-edge days)

Commit with `[skip ci]` and push.

---

## DONE CONDITIONS

- [ ] `function advancementState(prob)` present in index.html
- [ ] `.wc-proj-state{` CSS present
- [ ] R32 column uses `stateLabel(t.pR32)` not `pct(t.pR32)%`
- [ ] `.wc-trap-chip{` CSS present
- [ ] `_wcPathTraps` cache variable declared
- [ ] `/wc/elimination-traps` in renderWCTournamentBracket fetch list
- [ ] Smoke passes 0 failures
- [ ] SW_VERSION bumped in both files
- [ ] Commit pushed to main
- [ ] Outbox manifest committed [skip ci]
