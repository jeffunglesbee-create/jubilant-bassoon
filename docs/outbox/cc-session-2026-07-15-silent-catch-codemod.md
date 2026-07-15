# Outbox — Silent-catch codemod tool + saveEspnFinal completion (pass 4)

**Date:** 2026-07-15
**Scope:** New AST codemod tool (`scripts/codemod-silent-catches.js`), a real bug found and fixed in it during first real-content use, and the last disclosed carry-forward from the archive silent-catch audit (`saveEspnFinal`'s 7 non-archive catches) fixed with it.

## Why

The 2026-07-15 archive silent-catch audit (`docs/outbox/cc-archive-silent-catch-fix-2026-07-15.md`) fixed 27 sites by hand across 3 passes, applying the identical mechanical edit each time: insert `captureFieldError(label, err, silent);` as the first statement of a silent catch body. Asked what TreeSitter should do next; chose to build a codemod for this exact mechanical step before running a broader audit.

## Design

Split deliberately into two stages, not one "smart" auto-fixer:

1. **`list <pattern>`** — same AST detection as `audit-silent-catches.js` (kept in lockstep so ordinals agree), emits a JSON manifest of every catch site with a `label: ""` placeholder for SILENT sites.
2. **`apply <manifest.json> [--write] [--allow-add-param]`** — performs ONLY the mechanical text insertion. Refuses to guess: skips (with a warning, doesn't silently work around) a `.catch(x => expr)` concise-arrow body, and skips a parameterless catch unless `--allow-add-param` is passed AND the body doesn't already reference a bare `e` (which a fresh `catch(e)` binding would silently shadow). Verifies a `sourceHash` captured at `list` time against the file at `apply` time, aborting on mismatch so a stale manifest can never be applied blind.

Labels are never invented by the tool — CLAUDE.md Rule 1/2 (do not fabricate, do not assume) applies to code semantics same as to data; `subsystem:operation` naming requires reading the surrounding code, which is a human/agent judgment step between `list` and `apply`, not something to automate.

## Real bug found and fixed before any real edit landed (Rule 77 — investigated immediately, not rationalized)

First real `--write` run (see Verification below) corrupted `index.html` catastrophically — a ~14MB diff, part of the script block duplicated/mangled starting mid-file. Root cause: `html.replace(mainScript, newMainScript)` passes `newMainScript` as a **string** replacement argument to `String.prototype.replace()`. JS treats special patterns (`$&`, `$$`, `` $` ``, `$'`) in a *string* replacement specially even when the search argument is a plain string, not a regex. `newMainScript` legitimately contains `\\$&` (regex-escaping code elsewhere in the file, unrelated to this edit), which got reinterpreted as "insert the whole matched substring," corrupting the splice.

Caught before committing (dry-run inspection is not enough — this only manifests when `--write` actually performs the splice; the dry-run path never exercises `String.replace`). Reverted the corrupted `index.html` via `git checkout`, fixed the tool: `html.replace(mainScript, () => newMainScript)` — a function replacement returns its value verbatim, no pattern parsing. Re-ran; correct 7-line diff, verified below.

## Real fix applied with the corrected tool: `saveEspnFinal`'s 7 disclosed carry-forward sites

These were the last 7 silent catches inside `/archive/`-pattern-matched functions, explicitly disclosed as out-of-scope in all 3 prior passes (a different, unrelated concern from archive persistence — statCtx snapshot building, Night Owl enqueue, tonight-finals write). Labels derived from real evidence, not guessed: `saveEspnFinal` itself opens with `fieldOperation({subsystem:'scores', operation:'save-espn-final', ...})`, establishing `scores:` as the real subsystem prefix.

| Site (real line) | Label | `silent` |
|---|---|---|
| statCtx build try/catch | `scores:statctx-build` | true |
| night-owl brief-cache-read IIFE | `scores:night-owl-brief-cache-read` | true |
| night-owl queue-cache-read IIFE | `scores:night-owl-queue-cache-read` | true |
| night-owl jobId cache-write | `scores:night-owl-jobid-cache-write` | true |
| night-owl enqueue fetch `.catch()` (previously a bare `()=>{}`, tool added the `(e)` param via `--allow-add-param` after confirming no bare `e` collision in the body) | `scores:night-owl-enqueue-fetch` | true |
| outer night-owl enqueue try/catch | `scores:night-owl-enqueue` | true |
| tonight-finals per-dateKey write loop | `scores:tonight-finals-write` | true |

All `silent=true` — matches the read-path/health-panel convention already established for background, non-user-initiated operations (none of these are the primary persistence path; `entry`/`FINALS_KEY` write above is unaffected by any of them failing).

## Verification

- `node scripts/codemod-silent-catches.js list "/archive/"` re-run after the fix: 45/45 sites HANDLED, 0 SILENT (previously 38 handled + 7 disclosed-silent).
- Full-file script-block parse: clean.
- `node smoke.js index.html`: **954 passed, 0 failed** — no regression, no new assertion needed (checked: no `smoke.js`/`field_smoke.js` assertion references the specific old catch text touched, e.g. the 4 unrelated `catch(_) {}` hits in `smoke.js` are for entirely different functions — `card.remove()`, `performance.mark`, `fetchBDLRecentForm` — confirmed by reading each, not assumed).
- `node field_smoke.js`: exit 0. `node field_unit.js`: 66/66.
- **7 real forced-condition tests** (Node `vm`, `saveEspnFinal` extracted verbatim from the committed source, `captureFieldError` mocked): statCtx-build (forced via a throwing `teamNick`), both night-owl cache-read IIFEs (forced independently — 2nd test verifies the 2nd `sessionStorage.getItem` call specifically, confirming the two labels are genuinely distinct, not one masking the other), night-owl jobId cache-write (forced via a throwing `sessionStorage.setItem` after a real successful enqueue), night-owl enqueue-fetch (forced via a rejected fetch promise), outer night-owl enqueue try/catch (forced via a **synchronously-throwing** `fetch()` call — not a rejected promise, since the rejected-promise path is a different, already-covered site; needed to be inside the try but outside both inner IIFEs), tonight-finals write (forced via `localStorage.setItem` throwing specifically on the `field_tonight_finals_*` key, confirmed to fire for both the ET and UTC date keys). All 7 passed. One test-authoring dead end found and abandoned before landing on the working approach: `typeof SW_VERSION` on a vm-contextified throwing accessor property does NOT invoke the getter (a real V8/`vm` sandbox quirk — confirmed via a 3-line isolated repro) — switched to the synchronous-throw-fetch approach instead of fighting the sandbox.

## DONE CONDITION

`scripts/codemod-silent-catches.js` exists, is checked in, and is verified against real content (not a synthetic test) via the exact end-to-end path a future pass would use: `list` → human-verified labels → `apply --write` → full verification. Its one real bug (string-replacement `$`-pattern corruption) was found before any bad edit was committed and is now fixed with a regression-proofing code comment in place. `saveEspnFinal`'s 7 disclosed carry-forward sites are fixed; the archive-path silent-catch audit that began 2026-07-15 is now fully closed — 0 SILENT sites remain in the `/archive/`-pattern scope.

## Carry-forwards, explicitly disclosed

- A full-file (unscoped) silent-catch audit was proposed as the alternative next step and not yet run — real population outside the archive/health-panel/scores buckets already touched this session is unknown. Not filed as a new CC-CMD; this is exploratory scoping, not a committed task.
- `SW_VERSION` bumped `2026-07-15e` → `2026-07-15f` for this dispatch's deploy.

## Commit

- `scripts/codemod-silent-catches.js`: new tool, checked in with its own found-and-fixed bug disclosed in a code comment.
- `index.html`: 7 catch sites in `saveEspnFinal` (the last disclosed archive-audit carry-forward) now report via `captureFieldError`.
- `sw.js`: `SW_VERSION` bump, `e` → `f`.
- This manifest.
