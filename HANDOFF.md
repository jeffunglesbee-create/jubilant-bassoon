# FIELD Handoff — June 3 2026 (PM-26-A close: ?wpt test mode bypass shipped)

**jubilant-bassoon HEAD:** `88c8d73` (PM-26-A: ?wpt URL param skips first-visit My Services modal) · Smoke: **404/0** · SW_VERSION `2026-06-03h`
**field-relay-nba HEAD:** `5608845` (unchanged — no relay work this session)
**Session arc:** PM-26-A TYPE A — single-concern commit unblocking automated perf measurement of the configured-state app.

---

## WHAT SHIPPED THIS SESSION

One commit, smoke-gated, SW_VERSION bump g→h, three paired asserts:

**`88c8d73` — PM-26-A: ?wpt test mode bypass** · SW_VERSION `h` · A409 / A410 / A411 · Rule 54

WPT analysis (June 3 2026, two same-config runs at 1024×681) discovered that every automated perf test since My Services launched had been measuring the onboarding modal instead of the configured-state app. LCP "DIV with text" was modal copy; CLS 0.225–0.268 straddle was modal animation; visual perf claims in the PM-25 startup polish bundle had no empirical validation against their intended surface.

Bypass design:
- `?wpt` URL parameter pre-marks `field_setup_done` in localStorage if (and only if) not already set
- Real user landing on a `?wpt` URL by accident: schedule renders correctly with default broadcast resolution, services configurable later via settings — no data loss
- Block wrapped in try/catch so private mode degrades silently to showing the modal as normal
- Injected at top of bootstrap script (immediately after FIELD_DEBUG init), before `_fieldErrors` capture

Files changed:
- `index.html` (+14/-1): bypass block + SW_VERSION bump
- `sw.js` (+1/-1): SW_VERSION g→h
- `STANDARDS.md` (+46): Rule 54 (TEST-MODE-A) — test-mode URL params limited to skipping onboarding; never rate limits, journalism budget, paid features, or sensitive state. Forbidden param names listed (`?debug` `?test` `?mock` `?admin` `?dev`). Future test affordances must extend this rule with documented sub-bullets.
- `smoke.js` (+27): A409 (?wpt parsing present), A410 (clobber-guarded write + try/catch wrap), A411 (`maybeShowSetup` regression guard).

**Verification surface live now:**
- `https://jubilant-bassoon.jeffunglesbee.workers.dev/` → modal appears (real first-visit)
- `https://jubilant-bassoon.jeffunglesbee.workers.dev/?wpt` → skips to schedule

This unblocks PM-26-B/C/D investigations against a clean measurement baseline.

---

## SW_VERSION SEQUENCE TODAY

