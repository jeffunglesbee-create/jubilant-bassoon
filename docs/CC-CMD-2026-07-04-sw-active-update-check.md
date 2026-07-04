# CC-CMD: Force an active SW update check on visibility — closes the iOS staleness gap

**Date:** 2026-07-04
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main
**Scope:** ~5 lines. Add an explicit `registration.update()` call on
visibility-change, so the already-correct auto-reload mechanism doesn't
sit dormant waiting for the browser's own (on iOS, less frequent)
background update check.

**Why — real, confirmed gap, not a platform limitation alone:**
`index.html` (~23191) already has a well-designed mechanism: register
the SW, listen for `updatefound`, and auto-reload once the new SW
activates — comment explicitly claims "on both iOS and Android." That
mechanism is correct. But `updatefound` only fires when the BROWSER
itself decides to check `sw.js` for changes, and there is no explicit
`registration.update()` call anywhere in the file (confirmed via
exhaustive grep — zero matches). iOS Safari's background update-check
cadence for installed/standalone PWAs is documented (and previously
observed in this project, May/June sessions) to be meaningfully less
frequent than Android Chrome's — so the existing, correct auto-reload
logic can sit dormant far longer on iOS, explaining the observed "yes
on Android, no on iPad" pattern without any bug in the reload logic
itself. This is the standard, well-documented PWA mitigation
(MDN/web.dev): call `.update()` when the page becomes visible again,
rather than relying solely on the platform's own background cycle.

**Target time:** ~15 min

## ENVIRONMENT CONSTRAINTS (copy verbatim)
- *.workers.dev:443 blocked from CC egress
- Playwright tests must run via GitHub Actions CI — never localhost
- api.github.com is reachable from CC bash
- No branch switching — work on main only
- 2 attempts max on any push — declare failure and stop if both fail

## CONFIDENCE GATE
Do not commit unless confidence ≥ 95. Real observation that this
actually shortens iOS staleness in practice is deferred — that requires
watching a real device over a real deploy cycle, which cannot be forced
or simulated in this session.

## PROBE BLOCK (run before any edits)
```bash
grep -n "navigator.serviceWorker.register" index.html
grep -n "\.update()" index.html
grep -n "addEventListener('updatefound'" index.html
```
Confirm the registration block's exact current shape and confirm zero
existing `.update()` calls before adding this — this file changes
daily, don't assume today's line numbers still apply.

## TASK 1 — Add the active update check

Find the service worker registration block (index.html ~23191,
re-verify). Immediately after the `.catch(()=>{ /* SW registration
failed... */ })` closing the `.register(...).then(...)` chain (still
inside the `if(swPath){ ... }` block, same scope as `reg` — the update
check needs the same `reg` reference from the `.then(reg=>{...})`
callback, so it must live INSIDE that callback, not after it), add:

```javascript
            // Force an active update check whenever the app becomes
            // visible again -- closes the gap where updatefound only
            // fires on the browser's own background check cycle, which
            // is meaningfully less frequent for installed PWAs on iOS
            // Safari than Android Chrome (documented in this project's
            // own May/June sessions: "yes on Android, no on iPad").
            // Standard PWA mitigation (MDN/web.dev): call .update() on
            // visibilitychange rather than relying solely on the
            // platform's own cadence. The existing updatefound listener
            // (above) still does the actual reload -- this only makes
            // the check itself fire promptly.
            document.addEventListener('visibilitychange', () => {
              if (document.visibilityState === 'visible') {
                reg.update().catch(() => {});
              }
            });
```

**Placement matters**: this must be added inside the `.then(reg=>{...})`
callback (so it closes over the real `reg` from THIS registration),
alongside the existing `reg.addEventListener('updatefound', ...)` call
— not as a new top-level listener outside the registration promise.

## TASK 2 — Smoke assertion

```javascript
smoke.assert(!!html.match(/reg\.update\(\)\.catch/), 'A[NEXT]: service worker registration actively checks for updates on visibilitychange, not just the browser\'s own background cycle');
```
(CC: assign the real next sequential A-number.)

## SCOPE BOUNDARY

DO:
- Add exactly the one `visibilitychange` listener calling `reg.update()`
- Place it inside the existing `.then(reg=>{...})` callback
- 1 smoke assertion
- Bump SW_VERSION

DO NOT:
- Touch the existing `updatefound`/auto-reload logic — it's already correct, this CC-CMD only makes the check itself fire more promptly
- Modify sw.js itself — this is a page-side (index.html) change only, `skipWaiting`/`clients.claim` in sw.js are already correct
- Add any other visibility-triggered logic — scope is exactly this one update check

## DONE CONDITIONS
- [ ] Probe block re-run, registration block's current shape confirmed
- [ ] `reg.update()` call added inside the correct closure, on visibilitychange-becomes-visible
- [ ] Confirmed via code read: existing `updatefound` reload logic is untouched
- [ ] `node smoke.js index.html` exits 0 with the new assertion green
- [ ] CI confirms deployed
- [ ] SW_VERSION bumped
- [ ] Outbox manifest written to `docs/outbox/cc-sw-active-update-check-{date}.md`

**Deferred to chat — do NOT block your commit on this:**
- [ ] Real observation, on an actual iPad, that a deploy is picked up meaningfully faster after this ships than before — this needs a real device and a real deploy cycle to observe, not something verifiable from code alone.

## COMPLIANCE
- Rule 68: probe block first
- Rule 87: self-completing on the CC-verifiable portion; real-device timing improvement is necessarily deferred

## CONFIDENCE SCORING TABLE
+50  Update check added in the correct place/closure, existing reload logic untouched
+25  Smoke 1/1 green
+25  CI confirms deployed

## ONE-LINER
git pull. Read docs/CC-CMD-2026-07-04-sw-active-update-check.md.
Re-confirm the registration block's current shape first (see PROBE
BLOCK). Add the visibilitychange -> reg.update() call inside the
existing .then(reg=>{...}) callback, do not touch sw.js or the existing
updatefound/reload logic. Do not commit unless confidence ≥ 95. If
score < 95 report verbatim and stop — do not invent results.
