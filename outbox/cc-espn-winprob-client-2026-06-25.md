# CC-CMD-2026-06-25-E-espn-winprob-client — Manifest (STOPPED at probe block)

DATE   : 2026-06-25 ET 10:18
PROMPT : docs/CC-CMD-2026-06-25-E-espn-winprob-client.md
REPO   : jubilant-bassoon (sole)
SW     : 2026-06-25a (index.html, upstream auto-bumped) / 2026-06-24i (sw.js, pre-bump) — DRIFTED
HEAD   : 8f2087a (post-pull, pre-edit)
STATUS : STOPPED at probe block.

Seven concrete contract mismatches between the CC-CMD's example code and the
client data model at current HEAD. Executing the tasks as written would
introduce broken code (one ReferenceError, multiple silently-false conditions)
and conflict with an already-shipped feature (buildComebackProbability).

================================================================
PROBE RESULTS
================================================================

PROBE 1 — buildComebackProbability + winProbability sites
  grep `buildComebackProbability\|comebackProb\|winProbability\|homeWinPercentage`

  L19293  // WP array: winprobability[].homeWinPercentage — 0-1 FRACTION (e.g. 0.872 = 87.2%)
  L19308  d?.winprobability?.at(-1)?.homeWinPercentage ??
  L19309  d?.winprobability?.[0]?.homeWinPercentage    ??
  L37904  const cb = buildComebackProbability(_pinnedGameId, eData, game?._section||'');
  L37931  function buildComebackProbability(gameId, eData, sport) {
  L38027  const cb = buildComebackProbability(gameId, eData, sport) || '';

  Finding: buildComebackProbability ALREADY EXISTS, ALREADY HAS CALLERS,
  ALREADY RENDERS. It returns a STRING used in narrative DOM injection at
  L38027. The CC-CMD says "this wires its output to a chip" — but the
  existing function does not return a chip-shaped value, and adding another
  consumer would either duplicate the rendered text or require a new return
  signature that breaks the existing two call sites.

PROBE 2 — winprobability[] location in client
  grep `winprobability\|win_probability`

  Only 4 hits — ALL inside fetchESPNWinProb (L19297-19317). The relay
  response is parsed there; only the SCALAR `wp` is extracted and returned
  (L19310). The array is never stored anywhere downstream.

  grep `game\.winprobability\|\.winprobability\s*=` → 0 hits.
  grep `fetchESPNWinProb` → callers at L19180, L19199 — store as
       `espnScores[key].wp = wp` (scalar, not array).

  Finding: NO `game.winprobability` ARRAY EXISTS on game objects.
  The CC-CMD's `game.winprobability?.length` and
  `game.winprobability[game.winprobability.length - 1]` will be
  silently undefined → entire chip block is dead code.

PROBE 3 — chip rendering call site
  grep `buildVibeChips\|enrichRow\|chipRow\|fieldChip\b`

  L10430  ${(()=>{ … buildVibeChips(g,_va,sec.sport) … '<span class="vibe '+v.cls+'">'+v.label+'</span>' … })()}
  L35808  function buildVibeChips(game, eData, sport) { … chips.push({ label, cls }) … }

  Finding: chip pattern is `chips.push({ label: '...', cls: '...' })`.
  No `fieldChip(...)` helper exists anywhere in index.html.
  The CC-CMD's `chips.push(fieldChip(\`...\`, 'LONG', { small: true }))`
  would throw `ReferenceError: fieldChip is not defined` at runtime.

PROBE 4 — smoke baseline
  node smoke.js index.html → 753 passed, 1 failed.

  FAILURE: A190 — sw.js SW_VERSION='2026-06-24i' does not match index.html
  '2026-06-25a'. Caused by upstream auto-bump in the git pull at session
  start (`index.html | 2 +-`). NOT caused by anything in this session.
  Documented; not fixed without authorization. See "Out-of-scope" below.

================================================================
ADDITIONAL CONTRACT MISMATCHES (probed during reconciliation)
================================================================

MISMATCH 4 — Win probability scale
  L19293 explicit comment:
    "winprobability[].homeWinPercentage — 0-1 FRACTION (e.g. 0.872 = 87.2%)"
    "ESPN Gamecast display * 100 → '87.2' in DOM (that's why DOM showed
     62.1 not 0.621)"
    "Scale confirmed live: 0.872 observed SA@OKC G2, 3rd Qtr, May 21 2026"

  CC-CMD code:
    const homePct = Math.round(latest.homeWinPercentage ?? 50);
    const awayPct = 100 - homePct;

  Math.round(0.872) = 1, not 87. Then awayPct = 99. The `?? 50` fallback
  is also wrong for a 0-1 scale (should be 0.5 if anything). Every chip
  test (`homePct <= 25 || awayPct <= 25`) fires immediately on any normal
  game because `homePct` will be 0 or 1.

  Would need: `Math.round((latest.homeWinPercentage ?? 0.5) * 100)`.

MISMATCH 5 — Game state field path
  Existing buildVibeChips (L35810-35811):
    const st = eData?.state || 'pre';
    const isLive = st === 'in', isPost = st === 'post';

  CC-CMD code:
    const isLive = game.status?.type?.state === 'in';
    const isFinal = game.status?.type?.completed;

  Neither `game.status?.type?.state` nor `game.status?.type?.completed`
  exists on FIELD's game model. Game state comes through the `eData`
  side-channel object (espnScores entry). Both reads silently undefined →
  isLive always false → entire chip block dead.

