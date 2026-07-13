# Claude Code Command — Bucket B Tier C, Cluster 3: journalism/brief fallback-chain siblings (12 functions)

**Date:** 2026-07-13
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.
**Scope:** exactly 12 functions, all journalism/brief fetchers where the caller falls back to a static/next-tier option regardless of failure cause. Real call-site counts 1-2 each.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO — this CC-CMD targets jubilant-bassoon"; exit 1; }
git pull. Read CLAUDE.md and confirm the cap dependency below.

Write findings to outbox/cc-bucketb-tierc-cluster3-2026-07-13.md.

## TASK -1 — Confirm the cap dependency

```bash
grep -n "FIELD_ERRORS_CAP\|_fieldErrorsLastByFn" index.html
```

## CONTEXT — two real risks for this specific cluster, both named explicitly rather than discovered piecemeal

**Risk 1 — staleness.** Cluster 2's one stale entry (`fetchFIELDBriefFromClaude`'s described "inline IIFE variant" — already changed by an earlier Bucket A fix, `commit adfc01e`) was journalism-adjacent, and that's not a coincidence. Journalism/briefs is the single most heavily-touched subsystem this session — Bucket A's top entries (`fetchFIELDBriefFromClaude`, `fetchMLBGameBriefFromClaude`, `generateJournalismViaRelay`, `journalismCallsToday`), the `fetchCompoundEditorial` diagnostic-message extension, the Retry-After backoff cap. Every one of these 12 sits in or adjacent to that subsystem. `fetchCompoundEditorial` specifically was already touched twice this session (`3a9a52a` diagnostic extension, `dbd91f7` Retry-After cap) — check it especially closely.

**Risk 2 — exception-surface exclusions, the expected ~10%.** Roughly 10% of every batch investigated so far (Tier B: 3/13, Cluster 1: 1/7, Cluster 2: 1/10) turned out to have zero real exception surface on close reading — the original survey checked whether callers discriminate on cause, never whether an exception path exists at all. A mechanical try/catch grep was tried as a shortcut before this doc was finalized and produced a real false positive on `renderFieldDesk` (flagged as exception-free when its own queue entry documents a real sibling catch) — so no entry below is pre-excluded. Expect a similar exclusion rate in this batch; treat it as the healthy, expected outcome of real investigation, not a shortfall.

**Treat TASK 0 here as a real audit on both fronts, not a formality.**

| Function | Real callers | Gap (per original queue entry — verify against both risks, don't assume) |
|---|---|---|
| `fetchFinalsDesk` (~L34794) | 1 | Sole caller does `if(!text){placeholder.remove();return;}` regardless of which null cause fired |
| `renderFieldDesk` (~L13706) | 1 | Card-2 build failure silently drops that card; sibling Card-1 catch DOES log — gap not design, confirmed real |
| `fetchCompoundEditorial` (~L28152) | 1 | Cached-JSON parse-failure catch falls through to live fetch — **check this one especially closely, touched twice already this session (`3a9a52a`, `dbd91f7`)** |
| `fetchStakesBriefFromClaude` (~L31946) | 1 | Caller's if/else treats budget-exceeded identically to every other null cause |
| `fetchWNBAGameBriefFromClaude` (~L31847) | 1 | Caller only checks `if(text&&textEl)`, budget-exceeded treated same as failure |
| `fetchLeagueRSS` (~L31004) | 1 | Terminal P4 tier; caller leaves note null |
| `fetchGameBriefOnDemand` (~L32289) | 1 | Sole caller only checks `!text` |
| `fetchEPLMatchBriefFromClaude` (~L32421) | 1 | Caller falls back to identical staticText for any falsy result |
| `fetchPrerenderedJournalism` (~L17622) | 1 | Sole caller falls to client-side generation identically for HTTP error, missing brief, or exception |
| `fetchWCTabBrief` (~L33298) | 1 | Caller only checks `if(!brief) return;` |
| `fetchNightOwlFromClaude` (~L40304) | 1 | Real HTTP failure treated same as budget/network by sole caller's truthiness check |
| `buildFIELDBriefStatic` (~L28701) | 1 | Sole caller does `buildFIELDBriefStatic(sections)||'Loading...'` |

## TASK 0 — Probe, elevated on both fronts

For each of the 12: (a) confirm current line number and confirm the described catch/null-return shape still exists as written — explicitly check `git log --oneline` on `index.html` since session start for commits touching that function's line range, re-deriving the real current gap from current code if it was already touched; (b) explicitly check for `try`/`catch` presence across the *full* function body, not a fixed line window (the mechanical pre-screen's specific failure mode) — if zero real exception surface exists, that's a correct exclusion, not a miss.

## TASK 1 — Add captureFieldError() to each confirmed-still-real, confirmed-has-exception-surface gap

Same convention as prior clusters. Zero caller behavior change. Any entry TASK 0 finds stale or exception-free: document in the queue file with the real current state and reasoning, no code change.

## TASK 2 — Verification

- Real forced-condition test for each confirmed-real gap that gets telemetry added.
- Confirm genuine success behavior unchanged across all 12.
- `node smoke.js`, `node field_unit.js`, `node field_smoke.js` all clean.
- Write outbox manifest per Rule 87.

## DONE CONDITION

All 12 entries individually re-verified against current state and checked for real exception surface — not assumed from the queue on either dimension. Real gaps get real telemetry; stale or exception-free entries get documented with reasoning, not fabricated. Zero caller behavior change. Queue file updated for all 12.

**Confidence scoring:**
- TASK -1 confirms the real cap dependency (10 pts)
- TASK 0 genuinely checks each of the 12 against both session commit history AND full-body exception surface, not just line-number re-confirmation (25 pts)
- TASK 1 correct for every confirmed-real gap, stale/exception-free ones documented not fabricated (35 pts)
- TASK 2 all confirmed gaps forced-tested, all suites clean, queue updated (30 pts)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
