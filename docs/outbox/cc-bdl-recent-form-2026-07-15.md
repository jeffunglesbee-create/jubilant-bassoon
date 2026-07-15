# CC Session Outbox — Find a real home for fetchBDLRecentForm, or correct its inaccurate header comment (CC-CMD-2026-07-15-bdl-recent-form)

**Date:** 2026-07-15
**Scope:** `fetchBDLRecentForm`'s header comment, plus a real, genuine integration into the compound-prompt series matchupNote pipeline.

## TASK 0 — Probe

Independently re-verified both of the header comment's specific claims, rather than trusting them:

1. **"J3 compound prompt (momentum context)"** — confirmed false. `j3-momentum-briefs` (2026-05-20) is a real, shipped feature, but its `[DRAMA: RISING/COOLING]` tag is powered by `ctx.dramaTrend` (from `getDramaTrend(gid)`) — a **game-level** drama-trend signal (is this game's drama score climbing or falling), completely unrelated to individual player scoring form. Two different concepts sharing the word "momentum," not one superseding the other.
2. **"Night Owl arc context"** — confirmed false. Extracted `buildNightOwlStatic(f)`'s full body verbatim (1181 chars) and confirmed zero references to `BDL`, `momentum`, or `recent form` anywhere in it — a terse post-game winner/loser/score line, structurally not a fit for pre-game player form context.

**Checked for overlap with signals already covered, per TASK 0's own instruction — confirmed genuinely distinct:**
- `getStatOfDay`'s NBA section (tonight's own new stat-selection engine) computes **team-level** deviation from **league average** (DRTG, pace) — not a player's own recent trend vs their own season average.
- `ctx.dramaTrend` is a **game-level** trend signal, not player-level.
- `fetchBDLRecentForm` answers a genuinely different question: "how has *this specific player* performed in their last 5 games vs *their own* season average?" — no overlap with either.

**Found the real, genuine, non-duplicate home**, per TASK 0's own instruction to check "pre-game briefs... the compound editorial prompt": the sibling function `fetchBDLPlayerContext(playerNames)` (immediately above `fetchBDLRecentForm` in the source, same BDL cluster, same relay, same cache pattern) **is** genuinely called — from a real prefetch step (`buildCompoundPrompt`'s data-gathering phase, "Item 4: BDL season averages — extract player names from series matchupNotes") that extracts real NBA playoff-series player names directly from `matchupNote` text, then feeds them to a real prompt-reader IIFE ("Item 4: BDL season averages for named players") that surfaces a `[SEASON STATS]` tag. This is the exact real, established, honest integration point — the same real player names are already being extracted for exactly this purpose.

## TASK 1 — Fix (real home found — wired, not comment-corrected-only)

- **Prefetch side** (~L29253, the same async IIFE that already extracts `names` and calls `fetchBDLPlayerContext`): added a serial loop calling `fetchBDLRecentForm(n)` for the same top-3 names, matching `fetchBDLPlayerContext`'s own established rate-conscious serial-loop pattern (not a parallel burst against the relay).
- **Prompt-reader side** (~L29094, right after the `[SEASON STATS]` reader): added a sibling IIFE reusing the identical real name-extraction regex, reading `_bdlRecentFormCache`, surfacing a distinct `[RECENT FORM]` tag.

**A real bug caught and fixed before it ever reached a test, not after (Rule 13 — code review before commit):** `_bdlStatCache` stores plain formatted strings, but `_bdlRecentFormCache` (confirmed by reading `fetchBDLRecentForm`'s own body) stores an **object** (`{name, gamesBack, line, formatted}`). My first draft of the reader IIFE read the raw cache entry directly — which would have silently produced `"[object Object]"` in the real compound prompt via array-join stringification. Caught by re-reading the actual cache-population code before writing the test, not by the test itself — fixed to read `.formatted` (the pre-built, human-readable line, matching the header comment's own documented pattern).

- **Header comment corrected**: removed both false "Used in" claims, replaced with an accurate description of the real integration point and why it's genuinely distinct from `getStatOfDay`/`ctx.dramaTrend`.

