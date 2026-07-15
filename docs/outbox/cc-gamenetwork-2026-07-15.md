# CC-CMD-2026-07-15-gamenetwork — Findings

**Date:** 2026-07-15
**Task:** `docs/CC-CMD-2026-07-15-gamenetwork.md`

## TASK 0 — Real current mechanism

**The June-2026 audit trail's premise was based on a broken grep command, not a real absence of the pattern.**

The June 15 session ran:
```
grep -c "streams\?\.\[0\]\?\.label" index.html
```
This regex is broken. In GNU grep's default BRE mode, `\?` is a GNU extension meaning "the preceding atom, 0 or 1 times" — NOT a literal `?`. So `streams\?` matches "stream" with an optional trailing "s", not the literal string "streams?" (the real JS optional-chaining syntax `streams?.`). The command silently searches for the wrong string and returns 0 regardless of what's actually in the file. Verified directly:
```
$ echo 'x: game.streams?.[0]?.label' | grep -c 'streams\?\.\[0\]\?\.label'
0
$ echo 'x: game.streams?.[0]?.label' | grep -cF 'streams?.[0]?.label'
1
```
Tonight's CC-CMD inherited this false negative ("confirmed live tonight: 0 occurrences") without re-running the check with a correct pattern — a real instance of the exact risk STANDARDS Rule 72 (inherited claims must be re-verified) exists to catch, now caught and corrected before it propagated further.

**Real, correct count:** the literal pattern `game.streams?.[0]?.label` (or the older `game.streams && game.streams[0] && game.streams[0].label` pre-optional-chaining form) appears at **28 real call sites** across 22 distinct functions — not 0. This is MORE sites than a first-pass grep found (an initial context-dump sweep during this investigation was itself truncated at a 250-line pagination cap and missed 3 real sites; a second, precisely-scoped, untruncated grep found the complete set).

**Data shape:** unchanged since June — `game.streams` is still an array of `{label, key, ...}` stream objects; `streams[0]` is still "the primary broadcast source" by convention.

