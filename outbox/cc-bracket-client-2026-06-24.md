# CC-CMD-2026-06-24-bracket-client — Manifest

DATE   : 2026-06-23 ET (CC-CMD dated 2026-06-24)
PROMPT : docs/CC-CMD-2026-06-24-bracket-client.md
REPO   : jubilant-bassoon (sole)
SW     : 2026-06-23c → 2026-06-23d

================================================================
TASKS COMPLETED
================================================================

  ✓ Task 1 — advancementState() helper
  ✓ Task 2 — Named states in projections table (helpers + R32 cell + CSS)
  ✓ Task 3 — TRAP chip on WC game cards (cache + card field + render + CSS)
  ✓ Task 4 — /wc/elimination-traps fetched + render section
  ✓ Task 5 — Smoke A716–A720
  ✓ Task 6 — Smoke gate, SW bump, commit
  ✓ Task 7 — This manifest

================================================================
PROBES (Rule 68)
================================================================

PROBE 1  advancementState in index.html       → 0 matches (confirmed absent)
PROBE 2  wc-proj-table render block at L30228; pct/cls helpers at L30223-30224;
         R32 cell at L30237 used wc-proj-pct.
PROBE 3  buildWCMediaCards cards have: show, network, chip, time, desc, link,
         journalNote, _gameId, _scoutPick (+ _wcTournBrief marker).
         No _trapTeams field existed.
PROBE 4  renderWCTournamentBracket Promise.allSettled fetches:
         /wc/projections, /wc/movers, /wc/brief/tournament, /wc/traps.
         /wc/elimination-traps NOT in list.
PROBE 5  Highest smoke assertion: A715 (Rule 76 _gameSport centralizer).
         New assertions A716–A720.
PROBE 6  V2_RELAY_BASE is the correct relay base var; used at L5077, L12116,
         L30142.

================================================================
advancementState THRESHOLDS
================================================================

  prob <= 0        → ELIMINATED    (state-elim)
  prob < 0.15      → LIFE SUPPORT  (state-danger)
  prob < 0.40      → DANGER        (state-caution)
  prob < 0.70      → ALIVE         (state-info)
  prob < 0.90      → STRONG        (state-watch)
  prob >= 0.90     → THROUGH       (state-through)

Matches relay's advancementState in context-assembler.js per the prompt.

================================================================
SMOKE
================================================================

Before : 726 passed, 0 failed   (baseline at HEAD cc3f88b)
After  : 731 passed, 0 failed   (+5: A716–A720; +0 regressions)

ROOT-CAUSE NOTE (Rule 77): mid-flight smoke run reported A58 failing.
Investigation revealed my elim-traps header text used an ASCII
apostrophe in `today's` inside a template literal, while the rest of
the codebase uses the typographic `’` (U+2019). smoke.js's string-strip
regex doesn't know about template literals — the bare ASCII `'`
opened a spurious string range that propagated past an existing
`document.getElementById('wc-tab-bracket-btn').classList.contains('active')`
call, causing the A58 regex to flag it as a "bare DOM access". Fix:
swap to `’` to match codebase convention. Smoke returned to clean.

================================================================
SW_VERSION
================================================================

  index.html L22374 : '2026-06-23c' → '2026-06-23d'
  sw.js     L14    : '2026-06-23c' → '2026-06-23d'

(First attempted '2026-06-24a' but ET is still 2026-06-23; A515
non-bypass per Rule 4. Rolled to next letter on same day.)

================================================================
USER-VISIBLE BEHAVIOUR
================================================================

Before:
  • Projections table R32 column showed raw percentages like "100%", "87%".
  • WC game cards looked identical regardless of trap status.
  • Elimination trap risk had no surface anywhere on the UI.

After:
  • R32 column displays THROUGH / STRONG / ALIVE / DANGER / LIFE SUPPORT /
    ELIMINATED with tier colour. Raw percentage still available on hover
    via the `title` attribute. R16–Win columns unchanged.
  • WC media cards render a gold "⚠ TRAP · {team} +{delta}pp as runner-up"
    chip below the journalNote when either team is in the bracketTraps
    array fetched alongside the tournament brief.
  • renderWCTournamentBracket now fetches /wc/elimination-traps and
    renders a 🚨 Elimination Risk section after the path-traps block.
    Silently absent when relay's `traps` array is empty (current state
    — no team across the threshold today).

================================================================
SCOPE BOUNDARY COMPLIANCE
================================================================

DO list:
  ✅ advancementState helper
  ✅ Named state R32 column (R16–Win untouched per prompt note)
  ✅ wc-proj-state CSS
  ✅ _wcPathTraps cache + /wc/traps in _fetchWCTournBriefForSchedule
  ✅ _trapTeams field on buildWCMediaCards cards
  ✅ TRAP chip render in media-card template
  ✅ wc-trap-chip CSS
  ✅ /wc/elimination-traps in renderWCTournamentBracket
  ✅ Elimination Risk section after path-traps block
  ✅ Smoke A716–A720
  ✅ SW bump in sync (index.html + sw.js)

DO NOT list (all respected per prompt):
  ✅ buildBracketImpact debrief — NOT touched (relay carry-forward not done)
  ✅ Relay routes — NOT touched
  ✅ Cards from other sports — NOT touched
  ✅ R16-Win columns in projections — NOT touched

================================================================
COMMITS
================================================================

Commit 1 (main code change, triggers deploy gate):
  "feat: bracket client — named states, TRAP chip, elimination traps display"

Commit 2 (manifest only, [skip ci]):
  "docs: outbox manifest — bracket client CC-CMD shipped [skip ci]"
