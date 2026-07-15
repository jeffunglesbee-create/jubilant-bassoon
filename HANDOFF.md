# FIELD HANDOFF
## CLIENT HEAD: adb2c87 · RELAY HEAD: (see field-relay-nba, multiple real merges tonight — WC label fragmentation, European qualifying, morning-report fix, BSD arc) · 2026-07-15 · via chat

### UPCOMING — 9 CC-CMDs queued from tonight's orphaned-function sweep, none executed yet

A tree-sitter orphan sweep (new capability, `tree-sitter` now a real `devDependency` — installs automatically via `npm install`, no rebuild needed) found 25 genuine orphans in `index.html`. Each was individually investigated this session, not just listed — categorized into 5 buckets, 3 of them actionable:

1. **`docs/CC-CMD-2026-07-15-orphan-cleanup-dead.md`** — remove 8 confirmed dead-by-design functions (superseded vendor integrations: `fetchMLSGoals`/Opta cluster, `bdlFetchStats`/`bdlContextForGame`, `fetchNBAChannelsViaRelay`, `fetchAFLStandings`; never-adopted alternates: `logoImg`, `$`, `$$`).
2. **`docs/CC-CMD-2026-07-15-card-badges.md`** — wire `isPlayoffGame` (real BUG-09 fix, written, never applied where the visible card badge actually checks `_gameImportance`) and `buildStatOfDayBadge` (the one missing piece of an otherwise-live, 15+-call-site stat-selection engine) into the primary card template.
3. **`docs/CC-CMD-2026-07-15-last-meeting.md`** — surface `fetchLastMeeting`, a real, live relay endpoint (`ARCHIVE_RELAY_READY` since June 15) never called from the client.
4. **`docs/CC-CMD-2026-07-15-golf-rankings.md`** — same shape, `fetchSlashGolfRankings`.
5. **`docs/CC-CMD-2026-07-15-drop-game-socket.md`** — investigate-before-fix: WebSocket teardown, possible real resource-leak, or possibly already handled elsewhere under a different name — TASK 0 decides which before anything changes.
6. **`docs/CC-CMD-2026-07-15-dispatch-field-score.md`** — same investigate-before-fix shape, for the event bus.
7. **`docs/CC-CMD-2026-07-15-predict-open-hour.md`** — real user-behavior data has been collecting in `localStorage` at every boot (`recordOpenHour()`), a real prediction algorithm exists to use it, nothing connects them yet.
8. **`docs/CC-CMD-2026-07-15-group-stage-generalize.md`** — the WC26 group-stage renderer's computational core is already generic; three hardcoded assumptions (group count/lettering, advancement text, target element) block reuse for Leagues Cup or any future group-stage tournament.
9. **`docs/CC-CMD-2026-07-15-seasonal-comments.md`** — cheap, docs-only: protect the seasonal cluster (4 PL title-race notes, `inEFLPlayoffs`) from a future honest sweep mistaking stale-data-not-dead-logic for safe-to-delete. This session nearly made exactly that mistake once already.

**Explicitly, deliberately excluded from all of the above:** `getEmberThreshold` — an orphan, but a *correct* one. `evaluateEMBER` (live, called) was rewritten specifically to stop using threshold arithmetic, replaced with independent boolean gates for RUWT patent-safety reasons. Wiring it back in would reintroduce the exact pattern the fix removed. Leave it alone.

**If picking this up cold:** read the individual CC-CMD docs for full context — each has its own real evidence trail (specific line numbers, confirmed call-site counts, live-verified claims), not just this summary. `#5`/`#6` in particular are scoped to conclude "genuinely redundant, no fix needed" as a legitimate, correctly-scored outcome — don't force a wiring fix if the investigation finds one isn't needed.

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
