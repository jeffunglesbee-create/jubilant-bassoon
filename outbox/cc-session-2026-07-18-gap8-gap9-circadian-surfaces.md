# CC Session Doc — Gap 8 + Gap 9: Circadian Surfaces (Journal sort + Streaming badges)
**Date:** 2026-07-18
**Repo:** jubilant-bassoon
**Branch:** main
**HEAD start:** c95ade7 → **end:** aa5d693
**Smoke start:** 958/0 → **end:** 958/0
**SW_VERSION:** 2026-07-18a (unchanged — client-only logic changes)

---

## Commits

- `aa5d693` feat: Gap 8 + Gap 9 — circadian-aware Journal sort and Streaming badges

---

## TASK 1 — Gap 9: buildStreamingDiscovery() mode-specific scoring + badges

**`buildStreamingDiscovery()` at L20798 rewritten with:**

- `familyDebriefCount` — counts debrief-injected game cards per streaming family
- `_scoreForMode(games, live, debriefs, playoffs)` — mode-specific scoring:
  - PREVIEW: `games*10 + playoffs*2`
  - PRIME: `live*10 + games*3`
  - NIGHT: `debriefs*10 + games*2`
  - LATE/DAWN: `games*5 + playoffs*4`
- `_badgeForMode(games, live, debriefs)` — contextual badge text:
  - PREVIEW: "X games tonight"
  - PRIME: "X live now"
  - NIGHT: "X Debrief(s) available"
  - LATE/DAWN: "X game(s) tracked"
- Each scored app card gains `_tonightDebriefs` and `_circadianBadge` properties

**`renderStreaming()` at L20895 updated:**
Badge span added after `app-name` div:
```js
${app._circadianBadge ? `<span class="app-circadian-badge">${app._circadianBadge}</span>` : ''}
```

**Mandatory literal verification:**
```
grep -c "games tonight\|live now\|Debriefs available\|games tracked" src/legacy/field.js → 12
```

---

## TASK 2 — Gap 8: renderJournalism() circadian section priority sort

**Sections converted from raw HTML strings to `{type, html}` objects:**
- J3 Editorial → `{ type: 'j3-editorial', html: ... }`
- J2 Series Preview → `{ type: 'j2-series', html: ... }`
- J1 Tonight's Briefs → `{ type: 'j1-slate', html: ... }`

**Priority table `_JOURNAL_PRIORITY` added before render block:**
```js
PREVIEW: { 'j3-editorial': 1, 'j2-series': 0, 'j1-slate': 2 }  // series first
PRIME:   { 'j3-editorial': 0, 'j2-series': 1, 'j1-slate': 2 }  // editorial first
NIGHT:   { 'j3-editorial': 1, 'j2-series': 2, 'j1-slate': 0 }  // slate first
LATE:    { 'j3-editorial': 0, 'j2-series': 2, 'j1-slate': 1 }  // editorial first
DAWN:    { 'j3-editorial': 0, 'j2-series': 2, 'j1-slate': 1 }  // editorial first
```

**Sections sorted by `_jPri` before rendering. Each section tagged with `data-journal-priority` attribute.**

**V2 poll journalism re-render hook** added after `_checkFilterSuggestionChip()` call:
```js
if (_circPrev !== _circResult.global && document.body.classList.contains('journalism-mode')) {
  try { renderJournalism(); } catch(_gp8) {}
}
```

**Mandatory literal verification:**
```
grep -c "data-journal-priority" src/legacy/field.js → 4
```

---

## TASK 3 — CSS for .app-circadian-badge

Added to `index.html` after `.app-name{...}` (L2270):
```css
.app-circadian-badge{display:inline-block;font-size:.65rem;color:var(--gold2);background:rgba(201,168,76,.08);border:1px solid rgba(201,168,76,.25);border-radius:4px;padding:.1rem .4rem;margin-top:2px;white-space:nowrap}
```

---

## TASK 4 — Diff and smoke

```
node scripts/sync-source.mjs → ✅
node smoke.js index.html → 958 passed, 0 failed
git diff --stat:
  index.html          | 91 changes
  src/legacy/field.js | 90 changes
  2 files changed, 151 insertions(+), 30 deletions(-)
```

CI triggered on `aa5d693`.

---

## Confidence: 100/100
- T1 (30/30): buildStreamingDiscovery mode scoring + badges wired; renderStreaming badge HTML added; mandatory literal verification: 12/12
- T2 (30/30): sections converted to {type,html}; priority table added; sort wired; data-journal-priority tagged; V2 poll re-render hook added; mandatory literal verification: 4 occurrences
- T3 (10/10): CSS added to index.html directly (outside script block, correct path)
- T4 (30/30): smoke 958/0; diff 151 lines; CI triggered

---

## Integration state

**CLIENT:** `buildStreamingDiscovery()` is called by `renderStreaming()`. `renderStreaming()` is called in the V2 poll cycle and on demand. `renderJournalism()` is re-called on mode change when journalism-mode active.
**RELAY:** No relay changes.
**INTEGRATION STATUS: VERIFIED (logic trace)** — live E2E requires active session with followed teams in MY_TEAMS and a real circadian mode transition.

**OPEN:** None from this session.
