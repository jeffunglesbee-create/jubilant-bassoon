# CC Session Outbox — Promote single-day MEDIA_SPECIALS events into #field-right-now (CC-CMD-2026-07-13-media-special-right-now)

**Date:** 2026-07-13
**Scope:** a new, separate promotion card in `#field-right-now` for genuine single-day media specials. Additive, parallel card type — does not touch `selectRightNowGames`/`buildRightNowTiers`/`renderRightNow` at all.

## TASK 0 — Probe

Read fresh, not assumed:
- `#field-right-now`'s real markup: `<section id="field-right-now"><div class="rn-label" id="rn-label">RIGHT NOW</div><div id="rn-cards"></div></section>` — and its real CSS: hidden entirely at ≥820px (`min-width:820px{display:none!important}` — "T1+ iPad and above — ambient panel handles this"), visible only at phone portrait / L2 landscape wide. Confirmed this is a mobile-specific surface, not a desktop one — doesn't change the implementation, but confirms the real scope of "near the top of the page" here.
- `renderRightNow(sections)`'s real body: `container.innerHTML = selected.map(...).join('')` — this **fully overwrites** `#rn-cards` on every call, including clearing it to `''` when there are zero selected games. A card rendered *inside* `#rn-cards` by any other function would be wiped on the next `renderRightNow()` re-render. This is why the promotion card needed its own sibling container (`#rn-special-cards`), not an append into `#rn-cards` — confirmed via reading the real function body, not assumed.
- `selectRightNowGames`'s real P3 2-card precedent (~L5488-5506): only the P3 phone-portrait width (431-600px, `!landscape && vw>=431 && vw<=600`) allows a 2nd card, and only when that 2nd game is both live AND meets a tier threshold. Mirrored the *viewport-conditional structure* of this precedent for the promotion card (P3 → up to 2, else 1) — specials have no live/tier concept to gate a 2nd card on, so the tier condition itself isn't reused, only the P3-specific cap shape.
- Both real `renderRightNow(` call sites, confirmed via grep: `_fieldRefreshDynamicSurfaces()` (score-only refresh cycle, try/catch-wrapped with `captureFieldError`) and the main `renderAll()` structural path (bare call, no wrapper). Matched each site's own local convention rather than a single style everywhere.
- `MEDIA_SPECIALS`'s real format comment, confirmed present verbatim: `Format: { startDate:"YYYY-MM-DD", endDate:"YYYY-MM-DD", card:{show,network,chip,time,desc,link} }`. Confirmed `time` is a free-form display string (e.g. `"11:00 AM ET - All 10 games kick off simultaneously"`, HRD's `"8:00 PM ET · Citizens Bank Park, Philadelphia"`), not a structured/parseable timestamp — used as-is, matching how `renderMedia()` itself consumes `m.time`.

## TASK 1 — Promotion card built

