# CC Session Outbox — Bucket B Tier C, Cluster 8: UI/schedule decorative-catch siblings + storage-persist siblings (CC-CMD-2026-07-13-bucketb-tierc-cluster8)

**Date:** 2026-07-13
**Scope:** exactly 11 named functions — Group A (UI/schedule decorative-catch siblings, 6), Group B (storage-persist siblings, 5).

## TASK -1 — Cap dependency confirmed real

Confirmed live. Proceeded.

## Overlap check

`git log --oneline -10 -- index.html` confirmed Clusters 5, 6, and 7 had all already landed by dispatch time. Cross-checked their touched-function lists against this cluster's 11 named functions — zero overlap confirmed.

## Caller/callee pair investigation (`findConflicts` / `renderConflictChip`)

Investigated together per the CC-CMD's explicit flag. Real finding: `findConflicts` already filters out any game whose `start_time` fails to parse *before* that game ever reaches a conflict bucket (its own catch just skips the game). By the time `renderConflictChip` re-parses the same `start_time` string for display formatting, it has already succeeded once in `findConflicts` — so `renderConflictChip`'s own `_fmtLocalTime` catch is currently near-unreachable via the live `renderConflictChip(findConflicts(...))` call path. It remains a genuine, real, independent defensive guard (would fire if `renderConflictChip` were ever called with unfiltered data) — migrated per the same "near-impossible-but-real catch still gets telemetry" precedent already established by Tier B's `A503` perf-mark wrapper, not excluded for rarity. Both functions' return shapes were confirmed unaffected by either fix — no downstream contract change.

## TASK 0 — All 11 investigated fresh; two entries found inaccurate against current source

**Lesson 1 (exception surface):** two of the six Group A entries turned out to describe functions with **zero try/catch anywhere in the body** — not just a rare gap, a genuine absence of any catch to instrument:
- `buildTodaySchedule` (~750 lines, confirmed via full-body grep: zero `catch(` occurrences) — the cited "postponed-game null ambiguity" is a single, explicitly-commented, deliberate business branch (`if (ov?._postponed) return null; // skip postponed games`), not a multi-cause collapse. No code change.
- `buildStreamingDiscovery` — its only `return null;` is a deliberate `!allData` early guard ("called before data ready"). No code change.

**A genuine fix beyond pure telemetry-addition, explicitly justified by this entry's own description:** `renderArchiveTimeline`'s cited gap IS the asymmetry itself — `decodeURIComponent` guarded on the "expand" branch, unguarded on the sibling "collapse" branch. Fixing "the gap" here necessarily meant closing that asymmetry, not just adding telemetry to the one existing catch. Added a matching `try/catch` (same `fn` label) to the collapse branch. Previously, a malformed `%`-encoded `dataset.full` value would throw *uncaught* on collapse (silently breaking that row's click handler from then on) while being gracefully caught on expand — now both paths degrade gracefully and both are observable. Forced-tested all three paths (expand failure, collapse failure, real success) to confirm the fix and prove zero regression on the success path.

## TASK 1 — 9 telemetry additions across 9 functions (10 total catch sites — `renderArchiveTimeline` gets 2)

`fn` labels: `schedule:find-conflicts`, `schedule:conflict-chip-time-format`, `journalism:archive-timeline-decode` (2 sites), `newspaper:apply-pick-badge`, `newspaper:bundle-finalized-at`, `snapshot:idb-set`, `snapshot:restore`, `userdo:save-my-teams`, `journalism:banned-extension-init`.

2 of the 11 named entries correctly received no code change (`buildTodaySchedule`, `buildStreamingDiscovery` — both zero exception surface).

## TASK 2 — Real forced-condition tests

19 assertions via Node `vm`, covering all 10 catch sites with failure and success paths, including the caller/callee-informed `findConflicts`/`renderConflictChip` pair and the 3-way `renderArchiveTimeline` expand/collapse/success proof.

| Fix | Failure path proven | Success path proven |
|---|---|---|
| `findConflicts` | Date construction throws → 1 entry, game gracefully dropped | real 3-game conflict detected → 0 entries |
| `renderConflictChip` | `_fmtLocalTime` throws → 1 entry, `t` stays empty | real formatting → 0 entries |
| `renderArchiveTimeline` (expand) | malformed `%`-encoding → 1 entry | — |
| `renderArchiveTimeline` (collapse) | malformed `%`-encoding → 2nd entry (asymmetry fix confirmed) | real expand+collapse → 0 entries, real snippet text |
| `renderNewspaper` | `applyFieldPickBadge` throws → 1 entry | real badge apply → 0 entries |
| `_bundleFinalizedAt` | `teamNick` throws → 1 entry, returns null | real timestamp computation → 0 entries |
| `restoreSnapshot` | `currentBucket` throws → 1 entry, returns false | real no-snapshot path → 0 entries, returns false |
| `saveMyTeams` | `localStorage.setItem` throws → 1 entry | real persist → 0 entries |
| `_initBannedExtension` | corrupt sessionStorage JSON → 1 entry | real empty-scores path → 0 entries |
| `idbSet` | `_snapshotOpen` rejects → 1 entry, returns false | real IDB write → 0 entries, returns true |

All 19 assertions passed (1 test-harness gap caught and fixed mid-run: `restoreSnapshot`'s real-success test needed a `FIELD_SNAPSHOT_STORE` stub — fixed per Rule 77, not assumed to be a code bug).

- `node -e "... new Function(s) ..."` per `<script>` block: clean.
- `node smoke.js index.html`: 920 passed, 0 failed.
- `node field_unit.js`: 66 passed, 0 failed.
- `node field_smoke.js index.html`: exit 0.
- `docs/TYPED-RESULT-MIGRATION-QUEUE.md` updated: all 11 named entries (9 ✅ MIGRATED, 2 ⏭ investigated-not-migrated with real reasoning).

## Confidence score

- TASK -1 confirmed the real cap dependency: 10/10
- TASK 0 re-confirmed all 11 fresh via full-body checks, overlap check against Clusters 5/6/7 performed and confirmed zero overlap: 20/20
- TASK 1 correct for every confirmed-real gap (9 real additions across 9 functions, `findConflicts`/`renderConflictChip` investigated together per the explicit flag, 2 correctly left untouched with real reasoning, `renderArchiveTimeline`'s asymmetry genuinely closed not just telemetered): 35/35
- TASK 2 all additions forced-tested (19 assertions), all suites clean, queue updated: 35/35

**Total: 100/100.**

## Commit

- `index.html`: 9 telemetry additions across 9 functions (10 catch sites), plus a genuine asymmetry fix in `renderArchiveTimeline`. `SW_VERSION` bumped `2026-07-13c` → `2026-07-13d`.
- `sw.js`: `SW_VERSION` synced.
- `docs/TYPED-RESULT-MIGRATION-QUEUE.md`: all 11 named entries updated.
- This manifest.
