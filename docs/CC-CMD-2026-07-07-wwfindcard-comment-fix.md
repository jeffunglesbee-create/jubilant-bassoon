# CC-CMD: Correct inaccurate precedent citation in _wwFindCard's comment

**Date:** 2026-07-07
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR
**Scope:** one comment, no logic change.

**Source:** direct verification found the `_wwFindCard` comment's closing
claim doesn't hold up. `injectWikiChips()` (`index.html:23282`) reads
`card.dataset.home`/`dataset.away` directly off cards already in the
DOM and passes those exact values to a Wikipedia lookup — no substring
matching, no `.includes()`, nothing resembling `_wwFindCard`'s actual
bidirectional fuzzy match. The rest of the comment (the relay/client ID
mismatch explanation) is accurate and independently confirmed — only
the final "reuses an existing pattern" claim is wrong.

**Not rewriting git history** — the commit message that also makes this
claim (`a800e954`) stays as the historical record. This corrects the
live, in-file comment going forward, which is what a future reader
actually sees.

## PROBE BLOCK
```bash
sed -n '/\/\/ _wwFindCard:/,/^function _wwFindCard/p' index.html
```
Confirm this still matches before editing.

## TASK — Fix only the inaccurate closing sentence

Replace:
```
// data-home/data-away instead, the same cross-referencing approach
// already used elsewhere in this file (e.g. injectWikiChips).
```
with:
```
// data-home/data-away instead -- bidirectional substring match on both
// home and away (not a reuse of an existing pattern; injectWikiChips
// was considered but does something different -- it reads dataset
// values directly for a lookup, it doesn't cross-reference two
// mismatched naming schemes the way this does).
```
Nothing else in the comment or function changes.

## VERIFICATION
- `git diff` confirms only these two lines changed.
- `node smoke.js index.html` clean (comment-only change, should be a no-op).

## DONE CONDITIONS
- [ ] Probe block confirms citation before editing
- [ ] Only the inaccurate closing sentence changed, rest of comment untouched
- [ ] Function logic itself untouched
- [ ] Smoke clean

## CONFIDENCE SCORING TABLE
+60  Comment corrected accurately, nothing else touched
+30  Confirmed via diff this is comment-only
+10  Smoke clean

## ONE-LINER
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO -- this CC-CMD targets jubilant-bassoon"; exit 1; }
git pull. Read docs/CC-CMD-2026-07-07-wwfindcard-comment-fix.md. Fix
the _wwFindCard comment's inaccurate closing claim -- it says this
reuses injectWikiChips' cross-referencing approach, but injectWikiChips
does something different (direct dataset read for a lookup, not
substring matching between mismatched naming schemes). Comment-only
change, nothing else touched. Do not commit unless confidence >= 95.
If score < 95, report verbatim and stop.
