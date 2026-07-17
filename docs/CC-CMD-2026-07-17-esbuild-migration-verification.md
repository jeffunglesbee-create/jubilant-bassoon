# Claude Code Command — Pre-migration verification: boot-sequence dependency map + Phase 1 dry-run feasibility

**Date:** 2026-07-17
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }; git pull; git log --oneline -5.

**This CC-CMD is verification and mapping only. Do not attempt the actual esbuild/Vite Phase 1 wrap in this dispatch — that requires explicit separate authorization given the scale of the decision.**

Write findings to docs/outbox/cc-esbuild-migration-verification-2026-07-17.md.

## CONTEXT

A real architectural discussion (Claude Code, relayed via chat) proposed a phased esbuild → Vite migration for FIELD's single-file structure (44,070 lines, confirmed live tonight — the discussion's own "34,000+" estimate is now 10,000 lines stale). Phase 1 ("make esbuild invisible" — wrap the existing file as `legacy/field.js`, `main.js` imports it, nothing else changes) was floated as low-risk. Before treating that as proven rather than intended, real verification is needed — this session's own repeated pattern tonight (claims that needed a second, closer look before trusting them) applies here too, and the stakes of getting a boot-order bug wrong in production are real.

**One confirmed, high-stakes example already found, not hypothetical:** `window.fetch = async function _proofFetch()` (line ~4929) overrides the native global fetch. Any code executing before this line runs still gets native fetch; anything after gets FIELD's instrumented wrapper. A module-extraction order mistake here would fail silently, not loudly.

## TASK 1 — Full, complete inventory of every `window.X =` assignment

Not a sample — all ~44 (re-confirm the real current count, it may have changed). For each: real line number, whether it executes at top-level (runs immediately on script parse) or inside a function (runs later, possibly conditionally), and — for top-level ones specifically — whether anything else in the file demonstrably depends on it existing before a specific point (a real call site earlier in file-execution-order that would break if the assignment moved later, or vice versa).

## TASK 2 — `window.fetch` override, specifically, in full detail

Exact line range of the override itself. Real count of `fetch(` call sites before this line in the file versus after. Confirm whether any of the "before" call sites are genuinely reachable before the override runs (top-level code that fires before this point) or whether they're all inside functions that only get called later, after boot completes (which would mean the theoretical risk is real but the practical risk is currently zero — check don't assume either way).

## TASK 3 — Real esbuild dry-run, local only, not committed

**Real, specific risk to anticipate, not a hypothetical:** esbuild ships a platform-specific native binary (it's written in Go), not pure JS — the same general shape of dependency that hit a genuine sandbox-network wall with `tree-sitter` earlier tonight. Confirmed via direct test tonight that `npm install esbuild` installs cleanly in one sandbox environment — but that doesn't guarantee the same in this session's own environment, since network allowlists have differed between sandboxes on other tasks this same session (the June 22 MLS return-prep CC-CMD hit exactly this shape of issue against a different target). If `npm install esbuild` fails here, check whether it's a genuine network/binary-download block before treating it as a different kind of problem — this is the first thing to rule in or out, not something to debug from scratch.

Install esbuild locally (devDependency, don't commit yet). Attempt the actual Phase 1 wrap structure described (`legacy/field.js` = current script content, `main.js` with a single `import "./legacy/field.js"`) against a real local copy. Confirm esbuild can genuinely parse and bundle a file this size without error. Confirm the bundled output is behaviorally identical — real diff of pre/post script content beyond the wrapper itself, not just "esbuild didn't crash." This is a local proof-of-concept only — do not commit the esbuild dependency or the wrapped files unless TASK 4's smoke check passes cleanly first.

## TASK 4 — Verify smoke genuinely passes against the wrapped output

If TASK 3's dry-run produces a real bundled file, run the existing `smoke.js` against it (temporarily, locally). Real pass/fail — if it fails, that's real information about what Phase 1 actually requires beyond "nothing else changes," not a reason to force it green.

## TASK 5 — All three real deploy/publish paths, not just the two git-push-based ones

**Second correction, found on a closer pass: a third, structurally different path into production exists.** Beyond `deploy-gate.yml` and `field-autodeploy.yml`'s git-push-triggered behavior, `field-autodeploy.yml` itself also runs on a 30-minute poll against a specific, publicly-shared Google Drive file — if that file's content changes, this workflow auto-commits it to `main` directly, no git push involved at all. This looks purpose-built for an AI without direct git access (Gemini, presumably) to publish changes by saving to Drive.

**This is a real, specific risk for the migration, not just a documentation gap:** after a Phase 1 wrap, `index.html` stops being raw source — the real source moves to `legacy/field.js`. If that monitored Drive file is ever updated with a raw, unwrapped `index.html` after the migration (by a session unaware the structure changed), this workflow would silently auto-commit it straight to `main`, potentially reverting the wrap outside of any git-based safeguard.

Confirm: the real, current Drive file ID this workflow polls. Whether this mechanism is still actively used or dormant/legacy (check real recent commit history for auto-deploy-attributed commits, don't assume from the file's existence alone). If active, this needs its own explicit handling in any real migration plan — not part of this verification-only dispatch, but must be named as a real, open risk in the outbox rather than silently absent from it.

## DONE CONDITION

A real, complete boot-order dependency map exists (not just the one example already found). The `window.fetch` override's actual practical risk (not just theoretical) is characterized with real evidence. A real, local esbuild dry-run either confirms Phase 1 is genuinely as safe as proposed, or surfaces what it actually requires that "nothing else changes" doesn't currently account for — either is a valid, useful outcome. Nothing is committed to production as a result of this dispatch alone.

**If TASK 3/4 reveal Phase 1 is genuinely safe:** file a real, separate follow-up CC-CMD for the actual committed migration, requiring its own explicit authorization — do not fold the real migration into this dispatch even if the dry-run looks clean.

**If TASK 3/4 reveal genuine problems:** document them precisely enough that the next real attempt doesn't have to rediscover them.

**Confidence scoring:**
- TASK 1 (25 pts): complete, real inventory, not a sample
- TASK 2 (20 pts): real practical-risk characterization for the fetch override specifically
- TASK 3 (25 pts): genuine local dry-run attempted, real evidence of outcome either way
- TASK 4 (15 pts): real smoke run against the actual wrapped output
- TASK 5 (15 pts): all three real deploy/publish paths characterized (both git-push workflows plus the Drive-polling auto-deploy), the Drive-polling mechanism's active/dormant status confirmed with real evidence, the migration risk it poses explicitly named in the outbox

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop. Automate follow-ups. No fallbacks, only fixes.
