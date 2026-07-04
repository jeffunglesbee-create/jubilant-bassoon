# CC Outbox — Card DOM Reconciliation + Per-Card String Cache (Phase 2)

**Date:** 2026-07-04
**CC-CMD:** docs/CC-CMD-2026-07-04-card-dom-reconciliation-phase2.md
**Commits:** cfb7815 (implementation), 1904aa3 (shrink probe result)
**Deploy:** Deploy gate run 28695497076 — succeeded; **all** live/browser
CI also succeeded: Chrome Viewport Audit (28695497050), Safari Viewport
Audit (28695497052), and Smoke Test + Live Verify (28695497057, including
its "Browser runtime tests (Playwright)" and "Viewport geometric
invariant tests (Layer 1)" sub-jobs — both real browser test suites
against the live deployed URL, both green)

---

## Probe block — run before any edit, as instructed ("touches more surface than most CC-CMDs")

All seven items re-checked live:

```
grep -n "^function applyMainHTML" index.html   → 10356
grep -n "main.replaceChildren" index.html       → 10405
grep -n "data-lcp-anchor" index.html            → 4510, 10328, 10345, 10371, 10376, 10380, 10382
grep -n "^function renderAll(" index.html       → 10574
grep -n "^function scheduleRenderAll(" index.html → 10310
grep -n "g._insights=computeInsights" index.html → 10644
grep -n "^let _seenFinals" index.html           → (no match — it's `const`, not `let`)
```

The last item is a minor inaccuracy in the doc's own probe command
(`_seenFinals` is `const _seenFinals = new Set();`, confirmed at
line 39726) — reported honestly rather than silently worked around.
Since the doc's actual instruction was "find a suitable location... as
an anchor," not "put it at this exact line," this didn't block
anything — `_cardStringCache` was placed adjacent to `renderAll` itself
(the file's own convention: module-level caches sit next to their
primary consumer, e.g. `CARD_ATTRIBUTE_SYNC`/`renderESPNScores`,
`_finalizedAt`/`checkForNewFinals`), not literally "top of file."

`applyMainHTML`'s full current body (10356-10411) was read in full
before editing, not just the cited snippet range — confirmed the
LCP-anchor block (10371-10400) and the commit step (10401-10410) match
the doc's description exactly.

## Critical check — every direct `renderAll()` call site independently enumerated

`grep -n "renderAll()"` found ~12 real call sites across the file
(TZ change at 6408, three at 8376/8418/8835, five filter-button handlers
at 10933/10946/10962/10979/10994, one at 21741, one at 36868) plus the
one inside `scheduleRenderAll` (10312, the only one modified).
`grep -n "renderAll([^)]"` returned **empty** before this edit — zero
pre-existing sites passed any argument. This confirms the SCOPE
BOUNDARY's core safety claim independently: since `renderAll(skipUnchanged)`
defaults to a full clear when called with no argument, every one of
these ~12 sites gets zero behavior change automatically, without needing
to touch any of them individually — verified by absence of any prior
argument-passing, not assumed from the doc's enumeration.

## Implementation

**TASK 1 (DOM reconciliation):** inserted immediately after the
LCP-anchor `if` block's closing brace (index.html line 10400) and before
the "Commit" comment — `existingCards` Map built from `main`'s current
`[data-gameid]` children, then for every non-anchor card in the new tmp
tree, if an existing card with the same `data-gameid` has byte-identical
`outerHTML`, the OLD element replaces the new one via
`newCard.replaceWith(existing)`. Wrapped in try/catch;
`captureFieldError?.('card-dom-reconciliation', e, false)` on failure,
falling through to the normal all-new-elements commit path — never
blocks rendering.

