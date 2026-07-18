# Claude Code Command — Gap 7 client: render bracketDelta in WC Debrief cards

**Date:** 2026-07-18
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly. No PRs.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }; git log --oneline -5.

---

## CRITICAL — EDIT TARGET DISCIPLINE

All JS edits go in `src/legacy/field.js`, never `index.html` directly.

---

## CONTEXT

**Time-sensitive: WC Final is 2026-07-19 — tomorrow.** Gap 7's relay side is live and independently verified (`bracketDelta` key confirmed present on real `/context/game/{id}` responses). This is the client rendering half, named explicitly as outstanding in Gap 7's own session doc.

**Real, confirmed relay shape** (`{significant, maxChampShift, shifts[], narrativeSeeds[], triggerGame, computedAt}`, or `null` for non-WC games): render only when non-null and `significant` is true — the shift is meant to surface only when it's a real, meaningful bracket movement, not every recompute.

---

## PRE-BUILD PROBE BLOCK

```bash
git log --oneline -5
grep -n "async function injectDebriefCards" src/legacy/field.js
grep -n "function buildDebrief\b" src/legacy/field.js
curl -s "https://field-relay-nba.jeffunglesbee.workers.dev/context/game/{a real, recent WC game id if one exists}" | grep -o "bracketDelta[^}]*}"
node smoke.js index.html 2>&1 | tail -3
```

If a real WC match has completed since Gap 7 shipped, use its real response shape directly. If not, hand-construct a real, schema-accurate test object matching the confirmed shape — don't guess at field names.

---

## TASK 1 — Real confirmation of the current Debrief assembly and WC-specific handling

Confirm `buildDebrief`'s real current structure and whether it already branches on sport for WC-specific content (Series Arc is currently playoff-only per Phase 3b — confirm whether `bracketDelta` should live alongside it or as its own layer).

## TASK 2 — Build the bracket-shift render function

A real, small render function (e.g., `buildBracketShift(bracketDelta)`) — per spec's own intent: named team(s) whose advancement odds shifted, the real magnitude (`maxChampShift`), and any `narrativeSeeds` text if present. Return `null`/empty if `!bracketDelta || !bracketDelta.significant` — this is a real, meaningful-only signal, not shown on every WC game.

**Mandatory literal verification:**
```bash
grep -n "function buildBracketShift\|bracketDelta" src/legacy/field.js
```
Paste real output.

## TASK 3 — Wire into buildDebrief for WC games

Only for `sport === 'wc'` (or the real, confirmed sport identifier for World Cup games — verify, don't assume 'wc' is exactly right). Read `enrichedGame.debrief.bracketDelta` (confirm this is genuinely how `buildEnrichedGame` should be extended to carry it — the field may need adding there first if it isn't already passed through from the Context Graph response).

## TASK 4 — Real diff and live verification

```bash
node scripts/sync-source.mjs && node smoke.js index.html 2>&1 | tail -3
git diff --stat
```

Given the real time pressure (WC Final tomorrow), prioritize getting this genuinely correct and live-verified over speed — a rushed, wrong implementation the day before the Final is worse than landing it a few hours later, correct. Real commit, real live CI confirmation, real content check.

---

## DONE CONDITION

`bracketDelta` renders in WC Debrief cards when significant, using the real, confirmed relay shape, verified via real job logs and a real live content check — ideally against a real WC game if one has completed by execution time.

**Confidence scoring:**
- TASK 1 (15 pts): real confirmation of Debrief/WC structure
- TASK 2 (30 pts): real render function, correct significant-only gating
- TASK 3 (30 pts): real wiring, correct sport-scoping, confirmed data flows from Context Graph through buildEnrichedGame
- TASK 4 (25 pts): real diff, real live CI, real content check

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
