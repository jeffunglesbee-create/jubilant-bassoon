# iPad Regression Fix Spec — Post-Viewport Build (Updated)

## Status
- iPad-1 through iPad-5: SHIPPED (Claude Code, commits 18c0775–2f075d6)
- V3/iPad-1 routing: REVERTED (bottom sheet restored, commit 4e60b6e)
- Path B (ambient panel injection): SPECCED below, not yet built
- Screenshot bugs: SPECCED below, not yet built

---

## Completed fixes (do not re-implement)
- iPad-2: _expandedCards Set persists expand state across re-renders
- iPad-3: contain:layout style + overflow-anchor on .games-list/.game-card
- iPad-4: 44px tap floor on nav links (desk/journal/groups) at ≤1199
- iPad-5: hover styles wrapped in @media(hover:hover) + touch-action:manipulation

## Reverted (intentionally)
- V3 bottom sheet CSS gate (was @media(min-width:820px){.bottom-sheet{display:none}})
- iPad-1 JS routing (openBottomSheet early-return at ≥820)
- Reason: ambient panel injection (Path B) not built yet. Bottom sheet is the
  only game-detail surface. Hiding it with no working replacement = regression.
- _openGameSheetTablet function PRESERVED as dead code for Path B.

---

## Path B: Ambient Panel Injection (future build)

### What it is
When a user taps a game card on iPad (820-1199px), instead of opening the
bottom sheet, inject that game's details into the ambient panel. This is
the spec's intended T1/T2 routing (VIEWPORT-V4-SPEC.md lines 68-73).

### Architecture
1. Extract bottom sheet content builder (~line 34280 in index.html) into a
   shared function: `_buildGameDetailHTML(gameId)` → returns HTML sections
   (brief, streams, standings, drama arc, series context, pin/share buttons)
2. Create `_injectGameToAmbient(gameId)`:
   - Calls _buildGameDetailHTML(gameId)
   - Wraps content in ap-card styling (matching existing ambient panel cards)
   - Injects at TOP of #ambient-panel (above Live scores)
   - Scrolls panel to top to show injected content
   - Adds a dismiss button that removes the injection and restores general view
3. Re-enable iPad-1 routing in openBottomSheet:
   - Uncomment the `if (window.innerWidth >= 820)` check
   - Change `_openGameSheetTablet(gameId)` to `_injectGameToAmbient(gameId)`
4. Re-enable V3 CSS gate:
   - Add back `@media(min-width:820px){.bottom-sheet,.bottom-sheet-overlay{display:none !important}}`
5. Update smoke assertions A583, A593, A596 back to gate-checking

### Dependencies
- Ambient panel must be scrollable first (see Bug 6 below)
- renderAmbientPanel() must not clobber the injected game card on re-render

### Estimated effort: ~45 min

---

## Remaining bugs from screenshots (June 14 4:21 PM)

### Bug 6: Ambient panel not scrollable (clipped brief)
**Symptom:** Game Recap card clips at "late tension. Washi..." — content below
viewport is inaccessible. No scroll on the ambient panel.
**Root cause:** `position:fixed` + `overflow-y:auto` on iOS Safari needs
`-webkit-overflow-scrolling:touch`. Flex children lack `min-height:0`.
**Fix:**
1. Add `-webkit-overflow-scrolling:touch` to #ambient-panel iPad override
2. Add `min-height:0` to all direct children of #ambient-panel
3. Verify panel scrolls on iPad portrait AND landscape
**Commit:** `fix(iPad-6): ambient panel scrollable on iOS Safari`

### Bug 7: AI refusal text exposed to user (CRITICAL)
**Symptom:** FIELD SERIES BRIEF for SCF Game 6 shows Haiku's raw refusal:
"I appreciate the detailed framework, but I need to flag a critical issue..."
followed by "Which approach do you prefer?" This appears both on the game card
and in the Journal J2 Series Preview view.
**Root cause:** The compound editorial prompt sends sport-generic exemplars
(NBA PPG, MLB ERA) regardless of sport. For NHL, the model has no hockey stats
to verify against and correctly refuses to fabricate. The JQ Gate has no filter
for model refusals — the raw meta-commentary reaches the user.
**Fix (two parts):**
1. JQ Gate refusal filter: detect patterns like "I appreciate the detailed
   framework", "I need to flag", "Which approach do you prefer", "I cannot write",
   "I can write this brief in two ways". If detected, suppress the output and
   fall back to a factual-only brief: "{Away} @ {Home} · {league} · {series/context}"
2. Sport-specific exemplars: the prompt's exemplar section should match the
   sport being briefed. NHL games get hockey exemplars, not NBA/MLB ones.
**Commit:** `fix(iPad-7): JQ Gate refusal filter + sport-specific exemplars`

### Bug 8: Team names showing as "W" in ambient panel
**Symptom:** Two live scores show "W 43-35 W" and "W 52-42 W" instead of
team names. Likely WNBA games.
**Root cause:** `teamNick()` or tricode lookup returns first character of
team name when no short-name mapping exists for WNBA teams.
**Fix:** Add WNBA team entries to the teamNick/tricode mapping. At minimum:
Aces, Dream, Fever, Liberty, Lynx, Mercury, Mystics, Sky, Sparks, Storm, Sun, Wings.
**Commit:** `fix(iPad-8): WNBA team name mappings for ambient panel`

### Bug 9: U.S. Open venue mismatch
**Symptom:** Card header says "Shinnecock Hills Golf Club" but brief text says
"Oakmont Country Club." Venue in brief contradicts structured data.
**Root cause:** Either stale cached brief or AI hallucination. The 2026 U.S. Open
venue needs verification — search before fixing.
**Fix:** Verify 2026 U.S. Open venue. If cached brief is wrong, invalidate cache
key. If the brief is being generated with wrong context, fix the prompt's venue
injection.
**Commit:** `fix(iPad-9): U.S. Open venue verification + cache invalidation`

---

## Build order
1. Bug 6 (ambient panel scrollable) — prerequisite for Path B
2. Bug 7 (AI refusal filter) — CRITICAL user-facing issue
3. Bug 8 (WNBA team names) — quick fix
4. Bug 9 (U.S. Open venue) — needs web search verification
5. Path B (ambient panel injection) — depends on Bug 6

## Rules
- One commit per fix
- Smoke must pass after each commit
- Test iPad portrait AND landscape
- Do NOT re-gate the bottom sheet until Path B is verified working
