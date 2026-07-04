# CC-CMD: Fix the actual bug — Element.after() called with swapped arguments

**Date:** 2026-07-04
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main
**Scope:** One method, `src/worker.js`'s `MetaTagRewriter.element()`.

**Why — direct read of the code, not another hypothesis:** the v2
CC-CMD's outbox correctly proved `run_worker_first: true` deploys
cleanly and isn't the blocker, then reported three unresolved
hypotheses (Assets-binding cache semantics, a compatibility_date floor,
or a silent worker.js failure) without diagnosing further, since
modifying worker.js was out of that CC-CMD's scope. Reading the file
directly finds a real, precise bug that explains every symptom without
needing any of those three theories:

```javascript
element.after('html', {
    html: `<meta property="og:description" content="${this.description.replace(/"/g, '&quot;')}">`,
});
```

Cloudflare's documented `Element.after(content, options)` signature
takes the content string as the first argument and `{html: boolean}` as
the second (the boolean controls whether `content` is parsed as raw
HTML vs. inserted as escaped text). This call has the arguments
backwards: the literal string `'html'` (four characters) is passed as
`content`, and the real `<meta>` tag string is nested as the *value* of
an `options.html` key that should hold a boolean. The actual tag is
never passed to `.after()` as content at all — it sits inert inside a
malformed options object. This is consistent with every observed
symptom: bot and non-bot requests returning byte-identical responses
regardless of `run_worker_first`, cache-busting, or any platform-level
cause, because the insertion call itself never constructs the intended
HTML.

**Target time:** ~15 min

## ENVIRONMENT CONSTRAINTS (copy verbatim)
- *.workers.dev:443 blocked from CC egress — CI-as-proxy for live checks
- Playwright tests must run via GitHub Actions CI — never localhost
- api.github.com is reachable from CC bash
- No branch switching — work on main only
- 2 attempts max on any push — declare failure and stop if both fail

## CONFIDENCE GATE
Do not commit unless confidence ≥ 95.

## PROBE BLOCK (run before any edits)
```bash
cat src/worker.js
```
Re-confirm the exact current `element.after(...)` call matches this
doc's description — re-verify the argument order against Cloudflare's
current HTMLRewriter documentation for `Element.after`, don't assume
this doc's description of the correct signature is still accurate
without checking.

## TASK 1 — Fix the argument order

Find (`src/worker.js`, `MetaTagRewriter.element()`):
```javascript
    element(element) {
        if (this.description) {
            element.after('html', {
                html: `<meta property="og:description" content="${this.description.replace(/"/g, '&quot;')}">`,
            });
        }
    }
```
Replace with:
```javascript
    element(element) {
        if (this.description) {
            element.after(
                `<meta property="og:description" content="${this.description.replace(/"/g, '&quot;')}">`,
                { html: true }
            );
        }
    }
```

## TASK 2 — Live verification, both bot and non-bot, with cache-busting

Same rigor as the prior CC-CMD's (correctly thorough) verification —
via CI-as-proxy:
1. A cache-busted request (guaranteed-unique query string) with a real
   bot User-Agent to the root URL returns a response containing a real
   `<meta property="og:description" content="...">` tag with non-empty,
   real content (not the literal text "html" inserted anywhere).
2. The same cache-busted approach with a normal browser User-Agent
   returns the page unchanged — no meta tag, confirming real users still
   see zero behavior difference.
3. Confirm the literal stray text "html" is NOT inserted anywhere in the
   bot response (this was the previous bug's actual visible side effect,
   if it was visible at all — check for it explicitly rather than only
   checking for the correct tag's absence/presence).

## SCOPE BOUNDARY

DO:
- Fix exactly this one `element.after(...)` call's argument order
- Verify live, bot and non-bot, cache-busted (Task 2)

DO NOT:
- Touch `run_worker_first`, `wrangler.jsonc`, or any other part of `src/worker.js`
- Touch the relay or the `/circadian/preview/{date}` endpoint — confirmed already working correctly in prior CC-CMDs
- Investigate the three now-superseded hypotheses (cache semantics, compatibility_date floor) — this fix, if verified working, makes them moot; if TASK 2 still fails after this fix, report that plainly rather than falling back to re-investigating them without being asked

## DONE CONDITIONS
- [ ] Probe block re-run, current `element.after(...)` call confirmed matching this doc's description
- [ ] Argument order corrected exactly as specified
- [ ] Live verification (Task 2, all three checks) completed via CI-as-proxy with cache-busting
- [ ] CI confirms deployed
- [ ] Outbox manifest written to `docs/outbox/cc-og-worker-htmlrewriter-arg-fix-{date}.md`, with the real bot-response body (or relevant excerpt) included as evidence, not just a pass/fail verdict

## COMPLIANCE
- Rule 68: probe block first, including re-verifying the correct API signature against current docs
- Rule 87: self-completing — live verification achievable within this session via CI-as-proxy

## CONFIDENCE SCORING TABLE
+30  Argument order corrected exactly, matching Cloudflare's documented signature
+40  Live cache-busted verification shows the real tag now appearing for bot UA, absent for normal UA
+15  Stray "html" text confirmed NOT present (confirms the old bug's exact mechanism, not just its symptom)
+15  CI confirms deployed

## ONE-LINER
git pull. Read docs/CC-CMD-2026-07-04-og-worker-htmlrewriter-arg-fix.md.
Re-confirm the exact current element.after(...) call first, and
re-verify the correct Element.after(content, options) signature against
current Cloudflare docs before assuming this doc's description is still
accurate. Fix the argument order exactly as specified — content string
first, {html: true} second. Verify live with cache-busting for both a
bot UA (real og:description tag should appear) and a normal UA (no
change). Do not commit unless confidence ≥ 95. If score < 95 report
verbatim and stop — do not invent results.
