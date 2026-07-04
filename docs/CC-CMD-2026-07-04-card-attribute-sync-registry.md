# CC-CMD: Generalized card-attribute sync registry (Phase 1 of 2)

**Date:** 2026-07-04
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main
**Scope:** Phase 1 only — generalize the pattern that already exists three
times ad-hoc (`espn-live`/`espn-final` toggle, `.score-wrap` patch, v2.3's
circadian refresh) into one declarative registry, so the next per-card
live-tracked attribute doesn't require hand-editing `renderESPNScores()`
and doesn't risk shipping "correct at initial render, frozen forever
after" — the exact bug class v2.3 just fixed for circadian.
**Explicitly NOT in scope:** reducing the 690-node/77KB cost of
`renderAll()` itself (the harder, larger, genuinely separate problem —
see PHASE 2 NOTE below for why that needs its own investigation first,
not a blind rewrite in this CC-CMD).
**Why:** `renderESPNScores()` (index.html:20960-21395, confirmed via
direct read) is 435 lines with 26 separate `card.querySelector`/
`classList`/`dataset` mutation sites, each hand-coded independently.
v2.3 added a 27th, following the same ad-hoc pattern, because that was
the safest fix given what was already known at the time. This CC-CMD is
the generalization that prevents needing a 28th.
**Target time:** ~1 hr

## ENVIRONMENT CONSTRAINTS (copy verbatim)
- *.workers.dev:443 blocked from CC egress
- Playwright tests must run via GitHub Actions CI — never localhost
- api.github.com is reachable from CC bash
- No branch switching — work on main only
- 2 attempts max on any push — declare failure and stop if both fail
- eslint baseline first before any code edit

## CONFIDENCE GATE (CC-verifiable only)
Do not commit unless confidence ≥ 95 on the CC-verifiable portion (code
correctness, smoke assertions, migration of existing behavior preserved).
Live DOM-refresh-over-time behavior is deferred to chat, same as v2.3 —
do not attempt to simulate it, do not skip the fix because you can't
verify it end-to-end yourself.

## PROBE BLOCK (run before any edits)
```bash
grep -n "^function renderESPNScores" index.html
grep -c 'card\.\(querySelector\|classList\|dataset\)' index.html
grep -n "_newCircadian" index.html
```
Re-confirm these line numbers and counts are still accurate before
editing — this file changes daily, and this CC-CMD's exact line
references were correct as of 2026-07-04 commit `2cbf93f`, not
necessarily now.

## CONTEXT — the three existing instances being generalized

1. **`espn-live`/`espn-final` classes** (index.html ~21119-21138): toggled
   directly via `card.classList.remove/add`, driven by `isLive`/`isFinal`
   (from `_n.state`).
2. **`.score-wrap` content patch** (index.html ~20992+): rebuilds score
   HTML in place via `card.querySelector('.score-wrap')`.
3. **`circadian-*` class + `data-circadian`** (v2.3, index.html
   ~21127-21135): the most recently added, and the one that PROVED the
   registry pattern below actually works, since it already follows a
   "compute new value, compare to current, only mutate DOM if changed"
   shape.

## TASK 1 — Add the registry + apply function

Insert near the top of `renderESPNScores()` (before its main per-card
loop begins — find the real insertion point via the probe block, don't
guess):

```javascript
// ── Card attribute sync registry (generalizes espn-live/espn-final,
// circadian, and any future per-card live-tracked attribute) ──────────
// Each entry: { name, compute(ctx) => value|null, isClass: bool }
// compute() receives { game, score, card, isLive, isFinal } and returns
// the new value, or null to mean "no signal, leave as-is" (mirrors
// v2.3's existing `card.dataset.circadian` fallback exactly).
// isClass:true means value becomes class `${name}-${value.toLowerCase()}`
// (old value removed first); isClass:false means it's a plain
// card.dataset[name] = value assignment with no class involved.
const CARD_ATTRIBUTE_SYNC = [
    {
        name: 'circadian',
        isClass: true,
        compute: ({ game, isLive, isFinal, card }) =>
            isFinal ? getCardCircadian({ state: 'post', _id: game._id })
            : isLive ? 'PRIME'
            : card.dataset.circadian || null,
    },
    // espn-live/espn-final intentionally NOT migrated into this registry
    // in Phase 1 -- they're boolean presence/absence toggles, not a
    // single mutually-exclusive value like circadian, and forcing them
    // into this shape risks changing behavior for no real benefit. Only
    // circadian (the newest, already-shaped-correctly instance) is
    // migrated here as the proof case. Migrating the other two is a
    // reasonable Phase 1.5 follow-up, not required for this CC-CMD's
    // done conditions.
];

function syncCardAttributes(card, game, score, isLive, isFinal) {
    for (const entry of CARD_ATTRIBUTE_SYNC) {
        const newVal = entry.compute({ game, score, card, isLive, isFinal });
        if (newVal == null) continue; // no signal -- leave existing value alone
        if (entry.isClass) {
            const current = card.dataset[entry.name];
            if (newVal === current) continue;
            // Remove any existing `${name}-*` class before adding the new one.
            // Built from CARD_ATTRIBUTE_SYNC's own possible values would be
            // over-engineering for one entry -- for circadian specifically,
            // reuse the exact known value set already established in v2.3.
            if (entry.name === 'circadian') {
                card.classList.remove('circadian-prime', 'circadian-preview', 'circadian-night', 'circadian-late');
            }
            card.classList.add(entry.name + '-' + newVal.toLowerCase());
            card.dataset[entry.name] = newVal;
        } else {
            card.dataset[entry.name] = newVal;
        }
    }
}
```

