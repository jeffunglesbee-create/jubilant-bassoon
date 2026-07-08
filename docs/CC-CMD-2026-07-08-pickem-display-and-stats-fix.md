# CC-CMD: Fix Pick 'em's three display/data bugs — stats-section field mismatch, and two probability scale bugs

**Date:** 2026-07-08
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR

## CONTEXT — READ BEFORE STARTING

This CC-CMD came out of a direct investigation (not a bug report) into how
win probability is displayed and how picks are tracked in Pick 'em, prompted
by this session's field-relay-nba work finally making real win-probability
resolution work for most sports (previously most picks got `null`
probabilities and these bugs were largely invisible — they're about to
become visible to real users now that resolution actually succeeds).

Three independent, confirmed bugs were found, all client-side display/data-
access issues — the relay's data is correct in all three cases (Rule 60: the
relay owns the data contract; here the *client* has drifted from it, not the
other way around). No relay change is needed or proposed.

### Bug 1 — Per-pick probability displayed at 100x too small

`buildPickWidgetHTML` (`index.html`, function defined ~line 28049) renders
`${esc(pick.resolvedProbability)}%` directly. The relay's `resolveWinProbability`
(`field-relay-nba/src/wp-resolver.js`) returns `probability` as a 0-1
fraction (confirmed extensively via live testing this session — `0.579`,
`0.889`, etc., always `Math.round(prob * 1000) / 1000`). The client never
multiplies by 100 before display. Real users see e.g. **"Statistical
probability: 0.579%"** instead of "57.9%" — reads as "essentially zero
percent," the opposite of the intended meaning.

### Bug 2 — Cumulative accuracy stat displayed at the wrong scale

`buildPickEmStatsSection` (`index.html`, function defined ~line 8872) does
`Math.round(st.accuracyRate) + '%'`. The relay's `/user/state` handler
(`field-relay-nba/src/user-do.js`, `_handleState`) computes `accuracyRate`
as `Math.round((totalCorrect / totalMade) * 1000) / 1000` — a 0-1 fraction.
`Math.round()` on any value strictly between 0 and 1 returns either `0` or
`1`, so this can only ever display **"0%" or "1%"**, never a real accuracy
percentage (e.g. "67%" for 2/3 correct is architecturally impossible with
this code).

### Bug 3 — Wrong field nesting means the entire stats section never renders real data (the most severe of the three)

`buildPickEmStatsSection` reads `st.totalMade`, `st.totalCorrect`,
`st.accuracyRate` directly off `st` (`window._userState`, populated verbatim
from the relay's `/user/state` JSON response — confirmed via
`fetchUserState()`, `index.html` ~line 28227-28239, no flattening step
exists between fetch and assignment). But the relay's actual response
nests these three fields under a `picks` object:

```javascript
// field-relay-nba src/user-do.js _handleState, current real shape:
{
  ok: true, syncToken,
  watchHistory: [...], seriesLedger: {...}, dramaticMomentsMissed: [...],
  picks: { totalMade, totalCorrect, accuracyRate },   // <-- nested
  updatedAt,
}
```

So `st.totalMade` is always `undefined` (the real value lives at
`st.picks.totalMade`). `undefined != null` is `false` in JavaScript, so
`hasStats` (`st && (st.totalMade != null || st.totalCorrect != null ||
st.accuracyRate != null)`) is **always false**, regardless of how many
picks the user has actually made. The Pick 'em stats section — "Your
prediction record," shown in the app's Settings panel — has displayed
**"no picks yet — make one from any upcoming game card" to every user,
always, since this feature was built.** Bug 2's scale issue is currently
dead code in practice: it never executes, because bug 3 always routes to
the empty-state branch first.

### Not a bug — a real design question, explicitly out of scope here

