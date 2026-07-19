# CC Session — 2026-07-19 — Pick 'em: selection fix, results display, record stats

**Date:** 2026-07-19
**HEAD start:** (prior session, pre-compaction)
**HEAD end:** 83766ac
**Branch:** main
**SW_VERSION progression:** 2026-07-18k → 2026-07-18l → 2026-07-18m → 2026-07-18n

---

## Summary

Three Pick 'em bugs fixed in three commits. All client-side (jubilant-bassoon only — no relay changes).

---

## Commit 1 — Fix: `makePick` not callable (ESM scope / window bridge gap)

**Problem:** Pick 'em buttons rendered but clicking had no effect. `onclick="makePick(...)"` could not find `makePick` because after the Scenario B ESM build, all functions in `field.js` are module-scoped and invisible to inline attribute handlers unless explicitly bridged to `window`.

**Root cause:** The bridge block (added by session 5b603c0) assigned 13 functions to `window` but omitted `makePick`.

**Fix:** Added one line to the bridge block in `src/legacy/field.js`:
```js
window.makePick = makePick;
```

**Verification:** Structural — function exists and is now reachable from inline handlers. E2E: blocked by sandbox egress (no live browser). STAGED pending live test.

---

## Commit 2 — Fix: resolved picks never shown in Pick 'em (e14d087)

**Problem:** Picks were stored correctly in localStorage on resolution, but `renderPickEmSection` only showed games with `getCardCircadian() === 'PREVIEW'`. Games that go live/final disappear from the section, so no resolved pick was ever visible.

**Root cause:** `renderPickEmSection` was scoped only to upcoming (PREVIEW) games. The function rendered nothing for resolved picks because those games are no longer PREVIEW.

**Fix:** Rewrote `renderPickEmSection` in `src/legacy/field.js` to:
1. Keep existing PREVIEW game rendering
2. Add a Results sub-section by reading `_getPickCache()` and filtering entries where `p.resolved === true`
3. Use `buildPickWidgetHTML` to render each resolved pick (shows correct/incorrect + WP label)
4. Fixed double-escape bug: `matchup` was built from `esc(p.away) + esc(p.home)` — correctly NOT passed through `esc` a second time

**Pick cache schema used:** `{ predictedWinner, sport, home, away, madeAt, resolved, wasCorrect, resolvedProbability, probabilityLabel }`

**CSS added to index.html:**
- `.pickem-results-head` — section divider label
- (stats CSS below is separate)

---

## Commit 3 — feat: Pick 'em record stats — overall, by sport, by team (83766ac)

**Feature:** Added a "Record" block above the Results list in `renderPickEmSection`.

**Contents:**
- **Overall** — W-L record + percentage, displayed prominently
- **By Sport** — sorted by pick volume descending; strips parenthetical suffixes from sport names (e.g., "Basketball (NBA)" → "Basketball")
- **By Team** — sorted by pick volume descending; keyed on `p.predictedWinner`
- Section hidden entirely if no resolved picks exist

**CSS added to index.html (9 rules):**
```
.pickem-stats-block, .pickem-stat-row, .pickem-stat-overall,
.pickem-stat-label, .pickem-stat-rec, .pickem-stat-pct,
.pickem-stat-group-head
```

---

## Integration status
- STAGED (selection fix): `window.makePick` bridge added; can only verify E2E in live browser
- STAGED (results + stats): localStorage reads work purely client-side; can only verify E2E with real resolved picks in live session
- No relay changes — no CONTRACTS.md impact

## Carry-forwards
- None from Pick 'em work
- bracketDelta live probe (field-relay-nba) still pending GitHub dispatch propagation — auto-runs on next `src/` deploy (per prior session `f2373ed`)
- 3 CRITICAL ADR-002 violations (C1/C2/C3) outstanding
- 5 Amnesty Zone CC-CMDs held