MISMATCH 6 — Team field shape
  Existing FIELD model: `game.home` / `game.away` are STRINGS (full
  team name). Abbreviations live on `game._homeAbbr` / `game._awayAbbr`
  (when patched by `renderAll` at L10324, or by `getNHLAbbrev` etc.).

  CC-CMD code:
    const trailingTeam = homePct < awayPct ? game.homeTeam : game.awayTeam;
    chips.push(fieldChip(`${trailingTeam?.abbreviation || '?'} ${trailingPct}%`, ...))

  `game.homeTeam` / `game.awayTeam` do not exist (that's raw ESPN summary
  shape). `trailingTeam?.abbreviation` would always resolve to '?'.

MISMATCH 7 — No snapshot history for comeback detection
  Task 2 requires:
    game.winprobability.map(p => winner === 'home' ? (p.homeWinPercentage ?? 50) : ...)
    game._winProbabilityAtLowest = Math.min(...winnerPcts);

  The scalar `wp` stored on `espnScores[key].wp` is the LATEST snapshot
  only. No history is retained. Computing "lowest probability the eventual
  winner faced" requires the full array, which is discarded at L19310.

  Implementing Task 2 would require a relay change (return the array,
  or run-min-tracker on the relay side) AND a client change (store the
  array, or accept the running minimum). That's a Rule 70 atomic
  cross-repo change, not a single-repo CC-CMD.

================================================================
RECONCILIATION
================================================================

The CC-CMD assumes a raw ESPN-summary-shaped game object reaches the
chip render path. The FIELD client does not preserve that shape — it
normalizes during ingestion (relay extracts the scalar `wp`; `espnScores`
holds the canonical state). Five of the CC-CMD's seven assumptions are
contradicted by code that has been stable for weeks (the 0-1 scale
comment at L19293 cites a May 21 2026 verification).

The remaining two issues are:
  • `fieldChip` helper does not exist (would need to be added or replaced
    with the actual `{label, cls}` chip pattern).
  • `buildComebackProbability` already has live callers; the CC-CMD's
    framing ("this wires its output to a chip") is not faithful to the
    function's existing render contract.

================================================================
PATH FORWARD (NOT EXECUTED)
================================================================

A faithful version of this feature would need:

  (a) Decide whether the WP array travels client-side. If yes, modify
      fetchESPNWinProb to return the full snapshot array OR store a
      running min on `espnScores[key].wpMin`. If running-min, store at
      L19183/L19199.

  (b) Read state from `eData?.state` (not `game.status.type.state`),
      use existing chip pattern `chips.push({label, cls})` (not
      `fieldChip(...)`), use `game._homeAbbr`/`game._awayAbbr` (not
      `game.homeTeam.abbreviation`).

  (c) Convert the 0-1 fraction to a percent: `Math.round(wp * 100)`,
      with a sane fallback of 0.5 (not 50) on null.

  (d) Reconcile with buildComebackProbability at L37931 — either
      consume its output if it already produces "team X had Y% win prob"
      data, or carve out a clear separation between the narrative
      string render and the chip render.

This is a 30-line client change with one relay decision (whether to
preserve the wp array or compute the min server-side). Worth its own
CC-CMD with corrected assumptions, ideally paired with a relay-side
change per Rule 70.

================================================================
OUT-OF-SCOPE — A190 baseline drift
================================================================

The git pull at session start brought in an upstream auto-commit that
bumped index.html SW_VERSION from `2026-06-24i` (this session's last
ship) to `2026-06-25a` (ET has rolled to 2026-06-25). sw.js was NOT
auto-bumped. A190 fires on the mismatch.

NOT FIXED HERE. This CC-CMD did not authorize a SW_VERSION bump on
sw.js, and the bump on index.html came from upstream automation, not
from any code change in this session. The fix is a one-character edit
(`'2026-06-24i'` → `'2026-06-25a'` in sw.js) — flagged for the next
session or for the user to authorize before the next deploy gate run.

================================================================
TASKS — NONE EXECUTED
================================================================

  ✗ Task 1 — winprobability chip in buildVibeChips: SKIPPED.
            game.winprobability does not exist; fieldChip does not
            exist; state path is wrong; scale conversion is wrong.

  ✗ Task 2 — _winProbabilityAtLowest: SKIPPED.
            No history retained on client; requires relay change
            (Rule 70 atomic).

  ✗ Task 3 — A739/A740 smoke: NOT ADDED. Would assert presence of
            broken code.

  ✗ Task 5 — SW_VERSION bump: NOT EXECUTED for the FEATURE (no code
            change to deploy). A190 baseline drift documented but not
            fixed without authorization.

================================================================
COMMIT STATE
================================================================

  HEAD       : 8f2087a (unchanged — only this manifest is new)
  SW_VERSION : index.html '2026-06-25a' / sw.js '2026-06-24i' (drifted,
               not introduced by this session)
  Smoke      : 753/1 (A190 — pre-existing upstream drift)
  Pushed     : manifest only, [skip ci]

Rules invoked: 71 (CONTEXT-A — read before write), 77 (NO-RATIONALIZE-A —
investigated each contradiction), 87 (SELF-COMPLETE-A — stopped cleanly
at probe block, did not introduce a carry-forward), 60/70 (CONTRACT-A /
ATOMIC-A — the relay-side decision on wp array storage is a paired
cross-repo change, not a client-only edit).