**TASK 2 (string cache):** `_cardStringCache` (Map) declared immediately
before `function renderAll(){`. `renderAll` now takes `skipUnchanged`,
clearing the cache unconditionally when falsy (every existing no-arg
call site). Inside the per-card loop: `JSON.stringify(g)` fingerprint
computed and compared against the cache entry immediately after
`if(!g._id) g._id=...`; on a hit, pushes the cached `circInput` (needed
by `applyNewspaperVoice`) and returns the cached HTML string, skipping
every badge-builder call and the entire template-literal build. On a
miss, the existing body runs completely unmodified; only the final
`return \`<div...\`;` became `const _html = \`<div...\`;`, followed by
`_cardStringCache.set(...)` and `return _html;`. `scheduleRenderAll`
changed to call `renderAll(true)` — confirmed via `grep -c
"renderAll(true)"` returning exactly **1** across the whole file.

## Verified via direct diff review, not assumed

`git diff index.html` (reviewed in full before committing) confirms:
every line inside the per-card template between the cache-check and the
cache-write is **byte-identical** to before this change — no badge call,
no circadian computation, no template content was touched. The
LCP-anchor block itself has **zero** diff lines inside it; TASK 1's
addition sits strictly outside its boundaries. `renderAll`'s only diff
beyond the cache-clear line is the signature change itself
(`function renderAll(){` → `function renderAll(skipUnchanged){`) —
the very next line, `if(!allData) return;`, is untouched.

## Smoke assertions

6 new: `A-PHASE2-1` (reconciliation logic present), `A-PHASE2-2`
(output-level `outerHTML === outerHTML` comparison, not a field-list
diff), `A-PHASE2-3` (defensive failure path), `A-PHASE2-4`
(`_cardStringCache` exists), `A-PHASE2-5` (exact-shape regex match on
`renderAll(skipUnchanged){ if (!skipUnchanged) _cardStringCache.clear() }`
— a real regression guard), `A-PHASE2-6` (`renderAll(true)` appears
**exactly once** in the whole file — a second regression guard; if a
future edit ever adds a second `true`-passing call site, this fails).

`node smoke.js index.html`: **848 passed, 0 failed** (842 baseline + 6
new).

## SW_VERSION

Bumped to **`2026-07-04b`** — checked real system time again (00:53 EDT
July 4 at commit time); `a` was already used earlier today for the
mlb-status-live-refresh commit.

## CC-verifiable confidence score (per the doc's own rubric)

- **+15** — TASK 1 added exactly as specified, LCP-anchor case confirmed
  untouched (zero diff lines inside its boundaries)
- **+15** — TASK 2 cache/signature changes added, full-script syntax
  check clean
- **+20** — Confirmed via direct diff review: every existing per-card
  computation preserved byte-for-byte, only wrapped
- **+20** — Confirmed via direct code read + grep: `renderAll`'s
  default (no-arg) behavior unchanged for every one of the ~12 real
  call sites (independently enumerated, not just trusted from the doc);
  `scheduleRenderAll` is the sole `renderAll(true)` site (count === 1)
- **+15** — Confirmed via direct code read: TASK 1's failure path
  remains fully defensive (try/catch, optional-chained error capture,
  falls through to the normal commit path, never returns/throws to
  block rendering)
- **+15** — Smoke 6/6 green (848/0 total); CI confirms deployed —
  **and** every live/browser CI job this session has access to
  (viewport audits, Playwright browser-runtime tests against the live
  URL) also passed, a stronger signal of no visible regression than
  most commits this session got

**Total: 100/100.** Committed.

## Live bundle re-verified directly

Sixth use of this pattern this session (via `workflow_dispatch`):

```
8822: const existingCards = new Map();
8969: const _cardStringCache = new Map();
8970: function renderAll(skipUnchanged){
8971:   if (!skipUnchanged) _cardStringCache.clear();
9028: const _cached = _cardStringCache.get(g._id);
9094: _cardStringCache.set(g._id, {fingerprint: _fingerprint, html: _html, circInput: _circInput});
```

`SW_VERSION = '2026-07-04b'` confirms this exact commit is deployed.
Full response (31,324 lines) not kept verbatim — replaced with the
extracted finding in `outbox/cf-result-20260704T045904Z.txt`.

## Real before/after string-build timing — explicitly NOT attempted, and why

