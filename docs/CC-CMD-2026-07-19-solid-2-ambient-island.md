# CC-CMD-2: Ambient Panel Solid Island

**Date:** 2026-07-19
**Scope:** jubilant-bassoon only
**Prerequisite:** CC-CMD-1 complete (solid-js installed, build pipeline active)
**App behavior change:** Ambient panel updates become fine-grained DOM writes instead of innerHTML replacement — scroll position survives poll cycles

## Target Files
- `src/solid/ambient-island.jsx` — new file, Solid component + store
- `src/legacy/field.js` — 8 call site modifications + one boot mount call

## Do NOT Touch
`index.html` CSS/HTML, `sw.js`, any other function

---

## Pre-Build Probe (run FIRST — write code against real output)

```bash
# 1. Confirm renderAmbientPanel location and innerHTML write
grep -n "panel.innerHTML" src/legacy/field.js | head -5
# Expected: line ~32449  panel.innerHTML = _apWrapped

# 2. Confirm all call sites
grep -n "renderAmbientPanel" src/legacy/field.js
# Expected: ~8 call sites

# 3. Confirm panelEl selector used at mount time
grep -n "ambient-panel\|getElementById.*panel" src/legacy/field.js | head -10

# 4. Confirm _apWrapped assembly shape (what rows look like before innerHTML)
sed -n '32400,32455p' src/legacy/field.js
```

---

## Tasks

### T1. Confirm starting state
```bash
git log --oneline -3
node smoke.js index.html 2>&1 | tail -3
```

### T2. Create `src/solid/ambient-island.jsx`
```jsx
import { createStore, reconcile } from 'solid-js/store';
import { render, For } from 'solid-js/web';

const [state, setState] = createStore({ rows: [], lastUpdated: 0 });

function AmbientRow(props) {
  return (
    <div class="ap-row" data-gid={props.row.gid}>
      <span class="ap-sport">{props.row.sport}</span>
      <span class="ap-teams">{props.row.teams}</span>
      <span class="ap-score">{props.row.score}</span>
      <span class="ap-status">{props.row.status}</span>
    </div>
  );
}

function AmbientPanel() {
  return (
    <div class="ap-inner">
      <For each={state.rows} fallback={<div class="ap-empty">No live games</div>}>
        {(row) => <AmbientRow row={row} />}
      </For>
    </div>
  );
}

export function mountAmbientIsland(panelEl) {
  render(() => <AmbientPanel />, panelEl);
}

export function updateAmbientData(rows) {
  setState('rows', reconcile(rows, { key: 'gid', merge: true }));
  setState('lastUpdated', Date.now());
}
```

### T3. Modify `src/legacy/field.js`

**3a.** Add import at top of field.js alongside existing imports:
```javascript
import { mountAmbientIsland, updateAmbientData } from './solid/ambient-island.jsx';
```

**3b.** Find the boot/init call to `renderAmbientPanel()` (first call after DOM ready). Add mount call immediately before it:
```javascript
const _solidPanelEl = document.getElementById('ambient-panel');
if (_solidPanelEl && !_solidPanelEl._solidMounted) {
  mountAmbientIsland(_solidPanelEl);
  _solidPanelEl._solidMounted = true;
}
```

**3c.** At the `panel.innerHTML = _apWrapped` line (confirmed from pre-build probe), replace with reactive update. Exact field names must match what the probe shows in the row assembly above that line:
```javascript
// Replace: panel.innerHTML = _apWrapped;
// With (field names confirmed from probe):
const _solidRows = _gameRows.map(r => ({
  gid: r.gid || r.id || String(r.home + r.away),
  sport: r.sport || '',
  teams: `${r.away} @ ${r.home}`,
  score: r.scoreStr || '',
  status: r.statusStr || ''
}));
updateAmbientData(_solidRows);
```

### T4. Build + smoke
```bash
node scripts/build-bundle.mjs 2>&1
git checkout HEAD -- index.html
node scripts/sync-source.mjs
node smoke.js index.html 2>&1 | tail -3
# Must be 958/0
```

### T5. Browser verification via Playwright
```bash
# Start HTTP server first (required — file:// blocks ES module imports)
cd /home/user/jubilant-bassoon && python3 -m http.server 8732 &
node /tmp/claude-0/-home-user/cdb9888f-e3d8-50d6-821a-f0b47d17aec6/scratchpad/verify-ambient-solid.js
```

Verification script (`scratchpad/verify-ambient-solid.js`):
```javascript
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage();
  await page.goto('http://localhost:8732/index.html');
  await page.waitForTimeout(2000);

  // Verify MutationObserver sees characterData mutations (not childList only)
  const mutationTypes = await page.evaluate(() => new Promise(resolve => {
    const panel = document.getElementById('ambient-panel');
    const types = new Set();
    const obs = new MutationObserver(muts => muts.forEach(m => types.add(m.type)));
    obs.observe(panel, { subtree: true, childList: true, characterData: true });
    setTimeout(() => { obs.disconnect(); resolve([...types]); }, 5000);
  }));
  console.log('mutation types observed:', mutationTypes);
  // Ideal: ['characterData'] only on update cycles.
  // Acceptable: ['characterData', 'childList'] on first mount.
  // Failure: only ['childList'] on every cycle = innerHTML still firing.

  await browser.close();
  console.log('DONE');
})().catch(e => { console.error(e.message); process.exit(1); });
```

### T6. Commit
```bash
git config user.email "noreply@anthropic.com"
git config user.name "Claude"
git add src/solid/ambient-island.jsx src/legacy/field.js index.html
git commit -m "feat: ambient panel Solid island — fine-grained reactive updates replace innerHTML"
git push -u origin main
```

---

## Done Condition
- Smoke 958/0
- MutationObserver shows `characterData` mutations during poll cycles (not `childList` on every update)
- Scroll position in ambient panel survives 3 consecutive poll cycles (no jump to top)
- `git branch --show-current` → `main`

## Integration Status: STAGED
Blocked by: full poll cycle requires deployed relay data (boot ~5s).
Verify when unblocked: open deployed app, scroll ambient panel mid-list, wait 30s, confirm position unchanged.
