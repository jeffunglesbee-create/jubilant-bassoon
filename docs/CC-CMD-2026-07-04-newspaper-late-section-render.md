# CC-CMD: Render bundle.late in the newspaper — WITHOUT duplicating morning_report's text

**Date:** 2026-07-04
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main
**Scope:** `renderNewspaper()` + `applyNewspaperVoice()`, both in index.html.

**Why:** The relay's `/analytics/newspaper/{date}` bundle now includes a
`late` field (wired 2026-07-04, `CC-CMD-2026-07-04-circadian-late-
newspaper-wire.md`, relay repo). Confirmed via grep: `bundle.late` is
read nowhere in this file. `renderNewspaper()` has 7 sections built
from other bundle fields; `late` has none.

**CRITICAL, verified, not hypothetical — read before writing any code:**
`late` and `morning_report` currently contain byte-identical text.
Confirmed live 2026-07-04: `GET /analytics/newspaper/{date}` returned
`late` and `morning_report` as exact string matches, because Phase 10B
(the relay job that writes `late`) copies `morning_report`'s brief_text
directly rather than generating separate content. **If this CC-CMD
renders `late` as a naive additional `<div class="np-section">` the way
the other 6 sections are built, users will see the identical paragraph
twice in the same newspaper, under two different labels.** This is not
a theoretical risk — it is guaranteed to happen with today's real data,
every single day, until either the content sources diverge or this is
handled correctly.

**Design decision, stated explicitly so CC can challenge it if wrong:**
rather than adding a genuinely new, always-rendered section, this
CC-CMD makes ONE prose block that prefers `bundle.late` when present,
falling back to `bundle.morning_report` otherwise — reusing the
existing `.np-report` / "THE MORNING REPORT" section, not creating a
second one. This is correct AS LONG AS the two fields keep containing
the same content. **If a future change to Phase 10B ever makes `late`
genuinely distinct from `morning_report`, this merged-section approach
would then be wrong** (it would silently suppress real, different
content) — flagging this explicitly rather than letting it be a hidden
assumption. CC should re-verify the two fields are still identical (or
still substantively the same by design) via the PROBE BLOCK before
implementing, and STOP to report rather than proceed if they've
diverged since this doc was written.

**Target time:** ~20 min

## ENVIRONMENT CONSTRAINTS (copy verbatim)
- *.workers.dev:443 blocked from CC egress
- Playwright tests must run via GitHub Actions CI — never localhost
- api.github.com is reachable from CC bash
- No branch switching — work on main only
- 2 attempts max on any push — declare failure and stop if both fail

## CONFIDENCE GATE
Do not commit unless confidence ≥ 95.

## PROBE BLOCK (run before any edits) — MANDATORY, do not skip the live check
```bash
grep -n "function renderNewspaper" index.html
grep -n "function applyNewspaperVoice" index.html
grep -n "bundle.morning_report\|bundle.late" index.html
```
**Also required, live, before writing any code:**
```bash
curl -s "https://field-relay-nba.jeffunglesbee.workers.dev/analytics/newspaper/$(date -u +%Y-%m-%d)"
```
Compare the real current `late` and `morning_report` field values. If
they are NOT identical (or not clearly the-same-content-by-design) as
of today, STOP — this CC-CMD's merged-section design assumes they are,
and report the real current relationship instead of proceeding on a
stale assumption from 2026-07-04.

## TASK 1 — Merge late/morning_report into one section

Find (index.html ~21659, re-verify):
```javascript
  // 3. Morning Report
  if (bundle.morning_report) {
    parts.push(`<div class="np-section np-report"><div class="np-label">THE MORNING REPORT</div><p class="np-prose">${bundle.morning_report}</p></div>`);
  }
```
Replace with:
```javascript
  // 3. Morning Report (prefers bundle.late when present -- verified
  // 2026-07-04 to contain the same content as morning_report, sourced
  // from Phase 10B's copy of it. Merged into one section rather than
  // two to avoid showing the identical paragraph twice. See this
  // CC-CMD's own header note if the two fields ever diverge in content.
  const morningText = bundle.late || bundle.morning_report;
  if (morningText) {
    parts.push(`<div class="np-section np-report"><div class="np-label">THE MORNING REPORT</div><p class="np-prose">${morningText}</p></div>`);
  }
```
**Do not add a separate `.np-late` section anywhere else in the
function.** This is the entire change to `renderNewspaper()`.

