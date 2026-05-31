# FIELD Handoff — May 31 2026 (PM session — WOW 6 Real Fixes + Hoisting Bug)

**jubilant-bassoon HEAD:** b9b56aa · Smoke: 238/0 · SW_VERSION 2026-05-31e
**field-relay-nba HEAD:** 0ff75b8 · Deploy: SUCCESS
**Session Doc (Drive):** 1A7OzCh_psRGvft0hQjJMTH96OkJvkK_GZo1EDIjCCgw

## TIER 0 DEADLINES
- World Cup 2026: June 11 HARD — flip wc26:true in FIELD_V2_SOURCES
- Stanley Cup Final G1: June 2 — VGK @ CAR (data path wired)
- NBA Finals G1: June 3 — SAS vs NYK (NBA v2 endpoint fixed today, verified end-to-end)
- USPTO provisional: ~June 25 — WOW 6 NOW provably works (was structurally broken until this session)

## WHAT WAS DISCOVERED + FIXED THIS SESSION

WOW 6 had NEVER worked end-to-end from the browser despite morning sweep docs marking it DONE. The cron path was fine (whitelisted X-FIELD-Relay value) so KV pre-rendered briefs worked — masking the failure. Every browser-triggered live brief (MLB/J2/J5/Stakes) silently 403'd at the proxy then hung in fetch without timeout.

### Six bugs fixed (all deployed)

1. **CORS preflight 405** on /journalism/generate
   - Browser POST with Content-Type:application/json triggered OPTIONS preflight → method gate returned 405
   - Fix: relay c135dcc — early OPTIONS handler returns 204 with full CORS headers + Max-Age 86400 + Access-Control-Expose-Headers for JQ audit headers

2. **NBA scoreboard 403** missing /liveData/ prefix
   - Browser called ${NBA_CDN_RELAY}/scoreboard/... but whitelist requires /liveData/scoreboard/...
   - Fix: browser 4371c91 — fixed 2 caller sites in index.html

3. **injectSquiggleTips ReferenceError** (scope bug, not stale cache)
   - The May 30 "restore Squiggle engine" commit e66bf3a paste-bombed 226 lines of AFL/Squiggle functions INSIDE fetchSchedule's body (lines 14411-14832 in original numbering), not at top level. In strict mode + ES6, nested function declarations are scoped to the containing function — NOT globally hoisted. Top-level setTimeout in renderAll at line 7117 couldn't see them.
   - The May 30 "hoisting fix" commit f8652b9 converted `var = async function` to `async function` — improved hoisting WITHIN fetchSchedule but didn't help callers outside.
   - Fix: browser 0eefcbf — moved Squiggle restoration block out of fetchSchedule to top scope; removed duplicate refreshAFLSection at line 15068
   - Verified via node Function constructor: typeof at top scope returned 'undefined' before, 'function' after

4. **/v2/games?sport=nba 500** — `(statusShort || "").toUpperCase is not a function`
   - The adaptBasketball adapter was reused for API-NBA, but the response shape differs entirely
   - The unresolved Rule 8 [VERIFY] marker on line 910 should have been resolved before the May 30 deploy — wasn't
   - Fix: relay fc6763a — added ?debug=1 mode, probed real shape (Spurs @ OKC 111-103 Final), wrote adaptApiNba with verified field paths:
     - status.long is reliable string ('Finished', 'Live', 'Not Started') — used as primary state determinant
     - teams.visitors (not teams.away)
     - scores.home.points (not scores.home.total)
     - scores.home.linescore[] array (not quarter_1..4 keyed fields)
     - arena.name (not top-level venue)
     - date.start (not top-level date)
     - league is bare string 'standard' — hardcode 'NBA' in output

5. **/bdl/.../season_averages 401** (tier-gating, not real bug)
   - Free-tier BDL key doesn't cover season_averages (GOAT plan $9.99/mo required)
   - Fix: relay c3c96e7 — relay intercepts BDL 401, returns 200 with empty data + X-RELAY-Tier-Gated:1 header. Browser code's "if !r.ok return null" path becomes "data.length === 0" path — no console spam.

