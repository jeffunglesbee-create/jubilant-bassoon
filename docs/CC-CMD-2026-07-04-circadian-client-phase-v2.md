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

## TASK 1 — isGameOver(game) helper (handles the real, split vocabulary)

```javascript
// Handles the real, split terminal-state vocabulary confirmed live
// 2026-07-04: NHL/NBA/WC26 use 'final', MLB/NFL/CFB use 'post'. Treats
// both as terminal rather than assuming either is universal — re-verify
// via P1 above if a new adapter is added later and this stops matching.
function isGameOver(game) {
    return game.state === 'final' || game.state === 'post';
}
```

## TASK 2 — getCardCircadian(game)

```javascript
// Per-game circadian state. Pure function of game.state + elapsed time
// since final — no clock dependency, no global mode, no KV fetch.
// Matches "FIELD — Circadian System Spec Revised" (June 20-21 2026).
//
// CORRECTED v2.1: mapV2ToESPN() normalizes every game object's state to
// 'pre'/'in'/'post' before card-render code ever sees it — 'live' and
// 'final' (the relay's own raw vocabulary) never reach this function.
// Check BOTH, matching the codebase's own established defensive pattern
// (index.html:27127, 31210: `state === 'live' || state === 'in'`).
function getCardCircadian(game) {
    if (game.state === 'live' || game.state === 'in') return 'PRIME';
    if (game.state === 'pre') return 'PREVIEW';
    if (isGameOver(game)) {
        return minutesSinceFinal(game) < 120 ? 'NIGHT' : 'LATE';
    }
    return 'LATE'; // unknown/unexpected state — degrade safely, don't crash
}

// CORRECTED v2.1 — real, authorized implementation. No existing field
// carries a genuine finalized-at moment (confirmed: espnScoreTs is
// re-stamped on every poll, saveEspnFinal has only a date string,
// _seenFinals has no timestamp and resets on page load). Rather than
// adding a relay dependency (cross-repo, violates hard separation, and
// not needed), extend the EXISTING _seenFinals gate — it already fires
// exactly once per game at the exact moment a game is first observed
// final (checkForNewFinals, index.html:39475-39486). Add a companion
// map at that same, already-correct firing point.
//
// Find this exact block in checkForNewFinals (index.html ~39485-39486):
//   if(_seenFinals.has(game._id)) return;
//   _seenFinals.add(game._id);
// Change to:
//   if(_seenFinals.has(game._id)) return;
//   _seenFinals.add(game._id);
//   _finalizedAt[game._id] = Date.now();
// And declare the new map next to the existing Set (index.html ~39474):
//   const _seenFinals = new Set();
//   const _finalizedAt = {};  // NEW — gameId -> Date.now() at first-seen-final
//
// minutesSinceFinal then reads it:
function minutesSinceFinal(game) {
    const ts = _finalizedAt[game._id];
    // No recorded final time (e.g. game finished before this session's
    // checkForNewFinals ever ran, or page just loaded) — default to
    // LATE's safe, compressed treatment rather than guessing NIGHT's
    // enhanced one for a game we have no real timing evidence for.
    if (!ts) return Infinity;
    return (Date.now() - ts) / 60000;
}
```

**This is real, new client-side state (`_finalizedAt`), authorized
explicitly here — do not treat this as scope CC invented unprompted.**
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

## TASK 5 — Smoke assertions

```javascript
smoke.assert(typeof isGameOver === 'function', 'A[NEXT]: isGameOver function exists');
smoke.assert(typeof getCardCircadian === 'function', 'A[NEXT+1]: getCardCircadian function exists');
smoke.assert(getCardCircadian({state:'live'}) === 'PRIME', 'A[NEXT+2]: live state maps to PRIME');
smoke.assert(getCardCircadian({state:'pre'}) === 'PREVIEW', 'A[NEXT+3]: pre state maps to PREVIEW');
smoke.assert(typeof getNewspaperVoice === 'function', 'A[NEXT+4]: getNewspaperVoice function exists');
```
(CC: assign real sequential A-numbers — check smoke.js's current last
number first, do not guess.)

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
- [ ] `game.state === 'live' || game.state === 'in'` check confirmed present in getCardCircadian (v2.1 fix)
- [ ] `_finalizedAt` map added at the exact `_seenFinals.add(game._id)` point in `checkForNewFinals` (index.html ~39486) — confirm the real current line number before editing, this file changes
- [ ] `node smoke.js index.html` exits 0 with all 5 new assertions green
- [ ] CI Playwright confirms getCardCircadian/getNewspaperVoice exist in deployed bundle
- [ ] SW_VERSION bumped in index.html and sw.js
- [ ] Outbox manifest written to `docs/outbox/cc-circadian-client-phase-v2-{date}.md`, explicitly listing the deferred items below as "pending chat verification"

**Deferred to chat after your push — do NOT block your commit on these:**
- [ ] Real classification check against a currently-live game (PRIME) and a currently-finished game less than/more than 120min ago (NIGHT vs LATE) — requires *.workers.dev, chat will run this and report back via codex

## COMPLIANCE
- Rule 47/ADR-002/RUWT: PREVIEW/LATE variants show named states and existing chip/score data only — no new composite scores, no interest values
- Rule 68: probe block (P1/P3, both CC-reachable) must run and pass before any edits — this doc was itself revised 2026-07-04 after a sibling CC-CMD's confidence gate wrongly included CC-unreachable live checks in its own score
- Rule 87: self-completing — CC-verifiable done conditions checkable in-session; live conditions explicitly deferred, not blocking

## CONFIDENCE SCORING — CC-VERIFIABLE ONLY (commit once this hits 95; live checks below are deferred, not scored by you)
+25  P1 vocabulary re-check matches this doc's table (or discrepancy explicitly reconciled)
+25  getCardCircadian's live-state check matches BOTH 'live' and 'in' (v2.1 fix) — verify against the codebase's own existing pattern at index.html:27127/31210, not just this doc's say-so
+25  `_finalizedAt` correctly wired into the existing `_seenFinals` gate — same firing point, no new polling added
+25  Smoke 5/5 green + CI confirms functions deployed in the bundle

## ONE-LINER
git pull. Read docs/CC-CMD-2026-07-04-circadian-client-phase-v2.md. Run
the probe block FIRST, especially P1 — do not trust this doc's vocabulary
table without re-checking it live. Implement exactly as specified. Do not
commit unless confidence ≥ 95. If score < 95 report verbatim and stop —
do not invent results.
