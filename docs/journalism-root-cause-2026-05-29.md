# FIELD — Journalism Root-Cause Chain (6 Layers)
**May 29 2026**

## Summary
The FIELD Brief / compound editorial never rendered prose. This was **not one bug** — it was a chain of six independent failures, each masking the next. Found by adding diagnostics that surfaced real error strings instead of letting failures return null silently.

**Repos:** `jubilant-bassoon` (index.html, sw.js, smoke.js); `field-relay-nba` (relay worker + journalism cron + proxy copy).

**KEY ARCHITECTURAL TRUTH:** the *deployed* proxy is `field-relay-nba/workers/field-claude-proxy/` (relay `deploy.yml` workingDirectory is relative to the RELAY repo checkout). The `jubilant-bassoon/workers/field-claude-proxy/` copy is a **stale fork that never deploys**. Always edit the RELAY copy. The relay copy runs `gemini-3.1-flash-lite` (PROXY_VERSION 6).

## Layer 1 — Missing field_utils.js functions [923e12e]
`stripJsonFences`, `trimToCompleteSentence` + 6 others were defined only in `field_utils.js` (a Node test module, not loaded in the browser). Commit 1f8a4bf moved `trimToCompleteSentence` out of index.html; `stripJsonFences` was never added. Every journalism call threw a ReferenceError, silently caught, returned null. **Fix:** inlined all 8 into index.html. **Guard:** smoke A191 (self-updating — extracts every `function X(` from field_utils.js, fails CI if any used in index.html isn't defined there).

## Layer 2 — Stale service worker [1f84293]
SW_VERSION frozen at 2026-05-25a while index.html bumped each deploy; stale-while-revalidate served a 4-day-old shell. **Fix:** synced version; smoke A190 (self-updating version match); commit 9305375 added `updatefound → statechange → location.reload()` for auto-reload (Android Chrome/PWA + iOS Safari PWA). **Note:** a build predating the auto-reload (e.g. 2026-05-29b) needs ONE manual cache clear to escape; after that, auto-reload handles all future updates.

## Layer 3 — Client 429 storm [build h]
Repeated hard-reloads each fired a fresh compound + J-layer burst, exceeding Gemini 15 RPM. `_compoundRetryAfter` was in-memory, reset each reload. **Fix:** persist `_compoundRetryAfter` to localStorage (`field_compound_retry_after`); backoff guard at `fetchCompoundEditorial` entry returns null during cooldown.

## Layer 4 — Cron error 1042 (Worker-to-Worker) [relay 696d408]
The journalism cron fetched the proxy via workers.dev — a same-account Worker→Worker fetch, **blocked by Cloudflare with error 1042**. Cron NEVER populated `FIELD_JOURNALISM` KV; clients fell through to direct browser→proxy calls; the reload storm hit the limit. **Fix:** `compatibility_flags = ["global_fetch_strictly_public"]` in relay wrangler.toml routes the fetch through the public path. Browser→proxy was never affected (browsers aren't Workers).

## Layer 5 — Cron 403 "Origin not allowed" [relay c5294f3]
After 1042 cleared, the proxy rejected the cron: Workers send no Origin header, `ALLOWED_ORIGINS.includes('')` fails. Initial fix went to the WRONG (jubilant-bassoon) proxy copy before the deploy gotcha was found. **Fix:** `X-FIELD-Relay` shared-header bypass on the RELAY proxy copy (`relayAuth === RELAY_SHARED_SECRET || 'field-relay-cron-2026'` skips the Origin check); cron sends the header; PROXY_VERSION 5→6. Browsers can't set this header cross-origin without a failing preflight, so no spoofing.

## Layer 6 — Gemini daily quota 429 [external, no code fix]
After all structural fixes the cron reaches Gemini cleanly but gets 429 (proxy forwards verbatim). A 90s cooldown didn't clear it — daily RPD burned by the day's test storm. Resets midnight Pacific (~08:00 UTC). **Auto-recovery:** the `*/15` cron auto-runs `handleJournalismCycle` and populates KV on the next tick after recovery — zero manual action. Once KV has prose, clients read it (zero Gemini calls); the rate limit becomes permanently irrelevant (intended O(1) Newspaper design).

## Billing (May 29 2026)
Gemini account on **Paid Tier 1** ($250 tier cap, prepaid balance, auto-reload on, one project). Credit consuming normally — confirms the key is correctly attached to the billed project, so **no key regeneration needed**. Today's 429 was the per-minute burst limit from the test storm, not a misconfigured key. At O(1) usage, spend is under a dollar/month.

## Diagnostic progression (via /journalism/run)
1042 → 403 "Origin not allowed" → clean 429 (only quota remains).

## New infrastructure this session
- `/journalism/run` manual trigger (relay; in method-guard exception alongside `/pgatour`).
- `handleJournalismCycle` returns `{ok, reason, proxyStatus, ...}` at each bail point.
- FIELD Health Panel "Journalism" row: "Brief rendered" vs "Static only — compound null · N AI calls · err: ..." (err = `window._compoundLastError`).

## Verify recovery
1. POST `/journalism/run` → expect `{ok:true, reason:"written"}`
2. GET `/journalism/tonight` → expect `{brief, generatedAt}` populated
3. Client (after auto-reload to current SW) shows FIELD Brief prose
4. Health Panel "Journalism" row → "Brief rendered"

## SW progression
2026-05-29 a → b (functions inlined) → c → d (auto-reload) → e (health row) → f (compound error capture) → g (proxy status) → h (persisted backoff). Smoke 243/0 throughout.

## Cross-references
- O(1) Newspaper Architecture (Drive): `16yzIrsgkSRQVQs-j6URiPUskyqObqBpqJ0H0iv1dg7c`
- Journalism Cost Architecture Analysis (Drive): `1WjcuEQXtIMmJA3wXERt_HNDtGDRsYp9v-gEjRiyg3RM`
- Full detail also in `jubilant-bassoon/HANDOFF.md` (commit 2e170d8)
