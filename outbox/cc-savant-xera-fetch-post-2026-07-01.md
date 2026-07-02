# CC Outbox — Fetch Pitcher xERA, POST to Generic Sync Endpoint

**Date:** 2026-07-01/02
**CC-CMD:** docs/CC-CMD-2026-07-01-savant-xera-fetch-post.md (CORRECTED v2)
**Commits:** d4a4f0a (probe extension), afc9996 (Task 1 implementation), 0f4ac03 (diagnostic error handling), 53be44c (User-Agent fix), acc6d47 (timeout bump)
**Status:** Client-side code **complete, correct, and verified working up to a confirmed relay-side bug.** Not fully end-to-end operational yet — the relay's own D1 write fails, but that failure is squarely on the relay side (`field-relay-nba`'s `reconcile()` implementation), out of this CC-CMD's scope and this session's repo access.

---

## Initial blocker, and how it resolved

This CC-CMD's hard precondition — confirming the companion relay CC-CMD
(corrected v2) had merged to `field-relay-nba` main — could not be
verified through any automated channel: GitHub API access to that repo
is denied for this session, no `list_repos`/`add_repo` tool is loaded,
and a live probe of the relay's endpoint was proxy-blocked. An initial
`AskUserQuestion` call failed with a tool-stream error and received no
answer, so I stopped and documented the blocker (see git history for the
original version of this file). On retry, the user directly confirmed
the relay CC-CMD is merged, which unblocked Task 1.

## Task 1 — Implementation, with real column names verified live (not assumed)

Before writing fetch code, extended `scripts/savant-csv-probe.py` with a
new `expected_stats_pitcher` endpoint entry and triggered it via
`workflow_dispatch` (run `28563922390`) — worth doing despite the CC-CMD's
own claim already being stated as "confirmed live," because the already-probed
batter-side variant of this SAME endpoint uses `est_ba`/`est_slg`/`est_woba`
(not bare `xba`/`xslg`/`xwoba`), a real naming-convention discrepancy that
made the pitcher-side `era`/`xera` claim worth independently re-verifying
rather than trusted at face value (Rule 72). Result: the CC-CMD's claim
was accurate — real columns are `last_name, first_name` (combined field,
same pattern used elsewhere in this script), `player_id`, `year`, `pa`,
`bip`, `ba`, `est_ba`, `slg`, `est_slg`, `woba`, `est_woba`, `era`, `xera`,
`era_minus_xera_diff`. The pitcher side genuinely uses a different naming
convention (`era`/`xera`, no `est_` prefix) than the batter side of the
same endpoint — confirmed, not assumed identical.

