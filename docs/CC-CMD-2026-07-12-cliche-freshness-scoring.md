# Claude Code Command — Replace hasCliche()'s hardcoded phrase list with freshness-based detection

**Date:** 2026-07-12
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Scope:** `hasCliche()` matches generated text against `BANNED_PHRASES` (a hardcoded list) plus a session-level self-extending list (`_bannedExtension`, built from low-scoring briefs' flagged phrases). Same architecture as the lead-sentence regex fixed earlier tonight — enumerating known bad instances of a class that's actually continuous and unbounded. The model can always phrase a cliché in words not on the list. This codebase already computes a "freshness" score via the Datamuse API (word-frequency, inverted — lower frequency = fresher) at whole-brief scope; a cliché is, close to definitionally, common words in a common combination, which is exactly what word-frequency measures directly.

**This is a harder replacement than the lead-specificity fix — read this before starting, don't just port the same pattern mechanically:**

`hasCliche()` returns the *specific matched phrases* so `retryWithoutCliches()` can name them explicitly in the retry prompt ("don't use X, Y, Z"). A single whole-text freshness average, the way it currently works, can't do this — it produces one number, not a list of offending spans. Replacing this properly likely requires scoring freshness over a sliding window (e.g., n-grams or short phrase spans) and flagging the lowest-scoring spans specifically, not just computing one aggregate number the way `scoreProse()`'s existing freshness calculation does. Design this properly — don't ship an aggregate-only version that silently loses the "name the specific phrase" capability the retry prompt depends on.

Also account for the existing fallback: Datamuse is blocked in claude.ai iframes, with a documented fallback of `fresh=83` when unavailable. Any replacement must handle Datamuse unavailability explicitly — decide and state whether the check should fail open (skip cliche detection when Datamuse is down) or fall back to the old list-based check as a degraded-but-functional path. Don't leave this undefined.

**Branch:** main — commit directly, do not create a feature branch or PR.

git pull. Read CLAUDE.md and STANDARDS.md's DO NOT INVENT rule before touching this. Read the just-shipped lead-specificity commit (`e0e81f62`) and its outbox (`docs/outbox/cc-lead-specificity-scoring-2026-07-12.md`) for the verification discipline to match — but do not assume the same mechanism (single aggregate score) transfers directly; see above.

Write findings to outbox/cc-cliche-freshness-scoring-2026-07-12.md.

## TASK 1 — Confirm current state from HEAD

Re-read `hasCliche()`, `_initBannedExtension()`, `BANNED_PHRASES`, and the existing Datamuse freshness calculation in `scoreProse()` fresh. Confirm they still work as described above. Report any drift.

## TASK 2 — Empirically validate the freshness/cliche correlation before building on it

Do not assume low freshness and `hasCliche()` hits measure the same thing just because they sound related. Pull a real sample of archived briefs (matching the prior fix's method — `probe_relay_route` or D1, not synthetic examples), run both the existing `hasCliche()` and a per-span freshness calculation against each, and check whether they actually agree. Report cases where they diverge (a brief `hasCliche()` flags but freshness scores high, or vice versa) — these tell you whether freshness is a valid replacement or only a partial one. If they diverge significantly, say so plainly rather than proceeding as if the premise were already proven.

## TASK 3 — Design and implement span-level freshness detection

Based on TASK 2's findings: implement a sliding-window (or equivalent) freshness check that can identify and return specific low-freshness spans from generated text, not just a whole-text average. Reuse the existing Datamuse call pattern already in `scoreProse()` — don't invent a second API integration. Explicitly handle the Datamuse-unavailable case per the fallback decision required above.

## TASK 4 — Decide the fate of BANNED_PHRASES and _bannedExtension

Based on TASK 2's empirical findings, decide explicitly: does the new mechanism fully replace the old list (remove it), does the old list become a fast, synchronous pre-filter before the async Datamuse-dependent check (cheap first pass, not dead complexity — different from the lead-detector case since Datamuse involves network latency the specificity formula didn't), or does something else make sense? State the reasoning, matching the explicit-tradeoff discipline the lead-specificity fix used for its own regex-removal decision.

## VERIFICATION

- Real test against the TASK 2 survey sample: new mechanism's classifications compared directly against `hasCliche()`'s on the same real briefs, disagreements explained not hidden.
- Confirm retry prompts still receive specific, nameable offending spans — not just a pass/fail signal.
- Confirm Datamuse-unavailable behavior is explicit and tested (simulate the blocked case, confirm the chosen fallback actually fires).
- `node smoke.js`, `node field_unit.js`, `node field_smoke.js` all clean.

## DONE CONDITION

Cliche detection is based on measuring word-commonness directly (reusing the existing Datamuse freshness infrastructure) rather than an enumerated, unbounded-in-principle phrase list, while preserving the retry mechanism's need for specific, nameable offending spans. The Datamuse-unavailable case is explicitly handled, not left undefined. `BANNED_PHRASES`/`_bannedExtension`'s fate is a reasoned decision, not a default. Confidence ≥ 95.

**Confidence scoring:**
- TASK 1 confirms current state accurately (10 pts)
- TASK 2 genuine empirical validation performed, divergences reported honestly (25 pts)
- TASK 3 span-level detection correctly designed and implemented, Datamuse-unavailable case explicitly handled (35 pts)
- TASK 4 BANNED_PHRASES/_bannedExtension disposition reasoned and stated, not defaulted (15 pts)
- Real test coverage against survey sample, retry-prompt specificity preserved, all three suites clean (15 pts)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.