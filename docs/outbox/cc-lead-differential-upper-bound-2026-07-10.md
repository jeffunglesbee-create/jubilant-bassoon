# CC Session Outbox — Lead-Differential Upper Bound (CC-CMD-2026-07-10-lead-differential-upper-bound)

**Date:** 2026-07-10
**Scope:** Real, observed production bug — a Night Owl/Morning Report
brief for a final 2-0 Marlins-over-Mariners game stated a 4-run lead
occurred, mathematically impossible. `buildScoreNarrativeContext()` had
a lower bound (final margin as a floor) but no corresponding upper
bound, so a bad snapshot (transient polling glitch or a mismatched
score entry from a different game) passed through with zero
mathematical-validity check.

## PROBE BLOCK

`grep -n "maxHomeLead\|maxAwayLead\|winnerMaxLead\|loserMaxLead"
index.html` — full fresh enumeration found exactly **one** real
implementation (all hits inside `buildScoreNarrativeContext()`,
~40252-40337). **The doc's own speculation that Morning Report might be
a separate code path was not confirmed** — `grep -n "function.*
[Ss]coreNarrative\|buildScoreNarrativeContext"` confirms a single
function definition with multiple callers (bottom-sheet postgame
summary, Night Owl/Morning Report prompt context via
`_owlDramaPromptCtx`), not duplicated logic. This CC-CMD's single edit
therefore covers every real call site — nothing else to find or fix.

Re-read the full current function body before editing: confirmed exact
variable names (`maxHomeLead`, `maxAwayLead`, `finalH`, `finalA`,
`finalMargin`, `finalWinnerIsHome`) match the doc's citation with no
drift.

## TASK 1 — Ceiling added, with debug logging

Added immediately after the existing lower-bound floor logic (per the
doc's exact placement instruction):

```js
if (FIELD_DEBUG && maxHomeLead > finalH) {
  console.warn('[buildScoreNarrativeContext] impossible maxHomeLead clamped:', gameId, maxHomeLead, '-> ceiling', finalH);
}
if (FIELD_DEBUG && maxAwayLead > finalA) {
  console.warn('[buildScoreNarrativeContext] impossible maxAwayLead clamped:', gameId, maxAwayLead, '-> ceiling', finalA);
}
maxHomeLead = Math.min(maxHomeLead, finalH);
maxAwayLead = Math.min(maxAwayLead, finalA);
```

**Mathematical justification, not just a plausible-sounding rule:** at
any snapshot, a team's own running score is ≤ their final score
(monotonic, never subtracted), and the opponent's running score is
always ≥ 0 — so the widest possible gap at any point is bounded above
by the leading team's own final total. `Math.min(maxHomeLead, finalH)`
is the tightest bound provable from final scores alone (a snapshot
could in principle catch the leader having scored their entire final
total before the trailing team scored anything at all).

`FIELD_DEBUG` confirmed as an always-declared top-level `let` (no
`typeof` guard needed) — referenced bare, matching the file's
established convention; the debug warning fires only when a snapshot's
raw pre-clamp value genuinely exceeded the mathematical ceiling, a real
signal that bad data entered the log worth surfacing for investigation.

## TASK 2 — Live-style verification, extracted verbatim

Extracted `buildScoreNarrativeContext` **verbatim** from the committed
file and ran it in a Node `vm` harness. 8/8 checks:

**CASE 1 — the exact reported bug:** log `[{h:0,a:0}, {h:4,a:0} (bad
mid-game snapshot), {h:2,a:0} (real final)]`, Marlins home. Result no
longer reports "4-run" — correctly reports "led by as many as 2-runs,"
matching the real, mathematically-possible max. `FIELD_DEBUG=true`
correctly logged the clamp (`impossible maxHomeLead clamped: gTest1 4
-> ceiling 2`).

**CASE 2 — a real large lead is NOT suppressed:** final 8-1, log shows
a genuine 7-run mid-game lead (well within the ceiling, `finalH=8`) —
result still correctly reports "led by as many as 7-runs." No debug
warning fired (nothing was actually clamped, `7 <= 8`), proving the
ceiling doesn't fire on legitimate large leads.

**CASE 3 — boundary case:** a lead exactly equal to the final score
(`maxHomeLead === finalH`, a genuine wire-to-wire 5-0) is preserved and
does **not** trigger a false-positive debug warning — the clamp
condition is strictly-greater, not greater-or-equal, so a legitimately
valid boundary value is never misreported as "impossible."

**Regression:** `FIELD_DEBUG=false` suppresses the debug warning
entirely while the clamp itself still applies regardless — confirming
the fix and the logging are independently gated as intended.

## POST-DEPLOY LIVE VERIFICATION

Deployed (deploy-gate green, HEAD `2040a36`, `SW_VERSION` confirmed
live as `2026-07-10c`, `buildScoreNarrativeContext`'s ceiling clamp
confirmed present in the running code). Ran the exact reported bug
scenario and the real-large-lead case directly against the actual
deployed function via `localStorage`-backed calls (real `key`,
`FIELD_DEBUG` toggled and restored, `console.warn` intercepted then
restored, test key removed afterward):

- Impossible case (final 2-0, bad 4-run mid-game snapshot): `"[SCORE
  NARRATIVE] Marlins led by as many as 2-runs · wire-to-wire (Mariners
  never led)"` — no longer reports the impossible 4-run lead.
- Real large lead (final 8-1, genuine 7-run mid-game snapshot):
  `"[SCORE NARRATIVE] Home led by as many as 7-runs · wire-to-wire
  (Away never led)"` — correctly not suppressed.
- `debugWarningFired: true` for the genuinely impossible case.
- `cleanedUp: true` — `localStorage` restored to its original state, no
  residue left on production.

## VERIFICATION (repo-level)

`node smoke.js index.html`: 899/0 (unchanged). `node field_unit.js`:
66/0. `node field_smoke.js index.html`: 21 failures, matches the
documented pre-existing baseline. All 3 inline `<script>` blocks
syntax-checked via `node --check`.

## DONE CONDITIONS

- [x] Upper bound added at every real call site found by the probe —
      confirmed exactly one real implementation exists, no duplication
- [x] Debug logging added for clamped values, gated by `FIELD_DEBUG`,
      tested both on and off
- [x] Live-verified: the exact reported scenario (impossible 4-run
      mid-game snapshot, 2-0 final) now produces the correct, bounded
      2-run result
- [x] Live-verified: a real large lead (7-run mid-game, 8-1 final) is
      not incorrectly suppressed by the new ceiling, plus a boundary
      case confirming the clamp doesn't false-positive at the edge

## CONFIDENCE SCORING

- +30 — upper bound correctly added at every real call site
  (confirmed via a fresh, complete sweep to be the sole implementation
  — nothing missed): **met**
- +20 — debug logging added for clamped/rejected values, correctly
  gated by `FIELD_DEBUG`, verified both firing and suppressed: **met**
- +30 — live test proves the exact reported impossible-lead scenario
  is now fixed, against the extracted-verbatim committed function:
  **met**
- +20 — live test proves a real large lead is not falsely suppressed,
  including a boundary-exact case: **met**

**Total: 100/100.**

## Commit

- Bumps `SW_VERSION` `2026-07-10b` → `2026-07-10c`.
- `index.html`: `buildScoreNarrativeContext()` gains a symmetric upper
  bound on `maxHomeLead`/`maxAwayLead`, with `FIELD_DEBUG`-gated
  logging when a raw snapshot value exceeds the mathematical ceiling.
- `sw.js`: `SW_VERSION` sync bump.
- This manifest.
