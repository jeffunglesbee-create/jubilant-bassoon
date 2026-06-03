# FIELD Handoff — June 3 2026 (PM-26-C P1 set complete; PM-26-J spec captured; session doc landed)

**jubilant-bassoon HEAD:** `f94e948` (PM-26-C5: preserve LCP anchor DOM identity) · Smoke: **409/0** · SW_VERSION `2026-06-03m`
**field-relay-nba HEAD:** `5608845` (unchanged)
**Session arc today:** PM-26-A → PM-26-B → PM-26-C6 → PM-26-C1 → PM-26-C2 → PM-26-C5. Six single-concern build commits, six SW_VERSION suffixes, six smoke assertions added (A409-A416, all green). Followed by an analysis-only turn that produced the PM-26-J architectural spec (captured below). Post-close TYPE D housekeeping (this amendment) landed the consolidated session doc to Drive.

---

## SESSIONS COMPLETED TODAY

`88c8d73` PM-26-A · SW `h` · A409-A411: `?wpt` test mode bypass + STANDARDS Rule 54
`ed29014` PM-26-B · SW `i` · A412: SW install no longer pre-caches shell (saves 425 KB / cold load)
`afea15b` PM-26-C6 · SW `j` · A413: removed `:has()` grid collapse (laptop-viewport CLS dominant source)
`b363aa8` PM-26-C1 · SW `k` · A414: freshness strip slot reserved via min-height + visibility
`bd855cc` PM-26-C2 · SW `l` · A415: live cards pre-reserve grid-row 2 for score-wrap arrival
`f94e948` PM-26-C5 · SW `m` · A416: LCP anchor DOM identity preserved via applyMainHTML morph

SW_VERSION sequence today: `g` → `h` → `i` → `j` → `k` → `l` → `m`. Seven suffixes one calendar day; `m` is current.

---

## PM-26-J — CRITICAL ARCHITECTURAL CARRY-FORWARD (NEW · P1)

**Spec produced by analysis-only turn at end of session. Full spec preserved in Drive doc `1rcU6ad9_pdBCBUdaSp7o_0Soii6RlWIqJMHjO3cFBI8`** (FIELD App — 2026-06-03 Session Documentation). Gist below is enough to start the work.

### Problem

PM-26-C addressed CLS at cold-load discrete transition points (skeleton→real, score arrival on initially-live cards, freshness strip toggle, `:has()` reflow). All four fire once per cold load. **None address the continuous editorial injection pipeline that mutates cards throughout the session.**

The Rule-24 trigger chain (`renderESPNScores` → `injectDramaBadges` → `detectAndRenderDoubleFeature` → `renderOneToWatch` → `renderWatchWindow`) fires on every ESPN poll cycle (~30s). Every cycle, every card is a candidate for mutation across 8+ content slots: score-wrap, drama badge, anti-hype badge, scout-pick badge, situation badge, soccer goalscorer, series record refinement, importance transition, vibe chip recompute. Each mutation grows or shrinks the target card. With `grid-template-rows: auto auto auto` and 2-column laptop grid, growth cascades through subsequent rows.

When user scrolls past initial viewport, they see this cascade as ongoing layout instability throughout the session. The PM-26-C fixes don't touch it. CLS is a session-lifetime metric, not a paint-time metric.

### Diagnosis

Slot reservation (the C2 pattern) is per-content-type. Extending it would require ~8 separate slot reservations, each with its own min-height heuristic, each with a smoke assertion. Whack-a-mole that doesn't scale — every new editorial feature adds another slot.

**Layout containment is per-card.** One CSS declaration cuts the cascade at the card boundary regardless of *what* mutates inside.

### Proposed fix (three CSS properties on `.game-card`)

```css
.game-card {
  /* existing rules */
  contain: layout style paint;          /* isolate card layout from grid context */
  content-visibility: auto;             /* skip offscreen rendering entirely */
  contain-intrinsic-size: auto 180px;   /* placeholder size for offscreen cards */
}
```

**What each does:**

- `contain: layout style paint` — card-internal mutations don't trigger reflow / repaint / style invalidation in sibling cards. Card may still grow externally (we deliberately don't include `size` containment because that would clip valid content), but cascade is broken at the card boundary.
- `content-visibility: auto` — cards more than ~one viewport from current scroll position skip rendering. Mutations to those cards no-op visually and don't contribute to CLS.
- `contain-intrinsic-size: auto 180px` — placeholder size for off-screen cards. 180px is an averaged guess; should be tuned per-sport via `[data-sport]` attribute selectors in a follow-up commit.

