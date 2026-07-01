# CC Outbox — Fix Tempo-Line Last-Name Bug in Scouting Report

**Date:** 2026-07-01
**CC-CMD:** docs/CC-CMD-2026-07-01-scouting-report-tempo-fix.md
**Commit:** 4cd6f36
**Smoke:** 818 → 818 (0 new/removed assertions — extended SCOUT-ARSENAL-1 in place rather than adding a new one; 0 failed, no regressions)

---

## Pre-build probe

Re-read `fmtP` fresh (per the CC-CMD's explicit instruction not to assume
the shape from its own description, since the arsenal fix had just
changed this function). Confirmed at index.html:18421-18442:
- `pLast` was already being computed at line 18433, but AFTER the tempo
  lookup at line 18425 — so tempo still called `getPitchTempo?.(p.name ||
  p.lastName || '')` directly, unfixed.
- `getPitchTempo(pitcherLastName)` at index.html:7622 confirmed keyed
  exactly as described: `PITCHER_TEMPO[pitcherLastName.toLowerCase()]`.

## Task 1 — Fix

Moved the `pLast` computation to the top of `fmtP` (before both lookups)
and pointed both `getPitchTempo?.()` and `getPitchArsenal?.()` at the same
`pLast` value, per the CC-CMD's explicit preference to reuse rather than
re-derive.

**Verified against real data before shipping** (not just code review):
tested three cases using the actual `outbox/mlb/pitch_tempo.json` (337
pitchers) and `outbox/mlb/pitch_arsenals.json` (120 pitchers) —
- Pitcher present in both stores: tempo + arsenal clauses both render
  (`"Nick Martinez · 4.1 ERA · 3-3 · Average tempo · Changeup 35% whiff"`).
- Pitcher present in tempo only (e.g. `suter`, not in arsenal's 120):
  tempo clause renders alone, arsenal clause correctly omitted
  (`"Brent Suter · 3.9 ERA · 2-1 · Fast tempo"`).
- Unknown pitcher: both clauses correctly omitted, base line intact.

## Task 2 — Verification

- `node smoke.js index.html`: 818 passed, 0 failed both before and after
  (no assertion count change — see below).
- Extended `SCOUT-ARSENAL-1` in place (renamed its label/message, kept the
  same assertion) to check `getPitchTempo?.(pLast)` in addition to the
  existing `getPitchArsenal?.(pLast)` check, rather than adding a second,
  near-duplicate assertion — this was the CC-CMD's explicit first
  preference ("can be reasonably extended... do so"), and it was: both
  lookups share the exact same `pLast` variable, so one assertion
  correctly covers both call sites without redundancy.

**Chat-side follow-up (per CC-CMD, not checkable by CC):** confirm live in
a rendered bottom sheet that the tempo clause now actually appears
(previously silently absent for every real probable pitcher since it
shipped).

## Task 3 — Outbox manifest: shared-helper question

This is the second occurrence of the exact same bug class
(full-name-vs-last-name-key mismatch) in this one function within one
session. Assessment on whether a shared `lastNameOf(p)` helper is worth
extracting now:

**Not built here — reasoning:** within `fmtP` itself, this fix already
eliminated the duplication that caused the bug (both lookups now share one
`pLast` computation; a third bug of this exact shape can no longer occur
inside `fmtP`). The broader pattern (`(p.name||p.lastName||'').split('
').pop()`) exists in exactly one other place in the codebase —
`getMLBAnalyticsContext` (index.html ~L7693), which uses a slightly
different source order (`pitcher.lastName||pitcher.fullName` vs `p.name||
p.lastName`) but the same `.split(' ').pop()` extraction. Two independent
call sites with the same pattern is a plausible-but-not-yet-triggered case
for a shared helper — worth building the third time this exact extraction
is needed at a new call site (per the CC-CMD's own scope guidance: "without
necessarily building it now if that would be scope creep"). Not building
it now because: (a) only 2 sites exist, both already correct after this
fix and the arsenal fix, (b) a helper for 2 call sites is a marginal
readability win, not a bug-prevention win — the bug pattern was
"forgetting to extract before calling a last-name-keyed function
entirely," which a shared helper doesn't prevent unless every future call
site is also disciplined about calling it. A future CC-CMD that adds a
THIRD pitcher last-name lookup should extract the helper at that point.

---

## Done Conditions

- [x] `pLast` computed once, reused for both `getPitchTempo` and `getPitchArsenal`
- [x] Verified against real tempo + arsenal data — 3 cases (both-present, tempo-only, unknown) all correct
- [x] `SCOUT-ARSENAL-1` extended to cover both call sites (not duplicated)
- [x] 818/0 smoke, no regressions
- [x] Shared-helper question addressed with reasoning, not built (documented why)
- [x] Outbox written