For MLB/NBA/WNBA (the relay's ESPN-native branch) and the WC soccer branch,
`resolveWinProbability` always reads the *last* entry in ESPN's
`winprobability[]` array (`wp-resolver.js`, three call sites, all
`wps[wps.length - 1]`) — since resolution fires after the game ends, this is
the win-probability model's *final* tick, which trends to ~0% or ~100% for
any decided game. This restates the outcome the user already knows rather
than describing how confident the pick looked *at pick time* — arguably not
useful as a "was this a good pick" signal, unlike AFL (Kali/Squiggle, which
uses stable pre-round predictions) or the odds-api sports (closer to
market expectation, though still resolution-time rather than pick-time).
**This CC-CMD does not address this.** It's a real product question (should
ESPN-native sports track win probability from an earlier tick, e.g. first
reading at/after the pick's timestamp?) that needs its own decision and its
own CC-CMD — folding it in here would conflate a data-correctness fix with
a product-behavior change.

### Accuracy/trust — confirmed clean, not part of the fix

`wasCorrect` is computed entirely client-side from real final scores
(`_resolvePickIfExists`, `index.html` ~line 28085: `winner = awayScore >
homeScore ? game.away : game.home; wasCorrect = pick.predictedWinner ===
winner`), completely independent of any WP source. None of the WP
resolution bugs fixed on the relay this session ever touched win/loss
correctness. The relay's underlying `totalMade`/`totalCorrect` counts are
and always have been accurate — they've simply never been visible due to
Bug 3. No fix needed for this; noted for completeness so it isn't
re-investigated.

## PROBE BLOCK (run before any edits)

```bash
git log --oneline -3
# Confirm current HEAD.

grep -n "^function buildPickEmStatsSection" index.html
sed -n '/^function buildPickEmStatsSection/,/^}/p' index.html
# Re-read the exact, current function before editing — confirm it still
# matches this doc's description (st.totalMade/st.totalCorrect/
# st.accuracyRate read directly off st, Math.round(st.accuracyRate)+'%').

grep -n "^function buildPickWidgetHTML" index.html
sed -n '/^function buildPickWidgetHTML/,/^}/p' index.html
# Confirm the exact probLine construction before editing.

grep -n "picks: {" ../field-relay-nba/src/user-do.js 2>/dev/null || echo "field-relay-nba not cloned in this session -- re-clone or trust this doc's quoted shape only after independently re-confirming via a live /user/state fetch"
# If field-relay-nba is accessible, confirm the relay's real current
# response shape hasn't changed since this doc was written. If it isn't
# cloned, do a live fetch instead (see VERIFICATION).

node --check index.html 2>&1 | head -5 || true
# Expected to fail (not a JS file) -- this is not the real syntax check,
# see the field_smoke.js / smoke.js commands below for the real one.
```

## TASK 1 — Fix per-pick probability scale (Bug 1)

In `buildPickWidgetHTML`, replace the `probLine` construction:

```javascript
// Before:
const probLine = (pick.resolvedProbability != null && pick.probabilityLabel)
  ? `<span class="pick-prob">${esc(pick.probabilityLabel)}: ${esc(pick.resolvedProbability)}%</span>` : '';

// After:
const probPct = pick.resolvedProbability != null
  ? (pick.resolvedProbability * 100).toFixed(1) : null;
const probLine = (probPct != null && pick.probabilityLabel)
  ? `<span class="pick-prob">${esc(pick.probabilityLabel)}: ${esc(probPct)}%</span>` : '';
```

One decimal place (`toFixed(1)`) matches the relay's own precision (it
rounds to the nearest 0.001 on the 0-1 scale, i.e. nearest 0.1 on the 0-100
scale) — this is a suggested default, not a fixed requirement; change if a
different precision is preferred, but state the choice explicitly in the
outbox either way rather than picking silently.

## TASK 2 — Fix stats-section field nesting AND accuracy scale (Bugs 2 + 3, same function)

In `buildPickEmStatsSection`, both issues live in the same few lines —
fix together, verify together:

```javascript
// Before:
function buildPickEmStatsSection(){
  const st = (typeof window !== 'undefined') ? window._userState : null;
  const hasStats = st && (st.totalMade != null || st.totalCorrect != null || st.accuracyRate != null);
  const body = hasStats
    ? `<div class="jq-row"><span class="jq-k">made</span><span class="jq-v">${st.totalMade ?? 0}</span><span class="jq-k">correct</span><span class="jq-v">${st.totalCorrect ?? 0}</span><span class="jq-k">accuracy</span><span class="jq-v">${st.accuracyRate != null ? Math.round(st.accuracyRate) + '%' : '—'}</span></div>`
    : `<span class="jq-empty">no picks yet — make one from any upcoming game card</span>`;
  return `<div class="jq-quality-section pick-em-section">
    <div class="jq-section-title">Pick 'em</div>
    <div class="jq-section-sub">Your prediction record. Read-only.</div>
    ${body}
  </div>`;
}

// After:
function buildPickEmStatsSection(){
  const st = (typeof window !== 'undefined') ? window._userState : null;
  const picks = st && st.picks; // relay nests these three fields under `picks` -- confirmed live, /user/state response shape
  const hasStats = picks && (picks.totalMade != null || picks.totalCorrect != null || picks.accuracyRate != null);
  const body = hasStats
    ? `<div class="jq-row"><span class="jq-k">made</span><span class="jq-v">${picks.totalMade ?? 0}</span><span class="jq-k">correct</span><span class="jq-v">${picks.totalCorrect ?? 0}</span><span class="jq-k">accuracy</span><span class="jq-v">${picks.accuracyRate != null ? (picks.accuracyRate * 100).toFixed(0) + '%' : '—'}</span></div>`
    : `<span class="jq-empty">no picks yet — make one from any upcoming game card</span>`;
  return `<div class="jq-quality-section pick-em-section">
    <div class="jq-section-title">Pick 'em</div>
    <div class="jq-section-sub">Your prediction record. Read-only.</div>
    ${body}
  </div>`;
}
```

Whole-percent (`toFixed(0)`) for the cumulative accuracy stat vs. one
decimal for the single-pick probability (Task 1) is a suggested,
intentional distinction (cumulative-over-N-picks accuracy conventionally
reads as a whole percent; a single model's stated confidence benefits from
a decimal) — again, state this choice in the outbox rather than leaving it
implicit if you change it.

## VERIFICATION

### Real test, not code-presence — extract and exercise the actual functions

