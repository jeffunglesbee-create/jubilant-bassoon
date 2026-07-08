# CC-CMD: Fix Truth Is / Night Stars — connect the voice computation to the real finalized_at data

**Date:** 2026-07-08
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR

## THIS CORRECTS MY OWN EARLIER, INCOMPLETE UNDERSTANDING — READ BEFORE STARTING

Hours ago, investigating why this section renders inconsistently on
iPad and never on Android, I traced the bug to `_finalizedAt` — a
session-local map populated with `Date.now()` at first-observation
time, not real completion time — and got a relay-side prerequisite
built and deployed (`finalized_at` column, exposed as `finalizedAt` in
`/analytics/newspaper/{date}`'s completed-game objects).

**Re-verifying just now, fresh, before writing this CC-CMD, found that
understanding was incomplete.** `.np-truth`/`.np-stars` render from
`bundle.night_stars`/`bundle.truth_is` — fields on the newspaper
bundle itself. The voice that decides whether to *hide* them
(`applyNewspaperVoice` → `getNewspaperVoice` → `getCardCircadian` →
`minutesSinceFinal` → `_finalizedAt`) operates on a **completely
separate** array — confirmed directly: `getNewspaperVoice`'s own
comment states "the newspaper bundle itself carries no live per-game
state array," and the single real call site
(`applyNewspaperVoice(_renderAllCircadianGames)`, `index.html:11078`)
passes `allData.sports`-derived data, never the bundle. These are two
disconnected data structures today. The relay fix put `finalizedAt`
on the bundle's games — but the voice computation that needs it reads
a different array entirely.

**A second, genuinely separate thing, found the same way — do not
conflate this with the above.** `session_health` currently shows
`night_stars: degraded: true`. Traced this to `computeNightStars()` in
field-relay-nba: `degraded = dramaMissing > totalGames * 0.5` — more
than half of yesterday's games missing a `drama_peak` value. This has
nothing to do with timing, `finalized_at`, or the voice mechanism.
**Explicitly out of scope for this CC-CMD** — a real, separate
data-completeness problem, not investigated here.

## PROBE BLOCK
```bash
sed -n '6816,6825p' index.html   # _finalizedAt, minutesSinceFinal
sed -n '6830,6853p' index.html   # getNewspaperVoice — confirm the "bundle carries no live state" comment
sed -n '22038,22053p' index.html # applyNewspaperVoice
grep -n "applyNewspaperVoice(" index.html  # confirm the one real call site and what it's passed
grep -n "_renderAllCircadianGames" index.html | head -5  # trace where this array actually comes from
```
Confirm all of this still matches before designing anything.

## TASK 1 — Determine the right way to connect the two data sources

This needs real design judgment with full file access, not a
prescribed mechanism from outside. The two live options, evaluate
both against what's actually in the code:

- **Match `allData.sports` games to the newspaper bundle's
  `finalizedAt`-carrying games by name/date**, similar in spirit to
  `findEspnEntry()`/`_pickStorageKey()` — but confirm what stable
  fields both sides actually share before assuming this works
  cleanly; the newspaper bundle's games and `allData.sports`'s games
  may not share obviously-matchable fields.
- **Have `getNewspaperVoice`/`getCardCircadian` read from the bundle's
  own game list directly**, sidestepping the `allData.sports`
  session-volatile `_id` scheme entirely — this avoids repeating the
  exact ID-mismatch class of bug that's caused multiple real failures
  tonight (click-to-scroll, WP resolution), since the bundle's games
  are already keyed by something stable. Confirm this is actually
  feasible given what `applyNewspaperVoice`'s single call site
  currently has available at that point in `renderAll()`.

State explicitly which approach was chosen and why, including what
made the other one worse — don't silently pick one.

## TASK 2 — Implement the fix

Whichever approach Task 1 selects, the end state:
`getCardCircadian()`'s `NIGHT` vs `LATE` classification for a
completed game should be based on the real `finalized_at` timestamp
when available, not session-local first-observation time. Preserve
the existing fallback behavior (`Infinity` → `LATE`) for any game
where a real timestamp genuinely isn't available yet — don't turn a
missing-data case into a crash or a wrong classification.

## VERIFICATION

- Real test: a game that finished hours ago, verified via the relay's
  own `finalized_at` to have actually finished more than 120 minutes
  ago — confirm it now correctly classifies as `LATE`, not `NIGHT`,
  regardless of when the current session first observed it.
- Real test: a game that finished recently (within 120 real minutes)
  — confirm it correctly classifies as `NIGHT` even on a freshly
  loaded page that never witnessed the live transition.
- Confirm this doesn't regress the existing, correct handling of
  currently-live or not-yet-started games — this fix is scoped to the
  completed-game classification only.
- Confirm `night_stars: degraded: true` in `session_health` is
  **unaffected** by this change (it should be, since it's a separate
  data-completeness signal) — report the actual value, don't assume.

## DONE CONDITIONS
- [ ] Probe block confirms citations before editing
- [ ] Task 1's approach chosen explicitly, with real reasoning for why the alternative was worse
- [ ] `getCardCircadian`'s completed-game classification uses real `finalized_at`, not session-local timing
- [ ] Missing-data fallback preserved, not turned into a crash
- [ ] Real tests prove both a stale-but-recent and a genuinely-old completed game classify correctly
- [ ] Live-game and upcoming-game handling confirmed unregressed
- [ ] Confirmed `night_stars: degraded` is unaffected, not assumed
- [ ] Outbox explicitly distinguishes this fix from the separate drama_peak/degraded issue

## CONFIDENCE SCORING TABLE
+20  Task 1's approach chosen with real, stated reasoning
+30  Real `finalized_at` correctly drives NIGHT/LATE classification
+15  Missing-data fallback preserved correctly
+20  Both real test cases (recent and stale completed games) verified
+10  Live/upcoming handling confirmed unregressed
+5   Outbox correctly distinguishes this from the drama_peak issue

## ONE-LINER
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO -- this CC-CMD targets jubilant-bassoon"; exit 1; }
git pull. Read docs/CC-CMD-2026-07-08-truth-is-night-stars-client-fix.md.
This corrects an earlier, incomplete understanding -- the voice
computation (getNewspaperVoice/getCardCircadian/minutesSinceFinal)
reads allData.sports, completely separate from the newspaper bundle
that now carries finalizedAt. Determine the right way to connect them
(match by name/date, or read the bundle's own game list directly to
avoid repeating tonight's recurring client-_id-vs-stable-id mismatch
bug) -- state which approach and why. Implement so completed-game
NIGHT/LATE classification uses the real finalized_at timestamp, not
session-local first-observation time. The separate night_stars:
degraded signal (missing drama_peak data, unrelated) is explicitly out
of scope -- confirm it's unaffected, don't touch it. Do not commit
unless confidence >= 95. If score < 95, report verbatim and stop.
