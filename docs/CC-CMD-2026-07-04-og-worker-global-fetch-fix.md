# CC-CMD: Fix error 1042 with the ALREADY-PROVEN flag — this is not a new problem

**Date:** 2026-07-04
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main
**Scope:** One compatibility flag in `wrangler.jsonc`.

**Why — this exact bug was already diagnosed and fixed once before, in
this same codebase.** The diagnostic CC-CMD found `src/worker.js`'s
in-Worker fetch to `field-relay-nba.jeffunglesbee.workers.dev` failing
with Cloudflare error 1042 — a Worker blocked from fetching another
Worker's `*.workers.dev` subdomain on the same account, a platform-level
anti-loop restriction. **A May 29 2026 session diagnosed the identical
failure mode** (the relay's journalism cron fetching the
`field-claude-proxy` Worker's `*.workers.dev` URL, same account, same
error 1042) and shipped the fix: `compatibility_flags:
["global_fetch_strictly_public"]`, which routes the fetch through the
public internet path instead of the blocked internal same-account path.
**Confirmed still present and working today** — checked the relay's own
current, live `wrangler.toml` directly: the flag is still there, 5+
weeks later, and the relay has been successfully handling cross-Worker
fetches throughout this entire session. This is not a new problem
needing a new architecture (custom domain, KV/D1 caching, scheduled
job) — it's the same bug with an already-proven, minimal fix.

**Target time:** ~15 min

## ENVIRONMENT CONSTRAINTS (copy verbatim)
- *.workers.dev:443 blocked from CC egress — CI-as-proxy for the live check
- Playwright tests must run via GitHub Actions CI — never localhost
- api.github.com is reachable from CC bash
- No branch switching — work on main only
- 2 attempts max on any push — declare failure and stop if both fail

## CONFIDENCE GATE
Do not commit unless confidence ≥ 95.

## PROBE BLOCK (run before any edits)
```bash
cat wrangler.jsonc
```
Also, via CI-as-proxy or a check against the relay repo, re-confirm
`field-relay-nba/wrangler.toml` still has
`global_fetch_strictly_public` in its `compatibility_flags` — do not
assume this doc's 2026-07-04 snapshot is still accurate without
re-checking.

## TASK 1 — Add the flag

Find (wrangler.jsonc, re-verify current content):
```json
  "compatibility_flags": [
    "nodejs_compat"
  ]
```
Replace with:
```json
  "compatibility_flags": [
    "nodejs_compat",
    "global_fetch_strictly_public"
  ]
```

## TASK 2 — Live verification, the same way the actual bug was confirmed

Via CI-as-proxy: call the same diagnostic pattern used in the prior
CC-CMD (a temporary route calling `fetch()` to the relay's
`/circadian/preview/{date}` endpoint from within this Worker) — OR, if
the permanent diagnostic route was fully removed as required, add a
fresh temporary one, use it once, remove it again in this same CC-CMD,
following the exact same add/verify/remove discipline as the prior
diagnostic. Confirm the fetch now succeeds (status 200, real JSON body,
no error 1042) where it previously failed. Then confirm the actual
feature works end-to-end: a cache-busted bot-UA request to the root URL
now returns a real `og:description` tag; a normal UA request is
unchanged.

## SCOPE BOUNDARY

DO:
- Add exactly the one flag
- Verify via a temporary diagnostic (added and removed in this same CC-CMD, same discipline as before) that the fetch now succeeds
- Verify the actual OG feature end-to-end, bot and non-bot, cache-busted

DO NOT:
- Modify `src/worker.js`'s logic — it's already correct (confirmed in the two prior CC-CMDs); this is purely a config-level fix
- Modify `field-relay-nba`/its `wrangler.toml` — already correct, already has the flag, not the problem
- Pursue either of the two previously-proposed directions (custom domain, or removing the live fetch entirely) — the proven, minimal fix supersedes both

## DONE CONDITIONS
- [ ] Probe block re-run, current state confirmed, relay's flag re-confirmed present
- [ ] Flag added exactly as specified
- [ ] Temporary diagnostic confirms the in-Worker fetch now succeeds (added and fully removed in this CC-CMD)
- [ ] Live verification confirms the actual OG feature works end-to-end, bot and non-bot, cache-busted
- [ ] CI confirms deployed
- [ ] Outbox manifest written to `docs/outbox/cc-og-worker-global-fetch-fix-{date}.md`, with the real verification evidence included

## COMPLIANCE
- Rule 68: probe block first, including re-confirming the relay precedent is still real
- Rule 87: self-completing — verification achievable within this session via CI-as-proxy

## CONFIDENCE SCORING TABLE
+25  Flag added correctly
+35  Temporary diagnostic confirms the fetch itself now succeeds (isolates the actual fix from the end-to-end feature)
+25  Full end-to-end OG feature verified working, bot and non-bot
+15  CI confirms deployed

## ONE-LINER
git pull. Read docs/CC-CMD-2026-07-04-og-worker-global-fetch-fix.md.
Re-confirm current wrangler.jsonc and re-confirm field-relay-nba's
wrangler.toml still has global_fetch_strictly_public before assuming
this doc's precedent is still accurate. Add
"global_fetch_strictly_public" to compatibility_flags exactly as
specified. Verify via a temporary diagnostic (add, use once, remove
fully) that the in-Worker fetch to the relay now succeeds, then verify
the actual OG feature end-to-end for both bot and non-bot UAs,
cache-busted. Do not commit unless confidence ≥ 95. If score < 95
report verbatim and stop — do not invent results.
