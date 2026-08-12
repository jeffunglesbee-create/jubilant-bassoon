# CC-CMD-2026-08-12-comeback-probability-liveness-gate

**Repo:** jubilant-bassoon
**Branch:** main — commit directly, do not create a feature branch or PR

One-liner:
```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git pull. Read docs/CC-CMD-2026-08-12-comeback-probability-liveness-gate.md. Execute all tasks.
Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```

---

## The defect

Observed 2026-08-12 14:28 ET on the live deployment, Stats tab, Today's
Games. **Every one of the seven MLB games renders the line
"Tied — anyone's game"**, including:

```
Athletics: 47–73 · Rays: 73–46      Tied — anyone's game
Padres:    64–57 · Brewers: 74–46   Tied — anyone's game
```

All seven were scheduled, not in progress. The string sits immediately
below the win-loss records, so it reads as a verdict on those records —
a 47–73 team declared even with a 73–46 team.

That makes it more than cosmetic. It is a fabricated competitive
assessment presented as analysis, which is what Rule 1 (DO NOT INVENT)
exists to prevent, and it is currently on every pre-game card in the tab.

## Root cause — read from HEAD, not inferred

`buildComebackProbability`, `src/legacy/field.js:39350`:

```js
function buildComebackProbability(gameId, eData, sport) {
  if (!eData || eData.state === 'post') return null;
  const home = parseInt(eData.homeScore||0), away = parseInt(eData.awayScore||0);
  const margin = Math.abs(home - away);
  if (margin === 0) return 'Tied — anyone’s game';
```

The function is a **live in-game** feature — it estimates a trailing
team's comeback chance from deficit and time remaining. It guards
`state === 'post'` and nothing else. On a scheduled game there are no
scores, so `parseInt(undefined||0)` makes both sides 0, `margin` is 0,
and the tie string returns before any period check runs.

The caller (`src/legacy/field.js:31044`) passes `_tgEData` with no state
check of its own:

```js
const _tgCb = buildComebackProbability(_tgId, _tgEData, _tgSport) || '';
```

**Second instance of the same missing gate:** the guard tests `'post'`
but the codebase also uses `'final'` for completed games — see
`src/legacy/field.js:31051`, `_tgEData?.state === 'post' || _tgEData?.state === 'final'`.
A `'final'` game therefore falls through and can render a comeback
probability for a game that has already ended.

Both are one defect: the function has no liveness gate.

## Task 1 — probe before changing anything

```
grep -n "state === 'in'" src/legacy/field.js | head
grep -n "state === 'final'\|state === 'post'" src/legacy/field.js | head
grep -n "buildComebackProbability" src/legacy/field.js
```

**Artifact:** the enumerated set of `state` values this codebase uses, and
every call site of `buildComebackProbability`. If there is more than one
call site, or if `'in'` is not the live value, STOP — the fix below
assumes both.

## Task 2 — the fix, one line

In `src/legacy/field.js` — **NOT `index.html`'s script block**, which
`scripts/sync-source.mjs` overwrites and whose divergence guard will
block the commit — change the opening guard of
`buildComebackProbability` to whitelist the live state instead of
blacklisting one terminal state:

```js
if (!eData || eData.state !== 'in') return null;
```

Whitelist, not `|| eData.state === 'pre'`. A blacklist is what produced
this bug twice already (`'post'` covered, `'pre'` and `'final'` not), and
a third unlisted state value would reintroduce it a third time.

Add a comment recording why the gate exists, naming the pre-game symptom,
so a future session does not read the condition as redundant and remove
it (Rule 71 — the `_isGolfRoundComplete` case study).

**Do NOT touch** the `isFinal` period logic, the per-sport percentage
curves, `getDramaTrend`, or the caller. Whether a tied *live* game in an
early inning should say "anyone's game" is a separate question and does
not hitchhike on this commit (Rule 69).

## Task 3 — smoke and version

```
node smoke.js index.html      # must show 0 failed
```

Bump `SW_VERSION` in **both** `index.html` and `sw.js` to `2026-08-12a`
(ET; current value `2026-08-09e`). Smoke assertion A515 enforces the
format and the match.

## Done condition — a live artifact, not a code reading

Rule 90: this is a rendering defect, so the artifact is the CI-as-proxy
Playwright pattern against the **live deployed URL**, following
`ambient-skeleton-probe.yml` as the reference implementation.

Add `comeback-liveness-probe.yml` + `comeback_liveness_probe.js`. Against
`https://jubilant-bassoon.jeffunglesbee.workers.dev`, open the Stats tab
and commit to `outbox/`:

- a screenshot of the Today's Games region
- a structured manifest with **boolean and integer fields, not prose**:
  - `tiedStringCount` — occurrences of `anyone’s game` in the Stats tab
  - `todayGameCount` — Today's Games entries rendered
  - `liveGameCount` — entries whose state is live at probe time
  - `swVersion` — read from the page
  - `moduleBooted` — did app JS run at all

**PASS requires `tiedStringCount <= liveGameCount`.** Not
`tiedStringCount === 0`: a genuinely tied live game may legitimately show
the string, and a probe that demands zero would fail correctly-working
code on a busy evening. Capture `todayGameCount > 0` as a separate
required field — a probe that finds no games at all proves nothing and
must not report PASS.

Run the probe **before** the fix deploys as well, and commit that
manifest too. A post-fix zero means nothing without a pre-fix non-zero to
compare it against; without the baseline the probe cannot distinguish
"fixed" from "never rendered".

## Explicitly NOT in scope

- The blank pitcher enrichment (no ERA, W-L, tempo or arsenal rendering
  on any of the seven games).
- The two missing PARK rows (Rays @ Athletics, Rockies @ Diamondbacks).
- The missing records line on Rockies @ Diamondbacks.
- Whether pitchers are assigned to the correct teams.

Each is a data-coverage question with a different owner, and each gets
its own CC-CMD rather than riding along here.

## Outbox

`outbox/cc-session-2026-08-12-comeback-probability-liveness-gate.md`:
Task 1 probe output, the diff, the smoke count before and after, and both
probe manifests with the `tiedStringCount` delta.
