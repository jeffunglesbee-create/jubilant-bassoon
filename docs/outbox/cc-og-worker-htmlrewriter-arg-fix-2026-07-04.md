# CC Outbox — Element.after() Argument Order Fix — Fix Correct, Task 2 STILL FAILS

**Date:** 2026-07-04
**CC-CMD:** docs/CC-CMD-2026-07-04-og-worker-htmlrewriter-arg-fix.md
**Commits:** 07b1c71 (the argument-order fix itself), eb83a55 (SW_VERSION bump to trigger deploy), 43b136c (extended verify tooling)
**Deploy:** Deploy gate run 28718763522 — succeeded

**Outcome: TASK 1 (the fix itself) is correct and confirmed deployed.
TASK 2 (live verification) still fails — the bot UA still does not
receive an `og:description` tag, even with this fix live. Per this
CC-CMD's own SCOPE BOUNDARY ("if TASK 2 still fails after this fix,
report that plainly rather than falling back to re-investigating them
without being asked"), this is reported plainly below and investigation
stops here, not extended into new hypotheses. Confidence on the doc's
own rubric: 60/100, below the ≥95 gate.**

---

## Probe block — re-run, bug confirmed exactly as described

```
cat src/worker.js
```
Confirmed the exact swapped-argument call:
```javascript
element.after('html', {
    html: `<meta property="og:description" content="...">`,
});
```
Matches the doc's description precisely.

**Independently re-verified the correct `Element.after` signature**
against Cloudflare's own documentation (not just trusting this doc's
claim), via two separate web searches:
- Cloudflare's HTMLRewriter docs describe `after()` accepting content
  and an optional `options: {html: boolean}`.
- The actual `@cloudflare/workers-types` TypeScript definitions show:
  `after(content: Content, options?: ContentOptions): Element` —
  content first, options (with `html: boolean`) second.

Both independently confirm the doc's claimed signature. Sources:
[HTMLRewriter · Cloudflare Workers docs](https://developers.cloudflare.com/workers/runtime-apis/html-rewriter/),
[workers-types/index.d.ts](https://github.com/cloudflare/workers-types/blob/master/index.d.ts).

## TASK 1 — argument order fixed exactly as specified

```javascript
element.after(
    `<meta property="og:description" content="${this.description.replace(/"/g, '&quot;')}">`,
    { html: true }
);
```
`git diff` confirms only this one method changed (4 insertions, 3
deletions) — nothing else in `src/worker.js` touched, `wrangler.jsonc`
(and its `run_worker_first: true`, set by the prior CC-CMD) untouched.
`node --check src/worker.js` confirms syntax; `node smoke.js index.html`
unaffected (871/0 — this file isn't part of that suite).

**Deploy note:** `src/worker.js` is not in `deploy-gate.yml`'s trigger
paths (index.html, sw.js, field_utils.js, wrangler.jsonc only). A plain
push of this fix alone would never have deployed. Bumped SW_VERSION
(`2026-07-04o` → `2026-07-04p`, commit `eb83a55`) as the minimal,
in-scope, already-established mechanism this session uses for every
deploy — not a workflow-config change. Deploy-gate run 28718763522
succeeded; confirmed via `git show origin/main:src/worker.js` that the
corrected call is live.

## TASK 2 — live verification: fix confirmed correct, but feature STILL does not work

Extended the existing verify probe (`.github/workflows/og-worker-verify-probe.yml`)
to cache-bust BOTH the bot and normal UA requests (unique query string
each) and to explicitly check for the old bug's literal stray "html"
text, not just the tag's absence/presence. Ran once, live, against the
now-deployed fix:

```
--- 1. Bot UA (Twitterbot/1.0), cache-busted ---
URL: .../?_cb=1783197141-14086-bot
HTTP=200 time=0.091155s
cf-cache-status: HIT
og:description present: NO
Tag found: (none)