Follow the same Node `vm`-extraction pattern already proven in this repo
for `_bundleFinalizedAt`/`_sportLabelMatches`
(`docs/outbox/cc-sport-label-matching-utility-2026-07-08.md`) — extract
`buildPickEmStatsSection` and `buildPickWidgetHTML` (plus whatever they
call, e.g. `esc`) from the real committed `index.html`, run them in a
sandboxed context with realistic input, assert on the real rendered HTML
string. Cases:

1. `window._userState = { picks: { totalMade: 3, totalCorrect: 2, accuracyRate: 0.667 } }` →
   rendered `buildPickEmStatsSection()` output must contain `"67%"`, not
   `"1%"` or `"0.667%"`, and must NOT contain `"no picks yet"`.
2. `window._userState = { picks: { totalMade: 0, totalCorrect: 0, accuracyRate: null } }` →
   must still show the empty state (`"no picks yet"`) — confirms the
   zero-picks case wasn't broken by the field-access fix.
3. `window._userState = null` → must not throw, must show empty state.
4. `buildPickWidgetHTML({...}, sport)` with a resolved pick where
   `pick.resolvedProbability = 0.579, pick.probabilityLabel = "Statistical probability"`
   → rendered HTML must contain `"57.9%"`, not `"0.579%"`.
5. A resolved pick with `pick.resolvedProbability = null` → must render the
   resolved state (✓/✗) with no probability span at all, unchanged from
   current behavior (regression guard).

### Live E2E — real app, real relay round-trip

1. Make a real pick against a real, current fixture via the actual running
   client (or synthetic `pick_made`/`pick_resolved` calls against the
   deployed relay, matching the pattern used throughout
   `field-relay-nba`'s CC-CMDs this session) for a sport confirmed to
   resolve a real probability right now (EPL/La Liga/Bundesliga/Serie A/NFL
   all confirmed working via odds-api futures markets as of this session;
   re-confirm live rather than assuming still true).
2. Fetch `/user/state?userId=...` directly, confirm the real response has
   the `picks: {...}` nested shape this doc assumes — don't rely on this
   doc's quoted shape without an independent live check.
3. Load the app, open Settings, confirm the Pick 'em section shows real
   `made`/`correct`/`accuracy` numbers matching the picks just made, not
   "no picks yet."
4. Confirm the same pick's card (if still visible/re-renderable) shows the
   correctly-scaled per-pick probability (e.g. "57.9%", not "0.579%").

### Repo's own checks

```bash
npm run smoke:ci   # node smoke.js index.html
npm test           # node field_unit.js
npm run smoke       # node field_smoke.js -- expect the pre-existing 21-failure
                    # baseline (confirmed unrelated to this change in
                    # docs/outbox/cc-sport-label-matching-utility-2026-07-08.md's
                    # own diff-confirmed baseline check) -- diff the failure
                    # list before/after this change to confirm zero new
                    # failures, don't just eyeball the count
```

Diff the `field_smoke.js` failure list before vs. after this change
(`git show <parent-sha>:index.html` vs. the working tree, same technique as
the sport-label-matching-utility CC-CMD) rather than assuming the baseline
count alone proves nothing regressed.

## DONE CONDITIONS

- [ ] Probe block confirms all three bug sites match this doc's description
      before editing
- [ ] Task 1 (per-pick probability scale) fixed and verified via real
      extracted-function test
- [ ] Task 2 (stats-section field nesting + accuracy scale) fixed and
      verified via real extracted-function test, all three cases (has
      stats, zero stats, null state)
- [ ] Live E2E: real pick made, `/user/state` response shape independently
      re-confirmed live (not assumed from this doc), Settings panel shows
      real numbers
- [ ] `npm run smoke:ci` and `npm test` clean; `field_smoke.js` failure
      list diffed before/after, confirmed zero new failures
- [ ] Outbox explicitly states the decimal-precision choices made (Task 1's
      one decimal, Task 2's whole percent) as intentional defaults, not
      silent inventions
- [ ] Outbox explicitly notes the ESPN-native "final tick" design question
      was found but NOT addressed here, and remains open for a future
      decision + CC-CMD

## CONFIDENCE SCORING

- +20 — Probe block confirms all three bug sites match this doc's
  description before any edit
- +25 — Task 1 fixed, verified via real extracted-function test (not
  code-presence alone)
- +25 — Task 2 fixed, verified via real extracted-function test covering
  all three cases (has-stats, zero-stats, null-state)
- +20 — Live E2E: real pick round-trip, `/user/state` shape independently
  re-confirmed live, Settings panel visually/DOM-confirmed showing real
  numbers
- +10 — Repo's own smoke/unit checks clean, `field_smoke.js` failure list
  diffed (not just count-compared) before/after

**Do not commit unless confidence >= 95. If score < 95, report verbatim
and stop.**

## ONE-LINER

```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO -- this CC-CMD targets jubilant-bassoon"; exit 1; }
git pull. Read docs/CC-CMD-2026-07-08-pickem-display-and-stats-fix.md.
Execute all tasks. Do not commit unless confidence >= 95. If score < 95,
report verbatim and stop.
```
