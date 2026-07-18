# CC Session — esbuild Phase 3-final
**Date:** 2026-07-18
**Scope:** Batch extraction of all remaining genuinely safe candidates — 11 functions, 7 modules
**HEAD progression:** 6f4cb23 → da429d49

## Smoke
- Start: 958/0 (inherited from Phase 3f)
- Local dry-run: 958/0
- CI Deploy gate: success (da429d49, 2026-07-18T03:03:26Z)
- Live site post-deploy: 895 (unchanged — structural extraction only)

## SW_VERSION
Not bumped (structural extraction only, no HTML content change).

## Commits
- `da429d49` — feat: extract 11 pure functions to 7 modules — Phase 3-final batch
  - `src/utils/weather.js` (new): wxDescription, wxIcon, wxAlert, weatherDramaModifier
  - `src/utils/odds.js` (new): isVolatileMatchup, _upsetDogPrice
  - `src/utils/chips.js` (new): _chipsHTML
  - `src/utils/push.js` (new): urlBase64ToUint8Array
  - `src/utils/rai.js` (new): _raiQualityBar
  - `src/utils/nfl.js` (new): _srSitToYL100
  - `src/utils/otw.js` (new): _otwSigTierRank
  - `src/legacy/field.js`: all 11 bodies replaced with stub comments; NO imports added
  - `src/main.js`: 11 imports + globalThis assignments added before field.js

## CI Run
**Code Map (L3):** success (2026-07-18T03:02:56Z)
**Deploy gate (fast smoke):** success (2026-07-18T03:03:26Z)
**Client Live Invariant:** queued at doc-write time

## Candidate Selection (TASK 1)

### Phase 3e pre-vetted candidates re-verified:
- `_raiQualityBar` — pure, 2 callers (L32998, L32999), 0 smoke hits. **Extracted.**
- `isNationalGame` — already extracted in Phase 3f.
- `urlBase64ToUint8Array` — pure, 1 caller (L4516), 0 smoke hits. **Extracted.**
- `_chipsHTML` — A438z has two disjuncts; second (`sp-analytics-footer && _buildAnalyticsChips`) passes independently of `_chipsHTML`. All 3 call sites (L9292, L10676, L10747) use `typeof _chipsHTML === 'function'` guard — string still present in HTML after extraction, first disjunct also satisfied. **Extracted.**

### New candidates found via exhaustive AST scan:
- `wxDescription` (L11095) — pure wx formatter, 2 callers, 0 smoke hits. **Extracted.**
- `wxIcon` (L11106) — pure wx emoji selector, 3 callers, 0 smoke hits. **Extracted.**
- `wxAlert` (L11118) — pure wx boolean classifier, 5 callers, 0 smoke hits. **Extracted.**
- `weatherDramaModifier` (L11129) — pure wx arithmetic, 4 callers, 0 smoke hits. **Extracted.**
- `isVolatileMatchup` (L35486) — pure odds predicate, 2 callers, 0 smoke hits. **Extracted.**
- `_upsetDogPrice` (L9838) — pure odds extractor, 2 callers, 0 smoke hits. **Extracted.**
- `_srSitToYL100` (L5687) — pure NFL field-position converter, 2 callers, 0 smoke hits. **Extracted.**
- `_otwSigTierRank` (L33514) — pure OTW tier switch, 2 callers, 0 smoke hits. **Extracted.**

### Disqualified (not attempted):
- `cardinalDir` — references `WX_DIR` constant
- `windContextNote` — references `PARK_ORIENTATION` constant
- `isOutdoorVenue`, `getVenueCoords` — reference `VENUE_COORDS` constant
- `_epLookup` — references `_epTable` module-level var
- `isFeaturedTierGame` — references `MY_TEAMS` module-level set
- `buildRankBadge` — calls `teamNick` (rejection list)
- `isGameOver`, `_sportLabelMatches`, `_isUpset`, consensus helpers — in smoke.js
- `wxBadge` — calls `cardinalDir` (constant-dependent)

## Call-site verification (TASK 3)
All call sites resolve as plain global reads or typeof guards. globalThis bridge pattern proven across 7 phases.

## Integration status
VERIFIED — Deploy gate passed. globalThis bridge pattern proven across all 19 extracted functions.

## TASK 6 — Final accounting: complete Phase 3 summary

### Total extracted (Phase 3 through Phase 3-final): 19 functions across 13 modules

| Module | Functions | Phase |
|--------|-----------|-------|
| src/utils/golf-format.js | fmtGolfToPar | 3 |
| src/utils/tier.js | fieldTierRank, fieldTierLabel | 3b |
| src/utils/sport-format.js | inferSport, golfRoundLabel | 3c |
| src/utils/espn-clock.js | fmtESPNClock | 3d |
| src/utils/wc-name.js | _normWCName | 3e |
| src/utils/national-game.js | isNationalGame | 3f |
| src/utils/weather.js | wxDescription, wxIcon, wxAlert, weatherDramaModifier | 3-final |
| src/utils/odds.js | isVolatileMatchup, _upsetDogPrice | 3-final |
| src/utils/chips.js | _chipsHTML | 3-final |
| src/utils/push.js | urlBase64ToUint8Array | 3-final |
| src/utils/rai.js | _raiQualityBar | 3-final |
| src/utils/nfl.js | _srSitToYL100 | 3-final |
| src/utils/otw.js | _otwSigTierRank | 3-final |

### What remains unextracted and why

**Smoke-asserted (cannot safely extract without rewriting assertions):**
fieldDateKey, _otwTierLabel, _otwMarginTier, leagueImportanceTier, leagueImportanceRank,
advancementState, fieldNowET, fieldDatesToQuery, _wcFixTeamName, _otwIsFinalPeriod,
_otwIsCrunchTime, _mlbPlayerKey, isGameOver, _sportLabelMatches, _isUpset,
_consensusFavoriteWonRate, _consensusFavoriteHomeWinRate, _consensusFavoriteOverRate

**Constant-dependent (require co-extracting module-level constants):**
cardinalDir (WX_DIR), windContextNote (PARK_ORIENTATION), isOutdoorVenue/getVenueCoords (VENUE_COORDS),
_epLookup (_epTable), isFeaturedTierGame (MY_TEAMS), getUmpireABSRating/getParkFactor (external data),
buildRankBadge (calls teamNick from rejection list)

**Complex/state-dependent (not pure):**
fieldNowET (Date.now()), localTz (Intl.DateTimeFormat), preGameScore (_bdlMilestonesCache),
isoToLabel (timezone logic), expandStreams/resolveBundle (complex logic)

### Phase 4 readiness
The "easy category" (pure, zero-smoke, zero-constant-dep) is exhausted. Remaining candidates all require either:
1. Moving associated constants alongside the function (smoke-safe constants like WX_DIR could be extracted with their dependent function — this is Phase 4 territory), or
2. Rewriting smoke assertions to accommodate extraction (requires explicit authorization).

Phase 4 (tree-shaking / broader modularization) is now the natural next step if further extraction is desired.

## Open carry-forwards
None. Phase 3 complete in full.
