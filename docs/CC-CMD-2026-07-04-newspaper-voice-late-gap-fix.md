# CC-CMD: Fix getNewspaperVoice's missing LATE bucket (all-LATE slate wrongly defaults to 'morning')

**Date:** 2026-07-04
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main
**Scope:** One function. Add a `LATE` bucket to `getNewspaperVoice`
(index.html ~6744) so a slate where every game is currently classified
`LATE` — none live, none recently-finished, none upcoming — no longer
falls through to the `'morning'` (show-everything) default.

**Why — real, traced gap, not hypothetical:** `getNewspaperVoice(games)`
buckets games into three counts only: `live` (`PRIME`), `finals`
(`NIGHT`), `upcoming` (`PREVIEW`). `LATE`-classified games are counted
in none of them. Traced the actual decision logic:
```javascript
if (live > 0) return 'minimal';
if (finals > upcoming) return 'recap';
if (upcoming > 0) return 'preview';
return 'morning';
```
As long as at least one game is `NIGHT`, the slate still correctly
resolves to `'recap'` (`finals > upcoming` only needs `finals >= 1` when
`upcoming === 0`). **The gap only manifests when `live === 0 && finals
=== 0 && upcoming === 0` but at least one game is genuinely present and
classified `LATE`** — every finished game's 120-minute freshness window
(`getCardCircadian`, index.html ~6710-6713: `minutesSinceFinal(game) <
120 ? 'NIGHT' : 'LATE'`) has expired, and nothing is live or upcoming.
In that state the function falls through to `'morning'`, which shows
*everything* (`morning_report`, `night_stars`, `truth_is`, `preview`,
`pick`, `streak_board` — `applyNewspaperVoice`, index.html ~21600). This
is the wrong default: `'morning'` is designed for "nothing has started
yet," but an all-`LATE` slate means the opposite — everything already
happened, just long enough ago that nothing is fresh. Surfacing
`preview`/`pick` content for games that finished hours ago reads as
stale and wrong.

**A real complication found while investigating, not glossed over:**
`getCardCircadian`'s `LATE` return value is **not exclusively** "finished
>120 min ago." Read the function directly (index.html ~6699-6717): its
final fallback branch —
```javascript
// CFL, Golf, and anything else with no recognized field: explicit,
// documented fallback — not a silent gap.
return 'LATE';
```
— also returns `LATE` for any game whose sport has no recognized live-
state field at all (CFL, Golf per the circadian v2.2 CC-CMD's own
documented scope boundary), or any game that simply hasn't been polled
yet. This means a `LATE` count could represent either "confirmed finished
a while ago" or "we genuinely don't know this game's state." **This
CC-CMD does not attempt to distinguish the two** — see PROBE BLOCK and
TASK 1's reasoning for why treating them the same for VOICE purposes
(not card-level treatment, which is unaffected either way) is judged
safe, and what to check before trusting that judgment.

**Target time:** ~20 min

## ENVIRONMENT CONSTRAINTS (copy verbatim)
- *.workers.dev:443 blocked from CC egress
- Playwright tests must run via GitHub Actions CI — never localhost
- api.github.com is reachable from CC bash
- No branch switching — work on main only
- 2 attempts max on any push — declare failure and stop if both fail

## CONFIDENCE GATE
Do not commit unless confidence ≥ 95 on the CC-verifiable portion. Real
observation that this produces the right newspaper voice on an actual
all-LATE slate (very late night / early morning, no live or upcoming
games, every finished game past the 120-min window) is deferred — that
requires a real clock/schedule state this session cannot force.

## PROBE BLOCK (run before any edits)
```bash
grep -n "^function getNewspaperVoice" index.html
grep -n "^function getCardCircadian" index.html
grep -n "^function applyNewspaperVoice" index.html
grep -n "^function isGameOver" index.html
```
Re-confirm all four functions' current bodies match what this doc
describes — this file changes daily. **Also check, before trusting this
doc's judgment call:** how often does the `LATE` bucket in practice
represent "unclassifiable" (CFL/Golf/unpolled) vs. "confirmed finished
long ago"? Grep `_renderAllCircadianGames.push` (index.html, inside
`renderAll`'s per-card loop) and trace whether CFL/Golf sections are
typically present alongside other sports on a real slate, or whether
they're rare/absent most nights. If CFL/Golf (or unpolled-at-page-load
games) are common enough that a `'recap'`-voice default would be
actively misleading for them specifically (e.g., a slate that's ALL
unpolled Golf leaderboard entries at page load, never anything
finished), STOP and reconsider — don't ship a blanket "LATE ⇒ recap"
rule without checking this.

## TASK 1 — Add a LATE bucket, defaulting the true gap to 'recap'

