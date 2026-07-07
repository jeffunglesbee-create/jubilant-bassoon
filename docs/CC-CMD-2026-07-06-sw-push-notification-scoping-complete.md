# CC-CMD: Complete notification scoping using the existing keyed PREF_UPDATE sync (not a new system)

**Date:** 2026-07-06
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR

**This corrects the prior CC-CMD's Task 2, which honestly reported 70/100
and correctly did not commit.** Your diagnosis was right — `MY_TEAMS` has
no sync path to the service worker today. Where the prior attempt
concluded this needed its own preliminary CC-CMD: it doesn't. The sync
mechanism you need already exists, generically, for `_swDramaDial` — it's
not dial-specific, it's a **keyed** preference-update channel. Extend it;
don't design a new one.

**Confirmed real, exact, existing pattern (verified directly this turn,
not assumed):**
```javascript
// main thread, index.html:6930 and :23612 —
navigator.serviceWorker.controller.postMessage({type:'PREF_UPDATE', key:'drama_dial', value: v});
```
```javascript
// sw.js message handler —
if (e.data?.type === 'PREF_UPDATE') {
  if (e.data.key === 'drama_dial') _swDramaDial = e.data.value;
  // ... IndexedDB persistence for drama_dial happens here too
}
```
The real storage backing "My Teams" is `MY_TEAMS`, a `Set` persisted to
`localStorage['field_my_teams']` (index.html:~22962), written via
`saveMyTeams()`. This is a plain JSON array of team name strings —
trivial to carry over the same channel.

**Target time:** ~20 min (this is a small extension, not a new build)

## PROBE BLOCK
```bash
grep -n "PREF_UPDATE" index.html sw.js
grep -n "MY_TEAMS\s*=\|saveMyTeams" index.html
```
Confirm the citations above still match. If the working tree has
uncommitted Task 1 + Task 3 changes from the prior attempt sitting
locally, keep them — this CC-CMD adds Task 2 on top of that same work,
it does not redo Tasks 1 and 3.

## TASK 2 (completing the prior CC-CMD) — sync MY_TEAMS via the existing keyed channel

1. Wherever `saveMyTeams()` is called (whenever the user adds/removes a
   team), also send: `navigator.serviceWorker.controller?.postMessage({type:'PREF_UPDATE', key:'my_teams', value:[...MY_TEAMS]})`.
   Also send this once on page load (same place the dial's initial sync
   happens) so the SW has a fresh copy even if the user hasn't changed
   their teams this session.
2. In `sw.js`'s existing `PREF_UPDATE` handler, add:
   ```javascript
   else if (e.data.key === 'my_teams') {
     _swMyTeams = new Set(e.data.value);
     // persist to IndexedDB using the exact same store/pattern already used for _swDramaDial
   }
   ```
3. Before `showNotification()` fires (both call sites, ~196 and ~243
   from the prior CC-CMD), add: only show if the push's game involves a
   team in `_swMyTeams`. If `_swMyTeams` is empty (user has no favorited
   teams yet), fall back to showing for all games clearing the boolean
   gate — don't silently notify for nothing if the user hasn't set
   preferences yet, but don't block everything either; report which
   choice you made and why.

## VERIFICATION
- Confirm via real IndexedDB inspection (not just code review) that a
  team added via the UI actually appears in the SW's synced copy.
- Real test pair: a synthetic push for a user-selected team's game
  produces a notification; the identical payload for a non-selected
  team's game does not.
- Confirm this doesn't regress Tasks 1 or 3 — re-verify both are still
  exactly as previously confirmed (boolean trigger, no scalar; dial
  functioning as display filter).

## DONE CONDITIONS
- [ ] Probe block confirms citations
- [ ] Tasks 1 and 3 from the prior attempt preserved, not redone
- [ ] MY_TEAMS synced via the existing keyed PREF_UPDATE channel, verified via real IndexedDB inspection
- [ ] Notification scoping verified with a real true/false test pair
- [ ] Empty-favorites fallback behavior decided and reported, not left ambiguous
- [ ] Smoke clean
- [ ] Outbox written

## CONFIDENCE SCORING TABLE
+20  Tasks 1+3 confirmed preserved and unregressed
+35  MY_TEAMS sync correctly extends the existing keyed channel, verified via real IndexedDB read
+25  Notification scoping verified with a real true/false test pair
+10  Empty-favorites fallback explicitly decided and reported
+10  Smoke clean

## ONE-LINER
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO -- this CC-CMD targets jubilant-bassoon"; exit 1; }
git pull. Read docs/CC-CMD-2026-07-06-sw-push-notification-scoping-complete.md.
Your prior attempt on this task correctly scored 70/100 and correctly
did not commit -- that was the right call. This doc completes Task 2:
the sync path you correctly identified as missing already exists
generically as the PREF_UPDATE keyed channel used for drama_dial --
extend it with key:'my_teams' rather than building a new mechanism.
Keep your already-verified Task 1 + Task 3 work from the prior attempt.
Verify MY_TEAMS sync via real IndexedDB inspection and notification
scoping via a real true/false test pair. Do not commit unless
confidence >= 95. If score < 95, report verbatim and stop.
