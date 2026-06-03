# FIELD Handoff — June 3 2026 (PM-26-C P1 close: three CLS fixes shipped)

**jubilant-bassoon HEAD:** `bd855cc` (PM-26-C2: pre-reserve grid-row 2 on live cards) · Smoke: **408/0** · SW_VERSION `2026-06-03l`
**field-relay-nba HEAD:** `5608845` (unchanged)
**Session arc:** PM-26-C TYPE A — three single-concern CLS fixes shipped (C6 + C1 + C2), each smoke-gated, each SW_VERSION-bumped. C5 (skeleton morph) deferred to its own session.

---

## WHAT SHIPPED THIS SESSION

Three commits, four smoke assertions added, SW_VERSION sequence i → j → k → l.

**`afea15b` — PM-26-C6: remove `:has()` grid collapse at laptop viewport** · SW_VERSION `j` · A413

Audit identified `.games-list:not(:has(.game-card ~ .game-card)):not(:has(.game-brief-pair ~ .game-brief-pair)){grid-template-columns:minmax(320px,640px)}` as the dominant CLS contributor at the laptop viewport bucket (1200–1439 px). When a sport section had exactly one card, grid collapsed to single-column 640px max; when a second card arrived (late game-add, brief-pair injection), `:has()` stopped matching and grid reflowed to `repeat(2, minmax(320px, 1fr))` — every card in that section shifted simultaneously. WPT showed this firing across 5–8 sport sections per cold load = 10–16 full-grid reflows per cold load. Fix: deleted the `:has()` rule entirely. Solo cards now sit in column 1, column 2 empty until another card arrives; new card slots into column 2 with zero movement of card 1.

**`b363aa8` — PM-26-C1: reserve freshness strip slot via min-height + visibility** · SW_VERSION `k` · A414

Freshness strip toggled via inline `style.display = 'none' → '' → 'none'`, causing layout shift twice per snapshot-restore-then-fetch sequence (once on appear, once on fade-out after 2s). Fix: always reserve 1.6rem slot via `min-height + visibility:hidden + opacity:0` default; `.is-visible` class flips to `visibility:visible + opacity:1` with the existing `transition:opacity .4s ease` giving smooth fade. JS uses `classList.add/remove('is-visible')` instead of `style.display`. Aria-live=polite preserved.

**`bd855cc` — PM-26-C2: pre-reserve grid-row 2 on live cards for score-wrap arrival** · SW_VERSION `l` · A415

Game cards use `grid-template-rows:auto auto auto`. The `.score-wrap` element sits at grid-row:2. When `display:none` (default), row 2 collapses to 0; when `display:block` (after `.espn-live` class), row 2 expands to ~24px → card grows → all subsequent cards shift. Fix: add `.game-card.espn-live, .game-card.espn-final {grid-template-rows: auto minmax(1.5rem, auto) auto}` for both desktop and mobile (max-width:600px) cascades. Live cards reserve row 2 from initial paint; pre-game cards keep `auto auto auto` (no permanent space cost). Rare pre-game→live mid-load still shifts one card, but bulk of live cards on any cold load are already-live at render time.

---

## C5 DEFERRED TO DEDICATED SESSION

**PM-26-C5 (skeleton morph instead of replace)** is the only remaining P1 sub-item and is the single highest-leverage architectural fix (per WPT June 3 evidence: LCP NodeType=None deterministically at laptop viewport, across two browsers and two networks). Deferred because:

1. **Scope.** Skeletons (`.game-card-skeleton`, 88px placeholder divs at line 2820) are structurally different from real `.game-card` elements (complex CSS-grid with body/right/score regions). True morphing requires either making skeletons render with `.game-card` selectors (so JS can populate content in-place) OR rewriting renderAll to mutate existing DOM rather than stomp `main.innerHTML`. Both are 2–3 hours of careful work with multiple smoke iterations for edge cases (skeleton count ≠ game count, mid-load schedule changes, snapshot restore vs cold paint divergence).
2. **Risk management.** Better to measure C6/C1/C2 against WPT before stacking more changes — variance budget evidence from earlier in the day shows we need to be deliberate about isolating each fix's effect.
3. **Calendar.** USPTO ~June 25 is ~3 weeks out. C5 can land in a dedicated session this week without missing the patent-filing window.

