# FIELD HANDOFF — 2026-06-06 (Session END — PM-29 Postgame Drama Context)

## State
jubilant-bassoon HEAD: 56354fc · Smoke: 510/0 · Unit: 66/0
field-relay-nba HEAD: 981d474

## PM-29 — COMPLETE ✅

Revival of all RUWT-scrapped drama metrics for postgame surfaces.
RUWT risk: NONE. All outputs are historical facts (game is over), not live recommendations.

### buildScoreNarrativeContext(gameId, homeLabel, awayLabel, sport)
Reads field_score_snap_* (up to 10 {h,a,t} entries).
Outputs: [SCORE NARRATIVE] biggest lead · lead changes · loser's max lead (comeback signal)
Sport-aware units: goal (soccer/hockey), run (baseball), point (everything else).
Skips: golf, tennis (score snapshots not meaningful for those sports).
Returns '' when < 2 entries or skipped sport.

### buildDramaArcDescription(gameId)
Reads field_drama_history_* (up to 200 {t,s,p} samples).
Arc classification: quiet-game / moderate / sustained-thriller / late-bloomer /
early-spike / mid-peak / late-drama / one-electric-moment.
Outputs: [DRAMA ARC] one-sentence plain English describing the tension shape.
Returns '' when < 4 samples.

### Night Owl fix + extension
_owlDramaPromptCtx was UNDECLARED (regression from June 5 session — variable was
referenced at line 28074 but the let declaration never reached that scope).
Fixed + extended: now includes [DRAMA], [DRAMA TREND], [DRAMA PEAK] (these 3
existed but weren't reaching the prompt), [DRAMA ARC], [SCORE NARRATIVE].
EMBER tag added to Night Owl prompt with dramaPeak: [EMBER BURIED LEAD: Tier3 · peak 84].
Updated DRAMA CONTEXT usage instruction covers all five tags.

### Bottom sheet postgame
New "Game Summary" section (replaces live "Live Intelligence" for state=post):
  Peak 🔥84 · 18 min high drama · surged late ↑
  [score narrative text below]
Drama Arc sparkline now has arc description text beneath it for final games.

### Compound prompt
buildDramaArcDescription + buildScoreNarrativeContext injected after PM-28k block.
Guard: _eS?.state!=='post' — only fires for finished games (RUWT-clean).

## Priority List
1. JQ Gate brand-safe fallback (~60 lines)
2. Drama Dial header chip (~20 lines)
3. Arc Poster (~200 lines)
4. State Transition PerformanceObserver (~30 lines)
5. iOS PWA Add-to-Home (~40 lines)

## Key Refs
jubilant-bassoon HEAD: 56354fc
field-relay-nba HEAD: 981d474
Smoke: 510/0 · Unit: 66/0
