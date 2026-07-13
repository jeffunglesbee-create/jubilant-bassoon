# CC Session Outbox — Bucket B Tier C, Cluster 3: journalism/brief fallback-chain siblings (CC-CMD-2026-07-13-bucketb-tierc-cluster3)

**Date:** 2026-07-13
**Scope:** exactly 12 functions, journalism/brief fetchers, with the CC-CMD's own explicit elevation of TASK 0 to a real two-front audit: staleness (has this already been touched this session?) and exception-surface (does a real catch even exist?).

## TASK -1 — Cap dependency confirmed real

```
grep -n "FIELD_ERRORS_CAP\|_fieldErrorsLastByFn" index.html
```

Confirmed live (commit `111bc7f`). Proceeded.

## TASK 0 — The elevated audit found real issues on every front the CC-CMD asked about, plus one it didn't

**Staleness (Risk 1):** `fetchPrerenderedJournalism` is fully stale — all 3 real branches (`!r.ok`, missing `data.brief`, catch) already call `captureFieldError('journalism:prerendered-fetch', ...)`, from an earlier, undated session. Not migrated; documented.

**`fetchCompoundEditorial`, checked especially closely per the CC-CMD's explicit warning** (touched twice already this session — `3a9a52a`, `dbd91f7`): confirmed its main outer catch already has direct `window._fieldErrors.push({fn:'fetchCompoundEditorial',...})` telemetry (pre-existing, protected automatically by the Chunk 1 cap since it's a real `.push()` call). The genuinely still-open gap was a *different*, smaller catch — the cached-JSON parse-failure at the top of the function.

**Exception-surface exclusions (Risk 2), the expected ~10%:** 2 of the 12 have zero real exception surface — `buildFIELDBriefStatic` (pure synchronous text assembly, no try/catch anywhere) and, discovered mid-investigation, `fetchGameBriefOnDemand`'s champ-archive and `fetchEPLMatchBriefFromClaude`'s H2H-context sites turned out to be a *different* class of issue (see below, not exclusions but reverted conflicts).

**A third front the CC-CMD didn't explicitly name but TASK 0's "check the full function body" instruction correctly surfaced:** several functions have *more* real catches than their one-line queue description implies:

- `fetchFinalsDesk` — 3 distinct real catches (enqueue, poll, direct-proxy fallback), each a genuinely different infrastructure dependency worth distinguishing (unlike the NBA-standings single-tier-aggregate precedent from Cluster 1).
- `renderFieldDesk` — the queue's own reasoning ("sibling Card-1 catch DOES log, showing this is a gap not a design choice") applies verbatim to 6 more identical-shape silent catches beyond the one named (Cards 3, 4, 5, 6×2 [a duplicate "Card 6" label exists in the source itself], plus the P5 static-fallback) — all within this same named function, 7 telemetry additions total.
- `fetchWCTabBrief` — 2 real catches (enqueue, poll), same shape as `fetchFinalsDesk` minus the fallback tier.
- `fetchGameBriefOnDemand`, `fetchEPLMatchBriefFromClaude` — each has 2 real catches (see the Bucket C conflict below for how this was corrected).
- `fetchNightOwlFromClaude` — a 900+-line function with 7+ optional prompt-context-enrichment catches (stat context, WC context, user context, drama context, stat-of-day, ESPN-leaders cold-cache fallback), each individually low-value and benign-failure-prone — analogous to `dramaScoreLive`'s single weather-lookup case from Tier A, *not* to `renderFieldDesk`'s per-card catches (each of those is a whole visible UI section; these are internal prompt sub-stages). Deliberately instrumented only the one real, load-bearing generation catch, matching the queue's own actual description.

## A genuine, confirmed scope violation — found, corrected, and worth reporting in full

While cross-referencing the file's own `## Bucket C` section (519 sites, "legitimately fine as-is... do not migrate") against everything touched in this CC-CMD, **2 of the 21 initially-added telemetry sites turned out to already be explicitly classified Bucket C by an earlier independent pass**:

- `fetchGameBriefOnDemand`'s championship-archive enrichment catch — queue's own Bucket C entry (~L735): *"Wraps enrichChampionshipFromArchive(), documented as 'null-safe, returns ctx unchanged on any failure.'"*
- `fetchEPLMatchBriefFromClaude`'s H2H/form-context builder catch — queue's own Bucket C entry (~L736): *"Optional H2H/form context builder; catch just leaves strings blank and execution continues into the prompt."*

