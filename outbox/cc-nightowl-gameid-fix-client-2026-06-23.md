# CC-CMD-2026-06-23-nightowl-gameid-client — Manifest

DATE   : 2026-06-23
PROMPT : docs/CC-CMD-2026-06-23-nightowl-gameid-client.md
REPO   : jubilant-bassoon (sole)
SW     : 2026-06-23b → 2026-06-23c

================================================================
SCOPE & STATUS
================================================================

  Task 1 — archiveBrief night_owl game_id swap   SHIPPED
  Task 2 — Smoke gate (no new assertions)         PASSED 726/0
  Task 3 — SW_VERSION bump (index.html + sw.js)   SHIPPED
  Task 4 — This manifest                          SHIPPED

================================================================
PRE-BUILD PROBE
================================================================

cmd: grep -n "archiveBrief.*night_owl" index.html
Result: matched a single line at L38254 containing the exact target:
  archiveBrief('night_owl',(topGame&&topGame._sport)||null,
               topGame&&(topGame._id||topGame.id)||null,claudeText,null)
  → Anchor confirmed unique; safe to Edit.

================================================================
TASK 1 — IMPLEMENTATION
================================================================

Before:
  topGame&&(topGame._id||topGame.id)||null,claudeText,null
After:
  topGame&&(topGame.sourceId||topGame._id||topGame.id)||null,claudeText,null

One-token insertion of `topGame.sourceId||` at the head of the OR chain.
No other characters on the line changed; no other line touched. The
sourceId is the ESPN numeric event ID (verified at L36174 in mlb box
cache + L36421 in the new ESPN Summary fallback block — same field used
to address the relay's espn-summary route).

Behavior change at runtime: the relay's /archive/brief endpoint now
receives the ESPN event ID as game_id (matches
regular_season_games.espn_event_id) rather than the FIELD internal
id (which never matched any D1 column). Existing rows keyed by the
internal id remain orphaned but archived briefs going forward attach
to their parent game.

================================================================
TASK 2 — SMOKE
================================================================

cmd: node smoke.js index.html
Result: 726 passed, 0 failed   (same as baseline — no regression)

No new smoke assertions per prompt instructions.

================================================================
TASK 3 — SW_VERSION
================================================================

Bumped both files in sync (Rule 4):
  index.html L22374 : '2026-06-23b' → '2026-06-23c'
  sw.js     L14    : '2026-06-23b' → '2026-06-23c'

Deploy gate trigger paths now include index.html + sw.js.

================================================================
SCOPE BOUNDARY COMPLIANCE
================================================================

DO list (all done):
  ✅ Change one field in archiveBrief call at L38254
  ✅ SW_VERSION bump in index.html + sw.js
  ✅ Single commit
  ✅ Outbox manifest

DO NOT list (all respected):
  ✅ No other function or line touched in index.html
  ✅ Relay not touched
  ✅ Quality chain / scoring logic untouched
  ✅ field-relay-nba untouched

================================================================
COMMIT
================================================================

Single commit:
  "fix: archiveBrief night_owl game_id uses topGame.sourceId (ESPN event ID)"

Files:
  index.html  (game_id swap + SW bump)
  sw.js       (SW bump in sync)
  outbox/cc-nightowl-gameid-fix-client-2026-06-23.md  (this manifest)
