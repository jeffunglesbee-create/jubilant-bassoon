# CC-CMD-2026-06-22-mls-return-prep — Manifest

DATE   : 2026-06-22
HEAD   : 51df655 (pre-commit)
PROMPT : docs/CC-CMD-2026-06-22-mls-return-prep.md

================================================================
SCOPE & STATUS
================================================================

Goal: prepare three artefacts so MLS is covered automatically when the
league resumes the weekend of July 19-20 after the FIFA World Cup final.

  Task 1 — scripts/seed-mls-return-2026.py        SHIPPED (run STAGED)
  Task 2 — scripts/soccer-fbref-mls.py            SHIPPED (run STAGED)
  Task 3 — .github/workflows/soccer-fbref-mls.yml SHIPPED
  Task 4 — soccer-fbref-wc.yml UNCHANGED          VERIFIED

================================================================
SANDBOX EGRESS CONSTRAINT
================================================================

The sandbox network policy blocks both:
  - field-relay-nba.jeffunglesbee.workers.dev (relay)
  - v3.football.api-sports.io (api-sports.io)

Neither script can be executed from this session. The runs are STAGED;
they are unblocked by triggering the workflows from the GitHub UI (per
Rule 74: explicit unblock criteria).

Unblock for Task 1 (D1 seed):
  - APISPORTS_KEY must be present as a GitHub Actions secret
  - Until then, the script must be run with the secret available
  - Suggested follow-up prompt: add a one-shot workflow that invokes
    seed-mls-return-2026.py with APISPORTS_KEY pulled from secrets

Unblock for Task 2 (FBref seed of mls.json):
  - Workflow soccer-fbref-mls.yml has workflow_dispatch enabled
  - Trigger manually via Actions tab to populate R2 immediately
  - Subsequent runs happen automatically every Monday 11:00 UTC

================================================================
TASK DETAIL
================================================================

TASK 1 — scripts/seed-mls-return-2026.py
  Reads v3.football.api-sports.io/fixtures?league=253&season=2026
  with from=2026-07-19 / to=2026-10-31.
  Builds rows in the exact format documented in the prompt:
    id        : "{date}-mls-{home[:5].lower().replace(' ','')}-{...}"
    date      : "YYYY-MM-DD"
    sport     : "MLS"
    home/away : Full Club Name
    *_score   : NULL  (pre-game)
  INSERT OR IGNORE in batches of 20 rows via relay /d1/execute.
  Writes outbox/mls-schedule-2026.json before INSERT for audit.

  Env required:
    APISPORTS_KEY  (mandatory — script exits 1 if missing)
    RELAY_URL      (optional override; defaults to production relay)

TASK 2 — scripts/soccer-fbref-mls.py
  Direct clone of soccer-fbref-wc.py with LEAGUES collapsed to:
    name       : "MLS 2025"
    comp_id    : "22"
    season     : "2025"
    url_pattern: "single"   (matches WC pattern: /comps/{id}/{season}/...)
    slug       : "Major-League-Soccer"
    r2_key     : "mls.json"
  All 4 stat tables (shooting / misc / passing / keepers) preserved.
  Outputs:
    R2     : soccer/fbref/mls.json
    outbox : outbox/soccer/mls.json  (committed by workflow)

TASK 3 — .github/workflows/soccer-fbref-mls.yml
  Schedule  : '0 11 * * 1'  (Mon 11:00 UTC, MLB-cadence)
  Dispatch  : workflow_dispatch enabled (manual trigger any time)
  Job       : python3 scripts/soccer-fbref-mls.py
  Commit    : "MLS FBref update $(date -u +%Y-%m-%d) [skip ci]"
  Outbox    : outbox/soccer/
  Note: Off-season runs return empty squad tables. The script still
  uploads the (empty-but-shaped) JSON so the R2 key never goes missing
  for context-assembler's 'mls' lookup.

TASK 4 — soccer-fbref-wc.yml
  Verified intact:
    schedule:
      - cron: '0 8 */3 * *'
  No edits. WC cron continues to run every 3 days through July 19 final.

================================================================
SCOPE BOUNDARY COMPLIANCE
================================================================

DO list (all done):
  ✅ scripts/seed-mls-return-2026.py  (Task 1)
  ✅ scripts/soccer-fbref-mls.py      (Task 2)
  ✅ .github/workflows/soccer-fbref-mls.yml  (Task 3)
  ⏸ Run seed-mls-return-2026.py — STAGED (sandbox + APISPORTS_KEY)
  ⏸ Run soccer-fbref-mls.py — STAGED (sandbox; trigger via dispatch)
  ⏸ /health/sources verification — STAGED (depends on R2 upload)

DO NOT list (all respected):
  ✅ soccer-fbref-wc.yml — not touched
  ✅ context-assembler.js — not touched
  ✅ relay source — not touched
  ✅ index.html — not touched
  ✅ INSERT OR IGNORE preserves any completed MLS rows

================================================================
CARRY-FORWARD VERIFICATION CHECKLIST
================================================================

After the seed workflow runs:
  1. curl https://field-relay-nba.jeffunglesbee.workers.dev/d1/execute \
       -H 'Content-Type: application/json' \
       -d '{"sql":"SELECT COUNT(*) AS n FROM regular_season_games WHERE sport=\"MLS\" AND date >= \"2026-07-19\""}'
     Expected: n > 100

  2. curl https://field-relay-nba.jeffunglesbee.workers.dev/health/sources \
       | python3 -c "import sys,json; print([s for s in json.load(sys.stdin)['sources'] if 'mls' in s['key']])"
     Expected: soccer_fbref_mls reported as ok

  3. grep -A3 schedule .github/workflows/soccer-fbref-wc.yml
     Expected: cron '0 8 */3 * *' still present

================================================================
COMMITS
================================================================

  1. "feat: MLS return prep — post-WC schedule seed script + FBref fetcher"
     - scripts/seed-mls-return-2026.py
     - scripts/soccer-fbref-mls.py
     - outbox/cc-mls-return-2026-06-22.md (this manifest)

  2. "feat: soccer-fbref-mls weekly cron (MLS resumes July 20)"
     - .github/workflows/soccer-fbref-mls.yml

Smoke: not affected (no index.html / sw.js / smoke.js changes).
Deploy: not triggered (none of the deploy-gate paths touched).
