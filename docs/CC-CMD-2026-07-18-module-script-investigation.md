# Claude Code Command — Investigate retiring the globalThis workaround (switch to `<script type="module">`)

**Date:** 2026-07-18
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly. No PRs.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }; git log --oneline -5.

**This CC-CMD is investigation and risk-mapping only. Do not change index.html's `<script>` tag to `type="module"` in this dispatch — that is real, separate, higher-risk work requiring its own explicit authorization after this investigation's findings are reviewed.**

---

## CONTEXT

Phase 3's own session doc names this directly: the `globalThis.X = X` pattern is explicitly temporary — *"this pattern is necessary until index.html is updated to use `<script type="module">` — at that point the globalThis workaround can be retired and proper ES module imports used throughout."*

**This is real, higher-risk work, not a mechanical follow-through, and needs its own investigation before anyone commits to it.** Module scripts have genuinely different execution semantics than classic scripts:
- Deferred by default (execute after DOM parsing, not inline at encounter time)
- Always strict mode (classic scripts may not be)
- Top-level `var`/`function` declarations do NOT automatically become `window.X` properties in a module (this is the core mechanism the 54 real `window.X =` assignments currently rely on for some of their own real, mapped boot-order dependencies — Phase 1's own verification found these)
- Each `<script type="module">` has its own top-level scope, not a shared global one

**Do not assume this conversion is safe because it "should" work in theory.** Phase 1's own incident (a real bug that reached production, survived by luck) is the standing reason nothing here gets assumed without direct evidence.

---

## TASK 1 — Real inventory: which of the 54 window.X= assignments would this affect

Cross-reference Phase 1's own real, AST-verified inventory (`docs/outbox/cc-esbuild-migration-verification-2026-07-17.md`, TASK 1's 54-entry table) against module-script semantics. For each of the 8 top-level assignments specifically (the ones with real, confirmed boot-order dependencies): would switching to a module script change when or whether that assignment fires relative to its real dependents? Real answer per assignment, not a blanket assumption either way.

## TASK 2 — Real test of the `fetch` override specifically

`window.fetch = async function _proofFetch()` is the highest-stakes example already characterized (script-relative line 34, 0 calls before it, 177 after). Build a minimal, real, local test: a module script that reassigns `window.fetch`, confirm whether code elsewhere in the same module (or a script that depends on this module having run first) genuinely sees the override. Real evidence, not inference from documentation about module semantics.

## TASK 3 — Real test of the established Phase 3 extraction pattern under module scripts

If `index.html`'s script becomes a module, does the current `globalThis.X = X` pattern from `src/main.js` even still make sense, or does module `type="module"` change how `src/main.js` itself should be structured (e.g., could extracted functions become genuine, direct imports in `field.js` at that point, closing the exact gap that forced the `globalThis` workaround in the first place)? This is likely the actual payoff of this whole investigation — confirm or refute with real evidence, not assumption.

## TASK 4 — Real local dry-run

Build a minimal, isolated reproduction (not the full 39,000-line file) — a small test harness with a `window.X=` top-level assignment, a dependent function called later, and a `<script type="module">` wrapper — confirm real, observed behavior matches or contradicts TASK 1's predictions.

## TASK 5 — Honest go/no-go recommendation

Based on real findings, not optimism: is switching to `type="module"` genuinely safe with a real, characterized migration path, or does it require deeper changes to the 8 top-level `window.X=` assignments first? If the latter, name which ones specifically and why.

---

## DONE CONDITION

A real, evidence-based answer to whether `<script type="module">` is safe to adopt, what it would change about the current extraction pattern, and what (if anything) needs to happen to the 8 top-level `window.X=` assignments first. No code change to `index.html`'s actual script type from this dispatch alone — that's separate, future, explicitly-authorized work if this investigation finds it's safe.

**Confidence scoring:**
- TASK 1 (25 pts): real cross-reference against all 8 top-level assignments, not a blanket claim
- TASK 2 (25 pts): real, local, observed test of the fetch override specifically
- TASK 3 (20 pts): real evidence on whether this closes the globalThis workaround entirely
- TASK 4 (15 pts): real, minimal reproduction test, not just documentation-based reasoning
- TASK 5 (15 pts): honest, evidence-grounded go/no-go, not optimistic default

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
