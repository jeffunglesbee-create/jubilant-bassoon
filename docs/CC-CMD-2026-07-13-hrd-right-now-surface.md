# Claude Code Command — Surface Home Run Derby in the Right Now section (top of page)

**Date:** 2026-07-13
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.
**Scope:** one small, additive injection hook inside renderRightNow(). Reuses all existing HRD data/bracket logic from tonight's live-wiring work — zero new data fetching, zero new infrastructure.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO — this CC-CMD targets jubilant-bassoon"; exit 1; }; git pull.

Write findings to outbox/hrd-right-now-surface-2026-07-13.md.

## CONTEXT — real problem, confirmed via direct DOM-order read

The HRD bracket card (built tonight — `loadHRDBracket()`/`renderHRDBracket()`/`injectHRDBracket()`) only surfaces in `#media-section`, which is the 6th section in real page DOM order (after Right Now, the main schedule desk, Journalism, World Cup, Pick'em) and is lazy-loaded via IntersectionObserver — it doesn't even render until a user scrolls that far. For a same-night, 8 PM ET event, that's genuinely too buried.

`#field-right-now` (`#rn-cards`) is the actual first section on the page, confirmed via its own comment: *"Right Now section — surface highest-drama game above schedule on phones."* This is the real, existing, near-top-of-page surface.

**Why this isn't a simple DOM move or a "make HRD a game object" fix:**
- `renderRightNow()` fully overwrites `#rn-cards`' innerHTML on every call (confirmed via direct read) — a one-off DOM insert would be wiped on the next refresh cycle.
- `selectRightNowGames()` ranks real game objects by a real drama-tier algorithm (ADR-002, `fieldGameTier`/`fieldTierRank`) — HRD is not a game object and forcing it through this selection logic would be a real, unjustified architectural distortion, not a genuine fit.
- `renderRightNow()` is called from two separate places (a score-only refresh path and a fuller filtered-render path) — the hook needs to live inside `renderRightNow()` itself so it fires regardless of which call site triggered the refresh, not duplicated at both sites.

**The actual novel fix: reuse, don't rebuild.** All the real data-fetching and bracket-rendering logic (`loadHRDBracket()`, `renderHRDBracket()`, the 90s poll loop, `window._hrdDataCache` populated by `injectHRDBracket()`) already exists and works from tonight's earlier CC-CMD. This task adds one small render-target function that takes the *already-computed* bracket HTML and prepends it into `#rn-cards`, called from inside `renderRightNow()` so it survives every refresh — not a second data pipeline, not a new polling mechanism, not a fake game object.

## TASK 0 — Probe

Read `renderRightNow()`, `injectHRDBracket()`, and `window._hrdDataCache`'s real current state fresh — confirm exactly what's available to reuse and its real current shape (don't assume from this doc's description, this file changes fast). Confirm `_hrdPollLoop()`'s real gating condition (`TODAY_ISO === '2026-07-13'` and event-state check) so the new Right Now card can mirror the same show/hide lifecycle rather than inventing a new one.

## TASK 1 — Build and wire the hook

A small function (e.g. `renderHRDRightNowCard()`) that: returns empty/no-op if today isn't 2026-07-13 or if `window._hrdDataCache` has no data yet (graceful — don't block on HRD data being ready). Otherwise builds a compact card (visually distinct from a `.rn-card` game card, since it isn't one — but matching the section's real visual language, not inventing a new one) using the already-computed bracket state, and prepends it into `#rn-cards` before `renderRightNow()`'s own game cards. Call this new function from inside `renderRightNow()` itself, near its own end (after the existing game-card `container.innerHTML` assignment, before `indexRightNow()`), so it fires on every real refresh without touching either of the two existing call sites or `selectRightNowGames()`'s own logic at all.

Card should update live as `injectHRDBracket()`'s poll loop refreshes `window._hrdDataCache` — confirm this happens naturally (since `renderRightNow()` already gets called on a real refresh cycle) rather than needing a second timer.

## TASK 2 — Verify

- `node smoke.js` clean.
- Real check: with `TODAY_ISO` mocked to `2026-07-13` and `window._hrdDataCache` populated with real bracket data (from `docs/hrd-api-response-reference-2026-07-13.json` or a live fetch if reachable), confirm the card actually renders inside `#rn-cards`, appears before existing game cards, and updates when the cache updates.
- Confirm zero regression to `selectRightNowGames()`/existing game-card rendering — real games still render correctly, `rn-featured` marking on the schedule still works.
- Confirm the card correctly disappears (or never appears) on a mocked different date, or when `window._hrdDataCache` is empty — no broken/empty card state.

## DONE CONDITION

HRD bracket state visible near the top of the page (inside Right Now) using only already-built data/render logic, correctly time-gated, zero regression to existing Right Now game behavior.

**Confidence scoring:**
- TASK 0 confirms real current state of all reused pieces, real gating logic (25 pts)
- TASK 1 correct, minimal, hooks inside renderRightNow() once (not duplicated at call sites), reuses existing data with zero new fetching (40 pts)
- TASK 2 real verification of rendering, live updates, and zero regression to existing Right Now behavior (35 pts)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
