# CC-CMD — Bottom sheet / Stats tab reconciliation: move real stats content, deepen bottom sheet toward narrative

**Date:** 2026-07-19
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole — both surfaces are client-side)
**Branch:** main — commit directly. No PRs.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }; git log --oneline -5

---

## CONTEXT — the real reconciliation decision

The bottom sheet (`openBottomSheet`, ~L38629) currently mixes raw stats
content with narrative/journalism content in one per-game panel. The
Stats tab (`renderStatsSection`, shipped today, commit 4469111) is a real,
separate, cross-sport analytical surface. Direct investigation tonight
sorted every real bottom-sheet section into three real buckets — this
CC-CMD executes the first two:

**Move to Stats tab (real, raw analytical content):**
- Scouting Report (`buildScoutingReport`, ~L15994 — park factor, umpire
  ABS tendencies, probable pitcher ERA/tempo/arsenal whiff-rate)
- Standings (W-L records + series margins, inline in `openBottomSheet`)
- The milestone alert (`milestoneStr`, inline — "player needs N more X")
- BSD Pitch visual (`_bsBsdEventId` block — confirmed by Jeff directly as
  stats/metrics, not narrative)
- Comeback Probability (`buildComebackProbability`, part of "Live
  Intelligence") — real, objective win-probability-style computation,
  factually analogous to xG/WP already treated as non-patent-sensitive
  data elsewhere in the codebase, not FIELD's proprietary composite drama
  score. Distinct from the drama label it currently sits alongside.

**Stays in bottom sheet, real candidate to deepen further (not required by
this CC-CMD, but don't remove or weaken while doing the above):**
FIELD Brief, "Read full coverage" link, Game Summary, Story
(`buildStoryTape`), Drama Arc + its named-tier drama label (both real,
patent-load-bearing per RUWT — narrative framing, not raw numbers, is the
whole point, do not touch), matchupNote/localNote portion of "Context."

**Stays regardless (FIELD-specific utility, neither stats nor
journalism):** Watch On, Crew.

---

## REAL, IMPORTANT COMPLICATION — read before starting

Scouting Report, Standings, and the milestone alert are genuinely
**per-game** data (one specific matchup's park factor, one specific
team's record). The Stats tab's established pattern (per today's
`renderStatsSection` build) is genuinely **cross-game leaderboards** (top
8 across all real games/players for a stat). These are not the same
shape — a direct copy-paste move will not fit cleanly.

**Do not force per-game data into a leaderboard format it doesn't
belong in.** The real, honest solution is likely a distinct UI pattern
within the Stats tab — e.g., a "Today's Games" sub-section showing
per-game scouting/standings context for each real game on the current
slate, separate from the existing leaderboard-style blocks (MLB
Pythagorean gap, NFL CPOE, etc.). Confirm the real, current
`renderStatsSection` structure first, then design accordingly — don't
guess at a shape before looking.

---

## PRE-BUILD PROBE BLOCK

```bash
git log --oneline -5
grep -n "function openBottomSheet" src/legacy/field.js
grep -n "function renderStatsSection" src/legacy/field.js
grep -n "function buildScoutingReport" src/legacy/field.js
grep -n "function buildComebackProbability" src/legacy/field.js
node smoke.js index.html 2>&1 | tail -3
```

Re-read the real, current full content of `openBottomSheet` and
`renderStatsSection` fresh from HEAD before editing either — this doc's
own line numbers may have drifted since tonight's investigation.

---

## TASK 1 — Move Scouting Report + Standings + milestone to a new "Today's Games" Stats tab sub-section

Real, per-game context for each game on the current slate, grouped
separately from the existing leaderboard blocks. Reuse
`buildScoutingReport` and the existing standings-lookup logic directly —
don't reimplement, just relocate the call site and rendering target.

## TASK 2 — Move BSD Pitch visual to the Stats tab

Relocate the `_bsBsdEventId` pitch-container block and its real
`_bsdActivate` wiring. Confirm the real, current activation trigger logic
(`state==='in'` gating, idempotency) is preserved exactly — this has
existing, working subscription logic that must not be broken by the move.

## TASK 3 — Move Comeback Probability to the Stats tab

Relocate `buildComebackProbability`'s output, decoupled from the drama
label it currently sits alongside in "Live Intelligence" — the drama
label stays in the bottom sheet (patent-load-bearing), Comeback
Probability moves.

## TASK 4 — Remove the moved content from the bottom sheet cleanly

Confirm no orphaned CSS classes, no broken conditional rendering left
behind in `openBottomSheet` after removal — the remaining sections
(FIELD Brief, Game Summary, Story, Drama Arc, matchupNote/localNote,
Watch On, Crew) must render correctly with the removed sections' HTML
gone, not just hidden.

## TASK 5 — Real, direct verification

Smoke count check (958/0 or current real count, structural assertions
updated if any existed for removed/relocated elements). Real, direct
content check confirming: the bottom sheet no longer shows Scouting
Report/Standings/milestone/Pitch/Comeback Probability, and the Stats tab
now does, for the same real game.

---

## DONE CONDITION

The five real, identified sections are genuinely relocated (not
duplicated) from the bottom sheet to the Stats tab, in a shape appropriate
to their real per-game vs. cross-game nature — not forced into a mismatched
leaderboard format. The bottom sheet's remaining, narrative-focused content
renders correctly with no orphaned code from the removal.

**Confidence scoring:**
- TASK 1 (30 pts): real, correctly-shaped "Today's Games" sub-section, not forced into a leaderboard
- TASK 2 (20 pts): BSD pitch moved with existing activation logic fully preserved
- TASK 3 (15 pts): Comeback Probability moved, drama label correctly left behind
- TASK 4 (20 pts): clean removal, no orphaned code/CSS
- TASK 5 (15 pts): real, direct verification of both surfaces

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
