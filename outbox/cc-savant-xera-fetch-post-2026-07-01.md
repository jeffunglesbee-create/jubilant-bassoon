# CC Outbox — Fetch Pitcher xERA, POST to Generic Sync Endpoint

**Date:** 2026-07-01
**CC-CMD:** docs/CC-CMD-2026-07-01-savant-xera-fetch-post.md (CORRECTED v2)
**Status:** **BLOCKED — Task 1 not implemented.** Confidence does not clear the 95% bar this session requires; stopping and reporting per the standing instruction rather than shipping.

---

## Why this is blocked

The CC-CMD's own text is an explicit, hard precondition, not a suggestion:

> **Do not run before the relay CC-CMD (corrected v2) has landed** — check
> whether it's confirmed merged to `field-relay-nba`'s `main` before
> proceeding.

I attempted to verify this through every channel available to me this
session and all were blocked:

1. **GitHub API access to `field-relay-nba`** — denied outright.
   `mcp__github__list_commits` against `jeffunglesbee-create/field-relay-nba`
   returned: `"Access denied: repository "jeffunglesbee-create/field-relay-nba"
   is not configured for this session. Allowed repositories:
   jeffunglesbee-create/jubilant-bassoon"`. This session's GitHub MCP scope
   is hard-restricted to this one repo.

2. **A `list_repos`/`add_repo` mechanism to request access** — searched for
   this via `ToolSearch` (multiple query variants); no such tool is loaded
   in this session's toolset. Per the environment's own instructions, when
   this tool isn't available I should say so rather than guess — doing
   that here.

3. **A live HTTP probe of the relay's actual deployed endpoint**
   (`https://field-relay-nba.jeffunglesbee.workers.dev/savant/sync`) — also
   blocked. `curl` returned `CONNECT tunnel failed, response 403` (the same
   proxy policy denial pattern seen all session for `baseballsavant.mlb.com`
   and other non-allowlisted domains — this session's egress policy simply
   doesn't cover this hostname either).

4. **Asked the user directly via `AskUserQuestion`** — the tool call itself
   failed with a stream error (`"Tool permission request failed: Error:
   Tool permission stream closed before response received"`), not a
   decision from the user. No answer was received either way.

With all four channels exhausted, I have **zero visibility** into whether
the companion relay CC-CMD (`CC-CMD-2026-07-01-savant-xera-reconcile-relay.md`,
corrected v2, which builds the generic `POST /savant/sync` endpoint
accepting `{table, rows, source, label}`) has actually merged and deployed.

## Why this isn't a case for proceeding anyway

CLAUDE.md's own Rule 70 (ATOMIC-A, "Cross-repo atomic changes") explicitly
names this exact failure mode:

> Never: ... (c) commit a client change that depends on a relay change
> that hasn't been deployed.

Task 1 is precisely that: it adds code to `mlb-weekly-update.py` that
`POST`s real pitcher xERA data to `/savant/sync` on every future
`workflow_dispatch` trigger or scheduled Monday cron run. If the relay
side hasn't actually landed:
- Best case: the endpoint 404s, the `try/except` catches it, nothing
  breaks but nothing works either (silent no-op, matching the pattern
  already seen this session for `baseballsavant.mlb.com` fetches failing
  gracefully) — low risk, but still not "verified correct."
- Worse case: an OLDER, still-live version of the endpoint (the
  original, superseded bespoke `/savant/sync-pitcher-xera`, or some
  intermediate state) accepts the POST but doesn't handle the `{table,
  rows, source, label}` shape correctly — silently corrupting or
  discarding real data, or writing to the wrong D1 table, with no
  error surfaced to catch it.

Given the CC-CMD's own explicit gate, CLAUDE.md's own rule against this
exact pattern, and the standing instruction for this session ("Do not
commit below 95 confidence — if any task can't clear that bar, stop and
report why instead of shipping it"), shipping Task 1 without any way to
confirm the precondition would be exactly the kind of speed-over-safety
shortcut both documents warn against.

## What I did complete (safe, non-blocked pre-build probe)

Confirmed the batter-side `expected_statistics` fetch block
(`scripts/mlb-weekly-update.py`, "Fetching expected stats..." section) and
`name_key()` (lines 43-48) match the CC-CMD's assumptions exactly — no
drift. This part of the probe doesn't depend on relay status and remains
valid for whenever this CC-CMD is re-attempted.

**One additional inherited-claim flag, secondary to the main blocker
(Rule 72 — inherited claims must be re-verified):** the CC-CMD's CONTEXT
section asserts "confirmed live: `expected_statistics?type=pitcher&year=2026&min=50&csv=true`
has a genuine `xera` column" — I could not independently re-confirm this
column name myself (same proxy block prevents any live Savant fetch this
session). If/when this CC-CMD is re-attempted, Task 1's own instruction to
"verify the exact CSV column names (`era`, `xera`) against a fresh fetch
during the probe step, not assumed from the investigation snapshot" still
applies and was not satisfied here either — a second, independent reason
this specific implementation wasn't ready to ship even setting aside the
relay-status blocker.

## What's needed to unblock (STAGED-GATE-A format, per this session's own convention)

- **What's staged:** Task 1 (the pitcher xERA fetch + POST code) — not implemented.
- **Blocked by:** (a) no confirmation that `CC-CMD-2026-07-01-savant-xera-reconcile-relay.md`
  (corrected v2) has merged to `field-relay-nba` main and deployed; (b) no
  live re-verification of the `era`/`xera` column names in the pitcher-side
  `expected_statistics` CSV (separate, smaller gap).
- **Unblocked when:** either (1) the user confirms the relay CC-CMD is
  merged and deployed, or (2) this session (or a future one) is granted
  GitHub MCP access to `field-relay-nba` so the merge state can be checked
  directly, or (3) the relay's live endpoint becomes reachable from this
  sandbox for a direct probe.
- **Verify:** once unblocked, re-run this CC-CMD's Task 1 with a live probe
  of `expected_statistics?type=pitcher&year=2026&min=50&csv=true` to
  confirm `era`/`xera` columns exist with those exact names before writing
  the fetch code, then a `workflow_dispatch` trigger + relay-side D1 check
  to confirm the POST actually lands correctly.

---

## Done Conditions

- [ ] Task 1 (fetch + POST code) — **not implemented, blocked**
- [x] Pre-build probe completed for the parts that don't depend on relay
      status (batter-side block, `name_key()` — both confirmed unchanged)
- [ ] Task 2 (syntax verification) — N/A, no code was added to verify
- [x] Task 3 (outbox manifest) — this document; explicitly states the
      relay CC-CMD's merge status could not be confirmed through any
      available channel, and that Task 1 was consequently not implemented
- [x] No file left in a partially-modified or inconsistent state —
      confirmed via grep that `scripts/mlb-weekly-update.py` has zero
      existing pitcher-xera-related code, so declining to add Task 1
      leaves the file exactly as it was, not half-done
