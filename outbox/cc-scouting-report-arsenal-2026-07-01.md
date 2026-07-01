# CC Outbox — Surface Pitch Arsenal in Scouting Report

**Date:** 2026-07-01
**CC-CMD:** docs/CC-CMD-2026-07-01-scouting-report-arsenal.md
**Commit:** d1e5d0b
**Smoke:** 817 → 818 (1 new assertion, 0 failed, no regressions)

---

## Pre-build probe

Confirmed current line numbers (shifted slightly from the CC-CMD's probe
estimates, per prior session commits landing on `main`):
- `buildScoutingReport`: line 18386 (was ~line noted in CC-CMD context)
- `fmtP`: line 18421
- `getPitchArsenal`: line 7659, return shape `{ pitches, topWhiff, context }`
  confirmed exactly as the CC-CMD described — `topWhiff` is
  `[...d.pitches].sort((a,b)=>(b.whiffRate??-1)-(a.whiffRate??-1))[0]`.

## Task 1 — Arsenal line added, with two verified deviations from the literal snippet

**Deviation 1 — name-to-key extraction bug (found via dry-run, not assumed).**
Before shipping, dry-ran the CC-CMD's literal snippet against real pitcher
objects shaped like `normalizeMLBPitcher`'s actual output (`{name: p.fullName
||p.name||'TBD', ...}` — always a full name, e.g. "Kevin Gausman", never a
bare last name; `lastName` is never populated on this object shape). Result:
`getPitchArsenal("Kevin Gausman")` returns `null` every time, because
`PITCHER_ARSENAL` is keyed by last-name-only lowercase (`PITCHER_ARSENAL[
pitcherLastName.toLowerCase()]`). The arsenal line would never have
rendered for any real probable pitcher.

This is not a new problem introduced by this CC-CMD — the adjacent,
already-shipped tempo line (`getPitchTempo?.(p.name || p.lastName || '')`,
same file, one line above where I edited) has the exact same bug and has
presumably never rendered a tempo badge in the Scouting Report for a real
probable pitcher either. That's a genuine pre-existing gap, separate from
this CC-CMD's stated scope (which was "add one more chained line to fmtP,
following the exact existing tempo pattern" — the tempo pattern itself is
what's broken).

**Fix applied (in scope — only affects the new arsenal call):** extract
the last name via `(p.name || p.lastName || '').split(' ').pop()` before
calling `getPitchArsenal`, matching the WORKING precedent already used for
this exact lookup elsewhere in the same file —
`getMLBAnalyticsContext` (index.html ~L7693):
`const last = (pitcher.lastName||pitcher.fullName||'').split(' ').pop().toLowerCase();`.
Verified via dry-run against the real `outbox/mlb/pitch_arsenals.json`
data (120 real pitchers) that this produces correct output:
`"Kevin Gausman · 3.42 ERA · 6-4 · Split-Finger 39% whiff"`,
`"Freddy Peralta · 4.1 ERA · 5-5 · Changeup 28% whiff"`, and gracefully
omits the arsenal clause for pitchers with no data
(`"Nobody Real · 5 ERA · 1-1"`).

**Left untouched (Rule 69 — out of scope):** the tempo line's identical
full-name-vs-last-name-key bug. Flagging it here as a real, verified gap
worth a future one-line CC-CMD: change
`getPitchTempo?.(p.name || p.lastName || '')` to
`getPitchTempo?.(pLast)` (the same `pLast` variable now computed in this
function) in `fmtP` at ~index.html:18425.

**Deviation 2 — null whiffRate handling (per the CC-CMD's own instruction
to verify, not just ship the snippet).** Checked all 120 real pitchers in
the current `outbox/mlb/pitch_arsenals.json`: 0/120 currently have a
null-whiffRate `topWhiff` (every real pitcher this week has whiff data on
their best pitch). Still implemented the safer behavior — skip the
arsenal clause entirely when `topWhiff.whiffRate == null`, rather than the
CC-CMD's literal `?? 0` (which would show a false "0% whiff") — because
`whiffRate` CAN legitimately be null per-pitch (confirmed in the data
shape from the `pitch_arsenals` fix earlier this session: `whiffRate` is
`null` when the source CSV's `whiff_percent` column is empty for that
pitch/week), and a future week could produce a pitcher whose only
qualifying pitch has no whiff data.

## Task 2 — Verification

- `node smoke.js index.html`: 818 passed, 0 failed (817 + 1, exact
  expected delta from the new `SCOUT-ARSENAL-1` assertion, no regressions).
- Added `SCOUT-ARSENAL-1` (not required by the CC-CMD — explicitly marked
  optional, "unless the CC-CMD author judges one is warranted"). Judged
  warranted here because the deviation (last-name extraction) is exactly
  the kind of fix that silently regresses if someone "simplifies" it back
  to the CC-CMD's literal (non-functional) snippet later — the assertion
  locks in the working form structurally.
- Dry-ran `fmtP`'s logic in isolation against real `pitch_arsenals.json`
  data (shown above) — confirms real, correct rendering, not just
  structural presence of the code.

**Chat-side follow-up (per CC-CMD, not checkable by CC):** confirm live in
a rendered bottom sheet with a completed `getPitchArsenal` lookup that the
line reads sensibly in the actual DOM (not just the isolated dry-run done
here).

## Task 3 — Outbox manifest

Covered above. Summary of the null-whiffRate decision: skip the line
entirely rather than show "0% whiff" — null means "no data for this
pitch," and displaying 0% would misrepresent a real pitcher as having zero
swing-and-miss ability on their best pitch, which is never true in
practice (a pitcher with genuinely 0% whiff wouldn't be their own
`topWhiff` pick over an untracked pitch). Not currently exercised by real
data (0/120 pitchers hit this), but the code path is real and will be
exercised eventually as weekly data rotates.

---

## Done Conditions

- [x] Arsenal line added to `fmtP`, chained after tempo, matching existing style
- [x] Verified real output via dry-run against actual `pitch_arsenals.json` data (not just code review)
- [x] Found and fixed a real bug (full-name-vs-last-name key mismatch) that would have made the feature silently non-functional — verified before AND after the fix
- [x] Null whiffRate handled by omission, not a misleading zero — decision documented with rationale
- [x] Pre-existing, adjacent tempo-line bug found but left untouched (out of scope) and flagged for a future CC-CMD
- [x] 818/0 smoke, no regressions
- [x] Outbox written