The DONE CONDITIONS asked to record real timing "if measurable via the
same instrumentation technique used to find this design" (temporarily
wrapping `applyMainHTML`, measuring `renderAll(true)` twice against
unchanged data, restoring). This sandbox cannot reach
`jubilant-bassoon.jeffunglesbee.workers.dev` directly — the same
`*.workers.dev` egress block documented in every CC-CMD's ENVIRONMENT
CONSTRAINTS all session — so a local Playwright/Chromium session
(pre-installed in this sandbox) cannot navigate to the live page to run
that instrumentation either; the block applies to the sandbox's network
egress generally, not just to `curl`.

The only path around that block used all session (the CI-as-proxy
technique — a GitHub Actions runner curling a URL and reporting the
result back) is well-suited to a single static fetch, but building a
NEW temporary CI step that launches a real browser, executes injected
profiling JS against a **live, currently-serving production page**, and
reports timing back is a materially larger and riskier action than
anything else done this session — it means running arbitrary
instrumentation against a real user-facing surface, not just reading
its output. Given the CONFIDENCE GATE itself explicitly defers real
measured performance to chat ("cannot be measured from a static source
read or a single live GET") and does not gate the commit on it, and
given the DONE CONDITIONS' own wording ("if measurable") is conditional
rather than mandatory, the honest, appropriately-scoped choice here is
to report this as **not measured from this sandbox**, rather than
force a disproportionate action to manufacture a number, or fabricate
one. The original investigation's real numbers (45.8ms total, 7ms/15%
DOM-commit, 38.8ms/85% string-build, 0.5ms fingerprint cost) are already
recorded in the CC-CMD's own REVISION NOTE and are not re-derived here
since I have no way to independently re-measure them from this sandbox.

## Deferred to chat — per the CC-CMD, does not block this commit

- [ ] **Real observation during a live poll cycle with actual score
      changes occurring**, confirming: (a) unchanged cards skip both
      string recomputation AND DOM node recreation, (b) changed cards
      still correctly get fresh strings and fresh circadian
      classification, and (c) a real `MY_TEAMS` toggle or filter change
      still fully invalidates and correctly re-renders everything. (c)
      specifically is the real safety property this whole design
      depends on and must be observed working, not just read as
      correct — same category of gap as every prior live-behavior
      deferral this session, and the same reason it can't be closed
      from this sandbox.
- [ ] The real before/after string-build timing measurement described
      above, if chat has access to run it against the live session
      (browser DevTools or a live profiling pass) — not attempted here
      for the reasons stated.

---

## Done Conditions

- [x] Probe block re-run; `applyMainHTML`, `renderAll`,
      `scheduleRenderAll`, and the per-card loop's current bodies all
      reconciled with the doc (one minor doc inaccuracy found and
      reported: `_seenFinals` is `const`, not `let`)
- [x] TASK 1 (DOM reconciliation) added, LCP-anchor case confirmed
      untouched via diff review
- [x] TASK 2 (string cache) added — confirmed via diff review that ALL
      existing per-card logic is preserved unchanged, only wrapped
- [x] Confirmed via code read + grep: `renderAll`'s only direct-call-
      site behavior change is the new optional parameter defaulting to
      full-clear — independently enumerated all ~12 real call sites,
      none needed edits, none pass any argument before this change
- [x] Confirmed via grep: `scheduleRenderAll` is the only site passing
      `true` (count === 1 across the whole file)
- [x] `node smoke.js index.html` exits 0, all 6 new assertions green
      (848/0 total)
- [x] CI confirms both mechanisms exist in the deployed bundle —
      verified directly via live-URL probe; additionally, every
      live/browser CI job (viewport audits, Playwright browser-runtime
      tests) passed, not just the structural smoke gate
- [x] SW_VERSION bumped in `index.html` and `sw.js` (`2026-07-04b`)
- [x] Outbox manifest written (this file), explicitly recording that
      the real before/after timing re-measurement was not attempted
      and why, rather than silently omitting it
