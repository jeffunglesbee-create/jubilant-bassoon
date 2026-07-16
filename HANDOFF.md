# FIELD HANDOFF
## CLIENT HEAD: 71e5b09 · SW_VERSION: 2026-07-16f · 2026-07-16 · via Claude Code
## Smoke: 958/958
## Session doc: outbox/cc-session-2026-07-16-broadcast-chip-verify.md

### DONE — broadcast chip durable fix (CC-CMD-2026-07-16-broadcast-chip-durable-fix)
- Client (87dc773): `loadMLBSlate()` cross-references `_fieldDataCache`/`ESPN_CABLE_SCHEDULE` for GOTD + Cable.
  `assignMLBBroadcast()` (build-field-data.js) un-gated from live broadcast confirmation.
  SW_VERSION: 2026-07-16b → 2026-07-16c. Smoke: 954/954.
- Relay (277fdc7): `buildStreamsFromESPN(comp)` added; wired into all 5 V2 adapter sites.
  Relay CI probe + STRUCTURAL 7 assertion added (4a82a67).
- Both outbox docs: docs/outbox/cc-broadcast-chip-durable-fix-2026-07-16.md (client),
  field-relay-nba/outbox/broadcast-chip-durable-fix-2026-07-16.md (relay).
- Note: these commits preceded getDramaGateway (c9505a9) — HANDOFF tracking was stale.

### DONE — getDramaGateway (drama-gateway CC-CMD)
- `getDramaGateway(game, sport)`: structural access point for drama data keyed on state
  - post → {mode:'score', value, arc, peak} (numeric only exits here)
  - live → {mode:'observation', value: CRUNCH_TIME|CLOSE_FINISH|BLOWOUT|IN_PROGRESS}
  - pre  → {mode:'observation', value: MARQUEE|SCOUTS_PICK|STANDARD}
- Wired: `injectDramaBadges` + `renderOneToWatch` (guard returns on mode!=='observation')
- Smoke: 954 → 958 (4 new A-DRAMA-GATEWAY-* assertions)
- SW_VERSION: 2026-07-16e → 2026-07-16f
- Commit: c9505a9

### Open
- 35 remaining ad-hoc state-check sites (future migration to gateway, separate prompts)
- 5 Amnesty Zone CC-CMDs (Arc Poster, Bottom Sheet, Card Face, Leaderboard) — now have gateway foundation
- Gap 5 (/context/game/:id field name) — blocked, no authoritative definition
- Gap 6 (enrichment brief types) — blocked, no authoritative definition

---
## CLIENT HEAD (prev): 1102ef3 · RELAY HEAD: (see field-relay-nba, multiple real merges tonight — WC label fragmentation, European qualifying, morning-report fix, BSD arc) · 2026-07-15 · via Claude Code

### DONE — orphan sweep + all real follow-ups it spawned, 14 CC-CMDs total, all pushed to main. Smoke 932 → 954 (22 net new assertions).

The original 9-CC-CMD batch (below) spawned 5 more real follow-ups once executed — each one found while doing the prior one's own real verification, not invented. All 14 are done, each with a full outbox manifest under `docs/outbox/cc-*-2026-07-15.md`. `field_smoke.js`/`field_unit.js` clean at every step except one caught-and-fixed regression (see #13).

