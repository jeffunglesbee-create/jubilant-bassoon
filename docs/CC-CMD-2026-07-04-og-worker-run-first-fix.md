# CC-CMD: Fix OG share-meta feature being bypassed — assets.run_worker_first missing

**Date:** 2026-07-04
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main
**Scope:** One config key in `wrangler.jsonc`.

**Why — real, live, confirmed bug, root-caused against Cloudflare's own
docs, not guessed:** `src/worker.js` (shipped via
`CC-CMD-2026-07-04-og-share-meta.md`) correctly implements bot-gated OG
`<meta property="og:description">` injection via HTMLRewriter — code
reviewed, logic is sound. But live-verified 2026-07-04 with a real
Twitterbot User-Agent against the production URL: **zero `og:` tags in
the response**, and the response carries `cf-cache-status: HIT`.
Root cause, confirmed against Cloudflare's own documentation (not
inferred): *"Workers will default to serving static assets ahead of
your Worker script, unless you have configured
`assets.run_worker_first`. This option is required if you are, for
example, performing any authentication checks or logging requests
before serving static assets."* Confirmed via direct read: `wrangler.jsonc`
has no `run_worker_first` key at all — meaning `src/worker.js`'s `fetch()`
handler, including its bot-detection and HTMLRewriter logic, is not
guaranteed to run at all; Cloudflare's platform-level static-asset
serving can and does handle requests directly. The endpoint the Worker
depends on (`/circadian/preview/{date}`) is confirmed separately working
correctly (`ok:true`, real text) — this is not a data problem, it's a
routing problem.

**Target time:** ~10 min

## ENVIRONMENT CONSTRAINTS (copy verbatim)
- *.workers.dev:443 blocked from CC egress
- Playwright tests must run via GitHub Actions CI — never localhost
- api.github.com is reachable from CC bash
- No branch switching — work on main only
- 2 attempts max on any push — declare failure and stop if both fail

## CONFIDENCE GATE
Do not commit unless confidence ≥ 95.

## PROBE BLOCK (run before any edits)
```bash
cat wrangler.jsonc
cat src/worker.js
curl -s "https://field-relay-nba.jeffunglesbee.workers.dev/circadian/preview/$(TZ=America/New_York date +%Y-%m-%d)"
```
Re-confirm `run_worker_first` is still absent and the dependency
endpoint still returns real data before editing — both may have changed
since 2026-07-04.

## TASK 1 — Add run_worker_first, scoped to the root document only

Find (wrangler.jsonc, re-verify exact current content):
```json
{
  "name": "jubilant-bassoon",
  "compatibility_date": "2026-05-23",
  "main": "src/worker.js",
  "assets": {
    "directory": ".",
    "binding": "ASSETS"
  },
  "compatibility_flags": ["nodejs_compat"]
}
```
Replace the `assets` block with:
```json
  "assets": {
    "directory": ".",
    "binding": "ASSETS",
    "run_worker_first": ["/"]
  },
```
**Scoped to `"/"` only, not `true` (all routes) or a broad glob** — the
Worker's own logic only does anything meaningful for the root HTML
document (`.on('title', ...)` targets the page's `<title>` tag, and the
bot-gating comment explicitly says "fetching the root document"). There
is no reason to route every image/CSS/JS asset request through the
Worker's `fetch()` handler — that would add latency to every static
asset for zero benefit, since `isBotRequest`/HTMLRewriter logic is
irrelevant to non-HTML assets. If probing reveals other paths that also
need this behavior (unlikely given the code's own stated single
purpose), report that rather than silently broadening scope.

## TASK 2 — Verify the fix live via CI-as-proxy, both bot and non-bot paths

This is not optional. Confirm via a real outbox-trigger probe (not just
config review):
1. A request with a bot User-Agent (e.g., `Twitterbot/1.0`) to the root
   URL now returns a response containing `<meta property="og:description"`
   with real, non-empty content.
2. A request with a normal browser User-Agent still returns the
   unmodified page — confirm "real users see zero behavior change" still
   holds, per the Worker's own stated design goal. Do not assume this
   is preserved just because the code path looks unchanged; verify it.
3. Non-HTML asset requests (e.g., a CSS or JS file, if this repo serves
   any as separate files) are NOT materially slower — confirm
   `run_worker_first: ["/"]` did not inadvertently widen scope beyond
   the root document.

## SCOPE BOUNDARY

DO:
- Add exactly `"run_worker_first": ["/"]` to the `assets` block
- Verify both bot and non-bot paths live (Task 2)
- Bump SW_VERSION if any content file changes as a result — likely N/A here since this is wrangler.jsonc only, confirm and state which is true

DO NOT:
- Modify `src/worker.js` itself — its logic is already correct, this is purely a routing/config fix
- Set `run_worker_first: true` (unscoped) — unnecessary latency cost for every static asset
- Touch the relay or the `/circadian/preview/{date}` endpoint — confirmed already working correctly

## DONE CONDITIONS
- [ ] Probe block re-run, current wrangler.jsonc and worker.js confirmed matching this doc's description
- [ ] `run_worker_first: ["/"]` added exactly as specified
- [ ] Live verification (Task 2, all three checks) completed via CI-as-proxy, not just code review
- [ ] CI confirms deployed
- [ ] Outbox manifest written to `docs/outbox/cc-og-worker-run-first-fix-{date}.md`, explicitly including the real bot-UA and non-bot-UA response evidence

## COMPLIANCE
- Rule 68: probe block first
- Rule 87: self-completing — live verification of both paths is achievable within this session via CI-as-proxy, not deferred

## CONFIDENCE SCORING TABLE
+30  run_worker_first added correctly, scoped to root only
+35  Live bot-UA verification shows real og:description tag present
+20  Live non-bot-UA verification confirms unchanged behavior for real users
+15  CI confirms deployed

## ONE-LINER
git pull. Read docs/CC-CMD-2026-07-04-og-worker-run-first-fix.md.
Re-confirm wrangler.jsonc's current state first (see PROBE BLOCK). Add
"run_worker_first": ["/"] to the assets block exactly as specified —
do not use true or broaden scope beyond the root path. Verify live via
CI-as-proxy with both a real bot User-Agent (confirm og:description
appears) and a normal one (confirm unchanged behavior) — this is
required, not optional. Do not commit unless confidence ≥ 95. If score
< 95 report verbatim and stop — do not invent results.
