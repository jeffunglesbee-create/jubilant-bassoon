# CC-CMD-3: Live Score Card Fine-Grained Updates

**Date:** 2026-07-19
**Scope:** jubilant-bassoon only
**Prerequisite:** CC-CMD-1 and CC-CMD-2 complete
**App behavior change:** Score display text nodes updated reactively via signal setters. Card DOM shell remains in vanilla JS.

## Target Files
- `src/solid/score-overlay.jsx` — new file, reactive score component
- `src/legacy/field.js` — `renderAll()` mounts overlays; poll cycle calls signal setters

## Do NOT Touch
Card layout/structure, `index.html` CSS, `sw.js`

---

## Pre-Build Probe (run FIRST)

```bash
# 1. Find renderAll and understand card creation
grep -n "function renderAll\|renderAll(" src/legacy/field.js | head -5

# 2. Find score text injection in card HTML template
grep -n "scoreStr\|score-display\|data-score\|class.*score" src/legacy/field.js | grep -v "//\|ambient" | head -15

# 3. Find the poll cycle update path (what function updates scores after initial render)
grep -n "pollCycle\|_pollTick\|scoreUpdate\|updateScores\|\.textContent.*score" src/legacy/field.js | head -10

# 4. Confirm card container selector and data-gid attribute usage
grep -n "data-gid\|game-card" src/legacy/field.js | head -10
```

---

## Tasks

### T1. Confirm starting state
```bash
git log --oneline -3
node smoke.js index.html 2>&1 | tail -3
```

### T2. Create `src/solid/score-overlay.jsx`
```jsx
import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';

function ScoreDisplay(props) {
  return (
    <span class="score-live" data-solid-score="1">
      {props.score()}
    </span>
  );
}

// Returns a setter. Caller stores it keyed by gameId.
export function mountScoreOverlay(targetEl, initialScore) {
  const [score, setScore] = createSignal(initialScore || '');
  render(() => <ScoreDisplay score={score} />, targetEl);
  return setScore;
}
```

### T3. Modify `src/legacy/field.js`

**3a.** Add import alongside CC-CMD-2 imports:
```javascript
import { mountScoreOverlay } from './solid/score-overlay.jsx';
```

**3b.** Add setters map at module scope (near other module-scope state maps):
```javascript
const _solidScoreSetters = new Map();
```

**3c.** In `renderAll()` (line confirmed from probe), after each card element is created and inserted into DOM, mount the overlay:
```javascript
const _scoreSlot = cardEl.querySelector('[data-score-slot]');
if (_scoreSlot && gameId) {
  const setter = mountScoreOverlay(_scoreSlot, currentScore);
  _solidScoreSetters.set(gameId, setter);
}
```

**3d.** In the poll cycle score update path (confirmed from probe), replace score text write:
```javascript
// Replace: cardEl.querySelector('[data-score-slot]').textContent = newScore;
// With:
const _setter = _solidScoreSetters.get(gameId);
if (_setter) {
  _setter(newScore);
} else {
  const _slot = cardEl.querySelector('[data-score-slot]');
  if (_slot) _slot.textContent = newScore;
}
```

**3e.** Add `data-score-slot` attribute to the score display element in the card HTML template. Grep for the existing score element class (from probe) and add the attribute alongside it — do not change layout or class names.

**3f.** Temporarily expose setters for verification (remove before final commit):
```javascript
window._solidScoreSetters = _solidScoreSetters;
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
node /tmp/claude-0/-home-user/cdb9888f-e3d8-50d6-821a-f0b47d17aec6/scratchpad/verify-score-solid.js
```

Verification script (`scratchpad/verify-score-solid.js`):
```javascript
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage();
  await page.goto('http://localhost:8732/index.html');
  await page.waitForTimeout(2000);

  // Verify score update latency
  const latency = await page.evaluate(() => {
    const setters = window._solidScoreSetters;
    if (!setters || setters.size === 0) return 'no setters mounted';
    const [gameId, setter] = [...setters.entries()][0];
    const t0 = performance.now();
    setter('99-99');
    const t1 = performance.now();
    return { gameId, latencyMs: t1 - t0 };
  });
  console.log('score update latency:', latency);
  // Target: < 4ms. Acceptable: < 16ms (one frame). Failure: > 16ms.

  // Verify characterData mutations on score update
  const mutTypes = await page.evaluate(() => new Promise(resolve => {
    const cards = document.querySelectorAll('[data-gid]');
    if (!cards.length) { resolve('no cards'); return; }
    const types = new Set();
    const obs = new MutationObserver(muts => muts.forEach(m => types.add(m.type)));
    obs.observe(cards[0], { subtree: true, childList: true, characterData: true });
    const setters = window._solidScoreSetters;
    if (setters) {
      const setter = [...setters.values()][0];
      if (setter) setter('88-88');
    }
    setTimeout(() => { obs.disconnect(); resolve([...types]); }, 500);
  }));
  console.log('mutation types on score update:', mutTypes);
  // Must include 'characterData'. Must NOT be exclusively 'childList'.

  await browser.close();
  console.log('DONE');
})().catch(e => { console.error(e.message); process.exit(1); });
```

### T6. Remove debug exposure, final commit
```bash
# Remove: window._solidScoreSetters = _solidScoreSetters;
git config user.email "noreply@anthropic.com"
git config user.name "Claude"
git add src/solid/score-overlay.jsx src/legacy/field.js index.html
git commit -m "feat: live score cards — Solid fine-grained overlay replaces poll-cycle textContent writes"
git push -u origin main
```

---

## Done Condition
- Smoke 958/0
- Score setter call latency < 16ms (one frame budget)
- MutationObserver confirms `characterData` mutations on score update (not `childList` subtree replacement)
- `window._solidScoreSetters` has entries matching live game IDs (verified before removing debug line)
- `git branch --show-current` → `main`

## Integration Status: STAGED
Blocked by: live game cards require active games + relay data.
Unblocked when: any sport has live games in the evening session.
Verify: open deployed app during live games, open DevTools MutationObserver, confirm score text updates without card re-render.

---

## Execution Order Summary

| CMD | Prerequisite | Behavior change |
|-----|-------------|----------------|
| CC-CMD-1 | None | None — build pipeline only |
| CC-CMD-2 | CC-CMD-1 merged | Ambient panel scroll position preserved across poll cycles |
| CC-CMD-3 | CC-CMD-1 + CC-CMD-2 merged | Score text updates without card DOM replacement |

CC-CMD-2 and CC-CMD-3 can execute in parallel sessions once CC-CMD-1 is merged.