## TASK 2 — applyNewspaperVoice: no change needed, confirm and state why

Because TASK 1 merges into the EXISTING `.np-report` section rather
than creating a new one, `applyNewspaperVoice()` requires no changes —
its handling of `.np-report` visibility (hidden during `'preview'`
voice, shown otherwise) already applies correctly to the merged
content. **Confirm this via code read, do not modify the function**,
and state this explicitly in the outbox rather than silently leaving it
untouched without comment.

## TASK 3 — Smoke assertions

```javascript
smoke.assert(!!html.match(/const morningText = bundle\.late \|\| bundle\.morning_report;/), 'A[NEXT]: newspaper prefers bundle.late over morning_report without duplicating content');
smoke.assert(!(/np-section np-late/.test(html)), 'A[NEXT+1]: no separate np-late section was added — regression guard against the exact duplication bug this CC-CMD exists to avoid');
```
(CC: assign real sequential A-numbers.)

## SCOPE BOUNDARY

DO:
- Merge `bundle.late`/`bundle.morning_report` into the one existing `.np-report` section, preferring `late`
- Confirm (don't modify) `applyNewspaperVoice` needs no change
- 2 smoke assertions
- Bump SW_VERSION

DO NOT:
- Create a new, separate `.np-late` section — this is the exact bug this CC-CMD exists to prevent
- Modify `applyNewspaperVoice`
- Touch the relay repo or the `circadian-late-newspaper-wire` bundle-assembly code — that's already shipped and correct
- Proceed with the merge design if the live PROBE BLOCK check finds `late`/`morning_report` are no longer the same content — stop and report instead

## DONE CONDITIONS
- [ ] Probe block re-run, including the mandatory live curl comparing `late` vs `morning_report` today
- [ ] If diverged: stopped and reported, did not implement the merge design blindly
- [ ] If still matching/same-by-design: `morningText = bundle.late || bundle.morning_report` implemented exactly as specified
- [ ] Confirmed via code read: `applyNewspaperVoice` untouched
- [ ] `node smoke.js index.html` exits 0 with both new assertions green
- [ ] CI confirms deployed
- [ ] SW_VERSION bumped
- [ ] Outbox manifest written to `docs/outbox/cc-newspaper-late-section-render-{date}.md`, explicitly recording the live late-vs-morning_report comparison result

**Deferred to chat — do NOT block your commit on this:**
- [ ] Real observation that the newspaper shows the merged section correctly (no duplicate text) on a live date where both fields are populated.

## COMPLIANCE
- Rule 47/ADR-002/RUWT: pure prose-section rendering, no composite scores, no interest values
- Rule 68: probe block first, including the mandatory live data comparison — do not implement the merge design on a stale assumption
- Rule 87: self-completing on the CC-verifiable portion; live visual confirmation deferred

## CONFIDENCE SCORING TABLE
+30  Live probe confirmed late/morning_report relationship before implementing (not skipped)
+30  Merge implemented exactly as specified, no separate np-late section added
+20  Smoke 2/2 green
+20  CI confirms deployed

## ONE-LINER
git pull. Read docs/CC-CMD-2026-07-04-newspaper-late-section-render.md.
MANDATORY: run the live curl comparing bundle.late vs bundle.morning_report
for today's date BEFORE writing any code — if they've diverged from this
doc's 2026-07-04 assumption, stop and report rather than implementing
the merge design blindly. If they still match, merge into the existing
.np-report section per TASK 1 -- do NOT create a separate .np-late
section, that is the exact duplication bug this CC-CMD prevents. Do not
commit unless confidence ≥ 95. If score < 95 report verbatim and stop —
do not invent results.
