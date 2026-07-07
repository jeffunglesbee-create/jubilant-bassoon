# CC-CMD: Redesign SW push trigger — boolean gate, not summed score; scope to user-selected games

**Date:** 2026-07-06
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR

**Source:** RUWT patent re-analysis this session. `computePushDrama()`
computes a summed 0-100 scalar and compares it to `_swDramaDial` — this
is the one piece of shipped FIELD architecture that most closely tracks
claim 1/12's elements (processing engine determines a value, compares
to threshold, notification engine fires in response), regardless of it
running client-side. Real usage is small (verified this session: at
most 1 of 4 real devices has ever subscribed, both Android devices show
zero, no confirmed instance of full delivery), but the fix is cheap and
the exposure is real, so this closes it properly rather than leaving it.

**This does not remove the feature.** It changes what triggers it.

**Target time:** ~40 min — this is a real design change, not a quick fix.

## PROBE BLOCK
```bash
sed -n '130,280p' sw.js                          # full current push handler
grep -n "myTeamsFilter\|_swDramaDial" index.html sw.js
grep -n "isCrunchTime\|fieldGameTier" index.html  # confirm current definitions unchanged
```
Confirm citations match before editing.

## REAL DESIGN CONSTRAINT — do not guess at storage, verify it

`_swDramaDial` already syncs from the main thread into the SW via
IndexedDB (confirmed at sw.js line ~154: `get.onsuccess = () => { if
(get.result >= 45 && get.result <= 90) _swDramaDial = get.result; }`).
The client has a real "My Teams" concept (`myTeamsFilter`,
`index.html` line ~22965) but this session did not fully verify whether
the underlying favorited-teams list is persisted anywhere the service
worker can read it (a SW runs in a separate execution context; it
cannot read main-thread JS variables or localStorage directly, only
IndexedDB/its own cache). **Before writing Task 2, find and confirm the
actual persistent storage backing "My Teams"** — if it's already in
IndexedDB or can be synced there via the same postMessage pattern
already used for `_swDramaDial`, extend that pattern. Do not invent a
new, separate storage mechanism if one already exists to extend.

## TASK 1 — Replace the summed scalar with a factual boolean trigger

Change `computePushDrama(d)` (currently: margin-tiered scoring summing
toward a 0-100 value) to instead compute and return a single boolean —
matching the existing `isCrunchTime`-style factual gate already used
elsewhere in this codebase (period/margin AND, no summing, no
intermediate numeric scale). Remove the numeric scalar entirely from
this code path — not just stop displaying it, stop computing it.

Update the two call sites (lines ~196 and ~243) from `if (drama <
_swDramaDial) return;` to a direct boolean check: `if (!isCrunchLike)
return;`. Remove `_swDramaDial`'s use as a numeric push-threshold
entirely as part of this task (see Task 3 for its new role).

## TASK 2 — Scope triggering to user-selected games only

Per the design constraint above: once the real storage mechanism for
"My Teams" (or equivalent followed-games list) is confirmed, add a
check before `showNotification()` fires: only show the notification if
the incoming push's game involves a team/game the user has explicitly
selected. If no such persisted, SW-readable list currently exists,
**stop and report this honestly rather than inventing a new storage
system** — this may need to be split into its own CC-CMD once the
storage question is answered, and that's a legitimate, correct outcome
of this task, not a failure to report plainly.

## TASK 3 — Rewire `_swDramaDial` from push-threshold to display-filter

The dial should no longer gate whether a push notification fires. Keep
the existing slider UI as-is. Repurpose its stored value to control
which tiers get visually highlighted/badged in the already-open app
(a display filter), not which crosses a threshold that triggers a
background push. Confirm with a grep that no remaining code path uses
`_swDramaDial` as a push-suppression threshold after this change.

## VERIFICATION

- `node smoke.js index.html` clean
- Confirm via real testing (not just code review) that a synthetic
  "isCrunchLike: true" payload for a user-selected game produces a
  notification, and the same payload for a NON-selected game does not.
- Confirm the dial still visibly affects something in the open app
  (the repurposed display-filter behavior), not silently doing nothing.
- Report honestly if Task 2's storage question couldn't be resolved in
  this session — do not fabricate a working game-selection check against
  storage that was never actually confirmed to exist.

## DONE CONDITIONS
- [ ] Probe block confirms citations before editing
- [ ] Storage mechanism for user-selected games confirmed real before Task 2 is attempted (or honestly reported as unresolved)
- [ ] `computePushDrama` replaced with a boolean, no scalar remains in this path
- [ ] Notification scoped to user-selected games, verified with a real true/false test pair
- [ ] `_swDramaDial` repurposed to display-filter, confirmed no longer used as push threshold
- [ ] Smoke clean
- [ ] Outbox written, explicitly stating whether Task 2 fully completed or was honestly deferred

## CONFIDENCE SCORING TABLE
+15  Storage mechanism for Task 2 confirmed real (not assumed) before proceeding
+30  Boolean trigger replaces the scalar correctly, verified no numeric value remains in this path
+30  Notification scoping verified with a real true/false test pair, not just code review
+15  Dial correctly repurposed and confirmed still functional as a display filter
+10  Smoke clean

## ONE-LINER
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO -- this CC-CMD targets jubilant-bassoon"; exit 1; }
git pull. Read docs/CC-CMD-2026-07-06-sw-push-boolean-redesign.md. This
is a real design change, not a quick fix -- take the time it needs.
First confirm the actual storage mechanism behind "My Teams"/followed
games before attempting Task 2; if none exists that the service worker
can read, report that honestly and stop rather than inventing one.
Replace computePushDrama's summed scalar with a factual boolean gate
(isCrunchTime-style), scope notifications to user-selected games, and
repurpose _swDramaDial from a push-threshold into a display filter for
the already-open app. Verify with real true/false test pairs, not just
code review. Do not commit unless confidence >= 95. If score < 95,
report verbatim and stop.
