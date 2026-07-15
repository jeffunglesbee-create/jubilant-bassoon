# FIELD — Orphaned-Function Sweep, Full Saga, 2026-07-15

**Status: 14 CC-CMDs done and independently verified. `gameNetwork` dispatched, not yet executed. `cleanup`/`_noop` genuinely unconfirmed, no CC-CMD written yet.**

This was the largest, most self-correcting thread of the night. Documented in the order it actually unfolded, including the mistakes, because the mistakes are as instructive as the fixes.

## Phase 0 — new capability

`tree-sitter`/`tree-sitter-javascript` added as real devDependencies. A first orphan-sweep tool (built and run in a prior Claude Code session, not this chat) found 25 genuine orphans and 29 "string-referenced" functions (5 named explicitly: `pinGame`, `unpinGame`, `toggleStandings`, `openWcGroup`, `makePick`).

## Phase 1 — categorizing all 25 orphans (this chat, deep individual investigation)

Each of the 25 was individually investigated, not batch-assumed. Five real categories emerged:
- **Dead-by-design (9):** superseded vendor integrations or never-adopted alternates — `fetchMLSGoals`+Opta cluster, `bdlFetchStats`/`bdlContextForGame`, `fetchNBAChannelsViaRelay`, `fetchAFLStandings`, `buildStatOfDayBadge` (later reclassified, see below), `logoImg`, `$`, `$$`.
- **Confirmed needed, unwired (7):** `isPlayoffGame` (real BUG-09 fix never applied to the visible badge), `dropGameSocket`, `dispatchFieldScore`, `fetchLastMeeting`, `fetchSlashGolfRankings`, `predictNextOpenHour`, `buildStatOfDayBadge` (moved here after a deep-dive found it's the one missing piece of an otherwise-live 15-call-site stat-selection engine, not a design that lost).
- **Seasonal/tournament-scoped (7):** 4 EPL Final Day notes (real logic, stale 2025-26 data, reactivates next season — a genuine correction after this chat initially mis-categorized them as permanently expired), `renderWCGroupsEmpty`/`buildRound` (generalizable per user insight, not WC26-only forever), `inEFLPlayoffs`.
- **Orphaned dev tooling, valid purpose (2):** `validateBundles`, `reportFieldRenderPipeline`.
- **Deliberately, correctly superseded — do not touch (1):** `getEmberThreshold`. `evaluateEMBER` (live, called) was rewritten specifically to stop using threshold arithmetic, replaced with independent boolean gates for RUWT patent-safety reasons. Wiring it back would reintroduce the exact pattern the fix removed.

## Phase 2 — the original 9 CC-CMDs (all 100/100 except one)

1. **`orphan-cleanup-dead`** — 8 removed (excluded `getEmberThreshold` explicitly). 932→934.
2. **`card-badges`** — `isPlayoffGame` + `buildStatOfDayBadge` wired into the primary card template, with Scout's Pick suppression to avoid crowding. 934→937.
3. **`last-meeting`** — `fetchLastMeeting` surfaced in the bottom sheet. 937→939.
4. **`golf-rankings`** — `fetchSlashGolfRankings` surfaced as a leader-note chip. 939→941.
5. **`drop-game-socket`** — real active-reconnect-loop leak found and fixed (`GameSocket.cleanup()` reconnects forever unless `.disconnect()` is called). 941→943. *(Later found unreachable in production until Phase 3's ReferenceError fix — the fix itself was always correct, just silently dead.)*
6. **`dispatch-field-score`** — investigated, correctly concluded genuinely redundant (5 independent real production paths already feed the event bus directly). Docs-only, no fix. 943 held.
7. **`predict-open-hour`** — real, continuously-collected user open-hour data wired into `registerAnticipatoryPrefetch`'s `minInterval`. 943→945.
8. **`group-stage-generalize`** — WC26 group-stage renderer parameterized (group letters, advancement text, target element), WC26-preserving defaults. Corrected its own CC-CMD's scope error mid-execution: `buildRound` is a separate 32-team bracket feature, not part of group-stage rendering. 945→948.
9. **`seasonal-comments`** — protective comments added above the seasonal cluster. Docs-only. 948 held.

## Phase 3 — five real follow-ups, spawned by executing Phase 2

10. **`web-tree-sitter-migration`** — swapped native `tree-sitter` (needs `node-gyp`/`nodejs.org`, blocked in this chat's own sandbox) for `web-tree-sitter` (WASM, no compilation). Found and fixed a real gap: npm auto-installs unmet peer deps, so `tree-sitter-javascript`'s own peer dep on native `tree-sitter` silently reinstalled it — fixed via a scoped `overrides` block. Verified via a real clean install, zero gyp output.

11. **`string-referenced-verify`** — resolved all 27 (later corrected to 26 — `teamName` reclassified) unclear functions with real evidence. Found a 4th real indirect-call mechanism (bare fn refs passed to `.map`/`.filter`/`.then`) neither the original sweep nor this chat's own re-derivation had checked for. Found a real, live, currently-shipped bug: `trackNHLPenaltyTransitions` was never wired despite its own comment claiming it was, so `computePenaltyDriftSignal` (genuinely called) always received `undefined` — filed as #12.

12. **`nhl-penalty-drift-wire`** — while confirming the wiring point would actually execute, found a severe, silently-swallowed `ReferenceError`: a bare, undeclared `sport` identifier threw on every live/final card, caught by the per-card try/catch (only logs under `FIELD_DEBUG`). **This meant #5's own fix (`dropGameSocket`) had never actually executed in production.** Fixed, then wired the penalty tracking through the now-reachable path. 15 forced tests run against the real enclosing scope, not an isolated mock — the exact methodology gap that let the bug hide. 948→950.

13. **`bdl-recent-form`** — found the real, non-duplicate home neither this chat nor a real July 13 prior decision had found: the same player names already extracted for `[SEASON STATS]` now also feed a sibling `[RECENT FORM]` tag. Caught a real bug before shipping (cache stores an object, not a string like its sibling — would have leaked `"[object Object]"` into a real prompt). **Cross-session race:** this chat independently (and wrongly) withdrew the same CC-CMD as "already resolved 2026-07-13" at nearly the same moment it was being genuinely re-resolved with new evidence — corrected in place, not silently overwritten. 950→952.

14. **`never-adopted-utilities-disposal`** — 8 functions from #11's findings, each independently disposed. 7 removed (each with its own real reason, not a batch verdict — e.g. `nhlStreams`'s TNT/ESPN game-parity assumption never matched the real 2026 all-ABC Stanley Cup Final broadcast deal). 1 left untouched (`injectNBARegression` — a real, disclosed manual mechanism the original classification missed). Found and fixed 2 real smoke-assertion bugs, one genuinely subtle: `A500` was coincidentally still passing only because the *removal comment's own prose* contained the string being checked for. 952→954.

## Phase 4 — tooling validation and one more real gap

A real AST call-graph tool (`scripts/call-graph.js`) was built and validated against 6 known ground-truth cases before being trusted. Found and fixed two real bugs in itself: ambiguous local re-declarations (names like `cleanup` appearing in 8+ unrelated functions) causing false orphan reports, and a shadow-check bug that had `isPlayoffGame` (known to have 2 real callers) initially reporting zero.

`--orphans` after both fixes: 29 candidates, 26 matched exactly against everything already found. `gameNetwork` — confirmed a genuine orphan three separate times now (original sweep, `string-referenced-verify` Category D, this tool) but never given its own disposal CC-CMD, having fallen between two follow-ups. Chat search found real prior context: a June 15 2026 session was already auditing this exact function (checking whether an inline pattern `gameNetwork` was meant to replace, `streams?.[0]?.label`, still existed). That inline pattern is also completely gone today — not simple neglect, possibly superseded by a different mechanism entirely, same shape as `normalizeApiFootballStats`. CC-CMD written and dispatched with this framing; **not yet executed as of this doc.**

`_noop`/`cleanup` (a different, unrelated top-level `cleanup`, confirmed distinct from `GameSocket.cleanup()` via the call-graph tool's own report) remain genuinely unconfirmed — no CC-CMD written yet.

## Real, independently-verified smoke progression

932 → 934 → 937 → 939 → 941 → 943 → 943 → 945 → 948 → 948 (Phase 2, 9 CC-CMDs) → 948 → 948 → 950 → 952 → 954 (Phase 3, 5 follow-ups). 22 net new assertions across 14 CC-CMDs. This exact progression was independently re-verified by this chat at every step, not just trusted from self-reports — and a real bookkeeping error in HANDOFF.md's own summary (using a mid-sequence checkpoint as the start for both halves) was caught and corrected.
