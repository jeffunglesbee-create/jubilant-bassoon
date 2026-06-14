# FIELD HANDOFF
**HEAD:** main @ 41bb8df (ambient scroll RESOLVED) · 2026-06-14
**SW_VERSION:** 2026-06-14k
**Smoke:** 645/0 (was 550/0 at session start)
**Units:** 66/0

## Ambient panel scroll — RESOLVED June 14 2026
After four failed attempts, the fix is confirmed working on real iPad
Safari (portrait + landscape). Two-layer fix:

1. **iPad-18 (`59c78fd`)** — CSS: `.ambient-scroll-inner` now uses
   `position:absolute; top:0; right:0; bottom:0; left:0; display:block;
   overflow-y:auto`. Inset positioning gives iOS Safari a determinate
   height before overflow:auto activates — bypasses the flex-height
   resolution bug that broke the prior inner-div attempt (iPad-11).
2. **iPad-19 (`41bb8df`)** — JS: `renderAmbientPanel()` saves
   `.ambient-scroll-inner.scrollTop` before the innerHTML write and
   restores it after. Without this, the 15-30s ESPN poll cycle yanked
   the reader back to scrollTop=0 mid-read.

`#ambient-panel` stays `position:fixed` per Rule 9 / CLAUDE.md Rule 9.
No body-level layout change. Documented in `docs/AMBIENT-SCROLL-SPEC.md`
(`What Worked` section).

Bug 6 in `docs/IPAD-REGRESSION-FIXES.md` marked RESOLVED.

## iPad regression sweep (June 14 2026 — main)
Executed `docs/IPAD-REGRESSION-FIXES.md` after the viewport v4 build
shipped regressions on iPad. Five bugs, one commit per fix:
1. **iPad-1** (`18c0775`): viewport-aware tap routing — openBottomSheet
   early-returns to a scroll-into-view + inline-expand fallback at ≥820.
2. **iPad-2** (`7f247c5`): `_expandedCards` Set + `_restoreCardExpandState()`
   hook into renderAll so expand state survives the 20-45s poll cycle.
3. **iPad-3** (`6346e47`): `contain:layout style` + `overflow-anchor:auto`
   on `.games-list` and `.game-card` to stop per-card height changes from
   rippling into ancestor scroll position.
4. **iPad-4** (`3cf273f`): 44px tap floor on `.desk-jump-link` /
   `.jrn-nav-link` / `#wc-nav-link` at ≤1199 + defensive hide of
   `.bottom-sheet-overlay` above 820.
5. **iPad-5** (`2f075d6`): hover styles gated behind `@media (hover: hover)`
   + `touch-action:manipulation` on nav links — kills the iOS sticky-hover
   double-tap.

Five new smoke assertions A593-A597. Two existing assertions updated
(A406 / A583).

## What shipped today (June 14 2026)

### Chat-driven builds (13 commits to main)
1. NBA post-game brief pipeline (relay + client)
2. NHL post-game brief pipeline (relay + client)
3. Live in-play odds — all 8 spec steps (relay + client)
4. Temporal polyfill (fieldNowET + fieldDatesToQuery)
5. Claude Code infrastructure (CLAUDE.md, SessionStart hook, Codespaces)
6. ADR-002 context document (docs/ADR-002-CONTEXT.md)
7. Viewport v4 spec + build plan (docs/VIEWPORT-V4-SPEC.md, docs/VIEWPORT-BUILD-PLAN.md)

### Claude Code builds (branch merged to main)
8. ADR-002 refactor — 16 commits:
   - Foundation: fieldGameTier + fieldTierRank + fieldTierLabel + leagueImportanceTier
   - 3 CRITICAL: raw drama numbers removed from DOM (Double Feature, Halftime Switch, RightNow)
   - 7 HIGH: hardcoded composite thresholds replaced with named tiers
   - 2 MODERATE: Drama Dial paths migrated to categorical
   - 1 LOW: polling cadence by aggregate tier
9. Viewport v4 build — 12 commits:
   - Typography migration: Chakra Petch + DM Sans (replaces Playfair/Barlow)
   - Breakpoints: explicit P1/P2/P3 + T1/T2 orientation gates
   - Bottom sheet gated to phone-only
   - Card tiering classes (featured/standard/compact)
   - Journalism brief MID tier (2-line)
   - Sport stripe tokens + SPORT_COLORS refactor (NHL hex fixed)
   - 44px touch targets
   - CompactGrid 3-col at 1440 (was 1800)
   - --caution token defined (was broken on live)
   - COLOUR-SYS-A + motion/opacity + typography role token foundation

## Relay commits (field-relay-nba)
- NBA brief pipeline, NHL brief pipeline, live odds (4 commits)

## Stats
- Smoke: 550 → 635 (+85 assertions, 0 failures)
- Client commits: 13 (chat) + 28 (Claude Code) = 41
- Relay commits: 4
- SW_VERSION: 2026-06-13h → 2026-06-14g

## Open items
- [ ] Dixon-Coles BLEND mode for soccer WP (~45 min)
- [ ] Viewport artifact v4 (React visual, ~120 min TYPE D)
- [ ] V5 brief MID tier fires at 600-819, not full 414-819 (existing 600px hide rule)
- [ ] V6 visual deltas: legacy --c-* tokens retain old hex values
- [ ] V10-V12 tokens are scaffold only (not consumed by CSS yet)
- [ ] Follow-up grep for hidden composites
- [ ] web-push-browser (~120 min)
- [ ] winkNLP JQ Gate pre-filter (~60 min)
- [ ] Design system BUILD (~110 min)
- [ ] xG model pipeline
- [ ] WC knockout prep (groups end June 27)
- [ ] Wimbledon draw (before July 7)
