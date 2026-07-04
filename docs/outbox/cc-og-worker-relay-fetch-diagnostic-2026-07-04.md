# CC Outbox — OG Worker Relay Fetch Diagnostic — ROOT CAUSE FOUND

**Date:** 2026-07-04
**CC-CMD:** docs/CC-CMD-2026-07-04-og-worker-relay-fetch-diagnostic.md
**Commits:** e2e58f3 (diagnostic added + deployed), 4015a3d (diagnostic removed + deployed)
**Deploy:** Add: run 28718995826 succeeded. Remove: run 28719093245 succeeded.

**Outcome: the diagnostic answered its question definitively. This is
the real, confirmed root cause behind every symptom the prior three
CC-CMDs (v1/v2 run_worker_first, argument-order fix) observed.**

---

## Probe block — confirmed matching state before editing

```
cat src/worker.js
```
Confirmed the file matched exactly the post-argument-order-fix state
(the corrected `element.after(content, {html:true})` call, no
diagnostic route) before adding anything.

## TASK 1 — diagnostic route added exactly as specified

Added `/__diag_relay_fetch` before the bot-detection branch, exactly
matching the doc's code block verbatim. `node --check src/worker.js`
confirmed syntax; `git diff` confirmed only this one addition (34
insertions), nothing else touched.

## TASK 2 — deployed, called live, real result captured verbatim

`src/worker.js` alone isn't in `deploy-gate.yml`'s trigger paths, so
bumped SW_VERSION (`2026-07-04p` → `q`) to trigger the deploy — same
established mechanism as the prior two CC-CMDs. Deploy-gate run
28718995826 succeeded.

Called the live route via CI-as-proxy (`outbox/.trigger-cf-api` →
`cf-api-probe.yml`). **Full, complete, real JSON result, verbatim:**

```json
{
    "attempted": true,
    "targetUrl": "https://field-relay-nba.jeffunglesbee.workers.dev/circadian/preview/2026-07-04",
    "status": 404,
    "ok": false,
    "bodySnippet": "error code: 1042\n",
    "jsonParseError": "Unexpected token 'e', \"error code: 1042\n\" is not valid JSON"
}
```

**This is the answer.** The in-Worker `fetch()` call itself completes
(no thrown exception, no timeout — `result.fetchError` is absent) but
receives an HTTP 404 with Cloudflare's own platform-level error body
`"error code: 1042"`, not a real response from the relay at all.

**Independently verified what Cloudflare error 1042 means** (not
assumed from the doc's own framing) via web search of Cloudflare's own
community documentation:

> Error 1042 occurs when one Cloudflare Worker tries to fetch from
> another Worker on the same zone / another `*.workers.dev` subdomain,
> which is blocked by default for security reasons (prevents request
> loops/abuse). Cloudflare provides an opt-in `global_fetch_strictly_public`
> compatibility flag to relax this restriction for fetches to public
> hostnames (custom domains or `*.pages.dev`) — `*.workers.dev` targets
> remain blocked even with the flag.

Sources: [Get error code 1042 when fetching within worker — Cloudflare Community](https://community.cloudflare.com/t/get-error-code-1042-when-fetching-within-worker/288031),
[How to Fix Cloudflare Workers Error 1042](https://onescales.com/blogs/main/cloudflare-workers-error-1042).

**This explains every symptom observed across all three prior
CC-CMDs**, with no remaining ambiguity: `jubilant-bassoon`'s Worker
(`src/worker.js`, deployed at `jubilant-bassoon.jeffunglesbee.workers.dev`)
was always blocked by Cloudflare's own platform from fetching
`field-relay-nba.jeffunglesbee.workers.dev` (another `*.workers.dev`
subdomain) — regardless of `run_worker_first`, regardless of the
`Element.after()` argument order, regardless of caching or
cache-busting. The relay endpoint working perfectly from every GitHub
Actions CI probe this session ran was never in question — those probes
run from a completely different network context (a GitHub-hosted
runner, not inside Cloudflare's Workers runtime) where this restriction
does not apply.

## TASK 3 — diagnostic removed, removal confirmed deployed

Removed the entire diagnostic block. `git diff` against the parent
commit (before the diagnostic was added) confirms `src/worker.js` is
now **byte-identical** to its pre-diagnostic state — verified via direct
`diff` against `git show e2e58f3~1:src/worker.js`, not just eyeballed.
`node --check` confirmed syntax. Bumped SW_VERSION again (`q` → `r`) to
trigger the removal deploy — deploy-gate run 28719093245 succeeded.

**Confirmed live, not just via source review**: re-called
`/__diag_relay_fetch` via CI-as-proxy after the removal deployed —
response body is now empty (falls through to normal passthrough
handling), not the diagnostic JSON. The diagnostic is gone from the
live, deployed site.

## Smoke / SW_VERSION

`node smoke.js index.html`: 871/0 throughout (this task never touched
index.html content beyond the two SW_VERSION bumps needed to trigger
deploys). Final SW_VERSION: `2026-07-04r`.

## No fix implemented here — per this CC-CMD's own explicit scope

This CC-CMD's deliverable was an answer, not a fix, and that boundary
was respected: no changes to `wrangler.jsonc`'s `compatibility_flags`,
no attempt to switch the relay URL to a custom/public domain, nothing
beyond the temporary diagnostic and its clean removal. The real fix
(most likely: add `global_fetch_strictly_public` is NOT sufficient
since it explicitly does not unblock `*.workers.dev`-to-`*.workers.dev`
fetches per the sources above — the actual fix will need either a
custom domain for the relay, or restructuring how the OG worker gets
its description data) belongs in its own follow-up CC-CMD.

## CC-verifiable confidence score (per the doc's own rubric)

- **+30** Diagnostic added correctly, scoped exactly as specified —
  **30/30.**
- **+40** Real, complete result captured and reported verbatim —
  **40/40.** Full JSON included above, independently researched and
  explained, not just pasted without context.
- **+30** Diagnostic fully removed and removal confirmed deployed —
  **30/30.** Confirmed via `diff` against the pre-diagnostic commit
  AND via a live post-removal probe.

**Total: 100/100.** Committed.

## Deferred to chat / next steps

- [ ] Author a follow-up CC-CMD to actually fix the OG feature, now
      that the real, confirmed cause is known: `*.workers.dev`-to-
      `*.workers.dev` fetches are blocked by Cloudflare regardless of
      any compatibility flag. Two real candidate directions, neither
      decided here: (a) put the relay behind a custom/public domain the
      OG worker can legally fetch, or (b) avoid the live relay fetch
      entirely from within the Worker (e.g. read from KV/D1 directly,
      or a scheduled job that pre-computes the description elsewhere).

---

## Done Conditions

- [x] Probe block re-run, current file state confirmed
- [x] Diagnostic route added exactly as specified
- [x] Live result captured and reported verbatim, complete, not
      summarized
- [x] Diagnostic route removed, removal confirmed deployed (both via
      source diff and a live post-removal probe)
- [x] Outbox manifest written (this file) with the full raw JSON result
      included