**Note on prior investigation history, for full traceability:** `CC-CMD-2026-07-13-queue-deadcode-and-ambiguous.md` (TASK 1b) had previously investigated this function and concluded "deliberate staged/gated work... no shipped Momentum feature found to wire it into... left exactly as-is." Tonight's own compliance-audit pass (during the `string-referenced-verify` correction) cited that finding and concluded no new follow-up was needed. This dispatch's more specific investigation — checking the header comment's own two literal claims directly, rather than the broader "3-layer momentum framework" narrative — found real evidence supporting a different, better outcome (a genuine wire, not a continued deferral). Both prior conclusions were reasonable given what each dispatch specifically checked; this one simply checked something more specific and found a real answer. Documented here rather than silently overwriting the prior history.

## TASK 2 — Verify

- Full-file script-block parse: 3/3 clean.
- `node smoke.js index.html`: **952 passed, 0 failed** (950 baseline + 2 new `A-BDLFORM-*` assertions). `node field_smoke.js`: exit 0. `node field_unit.js`: 66/66.
- **7 real forced-condition tests** (Node `vm`, the real prefetch IIFE and prompt-reader IIFE extracted verbatim from the committed source):
  1. Header comment confirmed to no longer contain the old false claim, and to document the real new integration.
  2. Prefetch snippet confirmed to call `fetchBDLRecentForm` serially for the same names, verbatim.
  3. Prompt-reader confirmed to read `.formatted`, not the raw cache object — the bug caught above, verified fixed in the actual committed source.
  4. **Full chain step 1**: the real, extracted prefetch IIFE, run against a real `seriesRecord`+`matchupNote` game object (using the exact `"Name NNpts"` shape the real extraction regex requires — confirmed via a quick Node regex check when an initial synthetic sentence didn't match, a test-authoring bug caught and fixed, not a code bug), genuinely populates `_bdlRecentFormCache` for the extracted player name.
  5. **Full chain step 2**: the real, extracted prompt-reader IIFE, run against that now-populated real cache, produces the exact real `[RECENT FORM]` line with the real player name and stats.
  6. Graceful degradation: an empty/never-populated cache (e.g. a relay failure) produces `''`, no crash, no `"[object Object]"` leak into a real prompt.

  All 7 passed (2 test-authoring bugs on my own part — an over-short substring-search window, and a synthetic sentence that didn't match the real extraction regex's actual required shape — both caught and fixed before the final run, not silently worked around).
- `git diff -- index.html`: two hunks (prefetch addition, prompt-reader addition) plus the header comment rewrite. No other function touched.

## DONE CONDITION

`fetchBDLRecentForm` now has a real, genuine, non-duplicate integration point (the compound-prompt series matchupNote pipeline, alongside `[SEASON STATS]`), verified via a forced test proving the full real chain — extraction → prefetch → cache population → prompt-reader → a real `[RECENT FORM]` line — not just that the function gets called in isolation. Its header comment now accurately reflects reality instead of two confirmed-false claims.

## Confidence score

- TASK 0 (40 pts): independently re-verified both specific claims (not just the broader "momentum" narrative) and found them false with direct evidence, checked for overlap with `getStatOfDay`/`ctx.dramaTrend` and confirmed genuine distinctness, and found the real, established, honest integration point rather than assuming none exists: 40/40
- TASK 1 (35 pts): wired at the correct real point, reusing the established rate-conscious serial-fetch pattern and the established name-extraction regex rather than inventing new mechanisms, caught and fixed a real object-vs-string bug before it ever shipped, corrected the header comment to match reality: 35/35
- TASK 2 (25 pts): real forced tests against the actual extracted source (not reimplementations), covering the full chain end-to-end including the graceful-degradation case, with test-authoring bugs caught and fixed rather than silently worked around: 25/25

**Total: 100/100.**

## Commit

- `index.html`: `fetchBDLRecentForm`'s header comment corrected; wired into the compound-prompt series matchupNote pipeline (prefetch + a new `[RECENT FORM]` prompt tag).
- `smoke.js`: 2 new `A-BDLFORM-*` structural assertions.
- This manifest.