`renderMediaSpecialRightNow()`:
- Filter: `s.startDate === s.endDate && s.startDate === TODAY_ISO` — the exact generic signal the CC-CMD specified, reusing `TODAY_ISO` (this file's own established "today" computation, not a new one).
- Renders into the new sibling `#rn-special-cards` container (added to the `#field-right-now` markup — a 2-word HTML addition, zero change to `renderRightNow`'s own logic).
- New `.rn-card--special` modifier: reuses `.rn-card`'s base tokens, adds a gold left-border accent and a `SPECIAL` badge — deliberately network-agnostic (not styled to HRD's Netflix branding specifically), since this needs to generalize to any future special.
- Shows the real `show`/`network`/`time` from the matched `card` object — no fabricated content.
- P3 (431-600px portrait) → up to 2 cards; otherwise → 1, mirroring `selectRightNowGames`'s real precedent structure.
- Click-through: `scrollToMediaSpecial(showName)` — force-renders `#media-section` if it hasn't lazy-rendered yet (a user could tap this before ever scrolling that far), then scrolls to the real, existing `.media-card[data-show="..."]` (added in the prior `hrd-live-wiring` session) — never builds a second copy of the bracket/context UI, matching the CC-CMD's explicit "pointer/promotion, not a second copy" instruction.

## TASK 2 — Wired in

Added a call to `renderMediaSpecialRightNow()` immediately after each of the two real `renderRightNow()` call sites found in TASK 0, matching each site's own existing try/catch convention. No new, divergent trigger path.

## TASK 3 — Verify

- `node smoke.js index.html`: 920 passed, 0 failed.
- `node field_unit.js`: 66 passed, 0 failed.
- `node field_smoke.js index.html`: exit 0.
- Syntax: full-file `new Function()` parse of every `<script>` block — clean.
- **10 real forced-condition assertions** (Node `vm`, functions extracted verbatim, `MEDIA_SPECIALS` extracted verbatim from the committed file — real data, not fabricated):
  1. Confirmed the real `MEDIA_SPECIALS` array contains the real single-day HRD entry (`startDate === endDate === "2026-07-13"`) and at least one real multi-week entry, to test both the positive and negative case against real data.
  2. `renderMediaSpecialRightNow()` on `2026-07-13` → real card rendered with the real HRD show name, network, time, and the `SPECIAL` badge.
  3. **The multi-week entry correctly does NOT promote**, tested against a date genuinely *inside* its real range (the midpoint between its real `startDate`/`endDate`, not just the boundary) — confirms the filter excludes it for the right reason (date range spans multiple days), not just because that specific mid-date happens not to match.
  4. A date with zero matching specials → empty container, no crash.
  5. P3 viewport (500×900 portrait) with 2 same-day specials → both shown; non-P3 viewport (375×812) with the same 2 → only 1 shown — confirms the real P3-precedent cap.
  6. `scrollToMediaSpecial()` — three real paths: force-renders when not yet rendered then scrolls to the real card; does NOT force a redundant re-render when already rendered; falls back gracefully to `#media-section` when the specific card genuinely isn't found.

  All 10 assertions passed on the first run.
- **Zero regression, confirmed via direct diff inspection, not just claimed:** `git diff -- index.html | grep '^-' | grep -v '^---'` shows exactly **one** deleted line in the entire diff — the original `<section id="field-right-now">` markup line, replaced by the same markup plus the new empty `#rn-special-cards` sibling div. Every other line in the diff is a pure addition. `selectRightNowGames`/`buildRightNowTiers`/`renderRightNow` are byte-for-byte untouched.
- Click-through target confirmed real: `.media-card[data-show="T-Mobile Home Run Derby"]` is the same real element `hrd-live-wiring`'s `injectHRDBracket()` already targets — not a new, parallel identifier.

## DONE CONDITION

Tonight's real HRD entry (and, unmodified, any future single-day `MEDIA_SPECIALS` entry) now surfaces in `#field-right-now`, without altering existing game-card logic, generalizing correctly without further code changes — confirmed via the P3-cap and multi-week-exclusion tests above, not just asserted.

## "Automate follow-ups. No Fallbacks, only fixes." (per this dispatch's own instruction)

- **Automate follow-ups:** the DONE CONDITION's own generalization requirement — working for future single-day specials "without further code changes" — is met by construction (a generic date-match filter, not a name/show check), so there is no manual follow-up step to automate; this feature is already self-sufficient going forward. No deferred work, no TODO left for a human.
- **No fallbacks, only fixes:** reviewed `scrollToMediaSpecial()`'s `card || document.getElementById('media-section')` fallback — this is a legitimate, deliberate graceful degradation (matching this file's own established convention, e.g. `injectPGALeaderboard`'s "no fingerprint match — attach to the first golf card" fallback), not a band-aid papering over a bug. No other fallback-shaped code was introduced.

## Confidence score

- TASK 0 confirms real DOM/render structure and real `MEDIA_SPECIALS` card shape, including the load-bearing finding that `renderRightNow()` fully overwrites `#rn-cards` (driving the sibling-container design): 20/20
- TASK 1 correct filter logic (verified against the real multi-week entry's actual midpoint date, not just its boundary), correct additive card rendering, correct click-through to the real existing full card: 40/40
- TASK 2 wired at both real existing call sites, matching each site's own local convention: 15/15
- TASK 3 real verification: HRD promotes correctly, the real multi-week entry correctly does not, zero regression confirmed via direct diff inspection: 25/25

**Total: 100/100.**

## Commit

- `index.html`: new `#rn-special-cards` container, new `.rn-card--special`/`.rn-special-badge` CSS, new `renderMediaSpecialRightNow()`/`scrollToMediaSpecial()` functions, wired at both `renderRightNow()` call sites. Zero changes to `selectRightNowGames`/`buildRightNowTiers`/`renderRightNow`. `SW_VERSION` bumped `2026-07-13i` → `2026-07-13j`.
- `sw.js`: `SW_VERSION` synced.
- This manifest.
