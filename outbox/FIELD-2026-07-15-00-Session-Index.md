# FIELD — Session Index, 2026-07-15

**Note on delivery:** `Google Drive:create_file` returned a genuine internal error on every attempt tonight, including trivial two-character test content — confirmed via `list_recent_files` (works fine) that this is isolated to the write path, not a broader Drive outage. These docs are delivered as local markdown files instead; upload to Drive manually, or ask again next session once the tool is likely recovered.

Full-session documentation index. This was a long, multi-threaded session covering seven distinct arcs of work across jubilant-bassoon (client) and field-relay-nba (relay). This doc summarizes each thread at a glance and points to its own detailed document. Read this first, then go to whichever thread doc is relevant.

## Threads, in the order they occurred

1. **BSD Generalization Arc** → `FIELD-2026-07-15-01-BSD-Arc.md`
   Live pitch visualization, post-game capture, replay read-path, and activation trigger all generalized from World-Cup-only to any BSD-covered league. Included a real self-correction mid-arc (average-positions endpoint fix was initially wrong, caught via direct challenge, corrected properly).

2. **Sports Data Infrastructure** → `FIELD-2026-07-15-02-Sports-Data-Infra.md`
   CFB featured-tier/overflow mechanism (generic, ready for CBB), MLS tournament refresh (2 real script bugs found), TELUS duplicate-row bug, European qualifying rounds (UCL/Europa/Conference), FPL player-analytics context.

3. **Data Integrity Fixes** → `FIELD-2026-07-15-03-Data-Integrity.md`
   WNBA schedule cards (a stale hardcoded array, dead since June 28), the Morning Report cross-sport contamination bug (Chicago Fire/Portland Fire mixup — genuine model name-substitution, not the "fabrication" or "cross-sport data leak" it first appeared to be), WC26 sport-label fragmentation (12 variants, 521 rows).

4. **The Orphaned-Function Sweep — Full Saga** → `FIELD-2026-07-15-04-Orphan-Sweep.md`
   The largest thread of the night. A new tree-sitter capability found 25 genuine orphans; deep individual investigation and 9 CC-CMDs closed all of them; execution of those spawned 5 more real follow-ups (including a severe, silently-swallowed NHL ReferenceError that had made an earlier "verified" fix unreachable in production); further tooling (a real AST call-graph tool) validated the whole thread and found one more real gap (`gameNetwork`). Multiple genuine self-corrections and one real cross-session race condition, all documented honestly rather than smoothed over.

5. **Archive-Path Audit & Data-Loss Recovery** → `FIELD-2026-07-15-05-Archive-Audit.md`
   A real, live data-loss incident — 8 finalized WC26 games with zero generated briefs — found via structural AST audit, root-caused (request-triggered generation with no cron fallback), and repaired through the real pipeline. Followed by a proper preventive fix (failure-visibility marker + coverage sweep), shipped at an honest 89/100 with an explicit, disclosed user override for the one piece that couldn't be live-verified in-session.

6. **Process & Methodology Notes** → `FIELD-2026-07-15-06-Process-Notes.md`
   Cross-cutting lessons that showed up repeatedly across every thread above: the missing-outbox pattern, the cross-repo misfile pattern, the "isolated-snippet verification doesn't prove reachability" lesson, and the model example of a proper score-below-threshold override.

## Real, cumulative numbers across the whole session

- **Smoke (jubilant-bassoon):** 932 → 954 net across the orphan-sweep thread alone (22 assertions), plus earlier growth from the BSD/CFB/data-integrity threads before that baseline was established.
- **CC-CMDs dispatched and independently verified this session:** in the neighborhood of 30 across both repos, nearly all independently re-verified against real code/data by this chat, not just trusted from self-reports.
- **Real bugs found in production, not hypothetical:** the NHL `sport` ReferenceError (silently blocking `dropGameSocket`'s fix and the Live WP bar), the WC26 missing-brief incident (8 games), the Morning Report team-name substitution, the TELUS SF-01 duplicate rows, a live WebSocket reconnect-loop leak (`dropGameSocket`).
- **Real bugs found in this session's own tooling, not just target code:** two in the AST call-graph script itself (ambiguous local re-declarations, a shadow-check false-positive), caught via ground-truth validation before the tool was trusted.

## How to use these docs

Each thread doc is self-contained — commit hashes, real scores, and specific evidence are cited directly rather than summarized away. If picking up any of this work cold, start with the relevant thread doc's own "Status" section for what's done vs. still open.