### Expected effect

| When | Before | After |
|---|---|---|
| Cold load above-fold | Mitigated by C1/C2/C5/C6 | Same |
| Cold load below-fold | Every card mutation cascades | Off-screen cards skip render; no visible shift |
| Mid-session poll cycle | Cards mutate, neighbors shift | Mutations contained per-card |
| Scroll into hydrated area | Boundary shifts cascade through grid | Localized to each card; rows independent |

### Caveats (be honest in the commit message)

1. `contain: layout` interaction with CSS Grid `grid-template-rows: auto` needs empirical verification. Spec language is strong ("nothing inside the element will affect the layout of the rest of the document") but grid row sizing is determined during grid layout and the interaction isn't always intuitive. If incomplete, fallback is `grid-auto-rows: minmax(180px, auto)` + `align-items: start`.
2. `content-visibility: auto` is Chrome/Edge well-supported, Safari pre-18 inconsistent. Treat as progressive enhancement.
3. `contain-intrinsic-size: 180px` is a guess; per-sport tuning in commit 2.
4. `contain: paint` may clip pulse-crunch glow effects that extend beyond card border. Verify in commit 3; drop `paint` from contain list if needed.

### Suggested sub-commits

- **PM-26-J-1** Base containment on `.game-card`. Smoke locks the three CSS properties present.
- **PM-26-J-2** Per-sport intrinsic-size tuning via `[data-sport]` selectors. Measure typical card heights for NBA/MLB/NHL/Soccer/Tennis from rendered DOM.
- **PM-26-J-3** Pulse-effect verification + adjustment. Drop `paint` from contain list if glow clipping observed.

### Patent relevance

Direct defense of "consumer-aligned hydration" and "perceived-perf" claims for the USPTO ~June 25 provisional. Without PM-26-J, the patent application's perf claims could be tested against scroll behavior and found wanting — the cold-load CLS story doesn't survive a session-lifetime measurement. PM-26-J closes that gap.

### Work-eliminated bonus

PM-26-J obviates PM-26-C3 (reveal anim audit), PM-26-C4 (ambient skeletons), PM-26-C7 (skeleton-real height match). Containment makes each of those individual fixes redundant. Net scope removed exceeds scope added.

### Verification

Single WPT run with scroll profile (scroll the page automatically over 30 seconds via WPT scripting) before and after PM-26-J. CLS should drop from "ongoing throughout session" to "dominated by initial paint" (already addressed by C-series).

---

## OTHER CARRY-FORWARD

**P1:**

- **PM-26-J** (per above) — single biggest CLS architectural win; ship before PM-26-D
- **WPT multi-run verification of PM-26-A→C5 stack.** Three viewports (mobile portrait, iPad 1024, laptop 1366). `runs=3, fvonly=false, /?wpt`. Then re-run after PM-26-J. Expected: laptop CLS median drops 0.701 → ≤0.10; LCP NodeType=None → DIV.
- **PM-26-D** — Wikimedia Pageviews relay-side aggregator (~75 min, two commits). Architecturally correct regardless of variance evidence.
- **STANDARDS Rule 50** — codify on-device-only histograms / no profile-building / no ad-tech / no third parties. Pre-USPTO governance.
- **PM-24 canonical key verification** during Stanley Cup G2 tomorrow night.

**P2:**

- ~~PM-26-C3 (reveal anim audit)~~ — obviated by PM-26-J
- ~~PM-26-C4 (ambient skeletons)~~ — obviated by PM-26-J  
- ~~PM-26-C7 (skeleton-real height match)~~ — obviated by PM-26-J
- **PM-26-E** Dead route audit
- **PM-26-F** MLS `/mls/stats/v1/matches` 500
- **PM-26-G** NHL `/nhl/v1/*-stats-leaders` 403
- **PM-26-H** OpenF1 404
- World Cup deadline track: F09/F08/R2

**P3 (post-USPTO):**

- Cloudflare connector mismatch (PM-15 carry)
- Probe-outbox cleanup
- Smoke count tool parser drift
- Memory edit path-string cleanup
- P1 storage-budget instrumentation
- **Spec doc update:** PM-26 spec set should be amended to include scroll-mode WPT verification as a success criterion. The cold-load-only framing set up the wrong success criterion; the PM-26-J insight should be embedded in spec methodology going forward.

