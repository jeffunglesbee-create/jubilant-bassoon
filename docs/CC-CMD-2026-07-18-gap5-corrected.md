# Claude Code Command — Gap 5 (corrected): Per-Sport Circadian System

**Date:** 2026-07-18
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly. No PRs.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }; git log --oneline -5.

---

## WHY THIS CC-CMD EXISTS (read before starting)

A prior dispatch of this same task produced a session doc claiming a complete implementation — three real functions, poll wiring, a DOM attribute, sort-order changes, specific line numbers, and CI verification (Deploy gate, Viewport Audit, Client Live Invariant all reported success). **The actual commit was 8 lines — only a CSS block.** None of the claimed JavaScript exists anywhere in the repo, confirmed via direct `grep` against both `index.html` and `src/legacy/field.js`, both re-verified fresh via `git fetch` + `git reset --hard origin/main` before checking (ruling out a stale-pull explanation).

**This CC-CMD exists specifically to redo the actual work and to prevent this specific failure mode from recurring — a confident, detailed report that doesn't match the real diff.** Every task below ends with a mandatory, literal verification step. Do not write the outbox until every one of these has been run and its real output pasted in.

**Real, confirmed starting state — the CSS already exists, do not recreate it:**
```css
:root[data-circadian="PREVIEW"]{--chip-must-opacity:.4;--chip-watch-opacity:1;--chip-discovery-opacity:1;--chip-quiet-opacity:.6}
:root[data-circadian="PRIME"]{--chip-must-opacity:1;--chip-watch-opacity:.8;--chip-discovery-opacity:.6;--chip-quiet-opacity:.5}
:root[data-circadian="NIGHT"]{--chip-must-opacity:.5;--chip-watch-opacity:.6;--chip-discovery-opacity:.8;--chip-quiet-opacity:1}
:root[data-circadian="LATE"]{--chip-must-opacity:.3;--chip-watch-opacity:.5;--chip-discovery-opacity:.5;--chip-quiet-opacity:1}
:root[data-circadian="DAWN"]{--chip-must-opacity:.3;--chip-watch-opacity:.8;--chip-discovery-opacity:.7;--chip-quiet-opacity:.8}
```
This is real and already committed (`b9a0ea6`). **Everything else below still needs to be built from scratch.**

Source spec: Drive doc "FIELD — Circadian System + Compound Gap Closers" (June 15 2026, APPROVED, ID `1NeAFkfKhBKhqeez-broEmb-q-ULB9u6L8tvwEWYyMeU`).

**Same scope boundary as before: no `.card-debrief` rules, no journalism prompt wiring, no Debrief DOM assumptions.** A separate thread may be building The Debrief in parallel — don't build against its assumed shape.

---

## PRE-BUILD PROBE BLOCK

```bash
git log --oneline -5
grep -c "function computeCircadianContext\|function computeSportCircadian\|function applyCircadian" index.html
# Must be 0. If not 0, someone else already built this — stop and report, don't duplicate.
grep -c "data-circadian=\"PREVIEW\"" index.html
# Should be >0 — confirms the CSS from the prior attempt is genuinely present.
node smoke.js index.html 2>&1 | tail -3
```

---

## TASK 1 — Implement computeCircadianContext + computeSportCircadian + applyCircadian

Per the spec, adapted for real current data shapes — check the real, current cross-adapter game-state pattern (the same one `isGameOver()` uses, not the spec's `g.status`-only assumption) and the real, current top-level data structure (confirm whether games are in a flat array with `g.sport`, or nested under `allData.sports` sections — don't assume either, check).

**Mandatory literal verification after this task, before moving to TASK 2:**
```bash
grep -n "function computeCircadianContext\|function computeSportCircadian\|function applyCircadian" index.html
```
Paste the real output. If any of the three show zero matches, do not proceed — fix it first.

## TASK 2 — Wire into the real poll cycle

Confirm the real, current V2 poll function name via grep — don't assume `fetchV2AllScores` from memory of the spec or prior attempt, verify it's still current.

**Mandatory literal verification:**
```bash
grep -n "computeSportCircadian(" index.html
```
Paste the real output showing the actual call site line.

## TASK 3 — data-sport-circadian attribute + sort order

Per spec, adapted to real current section-rendering code.

**Mandatory literal verification:**
```bash
grep -c "data-sport-circadian" index.html
```
Paste the real output. Must be greater than 0.

## TASK 4 — Full pipeline + real diff-size sanity check

```bash
node scripts/sync-source.mjs
node smoke.js index.html 2>&1 | tail -3
git diff --stat
```

**Before writing the outbox: compare the real `git diff --stat` line-count output against what you are about to claim was built.** If the outbox is going to describe multiple new functions, wiring, attributes, and sort logic, the diff should show substantially more than single-digit insertions. If the real diff doesn't match the scope of what you're about to report, stop and reconcile the discrepancy before writing anything — do not write an outbox whose claims exceed what `git diff --stat` actually shows.

## TASK 5 — Commit and real live verification

Commit through the normal path. Confirm the real `deploy-gate.yml` run via the actual GitHub Actions API job/step output — paste the real job list and each step's real conclusion, not a summary claim of "success." Confirm live site content via a real `curl` + `grep` check for the actual function names or their effects, not an assumption.

---

## DONE CONDITION

`computeCircadianContext`, `computeSportCircadian`, and `applyCircadian` genuinely exist (confirmed via the literal grep outputs pasted at each task, not summarized), wired into the real poll cycle, `data-sport-circadian` present on real DOM, sort order responds to mode — verified via real job logs and a real live content check, with the outbox's own claims matching the real `git diff --stat` output.

**The outbox for this dispatch must include, verbatim, the real output of every "Mandatory literal verification" step above — not a paraphrase of the result.**

**Confidence scoring:**
- TASK 1 (30 pts): real functions exist, confirmed via pasted grep output, not claimed
- TASK 2 (15 pts): real poll wiring, confirmed via pasted grep output
- TASK 3 (15 pts): real DOM attribute, confirmed via pasted grep output
- TASK 4 (15 pts): real diff-size reconciliation performed and shown, not skipped
- TASK 5 (25 pts): real live CI run confirmed via actual pasted job/step output, real post-deploy content check with pasted curl/grep output

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop. Do not write the outbox until every literal verification step's real output has been captured and included.
