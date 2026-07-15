# CC Session — 2026-07-15 — TreeSitter Tooling (call-graph + prompt-tag audit)

## Summary
Follow-on session to tonight's orphan-sweep work (see `HANDOFF.md` and the 14 `docs/outbox/cc-*-2026-07-15.md` manifests for that separate thread). This session was conversational, not CC-CMD-dispatched: chat asked what else `web-tree-sitter` (installed as a real devDependency earlier tonight) could be used for, then asked for two of the answers to be built for real. Both are now checked into `scripts/` and registered in `package.json`, not left as scratchpad one-offs — the exact gap `HANDOFF.md`'s own 2026-07-13 entry flagged for a similar tool that was built and lost.

No `index.html` changes this session — dev-tooling only.

## HEAD Progression
- Start: `662dbed` (HANDOFF.md update closing the orphan-sweep thread)
- End: `2920de3` (origin/main)
- One external commit landed in between, not mine: `db498f7` — "Correct smoke-count arithmetic in the orphan-sweep summary," a parallel session's precision fix to `HANDOFF.md`'s own per-CC-CMD smoke deltas. Rebased cleanly on top of it, did not touch it.

## Smoke
- 954/0 at session start, 954/0 at session end — unchanged throughout (both real commits are `scripts/`/`package.json` only, zero `index.html` diff).

## SW_VERSION
- No change: `2026-07-15b` (no `index.html` touched, no bump required).

## Commits

### `2777389` — build: check in the prompt-tag array audit script
**Files changed:** `scripts/audit-prompt-tag-array.js` (new), `package.json` (+`audit-prompt-tags` script).

Uses `web-tree-sitter` to find a target function's real per-game prompt-tag array by AST structure (not text search) and audits each array-element IIFE for the `try{...}catch(e_){return ''}` contract, exact-duplicate bodies, and regexes shared across 2+ entries.

**Run and verified against `buildCompoundPrompt` (default target) directly, not just written and trusted:**
- First draft walked *every* IIFE anywhere in the function, catching nested local-variable helpers (e.g. `const tomET = (() => {...})();`, already covered by its own enclosing IIFE's try/catch) as false "missing try/catch" hits — 2 false positives.
- Fixed to only walk direct elements of the real array (located by structure: it's inline-chained into `.filter(Boolean).join('\n')`, not a bare `return [...]`).
- Clean result: 28/28 real prompt-tag IIFEs have a proper try/catch. One flagged, traced, and confirmed *not* a bug (`populateSeriesContext(g)`'s catch calls `captureFieldError` instead of `return ''` — a legitimate side-effect-only entry; `undefined` and `''` are both falsy and get filtered identically by the array's own `.filter(Boolean)`). Zero exact duplicates. One shared regex between `[SEASON STATS]`/`[RECENT FORM]` — the intentional pairing built earlier tonight, not an accidental copy.
- CLI arg (`node scripts/audit-prompt-tag-array.js <functionName>`) verified against 3 different real functions: `getNHLAnalyticsContext` (correctly reports no qualifying array — it builds output via `.push()`, not one array literal), `_buildFinalsDeskPrompt` (finds a real 19-element array, correctly reports 0 IIFEs — plain template-string/ternary lines, a different pattern), and a bogus name (clean error exit).

### `2920de3` — build: check in a real AST call-graph / impact-analysis script
**Files changed:** `scripts/call-graph.js` (new), `package.json` (+`call-graph` script).

`node scripts/call-graph.js <functionName> | --orphans | --callers/--callees <name>` — real function→caller/callee graph via AST `call_expression` resolution, plus a second real reference mechanism (bare function references passed as arguments, e.g. `games.map(fnName)` / `x.then(fnName)`) that a naive call-expression-only walk misses.

**Verified against 6 known ground-truth cases from tonight's own orphan-sweep work before trusting it** (`teamName`, `trackNHLPenaltyTransitions`, `_computeSRPlayEPA`, `markFreshnessLive`, `injectNBARegression`, `getNBARegression`) — all matched exactly on the first clean run.

**Two real bugs found and fixed during that verification, not glossed over:**
1. **Ambiguous local re-declarations.** Names like `avg`/`close`/`cleanup` are declared as local helpers independently inside 8+ unrelated enclosing functions. A single `name → declaration` map can only remember one, and the scope-shadow check then correctly excludes every real call as "shadowed by a *different* local declaration of the same name" — net effect, real, live, locally-called helpers were reported as orphans. Fixed by tracking every declaration per name plus its nesting depth; `--orphans` now only reports names with exactly one declaration, at top level (depth 0) — the subset where "does this have callers" is actually a coherent global question. Ambiguous names are flagged as such in single-function mode, not silently resolved to one of them.
2. **A real bug in the shadow-check itself.** Reaching all the way up to `program` (top-level) scope and finding a same-named declaration there was being treated as "shadowed" — but a match at that level *is* the identifier correctly resolving to its own real global declaration, not a shadow. This silently excluded real calls to *any* top-level function whenever the walk-up found no closer match. Caught via `isPlayoffGame` (known from tonight's `card-badges` CC-CMD to have 2 real callers in `renderAll()`; the tool reported 0 until this fix, prompting a live debug session — traced with temporary instrumentation, root-caused, fixed, instrumentation removed before commit). Fixed by only counting a match inside a *nested* `statement_block` as a genuine shadow.

**`--orphans` result after both fixes: 29 candidates, cross-checked (not just eyeballed) against tonight's own hard-won findings** — 26 of the 29 match exactly: 12 of the real onclick-referenced functions (the disclosed known gap — this tool doesn't parse `onclick="foo()"` HTML-attribute strings), 9 confirmed-dead functions from `string-referenced-verify`, and the original 5 orphans from the first sweep. `_noop`/`cleanup`/`_openGameSheetTablet` are the only unverified-tonight names in the list (`_openGameSheetTablet` is independently already known-dead from the same sweep; `_noop`/`cleanup` are new, unconfirmed candidates, not claimed as verified here).

## Verification
- `node smoke.js index.html`: 954/954, unchanged at every commit (no `index.html` diff).
- `node --check` clean on both new scripts.
- `npm run audit-prompt-tags` / `npm run call-graph -- <name>` both confirmed working through the npm-script wrapper, not just direct `node` invocation.
- `python3 -c "import json; json.load(open('package.json'))"` — valid JSON after both edits.

## Open Carry-Forwards
- **Structural codemod tool** — discussed as the third real TreeSitter application (find-and-rewrite by AST shape), deliberately **not built this session**: it needs a concrete real target to demonstrate against rather than an abstract framework, and the natural candidate (`forEachGame`/`fieldFetch`'s never-finished 32/39-site inline-pattern refactor) was already removed as dead code in tonight's `never-adopted-utilities-disposal` CC-CMD. No CC-CMD filed for this — genuinely deferred pending a real rewrite target, not a forgotten task.
- `call-graph.js`'s own disclosed gap (onclick-attribute string references not parsed) means its `--orphans` output should still be cross-checked with grep before treating any single entry as confirmed dead, same as the original manual sweep required.

## Next Priority
Per `HANDOFF.md`: the two still-open relay-repo items (`archive-game-series-upsert-key`, `cfb-curatedrank-relay`, both explicitly out of this repo's scope) remain the nearest real open work; both are field-relay-nba CC-CMDs, not actionable from this repo.