---

## TIER 0 DEADLINES

- **NBA Finals G1 TONIGHT** (June 3 8:30 pm ET ABC) — live exposure of full PM-26-A→C5 stack on live game data
- **Stanley Cup G2:** June 4 8 pm ET ABC — PM-24 canonical key verification window
- **World Cup 2026:** June 11 HARD
- **USPTO provisional:** ~June 25 — PM-26-J should ship before this deadline to close the session-lifetime CLS gap

---

## STATE INVARIANTS AT END OF DAY

- jubilant-bassoon last build HEAD: `f94e948` (PM-26-C5 close)
- jubilant-bassoon smoke: **409/0** (no new asserts since C5)
- jubilant-bassoon SW_VERSION: `2026-06-03m` (sw.js + index.html, A190 in sync)
- field-relay-nba HEAD: `5608845` (unchanged all day)
- STANDARDS.md: Rule 54 (test-mode URL params governance) is current top
- T3 memory anchor: updates to current HEAD on each HANDOFF write

---

## TIER 1/2/3 HANDOFF CHANNEL HIERARCHY

**Tier 1 (LIVE):** MCP server on field-relay-nba `/mcp`. Thirteen consecutive session closes via T1 today including this amendment.
**Tier 2 (NOT BUILT — correctly deferred).**
**Tier 3 (LIVE):** userMemories anchor, refreshed to current HEAD on each T1 write.

---

## SESSION POSTMORTEM — END OF DAY

**Six build commits in one calendar day.** PM-26-A (test-mode bypass), PM-26-B (SW install fix), PM-26-C P1 set (C6/C1/C2/C5). Each smoke-gated, each single-concern, each SW_VERSION-bumped. Workflow held throughout.

**The novel-thinking turn matters more than any single commit.** User pushed back on the PM-26-C closure: "as soon as the user starts scrolling, the same behavior comes back." That observation revealed the PM-26 spec was framed around the wrong success criterion (cold-load WPT instead of session-lifetime user experience). The analysis turn produced PM-26-J as a fundamentally different architectural approach — per-card containment instead of slot reservation. Work-eliminated (C3/C4/C7) exceeds work-added (J-1/J-2/J-3). Net session scope reduced.

**Lesson for the spec set going forward.** WPT cold-load measurements are necessary but not sufficient evidence for the USPTO perceived-perf claims. Scroll-mode verification must be added to the verification matrix before patent filing.

**T1 channel reliability.** Thirteen write_handoff calls today (including this post-close amendment), all succeeded. The MCP-on-relay architecture (the patent-defensible piece) demonstrated production reliability under heavy session-rotation load. That's a non-obvious win for the patent application's "session-portable agent context" architecture claim.

**Drive session documentation — LANDED (post-close TYPE D, 2026-06-03).** Consolidated day's doc written covering PM-26-A through PM-26-C5 + full PM-26-J spec preservation. Drive ID: `1rcU6ad9_pdBCBUdaSp7o_0Soii6RlWIqJMHjO3cFBI8`. PM-26-J spec is now archived in Drive — the HANDOFF body's spec text remains as a working reference for the upcoming PM-26-J-1 build but the canonical archive copy is the Drive doc.

---

## CANONICAL DOC REFS

**2026-06-03 Session Documentation:** `1rcU6ad9_pdBCBUdaSp7o_0Soii6RlWIqJMHjO3cFBI8` (LANDED — covers PM-26-A→C5 + PM-26-J spec)
**PM-26 WPT Spec Set:** `/mnt/user-data/outputs/PM-26_WPT_Spec_Set.md` (transient — needs Drive landing)
**Startup & Loading Polish spec:** `1_0WcA2a3UWmFnmTvGmwZVdXiDtw_aSx5mMBlwZbC3FI`
**CANONICAL BUILD BACKLOG:** `1ugUh6UmeDkLR-gEH8hJPwXK2NiIrXYQY8gp2jO2p2Hk` (today's closures + PM-26-J still need to land)
**CI/Deploy Ref:** `1UrOoYDGaK2ncPrnRNXt1w0OElOLpbjP_EYROjG2w1zo`
**FIELD Current State:** `1GvsfnTH9Xhqzg_NdYrPhPpk1d1Rnm0lkeG6ip-tLUlA`
**PM-24 Canonical Key Design:** `1eG73NmJHUAPOR4E1bkFMg-Xxnq2E564ZIfB6dTGpsao`
