# CC-CMD-2026-06-24-wc-debrief-renderer — Manifest

DATE   : 2026-06-24 ET
PROMPT : docs/CC-CMD-2026-06-24-wc-debrief-renderer.md
REPO   : jubilant-bassoon (client)
SW     : 2026-06-24e → 2026-06-24f
HEAD   : 55cef28 (feature)
DEPENDS: CC-CMD-2026-06-24-bracket-impact-pre-snapshot.md (relay) must
         deploy first so /archive/bracket-replay returns pre+post rows
         keyed by triggered_by={home}_{away}_{YYYY-MM-DD}. Until then,
         renderWCBracketImpact is a graceful no-op (try/catch + early
         returns on !r.ok / rows.length < 2 / no entries).

================================================================
EDIT
================================================================

  ✓ Task 1 — renderWCBracketImpact() function added at top-level
            (~L16694, just after _v2LeaderCache / V2_LEADER_TTL).
  ✓ Task 2 — .wc-bracket-impact-card CSS block added (~L2526), beside
            existing .wc-trap-chip WC styles.
  ✓ Task 3 — Call wired into WC brief fetch IIFE (~L17052) immediately
            after scheduleRenderAll(), .catch(() => {}) fire-and-forget.
  ✓ Task 4 — A735, A736, A737 smoke assertions added.
  ✓ Task 5 — Smoke 748/0, SW_VERSION bumped, committed, pushed.

================================================================
PROBES (Rule 68)
================================================================

PROBE 1  WC brief fetch IIFE confirmed at L17032-17053. scheduleRenderAll()
         at L17051. Wired the new call on L17052.
PROBE 2  _wcRelayBase declared L17026 inside the outer for-loop scope;
         IIFE closes over it. Passed to renderWCBracketImpact as 4th arg.
PROBE 3  triggered_by format = `${home}_${away}_${today}` with spaces
         replaced and capped at 120 chars. today via toLocaleDateString
         'en-CA' (YYYY-MM-DD) in America/New_York TZ.
PROBE 4  grep '.wc-bracket-impact-card' before edit → 0 matches. Confirmed
         new CSS class.
PROBE 5  Highest assertion before edit: A734. New: A735, A736, A737.

================================================================
VARIABLE-NAME NOTE (Rule 71)
================================================================

The CC-CMD said "wg.home / wg.away" but flagged "confirm the actual
variable name". Read L17028-17058:

  for (const wg of wcGames) {  ... (async (gameId, gameKey) => { ...
       ^^^                              ^^^^^^^^^^^^^^^^^^^^^

The IIFE is called with (wg._id, wcKeys.find(...)). Inside the IIFE,
gameId and gameKey are the params — wg comes from the for-loop's
per-iteration `const` binding, which is closure-safe. Used wg.home /
wg.away inside the IIFE; both are valid via closure.

================================================================
SMOKE
================================================================

Before : 745 passed, 0 failed   (baseline at HEAD 67579d2)
After  : 748 passed, 0 failed   (+3: A735, A736, A737; 0 regressions)

================================================================
SW_VERSION
================================================================

  index.html : '2026-06-24e' → '2026-06-24f'
  sw.js      : '2026-06-24e' → '2026-06-24f'

================================================================
USER-VISIBLE BEHAVIOUR
================================================================

Before:
  WC final → matchupNote text injected into the game card as prose.
  No visual indicator of bracket impact (pChamp deltas / state changes).

After:
  WC final → brief loads → renderWCBracketImpact fetches
  /archive/bracket-replay?triggered_by={key}. If 2+ rows exist, builds
  a per-team delta table (≥0.2% changes only, top 5 by |Δ|) and
  inserts as .wc-bracket-impact-card immediately AFTER the game card.

  Each row: <team> · <state> · <↑/↓ NN.N%>
  • State transition shown when r32_prob crosses 0.98/0.02 (QUALIFIED /
    ELIMINATED / P(NN%)). Otherwise the post-state alone is shown.
  • Pos delta = #4ade80; neg = #f87171.
  • Dedup: skips if next sibling already has .wc-bracket-impact-card.

================================================================
SCOPE BOUNDARY
================================================================

DO list:
  ✅ renderWCBracketImpact defined at top level
  ✅ Fire-and-forget call from WC brief IIFE
  ✅ CSS for .wc-bracket-impact-card + 5 child rules
  ✅ A735/A736/A737 smoke
  ✅ SW_VERSION bump

DO NOT (all respected):
  ✅ Relay code NOT touched
  ✅ Existing brief fetch path NOT modified (only appended)
  ✅ matchupNote injection logic unchanged
  ✅ scheduleRenderAll() still fires first
  ✅ No new top-level state introduced

================================================================
COMMITS
================================================================

Commit 1 (feature, triggers deploy gate):
  55cef28 "feat: WC bracket impact debrief renderer"

Commit 2 (manifest, NO [skip ci] per CC-CMD spec):
  (this file)
