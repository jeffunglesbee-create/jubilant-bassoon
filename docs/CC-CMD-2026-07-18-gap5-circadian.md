# Claude Code Command — Gap 5: Per-Sport Circadian System

**Date:** 2026-07-18
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly. No PRs.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }; git log --oneline -5.

---

## CONTEXT

Source spec: Drive doc "FIELD — Circadian System + Compound Gap Closers" (June 15 2026, Status: APPROVED, ID `1NeAFkfKhBKhqeez-broEmb-q-ULB9u6L8tvwEWYyMeU`). This gap was carried forward for weeks as "blocked, no authoritative definition" — that was wrong. A complete, approved spec with working code has existed the whole time; it was simply never re-found. Confirmed tonight via direct grep: neither `computeCircadianContext` nor `computeSportCircadian` exist anywhere in the current codebase — genuinely unbuilt, not just unfound.

**Real, deliberate scope boundary — a separate Claude Code thread is currently investigating building The Debrief.** The full spec's Part 1 includes CSS/sort integration referencing `.card-debrief` selectors and Debrief-specific display logic. **Do not build any of that in this dispatch.** Building against a feature that's actively being designed elsewhere risks a real, avoidable collision — two sessions independently deciding what `.card-debrief` should look like. This CC-CMD is scoped to what's genuinely independent of The Debrief:

**IN SCOPE:**
- `computeCircadianContext(now, games)` — the core five-mode function (PREVIEW/PRIME/NIGHT/LATE/DAWN), exactly as specced
- `computeSportCircadian(now, games)` — the per-sport mode map, exactly as specced
- `applyCircadian(mode)` — sets `document.documentElement.dataset.circadian`
- General CSS custom properties for chip opacity by mode (`--chip-must-opacity` etc.) — these reference existing `.field-chip--*` classes, not Debrief-specific ones
- Per-sport data attribute (`data-sport-circadian`) on sport sections
- Sort order integration in the schedule compound, using the mode-based sort rules from the spec (PREVIEW/PRIME/NIGHT/LATE/DAWN sort logic) — but only the parts that don't reference Debrief display state
- Refresh cycle: run `computeCircadianContext` on the existing V2 poll cycle

**EXPLICITLY OUT OF SCOPE — do not touch:**
- Any `.card-debrief` CSS rules or selectors
- Journalism prompt integration (the spec's "flows into the Context Graph and journalism prompt" section) — this depends on server-side changes not part of this CC-CMD
- Anything that assumes The Debrief's DOM structure exists

If, during implementation, any in-scope piece turns out to genuinely require something Debrief-specific to work correctly, stop and report that specific dependency rather than building around it or guessing at The Debrief's eventual shape.

---

## PRE-BUILD PROBE BLOCK

```bash
git log --oneline -5
grep -c "computeCircadianContext\|computeSportCircadian\|applyCircadian" index.html
grep -n "class=\"field-chip--MUST\"\|field-chip--WATCH\|field-chip--DISCOVERY\|field-chip--QUIET" index.html | head -5
node smoke.js index.html 2>&1 | tail -3
```

Confirm zero existing implementation (should be zero per tonight's own check, but re-confirm at execution time — the codebase has moved constantly all session). Confirm the real, current chip class names match the spec's assumptions before wiring CSS to them — the spec is from June 15, over a month old; verify these class names weren't renamed since.

---

## TASK 1 — Real confirmation the spec's assumptions still hold

Check `field-chip--MUST`/`WATCH`/`DISCOVERY`/`QUIET` class names genuinely exist as written in the spec, not renamed or restructured since June 15. Check the schedule compound's real, current render function name (the spec references `renderScheduleFromEnriched()` — confirm this is still the real function name, not assumed from a month-old doc).

## TASK 2 — Implement computeCircadianContext + computeSportCircadian

Exactly as specced in the Drive doc's Part 1. Pure functions, no DOM side effects within them.

## TASK 3 — Implement applyCircadian + CSS integration

`applyCircadian(mode)` sets the data attribute. CSS custom properties for chip opacity by mode, applied to the real, confirmed chip classes from TASK 1 — not the Debrief-related CSS block from the spec.

## TASK 4 — Wire into the real refresh cycle

Call `computeCircadianContext`/`computeSportCircadian` on the existing V2 poll cycle (confirm the real poll function name via grep, don't assume from the spec).

## TASK 5 — Sort order integration

Wire the mode-based sort rules into the real, current schedule render path — confirmed function name from TASK 1, not the spec's possibly-stale reference.

## TASK 6 — Real, live verification

Full local pipeline dry-run, real commit through the normal path, real `deploy-gate.yml` job logs directly confirmed, real live content check post-deploy (confirm `data-circadian` attribute is genuinely present on the live page).

---

## DONE CONDITION

`computeCircadianContext`, `computeSportCircadian`, and `applyCircadian` genuinely implemented and wired into the real render/poll cycle, CSS mode-based chip emphasis working, sort order responds to circadian mode — all verified via real job logs and a real live content check, with zero Debrief-specific code touched.

**Confidence scoring:**
- TASK 1 (20 pts): real confirmation the spec's referenced class/function names still match current code
- TASK 2 (25 pts): core functions implemented exactly as specced
- TASK 3 (15 pts): CSS integration wired to real, confirmed chip classes
- TASK 4 (15 pts): real refresh-cycle wiring
- TASK 5 (15 pts): real sort-order integration
- TASK 6 (10 pts): real live CI run confirmed via job logs, real post-deploy content check

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
