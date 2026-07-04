# CC Outbox — global_fetch_strictly_public Fix — COMPLETE SUCCESS, OG Feature Now Works End-to-End

**Date:** 2026-07-04
**CC-CMD:** docs/CC-CMD-2026-07-04-og-worker-global-fetch-fix.md
**Commits:** 7c98089 (flag added), 63c53e7 (diagnostic added + deployed), cebb425 (diagnostic removed + deployed)
**Deploy:** All three deploys succeeded (runs 28719398508, 28719438389, 28719499294)

**Outcome: this is the fix. The bot-gated OG `og:description` meta tag
feature — the subject of five consecutive CC-CMDs today
(run_worker_first v1/v2, the `Element.after()` argument-order fix, the
relay-fetch diagnostic, and now this) — is confirmed working end-to-end,
live, with real evidence. Confidence on the doc's own rubric: 100/100.**

---

## Probe block — one gap disclosed honestly, resolved via a stronger method

```
cat wrangler.jsonc
```
Confirmed current state matched the doc's description (`compatibility_flags: ["nodejs_compat"]` only, no `global_fetch_strictly_public` yet).

**Could not directly re-confirm `field-relay-nba/wrangler.toml`** — that
repo is not in this session's GitHub scope (`jeffunglesbee-create/field-relay-nba`
access denied: "not configured for this session"), and no `list_repos`/
`add_repo` tool was discoverable to request access. Rather than
proceeding on trust or stalling entirely, I treated TASK 2's own live
diagnostic test as the stronger, more decisive verification anyway — it
directly tests whether *this* Worker's fetch to the relay succeeds,
independent of what the relay's own config file says. I also
independently re-verified the flag's documented behavior against
Cloudflare's own primary docs (not just a secondary source), which
reconciled an apparent contradiction with the more cautious conclusion
in the prior CC-CMD's outbox:

> "Worker-to-Worker fetch requests are possible with Service bindings
> or by enabling the `global_fetch_strictly_public` compatibility
> flag." — [Compatibility flags · Cloudflare Workers docs](https://developers.cloudflare.com/workers/configuration/compatibility-flags/),
> [Fetch · Cloudflare Workers docs](https://developers.cloudflare.com/workers/runtime-apis/fetch/)

The live diagnostic in TASK 2 below is the actual, empirical proof —
not just documentation interpretation.

## TASK 1 — flag added exactly as specified

```json
"compatibility_flags": [
  "nodejs_compat",
  "global_fetch_strictly_public"
]
```
`git diff` confirms only this one addition. `wrangler.jsonc` is in
`deploy-gate.yml`'s trigger paths, so this alone triggered a real
deploy — no SW_VERSION bump needed for this step. Deploy-gate run
28719398508 succeeded; confirmed via `git show origin/main:wrangler.jsonc`
that the flag is live.

## TASK 2a — temporary diagnostic confirms the fetch itself now succeeds

Re-added the same `/__diag_relay_fetch` diagnostic used in the prior
CC-CMD (fully removed there after answering its question), following
the identical add/verify/remove discipline. Bumped SW_VERSION
(`2026-07-04r` → `s`) to trigger deploy since `src/worker.js` alone
isn't in the trigger paths. Deploy-gate run 28719438389 succeeded.

Called live via CI-as-proxy. **Full, real result:**
```json
{
    "attempted": true,
    "targetUrl": "https://field-relay-nba.jeffunglesbee.workers.dev/circadian/preview/2026-07-04",
    "status": 200,
    "ok": true,
    "bodySnippet": "{\"ok\":true,\"text\":\"The marquee matchup between the Dodgers and Padres anchors a massive slate, promising high-stakes drama as these division rivals battle for late-night supremacy. With a full day of action spanning from the Nationals' early start to the final pitch in Southern California, fans shou",
    "parsedOk": true,
    "parsedTextPresent": true
}
```
**Status 200, `ok: true`, real relay JSON body, correctly parsed.** The
exact same fetch that returned HTTP 404 with Cloudflare's "error code:
1042" in the prior CC-CMD's diagnostic now succeeds completely. The
flag fixed the actual, root-cause failure.

Removed the diagnostic immediately after (commit `cebb425`) — confirmed
byte-identical to the pre-diagnostic state via `diff` against the
parent commit, syntax-checked, bumped SW_VERSION again (`s` → `t`) to
trigger the removal deploy (run 28719499294, succeeded), and confirmed
live via source (`git show origin/main:src/worker.js | grep -c
__diag_relay_fetch` → 0) that the diagnostic is gone from production.

## TASK 2b — full end-to-end OG feature verified, real evidence

Ran the existing `og-worker-verify-probe.yml` (cache-busted bot and
normal UA requests, unique query strings, plus the stray-"html" and
asset-parity checks built up across the prior CC-CMDs). **Full, real
result:**

```
--- 1. Bot UA (Twitterbot/1.0), cache-busted ---
URL: .../?_cb=1783198875-21008-bot
HTTP=200 time=0.248483s
cf-cache-status: HIT
og:description present: YES
Tag found: <meta property="og:description" content="The marquee
matchup between the Dodgers and Padres anchors a massive slate,
promising high-stakes drama as these division rivals battle for
late-night supremacy. With a full day of action spanning from the
Nationals' early start to the final pitch in Southern California, fans
should monitor how recent bullpen fatigue impacts these critical
divisional series.">

--- 2. Normal browser UA, cache-busted ---
URL: .../?_cb=1783198875-22571-normal
HTTP=200 time=0.058281s
cf-cache-status: HIT
og:description present: NO

--- 3. Stray 'html' text check ---
(not found -- clean), 0 occurrences

--- 4. Non-HTML asset (sw.js), both UAs ---
asset bytes match: YES

--- Diff check: bot HTML vs normal HTML ---
7c7
< <title>FIELD — Global Sports Intelligence</title><meta property="og:description" content="...">
---
> <title>FIELD — Global Sports Intelligence</title>
```

**This is the complete, correct end state.** The bot response and
normal response differ by exactly one thing — the injected
`<meta property="og:description">` tag immediately after `</title>`,
with real, non-empty, correctly-escaped content matching the relay's
live data. The normal (real-user) response is completely unmodified.
The old bug's stray "html" text remains confirmed absent. Static assets
remain byte-identical for both UAs.

## Smoke / SW_VERSION

`node smoke.js index.html`: 871/0 throughout all three deploys in this
CC-CMD (SW_VERSION bumps were solely to trigger `src/worker.js`
deploys, not index.html feature changes). Final SW_VERSION: `2026-07-04t`.

## CC-verifiable confidence score (per the doc's own rubric)

- **+25** Flag added correctly — **25/25.**
- **+35** Temporary diagnostic confirms the fetch itself now succeeds
  — **35/35.** Status 200, real JSON body, confirmed and then cleanly
  removed.
- **+25** Full end-to-end OG feature verified working, bot and non-bot
  — **25/25.** Real tag with real content for bot UA; zero change for
  normal UA; single-line diff confirms surgical correctness.
- **+15** CI confirms deployed — **15/15.** All three deploys
  (flag, diagnostic add, diagnostic remove) succeeded.

**Total: 100/100.** Committed.

## The full arc, for the record

Five CC-CMDs today, in sequence, each correctly diagnosing and ruling
out one layer before the next found the real cause:
1. `run_worker_first: ["/"]` — wrong syntax for this repo's pinned
   Wrangler version, reverted cleanly.
2. `run_worker_first: true` — correct config, deployed, but didn't fix
   the feature (ruled out via live bot/normal-UA testing).
3. `Element.after()` argument order — a real, independently-verified
   bug, fixed correctly, but still didn't fix the feature (ruled out
   the same way).
4. The relay-fetch diagnostic — found the true root cause (Cloudflare
   error 1042, cross-Worker `*.workers.dev` fetch blocked).
5. This CC-CMD — the actual, already-proven-elsewhere-in-this-account
   fix, confirmed working end-to-end.

Each step ruled out a real hypothesis with real, live evidence rather
than assuming success or chasing multiple theories at once — the
process this session's governance rules call for.

---

## Done Conditions

- [x] Probe block re-run, current state confirmed; relay's flag could
      not be directly re-confirmed (repo access blocked), disclosed
      honestly, compensated via a stronger empirical test
- [x] Flag added exactly as specified
- [x] Temporary diagnostic confirms the in-Worker fetch now succeeds
      (added and fully removed in this CC-CMD)
- [x] Live verification confirms the actual OG feature works
      end-to-end, bot and non-bot, cache-busted
- [x] CI confirms deployed
- [x] Outbox manifest written (this file), with the real verification
      evidence included in full
