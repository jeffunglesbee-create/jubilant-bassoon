CC-CMD-2026-06-20 — WC journalism client pipeline verification

DATE: 2026-06-20
HEAD: fa3bdcd (before this commit)
SMOKE: 702 / 0
SCOPE: VERIFICATION ONLY — no code changes (probes only)

================================================================
PROBE RESULTS
================================================================

1A — FIELD_V2_SOURCES has wc26 enabled ........................ PASS
    Line 16204: wc26: new Date() >= new Date('2026-06-11T00:00:00Z')
    Today (2026-06-20) is past the gate → wc26 polling active.
    (Initial grep | head -5 missed the line because other wc26
    matches sorted ahead; re-grep with /wc26:\s+new Date/ confirms.)

1B — WC schedule entries (≥48) ................................. PASS
    74 _sport:"FIFA World Cup" entries present in wc26Raw.

1C — Night Owl sport detection ................................. PASS / WARN
    PASS: topGame._sport reads present (used throughout
          fetchNightOwlFromClaude and renderNightOwlRecap).
    WARN: no `getSportLanguage` function defined.
          Not a defect — the sport-language directive is built
          inline via a ternary chain in fetchNightOwlFromClaude
          (lines 35466 and 35480 both emit:
            "Sport: Football (soccer) — FIFA World Cup 2026.
             Score in GOALS (never points). …"
          ). buildCompoundPrompt has its own copy at line 23423.
          The WC vocabulary IS injected; it's just not named via
          a helper. No render impact.

1D — WC section renders ........................................ PASS (all)
    wc-section / wc-mode markup .................. PASS
    /wc/standings fetch .......................... PASS
    /wc/bracket fetch ............................ PASS
    /wc/brief/tournament fetch ................... PASS

1E — fetchCountryContext (Prompt 9 / F09) ....................... PASS
    Function defined.
    Called inside fetchNightOwlFromClaude WC team-context block
    (gated on WC_NAME_TO_CODE match per the F09 implementation).

1F — WC journalism prompt context .............................. PASS
    Group context: buildGameStandingsContext +
        fetchStandingsForPrompt both present.
    Compound brief builder: buildCompoundPrompt present.

1G — Live relay WC data ....................................... BLOCKED
    Sandbox network policy denies field-relay-nba.jeffunglesbee
    .workers.dev → cannot directly verify /context/date/2026-06-20.
    Adding a CI-as-proxy probe workflow was deemed out of scope
    for this verification step (Prompt explicitly says "do NOT add
    features"). The CLIENT side of the path is verified:
      - fetchUserState (Prompt 10) present ......... PASS
      - hydrateMissedRecaps present ................ PASS
      - /context/game/{id} consumer wired into
        hydrateMissedRecaps ........................ PASS
    Recommendation: a future relay-side or CI-proxy session should
    POST a date-context probe to outbox/ to close this gap.

================================================================
SUMMARY
================================================================

Counts: 6 PASS (1A, 1B, 1C-1, 1D, 1E, 1F)
        1 WARN (1C-2 — informational, no render impact)
        1 BLOCKED (1G — sandbox network policy)
        0 FAIL

No smoke-blocking bugs found. No code changes required.

================================================================
WC JOURNALISM PATH — END-TO-END SANITY
================================================================

The client-side journalism pipeline for WC games is structurally
complete:

  1. V2 poll (fetchV2AllScores) → espnScores[k] for wc26 games
     (FIELD_V2_SOURCES.wc26 = true since June 11 2026).
  2. WC section injected into allData.sports either by
     maybePushWorldCup (wc26Raw) or the V2 fallback that detects
     wc26 entries in espnScores.
  3. Game card render in renderAll uses _wcFixTeamName and
     applies the WC vocabulary guard.
  4. Compound brief (buildCompoundPrompt) reads matchupNote,
     buildGameStandingsContext, and the WC matchup story.
  5. Night Owl recap (renderNightOwlRecap → fetchNightOwlFromClaude)
     selects the top final, builds Sport=Football (soccer) language,
     injects:
       [WC: …] narrative + [WC GUARDRAIL: …]
       [COUNTRY: …] population/capital/FIFA from Prompt 9
       [WC ADVANCEMENT] when scenarios cached
       [MATCH STATS] from soccer_stats_ localStorage (Prompt 6A/B)
       [USER CONTEXT] / [MISSED PEAKS] from Prompt 10 hydration
     and emits a sport-vocabulary-clean recap.

The only structurally unverified leg this session is the live
Context Graph payload on the relay (1G). All client-side consumers
are wired and the F09/Prompt 9 country fetch is integrated.
