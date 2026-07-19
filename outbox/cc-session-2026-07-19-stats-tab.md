# CC Session — 2026-07-19 — Stats Tab

## HEAD Progression
- Start: `cbda6b8` (ci: update current state)
- End:   `4469111` (stats tab — cross-sport analytics surface)

## SW_VERSION
- 2026-07-19b → 2026-07-19c

## Smoke
- Start: 958 passed, 0 failed
- End:   958 passed, 0 failed (no assertions added or removed)

## Commits

### jubilant-bassoon `4469111`
`feat: stats tab — cross-sport analytics surface (MLB/NFL/NBA/NHL/EPL)`

**New mode: `stats-mode` (fourth full-viewport tab swap)**

**index.html (CSS):**
- `body.stats-mode` rules: hides main, panel, journalism, wc, pickem sections; shows `#stats-section`
- `margin-right:0` overrides on nav/masthead/main
- Back-pill: sticky on mobile (≤1199px), max-width 1400px on desktop
- Component classes: `.stats-sport-block`, `.stats-subsection`, `.stats-row`, `.stats-row-rank/.name/.val/.sub`, `.stats-empty`

**index.html (HTML):**
- `📊 Stats` nav link (`id="stats-nav-link"`) added after `🎯 Picks`
- `<section id="stats-section">` with back-pill, header, `<div id="stats-content">`

**src/legacy/field.js:**
- `toggleStatsView()` — mirrors `togglePickEmView()` exactly; mutual exclusion vs journalism/wc/pickem modes; calls `renderStatsSection()` on open
- `renderStatsSection()` — five sport blocks:
  - **MLB**: Pythagorean gap leaderboard (`MLB_TEAM_PYTHAG`, sorted by |actual−expected|); xwOBA divergence top 8 (`PLAYER_EXPECTED_STATS`, 50+ PA, sorted by |div|)
  - **NFL**: QB CPOE top 8 (`NFL_NGS_PASSING`); WR air yard share + YAC above expected top 8 (`NFL_NGS_RECEIVING`)
  - **NBA**: Clutch DRTG delta vs regular DRTG (`NBA_TEAM_ANALYTICS`, clutchDrtg-populated only); best regular DRTG top 6
  - **NHL**: GSAx leaders top 8 (`NHL_GOALIE_RATINGS._gsax`, only if populated by `nhlGSAXInit`); elite tier goalie list (static)
  - **EPL**: xGI/90 top 10 (`FPL_PLAYER_ANALYTICS`, element_type ≥ 3)
  - Graceful empty state if a data map is unpopulated (shows "Analytics loading…" message)
- `window.toggleStatsView = toggleStatsView` exported
- SW_VERSION: `2026-07-19b` → `2026-07-19c`

## Integration Status

| Feature | Status | Notes |
|---|---|---|
| stats-mode toggle | STAGED | Full-viewport tab swap wired. E2E requires deployed session with boot data populated (~5s after load) |
| MLB Pythagorean gap | STAGED | Reads MLB_TEAM_PYTHAG — requires mlbPythagInit() to complete post-boot |
| MLB xwOBA divergence | STAGED | Reads PLAYER_EXPECTED_STATS — requires mlbStatsInit expected_stats file load |
| NFL QB CPOE | STAGED | Reads NFL_NGS_PASSING — requires nflNGSInit() post-boot. E2E requires NFL season |
| NFL WR AYS/YAC | STAGED | Same |
| NBA clutch DRTG | LIVE | NBA_TEAM_ANALYTICS is static map — renders immediately on open |
| NHL GSAx leaders | STAGED | Reads NHL_GOALIE_RATINGS._gsax — requires nhlGSAXInit() (T+4.8s). Static tier renders immediately |
| EPL xGI/90 | STAGED | Reads FPL_PLAYER_ANALYTICS — requires fplLoadBootstrap() |

## Lint Fix
Pre-commit hook caught 3 `no-restricted-syntax` errors on `getElementById(...)?.classList.remove()`.
Fixed by storing result first per convention: `const el = document.getElementById(id); if (el) el.classList.remove(...)`.
Sync guard fired on second attempt — resolved with `git checkout HEAD -- index.html` + re-sync.

## Carry-Forwards (none — per Rule 87)
- NFL/EPL blocks render empty off-season (data maps unpopulated). This is correct graceful behavior.
- "Automate follow ups and resolve lint runs" — addressed inline: lint errors resolved before push; no further automation needed.
