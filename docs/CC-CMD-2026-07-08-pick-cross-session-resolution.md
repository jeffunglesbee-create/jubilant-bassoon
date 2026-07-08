# CC-CMD: Investigate whether pick resolution can ever find picks made in a prior session

**Date:** 2026-07-08
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR

## THIS IS THE REAL "CLIENT SIDE" FOLLOW-UP — POTENTIALLY MORE FUNDAMENTAL THAN TONIGHT'S RELAY FIX

Tonight's relay-side fix (`f7323f8`, field-relay-nba) made `resolveWinProbability()`
correct *when resolution is attempted*. This CC-CMD investigates
something upstream and potentially more severe: **whether resolution
is ever attempted at all**, for the common case of a user making a
pick and closing the app before the game finishes.

**Confirmed, not theorized:** `_gid` (the counter behind `game._id =
"g" + (++_gid)`) resets to 0 on every page load/re-render
(`index.html:7149`, `9766`, `22269`). `saveEspnFinal()` calls
`_resolvePickIfExists(id, game, eData)` where `id = game._id ||
(game.home+game.away)` (`index.html`, inside `saveEspnFinal`) — and
since `_id` is assigned to every game early in processing, the
fallback never actually engages. `_resolvePickIfExists` looks up
`cache[id]` in `localStorage['field_picks_v1']`.

**The concern, stated precisely:** if a pick is made in one page
load (stored under `cache["g28"]`, say) and the game finishes during
a *later* page load — a closed tab reopened, a refresh, a new day —
`_gid` has reset and reassigned numbers from scratch. There's no
guarantee the same real-world game gets the same `g`-number twice.
If it doesn't, `cache[id]` at resolution time misses entirely.
Silently — no error, no log, nothing to catch, because
`_resolvePickIfExists` simply finds no matching key and does nothing.

## PROBE BLOCK
```bash
sed -n '7145,7152p' index.html
sed -n '9764,9768p' index.html
sed -n '22265,22271p' index.html
grep -n "function saveEspnFinal" index.html
grep -n "function _resolvePickIfExists" index.html
grep -n "function makePick" index.html
```
Confirm all of this still matches before investigating further.

## TASK 1 — Determine how severe this actually is, before designing a fix

This needs real investigation, not an assumed fix:

- Does `game._id` assignment in `allGamesFlat()`/schedule processing
  happen in a *stable, deterministic order* across page loads for the
  same real slate (e.g., always sorted by start time, same sport
  grouping) — meaning the same real game *might* reliably get the same
  `g`-number as long as the slate composition hasn't changed? Or does
  live-score-driven re-sorting (drama ranking, live-first ordering,
  anything state-dependent) mean this can't be relied on even within
  the same day? Test this concretely — reload the schedule twice in
  quick succession, compare `g`-numbers for known games, rather than
  reason about it abstractly.
- Is there *any* existing reconciliation happening today that would
  explain why picks have ever resolved successfully in the past,
  despite this? (Same-session resolution — pick made and game finishes
  while the same tab stays open — is a real, valid case that doesn't
  hit this problem. Determine how large a fraction of realistic usage
  that actually covers.)
- Check the two other `.gameId` references found during scoping
  (`index.html:18489`, `21812`) — these suggest a separate, possibly
  more stable identifier exists in some contexts. Determine whether
  it's universally available on every game object or only in specific
  paths (e.g., WC26/socket-connected games), and whether it's
  actually stable across page loads or just differently-sourced.

## TASK 2 — Design and implement the real fix, informed by Task 1

The likely shape: pick storage and resolution should key on something
stable — `sport + home + away + date`-style composite, or a genuinely
persistent ID if Task 1 finds one — not the session-volatile counter.
This touches `makePick()`, `_getPickCache()`/`_savePickCache()`,
`_resolvePickIfExists()`, and the "already picked" check the pick
widget uses to decide its own state. Do not design this against a
guess — base the exact key shape on what Task 1 actually finds.

**This is a genuinely bigger, riskier change than tonight's relay fix**
— it touches the on-disk shape of every user's existing pick data.
Consider explicitly whether existing `localStorage['field_picks_v1']`
entries (keyed by old-style `g`-numbers) need a migration step, or
whether they can be left to age out naturally (already-resolved picks
don't need re-keying; only unresolved ones matter, and those are
short-lived by nature).

## VERIFICATION

- Real test: make a synthetic pick, force a fresh `_gid` reset
  (simulating a new page load) with the same underlying game, confirm
  the new key scheme still finds and resolves the original pick.
- Confirm existing, already-resolved picks in a real or synthetic
  `localStorage` aren't broken by whatever migration approach is
  chosen.
- Confirm the "already picked, show your pick" UI state still
  correctly recognizes a pick across a simulated session boundary.

## DONE CONDITIONS
- [ ] Probe block confirms citations before editing
- [ ] Task 1's real severity assessment reported honestly — including if it turns out less severe than suspected
- [ ] Fix designed against Task 1's actual findings, not a guess
- [ ] Cross-session resolution proven via a real test, not asserted
- [ ] Existing pick data confirmed not broken by the change
- [ ] Outbox clearly distinguishes this from tonight's relay-side fix

## CONFIDENCE SCORING TABLE
+25  Task 1's severity assessment is real, tested, not assumed
+30  Fix correctly keys picks on something genuinely stable
+20  Cross-session resolution proven via a real test
+15  Existing pick data confirmed unaffected
+10  Outbox correctly distinguishes this from tonight's relay fix

## ONE-LINER
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO -- this CC-CMD targets jubilant-bassoon"; exit 1; }
git pull. Read docs/CC-CMD-2026-07-08-pick-cross-session-resolution.md.
Investigate first, don't assume: game._id resets every page load
(_gid=0 at three points), and _resolvePickIfExists looks up picks by
this same volatile id -- meaning a pick made in one session may never
be found when the game finishes in a later one. Determine how severe
this actually is with real tests (does slate ordering stay stable
enough in practice, how much usage is same-session anyway), check
whether a more stable gameId already exists in some contexts
(index.html:18489, 21812), then design the fix against what's actually
found -- likely re-keying pick storage on something stable rather than
the session-local counter. This is a bigger, riskier change than
tonight's relay fix since it touches existing user data -- consider
migration carefully. Do not commit unless confidence >= 95. If score <
95, report verbatim and stop.
