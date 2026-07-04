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
the architecture wrong (see RETRACTED-*.md in this same docs/ folder for
what was wrong and why) — corrected here after live-verifying the actual
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

## PROBE BLOCK (run before any edits)
```bash
# P1 — re-verify the state vocabulary is still what this doc claims
# (read-only GitHub API call against field-relay-nba — do not edit that repo)
curl -s -H "Authorization: token \$FIELD_PAT" \
  "https://raw.githubusercontent.com/jeffunglesbee-create/field-relay-nba/main/src/index.js" \
  | grep -n "const state\s*="
# Expected: 6 lines matching the table above (3 'final', 3 'post', by sport).
# If the count or values differ, STOP and report — do not proceed on a
# stale assumption a second time.

# P2 — confirm current live game.state values across sports actually
# appearing in the real schedule right now
for sport in mlb nba nhl wnba afl nfl cfb wc26; do
  curl -s "https://field-relay-nba.jeffunglesbee.workers.dev/v2/games?sport=$sport" \
    | python3 -c "import json,sys; d=json.load(sys.stdin); print('$sport', set(g.get('state') for g in d.get('games',[])))"
done

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
function getCardCircadian(game) {
    if (game.state === 'live') return 'PRIME';
    if (game.state === 'pre') return 'PREVIEW';
    if (isGameOver(game)) {
        return minutesSinceFinal(game) < 120 ? 'NIGHT' : 'LATE';
    }
    return 'LATE'; // unknown/unexpected state — degrade safely, don't crash
}

// game.start is the pre-game start time (ISO). For finished games, if no
// explicit final timestamp field exists on the object, this needs a real
// probe of what timestamp IS available (check `linescores`/`situation`
// for a last-update field) before assuming game.start can substitute —
// CC: verify against a real finished game's actual fields before writing
// this function's body, do not guess a field name.
function minutesSinceFinal(game) {
    // PLACEHOLDER — CC must confirm the real field via a live probe of
    // an actual finished game's full object (not available in this
    // morning's probe since most games were still 'pre') before
    // finalizing this function. Report the field used in the outbox.
}
```

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
  design (see RETRACTED-relay.md)

## DONE CONDITIONS
- [ ] P1-P3 probes run and results match or explicitly reconcile with the table above
- [ ] `node smoke.js index.html` exits 0 with all 5 new assertions green
- [ ] CI Playwright confirms getCardCircadian/getNewspaperVoice exist in deployed bundle
- [ ] Manual verification against real live games in each of the 3 covered states (PRIME via a currently-live game if one exists at test time, PREVIEW via any upcoming game, LATE via any game finished >120min ago) — report which real game IDs were used for each check, do not simulate
- [ ] `minutesSinceFinal`'s actual field source confirmed against a real finished game object and documented in the outbox (this doc intentionally left it unresolved — see TASK 2 placeholder)
- [ ] SW_VERSION bumped in index.html and sw.js
- [ ] Outbox manifest written to `docs/outbox/cc-circadian-client-phase-v2-{date}.md`

## COMPLIANCE
- Rule 47/ADR-002/RUWT: PREVIEW/LATE variants show named states and existing chip/score data only — no new composite scores, no interest values
- Rule 68: probe block (including P1's live re-verification of the state vocabulary) must run and pass before any edits — this doc was itself written after a prior attempt skipped this exact check
- Rule 87: self-completing — done conditions checkable in-session

## CONFIDENCE SCORING TABLE
+20  P1 vocabulary re-check matches this doc's table (or discrepancy explicitly reconciled)
+20  getCardCircadian correctly classifies real live games in all 3 reachable states (PRIME/PREVIEW/LATE) at test time — NIGHT not required to test in-session if no game happens to be in that window, but reasoned through
+20  minutesSinceFinal's field source confirmed against a real object, not guessed
+20  Newspaper banner voice correctly reflects real aggregate game state at test time
+20  Smoke 5/5 green + CI confirms functions deployed

## ONE-LINER
git pull. Read docs/CC-CMD-2026-07-04-circadian-client-phase-v2.md. Run
the probe block FIRST, especially P1 — do not trust this doc's vocabulary
table without re-checking it live. Implement exactly as specified. Do not
commit unless confidence ≥ 95. If score < 95 report verbatim and stop —
do not invent results.
