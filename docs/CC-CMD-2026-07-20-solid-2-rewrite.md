# CC-CMD-2 (REWRITTEN): Ambient Panel Solid Islands — six real sections, not one homogeneous list

**Date:** 2026-07-20
**Scope:** jubilant-bassoon only
**Supersedes:** CC-CMD-2026-07-19-solid-2-ambient-island.md (blocked, ~5/100,
never executed) — this version is built directly against the real structure
that CC-CMD's own respec doc found, not the original's incorrect assumption
of a homogeneous game-row list.
**Prerequisite:** CC-CMD-1 (solid-js + esbuild-plugin-solid) — confirmed
already merged and verified (`18654cc`).
**Real, explicit justification (the original's stated reason — scroll
position — is moot; already fixed, confirmed via source read):** the current
`renderAmbientPanel()` does a single dirty-check against the *entire*
concatenated HTML string, then replaces the *entire* `.ambient-scroll-inner`
subtree via `innerHTML` on every poll cycle where *any* of the six sections
changed — even if only one, small section actually differs. This is real,
unnecessary DOM churn/repaint cost on every 15-30s poll. Fine-grained
per-section reactivity avoids re-touching the five sections that didn't
change.
**Real, honest scope acknowledgment:** this is a larger, more structurally
invasive change than the original "8 call sites + one boot mount" framing —
it touches render logic for the season-context filter pill and the editorial
card, both shared with other surfaces (`#night-owl`/`#field-brief`). Proceed,
but do not silently expand scope further than what's specified below.

---

## Do NOT Touch

`index.html` CSS, `sw.js`, any function outside the ones explicitly named
below, `_deskCardToggle`'s existing callers elsewhere in the file (if any
exist outside the ambient panel — confirm via probe, don't assume there
are none).

---

## Pre-Build Probe (run FIRST — re-verify against current HEAD, line numbers
in this doc are from `e6d4bbc0` and will have drifted)

```bash
git log --oneline -5
grep -n "function renderAmbientPanel" src/legacy/field.js
sed -n '/function renderAmbientPanel/,/^}/p' src/legacy/field.js
grep -n "_deskCardToggle" src/legacy/field.js
grep -n "otwHTML\s*=\|scoresHTML\s*=\|soonHTML\s*=\|upcomingHTML\s*=\|ctxHTML\s*=\|editorialHTML\s*=\|arbHTML\s*=" src/legacy/field.js
```

Confirm the real, current shape of each of the six section-builder
functions/blocks before writing any component — this doc's own descriptions
below are based on a probe against `e6d4bbc0`, not a live read at execution
time.

---

## Tasks

### T1. Create `src/solid/ambient-island.jsx`

Six real, separate components, one per section, each taking its own props
(not one monolithic component fed a single homogeneous array):

```jsx
import { createSignal, Show, For } from 'solid-js';
import { render } from 'solid-js/web';

// OTW fire/soon — props-driven, re-renders only when its own data changes
function OtwCard(props) {
  return <Show when={props.data}>{/* real markup mirroring otwHTML's structure — port from probe output */}</Show>;
}

// Live scores — keyed list, same reconcile() pattern as the (correctly
// scoped) original CC-CMD-2 intended for its assumed game-row list
function ScoresList(props) {
  return (
    <For each={props.games} fallback={null}>
      {(game) => <div class="ap-score-row" data-gid={game.gid}>{/* port from scoresHTML markup */}</div>}
    </For>
  );
}

// Soon / Upcoming — same real list pattern as ScoresList
function SoonList(props) { /* mirror ScoresList shape */ }
function UpcomingList(props) { /* mirror ScoresList shape */ }

// Season-context pill — has a real, existing inline onclick scroll-to-filter
// handler. Find the real, current target function via probe (grep the
// handler's own onclick string in ctxHTML's source) and call it directly —
// do not reimplement scroll-to-filter logic here.
function ContextPill(props) {
  return (
    <div class="ap-ctx-pill" onClick={() => props.onScrollToFilter()}>
      {props.label}
    </div>
  );
}

// Editorial card — real local toggle state. This is the one component
// where _deskCardToggle's truncation logic moves INTO component state
// (a real createSignal, matching rubric criterion #3 — local state that
// would otherwise fight renderAll()) rather than staying a DOM-level
// data-full attribute hack.
function EditorialCard(props) {
  const [expanded, setExpanded] = createSignal(false);
  return (
    <div class="ap-editorial" onClick={() => setExpanded(v => !v)}>
      {expanded() ? props.fullText : props.truncatedText}
    </div>
  );
}

// Arbitrage summary — props-driven, mirrors arbHTML markup
function ArbCard(props) { /* port from arbHTML markup */ }

function AmbientPanel(props) {
  return (
    <div class="ambient-scroll-inner">
      <OtwCard data={props.state.otw} />
      <Show when={props.state.scores?.length}><div class="ap-divider" /><ScoresList games={props.state.scores} /></Show>
      <Show when={props.state.soon?.length}><div class="ap-divider" /><SoonList games={props.state.soon} /></Show>
      <Show when={props.state.upcoming?.length}><div class="ap-divider" /><UpcomingList games={props.state.upcoming} /></Show>
      <Show when={props.state.ctx}><div class="ap-divider" /><ContextPill label={props.state.ctx} onScrollToFilter={props.onScrollToFilter} /></Show>
      <Show when={props.state.editorial}><div class="ap-divider" /><EditorialCard {...props.state.editorial} /></Show>
      <Show when={props.state.arb}><div class="ap-divider" /><ArbCard data={props.state.arb} /></Show>
    </div>
  );
}

const [ambientState, setAmbientState] = createSignal({});

export function mountAmbientIsland(panelEl, onScrollToFilter) {
  render(() => <AmbientPanel state={ambientState()} onScrollToFilter={onScrollToFilter} />, panelEl);
}

export function updateAmbientData(newState) {
  setAmbientState(newState);
}
```

