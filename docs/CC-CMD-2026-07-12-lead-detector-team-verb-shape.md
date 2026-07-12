# Claude Code Command — Expand generic-lead detector to cover "[Team] [verb]ed a [result]" shape

**Date:** 2026-07-12
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Scope:** The lead-sentence detector fixed earlier tonight (commit c16cf8fc) only matches leads starting with "The [Team] [verb]...". A live Night Owl recap (CFL, Montreal Alouettes vs Calgary Stampeders) shows a different generic shape the current regex doesn't cover at all: "Montreal Alouettes secured a 37-30 victory over the Calgary Stampeders, turning a one-score game into a 7-point margin..." — confirmed directly via a real regex test that this string does not match `_LEAD_SENTENCE_RE`. The rest of that same recap is generic, unfalsifiable sports-writing filler ("found the end zone with enough frequency," "field-stretching plays that defined the night," "sits at the top of the conversation") — the exact genre the detector exists to catch, just opening differently.

**Branch:** main — commit directly, do not create a feature branch or PR.

git pull. Read CLAUDE.md and STANDARDS.md's DO NOT INVENT rule before touching this.

Write findings to outbox/cc-lead-detector-team-verb-shape-2026-07-12.md.

## TASK 1 — Confirm the gap from current HEAD

Re-read `_LEAD_SENTENCE_RE` and `checkLeadSentence()` fresh. Confirm the exact CFL sentence above still doesn't match. Do not assume the earlier fix's regex is unchanged — verify.

## TASK 2 — Survey real examples before writing a new pattern

Per the discipline the prior fix used (10 realistic leads checked empirically before writing the regex, not guessed): pull a real sample of recent brief/recap text across sport types (via a live `/archive/query` probe or D1, matching the prior fix's own verification method) and identify how many "[Team name] [past-tense verb] a/an [result]..." leads exist, and what verbs actually appear (secured, defeated, edged, dropped, fell to, etc.) — don't guess the verb list from one example.

## TASK 3 — Extend the detector

Add a second pattern (or extend the existing one, whichever is architecturally cleaner — decide and state why) that catches `^[Team name] (secured|defeated|edged|...) a[n]? [result]` shaped leads, using the verb list actually found in TASK 2, not invented. This must not create false positives against genuinely specific, data-grounded leads (the MLB Citi Field example — "Citi Field suppresses scoring by 5%..." — must continue to pass through untouched; it opens with a fact, not a team name plus a generic result verb).

## TASK 4 — Consider whether this is a fundamentally narrower problem than the fix admits

Two sentence-opener patterns caught in one night suggests there may be more shapes than these two. State explicitly in the outbox whether a pattern-matching approach (catching known shapes one at a time) is the right long-term architecture here, or whether this is worth flagging as a larger, out-of-scope discussion (e.g., a cliché/genericness score rather than opener-pattern matching) — don't silently expand scope to redesign this now, but don't pretend the two-patterns-in-one-night pattern isn't worth naming either.

## VERIFICATION

- Real extraction test (same method as the prior fix): the CFL example and any newly-surveyed real examples correctly trigger the retry; the MLB example and other real specific/data-grounded leads continue to pass through untouched.
- `node smoke.js`, `node field_unit.js`, `node field_smoke.js` all clean.

## DONE CONDITION

The CFL-shaped generic lead is caught by the detector, verified against real survey data not a single example, with zero new false positives against genuinely specific leads. TASK 4's architectural question answered honestly, not glossed over. Confidence ≥ 95.

**Confidence scoring:**
- TASK 1 confirms the gap is real and current (10 pts)
- TASK 2 survey genuinely performed against real data, not guessed (25 pts)
- TASK 3 extension correctly implemented, no false positives against specific leads (35 pts)
- TASK 4 architectural question answered honestly (10 pts)
- Real test coverage, all three suites clean (20 pts)

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.