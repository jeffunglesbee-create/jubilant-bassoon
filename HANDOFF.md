# FIELD Handoff — May 29 2026 (Session End — TYPE B: Remove Tier-1 Gambling + Decouple Tier-2 EMBER/BNI)

## SESSION TYPE
TYPE B — Code change. Betting engine fully removed. Deploy green.

## Code HEAD
`6df267c` — Smoke 238/0 · deploy-gate success · 1,901 lines deleted from index.html

## COMPLETED THIS SESSION

### Tier-1 Gambling removed entirely (A1–A4 per spec)
- **A1**: Removed `injectOddsChip`, `injectAllOddsChips`, `findOddsForGame`, `fmtAmericanOdds`, `beatTheBook`, `.odds-chip` CSS, `.btb-badge` CSS, `journalism-odds-context` + `scout-pick-market-tip` FIELD_FEATURES flags, dns-prefetch for the-odds-api.com.
- **A2**: Removed `<section class="betting-section">` HTML, all betting CSS (.betting-grid, .bet-card, .prob-bar*, .comp-badge, .bet-field-edge, etc.), `renderBetting`, `buildBettingFieldEdge`, `compBadge`, `buildProbBars`, `renderTonightSummary`, `fetchBettingLines`, `BETTING_LINES_FALLBACK_DATA`, `buildBettingFallback`, `bettingRendered` variable + stale helpers, lazy-section observer entry.
- **A3**: Removed `oddsCtx` assembly from journalism compound prompt; removed odds-tightness signals from `buildGameContext`, ambient panel context, Scout's Pick tooltip.
- **A4 (last)**: Removed `ODDS_RELAY_BASE`, `ODDS_SPORT_MAP`, `_oddsCache`, `getGameOdds`, `fetchOddsForSport`, `fetchGameOdds`, `ODDS_API_BASE`, budget helpers (`oddsReqCount`, `oddsBumpCount`, `oddsBudgetOk`), `startOddsPolling`.

### Tier-2 decoupled (B1–B2)
- **B1 EMBER**: Removed `isOddsCompetitive` Gate 2 from `isScoutsPick`; removed `bb` (drama_bb) block from `preGameScore`; removed `oddsCtx` from journalism prompt; removed odds signal from `computeInsights` market block.
- **B2 BNI**: Removed `narrative-push` odds trigger from `computeBroadcastNarrativeIndex`; rewrote OTW framing strings from betting-market language (`⚠️ market says blowout` / `⚠️ big market push`) to broadcast-hype language (`⚠️ broadcaster hype` / `⚠️ marquee push`).

### Smoke assertions updated (C)
Deleted A61, A185, A212, A220 (presence assertions for removed features). Deleted odds relay adapter block (A121-126 region). Updated A123 (fieldVsMarket removed; scoutTitle still checked). Added A243 regression guard (betting engine fully absent).

### Collateral fixes (restorations from regex over-match)
- Restored `return [` + game header lines in `fetchFIELDBriefFromClaude` journalism context builder (oddsCtx regex consumed the array opening).
- Restored `refreshAFLSection` function (eaten by renderTonightSummary removal regex).
- Restored `isPlayoffGame` as standalone helper near `isNationalGame` (was inside renderTonightSummary; needed for A183).
- Removed orphaned `}` braces left by moneylineGap block removal.

### Doc cleanup from prior session in this same turn
- Created **FIELD — Infrastructure Backlog (Tier 2)** Drive doc: `1n4mYHB-k_X5pKrNuUFV7FK0YlolIPkNpGAkegGAUVHw`
- Created **Build Session List v7.26 draft** (for Jeff to paste into canonical doc): `1C9Lx5WBD9xe_EAeilryNjN8keimpAgpyE_I50RGiKGY`
- STANDARDS.md canonical table updated (Build Session List ID fixed + Infrastructure Backlog added)

## FINAL STATE
- Smoke: **238/0** (down from 242/0 — 6 presence assertions for removed betting features deleted, 1 new regression guard added = net −4 assertions)
- File: ~91KB removed from index.html
- Deploy gate: **success** (6df267c)
- Betfair: already removed in prior session (May 25). Odds API: now removed. Betting section: gone.

## STILL OPEN (carried)
- Verify journalism recovery once Gemini quota resets
- Dropbox refresh-token: add 3 secrets, re-dispatch workflow
- VAPID browser opt-in test (Jeff): click Enable on live site
- Golf Doc 1 (Drive `1Ak_GPXkiKUvUr6dUpcto0BUbhKTibIwgR-o8SYUeBfM`): scrub PGA embedded key + mark DECOMMISSIONED
- Merge data-sourcing matrix verified cells into MASTER scaffold `1LUuR0CLWUvIc94Vou46VmeTLz1n-Y6YAz0F0MX6GR-M`
- Build Session List canonical doc (`19TicpFBU2ORbypNBteCXuhwbX1FoP14Y2NGuU9e3drQ`): paste content from v7.26 draft, delete draft

## TIER 0 DEADLINES
- NHL SCF shell (CAR closing ECF)
- NBA Finals G1 shell (June 3, vs NYK)
- World Cup 2026 Phase 1 (June 11 HARD)
- USPTO provisional (~June 25)

## RIGHTS NOTE (Rule 45)
Removing Tier 1 strips FIELD's odds/vig surface and makes betting-use clauses inapplicable. Risk reduction posture — not a rights grant. Freedom-to-operate remains counsel's call.

## CANONICAL IDs
CI/Deploy Ref: 18JMUd-Uq_m2DomuCua2B5UMiWOel81yzc1JU7SY6f20
Repo: jeffunglesbee-create/jubilant-bassoon
Relay repo: jeffunglesbee-create/field-relay-nba
Build Session List (canonical): 19TicpFBU2ORbypNBteCXuhwbX1FoP14Y2NGuU9e3drQ
Infrastructure Backlog (Tier 2): 1n4mYHB-k_X5pKrNuUFV7FK0YlolIPkNpGAkegGAUVHw
Journalism Quality Spec: 1oSj9Wl9lZl_RGGElZdn_dhI4s3vzvnkv5HazELKSw-0