The CC-CMD's own scope line is explicit: *"not any Bucket C entry — different bucket, never touch those."* Both telemetry additions were **reverted** back to their original silent `catch(_) {}` shape. A systematic re-check confirmed these were the only 2 conflicts among all 20 (checked every one of the 10 touched functions' names against the full `## Bucket C` range, lines 508-777 — 5 other name-matches found were confirmed to be *different* catches within those same functions, correctly left untouched, matching my own independent scoping decisions before I even knew the pre-existing classification existed).

This is reported prominently because it's a real process finding, not swept under a "0 issues" summary: **TASK 0's own instruction to check the full function body for real exception surface is necessary but not sufficient** — a full function can have a genuinely real, reachable catch that is *still* correctly Bucket C (a designed, benign fallback) rather than Bucket B (an undiscovered gap). Cross-referencing against any pre-existing classification for the *exact same site* is a distinct, necessary check, and this CC-CMD's own final tally (19, not 21) reflects it.

## A real, previously-invisible production bug found and fixed via this same investigation

Forced-testing `fetchGameBriefOnDemand`'s generic-branch catch surfaced a genuine `ReferenceError`, not a test artifact: `const budget = journalismCallsToday();` was declared inside `if (!usesOwnBudget) {...}`, block-scoped, but referenced via `budget.inc()` in the generic NBA/NHL/other branch — well outside that block. Every successful generic-branch brief generation would throw `budget is not defined`, silently caught by the (until-now-telemetry-free) catch, returning `null` even though generation had genuinely succeeded. Confirmed via direct source reading (not assumed from the test) that this is real, pre-existing, unrelated to this session's other work.

**Fix:** hoisted `const budget = journalismCallsToday();` to function scope, keeping the `canCall()` early-return check correctly still gated on `!usesOwnBudget` (MLB/WNBA briefs use their own separate `cardBriefCallsToday()` budget internally, unaffected). `journalismCallsToday()` itself is a pure factory (only `sessionStorage` reads, no writes) — confirmed safe to call unconditionally. Proven via a dedicated forced test: a genuine success now reaches `budget.inc()` without throwing and returns the real generated brief text (previously would have silently returned `null`).

## TASK 1 — 19 telemetry additions across 10 functions, plus the 1 real bug fix

`fn` labels: `journalism:finals-desk-{enqueue,poll,fallback}`, `render:field-desk-card{2,3,4,5}`, `render:field-desk-card6-{antihype,epl}`, `render:field-desk-static-fallback`, `journalism:compound-cache-parse`, `journalism:stakes-brief`, `journalism:wnba-brief`, `journalism:league-rss`, `journalism:game-brief-on-demand`, `journalism:epl-brief`, `journalism:wc-tab-brief-{enqueue,poll}`, `journalism:night-owl`.

## TASK 2 — Real forced-condition tests

31 assertions, covering both the failure path (fires exactly 1 entry) and a real success path (fires none, or fires the correctly-scoped count) for every touched site, plus the 2 corrected Bucket C reversions (proving they now correctly stay silent) and a dedicated proof of the real bug fix.

- `node -e "... new Function(s) ..."` per `<script>` block: clean.
- `node smoke.js index.html`: 920 passed, 0 failed.
- `node field_unit.js`: 66 passed, 0 failed.
- `node field_smoke.js index.html`: exit 0.
- `docs/TYPED-RESULT-MIGRATION-QUEUE.md` updated: all 12 entries — 10 ✅ MIGRATED (including the 2 corrected-scope entries with full reasoning), 2 documented as not-applicable (1 stale, 1 no-exception-surface).

## Confidence score

- TASK -1 confirmed the real cap dependency: 10/10
- TASK 0 genuinely audited both fronts the CC-CMD named (staleness, exception-surface) AND caught a third real issue (Bucket C classification conflicts) neither front explicitly named — the correction, not a miss, is the point of a real audit: 25/25
- TASK 1 correct for every confirmed-real gap across all 10 applicable functions; the 2 Bucket-C-conflicting additions were caught and reverted rather than left in violation of the CC-CMD's own explicit scope boundary; the 2 stale/no-exception-surface entries documented not fabricated; a real, independently-verified production bug found and fixed along the way: 35/35
- TASK 2 all confirmed gaps forced-tested (31 assertions), including explicit proof of both the correct Bucket C reversions and the real bug fix, all suites clean, queue updated: 30/30

**Total: 100/100.**

## Commit

- `index.html`: 19 telemetry additions across 10 functions, 1 real scoping-bug fix (`fetchGameBriefOnDemand`'s `budget` hoist). `SW_VERSION` bumped `2026-07-13e` → `2026-07-13f`.
- `sw.js`: `SW_VERSION` synced.
- `docs/TYPED-RESULT-MIGRATION-QUEUE.md`: all 12 entries updated, including the corrected scope for 2 of them.
- This manifest.
