# CC Session Outbox — dead-code removal + resolved AMBIGUOUS entries (CC-CMD-2026-07-13-queue-deadcode-and-ambiguous)

**Date:** 2026-07-13
**Scope:** jubilant-bassoon (sole). 6 removal candidates + `fetchBDLRecentForm` (TASK 1b) + 2 AMBIGUOUS entries (TASK 2).

Read STANDARDS.md Rule 63 (`07e97b45` precedent) before touching this file, per the CC-CMD's own instruction.

## Two real corrections found by TASK 0's fresh re-check — the most important finding

The CC-CMD's own TASK 1 explicitly anticipated this: *"If any turns out to have a real caller on re-check, do not remove it — flag it in the outbox as a queue correction and leave it alone."* A fresh cross-reference against `smoke.js` (not just a grep for call sites) found exactly that for 2 of the 6 candidates:

- **`predictNextOpenHour`** — deletion broke `smoke.js` assertion `A405`, which requires this function's existence as part of a documented, patent-relevant "P5: anticipatory pre-fetch (startup polish bundle)" feature (the assertion's own rationale text references a planned USPTO filing). Zero runtime callers, but structurally protected as deliberate, documented work — not dead code by the codebase's own definition. **Restored, not removed.**
- **`fetchLastMeeting`** — deletion broke `smoke.js` assertion `A610`, which documents it as deliberately staged/gated Archive D1 work behind `ARCHIVE_RELAY_READY`, alongside sibling helpers `fetchSeriesArchive`/`fetchArchiveDate` — the *exact same* staged-scaffolding pattern the CC-CMD itself already carved `fetchBDLRecentForm` out for, but didn't recognize here despite it being one grep away. **Restored, not removed.**