C5 spec carried forward unchanged. C5 is the next P1 item for the following session.

---

## SW_VERSION SEQUENCE TODAY (one calendar day)

`g` (PM-25 close, last night) → `h` (PM-26-A) → `i` (PM-26-B) → `j` (PM-26-C6) → `k` (PM-26-C1) → `l` (PM-26-C2). Six suffixes today. Suffix `l` is current.

---

## CARRY-FORWARD STANDING ITEMS

**P1 next session:**

- **WPT multi-run measurement bundle to confirm C6/C1/C2 impact.** Run `runs=3, fvonly=false` against `/?wpt` at three viewports: mobile portrait (≤600 px, Moto G4 or iPhone 12 throttle profile), iPad (1024), laptop (1366). 9 first-view + 9 repeat-view measurements. C6 specifically should show median CLS at 1366 dropping from 0.701 toward ≤0.25 (out of Poor) or ≤0.10 (Good). C1 effect visible on the snapshot-restore (repeat-view) path only. C2 effect visible during windows with live games (NBA Finals G2 tomorrow night, MLB ongoing).
- **PM-26-C5 (skeleton morph instead of replace) — dedicated session.** Strongest patent-defense fix remaining; LCP NodeType=None deterministic at laptop viewport confirmed across Chrome/LAN/laptop and Edge/Cable/laptop. Estimated 2–3 hours with smoke iteration for edge cases. Approach options to evaluate at session start: (A) skeletons rendered as `.game-card[data-skeleton="1"]` with same selectors, JS populates in-place; (B) renderAll rewritten to DOM-diff against existing children instead of stomping innerHTML; (C) hybrid where first N cards morph and rest are appended.
- **PM-26-D — Wikimedia Pageviews relay-side aggregator** (~75 min, two commits). Note from June 3 testing: Wikimedia 429 count varies wildly across runs (51 → 19 → 1 → 5 → 49) due to per-IP rate-limit window state and WPT agent IP cycling — the bug exists but is hard to demonstrate empirically. Architectural fix (relay-side daily aggregator + KV cache) still correct regardless.
- **PM-26 Verification pass** with the post-C6/C1/C2 baseline. Now that the visible-perf laptop-bucket bug is gone, the six-viewport verification matrix has a coherent baseline to compare against.
- **STANDARDS Rule 50 candidate** — still pending. Codify "on-device-only histograms / no profile-building / no ad-tech / no third parties" before USPTO ~June 25.

**P2:**

