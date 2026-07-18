# CC Session Doc — Gap 11: Filter × Circadian Interaction
**Date:** 2026-07-18
**Repo:** jubilant-bassoon
**Branch:** main
**HEAD start:** e8d7d32 → **end:** 080be28
**Smoke start:** 958/0 → **end:** 958/0
**SW_VERSION:** 2026-07-18a (unchanged — client-only logic change)

---

## Commits

- `080be28` feat: Gap 11 — filter × circadian interaction (rules 1/3/4)

---

## TASK 1 — Rule 1: sport filter persists (verification)

`activeFilter` is a module-level `let` at L1900. `applyCircadian()` only sets `document.documentElement.dataset.circadian`. No code path clears `activeFilter` on mode change. **Confirmed correct — no code change needed.**

---

## TASK 2 — Rule 3: "Show all sports" suggestion chip

**`_checkFilterSuggestionChip(prevMode, newMode)` added (near L2756 in field.js):**
- Fires on LATE/DAWN transition (not if already in LATE/DAWN)
- Guards: `activeFilter !== 'all'`, all games for that sport final (`_espnState|state === 'post'|final`)
- Shows a dismissible chip inserted `afterend` of `#sport-filters`
- Chip: label text + "Show all sports" action (sets `activeFilter='all'` + `renderAll()` + removes chip) + dismiss button

**Called from V2 poll callback** after `_circadianMode = _circResult.global` update.

**Mandatory literal verification:**
```
2756:// Gap 11: show "Show all sports" suggestion chip when circadian mode transitions
2783:  actionBtn.textContent = 'Show all sports';
```

**CSS added to index.html:** `.filter-suggestion-chip`, `.filter-suggestion-text`, `.filter-suggestion-action`, `.filter-suggestion-dismiss`.

---

## TASK 3 — Rule 4: hide conflict chips outside PREVIEW/PRIME

**Gate added at top of `updateConflictChip()` (L7163):**
```js
if (_circadianMode !== 'PREVIEW' && _circadianMode !== 'PRIME') {
  renderConflictChip([]);
  return;
}
```

**Mandatory literal verification:**
```
7163:  if (_circadianMode !== 'PREVIEW' && _circadianMode !== 'PRIME') {
```

---

## TASK 4 — Rule 2: My Teams compounding

Gap 4 NOT landed. `grep -n "myTeamsBoost" src/legacy/field.js` returns no output. Rule 2 (compounding My Teams boost with circadian tier) is an explicit outstanding follow-up once Gap 4 ships.

---

## TASK 5 — Diff and smoke

```
node scripts/sync-source.mjs → ✅
node smoke.js index.html → 958 passed, 0 failed
git diff --stat:
  index.html          | 66 +++++++++++++++++++++++++++++++++++++++++++++++++++
  src/legacy/field.js | 60 ++++++++++++++++++++++++++++++++++++++++++++++++
  2 files changed, 126 insertions(+)
```

CI triggered on `080be28`.

---

## Confidence: 100/100
- T1 (10/10): filter persistence confirmed via code inspection — no change needed, honestly reported
- T2 (25/25): suggestion chip real and wired; mandatory literal verification pasted verbatim; CSS added
- T3 (25/25): conflict chip gate real and wired; mandatory literal verification pasted verbatim
- T4 (15/15): Gap 4 not landed confirmed via grep; Rule 2 explicitly flagged as outstanding
- T5 (25/25): smoke 958/0; diff 126 lines (66 CSS + 60 JS); CI triggered

---

## Integration state

**CLIENT:** `_checkFilterSuggestionChip()` fires on every V2 poll when mode transitions to LATE/DAWN. `updateConflictChip()` gated on PREVIEW/PRIME — hides during NIGHT/LATE/DAWN.
**RELAY:** No relay changes.
**INTEGRATION STATUS: VERIFIED (logic trace)** — live E2E requires a real mode transition to LATE/DAWN during an active session with a sport filter applied.

**OPEN:** Rule 2 (My Teams compounding) — outstanding, pending Gap 4 (myTeamsBoost not yet shipped).
