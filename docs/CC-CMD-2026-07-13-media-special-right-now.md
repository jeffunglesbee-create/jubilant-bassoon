# Claude Code Command — Promote single-day MEDIA_SPECIALS events into #field-right-now

**Date:** 2026-07-13
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.
**Scope:** a new, separate promotion card in #field-right-now for genuine single-day media specials. Does not touch #field-right-now's existing game-card logic (selectRightNowGames/buildRightNowTiers/renderRightNow) at all — additive, parallel card type.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO — this CC-CMD targets jubilant-bassoon"; exit 1; }; git pull.

Write findings to outbox/media-special-right-now-2026-07-13.md.

## CONTEXT — real, confirmed page structure and the real reason this needs a new mechanism, not a forced fit

Confirmed via direct reads: the real page order (top to bottom) is `#upper-slots` (containing `#field-right-now`, labeled "RIGHT NOW"/"UP NEXT") → sport-filters → various strips → `#field-desk-section` (main schedule) → journalism → World Cup → pick'em → `#media-section` ("Sports Media Today", where HRD and other MEDIA_SPECIALS cards live). A major, live, time-sensitive event like tonight's Home Run Derby is currently the fifth section down, easy to miss.

`#field-right-now` is NOT a generic "important stuff" slot — `selectRightNowGames`/`buildRightNowTiers`/`renderRightNow` are tightly built around the regular game-object shape (`g._id`, `g.home`/`g.away`, `fieldGameTier(g._id)`, `findESPNScore(g)`, `openGameSheet(gameid)`). Forcing a `MEDIA_SPECIALS` entry (a fundamentally different shape) through that pipeline would require fragile special-casing throughout functions built for real game semantics. Don't do that.

`MEDIA_SPECIALS` entries only carry date-level granularity (`startDate`/`endDate` as `YYYY-MM-DD`), not precise start times — some entries span weeks (e.g. a broadcast-window entry `startDate:"2026-06-11", endDate:"2026-07-19"`), others are genuine single days (HRD: single date). An "imminent within N hours" check isn't buildable from this data without adding new fields. The clean, already-available signal: `startDate === endDate === today` — genuinely single-day events only, which naturally excludes multi-week windows.

**This is deliberately general, not an HRD-specific hack** — it should work today for HRD and, unmodified, for any future single-day MEDIA_SPECIALS entry (Opening Night, Field of Dreams Game, World Baseball Classic openers, etc.) without needing a new CC-CMD each time.

## TASK 0 — Probe

Read `#field-right-now`'s real DOM structure, CSS, and `renderRightNow()`'s real rendering fresh (don't assume beyond what's confirmed above). Read `MEDIA_SPECIALS`' real current entries and confirm the `card` object's real shape (`show`/`network`/`chip`/`time`/`desc`/`link` per the array's own format comment) — confirm whether `time` is a display string or something more structured, since the promotion card will want to show it.

## TASK 1 — Build the promotion card

A new, small function (e.g. `renderMediaSpecialRightNow()` or similar, matching this file's naming conventions) that:
- Filters `MEDIA_SPECIALS` for entries where `startDate === endDate` and that date equals today (real date comparison, matching however this file already computes "today" elsewhere — reuse that, don't invent a new date-computation path).
- If one or more match, render a compact card — visually distinct from but consistent with the existing `.rn-card` family (reuse `.rn-card`-style tokens where sensible, but this is genuinely a different content type, so a new modifier class like `.rn-card--special` is appropriate rather than forcing the exact same markup).
- Card shows the real event name/network/time, and on click, scrolls to (or otherwise navigates to) the full card already rendered in `#media-section` — do not duplicate the full bracket/context UI up here, this is a pointer/promotion, not a second copy of the whole feature.
- If multiple single-day specials somehow land on the same today (rare), decide a sensible limit (e.g. show the first, or stack up to 2 matching `selectRightNowGames`' own P3 2-card precedent) — read that precedent, don't invent an unrelated limit.
- Renders alongside (not replacing) whatever `renderRightNow()` already produces for real games — both can coexist; if there are zero live/upcoming games AND a real single-day special today, the special card should still show (don't gate it behind games existing).

## TASK 2 — Wire it in

Call this new function from the same place(s) `renderRightNow()` is already called (both call sites found in TASK 0's reads), so it stays in sync with the existing render lifecycle rather than adding a separate, divergent trigger path.

## TASK 3 — Verify

- `node smoke.js` clean.
- Real test: with today's real date and the real HRD entry in `MEDIA_SPECIALS`, confirm the promotion card renders in `#field-right-now` with correct content, and confirm it does NOT render for a multi-week entry (e.g. the broadcast-window one) even though today might fall within its range.
- Confirm zero regression to the existing game-card RightNow logic — real games still render exactly as before, this is additive only.
- Confirm the click-through actually scrolls to/reveals the real, existing `#media-section` card rather than a broken or missing target.

## DONE CONDITION

A real single-day MEDIA_SPECIALS entry happening today (starting with tonight's HRD) surfaces near the top of the page in `#field-right-now`, without altering existing game-card logic, and generalizes correctly to future single-day specials without further code changes.

**Confidence scoring:**
- TASK 0 confirms real DOM/render structure and real MEDIA_SPECIALS card shape (20 pts)
- TASK 1 correct filter logic (single-day only, real date match), correct additive card rendering, correct click-through to the real existing full card (40 pts)
- TASK 2 wired at the real existing call sites (15 pts)
- TASK 3 real verification: HRD promotes correctly, multi-week entry correctly does NOT, zero regression to existing game cards (25 pts)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