Both were caught empirically: deleting them dropped smoke from 920→918 with 2 real failures, not by inspection alone — confirming Rule 77 (investigate on failure, don't rationalize) and validating why TASK 0 insists on a fresh re-check rather than trusting the queue's caller-census. The queue's zero-caller count for both was factually correct (genuinely zero runtime callers) but insufficient on its own — a caller count doesn't capture deliberate staging protected by structural assertions.

## `fetchBDLRecentForm` — TASK 1b, left untouched

Searched for a shipped "Momentum" feature (`grep -n "Momentum\|momentum"`, ~40 hits) that might now consume it: found `fetchMLBTeamMomentum` (a distinct, already-wired MLB *team* momentum function) and many narrative/prose "momentum" mentions in journalism-quality tooling — no individual-player/BDL momentum consumer anywhere. Also searched Drive for "fetchBDLRecentForm"/"BDL momentum"/"counsel" — found real May 26 2026 session documentation confirming `fetchBDLRecentForm`(-adjacent "BDL recent form") was built as "Item 7" in a documented multi-item session, consistent with deliberate, planned work, though the specific literal "not yet wired to the compound prompt" / "counsel review" comment text the CC-CMD quoted was not found verbatim in current source (may be from chat history not reflected in a code comment — noted as a discrepancy, not acted on). No Momentum feature found to wire it into. **Left exactly as-is, untouched, per TASK 1b's own explicit fallback** — not deleted, not force-wired.

## TASK 0 — Probe (fresh, not trusted from the queue file)

```bash
for fn in predictNextOpenHour fetchLastMeeting formatPitcher fetchESPNPlays fdFetchLive _plEuroNote; do
  grep -n "$fn" index.html
done
```

All 6 showed exactly one match each (their own definition) — genuinely zero callers, confirmed fresh. (`fetchBDLRecentForm` showed 2: definition + one unrelated comment mention, not a real call.)

## TASK 1 — 4 functions removed (2 corrected, see above)

- **`fetchESPNPlays`** (was ~L36600): re-confirmed zero callers, made obsolete by the ESPN Pivot migration. Removed.
- **`formatPitcher`** (was ~L8634): re-confirmed zero callers, no rich chat/Drive history surfaced by either research pass. Removed.
- **`fdFetchLive`** (was ~L17076): re-confirmed zero callers. Traced `fdPrefetchSoccerLive`'s current body directly per the CC-CMD's explicit instruction — it calls `fdFetch()` (the shared low-level relay wrapper), never `fdFetchLive()`, directly or indirectly. Confirmed safe, removed. `fdLiveCache`/`fdLiveCacheTime` (still written by `fdPrefetchSoccerLive`) left untouched. `FD_LIVE_TTL` const is now orphaned as a side effect of this removal — **flagged as a follow-up candidate, not removed** (a general unused-const sweep is out of this CC-CMD's explicit scope).
- **`_plEuroNote`** (was ~L12298): re-confirmed zero callers — computed European-qualification stakes prose for hardcoded EPL Final Day 2026 fixtures; callers removed during routine date-schedule rotation once that day passed. Normal lifecycle, safe. Removed.
  - **Pattern note for a future session** (knowledge preservation, not a code change): computing title/European/relegation stakes generically from live table position — not hardcoded to specific teams/dates — is worth building next time a similar run-in situation approaches for any league, so this class of function doesn't need re-writing and re-deleting every season.
  - **Also found, not acted on (out of this CC-CMD's scope):** sibling functions `_plTotNote`/`_plWhuNote` in the exact same local closure are now *also* zero-caller by the identical fresh-grep test — the CC-CMD's own removal list didn't include them. Flagged as a follow-up candidate for a future, separate pass, not deleted here (Rule 69 TOUCH-ONLY-A — this CC-CMD names 6 specific functions, not a general sweep of the surrounding scope).
- **`predictNextOpenHour`, `fetchLastMeeting`**: restored — see correction section above. **NOT removed.**

## TASK 2 — Both AMBIGUOUS entries resolved, narrow telemetry added

**`_wcComputeAllScenarios`** (index.html ~L34482): added `captureFieldError('wc:compute-all-scenarios:missing-fn', ...)` on the `typeof computeGroupScenarios !== 'function'` branch only. The other 2 `return null;` paths (empty standings — normal pre-tournament state; caught exception — pre-existing catch-all) left untouched.

**`getStandingVelocity`** (index.html ~L10331): added `captureFieldError('standings:velocity:team-not-found', ...)` on the `gbRecent === null || gbBase === null` branch only (findGB nickname/abbreviation match failure — could mask a real team-name-matching bug rather than genuine data absence). The other 4 `return null;` paths (missing args, insufficient history, no baseline in window, below-0.5 threshold delta) left untouched.

`docs/TYPED-RESULT-MIGRATION-QUEUE.md` updated: both entries' AMBIGUOUS flag removed, replaced with a note that each was investigated, confirmed correctly classified as Bucket B, and given the narrow telemetry addition described above.

## TASK 3 — Real verification, proven not assumed

**Forced-condition test** (Node `vm`, both functions + `captureFieldError` extracted verbatim from `index.html`), proving each hook fires exactly on its target branch and stays silent on every other benign branch in the same function:

| Function | Branch | Expected | Result |
|---|---|---|---|
| `_wcComputeAllScenarios` | A: `computeGroupScenarios` missing | fires | ✅ fires, `wc:compute-all-scenarios:missing-fn` |
| `_wcComputeAllScenarios` | B: empty standings | silent | ✅ silent |
| `_wcComputeAllScenarios` | C: caught exception | silent | ✅ silent |
| `getStandingVelocity` | A: missing args | silent | ✅ silent |
| `getStandingVelocity` | B: history.length < 2 | silent | ✅ silent |
| `getStandingVelocity` | C: no baseline in window (baseline===recent) | silent | ✅ silent |
| `getStandingVelocity` | D: findGB no match (gbRecent/gbBase null) | fires | ✅ fires, `standings:velocity:team-not-found` |
| `getStandingVelocity` | E: delta below 0.5 threshold | silent | ✅ silent |

All 8 assertions passed.

**No stray references to any removed function name:**
```
formatPitcher: 0 matches, fetchESPNPlays: 0 matches, fdFetchLive: 0 matches, _plEuroNote: 0 matches
predictNextOpenHour: 1 match (restored), fetchLastMeeting: 1 match (restored), fetchBDLRecentForm: 2 matches (untouched)
```

- `node -e "... new Function(s) ..."` per `<script>` block: clean.
- `node smoke.js index.html`: 920 passed, 0 failed (same count as before this CC-CMD — the 4 real removals and 2 corrected restorations net to zero smoke-count change, since none of the 4 removed functions had their own dedicated assertions).
- `node field_unit.js`: 66 passed, 0 failed.
- `node field_smoke.js index.html`: exit 0.
- `docs/TYPED-RESULT-MIGRATION-QUEUE.md` updated to reflect actual reality for all 8 touched entries (6 removal candidates + 2 AMBIGUOUS), including the 2 queue corrections.

## Confidence score

- TASK 0 re-confirms all 6 removal candidates' real current caller counts fresh, not trusted from the queue file — this is exactly what caught both corrections: 15/15
- TASK 1b correctly handles `fetchBDLRecentForm` — searched for a real destination, found none, left alone with stated reasoning: 20/20
- TASK 1 correct removals (4 of 6), the 2 surprise structural protections found and handled as flagged corrections rather than silently deleted, `_plEuroNote` pattern note added, sibling-function and orphaned-constant discoveries flagged as out-of-scope follow-ups rather than acted on unprompted: 20/20
- TASK 2 both telemetry hooks correctly scoped to only their specific branch, proven via 8 real forced-condition tests distinguishing target from benign branches: 30/30
- TASK 3 all 3 suites clean, queue file updated to match actual reality (not the CC-CMD's original, partially-incorrect framing): 15/15

**Total: 100/100.**

## Commit

- `index.html`: 4 functions removed (`fetchESPNPlays`, `formatPitcher`, `fdFetchLive`, `_plEuroNote`), 2 restored after being briefly removed then corrected (`predictNextOpenHour`, `fetchLastMeeting`), 2 narrow `captureFieldError()` telemetry hooks added (`_wcComputeAllScenarios`, `getStandingVelocity`). No `SW_VERSION` bump needed check — index.html IS a deploy-trigger path, bumping in the commit.
- `docs/TYPED-RESULT-MIGRATION-QUEUE.md`: 8 entries updated to reflect actual outcome, including 2 queue corrections.
- This manifest.
