# FIELD HANDOFF
## CLIENT HEAD: 88449c9 · RELAY HEAD: (see field-relay-nba, multiple real merges tonight — WC label fragmentation, European qualifying, morning-report fix, BSD arc) · 2026-07-15 · via Claude Code

### DONE — all 9 CC-CMDs from tonight's orphaned-function sweep dispatched, all 100/100, all pushed to main

A tree-sitter orphan sweep (new capability, `tree-sitter` now a real `devDependency` — installs automatically via `npm install`, no rebuild needed) found 25 genuine orphans in `index.html`. Each was individually investigated, categorized into 5 buckets, 3 actionable — the resulting 9 CC-CMDs were all dispatched this session, each with its own full outbox manifest under `docs/outbox/cc-*-2026-07-15.md`. Smoke went 941 → 948 (7 net new structural assertions across the fixes; one CC-CMD was a pure investigation with no code change, one was docs-only). `field_smoke.js`/`field_unit.js` clean throughout (0 failed at every step).

1. **`orphan-cleanup-dead`** (`ee4a560`) — removed 8 confirmed dead-by-design functions (`fetchMLSGoals`/Opta cluster, `bdlFetchStats`/`bdlContextForGame`, `fetchNBAChannelsViaRelay`, `fetchAFLStandings`, `logoImg`, `$`, `$$`).
2. **`card-badges`** (`3a09a44`) — wired `isPlayoffGame` (BUG-09 fix) and `buildStatOfDayBadge` into the primary card template.
3. **`last-meeting`** (`20f0ef1`) — surfaced `fetchLastMeeting` in the bottom sheet.
4. **`golf-rankings`** (`3a7f754`) — surfaced `fetchSlashGolfRankings` in the golf leaderboard leader-note chip (World #N annotation, top-50 gated).
5. **`drop-game-socket`** (`937287d`) — wired `dropGameSocket` teardown into the per-card ESPN-score update loop on `isFinal`; found and fixed a real active-reconnect-loop leak (`GameSocket.cleanup()` reconnects forever unless `.disconnect()` is called).
6. **`dispatch-field-score`** (`6581664`) — investigated, concluded `dispatchFieldScore` is a genuinely redundant, intentional debug/testing utility (zero real callers; 5 independent real production paths already feed the event bus via `emitScoreEvent` directly). Docs-only, no fix applied — correctly scored 100/100 for reaching and evidencing that conclusion.
7. **`predict-open-hour`** (`bdfc272`) — wired `predictNextOpenHour()`'s output into `registerAnticipatoryPrefetch`'s `minInterval` (the only real lever `periodicSync.register()` exposes — a floor, not an exact time), falling back to the original flat 24h when there's insufficient open-hour history.
8. **`group-stage-generalize`** (`8160eff`) — parameterized `renderWCGroups`/`renderWCGroupsEmpty`/`_wcComputeAllScenarios` (group letters, advancement text, target element), all WC26-preserving defaults, non-regression proven via forced test. Found and corrected a scope error in the CC-CMD's own CONTEXT: `buildRound` is NOT part of group-stage rendering — it's the separate 32-team knockout bracket-tree feature with hardcoded WC26 FIFA slot-ID arrays — left untouched. Also found no real second group-stage tournament exists in the repo (Leagues Cup/US Open Cup/TELUS are two-leg knockout brackets, not round-robin groups) — used a disclosed-synthetic second test case instead.
9. **`seasonal-comments`** (`88449c9`) — added disclosed-deliberate-exclusion comments above the PL Final Day cluster and `inEFLPlayoffs`, protecting both from a future orphan sweep mistaking stale-data-not-dead-logic for safe-to-delete. Docs-only, zero functional change (smoke count unchanged: 948 before and after).

**Explicitly, deliberately excluded from all of the above:** `getEmberThreshold` — an orphan, but a *correct* one. `evaluateEMBER` (live, called) was rewritten specifically to stop using threshold arithmetic, replaced with independent boolean gates for RUWT patent-safety reasons. Wiring it back in would reintroduce the exact pattern the fix removed. Leave it alone.

**If picking this up cold:** read the individual `docs/outbox/cc-*-2026-07-15.md` manifests for full context — each has its own real evidence trail (specific line numbers, confirmed call-site counts, forced-condition test results), not just this summary.

### Prior open items, still real, not superseded by the above
- Stray branch `claude/zealous-brahmagupta-tm92w3` — needs deletion via GitHub UI, no MCP tool can do it, needs you specifically.
- `docs/CC-CMD-2026-07-15-archive-game-series-upsert-key.md` (field-relay-nba) — durable fix for the TELUS SF-01 duplicate-row bug; the data-side symptom is already cleaned up, this is the structural relay fix.
- `ui-hash-unreliability`, `mcp-tool-visibility-gap`, `standards-index`, `standards-index-wiring` — STANDARDS.md documentation, stale 85+ hrs, never touched.
- `gumtree-fetch-proxy` — one-liner sent 47+ hrs ago per the July 13 handoff below, still pending; worth checking whether it's genuinely stuck or just never picked up.

### Session status
Not formally closed. This handoff supersedes the July 13 entry below for anything overlapping; the July 13 content is preserved as-is beneath this update since it documents separate, still-relevant work (the 827-site typed-result migration) that this session didn't touch.

---

## PRIOR ENTRY (2026-07-13, preserved)

# FIELD HANDOFF
## CLIENT HEAD: ec5add9c · RELAY HEAD: (see field-relay-nba, unchanged since P15B/catch-up/backfill fixes) · 2026-07-13 · via chat

### Session summary — the entire 827-site typed-result migration is done
Bucket A (26 sites, 13 functions), Bucket B (287 sites across Tier A + Tier B + 10 Tier C clusters), and Bucket C (all 257 low-frequency entries individually audited, not sampled) are ALL closed as of tonight. Smoke 920/0, field_unit 66/0.

### Bucket A — done, no residue
13 functions migrated to `fieldOperation()`. See Drive doc (Bucket A summary, being written this session).

### Bucket B — done, no residue
Tier A (5 highest-frequency) + Tier B (13 moderate) + 10 Tier C clusters (104 low-frequency). Real, recurring lessons that should survive into any future typed-result work: (1) ~10-56% of any batch turns out to have zero real exception surface on close reading — expected, not a shortfall. (2) Bucket C sibling citations sometimes turn out mis-filed (3 confirmed reclassifications C→B this session) — check before deferring to an existing classification. (3) A queue entry's one-line description may cover only one of several real catches in a function — read the full body. All three lessons are written into `docs/TYPED-RESULT-MIGRATION-QUEUE.md`'s own Bucket C section as standing context for whoever touches it next.

### Bucket C — done, all 257 entries, real methodology not a sample
192 unchanged (byte-identical to baseline), 4 confirmed dead (function removed entirely, queue entries need cleanup — see below), 38 changed (all 38 individually attributed: 5 to Bucket A, 33 to Bucket B commits, zero unexplained), 18 anonymous/non-function entries resolved down to 1 real candidate (checked, confirmed still correct) + 1 non-issue.

**Real, immediately actionable item:** 4 Bucket C entries in `docs/TYPED-RESULT-MIGRATION-QUEUE.md` reference functions that no longer exist (`fetchESPNPlays`, `formatPitcher`, `_plEuroNote`, `fdFetchLive` — all confirmed dead-code removals from earlier tonight). These rows need deletion or an explicit "REMOVED" annotation. Not done yet — small, safe, no code risk.

**New reusable capability built tonight, not yet institutionalized:** a Python script using `tree-sitter-javascript` to index every named function in `index.html` by name (immune to line-number drift across edits) and diff function bodies between any two git revisions. Currently lives only at `/home/claude/ast_bucketc_check.py` and `/home/claude/deep_38_analysis.py` in this session's sandbox — NOT checked into either repo. If a future session wants this capability, it needs to be rebuilt from the Drive doc (being written this session) or re-derived, since sandbox state doesn't persist. Real, tested value: caught 2 real bugs in its own first draft (a type-filter that silently matched nothing, and comparing absolute line numbers across files of different lengths) before trusting its output — both caught by checking against a known example first.

### Open forks — not mine to prioritize, flagged honestly
1. `fieldOperation()`-as-operation pilot: `fetchCompoundEditorial` identified as the natural first candidate to formalize as a real multi-step operation (per the `fieldOperation vs captureFieldError` Drive analysis). Proposed, never actioned.
2. P16 (retroactive drama estimation): confirmed still genuinely unbuilt, correctly ranked lowest priority in the original June 20 health-monitoring table. Not touched.
3. Relay's "other silent catches": noticed while fixing the archive catch-up block that this may be a broader pattern in field-relay-nba's own code, never surveyed beyond the two fixed tonight (P15B's catch-up block, `loadQualityCalibration`'s D1 fallback).
4. `docs/CC-CMD-2026-07-13-gumtree-probe.md` — a CI-as-proxy attempt to get real GumTree AST-diffing working. Not yet executed as of this handoff.

### Documentation this session
Three-plus Drive docs being written to cover Bucket A, Bucket B, Bucket C, and the tree-sitter tool/tooling-evaluation findings (repowise, GumTree) separately — see Drive folder `0ABxH84VndHL7Uk9PVA`, titles prefixed "FIELD —" for this session's date.
