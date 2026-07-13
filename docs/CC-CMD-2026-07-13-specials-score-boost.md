# Claude Code Command — Boost MEDIA_SPECIALS cards within the existing media-grid sort, not a section move

**Date:** 2026-07-13
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.
**Scope:** tag specials cards + one new scoring rule in the existing scoreSMTCard() function. Zero new DOM elements, zero new render calls, zero section reordering.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO — this CC-CMD targets jubilant-bassoon"; exit 1; }; git pull.

Write findings to outbox/specials-score-boost-2026-07-13.md.

## CONTEXT — real, confirmed problem and a deliberately narrow fix

`renderMedia()` merges 6 card sources into one grid (`baseCards`, `specialCards` from MEDIA_SPECIALS, `playoffCards`, `wcCards`, `pregameCards`, `postgameCards`), then sorts the merged result via `scoreSMTCard(card)`. Read fresh, confirmed: that function gives MEDIA_SPECIALS-sourced cards zero inherent boost — they only outrank routine content if `isShowCurrentlyAiring()` happens to be true (+100). A special event hours before its start time (e.g. tonight's Home Run Derby, still hours from its 8 PM start when checked earlier today) scores at or near 0, sorting behind whatever routine show happens to be airing.

**Explicitly not in scope, per direct confirmation:** moving `media-section` itself in the DOM, or building any new container/render path for specials specifically. This is a targeted sort-order fix within the existing grid, not a layout change — specials should surface first within the media section, not be pulled out of it or have the whole section repositioned.

## TASK 0 — Probe

Read `renderMedia()` and `scoreSMTCard()` fresh (line numbers may have shifted). Confirm the real, current shape of `specialCards` construction (`MEDIA_SPECIALS.filter(...).map(s => s.card)`) and confirm no existing property on these card objects already distinguishes them from the other 5 sources (don't assume — check for something like `card._source` that might already exist before adding a new one).

## TASK 1 — Tag specials cards

In `renderMedia()`, when building `specialCards`, attach a small flag to each card object (e.g. `card._isSpecialEvent = true`) — additive, doesn't change any existing card property, matching the same minimal-tag pattern already used elsewhere in this file (e.g. the `data-show` attribute added to `.media-card` earlier this session).

## TASK 2 — Boost in the existing scorer

Add one rule to `scoreSMTCard()`: `if (card._isSpecialEvent) score += 50;` (or a value you determine is actually correct after reading the function's other boost magnitudes fresh — 50 sits above the existing phase-boost (+20) and network-boost (+15) values but below "currently airing" (+100), so a special event outranks routine content but doesn't override something that's live right now; confirm this reasoning holds against the real, current values rather than assuming this doc's numbers are still accurate). Zero changes to any other scoring rule.

## TASK 3 — Verify

- `node smoke.js` clean.
- Real check: with today's real MEDIA_SPECIALS entry (Home Run Derby) present and nothing else currently airing, confirm it now sorts to position 1 (or correctly below something genuinely live, if anything is) in the rendered `media-grid` — real assertion against real render output, not just code review.
- Confirm a day with no active MEDIA_SPECIALS entry renders identically to before this change (zero behavior change when there's nothing to boost).
- Confirm zero change to `media-section`'s DOM position, zero new elements added to the page.

## DONE CONDITION

MEDIA_SPECIALS cards sort to the top of the existing media-grid when active, using the existing scoring mechanism. No DOM restructuring, no new render paths, zero impact on days without an active special.

**Confidence scoring:**
- TASK 0 confirms real current structure, no duplicate tagging (25 pts)
- TASK 1 correct, minimal, additive tag (25 pts)
- TASK 2 correct boost value reasoned against real current scoring magnitudes, not guessed (25 pts)
- TASK 3 real render-output verification, confirmed zero-change on non-special days, zero DOM/layout changes (25 pts)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
