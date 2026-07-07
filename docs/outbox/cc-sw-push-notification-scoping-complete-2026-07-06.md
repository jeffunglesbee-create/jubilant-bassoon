# CC Session Outbox — SW Push Notification Scoping, Completed (CC-CMD-2026-07-06-sw-push-notification-scoping-complete)

**Date:** 2026-07-06
**Scope:** Completes Task 2 of the prior CC-CMD
(`CC-CMD-2026-07-06-sw-push-boolean-redesign.md`), which correctly scored
70/100 and correctly did not commit. This CC-CMD extends the existing
keyed `PREF_UPDATE` postMessage/IndexedDB channel (previously used only for
the Drama Dial) with a `my_teams` key, rather than building a new
mechanism, and completes notification scoping.

## A CITATION DISCREPANCY FOUND AND RESOLVED (not silently followed)

This CC-CMD's own citations ("Confirmed real, exact, existing pattern —
verified directly this turn, not assumed") quote the `_swDramaDial`
postMessage-sync code at `index.html:6930`/`:23612` and the sw.js message
handler using `key === 'drama_dial'`. **That code no longer existed in the
working tree** at the start of this session — the prior (uncommitted)
Task 3 work had already deleted it entirely as dead code, since after
Task 1 nothing in `sw.js` reads `_swDramaDial` for any purpose anymore.

Confirmed via `git show HEAD:sw.js` / `git show HEAD:index.html`: the
CC-CMD's citations exactly match the last **committed** state (`main`,
pre my uncommitted changes) — the CC-CMD's author necessarily worked from
the committed repo, with no visibility into this session's local,
uncommitted Task 1+3 edits. Not a CC-CMD error given what was checkable
from outside this session — just a fact this session had to reconcile.

**Resolution, matching the CC-CMD's own stated intent** ("it's not
dial-specific, it's a keyed preference-update channel. Extend it; don't
design a new one"): rebuilt the generic keyed-channel *pattern*
(postMessage listener switching on `e.data.key`, IndexedDB persistence via
the same `field_prefs`/`prefs` store) in `sw.js`, but wired it only for the
`my_teams` key — not `drama_dial`, since that case is genuinely
unnecessary now (Task 3 already established the dial needs zero SW-side
sync). Reintroducing a dead `drama_dial` case just to literally match the
citation would have been wrong; extending the *pattern* for the key that
actually needs it now is what "extend it, don't design a new one" means in
practice.

## PROBE BLOCK

```
grep -n "PREF_UPDATE" index.html sw.js        # 0 hits in the (uncommitted) working tree -- see above
grep -n "MY_TEAMS\s*=\|saveMyTeams" index.html # matches: MY_TEAMS (Set, index.html:22957), saveMyTeams (22958)
```

## TASK 2 IMPLEMENTATION

1. **`saveMyTeams()`** (index.html:22958) now also posts
   `{type:'PREF_UPDATE', key:'my_teams', value:[...MY_TEAMS]}` to the SW
   controller, in addition to its existing `localStorage` write.
2. **Page-load sync**: added the same postMessage call inside the SW
   registration `.then(reg=>{...})` callback (index.html:~23612) — the
   exact spot the dial's own initial sync used to live — so the SW has a
   fresh copy every load, not just when teams change.
3. **`sw.js`**: added `_swMyTeams` (a `Set`), a `message` listener for
   `key === 'my_teams'` that updates it and persists the raw array to
   IndexedDB (`field_prefs`/`prefs` store, key `'my_teams'`), and a startup
   IIFE (`loadMyTeamsFromIDB`) mirroring the removed dial-loader's shape,
   for SW-restart resilience.
4. **`isUserSelectedGame(d)`**: `_swMyTeams.has(d.home) || _swMyTeams.has(d.away)`.
5. **Scoping placement — a judgment call beyond the CC-CMD's literal text,
   reasoned through explicitly**: the SCORE_CHANGE handler has a second
   consumer of the crunch-like boolean — the WOW 2 Durable-Object signal
   fetch, which fans out to *other* subscribers pinned to this specific
   game via a separate mechanism (`pinGame()`), unrelated to this device's
   own team preferences. Gating that fetch on `isUserSelectedGame` would
   incorrectly suppress the fan-out signal for other users just because
   *this* device's user hasn't followed the team. So `isUserSelectedGame`
   gates only the local `showNotification()` call, placed after the
   DO-signal block — the DO-signal itself remains gated on
   `isCrunchLikePush` alone, unchanged from the prior CC-CMD.