Find (index.html ~6744, re-verify):
```javascript
function getNewspaperVoice(games) {
  const live = games.filter(g => getCardCircadian(g) === 'PRIME').length;
  const finals = games.filter(g => getCardCircadian(g) === 'NIGHT').length;
  const upcoming = games.filter(g => getCardCircadian(g) === 'PREVIEW').length;
  if (live > 0) return 'minimal';
  if (finals > upcoming) return 'recap';
  if (upcoming > 0) return 'preview';
  return 'morning';
}
```
Replace with:
```javascript
function getNewspaperVoice(games) {
  const live = games.filter(g => getCardCircadian(g) === 'PRIME').length;
  const finals = games.filter(g => getCardCircadian(g) === 'NIGHT').length;
  const upcoming = games.filter(g => getCardCircadian(g) === 'PREVIEW').length;
  const late = games.filter(g => getCardCircadian(g) === 'LATE').length;
  if (live > 0) return 'minimal';
  if (finals > upcoming) return 'recap';
  if (upcoming > 0) return 'preview';
  // Real gap fixed here: previously fell through to 'morning' (show
  // everything) whenever every game was LATE and nothing was live/
  // recently-finished/upcoming -- the wrong default, since 'morning' is
  // "nothing has started yet" and an all-LATE slate means the opposite
  // (everything already happened, just outside the 120-min freshness
  // window). Reuses the existing 'recap' voice (no new section-visibility
  // logic needed in applyNewspaperVoice) rather than inventing a new
  // voice value for this case.
  if (late > 0) return 'recap';
  return 'morning';
}
```
**Do not modify `applyNewspaperVoice`** — it already handles `'recap'`
correctly (hides `.np-preview`/`.np-pick`, shows the rest), so reusing
this existing voice value for the all-`LATE` case requires zero changes
there.

## TASK 2 — Smoke assertions

```javascript
smoke.assert(!!html.match(/const late = games\.filter\(g => getCardCircadian\(g\) === 'LATE'\)\.length;/), 'A[NEXT]: getNewspaperVoice counts LATE games');
smoke.assert(!!html.match(/if \(late > 0\) return 'recap';\s*\n\s*return 'morning';/), 'A[NEXT+1]: an all-LATE slate (no live/finals/upcoming) resolves to recap, not the morning show-everything default');
```
(CC: assign real sequential A-numbers; verify both regexes actually
match your real committed code before trusting them, per this session's
own established discipline — do not assume the doc's exact whitespace
matches what you write.)

## SCOPE BOUNDARY

DO:
- Add exactly the `late` bucket and the one new `if (late > 0) return 'recap';` branch to `getNewspaperVoice`
- 2 smoke assertions
- Bump SW_VERSION

DO NOT:
- Modify `getCardCircadian`, `isGameOver`, `minutesSinceFinal`, or `applyNewspaperVoice` — all already correct, this CC-CMD only closes a gap in how their output is aggregated
- Attempt to distinguish "confirmed finished long ago" from "unclassifiable" within the `LATE` bucket — that would require changing `getCardCircadian`'s return contract (a much larger, separate change) and is explicitly out of scope here; if the PROBE BLOCK's investigation finds this conflation is actually a real problem in practice, STOP and report rather than redesigning `getCardCircadian` in this pass
- Invent a new voice value (e.g. `'quiet'` or `'stale'`) for the all-LATE case — reuse `'recap'`, which already has the correct section-visibility behavior for "nothing to show but past content"

## DONE CONDITIONS
- [ ] Probe block re-run, all four functions' current bodies confirmed
- [ ] PROBE BLOCK's CFL/Golf/unclassified-LATE investigation completed and reported, not skipped
- [ ] `late` bucket added, `if (late > 0) return 'recap';` branch added in the correct position (after the `upcoming > 0` check, before the `'morning'` fallback)
- [ ] Confirmed via code read: `applyNewspaperVoice` was not touched
- [ ] `node smoke.js index.html` exits 0 with both new assertions green
- [ ] CI confirms deployed
- [ ] SW_VERSION bumped
- [ ] Outbox manifest written to `docs/outbox/cc-newspaper-voice-late-gap-fix-{date}.md`, explicitly recording the CFL/Golf-conflation investigation's real findings

**Deferred to chat — do NOT block your commit on this:**
- [ ] Real observation, during an actual all-LATE window (very late night, nothing live/recent/upcoming), that the newspaper banner now shows the recap-appropriate sections instead of everything — needs a real clock/schedule state this session cannot force or simulate.

## COMPLIANCE
- Rule 47/ADR-002/RUWT: pure aggregation-logic fix, no new composite scores, no interest values, no change to what's fetched
- Rule 68: probe block first, including the CFL/Golf-conflation check — do not ship the "LATE ⇒ recap" rule on assumption alone
- Rule 87: self-completing on the CC-verifiable portion; live all-LATE-window observation is necessarily deferred

## CONFIDENCE SCORING TABLE
+30  `late` bucket and new branch added exactly as specified, in the correct position
+25  CFL/Golf/unclassified-LATE conflation investigated and reported (not skipped), with a reasoned conclusion on whether it's safe to treat uniformly
+20  Smoke 2/2 green
+25  CI confirms deployed

## ONE-LINER
git pull. Read docs/CC-CMD-2026-07-04-newspaper-voice-late-gap-fix.md.
Re-confirm all four functions' current bodies first (see PROBE BLOCK),
including the CFL/Golf/unclassified-LATE investigation — do not ship the
LATE-implies-recap rule on assumption alone. Add the late bucket to
getNewspaperVoice exactly as specified. Do not touch getCardCircadian,
isGameOver, minutesSinceFinal, or applyNewspaperVoice. Do not commit
unless confidence ≥ 95. If score < 95 report verbatim and stop — do not
invent results.
