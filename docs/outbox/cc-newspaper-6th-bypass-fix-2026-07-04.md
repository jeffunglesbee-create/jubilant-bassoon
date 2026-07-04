# CC Outbox — 6th Newspaper-Wipe Bypass Fix

**Date:** 2026-07-04
**CC-CMD:** docs/CC-CMD-2026-07-04-newspaper-6th-bypass-fix.md
**Commits:** 92eefcc (implementation), 30f30db (shrink probe result)
**Deploy:** Deploy gate run 28711364786 — succeeded

---

## Probe block — exact line reconfirmed, zero drift

```
grep -n "if(!main.innerHTML.trim()) main.innerHTML='<div class=\"empty-note\">No events found for today" index.html → 10793
grep -n "applyMainHTML(_renderAllHTML)" index.html                                                                  → 10792
```

Both at the exact lines the doc cited (10792-10793), matching this
session's own prior finding exactly.

## Implementation

One line changed:
```javascript
// Before:
if(!main.innerHTML.trim()) main.innerHTML='<div class="empty-note">No events found for today</div>';
// After:
if(!main.innerHTML.trim()) applyMainHTML('<div class="empty-note">No events found for today</div>');
```
Content identical — confirmed via diff review. `applyMainHTML()` itself
untouched (zero diff lines in its body). Did not look for or fix any
further bypasses, per this CC-CMD's own explicit scope boundary.

## Smoke assertion

1 new: `A-NPWIPE-3`, checking `renderAll`'s second empty-check now calls
`applyMainHTML(...)`. Verified the doc's suggested regex matches the
real code before trusting it.

`node smoke.js index.html`: **860 passed, 0 failed** (859 baseline + 1
new).

## SW_VERSION

Bumped to **`2026-07-04f`** — checked real system time again (11:46 ET
July 4 at commit time); `e` was already used earlier today for the
newspaper-repaint-wipe-fix commit.

## CC-verifiable confidence score (per the doc's own rubric)

- **+50** — Line converted exactly as specified, content unchanged
  (confirmed via diff review)
- **+25** — Smoke 1/1 green (860/0 total)
- **+25** — CI confirms deployed (Deploy gate run 28711364786,
  succeeded); live bundle re-verified directly

**Total: 100/100.** Committed.

## Live bundle re-verified directly

```
9123: if(!main.innerHTML.trim()) applyMainHTML('<div class="empty-note">No events found for today</div>');
```

`SW_VERSION = '2026-07-04f'` confirms this exact commit is deployed.
Full response (31,437 lines) not kept verbatim — replaced with the
extracted finding in `outbox/cf-result-20260704T154816Z.txt`.

## Deferred to chat — per the CC-CMD, does not block this commit

- [ ] Real observation that this specific empty-today state (which only
      fires when a full render's HTML happens to be blank) preserves
      the newspaper live — hard to trigger on demand in a real browser
      session; code-review confidence is the practical ceiling here.

## Scope discipline note

Per this CC-CMD's own explicit instruction, did not look for a 7th
bypass. All 6 real bypasses identified across the two-part fix (the
original 5 plus this one) are now resolved; no further main.innerHTML
audit was performed in this pass.

---

## Done Conditions

- [x] Probe block re-run, exact line confirmed (10792-10793, zero drift)
- [x] Converted to `applyMainHTML(...)`, content unchanged
- [x] `node smoke.js index.html` exits 0, new assertion green (860/0 total)
- [x] CI confirms deployed — Deploy gate succeeded; live bundle
      re-verified directly
- [x] SW_VERSION bumped (`2026-07-04f`)
- [x] Outbox manifest written (this file)
