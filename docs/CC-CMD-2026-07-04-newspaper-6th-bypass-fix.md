# CC-CMD: Fix the 6th newspaper-wipe bypass (found by the prior CC-CMD, deliberately not fixed then)

**Date:** 2026-07-04
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main
**Scope:** One line. Same proven pattern as
`CC-CMD-2026-07-04-newspaper-repaint-wipe-fix.md`'s 5 fixes, applied to
the 6th instance that CC found and correctly reported without fixing
(per that doc's scope boundary).

**Why:** `renderAll()`'s second empty-check, immediately after
`applyMainHTML(_renderAllHTML)`, directly reassigns `main.innerHTML`
again if the result is empty — undoing the newspaper restoration that
just happened one line above. Confirmed real via source read
2026-07-04, exact current location verified via probe (line numbers
shift daily, do not trust this doc's line number without re-checking).

**Target time:** ~5 min

## ENVIRONMENT CONSTRAINTS (copy verbatim)
- *.workers.dev:443 blocked from CC egress
- Playwright tests must run via GitHub Actions CI — never localhost
- api.github.com is reachable from CC bash
- No branch switching — work on main only
- 2 attempts max on any push — declare failure and stop if both fail

## CONFIDENCE GATE
Do not commit unless confidence ≥ 95.

## PROBE BLOCK (run before any edits)
```bash
grep -n "if(!main.innerHTML.trim()) main.innerHTML='<div class=\"empty-note\">No events found for today" index.html
grep -n "applyMainHTML(_renderAllHTML)" index.html
```
Confirm the second-empty-check line is still immediately after the
`applyMainHTML(_renderAllHTML)` call before editing — if the surrounding
code has changed shape since 2026-07-04, re-assess rather than blindly
applying this doc's exact before/after text.

## TASK 1 — Convert the 6th bypass

Find (confirmed at index.html:10793 as of 2026-07-04, re-verify):
```javascript
  applyMainHTML(_renderAllHTML);
  if(!main.innerHTML.trim()) main.innerHTML='<div class="empty-note">No events found for today</div>';
```
Replace with:
```javascript
  applyMainHTML(_renderAllHTML);
  if(!main.innerHTML.trim()) applyMainHTML('<div class="empty-note">No events found for today</div>');
```

## TASK 2 — Smoke assertion

```javascript
smoke.assert(!!html.match(/if\(!main\.innerHTML\.trim\(\)\)\s*applyMainHTML\(/), 'A[NEXT]: renderAll\'s second empty-check (post-render) also preserves the newspaper via applyMainHTML');
```
(CC: assign the real next sequential A-number.)

## SCOPE BOUNDARY

DO:
- Convert exactly this one line
- 1 smoke assertion
- Bump SW_VERSION

DO NOT:
- Touch `applyMainHTML()` itself
- Look for or fix any further bypasses beyond this specific one — if you find a 7th while working, report it in the outbox, don't fix it here without a separate CC-CMD, matching the exact discipline the prior CC-CMD already established

## DONE CONDITIONS
- [ ] Probe block re-run, exact line confirmed
- [ ] Converted to `applyMainHTML(...)`, content unchanged
- [ ] `node smoke.js index.html` exits 0 with the new assertion green
- [ ] CI confirms deployed
- [ ] SW_VERSION bumped
- [ ] Outbox manifest written to `docs/outbox/cc-newspaper-6th-bypass-fix-{date}.md`

**Deferred to chat — do NOT block your commit on this:**
- [ ] Real observation that this specific empty-today state (which only fires when a full render's HTML happens to be blank) preserves the newspaper live — hard to trigger in a real browser session on demand, code-review confidence is the practical ceiling here.

## COMPLIANCE
- Rule 68: probe block first
- Rule 87: self-completing on the CC-verifiable portion

## CONFIDENCE SCORING TABLE
+50  Line converted exactly as specified, content unchanged
+25  Smoke 1/1 green
+25  CI confirms deployed

## ONE-LINER
git pull. Read docs/CC-CMD-2026-07-04-newspaper-6th-bypass-fix.md.
Re-confirm the exact line via PROBE BLOCK before editing. Convert to
applyMainHTML(...), preserving content exactly. Do not touch
applyMainHTML itself or look for further bypasses. Do not commit unless
confidence ≥ 95. If score < 95 report verbatim and stop — do not invent
results.