`2026-06-03g` (yesterday's PM-25 close) → `2026-06-03h` (PM-26-A). Suffix `h` is current.

---

## CARRY-FORWARD STANDING ITEMS

**P1 next session:**
- **PM-26-B — 3× index.html load investigation** (~45 min). Cold-load fetch of 425KB shell three times in WPT reproduces in both same-config runs (deterministic, not measurement noise). Hypotheses ranked: SW activation re-fetch, P1 snapshot re-fetch path, WPT profile double-nav, P4 prefetch misfire on document URL. Investigation steps + smoke assertion targets specced in PM-26 WPT Spec Set. **Patent-relevant** — undermines "consumer-aligned data hydration" claims if cold-start fetch budget is 3× baseline.
- **PM-26-C — CLS reduction** (~60 min, four sub-commits). Reserve dimensions for freshness strip slot (C1), score-wrap slot in cards (C2), choreographed reveal opacity+transform only no height (C3), ambient card skeleton placeholders (C4). Target: CLS <0.10 deterministic on all viewports. **Patent-relevant.**
- **PM-26-D — Wikimedia relay-side aggregator** (~75 min, two commits). 48/58 Wikimedia pageview requests return 429 (rate-limited) in both runs. New relay route `/wikimedia/teams/{league}` with daily cron + KV cache, client refactor to single fetch per league. Rule 47 compatible (data caching not editorial intelligence migration).
- **PM-26 Verification pass** (now with clean baseline). Open live app at `/?wpt` on each viewport bucket (mobile portrait, mobile landscape, iPad portrait+landscape, laptop, desktop, ultrawide) and confirm: skeleton paints before JS runs · 2nd-load freshness strip "Refreshed Xm ago" → fresh render → "Live" → fade · reduced-motion collapses animations · choreographed reveal shows row-by-row entry not diagonal sweep · score crossfade on first ESPN inject (NBA Finals G1 tonight is the test surface). PM-24 Canonical Keys (Drive `1eG73NmJHUAPOR4E1bkFMg-Xxnq2E564ZIfB6dTGpsao`) — Stanley Cup G2 tomorrow 8pm ET ABC is the verification window.
- **STANDARDS Rule 50 candidate** — still pending. Codify "on-device-only histograms / no profile-building / no ad-tech / no third parties" before USPTO ~June 25. P5 commit message references this as deferred-from-bundle.

**P2:**
- **PM-26-E** — Dead route audit: `/v2/games?sport=*`, `/field/data/today`, `/health`, `/journalism/game/...` (~30 min)
- **PM-26-F** — MLS `/mls/stats/v1/matches` 500 handler fix (~30 min)
- **PM-26-G** — NHL `/nhl/v1/*-stats-leaders` 403 audit (~20 min)
- **PM-26-H** — OpenF1 404 endpoint audit (~15 min)
- Full L1 confidence gate restoration
- A398 augmentation (assert `verified > 0` reachability)
- MLB Prime Video label refinement (21 Yankees dates)
- World Cup deadline track: F09 REST Countries (10 min), F08 Nager.Date (25 min), R2 World Cup Team Context (~90 min)
- Cloudflare-side cron-push fallback for P5 (browsers without periodicSync)

**P3 (post-USPTO):**
- Cloudflare connector mismatch (PM-15 carry)
- Probe-outbox cleanup
- Smoke count tool discrepancy (T1 MCP `get_smoke_count` reports 338, actual 404 — regex parser drift)
- Memory edit path-string cleanup
- P1 storage-budget instrumentation

---

## TIER 0 DEADLINES

- **NBA Finals G1 TONIGHT** (June 3 8:30pm ET ABC) — first live exposure of P6 score crossfade and P2 choreographed reveal
- **Stanley Cup G2:** June 4 8pm ET ABC — PM-24 canonical key verification window
- **World Cup 2026:** June 11 HARD — wc26:true flip + R2 World Cup Team Context still pending
- **USPTO provisional:** ~June 25 — PM-26-B/C/D should land first; clean WPT baseline against `/?wpt` becomes patent-filing-grade evidence for consumer-aligned hydration + perceived-perf claims

---

## STATE INVARIANTS AT END OF SESSION

- jubilant-bassoon HEAD: `88c8d73` (PM-26-A close)
- jubilant-bassoon smoke: **404/0** (was 401; +3 new asserts A409–A411)
- jubilant-bassoon SW_VERSION: `2026-06-03h` (both sw.js and index.html, A190 in sync)
- field-relay-nba HEAD: `5608845` (unchanged — no relay work this session)
- STANDARDS.md: Rule 54 (TEST-MODE-A) added — codifies safety boundary for URL-param test affordances
- T3 memory anchor: updated post-write to `88c8d73`

---

## TIER 1/2/3 HANDOFF CHANNEL HIERARCHY

**Tier 1 (LIVE — used for this close):** MCP server on field-relay-nba at `/mcp`. Eighth consecutive session-end via T1.
**Tier 2 (NOT BUILT — correctly deferred).**
**Tier 3 (LIVE):** userMemories anchor — updated post-write.

---

## SESSION POSTMORTEM

Clean session. Pre-flight grep correctly identified that the spec's proposed `field-services-configured` localStorage key was wrong — actual key is `field_setup_done` with a different storage layout (a Set in `field_my_services` for the services themselves). Spec adjusted before code touched. Spec's proposed Rule 51 number was also taken (Period Prefix Registry, line 2466) — renumbered to Rule 54 (next available).

Two smoke failures on first run, both diagnosed and fixed immediately:
1. **A190 (SW_VERSION sync)** — Rule 23b requires sw.js and index.html SW_VERSION strings to match. Bumped sw.js first, forgot the second reference at index.html line 16780. Caught by smoke gate (Rule 23b enforcement working as designed). Fixed in same session before commit.
2. **A410 regex too clever** — initial regex tried to match `try { ... wpt ... } catch` across multiple braces with `[^}]+` which can't span nested braces. Rewrote with simpler string-include checks plus a focused regex for the catch tail. Lesson: prefer explicit `html.includes()` over greedy regex when the pattern crosses brace boundaries.

The PM-25 postmortem's "budget anxiety as failure" lesson held this session — no false stops, no announced "manual finish required" — work completed naturally in one straight pass.

---

## CANONICAL DOC REFS

**PM-26 WPT Spec Set (this session's source):** Local file at `/mnt/user-data/outputs/PM-26_WPT_Spec_Set.md` (transient — needs to land on Drive if it should persist)
**Startup & Loading Polish spec (PM-25 source):** `1_0WcA2a3UWmFnmTvGmwZVdXiDtw_aSx5mMBlwZbC3FI`
**CANONICAL BUILD BACKLOG:** `1ugUh6UmeDkLR-gEH8hJPwXK2NiIrXYQY8gp2jO2p2Hk` (due refresh: PM-26-A complete; PM-26-B/C/D queued)
**CI/Deploy Ref (READ AT SESSION START):** `1UrOoYDGaK2ncPrnRNXt1w0OElOLpbjP_EYROjG2w1zo`
**FIELD Current State (READ AT SESSION START):** `1GvsfnTH9Xhqzg_NdYrPhPpk1d1Rnm0lkeG6ip-tLUlA`
**PM-24 Canonical Key Design:** `1eG73NmJHUAPOR4E1bkFMg-Xxnq2E564ZIfB6dTGpsao`
**June 1 R2 Finals Handoff:** `1w5Ypy1ME6LlKKkyWh1_0IJyRm5iics61jhyBswO9uT8`
**TIER 1B spec:** `1UIuazvMvY4ewJap2Y4Z4-LbqHGvt8z-QhX28ImnAlt0`
**B1 spec:** `1yt-3ruXqTNNOl9k1jRQARFw9OtHt6IzNG4xkfcjVqTE`