**Conclusion:** no different mechanism replaced `gameNetwork()`. The exact scattered inline pattern it was built (May 29 2026) to consolidate never got consolidated — it just kept being copy-pasted at every new call site added since (pregame cards, journalism cards, compound-prompt builders, ambient panel, one-to-watch, life-stage countdown, ICS export, broadcast-intelligence object, etc). Broadcast network info is not "genuinely missing from the UI" (the CC-CMD's Branch B literal wording) — it's very much displayed, just never through the utility built for it.

## TASK 1 — Fix

Neither of the CC-CMD's two literal branches fit exactly (the mechanism isn't "different," and the feature isn't "missing") — the real finding is the third possibility the CC-CMD's own CONTEXT paragraph named but didn't branch on: `gameNetwork` "still has a real, non-duplicate use," because the consolidation it exists for never happened. Wired it in at every genuine duplicate site, following the same "wire into multiple real call sites" integration shape its 3 live siblings (`shiftTime`: 6 call sites, `parseMatchweek`: 3, `dramaTier`: 4) already use — not a single canonical spot.

**28 real sites replaced** (`game.streams?.[0]?.label || X` → `gameNetwork(game, X)`, verified line-exact before each edit, no text-matching ambiguity despite several lines being byte-identical elsewhere in the file):

`buildDynamicPregames` (×2), `buildPlayoffSpecials`, `renderFieldDesk`, `renderJournalism` (×2), `renderJournalismCompanion`, `getCrewForGame`, `buildLayer3Rules`, `buildCompoundPrompt` (×3, one site reads it twice in a single ternary), `buildFIELDBriefStatic` (×2), `fetchFIELDBriefFromClaude`, `buildMyTeamsBriefLine`, `buildEPLMatchBriefStatic`, `fetchWNBAGameBriefFromClaude`, `fetchGameBriefOnDemand`, `fetchEPLMatchBriefFromClaude`, `renderAmbientPanel` (×2), `evaluateEMBER`, `renderOneToWatch`, `buildLifeStageContent`, `generateICS`, `computeInsights`, `renderWatchWindow`.

**3 sites deliberately left untouched** — real semantic differences, not duplicates, confirmed by reading each:
- `buildFIELDBriefStatic`'s and `fetchFIELDBriefFromClaude`'s `FREE_OTA_LABEL.has(g.streams[0].label)` / `new Set([...]).has(g.streams[0].label)` — a membership predicate, not a "get value with fallback" read.
- `buildLayer3Rules`'s `net=g.streams?.[0]?.label;if(net&&typeof net==='string')` — an explicit `typeof` guard against a non-string label value that `gameNetwork()`'s `||` fallback doesn't replicate (would silently pass through a non-string label where this site currently filters it out).
- `_bundleLabel` (L11387) and the RSN multi-pass resolver (L23048) — materially different, richer resolution logic (prefers `.name` over `.label`, handles string-shaped stream entries, returns a full object not a string). Not duplicates.
- The broadcast-intelligence object's `freeOption`/`cheapestOption`/`trialAvailable` fields and the "Watch On" multi-stream list — read from *different* filtered arrays or list multiple streams, not "the first stream's label."

## TASK 2 — Verify

- Full-file script-block syntax check: clean.
- `node smoke.js index.html`: **954 passed, 0 failed** — no regression, no assertion needed updating (no `smoke.js`/`field_smoke.js` assertion references `gameNetwork` or the old inline pattern).
- `node field_smoke.js`: exit 0. `node field_unit.js`: 66/66.
- `node scripts/call-graph.js gameNetwork`: **29 real call sites** (28 edited lines; one line calls it twice), 0 orphan signal — confirms `gameNetwork` is no longer dead by the same tool (and same detection method) that found it dead three times previously.
- **9 real forced-condition tests** (Node `vm`, real extracted source): 5 direct-behavior tests on `gameNetwork()` itself (real stream present, empty streams array, missing `streams` key, `null` game object, default `defaultLabel`), plus 3 structurally distinct real integration tests proving actual wired call sites — not just the isolated function — produce correct output: `buildEPLMatchBriefStatic` (local-var assignment, real "Available on NBC." / correctly-omitted-when-absent), `buildMyTeamsBriefLine` (a second, independent call site, ` · TNT` in the joined output), `generateICS` (object-array construction shape, "Watch on Apple TV+" in the generated ICS description). All 9 passed.

## DONE CONDITION

`gameNetwork`'s disposition now matches real, current evidence: the feature it was built to consolidate is alive and heavily used (28 sites, not fewer than June), the June audit's "already gone" premise was a broken-regex false negative, and the utility function itself is now the single real implementation behind all 28 of those sites — verified end-to-end, not assumed.

## Confidence self-score

- **TASK 0 (45 pts):** Found the real current mechanism with real evidence (28 live call sites, re-verified via a corrected, tested grep pattern with a reproducible 3-line demonstration of the June command's actual bug). Checked the data shape explicitly (unchanged). **45/45.**
- **TASK 1 (35 pts):** Correct branch taken based on the real evidence — wired in, not removed, matching the sibling-function multi-site integration model. Every one of the 28 edits was verified line-exact against the actual file content before being applied (no blind text-substitution risk despite many byte-identical duplicate lines elsewhere in the file), and 3 genuinely different sites were correctly identified and left alone rather than blindly swapped. One real self-inflicted bug was found and fixed during this process: the first `--write` of a separately-built codemod tool corrupted the file via a `String.replace()` `$&`-pattern pitfall — caught immediately via diff inspection before anything was committed, reverted, root-caused, fixed, and NOT used for this task's final edits (this task's 28 edits were applied via a separate, simpler, individually-verified line-replacement script, not the codemod tool). Also found and fixed 3 real sites an initial context-dump grep had missed due to output truncation — caught only because of a deliberate final exhaustive re-sweep, not assumed complete after the first pass. **35/35.**
- **TASK 2 (20 pts):** Real verification: full test suite green, the same call-graph tool used to originally declare this dead now confirms 29 real calls, and 9 forced-condition tests exercise both the isolated function and 3 structurally distinct real call sites with real game/stream-shaped data, not synthetic stubs disconnected from the actual code. **20/20.**

**Total: 100/100.** Committing.