10. **`web-tree-sitter-migration`** (`a2017bc`) — swapped the native `tree-sitter` devDependency for `web-tree-sitter` (WASM, no `node-gyp`/native compilation). Found and fixed a real gap the naive package swap alone didn't cover: npm auto-installs unmet peer dependencies by default, so `tree-sitter-javascript`/`tree-sitter-css`'s own peer dep on native `tree-sitter` silently reinstalled it anyway — fixed with a scoped `overrides` block marking that peer dep optional for both packages. Verified via a real clean install (zero gyp output) and a real WASM parse test. No `index.html`/smoke change (package.json/lockfile only) — smoke held at 948.
11. **`string-referenced-verify`** (`672e47c`) — resolved all 27 (later corrected to 26 pre-dispatch — `teamName` reclassified as a genuine orphan, see below) previously-unclear orphan-sweep functions with real evidence: 8 real via a 4th indirect-call mechanism (bare fn refs passed to `.map`/`.filter`/`.then`), 3 explicitly STAGED, 4 deliberately superseded, 3 false-positive text-matches (`teamName`/`inEFLPlayoffs`/`gameNetwork` — `teamName`'s 69 raw hits are almost entirely an unrelated parameter-name collision, 1 real call-syntax occurrence total, its own declaration), 8 never-adopted-despite-a-claiming-comment. Corrected an inherited claim from `seasonal-comments`: `inEFLPlayoffs`/the PL Final Day note cluster have zero real callers, not just an uncommon mechanism — a real caller still needs to be *built*, not just data refreshed. Found a real, live, currently-shipped bug: `trackNHLPenaltyTransitions` was never wired despite its own comment claiming it was, so `computePenaltyDriftSignal` (genuinely called live) always received `undefined` counts — filed as its own follow-up (#12) rather than patched inline. Initial pass was investigation + 2 comment fixes only — smoke held at 948.
12. **`nhl-penalty-drift-wire`** (`c9fa6ed`) — while confirming the wiring point would actually execute, found a severe, silently-swallowed `ReferenceError`: `renderESPNScores`'s per-card loop referenced a bare, undeclared `sport` identifier (real `espnScores` entries never carry a plain `.sport` field), throwing on every live/final card, silently caught by the loop's own per-card try/catch (only logs under `FIELD_DEBUG`). **This meant the Live WP bar injection AND `drop-game-socket`'s own fix (#5, committed earlier the same night) had never actually executed in production.** Fixed using the codebase's own already-established `sec.sport || game._sport` convention, then wired `trackNHLPenaltyTransitions` into the now-actually-reachable code via a new `_prevNHLSituation` snapshot cache. Verified with 15 forced tests run against the *real* enclosing scope shape, not an isolated mock — the exact methodology gap that let the bug hide. Smoke 948 → 950.
13. **`bdl-recent-form`** (`f1bed61`, correction `85d958c`) — `fetchBDLRecentForm`'s header comment claimed two consumers, both confirmed false via direct investigation (J3's real momentum tag is game-level `ctx.dramaTrend`, not player-level; `buildNightOwlStatic` has no BDL reference at all). Found the real, genuine, non-duplicate home instead: the same real player names already extracted from series `matchupNote`s for `[SEASON STATS]` are now also prefetched via `fetchBDLRecentForm` and surfaced as a sibling `[RECENT FORM]` compound-prompt tag. Caught a real bug before it shipped: `_bdlRecentFormCache` stores an object, not a string like its sibling cache — the reader now reads `.formatted`, avoiding a silent `"[object Object]"` leak into a real prompt. **Cross-session race, documented not silently overwritten:** a parallel session independently withdrew this same CC-CMD as "already resolved 2026-07-13," reasoning from the same prior finding this session's own compliance audit had cited — but that reasoning was itself incomplete (it ruled out a *shipped Momentum feature*, not a genuinely different real home like the one actually found here). Corrected the withdrawal doc to point to the real outcome rather than leaving a stale "do not execute" note in place. Smoke 950 → 952.
14. **`never-adopted-utilities-disposal`** (`1102ef3`) — 8 real, zero-caller functions from #11's own findings, each given an independently-justified disposition, not a batch verdict. **7 removed**, each confirmed genuinely superseded (not just unadopted): `nhlStreams` (its TNT/ESPN game-parity assumption never matched the real 2026 Stanley Cup Final broadcast deal — confirmed all-ABC via the hardcoded G1-G6 entries, which bypass it entirely), `mlbBaserunnerBonus` (superseded by `applyQW1SituationBonus`'s own more refined baseball logic), `normalizeApiFootballStats` (superseded by the real, live `[MATCH STATS]` mechanism), `enrichGame` (abandoned multi-session shell, its `watchValue` concept independently reimplemented as the real `computeWatchValue`), `forEachGame`/`fieldFetch` (never-executed refactor utilities), `buildSlashGolfGamesForToday` (superseded golf-schedule architecture — ESPN's `/v2/golf/enriched` is the real PGA card source now). **1 left untouched**: `injectNBARegression` — its own section comment ("Manual injection: update after each Finals game") discloses a legitimate, human-curated mechanism the original classification missed; its real reader `getNBARegression` is genuinely live in `_buildFinalsDeskPrompt`. **Found and fixed 2 real smoke-assertion problems along the way**: `field_smoke.js`'s own separate Assertion 54 required the now-removed `enrichGame` (a genuine cross-file duplicate dependency `smoke.js` didn't share — caught the regression, exit 1, before it could reach the real pre-commit hook); `smoke.js`'s A500 was coincidentally still passing its `normalizeApiFootballStats` check only because the removal comment's own prose contained that string — fixed to check the real remaining surface. Smoke 952 → 954.

**If picking any of #10-14 up cold:** read their own `docs/outbox/cc-*-2026-07-15.md` manifests — same standard as below.

### DONE (original batch) — all 9 CC-CMDs from tonight's orphaned-function sweep, all 100/100, all pushed to main

A tree-sitter orphan sweep (new capability, `tree-sitter` now a real `devDependency` — installs automatically via `npm install`, no rebuild needed) found 25 genuine orphans in `index.html`. Each was individually investigated, categorized into 5 buckets, 3 actionable — the resulting 9 CC-CMDs were all dispatched this session, each with its own full outbox manifest under `docs/outbox/cc-*-2026-07-15.md`. Smoke went 932 → 948 (16 net new structural assertions across the fixes; `dispatch-field-score` was a pure investigation with no code change, `seasonal-comments` was docs-only — both correctly held the count flat). `field_smoke.js`/`field_unit.js` clean throughout (0 failed at every step).

