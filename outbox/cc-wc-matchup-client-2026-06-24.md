# CC-CMD-2026-06-24-wc-matchup-client — Manifest

DATE   : 2026-06-24 ET
PROMPT : docs/CC-CMD-2026-06-24-wc-matchup-client.md
REPO   : jubilant-bassoon (sole)
DEPENDS: CC-CMD-2026-06-24-wc-matchup-relay.md (field-relay-nba) must deploy
         first so POST /wc/matchup/cache exists. Until then, client POSTs
         fail silently (.catch(() => {})) — non-blocking by design.
SW     : 2026-06-24c → 2026-06-24d

================================================================
EDIT
================================================================

  ✓ Task 1 — POST loop added to _fetchWCTournBriefForSchedule, immediately
            after the scenarios-cache try/catch block (~L12164).
  ✓ Task 2 — Smoke A732.

================================================================
PROBES (Rule 68)
================================================================

PROBE 1  Scenarios cache block ends at L12164 (`} catch (_) { /* non-blocking */ }`).
         POST loop inserted on the very next line.
PROBE 2  `wc26Raw` declared as global const at L35308. Accessible everywhere
         (block-scoped via `typeof wc26Raw !== 'undefined'` guard, as prompt
         specified — keeps the code safe under early-load edge cases).
PROBE 3  `relay` declared inside _fetchWCTournBriefForSchedule (~L12141) as
         `typeof V2_RELAY_BASE !== 'undefined' ? V2_RELAY_BASE : <fallback>`.
         POST loop uses `relay + '/wc/matchup/cache'`.
PROBE 4  Highest assertion before edit: A731. New A732.

================================================================
ROOT-CAUSE NOTE — Filter adaptation (Rule 77)
================================================================

The prompt's filter included `!g.homeScore && !g.awayScore` for the unfinished
check. I probed the wc26Raw block:

  grep 'homeScore\|awayScore' over L35308..L36100 → 0 matches

wc26Raw entries do NOT carry homeScore/awayScore as fields. Completion is
encoded in the `league` string, e.g.:

  • "FIFA World Cup 2026 — Group A · MEX wins 2-0"
  • "FIFA World Cup 2026 — Group B · 1-1 Draw"
  • "FIFA World Cup 2026 — Group C"                ← unfinished

The prompt explicitly invited adjustment: "If scores are stored differently,
adjust the filter condition."

Substituted: `! /(?: wins \d+-\d+|\bdraw\b|·\s*\d+-\d+)/i.test(g.league || '')`

This catches three completion shapes seen in wc26Raw:
  • "· XXX wins N-N" (decisive results)
  • "· Draw" or "· N-N Draw" (draws)
  • "· N-N" (any embedded score)

Defensive: the 4h start-time floor already trims most finished games regardless.

================================================================
SMOKE
================================================================

Before : 742 passed, 0 failed   (baseline at HEAD eebeeee)
After  : 743 passed, 0 failed   (+1: A732; 0 regressions)

================================================================
SW_VERSION
================================================================

  index.html : '2026-06-24c' → '2026-06-24d'
  sw.js      : '2026-06-24c' → '2026-06-24d'

================================================================
USER-VISIBLE BEHAVIOUR
================================================================

Before:
  Relay has no client-supplied matchupNotes — writeWCResult cannot inject
  PRE-GAME CONTEXT into journalism prompts for upcoming games.

After:
  Each schedule load POSTs up to 20 wc26Raw entries to /wc/matchup/cache.
  Selection criteria:
    • Has a matchupNote
    • Has home + away set
    • League string does NOT contain a completion marker
    • Kickoff is within (now-4h, now+7d)
  Relay's writeWCResult reads these from FIELD_JOURNALISM KV when a game
  goes final and injects them as PRE-GAME CONTEXT.
  Fire-and-forget: `.catch(() => {})` per POST. Schedule load never blocks
  on this work; relay failures are invisible to the user.

================================================================
SCOPE BOUNDARY
================================================================

DO list:
  ✅ POST loop after scenarios cache block
  ✅ Fire-and-forget (no await, .catch swallowing)
  ✅ Filter respects matchupNote + start_time window
  ✅ Cap at 20 POSTs per schedule load
  ✅ A732 smoke

DO NOT (all respected):
  ✅ Relay code NOT touched
  ✅ Existing brief/bracket/traps fetch chain NOT touched
  ✅ Scenarios cache write NOT touched
  ✅ No new top-level state introduced

================================================================
COMMITS
================================================================

Commit 1 (feature, triggers deploy gate):
  "feat: client POSTs wc26Raw matchupNotes to relay on schedule load"

Commit 2 (manifest, [skip ci]):
  "docs: outbox manifest — WC matchup client CC-CMD shipped [skip ci]"
