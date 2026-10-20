# Claude Code Command — a reload, then a step back to yesterday, rendered no debriefs

**Date:** 2026-10-20
**Repo:** jubilant-bassoon
**Branch:** main. Commit directly; no feature branch, no PR.
**Confidence gate:** >= 95 before any commit
**Status:** FILED, not dispatched
**Filed by:** CC, from `docs/CC-CMD-2026-10-20-debrief-cache-outlives-archive-repair.md`
(Rule 87.4: observed there, out of its scope).

---

## What was observed (once, 2026-10-20)

Live probe run 39455640076 (SW 2026-10-18b,
`outbox/debrief-cache-revalidate-manifest-20261020T161539Z.json`) ran a first
visit and then a same-tab reload:
- **First visit:** today → `#date-prev` → "Yesterday". There were 11
  `/context/game` responses, all 200, and 11 `.card-debrief` elements.
- **Same-tab `page.reload()`:** today → `#date-prev` → "Yesterday" again. The
  page polled for 60 s and saw 0 `.card-debrief` elements.

The probe was then changed to make its second visit in a new tab. That visit
rendered 11 debriefs again (run 39456471138). So the difference follows the
tab, not the build.

**Hypothesis, untested (Rule 100: not a finding yet):**
- yesterday's schedule is cached in sessionStorage (`field_sched_<iso>`, read
  by `getCached`), and a reload keeps sessionStorage;
- cards built from that cached schedule may carry no durable id (`_gameId`);
- `injectDebriefCards` asks for nothing when no durable id resolves, so no
  card gets a debrief.

**Not measured:**
- whether a real user sees this;
- whether today's date is affected;
- whether the 0 was the cards, the ids, or the timing.

## TASK 0 — premises, one command each (Rule 100)

1. Reproduce. Run the probe in a reload variant. Record the card count, the
   `/context/game` request count and its id forms, and `.card-debrief`, for both
   visits. Do this 3 times.
2. If (1) reproduces: dump, for the reloaded yesterday,
   `sessionStorage.getItem('field_sched_<iso>')` and each card's
   `_id` / `_gameId` from `allData` through `?pl-verify`.
3. Compare with a new-tab visit to the same date. Same cards? Same ids?

## TASK 1 — only if TASK 0 shows a defect

Decided from TASK 0. A likely shape: the cached schedule keeps the durable ids
it was built with, or the debrief pass resolves them the same way on both
paths. No change before TASK 0's three outputs exist.

## Done condition (Rule 90 artifacts)

1. TASK 0's three outputs committed as manifests.
2. If a defect: the reload variant of the probe red before and green after,
   committed, plus one green deploy-gate run. If no defect: the manifests
   showing why, and this document closed as NOT A DEFECT.

## FORBIDDEN

- No layout change. No change to the debrief cache path that
  `scripts/check-debrief-cache-revalidates.mjs` gates.
