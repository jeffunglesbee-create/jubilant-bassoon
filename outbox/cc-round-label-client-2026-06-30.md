# CC Outbox — Round Label Badge (CLIENT)

**Date:** 2026-06-30
**SW_VERSION:** 2026-06-30b (bumped from 2026-06-30a)
**Smoke:** 809/0 (was 807/0 before this session; +2 from A-ROUND-1 + A-ROUND-2)
**CC-CMD:** docs/CC-CMD-2026-06-30-round-label-client.md

---

## Part B Dependency Check — PASSED

Probed `/v2/games?sport=ucl&date=2026-03-11` via `probe_relay_route` MCP tool:

```json
[{"round":"1st Leg"}, {"round":"1st Leg"}, {"round":"1st Leg"}, {"round":"1st Leg"}]
```

All 4 UCL Round-of-16 first-leg games returned `round: "1st Leg"`. Relay commit 5911f0b5 confirmed live. **Part B dependency check PASSED** — implementing both Part A and Part B.

---

## Task 1 — Call site and implementation

**Call site:** Card template at `index.html` L10525 (now L10526 after insertion), inside `buildTodaySchedule()`. The established badge-row IIFE pattern (same as `buildParkFactorBadge`/`buildNHLAnalyticsBadges`) was followed.

### New function: `buildRoundBadge(game)`

```javascript
function buildRoundBadge(game) {
  if (!game?.round) return '';
  const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  let html = `<span class="round-badge">${esc(game.round)}</span>`;
  const s = game.series;
  if (s?.homeAggregate != null && s?.awayAggregate != null && s.leg !== 1) {
    html += `<span class="round-badge">Agg: ${s.homeAggregate}-${s.awayAggregate}</span>`;
  }
  return html;
}
```

Uses existing `.round-badge` CSS class (L1726, already defined).

### Card template insertion

```javascript
${(()=>{ const _rb=buildRoundBadge(g); return _rb?`<div class="badge-row round-badge-row">${_rb}</div>`:''; })()}
```

Inserted after NHL analytics badge row, before crew line.

### Part A — All sports covered

- `game.round` is one field, no sport-specific branching
- Fires for: NBA "Finals", NHL "Stanley Cup Final", UFL "Playoff Eliminator", MLS "Quarterfinal"/"Semifinal"/"Final"/"Round of 16", soccer "1st Leg"/"2nd Leg"
- All strings rendered as-is (no normalization)

### Part B — Aggregate score line

- Fires when `game.series.homeAggregate != null && game.series.awayAggregate != null && game.series.leg !== 1`
- When `series.leg === 1`, shows round label only ("1st Leg") — no aggregate (as spec'd)
- XSS-safe: HTML-escaped via `esc()`

### Data pipeline additions

**`mapV2ToESPN`:** Added `round: fg.round || ''` and `series: fg.series || null` to the return object, so V2 relay fields flow into `espnScores`.

**`fetchV2AllScores`:** After each `espnScores[key]` write, propagates `round`/`series` to the matching `allData.sports` game object (same `${home}|${away}` key). Triggers `scheduleRenderAll()` the first time round data arrives for a game, so cards re-render with the badge.

**WC26 game objects:** Added `round: e.round || ''` and `series: e.series || null` to objects created from `espnScores` in the WC26 section builder.

---

## Task 2 — Smoke assertions

Added to `smoke.js` after A-TOURN block:

- **A-ROUND-1:** `buildRoundBadge` defined AND `buildRoundBadge(g)` called in card template ✅
- **A-ROUND-2:** `homeAggregate`, `awayAggregate`, and `.leg !== 1` all present in the function ✅

Smoke: 807 → 809 (+2 new assertions passing).

---

## Task 3 — Verify (STAGED)

**What is STAGED:** Visual verification that round badges render on game cards with `game.round` set.

**What blocks verification:** CC sandbox proxy blocks `*.workers.dev:443` — cannot load the live app from this environment. This is the established constraint documented in every CC-CMD this session.

**Exact verification (when unblocked):**
1. For MLS tournament games (July 2026): visit the app on a tournament game date — cards should show the round label (e.g., "Quarterfinal") in a `.round-badge` span below the NHL analytics badges.
2. For UCL two-legged ties (2026-27 season): visit a game date with a second-leg UCL game — card should show both "2nd Leg" label and "Agg: 3-1" alongside it.
3. Manual inspection: open browser DevTools → search for `.round-badge-row` elements to confirm they render.

**Unblock event:** Deploy triggered by this commit to main.

---

## Files Delivered

| File | Change |
|------|--------|
| `index.html` | `buildRoundBadge(g)` function added; card template wired; `mapV2ToESPN` maps `round`/`series`; `fetchV2AllScores` propagates to `allData.sports`; WC26 objects include `round`/`series`; SW_VERSION bumped to 2026-06-30b |
| `sw.js` | SW_VERSION bumped to 2026-06-30b |
| `smoke.js` | A-ROUND-1 and A-ROUND-2 added (count 807 → 809) |
| `HANDOFF.md` | A704 fix: `**SMOKE:**` → `**Smoke:**` (pre-existing failure) |
| `outbox/cc-round-label-client-2026-06-30.md` | This file |

---

## Known Gaps (from CC-CMD, not solved here)

1. Round label vocabulary differs across sources ("East CF" vs "1st Leg" vs "Quarterfinal") — rendered as-is, correct since all strings are human-readable.
2. Stats-api-sourced two-legged ties (TELUS Canadian Championship, Jul 9–14 2026) have no `game.series` aggregate field; they'll show round label only, which is accurate (no silent wrong data) but is a coverage gap vs ESPN-sourced ties.

---

## Confidence Assessment

| Factor | Points | Status |
|---|---|---|
| Part B dependency confirmed (UCL probe) | 20 | ✓ `round:"1st Leg"` confirmed via probe_relay_route |
| `buildRoundBadge` function follows existing badge-row pattern | 15 | ✓ matches `buildParkFactorBadge`/`buildNHLAnalyticsBadges` pattern |
| Part A: all sports, one field, no branching | 20 | ✓ function reads `g.round` regardless of sport |
| Part B: aggregate conditional on series + leg !== 1 | 20 | ✓ guard logic exact per spec |
| Smoke 809/0 | 15 | ✓ A-ROUND-1 and A-ROUND-2 both pass |
| `.round-badge` CSS pre-existing (no invented styling) | 10 | ✓ class at L1726, pre-defined |

**Score: 100 confirmed + visual verification STAGED**