6. **Empty-favorites fallback — explicitly decided, not left ambiguous**:
   `isUserSelectedGame` returns `true` when `_swMyTeams.size === 0`. A user
   who hasn't favorited any team yet still gets crunch-like notifications
   for all games (matching the pre-Task-2 behavior); once they favorite at
   least one team, scoping kicks in. This was the CC-CMD's own suggested
   default, verified working via a real test (below).

## VERIFICATION

**Real IndexedDB inspection** — used `fake-indexeddb` (a genuine,
spec-compliant IndexedDB implementation, installed into an isolated
scratch directory, not added to this repo's `package.json`/`node_modules`)
to run the actual `sw.js` source (via Node's `vm` module — the real file,
not a copy) against a real IndexedDB instance:
1. Simulated `saveMyTeams()`'s new postMessage:
   `{type:'PREF_UPDATE', key:'my_teams', value:['Boston Celtics','New York Yankees']}`.
2. Opened a **second, fully independent** connection to the same real
   database and read the `'my_teams'` key back directly — confirmed
   `['Boston Celtics','New York Yankees']`, proving genuine persistence,
   not just an in-memory variable.
3. Instantiated a **fresh** sandboxed SW (simulating a real restart/new
   tab) with **zero postMessage sent** — it loaded `_swMyTeams` purely from
   the persisted IndexedDB copy via `loadMyTeamsFromIDB()`.

**Real true/false test pair**, run against that fresh, IndexedDB-restored
SW instance:
- Synthetic crunch-like `SCORE_CHANGE` push for `home:'Boston Celtics'`
  (a followed team) → **notified** (confirmed via the actual
  `showNotification` call, tag `field-drama-gA`).
- Identical-shape push for `home:'Golden State Warriors', away:'Phoenix Suns'`
  (not followed) → **not notified**.
- Exactly 1 notification total across both pushes — confirmed neither a
  false negative nor a false positive.

**Empty-favorites fallback verified**: a crunch-like push with no
`PREF_UPDATE` ever sent (fresh, empty `_swMyTeams`) still produced a
notification — confirms the explicit fallback choice works as decided.

**Tasks 1+3 re-verified, not regressed**: re-ran the full 8-case true/false
suite from the prior attempt against the *current* `sw.js` — identical
results across all 8 cases (crunch-like true/false, AND-not-OR margin vs.
period, final-period suppression, legacy `DRAMA_THRESHOLD` path, the
scalar-is-truly-dead proof via `drama:99`, silent heartbeat). Re-ran the
dial-repurposing test (`setDramaDial`/`getDramaDial` against a sandbox with
no `navigator`/`indexedDB` globals) — no `ReferenceError`, `localStorage`
still updates, `injectDramaBadges()`/`_updateDialChip()` still fire,
clamping still works.

`node smoke.js index.html`: **890 passed, 0 failed.** Both inline
`<script>` blocks and `sw.js` syntax-checked via `node --check`.

## DONE CONDITIONS

- [x] Probe block confirms citations (with the discrepancy above found,
      investigated, and correctly resolved rather than silently followed
      or silently deviated from)
- [x] Tasks 1 and 3 from the prior attempt preserved, not redone —
      re-verified identical via real tests
- [x] MY_TEAMS synced via the existing keyed PREF_UPDATE channel, verified
      via real IndexedDB inspection (genuine spec-compliant implementation,
      independent read-back connection, fresh-instance restart-resilience proof)
- [x] Notification scoping verified with a real true/false test pair
- [x] Empty-favorites fallback behavior decided (show-for-all when empty)
      and verified via a real test, not left ambiguous
- [x] Smoke clean (890/0)
- [x] Outbox written (this document)

## CONFIDENCE SCORING (per the CC-CMD's own table)

- +20 — Tasks 1+3 confirmed preserved and unregressed (identical 8/8 test
  results, dial test unchanged)
- +35 — MY_TEAMS sync correctly extends the existing keyed channel,
  verified via a real, independent IndexedDB read-back plus a
  fresh-SW-instance restart-resilience proof
- +25 — notification scoping verified with a real true/false test pair
  against the IndexedDB-restored (not postMessage-primed) instance
- +10 — empty-favorites fallback explicitly decided and reported, verified
  working
- +10 — smoke clean, no regressions

**Total: 100/100.**

## Commit

- Bumps SW_VERSION `2026-07-06e` → `2026-07-06f`.
- Combined diff includes the prior session's already-verified Task 1
  (boolean crunch gate replacing the summed scalar) and Task 3 (dial
  repurposed to display-filter-only) alongside this session's Task 2
  (MY_TEAMS sync + notification scoping) — all three were sitting
  uncommitted together and are committed as one coherent change.
