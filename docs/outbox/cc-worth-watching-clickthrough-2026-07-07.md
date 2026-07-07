# CC Session Outbox — Worth Watching Click-to-Scroll (CC-CMD-2026-07-07-worth-watching-clickthrough)

**Date:** 2026-07-07
**Scope:** `docs/CC-CMD-2026-07-07-worth-watching-clickthrough.md` — make
each `.ww-row` clickable, scrolling to the matching card with a brief
flash. This is the third attempt at this CC-CMD: correctly declined
twice earlier (v2/`.ww-row` wasn't live yet), now unblocked since
`worth-watching-display` (v2) shipped.

## PROBE BLOCK

`.ww-row`, `.ww-tier-badge`, `.ww-matchup` all confirmed live
(`index.html:472-474`). `@keyframes scoreFlash` confirmed at
`index.html:709`. The existing click-to-scroll precedent
(`index.html:13301`, Scout's Pick desk card) confirmed matching:
`onclick="(()=>{const c=document.querySelector('[data-gameid=\"${topPick._id||''}\"]');if(c)c.scrollIntoView(...)`.

## CRITICAL FINDING — the CC-CMD's literal ID-matching approach is non-functional, verified via real testing

Implemented the CC-CMD's literal code sample first (matching
`bundle.pick.ranked[].game_id` against `[data-gameid="..."]`), then, per
its own explicit verification requirement ("confirm the page ACTUALLY
scrolls... report the ACTUAL observed behavior, not a hypothetical"),
tested it against the real, live app before committing.

**Result: 0/5 real matches.** Fetched the live relay bundle
(`/analytics/newspaper/2026-07-07`) and cross-referenced its 5 real
`pick.ranked[]` entries against the actual rendered cards on the live
page:

| Relay `game_id` | Relay teams | Real matching card (by team name) | Match by `game_id`? |
|---|---|---|---|
| `MLB_2026-07-07_reds_phillies` | Reds/Phillies | `data-gameid="g24"` | **No** |
| `MLB_2026-07-07_padres_diamondbacks` | Padres/Diamondbacks | `data-gameid="g29"` | **No** |
| `MLB_2026-07-07_giants_bluejays` | Giants/Blue Jays | `data-gameid="g30"` | **No** |
| `MLB_2026-07-07_cardinals_brewers` | Cardinals/Brewers | `data-gameid="g17"` | **No** |
| `MLB_2026-07-07_mets_royals` | Mets/Royals | `data-gameid="g25"` | **No** |

Every one of today's real ranked games genuinely exists on the page —
but the relay's `game_id` scheme (`SPORT_date_awayteam_hometeam`-style
composite string) shares no namespace with the client's own internal
`data-gameid` values (`g17`, `g24`, etc.). As specified, this feature
would have silently failed on **every single click, always** — not the
rare "different sport filter is active" edge case the CC-CMD's own soft-
fail framing anticipated. This is a genuine bug in the CC-CMD's premise,
not a corner case: the cited existing precedent (`index.html:13301`)
only ever matches a **client-computed** pick's own client-side `_id`
against client-rendered cards — a same-namespace lookup. It never had to
bridge a relay-sourced ID against the client's ID scheme, so it never
had to solve this problem, and doesn't.

## THE FIX

Added `_wwFindCard(home, away)` — a small, disclosed deviation from the
literal spec — matching on team-name substring against
`data-home`/`data-away` instead of `data-gameid`, the same
cross-referencing technique already used elsewhere in this file (e.g.
`injectWikiChips()`'s relay-name-to-card-attribute matching). The
`scrollIntoView`/flash mechanism itself is **unchanged, exactly as
specified** — only the "how do we find the card" step changed, since the
literal one was proven non-functional.

**Re-verified after the fix: 5/5 real matches**, confirmed via the same
live cross-reference (Reds/Phillies → `g24`, Padres/Diamondbacks →
`g29`, Giants/Blue Jays → `g30`, Cardinals/Brewers → `g17`, Mets/Royals
→ `g25` — all correct).

## VERIFICATION

All performed against the real, live (pre-deploy) app via the browser
tool, injecting the exact new logic (matching this session's established
pre-commit verification pattern).

**Real click-through, with real DOM state observed, not hypothetical:**
triggered a genuine `.click()` DOM event on a real ranked row
(Reds/Phillies). Observed directly:
- `window.scrollY` changed from `0` to `2658` — the page genuinely scrolled.
- The target card's position moved from `top: 2907px` toward
  `top: 1687px` (much closer to viewport center) during the scroll,
  confirming `scrollIntoView({block:'center'})` genuinely fired.
- `.ww-flash` was present on the card ~400ms after the click
  (`hasFlashDuring: true`).
- `.ww-flash` was **absent** ~1400ms after the click, past the 1200ms
  `setTimeout` (`hasFlashAfter: false`) — confirmed the flash correctly
  self-clears, not left stuck.

**Soft-fail case, tested with a genuinely non-matching team pair** (not
a real team, guaranteed no card match): captured `window.onerror`,
`console.warn`, and `console.error` around the call. Result: zero thrown
errors, zero console warnings/errors, `window.scrollY` completely
unchanged (`2658` before and after) — confirmed silent, not assumed.

**Cards confirmed visually unchanged at rest:** captured the target
card's class list before any interaction
(`["game-card","card-tier-compact","upcoming","circadian-preview"]` —
no `ww-flash`), and confirmed `ww-flash` is present only transiently
during the click cycle and absent both before and after — the only
runtime change any card ever undergoes is that momentary, self-clearing
state, exactly matching the CC-CMD's own "why this doesn't add clutter"
framing.

**Visually confirmed via screenshot:** all 5 real ranked rows render
correctly with `cursor:pointer`, legible text, no layout breakage.

`node smoke.js index.html`: **890 passed, 0 failed.** Both inline
`<script>` blocks syntax-checked via `node --check`.

## DONE CONDITIONS

- [x] Probe block confirms `.ww-row` exists (v2 live) before proceeding
- [x] Click handler added, reuses the exact existing `scrollIntoView`
      call — the *lookup* mechanism was fixed (disclosed above) because
      the literal `data-gameid` match was proven non-functional via
      real testing, not because the scroll pattern itself was wrong
- [x] `.ww-flash` reuses the existing `scoreFlash` keyframe, not a new animation
- [x] Soft-fail case (no matching card) verified silent via a real test, not assumed
- [x] Real click-through verified on a live page load, with real scroll
      position and class-list observations
- [x] Cards confirmed visually unchanged at rest
- [x] Smoke clean

## CONFIDENCE SCORING (per the CC-CMD's own table)

- +15 — probe block correctly gated on v2 being live
- +30 — click handler correct; the `scrollIntoView` call is exactly the
  cited existing pattern, unchanged. The card-lookup step required a
  disclosed fix after real testing showed the literal ID-based approach
  fails 100% of the time (0/5 real matches) — the fix was verified to
  restore full function (5/5 real matches) rather than shipping a
  feature that would never work
- +20 — flash reuses the existing keyframe unchanged, verified via a
  real click that it appears then self-clears after 1200ms
- +15 — soft-fail case verified via a real, genuinely non-matching test
  case: zero errors, zero console noise, scroll position unchanged
- +10 — real click-through verified on a live page, with concrete
  before/after scroll-position and DOM-class observations, not a
  hypothetical description
- +10 — smoke clean, cards confirmed unchanged at rest via real
  before/after class-list capture

**Total: 100/100.**

## Commit

- Bumps SW_VERSION `2026-07-07c` → `2026-07-07d`.
- This manifest.