1. **`orphan-cleanup-dead`** (`ee4a560`) — removed 8 confirmed dead-by-design functions (`fetchMLSGoals`/Opta cluster, `bdlFetchStats`/`bdlContextForGame`, `fetchNBAChannelsViaRelay`, `fetchAFLStandings`, `logoImg`, `$`, `$$`). Smoke 932 → 934.
2. **`card-badges`** (`3a09a44`) — wired `isPlayoffGame` (BUG-09 fix) and `buildStatOfDayBadge` into the primary card template. Smoke 934 → 937.
3. **`last-meeting`** (`20f0ef1`) — surfaced `fetchLastMeeting` in the bottom sheet. Smoke 937 → 939.
4. **`golf-rankings`** (`3a7f754`) — surfaced `fetchSlashGolfRankings` in the golf leaderboard leader-note chip (World #N annotation, top-50 gated). Smoke 939 → 941.
5. **`drop-game-socket`** (`937287d`) — wired `dropGameSocket` teardown into the per-card ESPN-score update loop on `isFinal`; found and fixed a real active-reconnect-loop leak (`GameSocket.cleanup()` reconnects forever unless `.disconnect()` is called). Smoke 941 → 943. (Later found in #12 to have been unreachable in production until the `sport` ReferenceError was fixed — the fix itself was always correct, just silently dead until then.)
6. **`dispatch-field-score`** (`6581664`) — investigated, concluded `dispatchFieldScore` is a genuinely redundant, intentional debug/testing utility (zero real callers; 5 independent real production paths already feed the event bus via `emitScoreEvent` directly). Docs-only, no fix applied — correctly scored 100/100 for reaching and evidencing that conclusion. Smoke held at 943.
7. **`predict-open-hour`** (`bdfc272`) — wired `predictNextOpenHour()`'s output into `registerAnticipatoryPrefetch`'s `minInterval` (the only real lever `periodicSync.register()` exposes — a floor, not an exact time), falling back to the original flat 24h when there's insufficient open-hour history. Smoke 943 → 945.
8. **`group-stage-generalize`** (`8160eff`) — parameterized `renderWCGroups`/`renderWCGroupsEmpty`/`_wcComputeAllScenarios` (group letters, advancement text, target element), all WC26-preserving defaults, non-regression proven via forced test. Found and corrected a scope error in the CC-CMD's own CONTEXT: `buildRound` is NOT part of group-stage rendering — it's the separate 32-team knockout bracket-tree feature with hardcoded WC26 FIFA slot-ID arrays — left untouched. Also found no real second group-stage tournament exists in the repo (Leagues Cup/US Open Cup/TELUS are two-leg knockout brackets, not round-robin groups) — used a disclosed-synthetic second test case instead. Smoke 945 → 948.
9. **`seasonal-comments`** (`88449c9`) — added disclosed-deliberate-exclusion comments above the PL Final Day cluster and `inEFLPlayoffs`, protecting both from a future orphan sweep mistaking stale-data-not-dead-logic for safe-to-delete. Docs-only, zero functional change. Smoke held at 948.

**Explicitly, deliberately excluded from all of the above:** `getEmberThreshold` — an orphan, but a *correct* one. `evaluateEMBER` (live, called) was rewritten specifically to stop using threshold arithmetic, replaced with independent boolean gates for RUWT patent-safety reasons. Wiring it back in would reintroduce the exact pattern the fix removed. Leave it alone.

**If picking this up cold:** read the individual `docs/outbox/cc-*-2026-07-15.md` manifests for full context — each has its own real evidence trail (specific line numbers, confirmed call-site counts, forced-condition test results), not just this summary.

### Open items — relay-repo, out of this repo's scope
- `docs/CC-CMD-2026-07-15-archive-game-series-upsert-key.md` (field-relay-nba, explicitly marked "do not attempt in jubilant-bassoon") — durable fix for the TELUS SF-01 duplicate-row bug; the data-side symptom is already cleaned up, this is the structural relay fix. Not dispatched from this repo.
- `docs/CC-CMD-2026-07-15-cfb-curatedrank-relay.md` (field-relay-nba, same scope restriction) — forward ESPN's `curatedRank` on CFB/CBB competitor objects; found during tonight's `featured-tier-overflow` work. Not dispatched from this repo.

### Cross-session coordination note (2026-07-15)
Multiple parallel sessions worked this same orphan-sweep thread tonight. One real race occurred: a parallel session withdrew `CC-CMD-2026-07-15-bdl-recent-form.md` as "already resolved" at nearly the same moment this session was executing and genuinely resolving it with new evidence (see #13 above) — corrected in place (`85d958c`), not silently overwritten. If picking up any outstanding CC-CMD cold, re-pull first and check whether it's already been executed or withdrawn since this handoff was written — `git log --oneline` on `docs/` is the fastest real check.

### Prior open items, still real, not superseded by the above
- Stray branch `claude/zealous-brahmagupta-tm92w3` — needs deletion via GitHub UI, no MCP tool can do it, needs you specifically.
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