- **PM-26-C3** — Choreographed reveal: confirm `--i` staggered animation uses `opacity + transform`, never `height` / `max-height`. Lower-leverage than other C items per WPT evidence (modal-tainted runs didn't show animation as a shift source). Quick audit + smoke assert.
- **PM-26-C4** — Ambient cards skeleton placeholders. Not relevant at iPad / laptop viewports (ambient panel only renders at desktop ≥1440 px). Keep on the list for desktop-bucket testing.
- **PM-26-C7** — Skeleton-to-real height match (investigation: measure actual skeleton vs real card heights, set min-height on skeleton to match expected real card to within ~5%).
- **PM-26-E** — Dead route audit
- **PM-26-F** — MLS `/mls/stats/v1/matches` 500
- **PM-26-G** — NHL `/nhl/v1/*-stats-leaders` 403
- **PM-26-H** — OpenF1 404
- World Cup deadline track: F09/F08/R2

**P3 (post-USPTO):**

- Cloudflare connector mismatch (PM-15 carry)
- Probe-outbox cleanup
- Smoke count tool discrepancy
- Memory edit path-string cleanup
- P1 storage-budget instrumentation

---

## TIER 0 DEADLINES

- **NBA Finals G1 TONIGHT** (June 3 8:30 pm ET ABC) — first live exposure of PM-25 startup polish + PM-26-A/B/C6/C1/C2 stack
- **Stanley Cup G2:** June 4 8 pm ET ABC — PM-24 canonical key verification window
- **World Cup 2026:** June 11 HARD
- **USPTO provisional:** ~June 25

---

## STATE INVARIANTS AT END OF SESSION

- jubilant-bassoon HEAD: `bd855cc` (PM-26-C2 close, rebased onto state update)
- jubilant-bassoon smoke: **408/0** (was 405; +3 new asserts A413, A414, A415)
- jubilant-bassoon SW_VERSION: `2026-06-03l` (both sw.js and index.html, A190 in sync)
- field-relay-nba HEAD: `5608845` (unchanged)
- STANDARDS.md: unchanged this session (Rule 54 from PM-26-A is current top)
- T3 memory anchor: updated post-write to current HEAD

---

## TIER 1/2/3 HANDOFF CHANNEL HIERARCHY

**Tier 1 (LIVE — used for this close):** MCP server on field-relay-nba at `/mcp`. Tenth consecutive session-end via T1.
**Tier 2 (NOT BUILT — correctly deferred).**
**Tier 3 (LIVE):** userMemories anchor — updated post-write.

---

## SESSION POSTMORTEM

Three single-concern commits in one session, all smoke-gated, all deployed. Workflow held: each commit ≤45 min including investigation, edit, smoke iteration, commit, push, CI watch.

**Push collision on C2.** Mid-session a `[skip ci]` daily-state-update commit landed on origin/main while I was working on C2. Push rejected. Resolved with `git pull --rebase origin main` + push. No code-conflict — just a fast-forward issue. Rebase clean because my C2 commit only touched index.html/sw.js/smoke.js while the state-update commit touched FIELD-CURRENT-STATE.md or similar Drive-export artifact. **Process note for future sessions:** consider fetching origin/main before each new commit's push to catch state-update collisions before push. Roughly 1-min cost per commit; not a strong priority since rebase is trivial.

**C5 scope realism call.** Decided not to attempt C5 in this session despite it being the only remaining P1 item. The architecture difference between skeletons (placeholder divs) and real cards (complex grid structures) requires either making skeletons structurally compatible OR rewriting renderAll to DOM-diff. Both are 2–3 hour work. Better to ship the three small fixes correctly and measure their effect before stacking the largest fix. This is consistent with the variance-envelope finding from the earlier 4-run analysis: single-run WPT TBT/CLS are too noisy to isolate stacked fix effects without multi-run methodology.

**Smoke regex lessons applied.** A414's regex anchored on specific CSS values (`min-height:1\.6rem`, `visibility:hidden`, `opacity:0`, `is-visible{visibility:visible`) and used both presence and absence checks. No false positives this time. A415 used both literal text match for the new selector pattern AND a global occurrence count check (`html.match(...).length >= 2`) to verify the rule was added in both desktop AND mobile blocks. Cleaner pattern than the original A412 negative-name-match.

---

## CANONICAL DOC REFS

**PM-26 WPT Spec Set:** `/mnt/user-data/outputs/PM-26_WPT_Spec_Set.md` (transient — should land on Drive)
**Startup & Loading Polish spec (PM-25 source):** `1_0WcA2a3UWmFnmTvGmwZVdXiDtw_aSx5mMBlwZbC3FI`
**CANONICAL BUILD BACKLOG:** `1ugUh6UmeDkLR-gEH8hJPwXK2NiIrXYQY8gp2jO2p2Hk` (PM-26-A/B/C6/C1/C2 complete; PM-26-C5 + C3/C4/C7/D/E-H queued)
**CI/Deploy Ref:** `1UrOoYDGaK2ncPrnRNXt1w0OElOLpbjP_EYROjG2w1zo`
**FIELD Current State:** `1GvsfnTH9Xhqzg_NdYrPhPpk1d1Rnm0lkeG6ip-tLUlA`
**PM-24 Canonical Key Design:** `1eG73NmJHUAPOR4E1bkFMg-Xxnq2E564ZIfB6dTGpsao`
