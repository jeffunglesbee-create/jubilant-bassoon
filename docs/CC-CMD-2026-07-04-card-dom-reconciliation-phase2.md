# CC-CMD: Card-level DOM reconciliation + per-card string cache (Phase 2, complete)

**Date:** 2026-07-04 (revised — real measurement changed the scope)
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main
**Scope:** Two complementary mechanisms, both required:
1. DOM-level reconciliation in `applyMainHTML()` (output-diff, as originally specced)
2. Per-card STRING computation caching inside `renderAll()`'s card loop (new — see REVISION NOTE)

## REVISION NOTE — real measurement changed this doc's scope

The original version of this CC-CMD assumed DOM node churn
(`main.replaceChildren(...)`) was the dominant cost. Measured live
2026-07-04 via direct browser instrumentation (not assumed): for a
23-game render, total `renderAll()` time was ~45.8ms, of which
`applyMainHTML` (the DOM-commit step) was only ~7ms (15%). The
remaining **~38.8ms (85%) is string computation** — the badge-builder
function calls and template-literal assembly that happen BEFORE
`applyMainHTML` is ever called. The original Phase 2 (output-diff only)
would only ever save that 7ms slice, even in the best case where every
card is unchanged — it does nothing for the dominant cost, because
output-diffing requires FULLY computing the output first before you can
diff it.

This means the thing this doc originally deferred as "a possible future
Phase 3" is actually the majority of the real cost, not a minor
follow-on. Rather than leave that as a separate phase, this revision
folds a safe mechanism for it directly into Phase 2, using measurements
taken in the same investigation:
- `JSON.stringify(game)` as a per-game fingerprint: measured at 0.5ms
  for all 23 games combined (~0.02ms/game) — negligible against the
  38.8ms it lets us skip. Using the WHOLE object (not a hand-picked
  field list) means it cannot miss a per-game-scoped dependency, by
  construction.
- The one real risk this introduces (a per-game hash can't see
  MY_TEAMS/`activeFilter`/viewport changes, since those aren't part of
  `game` itself) is closed by a single, centralized cache-clear inside
  `renderAll()` itself — not by scattering invalidation across the 16
  real `espnScores`/`_scoresBySource` write sites found during
  investigation (rejected: real risk a future 17th site gets missed),
  and not by a `Proxy` wrapper (rejected: 9+ existing `Object.keys/
  values/entries` iteration call sites over those caches would need a
  full, carefully-correct trap set to not break).

## ENVIRONMENT CONSTRAINTS (copy verbatim)
- *.workers.dev:443 blocked from CC egress
- Playwright tests must run via GitHub Actions CI — never localhost
- api.github.com is reachable from CC bash
- No branch switching — work on main only
- 2 attempts max on any push — declare failure and stop if both fail
- eslint baseline first before any code edit

## CONFIDENCE GATE (CC-verifiable only)
Do not commit unless confidence ≥ 95 on the CC-verifiable portion. Real
measured performance improvement (fewer DOM node creations per poll,
observed via DevTools or a live profiling session) is deferred to chat
— cannot be measured from a static source read or a single live GET.

## PROBE BLOCK (run before any edits)
```bash
grep -n "^function applyMainHTML" index.html
grep -n "main.replaceChildren" index.html
grep -n "data-lcp-anchor" index.html
grep -n "^function renderAll(" index.html
grep -n "^function scheduleRenderAll(" index.html
grep -n "g._insights=computeInsights" index.html
grep -n "^let _seenFinals" index.html
```
Re-confirm `applyMainHTML`'s exact current body before editing — this
CC-CMD's line references and the LCP-anchor-morph code shown below were
accurate as of 2026-07-04, this file changes daily.

## CONTEXT — the existing pattern being generalized

