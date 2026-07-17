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

**Methodology correction, found via a real ripgrep + TreeSitter pass, not a re-guess:** the "~44" window-assignment estimate in earlier versions of this CC-CMD was wrong on two separate counting methods before landing on a real number. A line-start-anchored grep undercounted (44, missing anything nested past 2-space indentation). A broader ripgrep pass overcounted (63, likely catching comment/string text). A real AST parse (`web-tree-sitter`, walking `assignment_expression` nodes where the left side is `window.X`) gives the true count: **54**. Use the same AST approach, not a text search, for TASK 1 — and note that raw AST line numbers are relative to the *extracted `<script>` block*, not the full `index.html` file; add the script block's own starting line offset before reporting "real line numbers" in TASK 1's inventory, or the numbers will be wrong by whatever the offset is.

## TASK 1 — Full, complete inventory of every `window.X =` assignment

Not a sample — all 54 (AST-confirmed tonight via `web-tree-sitter`, not a text search — re-confirm this exact count with the same method, it may have changed since). For each: real line number (correcting for the script-block extraction offset, see CONTEXT), whether it executes at top-level (runs immediately on script parse) or inside a function (runs later, possibly conditionally), and — for top-level ones specifically — whether anything else in the file demonstrably depends on it existing before a specific point (a real call site earlier in file-execution-order that would break if the assignment moved later, or vice versa).

## TASK 2 — `window.fetch` override, specifically, in full detail

**Real answer already found tonight via AST parse, confirm rather than re-derive from scratch:** the override sits at script-relative line 35 — effectively the very start of the script block. Zero real `fetch(` call expressions exist anywhere before it; all 177 real calls in the file happen after. **The theoretical risk is real (a naive module-extraction order could still break this), but the practical risk right now is genuinely zero** — nothing currently executes before the override runs. Re-confirm this with the same AST method (not text search) rather than trusting this note blindly, since the file changes throughout the night — but this should be a fast confirmation, not new discovery work.

Exact line range of the override itself in the real, full `index.html` (correct for the script-block extraction offset). Document the same zero-before/177-after finding with real evidence in the outbox. (Cross-validated tonight: a plain ripgrep count returns 181 — the 4-call gap is fully explained by `fetch(` appearing inside comments, confirmed directly; the AST count of 177 is the real, correct one.)

## TASK 3 — Real esbuild dry-run, local only, not committed

**Real, specific risk to anticipate, not a hypothetical:** esbuild ships a platform-specific native binary (it's written in Go), not pure JS — the same general shape of dependency that hit a genuine sandbox-network wall with `tree-sitter` earlier tonight. Confirmed via direct test tonight that `npm install esbuild` installs cleanly in one sandbox environment — but that doesn't guarantee the same in this session's own environment, since network allowlists have differed between sandboxes on other tasks this same session (the June 22 MLS return-prep CC-CMD hit exactly this shape of issue against a different target). If `npm install esbuild` fails here, check whether it's a genuine network/binary-download block before treating it as a different kind of problem — this is the first thing to rule in or out, not something to debug from scratch.

Install esbuild locally (devDependency, don't commit yet). Attempt the actual Phase 1 wrap structure described (`legacy/field.js` = current script content, `main.js` with a single `import "./legacy/field.js"`) against a real local copy. Confirm esbuild can genuinely parse and bundle a file this size without error. Confirm the bundled output is behaviorally identical — real diff of pre/post script content beyond the wrapper itself, not just "esbuild didn't crash." This is a local proof-of-concept only — do not commit the esbuild dependency or the wrapped files unless TASK 4's smoke check passes cleanly first.

## TASK 4 — Verify smoke genuinely passes against the wrapped output

If TASK 3's dry-run produces a real bundled file, run the existing `smoke.js` against it (temporarily, locally). Real pass/fail — if it fails, that's real information about what Phase 1 actually requires beyond "nothing else changes," not a reason to force it green.

## TASK 5 — All three real deploy/publish paths, not just the two git-push-based ones

**Second correction, found on a closer pass: a third, structurally different path into production exists.** Beyond `deploy-gate.yml` and `field-autodeploy.yml`'s git-push-triggered behavior, `field-autodeploy.yml` itself also runs on a 30-minute poll against a specific, publicly-shared Google Drive file — if that file's content changes, this workflow auto-commits it to `main` directly, no git push involved at all. This looks purpose-built for an AI without direct git access (Gemini, presumably) to publish changes by saving to Drive.

**Real, decisive update, found via direct verification tonight — this downgrades the severity of what was flagged earlier, worth stating plainly rather than leaving the more alarmed framing standing.** The workflow itself has a real, self-documenting safe-default: it explicitly skips its own Drive-polling logic entirely if the `DRIVE_FILE_ID` repo secret isn't set, logging *"git push is canonical deploy path"* when it does. Checked directly against the real, current list of repo secrets (23 total, confirmed via the GitHub API) — **`DRIVE_FILE_ID` does not exist.** This mechanism is currently, practically dormant, not actively risky today — the same theoretical-vs-practical distinction already established for the `window.fetch` override above. Still worth naming as a real, standing risk for the *future* (if that secret is ever added without anyone connecting it to the migration), but it is not an active concern for a Phase 1 wrap attempted now. Re-confirm this secret's absence at execution time rather than trusting this note, since secrets can be added between sessions.

Confirm: the real, current Drive file ID this workflow *would* poll if the secret were set (informational, for completeness — not the main finding, the secret's absence is). Whether this mechanism has ever been active historically (check real commit history for auto-deploy-attributed commits) — if it was active before and the secret was later removed, that's worth knowing; if it was built and never activated, that's a different, less urgent story.

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
