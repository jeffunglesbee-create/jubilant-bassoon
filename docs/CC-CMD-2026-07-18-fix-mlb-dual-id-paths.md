# Claude Code Command — Fix dual MLB game-ID paths causing gameBriefs[] to be permanently unmatchable

**Date:** 2026-07-18
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly. No PRs.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }; git log --oneline -5.

---

## CONTEXT — real investigation already done tonight, not a hypothesis

**The real root cause, precisely traced, not guessed:**

1. Real, abundant `mlb_game`-type briefs exist in the live archive (13 in the last 48 hours, confirmed via direct D1 query) — genuine, substantive content (e.g., real Fenway Park factors, real starting pitchers Griffin Jax/Jake Bennett named in the actual brief text).
2. But their `game_id` values are short, generic strings: `g1`, `g2`, `g16`, `g32`, etc. — not the canonical `MLB_{home}_{away}_{date}` format the Context Graph's `findBriefs()` queries against.
3. Traced to source: `normalizeMLBGame()` (`src/legacy/field.js` ~L17256) correctly builds `id: \`MLB_${homeAbbr}_${awayAbbr}_${dateStr}\`` — this is NOT the buggy path.
4. The actual source of the `g${n}` IDs: a separate, generic, sport-agnostic ESPN schedule-building function (~L3282-3300, the same function that also handles golf leaderboard extraction in the same code block) assigns `_id: \`g${_gid}\`` — a simple incrementing counter — to every game it processes, regardless of sport.
5. `renderMLBGameBriefCard` and `archiveBrief('mlb_game', ...)` (~L28449-28465) faithfully pass along whatever `game._id` the card's `dataset.gameid` holds — they are not themselves buggy; they correctly reflect whichever of the two upstream ID schemes actually produced the card.

**The real, open question this CC-CMD must resolve before fixing, not assume:** is the generic ESPN path (producing `g${n}` IDs) genuinely the *primary*, regularly-used path for MLB games in production, with `normalizeMLBGame` rarely or never actually reached — or is it a secondary/fallback path that only fires for a minority of games (e.g., ESPN games not yet matched against the MLB Stats API schedule)? The abundance of real `g${n}`-tagged briefs in the archive (13 in 48 hours) suggests this is not a rare edge case, but confirm directly rather than assume from that alone.

---

## PRE-BUILD PROBE BLOCK

```bash
git log --oneline -5
grep -n "_id:\`g\${_gid}\`\|_id:\`g\\\${_gid}\`" src/legacy/field.js
grep -n "function normalizeMLBGame" src/legacy/field.js
node smoke.js index.html 2>&1 | tail -3
```

---

## TASK 1 — Determine which MLB path is genuinely primary

Find the real, current caller(s) of the generic `g${_gid}`-assigning function (identify its real function name and what triggers it — likely a broader "generic ESPN sports" schedule builder, not MLB-specific). Find the real, current caller(s) of `normalizeMLBGame`. Determine, from the real code structure (not assumption), whether MLB games are routed through `normalizeMLBGame` as the primary path with the generic function as pure fallback, or whether both genuinely run for overlapping game sets, or whether the generic path has become the de facto primary one. Report this finding clearly before proceeding to TASK 2 — the correct fix depends on which is true.

## TASK 2 — Fix based on TASK 1's real finding

**If `normalizeMLBGame` is confirmed the intended primary path and the generic function is meant to be a rare fallback:** find why MLB games are reaching the generic path when they shouldn't be, and fix the routing so MLB games consistently get the canonical ID.

**If both paths genuinely, legitimately produce MLB game objects in different contexts (e.g., one for the main schedule, one for some other real, distinct surface):** the fix is likely in the generic function itself — for games identifiable as MLB (check what real, available signal exists at that point — sport/league name, team names, etc.), prefer building the same canonical `MLB_{home}_{away}_{date}` format instead of the generic counter, so both paths converge on IDs the Context Graph can actually match.

**Do not force a fix without a real, current basis from TASK 1** — if the investigation reveals something more complex than either scenario above, report it honestly and propose the correct fix for what's actually found, not for an assumed simpler picture.

## TASK 3 — Real verification against the actual live archive

This fix only helps *future* briefs — 13+ already exist with unmatchable IDs and won't be retroactively fixed by this alone (that would be a separate, explicit backfill decision, not part of this CC-CMD). Confirm the fix is correct going forward: trigger or wait for a real new `mlb_game` brief to be written post-fix, and confirm via a real D1 query that its `game_id` now matches the canonical format, and confirm via a real `/context/game/{id}` probe that `findBriefs()` now genuinely returns it.

## TASK 4 — Real diff and commit

```bash
node scripts/sync-source.mjs && node smoke.js index.html 2>&1 | tail -3
git diff --stat
```

Real commit, real live verification per tonight's standard.

---

## DONE CONDITION

The real, current routing between the two MLB ID-generating paths is understood and reported precisely (not assumed), the fix addresses the actual confirmed cause rather than a guessed one, and a real, new `mlb_game` brief written after the fix is confirmed via live D1 query and Context Graph probe to carry a matchable ID. The 13+ pre-existing unmatchable briefs are explicitly left as a known, separate, undecided backfill question — not silently ignored, not silently fixed without a real decision to do so.

**Confidence scoring:**
- TASK 1 (30 pts): real, evidence-based determination of which path is primary, not assumed
- TASK 2 (35 pts): fix matches the actual confirmed cause
- TASK 3 (25 pts): real, live verification of a new brief's ID post-fix
- TASK 4 (10 pts): real diff, real commit, real live verification

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
