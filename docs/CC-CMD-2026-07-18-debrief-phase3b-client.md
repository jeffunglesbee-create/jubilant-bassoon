# Claude Code Command — Compound Architecture Phase 3b: The Debrief (client)

**Date:** 2026-07-18
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly. No PRs.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }; git log --oneline -5.

**This CC-CMD requires explicit authorization before execution, AND requires Phase 3a (relay) to be deployed and live-verified first — do not proceed without confirming that directly.**

---

## CRITICAL — EDIT TARGET DISCIPLINE

All JS edits go in `src/legacy/field.js`. Never edit `index.html`'s `<script>` block directly — `scripts/sync-source.mjs` now has a divergence guard that will block (not silently discard) a direct edit, but the correct workflow is still to never attempt one. Run `node scripts/sync-source.mjs` before every smoke check and before every commit.

---

## CONTEXT

Source spec: Part 3 of the Compound Architecture doc (same ID as Phase 3a). RUWT compliance confirmed twice (original spec + July 7-8 recheck against ADR-002) — see Phase 3a's own CONTEXT section for the full compliance framing; the same constraint applies here: drama score and other Debrief content render only after a user has actively opened a finished game's card, never as a basis for a real-time recommendation or notification decision.

**Real, confirmed foundation already in place:** `_cardTemplate` (Phase 1) has a reserved `data-slot="debrief"`. `buildEnrichedGame` (Phase 2) already provides the `debrief: { dramaSealed, oddsOutcome, preGameBrief, seriesArc }` structure on every enriched game object — currently populated with null/placeholder values, since the relay didn't yet provide real data. Phase 3a should have just changed that.

---

## PRE-BUILD PROBE BLOCK

```bash
git log --oneline -5

# Confirm Phase 3a relay is genuinely live before proceeding
curl -s "https://field-relay-nba.jeffunglesbee.workers.dev/context/game/{a real, recent final game id}" | grep -o "drama_score[^,]*"
# If this doesn't show a real, non-null value for a game that should have one: STOP, Phase 3a isn't
# genuinely deployed yet, report this and do not proceed.

grep -n "function buildEnrichedGame" src/legacy/field.js
grep -n "debrief:" src/legacy/field.js | head -3
grep -c "data-slot=\"debrief\"" src/legacy/field.js
node scripts/sync-source.mjs
node smoke.js index.html 2>&1 | tail -3
```

Confirm Phase 3a is genuinely live before any client code is written — this is a hard, real gate, not a formality.

---

## TASK 1 — Layer 1: Drama Unsealed

Per spec: horizontal bar (0-100), color-graded QUIET→MUST, breakdown chips (lead changes, CRUNCH count, largest deficit, final margin). Use Phase 1's real `fieldChip` and the real, confirmed `debrief.dramaSealed` data shape from Phase 3a's live response — check the real shape via the probe block's curl output, don't assume the spec's exact field names are what the relay actually returns.

**Mandatory literal verification:**
```bash
grep -n "function buildDramaUnsealed\|function renderDramaUnsealed" src/legacy/field.js
```
Paste real output.

## TASK 2 — Layer 2: FIELD Was Watching

Two-part block: pre-game quote (dim, italic) + outcome (full brightness). Real data from `debrief.preGameBrief`.

**Mandatory literal verification:**
```bash
grep -n "function buildFieldWasWatching\|function renderFieldWasWatching" src/legacy/field.js
```
Paste real output.

## TASK 3 — Layer 3: The Odds Story

Three scenarios (CHALK/UPSET/SWEAT) per spec, using real `debrief.oddsOutcome` data. Confirm the real, current odds data shape on enriched games before assuming the spec's `opening_odds_parsed`/`closing_odds_parsed` field names are current.

**Mandatory literal verification:**
```bash
grep -n "function buildOddsStory\|function renderOddsStory" src/legacy/field.js
```
Paste real output.

## TASK 4 — Layer 4: Series Arc

Playoff-only visualization — dots + margins + sparkline, pure HTML/CSS per spec (no canvas/SVG). Real `debrief.seriesArc` data.

**Mandatory literal verification:**
```bash
grep -n "function buildSeriesArc\|function renderSeriesArc" src/legacy/field.js
```
Paste real output.

## TASK 5 — Assembly: buildDebrief(enrichedGame) + wiring into renderCard

One function combining Layers 1-4 into the `.card-debrief` sub-slots (`debrief-drama`, `debrief-prediction`, `debrief-odds`, `debrief-arc`, `debrief-recap` per spec). Wire `fillSlot(card, 'debrief', buildDebrief(enrichedGame))` into `renderCard` (Phase 2, currently STAGED/uncalled) — this is also the point where `renderCard` needs to actually start replacing `renderAll`'s HTML-string card generation for final games, per Phase 2's own session doc note that this was the blocker for the journalism-brief wiring gap too.

**This is real, additional scope beyond the original spec's Phase 3 estimate — Phase 2 left `renderCard` unwired, and Debrief rendering can't work without it being wired for at least final-state games.** Do this incrementally: wire `renderCard` for final-state games only first (the narrowest real scope this task needs), confirm smoke passes, before considering whether to extend it further.

**Mandatory literal verification:**
```bash
grep -n "function buildDebrief\b" src/legacy/field.js
grep -n "renderCard(" src/legacy/field.js
node scripts/sync-source.mjs && node smoke.js index.html 2>&1 | tail -3
```
Paste real output for all three.

## TASK 6 — CSS transition

`.game-card.is-final .card-debrief{display:block}` and hiding the pre-game brief slot on final, per spec. Confirm this doesn't conflict with Phase 1's own already-committed `.card-debrief{display:none}` base rule — check, don't duplicate.

## TASK 7 — Layer 5: Night Owl / Context Graph prompt integration

**This touches the relay's journalism prompt building, not just client rendering — confirm whether this belongs in this client-repo CC-CMD at all, or should be a separate relay CC-CMD.** If it requires relay changes, stop this task, report that it needs its own separate dispatch, and do not attempt a client-only partial version.

## TASK 8 — Real diff-size reconciliation and live verification

```bash
git diff --stat
```

Confirm real diff size matches the scope of what's about to be claimed. Real commit through the normal path. Real `deploy-gate.yml` job logs directly confirmed via actual pasted API output. Real live content check — confirm an actual, real final game's card shows real Debrief content, not just that the functions exist in the bundle.

---

## DONE CONDITION

Layers 1-4 genuinely implemented and rendering real data (confirmed via pasted grep output and a real live content check against an actual final game, not assumed), assembled via `buildDebrief` and wired into `renderCard` for final-state games, CSS transition correct, Layer 5 either genuinely completed or correctly identified as needing a separate relay dispatch — not silently skipped or force-attempted client-only.

**Confidence scoring:**
- TASK 1 (15 pts): Drama Unsealed real, confirmed via pasted output and real data
- TASK 2 (10 pts): FIELD Was Watching real
- TASK 3 (10 pts): The Odds Story real
- TASK 4 (10 pts): Series Arc real
- TASK 5 (25 pts): buildDebrief + renderCard wiring for final-state games, real and confirmed
- TASK 6 (5 pts): CSS transition correct, no duplication
- TASK 7 (5 pts): Layer 5 correctly scoped — either done or correctly deferred, not silently dropped
- TASK 8 (20 pts): real diff reconciliation, real live CI confirmed via job logs, real content check against an actual final game

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop. Do not write the outbox until every literal verification step's real output has been captured and included.
