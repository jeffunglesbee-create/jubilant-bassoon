# CC-CMD: Remove Vestigial Scoring Dimensions

**Repo:** jubilant-bassoon  
**File:** `index.html`  
**Branch:** main (commit directly per CLAUDE.md)  
**Dependency:** field-relay-nba `cc-cmd-structured-voice-judge.md` merged first —
confirms canonical `BANNED_PHRASES` form before client copy is reconciled

## Problem

The client's `scoreProse()` function contains two scoring dimensions that
have been analytics-only since the voice judge redesign — they no longer
gate retries and duplicate detection that other layers already perform.
Carrying them adds surface area with no quality benefit.

Additionally, the client's `BANNED_PHRASES` copy has drifted from the relay's
list. After the relay CC-CMD finalises the canonical list, both must match.

## Probe Block (run before writing any code)

```bash
# Confirm HEAD
git log --oneline -5

# Exact lines for each function being removed or changed
grep -n "computeNarrativeArc\|computeVoiceConsistency\|Dim.6\|Dim.9\|dim6\|dim9" index.html | head -20

# Confirm neither function gates a retry anywhere — they must only feed scoreProse
grep -n "computeNarrativeArc\|computeVoiceConsistency" index.html

# Find all callers of hasCliche in index.html
grep -n "hasCliche" index.html

# Check smoke.js for any assertion that references Dim 6, Dim 9,
# computeNarrativeArc, or computeVoiceConsistency by name
grep -n "computeNarrativeArc\|computeVoiceConsistency\|Dim.6\|Dim.9\|hasCliche" smoke.js

# Diff BANNED_PHRASES between relay (now canonical) and client
# Run after relay CC-CMD is merged
diff \
  <(cd ../field-relay-nba && grep -A80 "^export const BANNED_PHRASES" src/journalism-quality.js) \
  <(grep -A80 "BANNED_PHRASES\s*=" index.html | head -80)
```

## Changes

### 1. Remove `computeNarrativeArc()` (Dim 6) from `scoreProse()`

Confirmed analytics-only since voice judge redesign. Does not gate retries.
Duplicates what the Layer 3b voice judge already assesses semantically.

- Delete the `computeNarrativeArc()` function body
- Remove its call site inside `scoreProse()`
- Remove its contribution to the composite score (adjust weighting if any)

If smoke.js asserts the function exists by name: update or remove that
assertion as part of this commit — do not leave a broken smoke assertion.

### 2. Remove `computeVoiceConsistency()` (Dim 9) from `scoreProse()`

Confirmed analytics-only. Duplicates Layer 2b (`checkSportVocab`) in
per-sport positive/negative signal form. The voice judge handles register
consistency semantically.

- Delete the `computeVoiceConsistency()` function body and its per-sport
  signal arrays (basketball/hockey/baseball/soccer positives and negatives)
- Remove its call site inside `scoreProse()`
- Remove its contribution to the composite score

If smoke.js asserts the function exists by name: update or remove that
assertion as part of this commit.

### 3. Reconcile `BANNED_PHRASES` with relay canonical list

After relay CC-CMD is merged, run the diff command from the probe block.
For each entry present in one copy but not the other:

- If the relay removed it (moved to voice judge mandate): remove from client
- If the relay kept it (genuine hard-block phrase): add to client if missing
- If client has an entry the relay never had: evaluate — if it belongs in
  the hard-block list, add to relay too (cross-repo sync, one commit each)

The two copies must be identical after this step.

### 4. Remove `hasCliche()` gate if called from any live display path

From probe: if `hasCliche()` appears only in dead code or test references,
delete the function.  
If it gates a live display path (e.g. shows a quality warning in the UI),
leave the function but document the call site in the outbox — it is now the
only remaining caller and should be noted for future cleanup.

## Scope Boundary — Do Not Touch

- Layer 2b (`checkSportVocab`) — keep
- Layer 2c (`checkLeadSentence`) — keep
- Layer 2d (`checkStatVerification`) — keep
- Layer 2e (`hasCrossSportHallucination`) — keep
- Layer 2f (`hasWireCopy`) — keep
- Layer 2g (`hasNarrativeHallucination`) — keep
- Layer 2h (`hasRecordAttributionError`) — keep
- All other `scoreProse()` dimensions — keep
- `FIELD_VOICE_REGISTER` copy in index.html — keep (synced separately)
- `sw.js` — do not touch
- field-relay-nba — not in scope

## Commits

One concern per commit, each independently revertable:

1. `fix: remove computeNarrativeArc (Dim 6) — analytics-only since voice judge redesign`
2. `fix: remove computeVoiceConsistency (Dim 9) — duplicates Layer 2b`
3. `fix: reconcile BANNED_PHRASES with relay canonical list`
4. `fix: remove hasCliche gate` (only if probe confirms it gates something live)

## Done Condition

```bash
node smoke.js index.html
# → 0 failed

# Confirm neither removed function appears in scoreProse call chain
grep -n "computeNarrativeArc\|computeVoiceConsistency" index.html
# → no results (or only inside deleted function bodies if grep picks up comments)

# Confirm BANNED_PHRASES entries match relay
diff \
  <(cd ../field-relay-nba && grep -A80 "^export const BANNED_PHRASES" src/journalism-quality.js) \
  <(grep -A80 "BANNED_PHRASES\s*=" index.html | head -80)
# → no diff
```

## Outbox Manifest (last task)

Write `outbox/cc-session-{date}-remove-vestigial-scoring.md` containing:

- HEAD before and after
- Smoke count before and after (must be equal or higher — no regressions)
- Confirmation that Dim 6 and Dim 9 no longer appear in `scoreProse()` call chain
- BANNED_PHRASES diff result (before and after reconciliation)
- Any live `hasCliche` call sites found and disposition
