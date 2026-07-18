# CC-CMD — Real browser verification: Debrief card render + Gap 12 offline cache

**Date:** 2026-07-18
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly if any real code fix is needed. No PRs.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }; git log --oneline -5

---

## CONTEXT

The entire ID-resolution chain (client `contextId` fix, relay `espn:` prefix bridge, relay `findGame` UNION ALL fix, relay `findBriefs` ESPN-event-ID bridge) is now independently verified correct at the API level — a direct probe of `/context/game/espn:401857076` (WNBA Mercury/Sun, real final game, `drama_peak=52`) returns real `game` data and a real, populated `archive.gameBriefs[0].brief_text`.

**What has never been directly confirmed: that this real data actually renders correctly as a visible Debrief card in the real, deployed PWA.** Every prior check tonight was API-level (`curl`, D1 queries) or static code inspection — no one has actually looked at the rendered page.

Real, confirmed test case: game ID `WNBA_2026-07-17_mercury_sun`, client-side `_gameId` would be `espn:401857076`.

**Separately, Gap 12 (offline Debrief caching via the Cache API) has real code shipped and independently verified via static inspection, but its actual browser-runtime behavior (does a cached Debrief genuinely survive a real page reload while offline) has never been tested — this also requires real browser automation, not a sandbox HTTP probe.**

---

## TASK 1 — Real, visual confirmation of a rendering Debrief card

Using real browser automation (Playwright, matching the existing CI capability referenced in `Browser runtime tests (Playwright)`):

1. Navigate to the real, live deployed app
2. Locate the real game card for `WNBA_2026-07-17_mercury_sun` (may require navigating to July 17's date)
3. Wait for `injectDebriefCards`'s real 600ms-post-render cycle (or the SSE-triggered path) to complete
4. Take a real screenshot of the rendered card
5. Confirm, from the real screenshot or real DOM inspection: `.card-debrief` is visible (not `display:none`), and contains real, readable text matching the known brief content ("Connecticut holds a 54-37 halftime lead...")

Report the real, literal outcome — if the card doesn't render as expected, describe exactly what's visible instead (empty, wrong content, still showing pre-game state, etc.) rather than a pass/fail summary alone.

## TASK 2 — Real Gap 12 offline-survival test

1. Load the real, live app in a real browser context, allow a final game's Debrief card to genuinely inject (confirming the real Cache API write happens — check via `caches.open('field-debriefs').then(dc => dc.keys())` in the real browser console, or Playwright's equivalent)
2. Set the browser context to offline (Playwright supports this directly — `context.setOffline(true)`)
3. Reload the page
4. Confirm: the previously-cached Debrief card still renders with real content, without a network error

Report the real, literal result of each step.

## TASK 3 — If either test reveals a real bug

Fix it as a real, direct, minimal change — matching tonight's established discipline (find the precise root cause via direct inspection, don't guess, verify the fix against the same real failing case).

---

## DONE CONDITION

Real, visual/DOM-level confirmation (not just API-level) that a real Debrief card renders correct content for a real final game, and that Gap 12's offline cache genuinely survives a real reload — both via actual browser automation, with real screenshots/DOM state reported, not assumed from the already-verified API chain alone.

**Confidence scoring:**
- TASK 1 (50 pts): real visual/DOM confirmation of correct Debrief rendering, literal outcome reported
- TASK 2 (35 pts): real offline-survival test via actual browser automation, literal outcome reported
- TASK 3 (15 pts): any real bug found is fixed and re-verified against the same case

Do not commit unless confidence >= 95 (if a code fix is needed). If no code fix is needed, report the real verification outcome directly.
