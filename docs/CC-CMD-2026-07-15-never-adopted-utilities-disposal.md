# Claude Code Command — Dispose of 8 real, never-adopted utility functions (adopt or remove, per function)

**Date:** 2026-07-15
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }; git pull.

Write findings to docs/outbox/cc-never-adopted-utilities-disposal-2026-07-15.md. Commit with `[skip ci]`.

## CONTEXT — real findings from CC-CMD-2026-07-15-string-referenced-verify

That dispatch investigated 27 genuinely-unclear orphan-sweep functions and found 8 with real, correct, well-built logic that was never actually adopted anywhere — no self-documented "STAGED"/"REMOVED"/"REVERTED" comment explaining why (unlike the 3 Category C/B functions that already disclose their own status), and no prior CC-CMD or `docs/TYPED-RESULT-MIGRATION-QUEUE.md` entry disposing of them (explicitly re-checked before filing this — do not re-litigate `fetchBDLRecentForm`, which WAS already investigated 2026-07-13 and correctly left alone; it is not part of this list). Real evidence per function, from the prior dispatch's own investigation:

1. **`nhlStreams`** (~L6752) — zero callers. Sibling `mlbStreams()` (same "SR block") has 1 real call site in the MLB stream-resolution fallback chain (~L12432); `nhlStreams()` has no equivalent NHL chain calling it.
2. **`injectNBARegression`** (~L20819) — zero callers. Own comment shows an example call signature but nothing invokes it.
3. **`mlbBaserunnerBonus`** (~L22023) — zero callers. Matches `fetchMLBLiveGame`'s real, live output shape exactly. Own comment: "wired into Heat Index in subsequent session" — no "Heat Index" aggregator exists anywhere in the file.
4. **`normalizeApiFootballStats`** (~L39219) — zero callers. The real, live soccer `[MATCH STATS]` feature (P6A/P6B) reads a differently-shaped `localStorage` payload directly, bypassing this normalizer entirely — an independently-built, simpler mechanism shipped instead.
5. **`enrichGame`** (~L23088) — zero callers. Own comment: "shell — Stages 3+4 plugged in by Sessions B+C." Internal Stage 3 (`resolveGameBroadcast`) is real and marked "✅" but has no real caller reaching it through `enrichGame()` itself.
6. **`forEachGame`** (~L10784) — zero callers. Own comment: "Replaces 32 inline (allData?.sports||[]).forEach(...) patterns" — the consolidation refactor never happened.
7. **`fieldFetch`** (~L10772) — zero callers. Own comment: "Replaces 39 inline fetch(url, {signal:...}) patterns" — same situation as `forEachGame`.
8. **`buildSlashGolfGamesForToday`** (~L16713) — zero callers. Already named in CLAUDE.md's own Rule 63 case study ("committed without a caller and sat dead for weeks") but never actually had a disposal CC-CMD filed until now.

## TASK 0 — Probe

For each of the 8: re-confirm zero real callers still holds at current HEAD (line numbers will have drifted), and check whether a real destination now exists that didn't before (e.g., has an NHL stream fallback chain, a Heat Index feature, an EPA/momentum consumer, or a Slash Golf schedule-building call site been added since?). Don't assume the prior dispatch's snapshot is still accurate — re-verify directly, per this codebase's own Rule 72 (CHALLENGE-A).

## TASK 1 — Fix, per function: adopt or remove

For each of the 8, independently decide and act:
- **If a real, live destination now exists** (or clearly should, per the function's own documented intent, e.g. `nhlStreams` into an NHL equivalent of the MLB stream-resolution chain): wire it in with a real, tested caller.
- **If no real destination exists and none is clearly intended** (e.g. `enrichGame`'s abandoned multi-stage shell, `forEachGame`/`fieldFetch`'s never-executed refactor): remove the function. Don't leave dead code sitting on a "maybe later" hope with no evidence anyone intends to finish it — that's exactly the case CLAUDE.md's own Rule 63 warns about.
- **If genuinely ambiguous** (real value, unclear whether removal or wiring is correct, no clean evidence either way): leave it exactly as-is, untouched, and document why with the same rigor `CC-CMD-2026-07-13-queue-deadcode-and-ambiguous`'s TASK 1b applied to `fetchBDLRecentForm` — a real, disclosed "deliberately deferred" decision, not a default.

Each of the 8 gets its own independent disposition — do not batch-apply the same verdict without individually re-checking each one's real evidence.

## TASK 2 — Verify

For every function removed: confirm via grep that zero references remain (declaration + all call sites), smoke/field_smoke/field_unit all still pass. For every function wired: a real forced-condition test proving the new caller reaches it correctly. For every function left deliberately ambiguous: no code change, confirmed via `git diff`.

## DONE CONDITION

All 8 functions have a real, individually-justified disposition (adopted with a real tested caller, removed with zero remaining references, or explicitly left as a documented deliberate-deferral) — none left as an undecided, unactioned orphan after this dispatch.

**Confidence scoring:**
- TASK 0 (20 pts): re-confirms zero-caller status at current HEAD for all 8, checks for any newly-available real destination rather than assuming the prior snapshot still holds
- TASK 1 (50 pts): correct, individually-justified disposition per function — adopt, remove, or documented deliberate-deferral, not a default or a batch verdict
- TASK 2 (30 pts): real verification matching each function's actual disposition (grep-clean removal, forced-test wiring, or diff-clean deferral)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop. Automate follow-ups. No fallbacks, only fixes.