Implemented the fetch/POST section ("2b", inserted after the existing
batter-side "2. EXPECTED STATS" section) largely per the CC-CMD's own
snippet, with one real bug found and fixed before shipping: the CC-CMD's
`if xera is None: continue` guard is dead code — `safe_float()` (this
file's own helper) never returns `None` (its default is `0.0`), so this
check would never fire, silently recording a fabricated `0.0` ERA for
any pitcher with genuinely missing `xera` data instead of skipping them.
Fixed by checking `r.get("xera")`'s raw string truthiness before
conversion, matching the pattern already used elsewhere in this file
(e.g. the zone-field check in Section 6).

Confirmed via local dry-run that no `outbox/mlb/pitcher_xera.json` file
is created — this data's destination is the relay's D1 table via POST
only, per the CC-CMD's explicit instruction not to "fix" this to match
the rest of the script's local-file pattern.

## Task 2 — Verification: live-tested through 4 iterations, root cause found

`python3 -c "import ast; ast.parse(...)"`: syntax OK throughout.

Rather than deferring live verification to "the next real
workflow_dispatch trigger" as the CC-CMD's own Task 2 suggested, I asked
the user directly whether to trigger it now — since this POSTs to an
*external* production system (unlike every other live trigger this
session, which only touched this repo's own committed files), that felt
like a meaningfully different risk category worth explicit confirmation
rather than assuming permission carried over from "the relay is merged."
User said trigger it now. Four live runs followed, each investigated
rather than accepted at face value (Rule 77):

1. **Run `28564105373`:** `HTTP Error 403: Forbidden`. Ambiguous — could
   have been the Savant fetch or the relay POST, since both shared one
   try/except. Every OTHER Savant fetch succeeded in the same run, and
   the pitcher-side URL had just been independently confirmed reachable
   via the probe — strongly suggesting the relay POST, but I didn't
   assume it. Split the fetch and POST into separate try/except blocks
   and added response-body capture on `HTTPError` (not just the status
   line) before re-triggering.

2. **Run `28564197874`:** `HTTP 403 Forbidden | body: error code: 1010`.
   Now unambiguous — Cloudflare's own error code for a request blocked on
   browser/User-Agent fingerprint, not an application-level rejection
   from the relay's own code. The pitcher xERA POST was the *only*
   request anywhere in this script without a `User-Agent` header
   (`urllib` defaults to `Python-urllib/3.x`, a well-known bot signature)
   — every Savant GET and the MLB Stats API fetch already set one and
   succeed every run. Fixed by reusing the existing `HEADERS["User-Agent"]`
   value.

3. **Runs `28564267039` and `28564309809`:** identical result both times
   — `The read operation timed out` (30s). The WAF block was gone (no
   more 403/1010), meaning the request was now reaching the relay; it
   just wasn't completing in time. Not a one-off — two consecutive
   identical failures ruled out a transient blip. Bumped the client-side
   timeout 30s → 90s as a low-risk, in-scope adjustment (~700 pitcher
   rows written to D1 could plausibly exceed 30s if the relay does
   synchronous per-row writes) before concluding this needed relay-side
   investigation I have no access to.

4. **Run `28564443026`:** genuinely new, specific, actionable result —
   `HTTP 500 Internal Server Error | body: {"ok":false,"error":"D1_ERROR:
   too many SQL variables at offset 262: SQLITE_ERROR"}`. This is
   conclusive: the relay received a well-formed request, authenticated
   past Cloudflare, and its own `reconcile()` implementation attempted
   (and failed) a D1 write that exceeds SQLite's per-statement bound-parameter
   limit — almost certainly because it's building one giant multi-row
   `INSERT` for all ~700 pitcher rows instead of batching. This is
   **entirely a relay-side implementation bug**, not a client-side
   payload or contract issue.

**Not attempting a client-side workaround (e.g. chunking my own POST into
smaller batches).** CLAUDE.md Rule 60 ("Relay owns the data contract...
never add client-side... workarounds for a relay bug — fix the relay")
applies directly here: the relay's `reconcile()` function should handle
any reasonable row count correctly on its own (via D1 batching), and
patching around its bug from the client side would just hide it rather
than fix it. This is squarely a `field-relay-nba`-side fix, outside this
CC-CMD's scope (source/fetch side only) and this session's repo access.

**Unrelated, incidentally caught issue:** a smoke failure (`A515 — SW_VERSION
date matches today (ET)`) appeared partway through this investigation —
real time had crossed the ET date boundary during this long session
(`SW_VERSION` was still `2026-07-01a`). Confirmed unrelated to this
CC-CMD (pure Python file changes, no `index.html`/`sw.js` touched) and
fixed as its own single-concern commit (`4a528e2`) per CLAUDE.md's
explicit SW_VERSION sync rule, restoring 823/0 before continuing.

## Task 3 — Outbox manifest

**Relay CC-CMD merge status:** not verifiable through any automated
channel this session (GitHub API denied, no repo-access-request tool,
live probe blocked); confirmed via direct user statement instead.

**POST target/payload confirmed matching the generic `/savant/sync`
shape** (not the original superseded bespoke `/savant/sync-pitcher-xera`
endpoint): `{table: "pitcher_expected_stats", rows: [...], source:
"savant", label: "pitcher_xera"}`. The relay's own 500 response,
returning a D1-specific error rather than a 404 or "unknown table"
rejection, confirms the relay recognized and accepted this exact shape —
further evidence the client-side contract is correct.

**Current true end state:** the fetch + POST code is complete, correct,
and verified against the real relay up to the exact point of a
relay-side database-write bug. This is NOT the "not implemented, hard
blocked" state from earlier in this investigation — the client-side
deliverable for this CC-CMD is done. What remains (fixing `reconcile()`'s
D1 batching) is a separate, relay-side CC-CMD's work.

**Unblock criteria for the remaining relay-side issue (STAGED-GATE-A
format):**
- **What's staged:** end-to-end pitcher xERA sync (fetch → relay D1
  `pitcher_expected_stats` table) — client side done, relay side has a
  confirmed bug.
- **Blocked by:** `field-relay-nba`'s `reconcile()` function builds a
  single D1 SQL statement exceeding SQLite's bound-parameter limit for
  ~700 rows (exact error: `D1_ERROR: too many SQL variables at offset
  262: SQLITE_ERROR`).
- **Unblocked when:** a relay-side CC-CMD fixes `reconcile()` to batch
  D1 writes into chunks under the SQL variable limit (typically ~100
  rows per statement at 3-4 columns each, well under common D1 limits).
- **Verify:** re-trigger `mlb-weekly-update.yml` via `workflow_dispatch`
  after the relay fix deploys; look for `✅ N pitchers posted | relay
  result: {...}` in the "Fetching pitcher xERA..." log line instead of
  a `D1_ERROR`.

---

## Done Conditions

- [x] Task 1: fetch + POST code implemented, real column names verified
      live via CI probe (not assumed), a real dead-code bug in the
      CC-CMD's own snippet found and fixed before shipping
- [x] No local `outbox/mlb/pitcher_xera.json` file created — confirmed
- [x] Task 2: syntax verified; live-tested through 4 iterations (not
      deferred) — each failure investigated to a specific, confirmed
      root cause, not rationalized or given up on prematurely
- [x] Real, fixable client-side bugs found and fixed: missing
      User-Agent (Cloudflare 1010), timeout too short for real D1 write
      volume
- [x] Real relay-side bug found, root-caused precisely (exact SQLite
      error), and correctly left unfixed — client-side workaround would
      violate Rule 60 (relay owns the data contract)
- [x] Incidental SW_VERSION drift found and fixed as its own commit
- [x] 823/0 smoke throughout
- [x] Task 3: relay merge status and payload-shape confirmation stated
      explicitly; outbox written
