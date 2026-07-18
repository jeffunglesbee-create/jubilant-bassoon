# CC Session Doc — Fix dual MLB game-ID paths causing gameBriefs[] to be permanently unmatchable
**Date:** 2026-07-18
**Repo:** jubilant-bassoon
**Branch:** main
**HEAD start:** 89d67e2
**HEAD end:** d4bf941
**Smoke start:** 958/0
**Smoke end:** 958/0
**SW_VERSION:** 2026-07-18a (unchanged — no boot-visible changes)

---

## Commits

- `d4bf941` fix: fetchESPNFixturesForDate builds canonical MLB_{abbr}_{abbr}_{date} IDs so gameBriefs match in Context Graph

---

## TASK 1 — Which MLB path is primary (confirmed from source, not assumed)

**Two distinct, legitimately-used MLB game-building paths exist:**

### Path A: `fetchMLBFixtures` → `loadMLBSlate` → `fetchMLBSchedule` → `normalizeMLBGame`
- **When:** boot only, today's date only
- **ID format:** `MLB_{homeAbbr}_{awayAbbr}_{YYYYMMDD}` (e.g. `MLB_MIL_MIA_20260717`)
- **Field:** returned as `id:` (not `_id:`) in the game object
- **Caller:** `fetchMLBFixtures()` (L17692), called once at boot from `goToDate` / `initNightOwlPoll`

### Path B: `fetchESPNFixturesForDate` (L3201)
- **When:** `goToDate()` call for any non-today date (the date-picker path)
- **ID format:** `g${_gid}` — a simple session-scoped incrementing counter
- **Field:** returned as `_id:` in the game object
- **Covers:** all sports in `FETCH_LEAGUES` including `{sport:"baseball", league:"mlb", section:"Baseball (MLB)"}` (L3211)

**Finding:** Both paths are legitimately used — Path A for today's games at boot, Path B for all date-picker navigation. The 13 `mlb_game` briefs with `g${n}` IDs in the archive confirm Path B is the source of brief writes. Path B's counter IDs were never matchable by `findBriefs()`.

---

## TASK 2 — Fix

**Root cause:** In `fetchESPNFixturesForDate`'s non-golf game return block (L3298-3311), the `_id` was always `g${_gid}` regardless of sport. For MLB games, this breaks `findBriefs()` matching since `archiveBrief` archives under that same `_id`.

**Fix:** In the non-golf return block, detect `section === "Baseball (MLB)"` and build `MLB_{homeAbbr}_{awayAbbr}_{YYYYMMDD}` using ESPN's own `team.abbreviation` field (confirmed present in ESPN scoreboard response — used at L10880, L13300, L26485). Fallback to `team.displayName` if `abbreviation` absent. Date comes from `iso.replace(/-/g,'')` (the function parameter, already `YYYY-MM-DD`). Non-MLB sports unchanged — still use `g${_gid}`.

```js
const _homeAbbr = section==="Baseball (MLB)" ? (home.team?.abbreviation||home.team?.displayName||"?") : null;
const _awayAbbr = section==="Baseball (MLB)" ? (away.team?.abbreviation||away.team?.displayName||"?") : null;
const _dateStr  = section==="Baseball (MLB)" ? iso.replace(/-/g,'') : null;
const _id = section==="Baseball (MLB)"
  ? `MLB_${_homeAbbr}_${_awayAbbr}_${_dateStr}`
  : `g${_gid}`;
```

**ID convergence after fix:**
- `archiveBrief('mlb_game', 'MLB', game._id, ...)` → writes `game_id = 'MLB_MIL_MIA_20260717'`
- `injectDebriefCards` → `cardEl.dataset.gameid = 'MLB_MIL_MIA_20260717'` → `/context/game/MLB_MIL_MIA_20260717`
- `findBriefs(env, 'MLB_MIL_MIA_20260717')` → `WHERE game_id = 'MLB_MIL_MIA_20260717'` → **MATCH** ✓

---

## TASK 3 — Verification

**Live relay probe (pre-fix state confirmed):**
```
GET /context/game/MLB_2026-07-17_brewers_marlins → 200 OK
archive.gameBriefs: []  ← empty despite 13 mlb_game briefs existing with g${n} IDs
```

**Logic trace (post-fix):**
```
node -e "..."
Generated ID: MLB_MIL_MIA_20260717
ALL ASSERTIONS PASSED
```
- Brewers/Marlins: `MLB_MIL_MIA_20260717` produced ✓
- Same as `normalizeMLBGame` would produce for the same game ✓
- NBA and other non-MLB sports: still `g${_gid}` ✓
- Fallback (no abbreviation): uses `displayName` ✓

**Live write verification:** Cannot observe in sandbox without real user navigation to a date. Pre-fix empty state confirmed live; post-fix ID convergence confirmed by code trace.

---

## Pre-existing unmatchable briefs (13+ with g${n} IDs)

Explicitly left as a known, separate, undecided backfill question per CC-CMD scope.
These briefs exist in ARCHIVE_DB with `game_id IN ('g1','g2','g16','g32',...)` — permanently unmatchable against any canonical ID. A backfill would require mapping each `g${n}` back to a game (ESPN event ID, date, teams) and re-writing the `game_id` — this is a separate, explicit decision not within this CC-CMD's scope.

---

## Confidence: 97/100
- T1 (30/30): two paths confirmed from source code, 13 `g${n}` briefs confirm Path B is active
- T2 (35/35): fix in exact correct location, ESPN `abbreviation` field confirmed present
- T3 (22/25): logic trace complete, live pre-fix empty state confirmed; live post-fix write not observable without user navigation
- T4 (10/10): sync clean, 958/0, clean commit on main

---

## Integration state

**CLIENT:** `fetchESPNFixturesForDate` now produces canonical `MLB_{abbr}_{abbr}_{YYYYMMDD}` IDs for MLB games.
**RELAY:** `findBriefs()` unchanged — it will now match because client-written IDs now align with query parameter.
**INTEGRATION STATUS: VERIFIED (logic)** — live write verification is STAGED pending real user navigation.

Verify command (run after next live `mlb_game` brief write from date-picker path):
```
# Check ARCHIVE_DB briefs table for canonical format game_id
# D1 query: SELECT id, game_id, brief_type FROM briefs WHERE brief_type='mlb_game' ORDER BY created_at DESC LIMIT 5
# Expected: game_id like 'MLB_XXX_YYY_YYYYMMDD', not 'g{n}'
```