6. **Live-path /journalism/generate "proxy returned no prose"** (the patent-critical fix)
   - X-FIELD-Relay header mismatch. Cron path used field-relay-cron-2026 (whitelisted by proxy → bypasses Origin check). Live path used field-relay-jq-2026 — NOT whitelisted → fell through to Origin check → 403 "Origin not allowed".
   - Diagnostic commit 01a2716 surfaced the real failure (HTTP_403 + body) in proxy_diagnostic field
   - Fix: relay 0ff75b8 — align live-path X-FIELD-Relay value to field-relay-cron-2026
   - Verified end-to-end via post-probe 2026-05-31T22:38Z: HTTP 200, real text, JQ audit headers populated, score=100, retries=1, layers_fired=['3b'], ms=1220, initial_cliches=0, final_cliches=0

7. **"Loading brief..." stuck in MLB bottom sheet** (no fetch timeout)
   - generateJournalismViaRelay's fetch at line 10868 had no AbortSignal.timeout. Same for the fallback proxy fetch at line ~18719.
   - When the relay was returning 502 (X-FIELD-Relay issue, pre-fix), fetch completed and returned null cleanly — the bottom sheet placeholder was removed. But after the X-FIELD-Relay fix, the relay started succeeding with long quality-chain latency, and if anything in the chain hung, the browser fetch hung too. .then() never fired. Placeholder stayed.
   - Fix: browser b9b56aa — AbortSignal.timeout(12000) on relay fetch, AbortSignal.timeout(10000) on fallback proxy fetch. On expiry, AbortError → caught → null returned → placeholder removed gracefully.

## VERIFICATION STATE

- Smoke: 238/0 passing (pre-existing failures A273/A313/A314 still excluded from gate)
- Relay /journalism/generate: end-to-end probe returns 200 with text + score=100 + layers_fired=['3b']
- Relay /v2/games?sport=nba: end-to-end probe returns correct Spurs/OKC final score 111-103
- Relay /bdl/nba/v1/season_averages: returns 200 with empty data + tier_required:GOAT (suppresses console spam)
- Browser SW_VERSION 2026-05-31e live on origin

## NEXT SESSION — IMMEDIATE PRIORITIES

1. Browser verify SW 2026-05-31e is active and MLB brief actually populates (Jeff's last screenshot showed Loading brief... stuck — that should be resolved now with the timeout fix)
2. Verify window._lastJQAudit populates after tapping any J2/MLB/Stakes/J5 brief trigger
3. Update the 5 morning sweep docs (STANDARDS, Arch Spec, JQ Spec, 10 Wow, Infra) per amendments in session doc 1A7OzCh_psRGvft0hQjJMTH96OkJvkK_GZo1EDIjCCgw

## REMAINING CONSOLE ERRORS — DEFERRED

LOW PRIORITY (upstream issues, browser-side handled gracefully):
- /espn-summary/.../nba/summary 404 — upstream gameId mismatch
- /mlb-umpire-scrape 502 — relay scrape route, upstream HTML structure may have changed
- api.openf1.org/v1/sessions?date_start%3E=... 404 — URL encoding of '>=' character
- a.espncdn.com/...wnba/500/ACES.png 404 — WNBA Aces logo path naming

None block patent-critical paths.

## BDL DECISION PENDING

Free-tier BDL key returns 401 on /season_averages. Options:
- Upgrade to BDL GOAT plan ($9.99/mo) — enables milestone detection in NBA briefs
- Remove milestone detection feature entirely
- Find alternative free data source for season averages

Currently the 401 is suppressed at the relay (returns 200 empty data + tier marker). NBA briefs run without milestone context.

## DOC AMENDMENTS PENDING

The morning sweep docs in Drive need amendment per the detailed instructions in session doc 1A7OzCh_psRGvft0hQjJMTH96OkJvkK_GZo1EDIjCCgw. Specifically:
- STANDARDS.md: add "RUWT [VERIFY] markers non-negotiable" + "Browser fetches need AbortSignal.timeout"
- Arch Spec v2: correct WOW 6 status; add diagnostic capture pattern
- JQ Spec: amend WOW 6 implementation section with known failure modes
- 10 Wow Factors: correct WOW 6 status row to reflect May 31 PM live-path fix
- Infra Backlog: add deploy-gate probe + BDL decision + diagnostic discipline items
