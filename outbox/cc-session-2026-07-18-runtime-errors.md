# CC Session — 2026-07-18 — runtime-errors + card-debrief-inject

## HEAD progression
- bc75b2d → ede0175 (CI auto) → 6c8822c

## Smoke
- Start: 958 passed (HEAD bc75b2d)
- End: 958 passed (HEAD 6c8822c)

## SW_VERSION
- 2026-07-18c → 2026-07-18d (bc75b2d) → 2026-07-18e (6c8822c)

## Commits

### bc75b2d — fix: inject debrief into existing game card instead of replacing it
**Problem:** `injectDebriefCards` called `renderCard` (which clones `_cardTemplate`) and
replaced the live game card with `replaceWith`. The `_cardTemplate` card lacks `card-right`
and has `card-header` with no CSS grid placement, breaking the 3-col layout (score jumped to
full-width header, right column vanished). `buildFieldWasWatching` also caused the pre-game
brief to appear twice — once in the `sport-game-brief-card` sibling and again as italic text
inside the replaced card's debrief slot.

**Fix:** Modified `injectDebriefCards` to call `buildDebrief(enriched)` directly and inject
the result into a `.card-debrief` div appended to the existing `cardEl`, then add `is-final`.
CSS: added `grid-column:1/-1` to `.card-debrief` so it spans all three grid columns.

**Files:** `src/legacy/field.js` (injectDebriefCards), `index.html` (CSS .card-debrief)

**Verified:** Smoke 958/0.

---

### 6c8822c — fix: suppress expected runtime errors flooding FIELD HEALTH panel
**Problem (from screenshot IMG_9600 at 6:19 PM Jul 18):**

1. `find-espn-score-no-match` ×1400 — Toronto Argonauts @ Hamilton Tiger-Cats. `findESPNScore`
   had no CFL guard. ESPN doesn't index CFL. Every render cycle recorded a failure.

2. `find-espn-score-stale-final-guard` ×72 — Pittsburgh Pirates @ Cleveland Guardians,
   start_time 2026-07-18T23:10:00Z. The stale-final guard was working correctly (blocking a
   prior day's final score from appearing on a scheduled game card) but called
   `FIELD_OPERATIONS.recordFailure` on every render cycle, flooding the error log.

3. `nbaPlayerCluichInit · Fetch is aborted` — `AbortSignal.timeout(6000)` too tight for
   cold relay + upstream stats.nba.com roundtrip.

**Fixes:**
- `findESPNScore`: added `if (sc.isCFL) return null;` after classifySport — early exit, no
  failure recorded (CFL not having ESPN scores is expected, not an error)
- `_recordStaleFinalBlock`: added `_staleFinalRecorded` module-level Set; deduplicates by
  `away|home|start_time` — only first block per matchup is recorded
- `nbaPlayerCluichInit`: `AbortSignal.timeout(6000)` → `AbortSignal.timeout(12000)`

**Files:** `src/legacy/field.js`

**Verified:** Smoke 958/0.

## Integration status
- VERIFIED: Card debrief injection fix (layout correct, no duplicate brief text)
- VERIFIED (structurally): Runtime error suppression — cannot E2E verify without live CFL game
  and stale-final condition; fixes are correct by inspection and match the error signatures

---

### 2d87152 — fix: getDramaDial null-localStorage guard + raise relay timeout default to 25s
**Problems (from IMG_9604):**
1. `initFIELDBrief:null is not an object (evaluating 'localStorage.getItem')` — `getDramaDial()` called `localStorage.getItem()` without null guard. `window.localStorage===null` in iOS Safari private/standalone. Error tagged `initFIELDBrief` because outer `.catch()` at line 7620 catches the entire `.then(()=>renderAmbientPanel())` chain.
2. `journalism:generate:j3-brief:Load failed` — `generateJournalismViaRelay` default `AbortSignal.timeout` was 12s. Quality chain runs 6+ LLM retries; routinely >12s on busy evenings.

**Fixes:**
- `getDramaDial()`: wrapped body in try/catch, returns 65 on error
- `generateJournalismViaRelay`: raised default timeout 12000→25000ms

**SW_VERSION:** 2026-07-18j

---

### 42f98bc — fix: skip findESPNScore for soccer games (SOCCER_LEAGUES=[])
**Problem (from IMG_9605):**
`scores:find-espn-score-no-match:no match found: England @ France (×17)` — `SOCCER_LEAGUES=[]` (all soccer migrated to V2). `fetchSoccerFixtures` is a no-op; `espnScores` never contains soccer entries. `findESPNScore` lacked `isSoccer` in early-exit guard, running full key-scan and always missing.

**Why safe:** `findScore()` reads from `_scoresBySource.apisports` directly — independent of `findESPNScore`. Soccer scores unaffected.

**Fix:** Added `|| sc.isSoccer` to `findESPNScore` early-exit guard (~line 17067).

**NBA relay 403 (×2):** No fix — transient NBA CDN issue, already guarded by `retryable:true` + `RELAY_HEALTHY`.

**SW_VERSION:** 2026-07-18k

## Open carry-forwards
- Phrase Review warning: 25 low-score briefs · "points, points, points" repeated phrases.
  Journalism quality issue, separate concern — not addressed this session.
- nbaPlayerCluichInit: if 12s still times out after deploy, root cause may be off-season
  endpoint behavior at stats.nba.com (returns no rows for completed 2025-26 playoffs).
  Future fix: add NBA playoff season guard (skip init when no active NBA playoff games).
