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

## CONTEXT — elevated staleness risk, named explicitly, not a routine formality this time

Cluster 2's one stale entry (`fetchFIELDBriefFromClaude`'s described "inline IIFE variant" — already changed by an earlier Bucket A fix, `commit adfc01e`, before the queue's description was written or at least before this cluster reached it) was journalism-adjacent. That's not a coincidence worth ignoring: journalism/briefs is the single most heavily-touched subsystem this session — Bucket A's top entries (`fetchFIELDBriefFromClaude`, `fetchMLBGameBriefFromClaude`, `generateJournalismViaRelay`, `journalismCallsToday`), the `fetchCompoundEditorial` diagnostic-message extension, the Retry-After backoff cap. Every one of these 12 functions sits in or adjacent to that same subsystem. **Treat TASK 0 here as a real audit, not a formality** — for each of the 12, explicitly check whether any commit from this session's own history (`git log --oneline` on `index.html` since session start) already touched it, before assuming the queue's original description still matches.

| Function | Real callers | Gap (per original queue entry — verify, don't assume) |
|---|---|---|
| `fetchFinalsDesk` (~L34794) | 1 | Sole caller does `if(!text){placeholder.remove();return;}` regardless of which null cause fired |
| `renderFieldDesk` (~L13706) | 1 | Card-2 build failure silently drops that card; sibling Card-1 catch DOES log — gap not design |
| `fetchCompoundEditorial` (~L28152) | 1 | Cached-JSON parse-failure catch falls through to live fetch — **check this one especially closely, it was already touched by the diagnostic-message extension (`3a9a52a`) and the Retry-After cap (`dbd91f7`) this session** |
| `fetchStakesBriefFromClaude` (~L31946) | 1 | Caller's if/else treats budget-exceeded identically to every other null cause |
| `fetchWNBAGameBriefFromClaude` (~L31847) | 1 | Caller only checks `if(text&&textEl)`, budget-exceeded treated same as failure |
| `fetchLeagueRSS` (~L31004) | 1 | Terminal P4 tier; caller leaves note null |
| `fetchGameBriefOnDemand` (~L32289) | 1 | Sole caller only checks `!text` |
| `fetchEPLMatchBriefFromClaude` (~L32421) | 1 | Caller falls back to identical staticText for any falsy result |
| `fetchPrerenderedJournalism` (~L17622) | 1 | Sole caller falls to client-side generation identically for HTTP error, missing brief, or exception |
| `fetchWCTabBrief` (~L33298) | 1 | Caller only checks `if(!brief) return;` |
| `fetchNightOwlFromClaude` (~L40304) | 1 | Real HTTP failure treated same as budget/network by sole caller's truthiness check |
| `buildFIELDBriefStatic` (~L28701) | 1 | Sole caller does `buildFIELDBriefStatic(sections)\|\|'Loading...'` |

## TASK 0 — Probe, elevated

For each of the 12: confirm current line number, confirm the described catch/null-return shape still exists as written, AND explicitly check `git log --follow -p -- index.html` (or equivalent) for this session's own commits touching that function's line range. If a function was already modified by earlier work this session, re-derive its current real gap from the current code rather than trust the table above — the table reflects the original survey, not necessarily current state.

## TASK 1 — Add captureFieldError() to each confirmed-still-real gap

Same convention as prior clusters. Zero caller behavior change. Any entry TASK 0 finds stale: document in the queue file with the real current state, no code change, matching the standard already applied twice this session.

## TASK 2 — Verification

- Real forced-condition test for each confirmed-real gap.
- Confirm genuine success behavior unchanged across all 12.
- `node smoke.js`, `node field_unit.js`, `node field_smoke.js` all clean.
- Write outbox manifest per Rule 87.

## DONE CONDITION

All 12 entries individually re-verified against current state (not assumed from the queue), real gaps get real telemetry, stale entries get documented not fabricated. Zero caller behavior change. Queue file updated for all 12.

**Confidence scoring:**
- TASK -1 confirms the real cap dependency (10 pts)
- TASK 0 genuinely checks each of the 12 against this session's own commit history, not just line-number re-confirmation (25 pts)
- TASK 1 correct for every confirmed-real gap, stale ones documented not fabricated (35 pts)
- TASK 2 all confirmed gaps forced-tested, all suites clean, queue updated (30 pts)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
