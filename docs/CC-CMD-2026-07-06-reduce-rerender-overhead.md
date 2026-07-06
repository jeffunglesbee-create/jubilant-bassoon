# CC-CMD: Reduce redundant re-render work — hoist static allocations, cache sort-key computation

**Date:** 2026-07-06
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR
**Source:** investigated `renderAll`'s actual hot path directly (not
generic React-style advice — this codebase is vanilla DOM, no
virtual-DOM diffing). A real per-card HTML string cache already exists
(`_cardStringCache`, built by `CC-CMD-2026-07-04-card-dom-reconciliation-
phase2`) — its own presence is the evidence this path fires often enough
to matter; this CC-CMD targets two things that cache does **not** cover.

**Target time:** ~25 min

## PROBE BLOCK
```bash
sed -n '10778,10792p' index.html   # renderAll top, _MLB_NAME_ABBR literal
sed -n '10853,10862p' index.html   # sports.forEach body, _CIRCADIAN_SORT_RANK + sort
sed -n '10866,10950p' index.html   # per-card fingerprint cache, full cards.map body
```
Confirm all three citations still match before editing.

## FINDING 1 — Two static object literals reallocated every call, needlessly

`_MLB_NAME_ABBR` (line ~10788, 30 key/value pairs) is declared **inside**
`renderAll`, so it's rebuilt from scratch on every single call —
regardless of `skipUnchanged`, regardless of whether any MLB game is
even present. `_CIRCADIAN_SORT_RANK` (line ~10855, inside the
`sports.forEach` body) is worse: reallocated once **per sport section**,
every render. Neither ever changes at runtime — pure static lookup
tables. Hoist both to module scope (top-level `const`, outside any
function), unchanged in content.

## FINDING 2 — Sort-key computation runs in full even when the existing cache hits

The per-card fingerprint cache (line ~10873 `_fingerprint =
JSON.stringify(g)`) correctly skips re-stringifying a card's HTML when
nothing about that game changed — but the `games.sort(...)` comparator
(line ~10855-10861) runs **before** that cache check, calling
`findESPNScore(a)`/`findESPNScore(b)` and `getCardCircadian(...)` for
**every game, every render**, regardless of whether that game's
fingerprint is unchanged. The existing cache saves HTML-building cost;
it does not save sort-key cost. For a section with N games and few
actual changes, this is still O(N) redundant circadian-tier
recomputation on every render tick.

**Fix:** extend the cache entry (already storing `{fingerprint, html,
circInput}` at line ~10947) to also store the computed `circadianTier`,
and compute the sort BEFORE the cards.map loop using a helper that
checks the cache first:

```javascript
function getCachedCircadianTier(g) {
  const cached = _cardStringCache.get(g._id);
  const fp = JSON.stringify(g);
  if (cached && cached.fingerprint === fp) return cached.circadianTier;
  const eData = typeof findESPNScore === 'function' ? findESPNScore(g) : null;
  return getCardCircadian({ state: eData ? eData.state : null, status: g.status, _aflComplete: g._aflComplete, _id: g._id });
}
```

Use this in the sort comparator instead of recomputing inline. Note
this computes `JSON.stringify(g)` a second time (once here, once again
at line ~10873) — acceptable for now since correctness (not
introducing a second, possibly-inconsistent fingerprint source) matters
more than saving one stringify call; do not try to eliminate the
duplicate in this same pass unless it can be done without risk of the
two fingerprints ever diverging.

Add `circadianTier` to the object stored at line ~10947's
`_cardStringCache.set(...)` so subsequent renders can read it back.

**What NOT to change:** the `.sort()` call itself must still run in
full on every render — relative ordering can genuinely change even when
no individual card's fingerprint changed (e.g., a different game
entering PRIME tier as its start time approaches). Only the per-game
tier *computation* is cached, not the sort's execution.

## TASK — Verify

- `node smoke.js index.html` clean, no regressions
- Manually confirm: for a render pass where zero games changed
  (fingerprint identical to the prior pass for every card), the sort
  comparator hits the cache path for every comparison — add a temporary
  counter/log during testing to confirm this, then remove it before
  committing (don't ship debug logging)
- Confirm hoisted objects are byte-identical in content to their
  original inline versions — this must be a pure relocation, zero
  content change

## DONE CONDITIONS
- [ ] Probe block confirms all citations before editing
- [ ] `_MLB_NAME_ABBR` and `_CIRCADIAN_SORT_RANK` hoisted to module scope, content unchanged
- [ ] `circadianTier` added to the cache entry shape and used by the sort comparator via a cache-first helper
- [ ] Confirmed via temporary instrumentation (removed before commit) that unchanged cards skip recomputation
- [ ] `.sort()` itself still runs unconditionally — only the per-game tier computation is cached
- [ ] Smoke clean
- [ ] Outbox written

## CONFIDENCE SCORING TABLE
+25  Both object literals hoisted correctly, byte-identical content
+35  Sort-key caching implemented correctly, cache-first helper used in the comparator
+20  Verified via real instrumentation that cache hits actually skip recomputation, not just code review
+10  `.sort()` confirmed still unconditional (ordering correctness preserved)
+10  Smoke clean, no regressions

## ONE-LINER
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO -- this CC-CMD targets jubilant-bassoon"; exit 1; }
git pull. Read docs/CC-CMD-2026-07-06-reduce-rerender-overhead.md. Execute:
(1) hoist _MLB_NAME_ABBR and _CIRCADIAN_SORT_RANK out of renderAll to
module scope, byte-identical content, (2) add circadianTier to the
existing per-card cache entry and use a cache-first helper in the sort
comparator so unchanged cards skip findESPNScore+getCardCircadian
recomputation -- but the .sort() call itself must still run every time.
Verify via real instrumentation (removed before commit) that cache hits
actually skip recomputation. Do not commit unless confidence >= 95. If
score < 95, report verbatim and stop.
