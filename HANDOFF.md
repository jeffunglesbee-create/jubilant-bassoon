# FIELD Handoff — June 3 2026 (PM-26-B close: SW install-time shell pre-cache removed)

**jubilant-bassoon HEAD:** `ed29014` (PM-26-B: SW install handler no longer re-fetches the 425 KB shell after the browser just downloaded it to render the page) · Smoke: **405/0** · SW_VERSION `2026-06-03i`
**field-relay-nba HEAD:** `5608845` (unchanged — no relay work this session)
**Session arc:** PM-26-B TYPE A — surgical single-line bug fix backed by WPT-confirmed root cause, +1 smoke assertion, SW_VERSION bump h→i.

---

## WHAT SHIPPED THIS SESSION

**`ed29014` — PM-26-B: SW install-time shell pre-cache removed** · SW_VERSION `i` · A412 added

WPT (three same-config 1024×681 cold-load runs across PM-26-A's clean baseline + the two earlier modal-tainted runs) showed a duplicate 425 KB bare `/` fetch at ~589 ms after the initial `/?wpt` navigation. Network trace from the post-PM-26-A `?wpt` run:

```
  -6 ms  200  425.6 KB  /?wpt        ← test navigation
 589 ms  200  425.5 KB  /            ← THE DUPLICATE (PM-26-B)
1071 ms  200  425.5 KB  /?wpt        ← WPT 2nd-pass nav (measurement artifact)
```

**Real-user effect on first visit:** 850 KB downloaded instead of 425 KB. Has been present since SW v4 (May 18 2026), undetected because every prior automated perf test measured the My Services modal (fixed in PM-26-A).

**Root cause** — `sw.js` install handler:

```javascript
// BEFORE (the bug)
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(SHELL_CACHE)
      .then(c => c.add(SHELL_URL))     ← redundant 425 KB fetch
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});
```

`c.add(SHELL_URL)` is equivalent to `fetch('/').then(r => cache.put('/', r))` — a fresh network round-trip for the same 425 KB shell the browser had just retrieved seconds earlier. Also cached against bare `/` regardless of any query string the user navigated with, polluting cache for `?wpt` and any future URL-param paths.

**Fix:**

```javascript
// AFTER
self.addEventListener('install', e => {
  e.waitUntil(self.skipWaiting());
});
```

The fetch handler's `staleWhileRevalidate` (line 96) already populates SHELL_CACHE on the first shell request after activation, so the install-time pre-cache was pure overhead. `skipWaiting` preserved so the new SW still takes over immediately rather than waiting for all tabs to close.

**A412** locks the fix: asserts the bug pattern (`e.waitUntil(caches.open(SHELL_CACHE)...)`) is absent AND the fix pattern (`e.waitUntil(self.skipWaiting())`) is present. Regex anchored on `e.waitUntil` call shape rather than the `cache.add` name, so the explanatory comment containing `cache.add(SHELL_URL)` literal doesn't trip the negative check.

**Files changed:**
- `sw.js` (+11/-7): install handler simplified to `e.waitUntil(self.skipWaiting())` with explanatory comment block · SW_VERSION h→i
- `index.html` (+1/-1): SW_VERSION h→i (Rule 23b sync)
- `smoke.js` (+12/-0): A412

---

## PM-26 SESSION CHAIN (today, June 3 2026)

| Session | Commit | What | Status |
|---|---|---|---|
| PM-26-A | `88c8d73` | `?wpt` test mode bypass — automated perf tests skip My Services modal | ✅ shipped |
| PM-26-B | `ed29014` | SW install no longer pre-caches shell — bare `/` fetch eliminated | ✅ shipped |

Three commits today: PM-25 close (`542f3bc`, last night) → PM-26-A (`88c8d73`) → PM-26-B (`ed29014`). All single-concern, all smoke-gated, all deployed.

---

## SW_VERSION SEQUENCE TODAY

`g` (PM-25 close, last night) → `h` (PM-26-A) → `i` (PM-26-B). Suffix `i` is current.

---

## CARRY-FORWARD STANDING ITEMS

**P1 next session:**

- **PM-26 WPT re-run for empirical confirmation of PM-26-B (~10 min).** Run a single WPT pass against `/?wpt` to verify: (a) bare `/` fetch at ~589 ms is gone; (b) `bytesInDoc` reduced by ~425 KB; (c) any LCP/SI improvement from reduced network contention during the critical render window. Result becomes patent-filing evidence that the architecture eliminated the documented ~425 KB cold-load waste.

- **PM-26-C — CLS reduction** (~60 min total, five sub-commits). CLS at 0.252 in the `?wpt` baseline confirmed the layout shift is the app, not the modal. Plan:
  - **C1:** Reserve freshness strip slot via `min-height + visibility` (not `display: none → block`)
  - **C2:** Reserve `.score-slot` inside each game card before score arrival
  - **C3:** Choreographed reveal animates `opacity` + `transform` only — never `height` / `max-height`
  - **C4:** Ambient cards render with `min-height` skeleton placeholders before data
  - **C5 (NEW from PM-26-B WPT intel):** Skeleton MORPH instead of replace. Current renderAll stomps innerHTML, which detaches the skeleton LCP candidate (`LargestContentfulPaintNodeType: None` in the `?wpt` run confirms this). Morphing same-element content swap preserves LCP identity AND eliminates skeleton-to-real height delta as a layout shift source. **Patent-relevant** — defends the "perceived performance" claim by aligning LCP measurement with the user's actual perceived paint.

- **PM-26-D — Wikimedia Pageviews relay-side aggregator** (~75 min, two commits). 49 of 58 Wikimedia requests still 429-rate-limited in the `?wpt` baseline run (identical pattern to modal runs — deterministic fan-out). New relay route `/wikimedia/teams/{league}` with daily cron + KV cache; client refactor to single fetch per league. Rule 47 compatible (data caching, not editorial intelligence migration).

- **PM-26 Verification pass** with the new `/?wpt` clean baseline. Now that PM-26-A enabled measurement and PM-26-B eliminated the wasted fetch, validation against the six viewport buckets is well-defined. PM-24 Canonical Keys verification window: Stanley Cup G2 tomorrow 8pm ET ABC.

- **STANDARDS Rule 50 candidate** — still pending. Codify "on-device-only histograms / no profile-building / no ad-tech / no third parties" before USPTO ~June 25.

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
- Smoke count tool discrepancy (T1 MCP `get_smoke_count` reports 341, actual 405 — regex parser drift)
- Memory edit path-string cleanup
- P1 storage-budget instrumentation

---

## TIER 0 DEADLINES

- **NBA Finals G1 TONIGHT** (June 3 8:30 pm ET ABC) — first live exposure of P6 score crossfade and P2 choreographed reveal, now on the post-PM-26-B shell
- **Stanley Cup G2:** June 4 8 pm ET ABC — PM-24 canonical key verification window
- **World Cup 2026:** June 11 HARD — wc26:true flip + R2 World Cup Team Context still pending
- **USPTO provisional:** ~June 25 — PM-26-C and -D should land first; clean WPT measurement series across viewport buckets becomes patent-filing evidence for consumer-aligned hydration + perceived-perf claims

---

## STATE INVARIANTS AT END OF SESSION

- jubilant-bassoon HEAD: `ed29014` (PM-26-B close)
- jubilant-bassoon smoke: **405/0** (was 404; +1 new assert A412)
- jubilant-bassoon SW_VERSION: `2026-06-03i` (both sw.js and index.html, A190 in sync)
- field-relay-nba HEAD: `5608845` (unchanged)
- STANDARDS.md: unchanged this session (Rule 54 from PM-26-A is current top)
- T3 memory anchor: updated post-write to current HEAD

---

## TIER 1/2/3 HANDOFF CHANNEL HIERARCHY

**Tier 1 (LIVE — used for this close):** MCP server on field-relay-nba at `/mcp`. Ninth consecutive session-end via T1.
**Tier 2 (NOT BUILT — correctly deferred).**
**Tier 3 (LIVE):** userMemories anchor — updated post-write.

---

## SESSION POSTMORTEM

Cleanest fix-class session in some time. Single-line root cause, single-line fix, single new smoke assertion, three files changed (sw.js, index.html, smoke.js). The PM-26-B spec's pre-flight estimate was 20–30 min and that was approximately correct end-to-end.

One smoke regex correction during local gate:
- **A412 first version** triggered on its own comment text. The negative regex `!/c\.add\(SHELL_URL\)/` matched the literal string `cache.add(SHELL_URL)` appearing in the explanatory comment block I'd added to the install handler.
- **Fix:** rewrote A412 to anchor on the `e.waitUntil(...)` call shape rather than the `cache.add` name. The bug pattern `e.waitUntil(caches.open(SHELL_CACHE)...)` is structurally distinct from any comment text, and the fix pattern `e.waitUntil(self.skipWaiting())` is a precise positive match. Comments mentioning `cache.add` don't trip either.
- **Lesson archived:** when writing absence-checks in smoke for a code pattern, prefer anchoring on call-site structure (`e.waitUntil(...)` argument shape) over function/method names that may legitimately appear in adjacent comments.

WPT intel converted to permanent regression guard in one commit — exactly the pattern PM-26-A unlocked.

---

## CANONICAL DOC REFS

**PM-26 WPT Spec Set:** `/mnt/user-data/outputs/PM-26_WPT_Spec_Set.md` (transient — should land on Drive permanently. PM-26-A and PM-26-B now complete; spec doc can be archived once PM-26-C-D land)
**Startup & Loading Polish spec (PM-25 source):** `1_0WcA2a3UWmFnmTvGmwZVdXiDtw_aSx5mMBlwZbC3FI`
**CANONICAL BUILD BACKLOG:** `1ugUh6UmeDkLR-gEH8hJPwXK2NiIrXYQY8gp2jO2p2Hk` (PM-26-A and PM-26-B both complete; PM-26-C/D/E-H queued)
**CI/Deploy Ref (READ AT SESSION START):** `1UrOoYDGaK2ncPrnRNXt1w0OElOLpbjP_EYROjG2w1zo`
**FIELD Current State (READ AT SESSION START):** `1GvsfnTH9Xhqzg_NdYrPhPpk1d1Rnm0lkeG6ip-tLUlA`
**PM-24 Canonical Key Design:** `1eG73NmJHUAPOR4E1bkFMg-Xxnq2E564ZIfB6dTGpsao`
**June 1 R2 Finals Handoff:** `1w5Ypy1ME6LlKKkyWh1_0IJyRm5iics61jhyBswO9uT8`
**TIER 1B spec:** `1UIuazvMvY4ewJap2Y4Z4-LbqHGvt8z-QhX28ImnAlt0`
**B1 spec:** `1yt-3ruXqTNNOl9k1jRQARFw9OtHt6IzNG4xkfcjVqTE`
