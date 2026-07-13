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
4. **NEW, discovered this session, unresolved:** `docs/CC-CMD-2026-07-13-gumtree-probe.md` landed on main (commit `ec5add9c`) from outside this chat session -- a CI-as-proxy attempt to get real GumTree AST-diffing working via a temporary GitHub Actions workflow, routing around the two blockers (Maven Central access, `.github/workflows` write scope) this session's own chat-only tools couldn't solve. Not yet executed as of this handoff. Worth checking on landing -- if it works, it may supersede or complement the tree-sitter script above.

### Documentation this session
Three-plus Drive docs being written to cover Bucket A, Bucket B, Bucket C, and the tree-sitter tool/tooling-evaluation findings (repowise, GumTree) separately -- see Drive folder `0ABxH84VndHL7Uk9PVA`, titles prefixed "FIELD —" for this session's date.

### Session status
NOT formally closed -- explicitly held open per direct instruction. This handoff is a checkpoint, not a close-out. Do not assume session-end housekeeping (SW_VERSION bump, etc.) has run.