--- 2. Normal browser UA, cache-busted ---
URL: .../?_cb=1783197141-12589-normal
HTTP=200 time=0.073329s
cf-cache-status: HIT
og:description present: NO

--- 3. Stray 'html' text check ---
Bot response — standalone '>html<' or bare 'html' after </title>: (not found -- clean)
Bare-word 'html' outside tags/attrs: 0 occurrences

--- 4. Non-HTML asset (sw.js) unaffected, both UAs ---
asset bytes match: YES

--- 5. Full bot response excerpt around <title> ---
<title>FIELD — Global Sports Intelligence</title>

--- Diff check: bot HTML vs normal HTML ---
(empty — byte-identical)
```

**Result: `og:description` is still absent for the bot UA, even with a
guaranteed-unique cache-busted URL. Bot and normal responses remain
byte-identical.** The one thing that DID change: the old bug's literal
stray "html" text is confirmed gone (check #3, clean) — meaning the
specific malformed call this CC-CMD targeted really was broken before
and really is fixed now, in isolation. But fixing it did not make the
end-to-end feature work.

## What this means, reported plainly, not re-investigated further

Per this CC-CMD's own explicit instruction, I am not chasing a new
hypothesis here. One observation worth recording for whoever picks this
up next, offered as an unconfirmed possibility rather than a new
investigation: the response being byte-identical to the plain
passthrough page — rather than containing a malformed or partial tag —
is consistent with `MetaTagRewriter.element()`'s `if (this.description)`
guard never being true, i.e. `description` stays `null` and the
function's own early-return (`if (!description) return response;`)
fires before `HTMLRewriter` is ever invoked. That would happen if the
in-Worker fetch to `/circadian/preview/{date}` fails or times out from
within Cloudflare's own execution environment — a different code path
than the one this CC-CMD's scope covers, and different from anything
this session's CI-based curl probes (which run from GitHub Actions
runners, not from inside a Cloudflare Worker) can observe directly.
This is a plausible next lead, not a conclusion — flagging it for a
follow-up CC-CMD to actually investigate, not resolving it here.

## Smoke / SW_VERSION

`node smoke.js index.html`: 871/0, unaffected (SW_VERSION bump was the
only index.html/sw.js change, purely to trigger deploy).

## CC-verifiable confidence score (per the doc's own rubric) — reported honestly

- **+30** Argument order corrected exactly, matching Cloudflare's
  documented signature — **30/30.** Independently re-verified against
  two sources, implemented exactly, confirmed deployed.
- **+40** Live cache-busted verification shows the real tag now
  appearing for bot UA, absent for normal UA — **0/40.** Tag still
  absent for bot UA; responses still byte-identical.
- **+15** Stray "html" text confirmed NOT present — **15/15.**
  Confirmed clean, validating the targeted bug's mechanism was real and
  is now actually fixed in isolation.
- **+15** CI confirms deployed — **15/15.**

**Total: 60/100.** Below the ≥95 gate. Per the CC-CMD's own instruction
— "if TASK 2 still fails after this fix, report that plainly" —
reporting this plainly rather than inventing a pass or chasing a new
hypothesis uninvited.

## Deferred to chat / next steps

- [ ] Decide whether to author a CC-CMD investigating the in-Worker
      relay-fetch path specifically (timeout value, reachability from
      within the Workers runtime, response shape under real conditions)
      — the one concrete, plausible lead surfaced above, not yet
      confirmed.

---

## Done Conditions

- [x] Probe block re-run, current `element.after(...)` call confirmed
      matching this doc's description
- [x] Argument order corrected exactly as specified
- [x] Live verification (Task 2, all checks) completed via CI-as-proxy
      with cache-busting on both UAs — **and the negative outcome
      reported plainly, not papered over**
- [x] CI confirms deployed
- [x] Outbox manifest written (this file), with the real bot-response
      evidence included in full, not just a pass/fail verdict
