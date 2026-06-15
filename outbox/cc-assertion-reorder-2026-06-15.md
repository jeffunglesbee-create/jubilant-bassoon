# A604–A608 Reconciliation — Reorder + Label Cleanup

**Date:** 2026-06-15
**Spec:** chat-surface command, June 15 2026 11:44 UTC
**Scope:** smoke.js block lines ~4157-4239 only. No assertion logic changes — labels and ordering only.

## Pre-state
- `smoke.js` had A604–A608 added across multiple sessions with numbering collisions (A605, A607 collisions specifically — both ended up resolved by skipping forward to the next free index).
- Block order on disk was reverse-chronological in commit order, not numeric: A606 → A608 → A607 → A605 → A604. Easy to misread the relationship between A606 and A607 because their labels both said "score overlay" but pinned different code paths.
- A606 label: "A606 — Rule 59 audit task 1d: score overlay L1+L2 — _scoresNull merge guard + hydrateEspnScoresFromFinals fallback present"
- A607 label: "A607 — Rule 59 audit postscript: ce676fb explicit skip + allData.sports scan + start_time guard"
- Smoke: 651 / 0.

## Changes made

### 1. Label renames (clarity only)
| Assertion | Old label | New label |
|---|---|---|
| A606 | "A606 — Rule 59 audit task 1d: score overlay L1+L2 — _scoresNull merge guard + hydrateEspnScoresFromFinals fallback present" | "A606 — Score overlay: pre-existing _scoresNull merge guard in V2 write path" |
| A607 | "A607 — Rule 59 audit postscript: ce676fb explicit skip + allData.sports scan + start_time guard" | "A607 — Score overlay L1+L2: explicit null-score skip + allData.sports fallback + start_time guard" |

Both labels now lead with **what code path they pin**, not with the chat-session breadcrumb. The "Rule 59 audit" provenance moves into the per-assertion comment block above each line.

### 2. Order on disk

New layout (newest at top of the block / oldest at bottom):

```
// ── A604-A608: Championship Brief + Score Overlay + Night Owl (June 14-15 2026) ──
   ↓
A608 — Night Owl championship context (June 15)
A607 — Score overlay L1+L2 ce676fb additions (June 15)
A606 — Score overlay pre-existing merge guard (June 14-15)
A605 — Championship brief J2 wiring (June 14)
A604 — Championship brief builder + lookup + card-tap injection (June 14)
```

Spec requested "A604 first/bottom, A608 last/top in the prepend pattern" — that matches the file's prepend-newest convention. A608 sits at the top of the block (just under the section comment), A604 at the bottom. The block is read in DESCENDING numeric order top-down, matching how the rest of smoke.js is structured (newest assertions at the highest visual position).

### 3. Section comment added

```js
// ── A604-A608: Championship Brief + Score Overlay + Night Owl (June 14-15 2026) ──
// Reordered 2026-06-15 (CC-CMD assertion-reorder commit) so the block reads
// in descending numeric order (A608 first, A604 last) — newest at the top of
// the prepend pattern, oldest at the bottom. Two label renames in this pass
// (A606 + A607) clarify which assertion pins the PRE-EXISTING merge guard
// vs the NEW ce676fb skip/scan/guard additions. No assertion logic changed —
// only labels and ordering. See outbox/cc-assertion-reorder-2026-06-15.md.
```

### 4. Per-assertion comment cleanup

A606's leading comment now explicitly notes "pre-existing" and cross-references A607 ("This is a MERGE GUARD (not the SKIP — see A607)"). A607's leading comment cross-references A606 ("Companion to A606 (which pins the pre-existing merge guard)"). Future readers can see the two assertions are complementary, not duplicates.

## What did NOT change

- No regex/`html.includes` check was modified. The assertion logic is byte-for-byte the same — only the human-readable labels, the leading comment blocks, and the order of the assertions in the file changed.
- The trailing detail strings (the third argument to `assert(...)`) were updated only where they mentioned "audit text" provenance — the actionable content (what the assertion guards against) is preserved.
- No effect on smoke count, on any other assertion's logic, or on the audited code in `index.html`.

## Verification

- `node smoke.js index.html` → **651 / 0** (unchanged from pre-state).
- `node field_unit.js` → **66 / 0**.
- `grep -nE "^// ── A60[4-8]|^assert\('A60[4-8]" smoke.js` confirms new order:
  - Section comment at 4157
  - A608 at 4165/4169
  - A607 at 4184/4189
  - A606 at 4201/4206
  - A605 at 4219/4220
  - A604 at 4231/4232

## Findings

1. **Numbering collisions are now visible from the file alone.** Before this reorder, reading the file you'd see A606 → A608 → A607 → A605 → A604 and assume each "later" assertion was newer. With the descending-numeric layout, the order matches what readers expect and the collision history is now isolated to the per-assertion comment blocks.
2. **Label scheme.** Both A606 and A607 now lead with the code path they pin ("Score overlay: pre-existing merge guard" vs "Score overlay L1+L2: explicit skip + ..."). The chat-session breadcrumb ("Rule 59 audit task 1d" / "Rule 59 audit postscript") moves to the comment block where it belongs as provenance.
3. **No semantic change.** This commit is purely a cosmetic refactor. The Rule 13 review-gate question "does this touch a function called from multiple places?" answers "no — only labels and file ordering". The Rule 24 question "does this change a re-render path?" answers "no — no code changes outside smoke.js comments and labels".

## Commit

`refactor: reorder A604-A608 assertions for consistency with chat session`

Pushed alongside this file.