**Real, important note:** the JSX above is a real starting structure, not
a literal drop-in — each section's actual markup must be ported from the
real, current `otwHTML`/`scoresHTML`/etc. builder logic found in the probe,
preserving the real CSS classes and structure exactly (per "reuse FIELD's
real CSS custom properties" convention already established for other Solid
work tonight) — do not invent new markup or classes.

### T2. Modify `src/legacy/field.js`

**2a.** Add import:
```javascript
import { mountAmbientIsland, updateAmbientData } from './solid/ambient-island.jsx';
```

**2b.** Find the real, current scroll-to-filter handler (the function
`ctxHTML`'s inline `onclick` currently calls). Confirm its real name and
signature via probe — pass a reference to it as `onScrollToFilter` at
mount time, do not reimplement its logic.

**2c.** At boot, before the first `renderAmbientPanel()` call:
```javascript
const _solidPanelEl = document.getElementById('ambient-panel');
if (_solidPanelEl && !_solidPanelEl._solidMounted) {
  mountAmbientIsland(_solidPanelEl, /* real scroll-to-filter function ref */);
  _solidPanelEl._solidMounted = true;
}
```

**2d.** Replace the real, current `panel.innerHTML = _apWrapped` write
(and its surrounding dirty-check/scrollTop logic — no longer needed, Solid
handles this natively per-section) with:
```javascript
updateAmbientData({
  otw: /* real otw data, structured not pre-rendered HTML */,
  scores: /* real scores array */,
  soon: /* real soon array */,
  upcoming: /* real upcoming array */,
  ctx: /* real ctx label or null */,
  editorial: /* real {truncatedText, fullText} or null */,
  arb: /* real arb data or null */
});
```
The real, exact field names must match what the probe shows each section's
real data source actually provides — do not guess field names, read them
from the real, current section-builder code.

### T3. Build + smoke

```bash
node scripts/build-bundle.mjs 2>&1
git checkout HEAD -- index.html
node scripts/sync-source.mjs
node smoke.js index.html 2>&1 | tail -3
```

### T4. Browser verification via Playwright

Real, direct checks:
1. All six sections render with real, current data (not empty/broken)
2. The season-context pill's click still triggers the real scroll-to-filter
   behavior (not just that a handler exists — that it actually scrolls)
3. The editorial card's expand/collapse genuinely toggles real content,
   not just that `expanded()` state changes internally
4. `MutationObserver` shows `characterData`/targeted mutations on a poll
   update to one section, NOT a full subtree replacement of all six
5. Scroll position within the panel survives 3 consecutive poll cycles
   (re-confirming the already-working behavior isn't regressed by this
   rewrite, not re-solving it)

### T5. Commit

```bash
git config user.email "noreply@anthropic.com"
git config user.name "Claude"
git add src/solid/ambient-island.jsx src/legacy/field.js index.html
git commit -m "feat: ambient panel Solid islands — six real sections, fine-grained per-section updates replace whole-panel innerHTML"
git push -u origin main
```

---

## Done Condition

All six real sections render correctly with live data. Season-context
click-to-filter and editorial expand/collapse both genuinely functional,
not just structurally present. `MutationObserver` confirms per-section
updates, not full-subtree replacement. Scroll position still survives
poll cycles (regression check, not a new fix). Smoke passing at current
real count.

**Confidence scoring:**
- T1 (30 pts): all six real components correctly built, markup ported accurately from real source
- T2 (25 pts): real wiring correct, scroll-to-filter function reused not reimplemented, real field names confirmed via probe not guessed
- T3 (10 pts): real build + smoke pass
- T4 (25 pts): all 5 real browser checks pass, especially the two interactive ones (click-to-filter, expand/collapse) — not just "renders"
- T5 (10 pts): clean commit

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
