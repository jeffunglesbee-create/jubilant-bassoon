# CC Session 2026-07-17 — Remove Vestigial Scoring Dimensions

## Date
2026-07-17

## Repo
jubilant-bassoon

## HEAD Progression
- Before: 9aca8b8 — docs: move cc-cmd to docs/ with date prefix [skip ci]
- After:  ed39d66 — fix: reconcile BANNED_PHRASES with relay canonical list

## Smoke Count
- Before: 958 passed, 0 failed
- After:  958 passed, 0 failed
- Delta:  no regression

## Commits
1. `d877a2a` — fix: remove computeNarrativeArc (Dim 6) — analytics-only since voice judge redesign
2. `7123f65` — fix: remove computeVoiceConsistency (Dim 9) — duplicates Layer 2b
3. `ed39d66` — fix: reconcile BANNED_PHRASES with relay canonical list

## What Was Done

### Change 1: Removed computeNarrativeArc (Dim 6)
- Deleted function body (was lines 28464-28502)
- Removed call site `const arc = computeNarrativeArc(text)` from scoreProse
- Removed `arc.score` from composite total
- Removed `arc` from scoreProse return object
- ceiling adjusted 300→255 (removes Dim 6 max of 45)
- smoke A323 updated: now asserts removal rather than existence
- maybeScoreRetry's `arc.stakes`/`arc.resolution` guards remain in code — they're
  guarded by `scoreObj.arc && ...` so undefined arc short-circuits naturally; no crash.

### Change 2: Removed computeVoiceConsistency (Dim 9)
- Deleted function body (was lines 28585-28637 in pre-edit numbering)
- Removed call site `const voice = computeVoiceConsistency(text, game || null)` from scoreProse
- Removed `voice.score` from composite total
- Removed `voice` from scoreProse return object
- ceiling adjusted 255→225 (removes Dim 9 max of 30)
- smoke A325 updated: removes computeVoiceConsistency check, adds !computeVoiceConsistency assert
- smoke A518 updated: now asserts removal rather than existence

### Change 3: Reconcile BANNED_PHRASES
- relay canonical: 75 entries (including P0.2 additions, June 4 2026)
- client before: 60 entries (missing P0.2 batch)
- Added to client: secured a/the victory/win, capitalized on scoring opportunities,
  capitalize on scoring, finalize a/the, overcome the/to overcome/managed to overcome,
  result moved/moves, continued their/extended their/maintained their momentum
- client after: 75 entries
- Verified match: node eval-based comparison → relay 75 = client 75, Only in relay: [], Only in client: []

### Change 4: hasCliche disposition
NOT removed. Probe confirmed hasCliche is called from 6 live paths:
- Line 28016: inside quality gate (maybeScoreRetry / runProseLayer2)
- Line 28030: re-check after Layer 2 retry
- Line 28792: inside scoreProse return (analytics display)
- Line 29418, 29484, 29503, 29519: multiple compound/slate brief paths checking output

hasCliche is a live gate, not dead code. Function kept. Documented here per CC-CMD instruction.

## Done Condition Verification
```
node smoke.js index.html → 958 passed, 0 failed ✅
grep computeNarrativeArc\|computeVoiceConsistency index.html → no results ✅
BANNED_PHRASES eval comparison → MATCH: YES (75 entries each) ✅
```

## Integration Status
VERIFIED — scoreProse is purely client-side analytics. No relay dependency.
hasCliche confirmed live. All smoke assertions green.
