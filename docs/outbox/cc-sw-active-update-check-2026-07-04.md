# CC Outbox — Force Active SW Update Check on Visibility

**Date:** 2026-07-04
**CC-CMD:** docs/CC-CMD-2026-07-04-sw-active-update-check.md
**Commits:** 5208b53 (implementation), 011adf5 (shrink probe result)
**Deploy:** Deploy gate run 28711905097 — succeeded

---

## Probe block — real current shape confirmed, zero drift

```
grep -n "navigator.serviceWorker.register" index.html → 23191 (doc: ~23191, exact match)
grep -n "\.update()" index.html                       → zero matches (confirmed, as the doc claimed)
grep -n "addEventListener('updatefound'" index.html   → 23200
```

## Placement — resolved a minor internal contradiction in the doc's own wording

TASK 1's lead-in said to add the code "immediately after the `.catch(...)`
closing the `.register(...).then(...)` chain," which read as "outside
the `.then(reg=>{...})` callback." But `reg` only exists as a parameter
inside that callback — placing the new code after `.catch()` would hit
a `ReferenceError` on `reg`. The doc's own immediately-following
"Placement matters" clarification is unambiguous and correct: the code
must live **inside** `.then(reg=>{...})`, alongside the existing
`updatefound` listener. Followed the clarification, not the looser
lead-in wording — verified this was the right read by confirming `reg`
is only in scope inside that callback before writing anything.

## Implementation

Added a `visibilitychange` listener inside the existing
`.then(reg=>{...})` callback, immediately after the existing
`reg.addEventListener('updatefound', ...)` block:

```javascript
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    reg.update().catch(() => {});
  }
});
```

Confirmed via `git diff` review: the existing `updatefound` listener and
its reload logic have **zero** changed lines — this is a pure addition
alongside it, correctly closing over the real `reg` from this
registration. `sw.js` itself was not touched beyond its `SW_VERSION`
string bump (its `skipWaiting`/`clients.claim` logic is unchanged),
matching the explicit scope boundary.

## Smoke assertion

1 new: `A-SWUPDATE-1`, checking `reg.update().catch` exists. Verified
the doc's suggested regex matches the real code before trusting it.

`node smoke.js index.html`: **861 passed, 0 failed** (860 baseline + 1
new).

## SW_VERSION

Bumped to **`2026-07-04g`** in both `index.html` and `sw.js` — checked
real system time again (12:05 ET July 4 at commit time); `f` was
already used earlier today for the newspaper-6th-bypass-fix commit.
`sw.js`'s own update logic was not modified, only its version string,
same convention as every other deploy-triggering commit this session.

## CC-verifiable confidence score (per the doc's own rubric)

- **+50** — Update check added in the correct place/closure (resolved
  the doc's own internal wording ambiguity correctly, verified via
  scope analysis before writing); existing reload logic confirmed
  untouched via diff review
- **+25** — Smoke 1/1 green (861/0 total)
- **+25** — CI confirms deployed (Deploy gate run 28711905097,
  succeeded); live bundle re-verified directly

**Total: 100/100.** Committed.

## Live bundle re-verified directly

```
18568: reg.update().catch(() => {});
```

`SW_VERSION = '2026-07-04g'` confirms this exact commit is deployed.
Full response (31,442 lines) not kept verbatim — replaced with the
extracted finding in `outbox/cf-result-20260704T160805Z.txt`.

## Deferred to chat — per the CC-CMD, does not block this commit

- [ ] Real observation, on an actual iPad, that a deploy is picked up
      meaningfully faster after this ships than before — this needs a
      real device and a real deploy cycle to observe, not something
      verifiable from code alone in this sandbox.

---

## Done Conditions

- [x] Probe block re-run, registration block's current shape confirmed
      (zero drift from the doc's citations)
- [x] `reg.update()` call added inside the correct closure, on
      visibilitychange-becomes-visible
- [x] Confirmed via code read: existing `updatefound` reload logic is
      untouched
- [x] `node smoke.js index.html` exits 0, new assertion green (861/0 total)
- [x] CI confirms deployed — Deploy gate succeeded; live bundle
      re-verified directly
- [x] SW_VERSION bumped (`2026-07-04g`)
- [x] Outbox manifest written (this file)
