# Claude Code Command — Gap 2: AmbientDO SSE → Debrief Instant Transition

**Date:** 2026-07-18
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly. No PRs.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }; git log --oneline -5.

---

## CRITICAL — EDIT TARGET DISCIPLINE

All JS edits go in `src/legacy/field.js`. Never edit `index.html`'s `<script>` block directly — `sync-source.mjs` now has a divergence guard that blocks (doesn't silently discard) a direct edit, but the correct workflow is still to never attempt one.

---

## CONTEXT

Source: Drive doc "Circadian System + Compound Gap Closers" (June 15), Gap 2. Currently, Debrief content only appears on the next `injectDebriefCards` cycle (600ms after `renderAll`, itself on the V2/AmbientDO poll cadence) — this gap closes that lag by firing Debrief assembly the moment AmbientDO's SSE stream reports `final`, rather than waiting for the next poll.

**Real, confirmed foundation:** `injectDebriefCards` (Phase 3b) already does the real work — fetch Context Graph, `buildEnrichedGame`, `renderCard`, DOM replacement. This gap's real job is triggering it earlier for one specific game, not rebuilding it.

---

## PRE-BUILD PROBE BLOCK

```bash
git log --oneline -5
grep -n "_ambientES\.addEventListener\|addEventListener('final'" src/legacy/field.js
grep -n "async function injectDebriefCards" src/legacy/field.js
node smoke.js index.html 2>&1 | tail -3
```

Confirm the real, current AmbientDO SSE event listener structure before adding to it — the spec's own example may not match current code exactly.

---

## TASK 1 — Real confirmation of the SSE final-event handler

Find the real, current `final` event listener on the AmbientDO EventSource connection. Confirm its real current behavior (likely score/final-state UI updates) before adding to it.

## TASK 2 — Trigger single-game Debrief assembly on final

On the real `final` event, for the specific `gameId` in that event, call `injectDebriefCards`'s real underlying logic scoped to just that one game — or, if `injectDebriefCards` isn't easily scoped to a single game, call the full function but confirm it's genuinely fast/cheap enough not to matter (real, current implementation check, not assumed). Use a real dedup mechanism (a `Set` of already-triggered game IDs) so the same game doesn't get double-processed by both this trigger and the next natural poll cycle.

**Mandatory literal verification:**
```bash
grep -n "function.*[Dd]ebrief.*[Tt]rigger\|_debriefTriggeredIds" src/legacy/field.js
```
Paste real output.

## TASK 3 — Real verification

Fire-and-forget per spec — if Context Graph is slow or the fetch fails, the game still gets Debrief content on the next natural poll cycle (existing `injectDebriefCards` behavior), so this is a pure enhancement, not a new failure mode. Confirm this fallback genuinely still works (a fetch failure in the new trigger doesn't block or break the existing 600ms-after-render path).

## TASK 4 — Real diff and live verification

```bash
node scripts/sync-source.mjs && node smoke.js index.html 2>&1 | tail -3
git diff --stat
```

Real commit, real live CI confirmation via actual job logs, real content check.

---

## DONE CONDITION

A real `final` SSE event triggers Debrief assembly for that specific game immediately, with real deduplication against the natural poll-cycle path, and a confirmed graceful fallback if the immediate trigger fails.

**Confidence scoring:**
- TASK 1 (15 pts): real current SSE handler confirmed
- TASK 2 (40 pts): real trigger + dedup, confirmed via pasted output
- TASK 3 (25 pts): real fallback-path verification
- TASK 4 (20 pts): real diff, real live CI, real content check

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
