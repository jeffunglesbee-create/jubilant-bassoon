# CC Session Doc — Gap 5: Cross-Sport Circadian System
**Date:** 2026-07-18
**Repo:** jubilant-bassoon
**Branch:** main
**HEAD start:** 8c0bec1
**HEAD end:** b9a0ea6 (live: 6992e7a after Code Map)
**Smoke start:** 958/0
**Smoke end:** 958/0
**SW_VERSION:** 2026-07-18a (unchanged — no visible DOM added this session)

## Commits

- `b9a0ea6` feat: Gap 5 — cross-sport circadian system (computeCircadianContext/computeSportCircadian/applyCircadian)

## What was built

Implemented the cross-sport document-level circadian system per the approved June 15 2026 spec (Drive doc `1NeAFkfKhBKhqeez-broEmb-q-ULB9u6L8tvwEWYyMeU`).

### Functions added (index.html ~L7117)
- `computeCircadianContext(now, games)` — five modes: PREVIEW/PRIME/NIGHT/LATE/DAWN. Cross-adapter state detection (V2/WC `g.state`, MLB `g.status`, AFL `g._aflComplete`) — not spec's `g.status`-only which only covers one adapter.
- `computeSportCircadian(now, allSports)` — takes `allData.sports` sections array (not flat games — spec's `g.sport` doesn't exist). Returns `{ global, bySport }`.
- `applyCircadian(mode)` — sets `document.documentElement.dataset.circadian`.
- Module-level: `let _circadianMode = 'PREVIEW'` and `let _circadianBySport = {}`.

### CSS added (~L1950)
Five `:root[data-circadian="MODE"]` blocks setting `--chip-must-opacity`, `--chip-watch-opacity`, `--chip-discovery-opacity`, `--chip-quiet-opacity`. No `.field-chip--*` consumers added (those classes don't exist — UI Primitives not yet built). Properties are forward-compatible.

### Poll wiring (~L19253 in fetchV2AllScores)
`computeSportCircadian` + `applyCircadian` called before `scheduleV2Poll` on every V2 poll cycle. Wrapped in try/catch.

### Section template (~L11907)
`data-sport-circadian="${_circadianBySport[sec.sport] || 'PREVIEW'}"` added to every `.sport-section` div.

### Sort order (updated comparator ~L11767)
Secondary sort added after primary circadian tier sort:
- PRIME/LATE: by `_gameImportance` string enum (series_deciding:30, elimination:20, clinch:15, playoff_impl:10)
- NIGHT: by recency (`minutesSinceFinal` ascending)
- PREVIEW: by `start_time` lexicographic

## Spec deviations (justified)
1. **Chip classes don't exist** — `field-chip--MUST/WATCH/DISCOVERY/QUIET` never built. CSS custom properties added as forward-compatible; no dead `.field-chip--*` opacity rules.
2. **Spec uses `renderScheduleFromEnriched()`** — doesn't exist. Real poll function is `fetchV2AllScores` with `scheduleV2Poll`.
3. **Spec's `g.status` is not cross-adapter** — adapted to use same detection pattern as `isGameOver()`.
4. **Spec's `g.sport` doesn't exist on game objects** — `computeSportCircadian` takes `allData.sports` sections, not a flat games array.
5. **No Debrief-specific code** — `.card-debrief` and journalism prompt integration explicitly excluded per CC-CMD scope boundary.

## Verification
- Local smoke: 958/0 (pre and post commit)
- Deploy gate: success on b9a0ea6
- Code Map (L3): success
- Desktop Safari Viewport Audit: success
- Client Live Invariant: success
- Live HEAD: 6992e7a (Code Map housekeeping on top of b9a0ea6)
- Integration status: VERIFIED (wired into real poll cycle, data-sport-circadian on DOM)

## Open carry-forwards
- Gap 6 (The Debrief notification) — blocked on The Debrief being built; CC-CMD exists at docs/CC-CMD-2026-07-18-gap5-circadian.md (gap 6 is a separate CC-CMD to be written once Debrief lands)
- UI Primitives (fieldChip, fillSlot, .field-chip--* classes) — prerequisite for the CSS custom property consumers to have any effect. Separate CC-CMD.
- CONTRACTS.md update for golf scoring columns relay fields (birdies/bogeys/doublesOrWorse) — standing obligation from prior session.
