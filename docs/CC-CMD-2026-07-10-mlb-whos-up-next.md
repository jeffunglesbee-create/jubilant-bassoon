# CC-CMD: MLB "who's up next" forecast — wire up data already confirmed present

**Date:** 2026-07-10
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR

## CONTEXT

Direct continuation of `CC-CMD-2026-07-10-mlb-pitch-pace-probe.md`
(100/100, real live evidence, no code changes). This is not new
investigation — every field this task needs was already confirmed
present, quoted directly from real live responses:

- `liveData.plays.currentPlay.atBatIndex` — the at-bat sequence number
- `liveData.boxscore.teams.{away,home}.battingOrder` — real player-ID
  lineup arrays
- `playEvents[].startTime`/`endTime` — real per-pitch timestamps,
  confirmed ~11s real inter-pitch gaps
- `numberOfPitches`/`pitchesThrown`/`battersFaced` — sitting unused in
  `fetchMLBBoxscoreContext()`'s own already-fetched payload

**The reframe from earlier tonight, now buildable on confirmed real
data:** don't predict *what* happens (a hit, a strikeout — genuinely
unpredictable, forbidden by this codebase's own anti-fabrication
rules). Predict *who's* involved — a mechanical lineup-rotation
question, not an event guess. *"In about 10 minutes: likely
[Player]'s at-bat"* is a statement of fact about batting order plus
real pace, not a confident guess about drama.

**Two real gaps to close, exactly as the probe found them — not one
bigger rewrite:**

1. `fetchMLBLiveGame(gamePk)` is fully built but has zero callers
   anywhere in the file — confirmed via full-file grep. It also
   doesn't currently extract `atBatIndex`/`battingOrder`/`playEvents[]`
   even though they're present in the response it already fetches.
2. `fetchMLBBoxscoreContext()` is actively wired to a real consumer
   (index.html:27791) but discards `numberOfPitches`/`pitchesThrown`/
   `battersFaced` from a payload already in hand.

## PROBE BLOCK

```bash
git log --oneline -5

grep -n "function fetchMLBLiveGame" -A 30 index.html
grep -n "function fetchMLBBoxscoreContext" -A 30 index.html
# Re-read both in full current form — confirm exact current return
# shapes before extending either. This doc's line citations come from
# the prior probe and may have drifted.

grep -n "fetchMLBLiveGame(" index.html
# Re-confirm zero real callers still holds before wiring one up — if
# something changed since the probe, report that explicitly rather
# than assuming the probe's finding still applies.
```

## TASK 1 — Extend `fetchMLBLiveGame()`'s extraction, then wire a real caller

Add `atBatIndex`, `battingOrder` (both teams), and the current at-bat's
real pitch pacing (derive from recent `playEvents[]` gaps, not a
hardcoded constant) to this function's return shape. Then wire it to a
real caller — this function currently has none, so this is genuinely
new integration, not a one-line fix. Call it from wherever FIELD's
existing live-MLB-card update cycle lives (find the real call site via
the probe, don't assume one).

## TASK 2 — Stop discarding pitch count in `fetchMLBBoxscoreContext()`

Add `numberOfPitches`/`pitchesThrown`/`battersFaced` to this function's
existing extraction — it already receives these in the payload it
fetches, per the prior probe's direct quote. No new fetch, no new call
site — this one genuinely is a small, contained fix.

## TASK 3 — Build the forecast, using real pace not an assumed constant

From `atBatIndex` + `battingOrder`, compute which lineup slot is
currently up and project forward N batters using **real, measured
recent pace from this specific game's own `playEvents[]` gaps** — not
a fixed assumption about pitch-clock timing. If recent pace data is
genuinely unavailable for a game, do not fall back to a guessed
average — omit the forecast for that game rather than presenting an
unearned number as fact, matching this codebase's established
silence-over-guessing discipline.

**Explicitly out of scope:** predicting any specific outcome (hit,
strikeout, etc.) — this stays strictly a lineup-rotation forecast, per
the anti-fabrication rules already governing every other brief type in
this codebase.

## TASK 4 — Live verification against a real game

Confirm against a real, currently live MLB game (not synthetic data):
the forecast correctly identifies the upcoming batter at the correct
lineup position, the pace estimate is derived from that game's actual
recent pitch timing (not a constant), and a game with insufficient
recent pace data correctly shows nothing rather than a guessed number.

## DONE CONDITIONS

- [x] `fetchMLBLiveGame()` extraction extended with `atBatIndex`/
      `battingOrder`/real pace derivation, and wired to a genuine
      caller (currently has none)
- [x] `fetchMLBBoxscoreContext()` extended to keep the 3 pitch-count
      fields it already receives and currently discards
- [x] Forecast built from real measured pace, not an assumed constant;
      explicitly omits rather than guesses when pace data is thin
- [x] Live-verified against a real, currently live game — correct
      batter, real pace source, correct omission when data is thin

## CONFIDENCE SCORING

- +25 — `fetchMLBLiveGame()` correctly extended and genuinely wired to
  a real caller
- +20 — `fetchMLBBoxscoreContext()` correctly stops discarding the 3
  confirmed fields
- +30 — forecast uses real per-game pace, not a constant; correctly
  omits rather than guesses on thin data
- +25 — live-verified against a real currently-live game, not
  synthetic test data alone

**Do not commit unless confidence >= 95. If score < 95, report verbatim
and stop.**

## ONE-LINER

```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git pull. Read docs/CC-CMD-2026-07-10-mlb-whos-up-next.md. Execute all tasks. Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```
