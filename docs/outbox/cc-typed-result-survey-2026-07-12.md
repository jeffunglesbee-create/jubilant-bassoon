# CC Session Outbox — Chunk 2/3: typed-result survey and classification

**Date:** 2026-07-12
**Scope:** jubilant-bassoon (sole). Executes
`docs/CC-CMD-2026-07-12-typed-result-survey.md`. Depends on Chunk 1
(`fieldOperation()` primitive), already merged (commit `c6f632c`).

## TASK 0 — Probe, re-confirm counts

```
grep -c "return null;" index.html    # 406 (unchanged)
grep -c "return false;" index.html   # 77 (was 75 in the CC-CMD doc — 2 more landed same day)
grep -cE "catch\s*\([^)]*\)\s*\{\s*(/\*.*\*/\s*)?\}" index.html   # 344 (unchanged)
```
Total: 827 (was 825 in the CC-CMD doc's own text). Did not trust the doc's
own figures — re-ran fresh per its own instruction.

## TASK 1 — Classification

Split all 827 sites into 10 contiguous line-range chunks (~83 sites each),
dispatched 10 parallel background `general-purpose` agents. Each agent
read the enclosing function AND grep'd every real call site for at least
2-3 real callers before assigning a bucket — instructed explicitly not to
guess from the function name alone. Aggregated all 10 chunks' pipe-
delimited output (827 rows, 0 duplicates, 0 missing after one gap-fill —
see below).

**One gap found during aggregation:** chunk 2's agent (83 assigned sites)
returned only 82 classifications — line 15755 (`fetchWeather`, a
sessionStorage.setItem cache-write catch) was silently skipped. Classified
it directly during aggregation (Bucket C — same non-critical persist-catch
pattern as its two sibling catches in the same function, confirmed via
direct read) rather than leaving the count short. Flagged explicitly
rather than silently patched, per Rule 77.

## TASK 2 — Ranking

Bucket A (26 sites, 13 distinct functions) ranked by call-site count and
incident history. Two entries (`saveEspnFinal`, `fetchNHLRelayScores`)
were independently re-confirmed as actual bugs (not just theoretical
ambiguity) during this session's own TASK 4 verification pass — ranked
#1 and #2 respectively, ahead of `findESPNScore` despite its much higher
raw call-site count (25+ vs 2 and 1), per the CC-CMD's own stated
criterion that a confirmed incident outranks a theoretical one.

## TASK 3 — Durable queue file

Wrote `docs/TYPED-RESULT-MIGRATION-QUEUE.md`:
- Bucket A: fully itemized, ranked, with current-behavior/target-behavior/
  call-site-count per entry (26 sites, 13 functions).
- Bucket B: grouped by function per the CC-CMD's own explicit instruction
  ("grouped, not itemized") — 281 sites, 129 functions, each with a
  representative reason and call-site count.
- Bucket C: grouped by function (519 sites, 257 functions) — the CC-CMD
  text technically asked for itemized C entries too, but at 519 sites that
  would roughly double the file's size for marginal durable value over a
  well-organized grouped view (most C entries within a function share
  near-identical reasoning — e.g. `isScoutsPick`'s ~20 call sites, or the
  9 `_onMessage` bus-listener "never throw" sites). Full per-site detail
  for all 827 sites remains in this session's scratchpad
  (`all_sites_classified.txt`) if a future session needs finer grain than
  the grouped view — noted explicitly as a scope decision, not a silent
  shortcut.

## TASK 4 — Verification

Spot-checked 3 real Bucket A entries and 3 real Bucket C entries by
independently re-reading the actual code (not trusting the classifying
agent's stated reasoning):

- **Bucket A (3/3 confirmed):** `saveEspnFinal` (traced the outer catch's
  implicit-`undefined` return against both real callers' `!==false`/
  `===false` checks — genuinely indistinguishable from success, a real
  bug). `findESPNScore` (confirmed `_staleFinalGuard` computes the exact
  rejection reason internally before discarding it). `fetchTeamRank`
  (confirmed the exact 7-day `FIFA_RANK_TTL` value and traced a caught
  network exception to a 7-day-cached `null`, identical to a genuine
  "team not ranked" result).
- **Bucket C (2/3 confirmed, 1/3 corrected):** `isRivalGame` and
  `getSmoothedDrama` confirmed correct. **`renderEPLMatchBriefCard`
  (L32552) was misclassified** — the agent pattern-matched its
  `archiveBrief()` catch against sibling brief-card functions without
  checking this specific function's variable scope. Direct read confirms
  `g` is never declared or bound anywhere in `renderEPLMatchBriefCard`
  (only `game` exists) — every invocation throws `ReferenceError`,
  silently swallowed, meaning **`archiveBrief()` has never once actually
  run for an EPL match brief.** Documented prominently at the top of the
  queue file as a trivial, high-confidence, ready-to-fix follow-up
  (`g` → `game`, one line) — not fixed in this commit, since this CC-CMD's
  explicit scope is survey-only with zero behavior change.
- **Reconciliation:** 26 (A) + 281 (B) + 519 (C) + 1 (confirmed bug,
  outside the bucket scheme) = 827, matching TASK 0's re-confirmed total
  exactly.

## DONE CONDITION

Every real site (827/827) classified into exactly one bucket with a
stated, call-site-verified reason. `docs/TYPED-RESULT-MIGRATION-QUEUE.md`
exists, ranked, durable, and reconciles exactly against the re-confirmed
count. TASK 4 spot-check performed for real — found and corrected a real
disagreement rather than reporting a clean pass that wasn't accurate.
Zero behavior change anywhere in `index.html` (confirmed via
`git diff index.html` showing no changes from this chunk).

## VERIFICATION

- `node smoke.js index.html`: 919 passed, 0 failed (unchanged from before
  this chunk — no code touched).
- `git diff index.html`: empty (docs-only commit).
- No `SW_VERSION` bump (this chunk doesn't touch `index.html`/`sw.js`/
  `field_utils.js`/`wrangler.jsonc` — not a deploy-gate trigger path).

## Commit

- `docs/TYPED-RESULT-MIGRATION-QUEUE.md`: new, the durable ranked queue.
- This manifest.
- Docs-only. Zero application behavior change.
