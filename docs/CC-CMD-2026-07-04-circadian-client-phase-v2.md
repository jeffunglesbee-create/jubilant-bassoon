# CC-CMD: Per-game Circadian State (v2 — corrected, matches authoritative spec)

**Date:** 2026-07-04
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main
**Scope:** Steps 1-2 of "FIELD — Circadian System Spec Revised" (Drive
1KkpQtzHIM-sKHsWTON-VohAbTkEsnNeCShXsfSPiQiA, June 20-21 2026, status:
supersedes all prior circadian specs). Per-game circadian state + card
render variants + newspaper banner voice. Step 3 (The Debrief, NIGHT
variant) is explicitly OUT OF SCOPE — per the spec's own build order,
Steps 1-2 work fine using existing Night Owl content for NIGHT state
until The Debrief is built separately.
**Why:** This feature was fully specced June 20-21, unblocked (O(1)
Newspaper shipped) June 22, explicitly deferred the same day ("separate
spec"), and has not appeared in any CC-CMD, incident, or codex entry since
— it fell out of tracking entirely rather than being deprioritized. This
CC-CMD is the corrected version of an attempt made 2026-07-04 that got
the architecture wrong (see the retraction notices committed in place at
`CC-CMD-2026-07-04-circadian-kv-read-endpoint.md` in field-relay-nba and
`CC-CMD-2026-07-04-circadian-client-phase.md` in this repo — both
overwritten with SUPERSEDED notices, not renamed) — corrected here after live-verifying the actual
production data contract rather than trusting either the spec or the
retracted attempt.
**Target time:** ~2 hrs (matches the spec's own revised estimate for
Steps 1-2)

## ENVIRONMENT CONSTRAINTS (copy verbatim)
- *.workers.dev:443 blocked from CC egress (CC Playwright cannot reach live URL)
- Playwright tests must run via GitHub Actions CI — never localhost
- api.github.com is reachable from CC bash (read-only use against
  field-relay-nba for verification below — do NOT write to that repo,
  this CC-CMD is client-only)
- No branch switching — work on main only
- 2 attempts max on any push — declare failure and stop if both fail
- eslint baseline first before any code edit (npx eslint index.html)

## CONFIDENCE GATE
Do not commit unless confidence ≥ 95.

## CRITICAL CONTEXT — VERIFIED DATA CONTRACT (do not re-derive from memory)

Live-verified 2026-07-04 by grepping field-relay-nba's actual `const state =`
assignments (not the field name assumed by the original spec, which said
`game.status` — the real field is `game.state`):

| Adapter | Sport(s) | Terminal ("finished") value |
|---|---|---|
| adaptNhle | NHL | `'final'` |
| adaptNbaCDN | NBA | `'final'` |
| adaptESPNWCSoccer | WC26 | `'final'` |
| generic ESPN adapter | shared | `'post'` |
| adaptESPNFootball | NFL, CFB | `'post'` |
| adaptESPNMLB | MLB | `'post'` |

Live (`'in'` per the spec's own naming) and pre-game (`'pre'`) values are
consistent as `'live'` and `'pre'` across all adapters checked — only the
terminal state diverges. This is the same class of bug already found and
fixed in AmbientDO._poll() during the 2026-07-03 session (field-name/value
mismatches against the real V2 response shape) — never previously checked
here because this feature was never picked up.

**Do not assume this table is exhaustive or permanently stable.** New
adapters get added (NFL/CFB were added 2026-07-03, after the original
spec was written). TASK 1 below includes a probe step to re-verify this
before writing the function, and the function itself is written to treat
BOTH values as terminal rather than picking one.

## CORRECTION (v2.1, same day) — CC found two real bugs and correctly refused to guess a third

A prior CC run against this doc found, live-verified against real source
(not assumed), and correctly declined to paper over:

1. **The vocabulary this doc verified is not what the client ever
   renders against.** `mapV2ToESPN()` (index.html:16876) normalizes
   every relay game object's `state` to `'pre'/'in'/'post'` BEFORE it's
   ever stored or reachable by card-render code — `'live'` and `'final'`
   (this doc's Task 1 vocabulary) never survive past that function. As
   literally specified, `getCardCircadian`'s `game.state === 'live'`
   branch would never fire against a real card; every live game would
   fall through to the default `'LATE'` branch instead of `'PRIME'`.
   Confirmed independently via 15+ existing defensive checks already in
   the codebase pairing `'live'` with `'in'` (e.g. index.html:27127:
   `if (g.state === 'live' || g.state === 'in') ...`, and
   index.html:31210). **Fixed below: TASK 2 now checks both.**

2. **`minutesSinceFinal` has no field to derive from, confirmed not
   guessed.** CC checked every real candidate: `espnScoreTs[key]`
   re-stamps to `Date.now()` on every poll of an already-final game (no
   guard against rewriting an unchanged final) — reflects "last poll,"
   not "went final," unusable for a 120-min threshold. `saveEspnFinal`'s
   persisted entry has only a calendar-date string, not a precise
   moment. `_seenFinals` itself is an ID-only Set with no timestamp,
   reset on every page load. **Correctly, CC did not invent new state
   unprompted. Authorizing it now below: TASK 2 adds one.**

3. **My own doc had a bad reference** — "see RETRACTED-*.md" was
   descriptive shorthand, not a real filename; CC correctly reported no
   such file exists. The real files are
   `CC-CMD-2026-07-04-circadian-kv-read-endpoint.md` (field-relay-nba)
   and `CC-CMD-2026-07-04-circadian-client-phase.md` (this repo) — both
   overwritten in place with retraction notices, not renamed. Fixed
   below.


```bash
# P1 — re-verify the state vocabulary is still what this doc claims
# (raw.githubusercontent.com is reachable from CC — this is NOT the same
# as *.workers.dev, do not confuse the two)
curl -s -H "Authorization: token \$FIELD_PAT" \
  "https://raw.githubusercontent.com/jeffunglesbee-create/field-relay-nba/main/src/index.js" \
  | grep -n "const state\s*="
# Expected: 6 lines matching the table above (3 'final', 3 'post', by sport).
# If the count or values differ, STOP and report — do not proceed on a
# stale assumption a second time.

# P2 — CANNOT BE RUN BY CC. field-relay-nba.jeffunglesbee.workers.dev is
# *.workers.dev — confirmed structurally blocked from CC egress (this is
# the exact issue that caused a sibling CC-CMD to stall today; do not
# attempt this, do not let a stop-hook force a commit while stuck on it).
# Chat will run this after your push and report results via codex:
#   for sport in mlb nba nhl wnba afl nfl cfb wc26; do
#     curl -s "https://field-relay-nba.jeffunglesbee.workers.dev/v2/games?sport=$sport" ...
#   done
# Proceed using P1's vocabulary table (grepped directly from source,
# confirmed accurate as of 2026-07-04). Chat ran this exact P2 check on
# 2026-07-04 01:30 UTC and found ONLY 'pre' states across all 8 sports
# (no live or finished games at that hour) — this confirms 'pre' handling
# is consistent but does NOT fully exercise the 'final'/'post' terminal-
# state split from P1. That split is still unconfirmed against real live
# data. Do not treat this as fully verified — it's partially verified,
# stated honestly. If your own execution window happens to catch a real
# live or finished game, use that as the real confirmation and report
# which game ID was used.

# P3 — confirm renderNewspaper / fetchNewspaper still exist at expected
# locations (this CC-CMD extends them, doesn't replace them)
grep -n "function fetchNewspaper\|function renderNewspaper\|function bootNewspaper" index.html
```
If P1 shows a vocabulary this doc didn't anticipate (a third terminal
string, or a sport not in the table), do not guess — stop, report the
actual values found, and treat this as a new probe finding requiring a
doc update before continuing.

## CORRECTION (v2.2, same day) — cross-sport scope gap found via live browser inspection

A later chat session opened the live PWA directly (browser automation,
not simulated) and traced `getCardCircadian` against every currently
loaded game across every sport. Result: **it only worked for WC26.**
Real field-by-field findings, verified against actual loaded game
objects, not assumed:

| Sport | Live-state field | Value(s) seen |
|---|---|---|
| WC26 | `game.state` | `'pre'/'in'/'post'` (via `mapV2ToESPN`) — v2.1's fix was correct for this one sport |
| MLB | `game.status` (NOT `state` — field doesn't exist) | `'pregame'/'live'/'final'/'postponed'` — confirmed via reading `normalizeMLBStatus()`, index.html:19788 |
| AFL | neither `state` nor `status` exists | has `_aflComplete` (0-100 numeric, index.html:21995: `_aflComplete: g.complete`) |
| CFL | neither `state`/`status`/any completion field exists | genuinely no signal available on the base object |
| Golf | neither `state`/`status`/any completion field exists | only a separate leaderboard-fetch subsystem, nothing on the base game object |

**Also found: the codebase's existing `getStatus(iso, opts)` helper
(index.html:6636) is NOT safe to reuse here.** It conflates "hasn't
started yet" and "already finished" into the same return string,
`"upcoming"` — confirmed by reading its own source, not assumed. Its
existing caller (the schedule picker, index.html:9126) never needed to
tell those two apart, so this was never a bug until something
(circadian) actually needed the distinction. Do not route through
`getStatus()` for circadian purposes.

**TASK 1/2 below are corrected to handle MLB (real fields) and AFL
(real field) properly. CFL and Golf are explicitly, intentionally left
on the LATE default — not silently, this doc states why: no reliable
completion signal exists on their base game objects, and inventing one
(e.g., guessing at start_time + a fixed duration) risks being
confidently wrong rather than honestly conservative. This is a real
scope boundary, not laziness — closing it needs its own investigation
into whatever data these sports' adapters actually have access to,
which is out of scope for this pass.**
## TASK 1 — isGameOver(game) helper (cross-sport, v2.2)

```javascript
// v2.2: handles the real, per-sport-adapter vocabulary split confirmed
// via live browser inspection 2026-07-04 -- WC26 uses game.state,
// MLB uses a completely different field (game.status) with its own
// vocabulary. Re-verify via the CC-CMD's probe block if a new adapter
// shape is added later and this stops matching.
function isGameOver(game) {
    if (game.state === 'final' || game.state === 'post') return true;       // WC26/V2-normalized sports
    if (game.status === 'final' || game.status === 'postponed') return true; // MLB (normalizeMLBStatus vocabulary)
    if (typeof game._aflComplete === 'number' && game._aflComplete >= 100) return true; // AFL
    return false;
}
```

## TASK 2 — getCardCircadian(game), v2.2

```javascript
// Per-game circadian state. Cross-sport, per-adapter field awareness --
// see the v2.2 correction note above for exactly which sports are
// covered and which are explicitly out of scope this pass.
function getCardCircadian(game) {
    // PRIME (live)
    if (game.state === 'live' || game.state === 'in') return 'PRIME';           // WC26/V2
    if (game.status === 'live') return 'PRIME';                                  // MLB
    if (typeof game._aflComplete === 'number' && game._aflComplete > 0 && game._aflComplete < 100) return 'PRIME'; // AFL

    // PREVIEW (not started)
    if (game.state === 'pre') return 'PREVIEW';           // WC26/V2
    if (game.status === 'pregame') return 'PREVIEW';       // MLB
    if (game._aflComplete === 0) return 'PREVIEW';         // AFL, explicit 0 (not merely absent/undefined)

    // NIGHT/LATE (over)
    if (isGameOver(game)) {
        return minutesSinceFinal(game) < 120 ? 'NIGHT' : 'LATE';
    }

    // CFL, Golf, and anything else with no recognized field: explicit,
    // documented fallback -- not a silent gap. See v2.2 correction note.
    return 'LATE';
}

// v2.1's minutesSinceFinal is unchanged in v2.2 -- the _finalizedAt
// mechanism is sport-agnostic (keyed on game._id, populated by
// checkForNewFinals regardless of which sport a game belongs to), so it
// needs no per-sport awareness. Confirmed live: it already recorded
// real timestamps for two AFL games during the same browser session
// that found the classification gap above.
function minutesSinceFinal(game) {
    const ts = _finalizedAt[game._id];
    // No recorded final time (e.g. game finished before this session's
    // checkForNewFinals ever ran, or page just loaded) -- default to
    // LATE's safe, compressed treatment rather than guessing NIGHT's
    // enhanced one for a game we have no real timing evidence for.
    if (!ts) return Infinity;
    return (Date.now() - ts) / 60000;
}
```

**`_finalizedAt` wiring (index.html ~39474/39486, inside
`checkForNewFinals`) is unchanged from v2.1 -- still required, still the
right approach, confirmed working live via direct browser inspection
(two real AFL games recorded real timestamps during the same session
that found the classification gap above). This is real, new client-side
state, authorized explicitly here -- do not treat this as scope CC
invented unprompted. It reuses the existing, already-correct
`_seenFinals` firing point rather than adding new polling or a relay
dependency.**

It reuses the existing, already-correct `_seenFinals` firing point
rather than adding new polling or a relay dependency.

## TASK 3 — Card render variants (PREVIEW, LATE only — NIGHT reuses existing Night Owl, PRIME reuses existing live rendering)

Per the spec: PRIME and NIGHT already have adequate existing treatment
(live scores render already; Night Owl already exists for post-game).
This CC-CMD only needs to add the two variants that don't have dedicated
treatment today:

- **PREVIEW**: stakes/pick recommendation line + full broadcast chip row
  (find the existing card template's chip-row rendering as the anchor —
  do not build a new chip system, reuse it)
- **LATE**: compressed rendering — final score + one-line recap, dimmed
  card treatment (opacity, matches VIEWPORT-V4-SPEC.md's --opacity-seen
  token if it exists — verify via grep before assuming; if it doesn't
  exist, use a literal 0.6 opacity and note this as a gap)

Wire `getCardCircadian(game)` into the existing card-render function at
whatever point game objects are mapped to DOM — find via grep for the
existing per-game render loop (likely near `renderAll` or equivalent from
the June 22 newspaper CC-CMD's own reference points).

## TASK 4 — getNewspaperVoice(games) + banner section visibility

```javascript
// Aggregate voice for the newspaper banner (already fetched via
// fetchNewspaper — this ADDS section visibility logic, does not
// change what's fetched).
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

Wire into `renderNewspaper` (from the June 22 CC-CMD) to show/hide
existing sections per voice — this bundle already contains all the
content (morning_report, night_stars, truth_is, preview, pick,
streak_board per the existing /analytics/newspaper/{date} response), so
this is pure section visibility, NOT a new fetch:
- `'minimal'` → banner shrinks/hides, schedule leads
- `'recap'` → show morning_report + night_stars + truth_is + streak_board, hide preview/pick
- `'preview'` → show preview + pick + streak_board, hide morning_report/night_stars/truth_is
- `'morning'` → show everything (current default behavior — no change)

## TASK 5 — Smoke assertions (v2.2 — cross-sport coverage)

```javascript
smoke.assert(typeof isGameOver === 'function', 'A[NEXT]: isGameOver function exists');
smoke.assert(typeof getCardCircadian === 'function', 'A[NEXT+1]: getCardCircadian function exists');
smoke.assert(getCardCircadian({state:'live'}) === 'PRIME', 'A[NEXT+2]: WC26/V2 live state maps to PRIME');
smoke.assert(getCardCircadian({state:'pre'}) === 'PREVIEW', 'A[NEXT+3]: WC26/V2 pre state maps to PREVIEW');
smoke.assert(getCardCircadian({status:'live'}) === 'PRIME', 'A[NEXT+4]: MLB live status maps to PRIME');
smoke.assert(getCardCircadian({status:'pregame'}) === 'PREVIEW', 'A[NEXT+5]: MLB pregame status maps to PREVIEW');
smoke.assert(getCardCircadian({_aflComplete:50}) === 'PRIME', 'A[NEXT+6]: AFL partial completion maps to PRIME');
smoke.assert(getCardCircadian({_aflComplete:0}) === 'PREVIEW', 'A[NEXT+7]: AFL zero completion maps to PREVIEW');
smoke.assert(getCardCircadian({}) === 'LATE', 'A[NEXT+8]: unrecognized shape (CFL/Golf/other) degrades to LATE, not a crash');
smoke.assert(typeof getNewspaperVoice === 'function', 'A[NEXT+9]: getNewspaperVoice function exists');
```
(CC: assign real sequential A-numbers — check smoke.js's current last
number first, do not guess. 9 assertions now, not 5 — v2.2 added 4 to
cover MLB/AFL/fallback explicitly.)

## SCOPE BOUNDARY

DO:
- isGameOver, getCardCircadian, minutesSinceFinal, getNewspaperVoice
- PREVIEW and LATE card render variants only
- Newspaper section visibility per voice
- 5 smoke assertions
- Bump SW_VERSION

DO NOT:
- Build The Debrief (Step 3, separate CC-CMD, ~180 min per spec, has its
  own relay Phase 13 dependency)
- Touch field-relay-nba at all (read-only verification via raw.githubusercontent.com is fine, no writes)
- Add clock-based fallback logic — the spec is explicit that schedule
  state should be sufficient; if a game object is ever missing `state`
  entirely, degrade to LATE (already handled in TASK 2's default branch)
  rather than reaching for the clock
- Implement per-sport global modes (June 15 model) — superseded by the
  per-game model, do not resurrect it
- Wire the orphaned KV circadian keys — confirmed not needed by this
  design (see the retraction notice at `CC-CMD-2026-07-04-circadian-kv-read-endpoint.md`, field-relay-nba)

## DONE CONDITIONS

**CC completes and commits once these are done — do not wait past this list:**
- [ ] P1 and P3 probes run and pass before any edit (P2 is chat-only, see above)
- [ ] `isGameOver`/`getCardCircadian` handle all three verified shapes (WC26 `state`, MLB `status`, AFL `_aflComplete`) exactly as specified in TASK 1/2 — v2.2
- [ ] CFL/Golf explicitly NOT given invented logic — confirm the fallback `return 'LATE'` path is what handles them, not a guessed field check
- [ ] `_finalizedAt` map added at the exact `_seenFinals.add(game._id)` point in `checkForNewFinals` (index.html ~39486) — confirm the real current line number before editing, this file changes
- [ ] `node smoke.js index.html` exits 0 with all 9 new assertions green (v2.2 added 4)
- [ ] CI Playwright confirms getCardCircadian/getNewspaperVoice exist in deployed bundle
- [ ] SW_VERSION bumped in index.html and sw.js
- [ ] Outbox manifest written to `docs/outbox/cc-circadian-client-phase-v2-{date}.md`, explicitly listing the deferred items below as "pending chat verification"

**Deferred to chat after your push — do NOT block your commit on these:**
- [ ] Real classification check against currently-live/finished games across MLB and AFL specifically (WC26 and the _finalizedAt mechanism itself were already confirmed live via direct browser inspection prior to this v2.2 revision — this deferred item is now scoped to MLB/AFL only)

## COMPLIANCE
- Rule 47/ADR-002/RUWT: PREVIEW/LATE variants show named states and existing chip/score data only — no new composite scores, no interest values
- Rule 68: probe block (P1/P3, both CC-reachable) must run and pass before any edits — this doc was itself revised twice (v2.1, v2.2) after live verification each time found a real gap the prior version missed
- Rule 87: self-completing — CC-verifiable done conditions checkable in-session; live conditions explicitly deferred, not blocking

## CONFIDENCE SCORING — CC-VERIFIABLE ONLY (commit once this hits 95; live checks below are deferred, not scored by you)
+20  P1 vocabulary re-check matches this doc's table (or discrepancy explicitly reconciled)
+20  getCardCircadian correctly handles all three verified shapes (WC26 state, MLB status, AFL _aflComplete) — verify each against this doc's cited source lines, not just this doc's say-so
+20  CFL/Golf confirmed to hit the explicit LATE fallback, not a crash or a guessed field check
+20  `_finalizedAt` correctly wired into the existing `_seenFinals` gate — same firing point, no new polling added
+20  Smoke 9/9 green + CI confirms functions deployed in the bundle

## ONE-LINER
git pull. Read docs/CC-CMD-2026-07-04-circadian-client-phase-v2.md. Run
the probe block FIRST, especially P1 — do not trust this doc's vocabulary
table without re-checking it live. Implement exactly as specified. Do not
commit unless confidence ≥ 95. If score < 95 report verbatim and stop —
do not invent results.

## CORRECTION (v2.3, same day) — classification never refreshes after initial render

A later chat session opened the live PWA and found every MLB card frozen
at whatever circadian state it had when the page first loaded —
including games confirmed (via direct JS check) to have `status:'final'`
still showing `data-circadian="PRIME"` in the live DOM, with stale
`"0-0 0:00'"` placeholder text. Root cause, confirmed by reading actual
source (not inferred): `getCardCircadian` is only invoked once, inside
`renderAll()`'s card-template string (index.html ~10659). Live score
updates for in-progress/finished games are handled by a SEPARATE
function, `renderESPNScores()` (index.html:20960), which patches
`.score-wrap` and toggles `espn-live`/`espn-final` classes directly on
the existing card element (index.html:21119: `card.classList.remove
("espn-live","espn-final"); if(isLive) card.classList.add("espn-live");
if(isFinal) card.classList.add("espn-final");`) WITHOUT ever calling
`renderAll()` again or touching `data-circadian`/`circadian-*`. This is
a legitimate, intentional performance pattern (avoiding a full ~77KB DOM
rebuild on every score poll, per the comment at index.html:10302) — it
just was never extended to also refresh circadian state, since v2.1/v2.2
only wired the classification into the one-time render path and never
checked whether it needed to survive subsequent partial updates.

**The fix is small and low-risk: mirror the exact existing
`espn-live`/`espn-final` toggle pattern, in the same function, using the
same already-computed `isLive`/`isFinal` (from `_n.state`, ESPN-based
cross-sport score matching — this already reliably tracks live/final
transitions for MLB/AFL/every sport via ESPN score matching, the same
mechanism `_isLiveOrFinal` a few lines above already relies on).** No
new field-reading logic needed here — `_n.state` in THIS function's
scope already normalizes to the same `'in'/'post'` shape `getCardCircadian`
expects for its WC26/V2 branch, so this call site doesn't even need the
MLB/AFL-specific branches added in v2.2 — those remain necessary for the
one-time `renderAll()` path (since MLB/AFL's *own* native adapters set
`game.status`/`_aflComplete` at fetch time, separately from ESPN score
matching), but this ESPN-score-matching path already has a
cross-sport-normalized signal for free.

## TASK 6 — Wire circadian refresh into renderESPNScores() (v2.3)

Find this exact block in `renderESPNScores()` (index.html ~21119-21122,
re-verify the real current line number before editing — this file
changes):
```javascript
      // Update card class for accent colour
      card.classList.remove("espn-live","espn-final");
      if(isLive)  card.classList.add("espn-live");
      if(isFinal) {
```
Immediately after the `card.classList.remove("espn-live","espn-final");`
line (before the `if(isLive)`/`if(isFinal)` toggles, order doesn't
matter but keep them adjacent for readability), add:
```javascript
      // v2.3: circadian classification must be refreshed here too --
      // it's otherwise only computed once at renderAll() time and goes
      // stale the moment a game's real status changes afterward (the
      // exact bug this fix closes: MLB games showing PRIME long after
      // going final). Reuses this function's own already-normalized
      // isLive/isFinal (from _n.state) -- no new field-reading needed,
      // this is the same signal already driving espn-live/espn-final.
      const _newCircadian = isFinal
          ? (getCardCircadian({state:'post', _id: game._id}))
          : isLive
              ? 'PRIME'
              : card.dataset.circadian; // no signal change -- leave as-is rather than guessing
      if (_newCircadian && _newCircadian !== card.dataset.circadian) {
          card.classList.remove('circadian-prime','circadian-preview','circadian-night','circadian-late');
          card.classList.add('circadian-' + _newCircadian.toLowerCase());
          card.dataset.circadian = _newCircadian;
      }
```

**Why call `getCardCircadian({state:'post', _id: game._id})` instead of
hardcoding `'NIGHT'` or `'LATE'` directly:** reuses the same
`minutesSinceFinal`/`_finalizedAt` logic already governing the
NIGHT-vs-LATE split elsewhere, so a game that JUST went final via this
path gets the same real timing-based treatment as one detected via
`checkForNewFinals` -- avoids two different finals-classification
systems disagreeing with each other.

## SCOPE BOUNDARY (v2.3 addendum)

DO:
- Wire the refresh into `renderESPNScores()` exactly as specified above
- Reuse existing `isLive`/`isFinal`/`getCardCircadian` -- no new field-reading logic

DO NOT:
- Touch the `renderAll()` card-template path -- that's already correct (v2.2)
- Add a new polling loop or timer -- `renderESPNScores()` already runs on
  whatever cadence it currently does; this fix piggybacks on that
  existing cadence, it doesn't change it
- Attempt to fix CFL/Golf's classification freshness here -- they don't
  have a working classification to refresh in the first place (v2.2's
  documented scope boundary), so there's nothing for this fix to do for
  them yet

## DONE CONDITIONS (v2.3)
- [ ] Exact current line number of the `espn-live`/`espn-final` toggle block re-confirmed before editing (file changes daily)
- [ ] New circadian-refresh block added immediately adjacent, using the pattern above verbatim
- [ ] `node smoke.js index.html` exits 0 -- note: this fix touches a function `renderESPNScores()` that likely has no existing circadian-specific smoke coverage; add ONE new assertion confirming the refresh block exists (`smoke.assert(src.includes("_newCircadian"), 'A[NEXT]: renderESPNScores refreshes circadian classification')`) rather than zero
- [ ] SW_VERSION bumped
- [ ] **Deferred to chat, cannot be verified by CC:** open the live PWA in a real browser (or via the CI-as-proxy pattern if feasible for this kind of DOM-level check), find a real card that is `status:'final'`/`_n.state === 'post'`, and confirm its `data-circadian` attribute updates to `NIGHT` or `LATE` on the next live-score poll cycle, not just that the code exists. This is the exact failure mode that shipped silently in v2.1/v2.2 -- code existing and being correct is not sufficient evidence; the actual DOM must be observed changing.

## ONE-LINER (v2.3)
git pull. Read docs/CC-CMD-2026-07-04-circadian-client-phase-v2.md,
specifically the v2.3 correction and TASK 6. Re-confirm the exact
current line number of the espn-live/espn-final toggle block before
editing. Implement exactly as specified. Do not commit unless confidence
≥ 95 on the CC-verifiable portion (code correctness, smoke assertion
exists). The DOM-refresh-over-time verification is explicitly deferred
to chat -- do not attempt to simulate it, do not skip the fix because
you can't verify it end-to-end yourself.
