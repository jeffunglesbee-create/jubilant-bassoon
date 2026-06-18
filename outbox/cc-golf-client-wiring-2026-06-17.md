# Client Golf Wiring — Outbox

**Date:** 2026-06-17
**Spec:** Client Golf Wiring follow-up to ESPN Golf Client Integration
  (cc-golf-client-2026-06-17.md).
**Trigger:** US Open Round 1 starts 2026-06-18 at Shinnecock Hills.
**Prereq confirmed by user:** Relay `/v2/golf/enriched?date=20260618` is live.

---

## Commits

| Commit | SHA | Summary |
|---|---|---|
| 1 | `2490706` | CSS for `.pga-card` / `.pga-eyebrow` / `.pga-title` / `.pga-meta` / `.pga-head` / `.pga-upcoming-date` / `.pga-leaderboard` (table) / `.pga-row` / `.pga-pos` / `.pga-name`. Matches `.golf-leaderboard` aesthetic. Phone portrait hides GIR + Drive columns. |
| 2 | `b7e3761` | `injectPGALeaderboard(pgaData)` — DOM injection. Matches an `allData.sports[Golf]` card by event-name or venue substring, falls back to first golf card. Uses dedicated `.pga-leaderboard-block` wrapper placed after SlashGolf's `.golf-leaderboard` strip. A647. |
| 3 | `3bf069c` | Boot wire — `loadPGASlate()` fires at T+4000ms (500ms after `slashGolfPrefetchAll`), populates `window._pgaDataCache`, calls `injectPGALeaderboard(d)`. Fire-and-forget; relay flake cannot block other boot steps. |
| 4 | `42cdeee` | `fetchGameBriefOnDemand` else-branch — splices `buildGolfPromptContext(window._pgaDataCache)` into the prompt array between `champBlock` and the word-rule footer. Sport gate is `sp.includes('golf') \|\| sp.includes('pga')`. A648. |
| 5 | (this commit) | SW_VERSION 2026-06-17i → 2026-06-17j in index.html + sw.js. Outbox note. |

Final smoke **680 / 0** (678 baseline + A647 + A648).

---

## What's now live end-to-end

1. **Boot path** — index.html ≈line 20335. Fires `loadPGASlate()` 500ms after
   `slashGolfPrefetchAll`. Result lands on `window._pgaDataCache` so the
   journalism prompt can read it later.
2. **Schedule layout** — `injectPGALeaderboard(d)` runs as the resolve
   callback. Inserts `.pga-leaderboard-block` into the matching golf card
   *after* SlashGolf's `.golf-leaderboard` so they stack: SlashGolf summary
   above, ESPN detail (GIR/drive/today/thru/toPar) below.
3. **Prompt injection** — `fetchGameBriefOnDemand` else-branch reads
   `window._pgaDataCache` through `buildGolfPromptContext()` when sport is
   golf or PGA. Other sports unaffected.
4. **CSS** — `.pga-card`/`.pga-leaderboard`/`.pga-row` styles defined in
   index.html ≈line 1550. Top-3 row emphasis, gold accent, table layout.
   Phone portrait drops GIR + Drive to keep leaderboard legible.

---

## Constraints honored

- ✅ Relay code (`field-relay-nba`) not modified.
- ✅ WC2026 / drama scoring / bracket logic untouched.
- ✅ Strokes gained never referenced (A646 still passes; `buildGolfPromptContext`
  body unchanged; new wiring reads from the helper so the absence propagates).
- ✅ SlashGolf preserved — separate `.golf-leaderboard` selector logic; ESPN
  block placed AFTER SlashGolf strip so both render side by side.
- ✅ Boot path not restructured — `loadPGASlate` inserted alongside
  `slashGolfPrefetchAll` with a 500ms offset, not in place of it.

---

## Smoke deltas

- **A647** added — `injectPGALeaderboard` defined, calls `renderPGALeaderboard`,
  emits `.pga-leaderboard-block`, places it after SlashGolf strip.
- **A648** added — `fetchGameBriefOnDemand` reads `window._pgaDataCache`
  through `buildGolfPromptContext` for golf/PGA briefs.
- **A644 / A645 / A646** continue passing (V2_LEAGUES.pga, render+load
  defined, strokes-gained absent).

Baseline before wiring: 678 (post 5817d95). After this session: **680**.

---

## Visual verification — deferred

Dev-server preview was not attempted from this session because the sandbox
network policy blocks outbound HTTP to the relay host (verified earlier this
session — probe of `/v2/golf/enriched` returned 403 "Host not in allowlist").
The relay-live precondition was confirmed by the user.

Suggested manual verification once US Open is live:
- Open https://field.{deploy-host}/ on desktop (laptop ≥1200px)
- Locate the Golf section (will include the US Open SlashGolf card)
- After ~5s, expect the ESPN PGA leaderboard table to appear below the
  SlashGolf strip in the same card
- Confirm `.pga-row` columns render: Pos, Player, To Par, Today, Thru, GIR, Drive
- Resize to phone portrait — GIR + Drive columns should disappear; first
  five columns remain legible
- Tap a PGA game card → confirm the generated J1 brief mentions one of the
  per-player narrative anchors (e.g. "GIR around 78%, well above tour
  average") and does NOT mention strokes gained

---

## Carry-forward (next session)

- Between-tournament path probe: confirm `data.active === false` route
  renders the upcoming-event card correctly with `data.nextEvent.{name,
  startDate, location}`. The fingerprint-match heuristic in
  `injectPGALeaderboard` falls back to the first golf card; this needs a
  visual check when no SlashGolf golf game is scheduled.
- LIV / DP World / LPGA cards: SlashGolf is the source. `injectPGALeaderboard`
  skips non-PGA tournaments by sport-section gate (only iterates Golf section
  cards) — confirm no accidental double-render on non-PGA cards.
- HANDOFF.md update (deferred to a follow-up).
