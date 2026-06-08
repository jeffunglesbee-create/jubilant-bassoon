# FIELD HANDOFF — 2026-06-08 (Session End, Part 2)

## HEADS
- jubilant-bassoon HEAD: b421c88 (nav bar 2-row layout)
- SW_VERSION: 2026-06-08b
- Smoke: 528/0 ✓
- field-relay-nba HEAD: 790f9da (JQ v3 relay parity)

## SESSION TYPE
Daily Update + TYPE A (WC pre-flight) + TYPE C (extensive bug fixes + JQ v3)

## THIS PART (afternoon session continuation)

### Series Brief — three silent ReferenceErrors (all introduced in 8747197)

**Root cause chain for "NYK leads 2-0. Game 3 tonight." static fallback:**

1. `rec` undefined in `fetchSeriesPreviewFromClaude` prompt assembly (ba5c1c2)
   - SERIES RECORD LOCKDOWN instruction used `rec` variable only defined in
     `buildSeriesPreviewStatic()` scope, not `fetchSeriesPreviewFromClaude()`
   - Fix: `(g.seriesRecord || rec)` → `(g.seriesRecord || '')`

2. `wins`/`losses` undefined in `buildSeriesStateClause` 2-0 block (a232030)
   - CRITICAL line used bare `wins`/`losses` not `s.wins`/`s.losses`
   - Fix: `s.wins` and `s.losses` throughout

3. Stale sessionStorage cache surviving across deploys (8fed70a)
   - `seriesPreviewCacheKey()` did not include SW_VERSION
   - Old static fallback text cached under key that survived redeploys
   - Fix: SW_VERSION prefix in cache key (matches Night Owl A265 pattern)

All three introduced in same commit (8747197 — Series Brief 2-0 state clause).
Pattern: silent ReferenceErrors inside try/catch return null → static fallback fires.

### parseSeriesRecord — initialism abbreviation fix (62bc949)

Existing fix handled prefix abbreviations (CAR→Carolina) but not initialisms:
- "NYK" → "New York Knicks": no word starts with NYK → leadingTeam=null
- null leadingTeam → leader=g.away, trailer=g.home → complete inversion
- Brief said "Knicks trail 2-0" when NYK leads 2-0

Fix: after word-prefix matching fails, look up both teams in `_teamAbbr` map
and compare uppercase abbreviation directly.

### JQ v3 — 300-point scale (ffeb6ed + 790f9da)

Client scoreProse(): 10 dimensions, 300-point ceiling.
- Tier 1 (150): Spec 30, StatDepth 38, Variety 30, Density 16, Freshness 36
- Dim 6: Narrative Arc 45 (Stakes 10 + Tension 10 + Resolution 10 + Bonus 15)
- Dim 7: Context Anchoring 25 (reduced from 30; player name weight 7→5)
- Dim 8: Temporal Precision 20 (new — stat time-period anchoring)
- Dim 9: Voice Consistency 30 (new — sport-specific register)
- Dim 10: Matchup Depth 30 (new — secondary player + role stat; replaces Originality)
- J3 prompt updated: MATCHUP DEPTH + TEMPORAL PRECISION instructions
- NBA Finals G3 matchupNote enriched: Castle/Anunoby/McBride/Barnes
- NHL SCF G4 matchupNote enriched: Aho/Barbashev/Burns/Eichel
- relay journalism-quality.js updated to parity (relay ceiling 245 = 300 - 25ctx N/A - 30matchup N/A)
- JQ_SCORE_THRESHOLD: 90 → 135 (300 scale); relay threshold: 130 → 175

### Nav bar — 2-row layout, Desk/Journal/Groups always visible (b421c88)

Row 1: ‹ Today › + scrollable filter pills
Row 2: Desk · Journal · Groups — always fully visible, no scroll needed

Mechanism: controls-inner flex-wrap:wrap, zero-height .divider forces line break,
jump links order:3 always land on row 2. Pure CSS. Applied mobile + iPad portrait.

History of nav iteration this session:
- 99487eb: JS runtime pill injection (wrong — CSS is the right layer)
- 993abb7: display:contents single scrollable row (right mechanism, wrong UX)
- e3bdb93: iPad parity
- 5a8cc3e, 414ac47: hide rules → landscape regression
- 2f6c7ae: overflow:hidden clip fix
- b421c88: final correct 2-row layout

### Other fixes
- A514: J1 brief priority tiers (Finals/WC leads, WNBA compressed)
- A515: SW_VERSION date matches today ET (cosmetic = functional)
- A516: WC Groups pill in buildFilters (inline date check, temporal dead zone)
- WC tab: iOS Safari hidden attribute fix (inline style.display='block')
- WNBA schedule: rebuilt Jun 8–12 from WNBA app (OPTA data was wrong)
- Series Brief static fallback: proper team name from leadingTeam
- league-badge: max-width:52vw ellipsis at mobile
- filter bar clip: controls overflow:hidden + scroll inset padding

## STANDING PRINCIPLES ESTABLISHED THIS SESSION
1. The user should never have to prove Claude wrong — any session.
   When a UI bug is reported, verify before concluding. The screen wins.
2. Cosmetic correctness is functional correctness on FIELD.
   A wrong date in SW_VERSION is a wrong date on the product, full stop.

## UPCOMING GAMES
- Mon Jun 8 8:30pm ET — NBA Finals G3: SAS @ NYK, MSG, ABC (NYK leads 2-0)
- Tue Jun 9 8pm ET — NHL SCF G4: VGK vs CAR @ T-Mobile, ABC (VGK leads 2-1)
- Thu Jun 11 3pm ET — WC opener: Mexico vs South Africa, Azteca, FOX/Tubi FREE

## DEFERRED — TUE JUN 10 2026 10AM ET
1. R2 WC team context (Drive 17D_EzrqoNUR4LN4OK3hr6MqKFUHitWlO72O1CWmqLks)
2. WC journalism tab brief

MEMORY NOTE: After Tue Jun 10 10am ET, restore memory slot 4 to session
doc format rule. Remove deferral note.

## OPEN ISSUES
### HIGH
- PM-32-VI patent documentation — June 25 provisional, 17 days

### MEDIUM
- Night Owl stat snapshot validation — G3 tonight
- WC knockout bracket tab — ~June 18-20

### LOW
- Odds Budget stale date (2026-05-29)
- Streaming Discovery ambient tier (Option A)
- Arc Poster SVG

## SMOKE
516/0 (session start) → 528/0 (session end, +12: A514-A519 + relay parity)

## KEY REFERENCES
- Drive Current State: 1GvsfnTH9Xhqzg_NdYrPhPpk1d1Rnm0lkeG6ip-tLUlA
- Drive CI/Deploy: 1UrOoYDGaK2ncPrnRNXt1w0OElOLpbjP_EYROjG2w1zo
- Drive Build Backlog: 1ugUh6UmeDkLR-gEH8hJPwXK2NiIrXYQY8gp2jO2p2Hk
- JQ Spec v2: 1eSgLyBFHFATJ62yUxe3tAoGmB64vcOljNMVBugU4_DI
