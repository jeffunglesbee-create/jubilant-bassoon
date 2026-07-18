# Claude Code Command — Bridge inline-handler implicit globals (Scenario B prerequisite)

**Date:** 2026-07-18
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly. No PRs.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }; git log --oneline -5.

---

## CRITICAL — EDIT TARGET DISCIPLINE

All JS edits go in `src/legacy/field.js`, never `index.html` directly.

---

## CONTEXT

Real finding from a ripgrep pass across `index.html`, done specifically because a prior investigation (module-script Scenario A/B research) only mapped the 54 *explicit* `window.X=` assignments — it never checked inline HTML event handlers.

**65 real inline event-handler attributes** (`onclick`, `onchange`, `oninput`, `onsubmit`, `onkeydown`, etc.) call named functions. Cross-referenced against the 54 mapped assignments: **zero overlap** — every one of these is a pure implicit global today, relying on classic-script behavior where a top-level `function name(){}` automatically becomes a `window.name` property. This works fine under the current IIFE + classic `<script>` setup. It would silently break under Scenario B (true ES module conversion, removing the IIFE) — module-scoped top-level functions do not automatically become `window` properties.

**This CC-CMD's own initial list, corrected once already — re-derive fresh, don't trust it blindly:** a first pass found 14 candidate names; one (`if`) was a false positive from `onkeydown="if(event.key===...)"`, a real inline conditional, not a function call. The corrected 13: `_deskCardToggle`, `closeBottomSheet`, `fetchMCPStatus`, `goToDate`, `openJournalismForGame`, `pinGame`, `scrollToGame`, `setViewerIntelMode`, `switchWCTab`, `toggleJournalismView`, `togglePickEmView`, `toggleWCView`, `unpinGame`.

**Real, explicit scope boundary: this CC-CMD only adds `window.X=` bridges. It does not attempt Scenario B itself (removing the IIFE, true module conversion) — that remains separate, still-unauthorized work.**

---

## PRE-BUILD PROBE BLOCK

```bash
git log --oneline -5

# Re-derive the real, current list fresh — don't trust the list above without re-checking
rg -o '(onclick|onchange|oninput|onsubmit|onkeydown|ondblclick)="([a-zA-Z_$][\w$]*)\(' index.html -r '$2' | sort -u

# Manually inspect any name that looks like a JS keyword (if/for/while/etc.) or is otherwise
# suspicious before treating it as a real function name — the same false-positive check that
# caught "if" in this CC-CMD's own first pass.

# Confirm zero overlap with existing window.X= assignments for the real, current list
```

## TASK 1 — Real, fresh re-derivation and false-positive check

Re-run the real extraction. Confirm the real, current count and names — this doc's own 13 may be stale if `index.html` has changed since. Manually verify each candidate is a genuine function name (defined somewhere in `field.js` as `function name(...)`), not a keyword or expression fragment the regex misfired on.

## TASK 2 — Confirm each function's real, current definition exists

For each real, confirmed name, find its real `function name(...)` definition in `field.js` — confirm it genuinely exists (don't bridge a name that turns out to reference something that no longer exists or was renamed).

## TASK 3 — Add explicit window.X= bridges

For each confirmed function, add `window.functionName = functionName;` at an appropriate point in `field.js` — matching the same pattern already used for the 54 existing assignments (grouped sensibly, not scattered randomly). This is additive only — the functions keep working exactly as before via the classic-script/IIFE path; this just also makes them explicit, addressable globals the same way the other 54 already are.

**Mandatory literal verification:**
```bash
grep -c "window\.\(_deskCardToggle\|closeBottomSheet\|fetchMCPStatus\|goToDate\|openJournalismForGame\|pinGame\|scrollToGame\|setViewerIntelMode\|switchWCTab\|toggleJournalismView\|togglePickEmView\|toggleWCView\|unpinGame\)\s*=" src/legacy/field.js
```
Paste real output — should match the real, confirmed count from Task 1.

## TASK 4 — Real verification the inline handlers still work

Confirm this is genuinely additive and non-breaking — the inline `onclick="functionName()"` calls still resolve the exact same way they did before (classic-script scope), the new `window.X=` line is purely additional. Real smoke check.

## TASK 5 — Real diff and live verification

```bash
node scripts/sync-source.mjs && node smoke.js index.html 2>&1 | tail -3
git diff --stat
```

Real commit, real live CI confirmed via actual job logs, real live content check.

---

## DONE CONDITION

All real, confirmed inline-handler functions (re-derived fresh, not assumed from this doc's own list) have explicit `window.X=` bridges added, purely additively, verified via real job logs and live content check. This is genuinely a prerequisite completed — Scenario B itself remains a separate, future, explicitly-authorized CC-CMD.

**Confidence scoring:**
- TASK 1 (20 pts): real, fresh re-derivation, correctly excludes any false positives
- TASK 2 (15 pts): real confirmation every bridged function genuinely exists
- TASK 3 (30 pts): clean, additive bridges, confirmed via pasted output
- TASK 4 (15 pts): real confirmation this is non-breaking
- TASK 5 (20 pts): real diff, real live CI, real content check

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