`applyMainHTML(html)` already does this, but only for ONE card (the
first, for LCP measurement continuity):
```javascript
  const anchor = main.querySelector('[data-lcp-anchor]');
  const firstNewCard = tmp.querySelector('.game-card');
  if (anchor && firstNewCard) {
    // ... morphs anchor's attributes/content to match firstNewCard,
    // then keeps the OLD anchor element in the DOM instead of the new one
  }
```
This CC-CMD generalizes the same idea (keep an old element, discard the
new one, when they'd be equivalent) to every card, keyed by
`data-gameid` instead of the single `data-lcp-anchor` special case.

## TASK 1 — Generalize the reconciliation

Find this exact block in `applyMainHTML` (index.html ~10370-10399,
re-verify via probe):
```javascript
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  const anchor = main.querySelector('[data-lcp-anchor]');
  const firstNewCard = tmp.querySelector('.game-card');
  if (anchor && firstNewCard) {
    try {
      // ... existing LCP morph logic, unchanged ...
    } catch(e) {
      main.innerHTML = html;
      if (savedNewspaper) main.prepend(savedNewspaper);
      return;
    }
  }
```
Immediately after this block (after the LCP-anchor special case, before
the final `main.replaceChildren(...tmp.children)`), add:
```javascript
  // Card-level DOM reconciliation (Phase 2, CC-CMD-2026-07-04-card-dom-
  // reconciliation-phase2). For every OTHER card (not the LCP anchor,
  // already handled above), if a card with the same data-gameid exists
  // in main's CURRENT children and its outerHTML is byte-identical to
  // the newly-computed one, keep the OLD element instead of the new one.
  // This is intentionally an OUTPUT-level comparison, not an input-data
  // diff -- any real change (game data, MY_TEAMS, viewport, filter state)
  // already produces a different computed HTML string, so this cannot
  // silently skip a card that actually needs updating. Only genuinely
  // identical output gets its DOM node preserved.
  try {
    const existingCards = new Map();
    main.querySelectorAll('[data-gameid]').forEach(el => {
      if (!existingCards.has(el.dataset.gameid)) existingCards.set(el.dataset.gameid, el);
    });
    tmp.querySelectorAll('[data-gameid]').forEach(newCard => {
      if (newCard.hasAttribute('data-lcp-anchor')) return; // already handled above
      const gid = newCard.dataset.gameid;
      const existing = existingCards.get(gid);
      if (existing && existing.outerHTML === newCard.outerHTML) {
        newCard.replaceWith(existing);
      }
    });
  } catch (e) {
    // Defensive: reconciliation is a pure optimization -- any failure
    // here must never block the render. Fall through to the normal
    // replaceChildren path below with tmp's (all-new) children.
    captureFieldError?.('card-dom-reconciliation', e, false);
  }
```

## TASK 2 — Per-card string computation cache (the real 85% win)

Add near the top of the file, alongside other module-level caches (find
a suitable location via `grep -n "^let _seenFinals\|^const _seenFinals"`
as an anchor — this file changes daily, don't guess a line number):
```javascript
// Per-card string computation cache. Keyed on game._id; invalidated by
// (a) the game's own data changing (JSON.stringify fingerprint, cheap --
// measured 0.5ms for 23 games, negligible against the ~38.8ms of badge-
// builder + template-literal cost it lets us skip), or (b) any direct
// (non-scheduleRenderAll) renderAll() call, which clears the whole cache
// unconditionally -- see renderAll's own top for why this is safe and
// sufficient without touching MY_TEAMS/activeFilter/viewport directly.
const _cardStringCache = new Map(); // gameId -> {fingerprint, html, circInput}
```

Modify `renderAll` to accept a parameter (find its real current
signature via probe, don't assume it's still `function renderAll(){`):
```javascript
function renderAll(skipUnchanged){
  if (!skipUnchanged) _cardStringCache.clear();
  // ... rest of renderAll unchanged ...
```

Modify `scheduleRenderAll` (index.html ~10312, re-verify):
```javascript
function scheduleRenderAll(){
  if(_renderAllPending) clearTimeout(_renderAllPending);
  _renderAllPending = setTimeout(()=>{ _renderAllPending=null; renderAll(true); renderESPNScores(); }, 150);
}
```
This is the ONLY call site that should pass `true`. Every other existing
`renderAll()` call (the boot render, `toggleMyTeam`, TZ change, filter
clicks, date nav — all already enumerated this session, confirmed to be
the complete set of direct-call sites) stays exactly as-is, calling
`renderAll()` with no argument, which defaults to a full cache-clearing
rebuild — zero behavior change for any of those paths.

Inside the per-card loop (find the exact current line via
`grep -n "g._insights=computeInsights"` — this is the first line of the
per-card body, re-verify before editing):
```javascript
    const cards=games.map((g,gi)=>{
      if(!g._id) g._id="g"+(++_gid);
      const _fingerprint = JSON.stringify(g);
      const _cached = _cardStringCache.get(g._id);
      if (_cached && _cached.fingerprint === _fingerprint) {
        _renderAllCircadianGames.push(_cached.circInput);
        return _cached.html;
      }
      g._insights=computeInsights(g, sec.sport); // Stage 3.5: typed data bridge
      // ... existing body: st, timeStr, isLive, liveBadge, _circEData,
      // _circInput, _circadian, _circCls, _renderAllCircadianGames.push(...)
      // -- all UNCHANGED, do not modify any of this ...
      const _html = `<div class="game-card ...">...`; // existing template, unchanged
      _cardStringCache.set(g._id, {fingerprint: _fingerprint, html: _html, circInput: _circInput});
      return _html;
    });
```
**This must be a pure addition around the existing body, not a rewrite
of it.** The existing template-literal, badge calls, and
`_renderAllCircadianGames.push(_circInput)` line all stay exactly as
they are today — only wrapped with the cache check at the top and the
cache write at the bottom, capturing whatever variable name the
existing code already uses for its returned template string (confirm
the real variable/expression name via the probe block before editing;
it may not literally be named `_html`).

**Why this is safe together with TASK 1's DOM reconciliation:** a
cache-hit here returns a byte-identical string to last render, which
TASK 1's `applyMainHTML` output-diff will naturally detect as unchanged
and preserve the existing DOM node for — the two mechanisms compose
correctly without needing to know about each other.



## TASK 3 — Smoke assertions (both mechanisms)

```javascript
smoke.assert(html.includes('card-level DOM reconciliation') || html.includes('existingCards'), 'A[NEXT]: applyMainHTML has card-level reconciliation logic');
smoke.assert(!!html.match(/existing\.outerHTML === newCard\.outerHTML/), 'A[NEXT+1]: reconciliation compares OUTPUT html, not a hand-picked input field list');
smoke.assert(html.includes('card-dom-reconciliation'), 'A[NEXT+2]: reconciliation failure path is defensive and does not block rendering');
smoke.assert(html.includes('_cardStringCache'), 'A[NEXT+3]: per-card string cache exists');
smoke.assert(!!html.match(/renderAll\(skipUnchanged\)\{\s*if\s*\(\s*!skipUnchanged\s*\)\s*_cardStringCache\.clear\(\)/), 'A[NEXT+4]: renderAll clears the cache on every direct (non-scheduled) call — the single centralized invalidation point this design relies on for safety against MY_TEAMS/activeFilter/viewport changes');
smoke.assert(!!html.match(/scheduleRenderAll\(\)\{[\s\S]{0,300}renderAll\(true\)/), 'A[NEXT+5]: scheduleRenderAll is the ONLY call site passing true (cache-preserving) — every other call site must default to full-clear');
```
(CC: assign real sequential A-numbers. The last two assertions are the
real safety guarantees of this design — do not treat them as optional.)

## SCOPE BOUNDARY

DO:
- Add the DOM reconciliation block inside `applyMainHTML` (TASK 1)
- Add `_cardStringCache`, modify `renderAll`/`scheduleRenderAll` signatures, add the per-card cache check/write (TASK 2)
- Preserve the existing LCP-anchor special case exactly as-is, unchanged
- 6 smoke assertions
- Bump SW_VERSION

DO NOT:
- Modify the existing badge-builder functions themselves (`buildWCBars`, `buildRoundBadge`, `findESPNScore`, etc.) — this CC-CMD skips calling them on a cache hit, it does not change what they do on a cache miss
- Scatter cache-invalidation logic across `espnScores`/`_scoresBySource` write sites, or wrap either in a `Proxy` — both were investigated and rejected (see REVISION NOTE) in favor of the single centralized clear-on-direct-render point
- Add per-field input diffing anywhere — `JSON.stringify(game)` (whole object) is the only fingerprint mechanism; do not narrow it to a hand-picked field list
- Change any direct `renderAll()` call site's own code — they all continue calling `renderAll()` with no argument; the default-to-full-clear behavior in `renderAll` itself is what makes this safe, not changes at each call site

## DONE CONDITIONS
- [ ] Probe block re-run, `applyMainHTML`, `renderAll`, `scheduleRenderAll`, and the per-card loop's current bodies all reconciled with this doc
- [ ] TASK 1 (DOM reconciliation) added, LCP-anchor case confirmed untouched
- [ ] TASK 2 (string cache) added — confirmed via code read that ALL existing per-card logic (badge calls, circadian computation, template literal) is preserved unchanged, only wrapped
- [ ] Confirmed via code read: `renderAll`'s only direct-call-site behavior change is the new optional parameter defaulting to full-clear — every existing call site (boot, `toggleMyTeam`, TZ change, filter clicks, date nav) needs zero edits and gets zero behavior change
- [ ] Confirmed via code read: `scheduleRenderAll` is the only site passing `true`
- [ ] `node smoke.js index.html` exits 0 with all 6 new assertions green
- [ ] CI Playwright confirms both mechanisms exist in deployed bundle
- [ ] SW_VERSION bumped in index.html and sw.js
- [ ] Outbox manifest written to `docs/outbox/cc-card-dom-reconciliation-phase2-{date}.md`, explicitly recording the real before/after string-build timing if measurable via the same instrumentation technique used to find this design (wrap `applyMainHTML` temporarily, measure `renderAll(true)` twice in a row against unchanged data, restore — same technique chat used live)

**Deferred to chat — do NOT block your commit on this:**
- [ ] Real observation, during a live poll cycle with actual score changes occurring, that (a) unchanged cards skip both string recomputation AND DOM node recreation, (b) changed cards still correctly get fresh strings and fresh circadian classification, and (c) a real `MY_TEAMS` toggle or filter change still fully invalidates and correctly re-renders everything. All three matter — (c) specifically is the real safety property this design depends on and must be seen working, not just read as correct.

## COMPLIANCE
- Rule 47/ADR-002/RUWT: pure computation/DOM optimization, touches no scoring/interest-value logic
- Rule 68: probe block first, re-verify all four touched functions' current bodies before editing — this CC-CMD touches more surface than most, accuracy matters more than usual
- Rule 87: self-completing on the CC-verifiable portion; live measurement explicitly deferred

## CONFIDENCE SCORING TABLE
+15  TASK 1 (DOM reconciliation) added exactly as specified, LCP-anchor case untouched
+15  TASK 2 cache/signature changes added, `node --check` clean
+20  Confirmed via code read: every existing per-card computation is preserved byte-for-byte, only wrapped — not rewritten or altered
+20  Confirmed via code read: `renderAll`'s default (no-arg) behavior is unchanged for every existing call site; `scheduleRenderAll` is the sole `true`-passing site
+15  Confirmed via code read: reconciliation failure path (TASK 1) remains fully defensive
+15  Smoke 6/6 green, CI confirms deployed

## ONE-LINER
git pull. Read docs/CC-CMD-2026-07-04-card-dom-reconciliation-phase2.md
(revised — now two mechanisms, TASK 1 and TASK 2, not one). Re-confirm
applyMainHTML, renderAll, scheduleRenderAll, and the per-card loop's
current bodies first (see PROBE BLOCK) — this touches more surface than
most CC-CMDs, accuracy matters more than usual. Implement exactly as
specified — TASK 2's cache must wrap the existing per-card logic without
altering it, and renderAll's cache-clear-on-direct-call is the single
safety mechanism this design depends on, do not skip it or scatter
invalidation elsewhere. Do not commit unless confidence ≥ 95. If score
< 95 report verbatim and stop — do not invent results.