## TASK 2 — Replace v2.3's inline block with a call to the registry

Find v2.3's exact block (index.html ~21127-21135, re-verify via probe):
```javascript
      const _newCircadian = isFinal
          ? (getCardCircadian({state:'post', _id: game._id}))
          : isLive
              ? 'PRIME'
              : card.dataset.circadian; // no signal change -- leave as-is rather than guessing
      if (_newCircadian && _newCircadian !== card.dataset.circadian) {
          card.classList.remove('circadian-prime','circadian-preview','circadian-night','circadian-late');
          card.classList.add('circadian-' + _newCircadian.toLowerCase());
          card.dataset.circadian = _newCircadian;
      }
```
Replace with:
```javascript
      syncCardAttributes(card, game, score, isLive, isFinal);
```
This must be a pure refactor — identical behavior, not a behavior
change. The done conditions below require proving that explicitly.

## TASK 3 — Smoke assertions

```javascript
smoke.assert(typeof syncCardAttributes === 'function', 'A[NEXT]: syncCardAttributes function exists');
smoke.assert(Array.isArray(CARD_ATTRIBUTE_SYNC) && CARD_ATTRIBUTE_SYNC.length >= 1, 'A[NEXT+1]: CARD_ATTRIBUTE_SYNC registry exists and is non-empty');
smoke.assert(CARD_ATTRIBUTE_SYNC.some(e => e.name === 'circadian'), 'A[NEXT+2]: circadian is registered in CARD_ATTRIBUTE_SYNC');
```
(CC: assign real sequential A-numbers.)

## SCOPE BOUNDARY

DO:
- Add `CARD_ATTRIBUTE_SYNC` + `syncCardAttributes()`
- Migrate ONLY circadian into it (proof case, lowest-risk since it's the
  newest and already shaped correctly)
- 3 smoke assertions
- Bump SW_VERSION

DO NOT:
- Migrate `espn-live`/`espn-final` in this pass (see TASK 1 note — different shape, real follow-up not this CC-CMD)
- Touch `.score-wrap` patching, golf leader-chip, round-badge, or any of
  the other ~23 remaining mutation sites in `renderESPNScores()`
- Attempt any reduction of `renderAll()`'s 690-node/77KB full-rebuild
  cost — that is Phase 2, explicitly out of scope, see note below
- Add diffing/reconciliation logic of any kind — this CC-CMD only
  generalizes the ALREADY-EXISTING targeted-patch pattern, it does not
  change when patches happen, only how they're declared

## PHASE 2 NOTE (not this CC-CMD — real, but needs its own investigation)

The actual 77KB/690-node full-rebuild cost lives in `renderAll()`
itself, not in `renderESPNScores()`. Reducing it would mean skipping
full HTML-string regeneration for games whose data hasn't changed since
the last render, keyed on `game._id` (which already exists and is
already used for pinning/circadian/etc., so the key infrastructure is
real). This is NOT specced here because: `renderAll()`'s card-template
generation has real per-sport variance (at least 6 confirmed
`sport===` branches plus card-tier logic via `_cardTierClass`) that
hasn't been mapped closely enough to be confident a "skip unchanged
games" diff is safe across every sport's template path without risking
a stale-card bug worse than the one just fixed. A future CC-CMD should
start with a read-only investigation task (map every place `renderAll`'s
per-game output depends on data outside the `game` object itself — e.g.
`MY_TEAMS`, `pinnedIds`, `_gameImportance` — since a naive diff keyed
only on `game._id` would miss those and reintroduce stale-render bugs
from a different angle) before writing any actual skip-logic.

## DONE CONDITIONS
- [ ] Probe block re-run, line numbers/counts reconciled with this doc
- [ ] `CARD_ATTRIBUTE_SYNC`/`syncCardAttributes` added exactly as specified
- [ ] v2.3's inline block replaced with the one-line call — confirm via
      diff that this is a pure refactor: same conditions, same class
      names, same dataset key, zero behavior change
- [ ] `node smoke.js index.html` exits 0 with all 3 new assertions green
- [ ] CI Playwright confirms `syncCardAttributes`/`CARD_ATTRIBUTE_SYNC` exist in deployed bundle
- [ ] SW_VERSION bumped in index.html and sw.js
- [ ] Outbox manifest written to `docs/outbox/cc-card-attribute-sync-registry-{date}.md`, explicitly stating Phase 2 (77KB/690-node reduction) was NOT attempted and why

**Deferred to chat — do NOT block your commit on this:**
- [ ] Real live verification that circadian classification still refreshes correctly through the registry (same check v2.3 itself still has open) — this refactor must not silently regress what v2.3 just fixed

## COMPLIANCE
- Rule 47/ADR-002/RUWT: no new composite scores, no interest values — pure refactor of existing named-state logic
- Rule 68: probe block first, re-verify line numbers before editing
- Rule 87: self-completing on the CC-verifiable portion; live regression check explicitly deferred

## CONFIDENCE SCORING TABLE
+25  Registry + apply function added exactly as specified, `node --check` clean
+25  v2.3's block correctly replaced with a one-line call — verified as behavior-identical, not just "compiles"
+25  Smoke 3/3 green
+25  CI confirms deployed, and a diff review confirms zero unrelated changes (pure refactor, nothing else touched)

## ONE-LINER
git pull. Read docs/CC-CMD-2026-07-04-card-attribute-sync-registry.md.
Re-run the probe block first — line numbers may have shifted since this
doc was written. Implement exactly as specified — Phase 1 only, do not
attempt Phase 2 (see PHASE 2 NOTE). Do not commit unless confidence ≥ 95.
If score < 95 report verbatim and stop — do not invent results.
