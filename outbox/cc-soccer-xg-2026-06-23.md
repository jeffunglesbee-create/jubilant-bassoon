# CC-CMD-2026-06-23-soccer-xg-espn — Probes + Handoff

DATE   : 2026-06-23
PROMPT : docs/CC-CMD-2026-06-23-soccer-xg-espn.md
TARGET : field-relay-nba (Tasks 1, 2, 4) + jubilant-bassoon (Task 3)
SESSION: jubilant-bassoon-only (this session)

================================================================
SCOPE EXECUTED IN THIS SESSION
================================================================

  Task 1 — /soccer/xg relay route               STAGED (wrong repo)
  Task 2 — buildSoccerXGContext assembler        STAGED (wrong repo)
  Task 3 — Deprecate FBref workflow schedules    SHIPPED (this commit)
  Task 4 — Smoke assertions A-SOCCER-XG-1..5     STAGED (wrong repo)
  Task 5 — End-to-end verification               STAGED (post-deploy)

================================================================
WHY TASKS 1, 2, 4 ARE STAGED — NOT FAILED
================================================================

This CC session is scoped to jeffunglesbee-create/jubilant-bassoon.
The repo housing src/index.js (the relay) and src/context-assembler.js
is field-relay-nba — a separate repo not attached to this session.
No add_repo / list_repos tool is available to attach it from inside
the session, so Tasks 1, 2, and 4 must be completed in a CC session
opened against field-relay-nba.

A handoff doc with all the code blocks from the prompt — verbatim —
is preserved at docs/CC-CMD-2026-06-23-soccer-xg-espn.md and should
be passed directly to the relay-side session.

================================================================
PRE-BUILD PROBES — STATUS
================================================================

PROBE 1 — Verify xG present on a live WC game
  Command:
    curl https://sports.core.api.espn.com/v2/sports/soccer/leagues/fifa.world/...
  Result:
    Host not in allowlist: sports.core.api.espn.com
  Status: BLOCKED by sandbox network policy.
  Pre-verified in prompt body ("xG confirmed on 2 WC games"). The
  relay-side session must rerun this probe with full egress before
  shipping Task 1.

PROBE 2 — Verify competitor IDs come from scoreboard
  Command:
    curl https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard
  Result: BLOCKED (same allowlist constraint).

PROBE 3 — Locate context-assembler.js and confirm buildSoccerFBrefContext
  Command:
    grep -n 'buildSoccerFBrefContext|soccer_fbref|SOCCER STATS' src/context-assembler.js
  Result: src/context-assembler.js DOES NOT EXIST in this repo.
          Lives in field-relay-nba. Cannot grep from this session.

PROBE 4 — Confirm /soccer/ route block in index.js
  Command:
    grep -n '/soccer/|soccer-fbref' src/index.js
  Result: src/index.js DOES NOT EXIST in this repo. Same constraint.

PROBE 5 — Check game object field names (espnEventId vs espnId vs game.id) — CRITICAL
  Command:
    grep -n 'espnEventId|espnId|eventId|game\.id' src/context-assembler.js src/journalism*.js
  Result: Files DO NOT EXIST in this repo. Cannot resolve from this
          session.
  Carry-forward: this is flagged "critical" in the prompt. The
  relay-side session MUST run this grep before writing TASK 2 to
  determine the actual field name in use — do not guess. If neither
  espnLeague nor espnEventId exists on the game object, the prompt
  says to add them at the journalism prompt builder layer.

PROBE 6 — Verify espn-summary route still active
  Command:
    grep -n 'espn-summary|/espn-summary' src/index.js
  Result: src/index.js DOES NOT EXIST in this repo. Same constraint.

================================================================
TASK 3 — DEPRECATE FBREF WORKFLOWS (SHIPPED IN THIS COMMIT)
================================================================

.github/workflows/soccer-fbref-wc.yml
  Before:
    on:
      schedule:
        - cron: '0 8 */3 * *'
      workflow_dispatch:
  After:
    # DEPRECATED 2026-06-23: FBref lost Opta licence Jan 2026.
    # Schedule trigger disabled; workflow_dispatch retained.
    on:
      # schedule:
      #   - cron: '0 8 */3 * *'
      workflow_dispatch:

.github/workflows/soccer-fbref-mls.yml
  Before:
    on:
      schedule:
        - cron: '0 8 * * 1'
      workflow_dispatch:
  After:
    # DEPRECATED 2026-06-23 — same rationale.
    on:
      # schedule:
      #   - cron: '0 8 * * 1'
      workflow_dispatch:

Files NOT deleted (kept for reference, per Task 3 instructions).
DataImpulse secret env vars NOT removed (still used by STAT repo, per
Task 3 instructions).
YAML validated with `python3 -c "import yaml; yaml.safe_load(...)"`.

================================================================
CARRY-FORWARD FOR FIELD-RELAY-NBA SESSION
================================================================

1. Re-run PROBES 1, 2, 5 with full egress before writing any code.
2. PROBE 5 (critical): grep field names — do not assume espnLeague /
   espnEventId. Adjust the buildSoccerXGContext extraction in Task 2
   to match the real game object shape. If the names need to be added
   at the journalism prompt builder layer, that work is in scope per
   the prompt's "Key probe dependency" note.
3. Implement Task 1 (route) and Task 2 (context assembler) in a single
   commit per the prompt's COMMITS guidance.
4. Implement Task 4 (smoke A-SOCCER-XG-1..5) in the same commit.
5. Deploy and execute Task 5 verification curls (probe route directly +
   Bundesliga negative case).
6. Update HANDOFF after deploy with route URL + assembler status.

================================================================
SCOPE BOUNDARY COMPLIANCE
================================================================

DO list (in scope for this session):
  ✅ .github/workflows/soccer-fbref-wc.yml — schedule commented out
  ✅ .github/workflows/soccer-fbref-mls.yml — schedule commented out
  ✅ outbox/cc-soccer-xg-2026-06-23.md — this manifest

DO NOT list (all respected):
  ✅ buildFinalsContextBlock — not touched (lives in field-relay-nba)
  ✅ buildWCTeamContextBlock — not touched (lives in field-relay-nba)
  ✅ FIELD_PROSE_STYLE — not touched
  ✅ runQualityChain — not touched
  ✅ DataImpulse secrets — left in place
  ✅ Other relay routes — not touched
  ✅ index.html — not touched
  ✅ FBref workflow files — preserved, only schedule commented

================================================================
COMMITS
================================================================

This session — one commit to jubilant-bassoon:
  "chore: deprecate FBref schedule triggers (replaced by ESPN Core xG)"
  Files:
    .github/workflows/soccer-fbref-wc.yml
    .github/workflows/soccer-fbref-mls.yml
    outbox/cc-soccer-xg-2026-06-23.md

Pending field-relay-nba session — one commit when that session opens:
  "feat: /soccer/xg route + buildSoccerXGContext (replaces FBref)"
  Files (expected):
    src/index.js              (Task 1 route)
    src/context-assembler.js  (Task 2 builder + CONTEXT_SOURCES entry)
    smoke.js                  (Task 4 A-SOCCER-XG-1..5)

Smoke (jubilant-bassoon side): not affected (no index.html / sw.js /
smoke.js changes).
Deploy gate: not triggered (workflow-only file changes; no
deploy-gate trigger path touched).
