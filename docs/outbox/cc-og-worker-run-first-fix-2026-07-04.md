# CC Outbox — OG Worker run_worker_first Fix — BLOCKED, REVERTED

**Date:** 2026-07-04
**CC-CMD:** docs/CC-CMD-2026-07-04-og-worker-run-first-fix.md
**Commits:** 4b2538f (implementation — later reverted), 8515b47 (revert), 7ddc5e8 (verify tooling, unused)
**Deploy:** Deploy gate run 28718069644 — **FAILED** (the actual bug this feature exists to catch). Revert's own deploy gate run — succeeded, restoring normal deploy capability.

**Outcome: this CC-CMD's stated goal was NOT achieved. Confidence on the
CC-CMD's own rubric is 0/100, not ≥95 — reporting honestly and stopping,
per the CC-CMD's own explicit instruction, rather than inventing a
workaround or silently choosing an option the doc explicitly forbids.**

---

## Probe block — re-run, both premises confirmed live before editing

```
cat wrangler.jsonc        → matches doc exactly, no run_worker_first key
cat src/worker.js          → matches doc's description exactly, untouched
curl .../circadian/preview/2026-07-04 → {"ok":true,"text":"...","source":"kv",...}
```
Both of the doc's premises (missing config key; dependency endpoint
still healthy) were confirmed true before any edit — this was not a
stale-premise situation like some earlier tasks today.

## Implementation attempt (TASK 1) — failed live, reverted

Added exactly `"run_worker_first": ["/"]` to `wrangler.jsonc`'s `assets`
block, exactly as the CC-CMD specified (array form, scoped to root
only, not `true`). Committed (`4b2538f`), pushed clean on attempt 1.

**Deploy-gate run 28718069644 failed immediately**, with a concrete,
reproduced error from Wrangler's own CLI:
```
✘ [ERROR] Processing wrangler.jsonc configuration:
    - Expected "assets.run_worker_first" to be of type boolean but got ["/"].
```
Root cause, confirmed via direct read of `deploy-gate.yml`: this repo
pins `wranglerVersion: "3.109.0"` (log shows "update available 4.107.0"
— i.e. a full major version behind). **Wrangler 3.109.0's schema for
`assets.run_worker_first` only accepts a boolean.** The array-of-paths
form the CC-CMD specified (and which Cloudflare's current documentation
describes) is a newer feature this pinned version does not support.

This is a genuine conflict between the CC-CMD's explicit instruction
and this environment's actual, confirmed capability — not a mistake in
implementing the doc's instruction. The doc's own SCOPE BOUNDARY
explicitly says **"DO NOT: Set run_worker_first: true (unscoped) —
unnecessary latency cost for every static asset."** The only value that
actually works with this repo's pinned Wrangler version is exactly the
one the doc prohibits. I did not unilaterally choose `true` anyway —
that would be inventing a result the doc explicitly rejected, and
silently working around an explicit constraint is exactly the kind of
unauthorized scope decision this repo's governance rules single out.

## Immediate remediation (not optional — this was actively blocking all future deploys)

The broken config in `wrangler.jsonc` would have failed **every
subsequent deploy-gate run** touching index.html, sw.js,
field_utils.js, or wrangler.jsonc — not just this feature. Per Rule 77
(investigate and fix immediately, don't leave a known-broken state),
reverted `wrangler.jsonc` to its exact prior working form (commit
`8515b47`), pushed, and confirmed via a fresh deploy-gate run
(`28718120443`) that deploys succeed again. `origin/main`'s
`wrangler.jsonc` now matches the pre-CC-CMD state exactly (verified via
`git show origin/main:wrangler.jsonc`).

**Net effect: the OG share-meta bug this CC-CMD set out to fix is
UNRESOLVED — bots still won't see `og:description` (confirmed by the
CC-CMD's own root-cause analysis, unchanged by this session). But the
site's normal deploy pipeline is intact and undamaged.**

## TASK 2 (live bot/non-bot verification) — not performed

Since the fix itself never successfully deployed, there was nothing
live to verify — running the bot-UA/non-bot-UA probe against the
current (reverted) production state would only reconfirm the ORIGINAL
bug (no `og:description` tag), which is already known and not new
information. The verify-probe tooling
(`cfl_wire_verify_probe.js`-style `og_worker_verify_probe`... actually
`.github/workflows/og-worker-verify-probe.yml`) was built and committed
(`7ddc5e8`) but not run against a fix that isn't live — it remains
available, unused, for whichever follow-up approach ends up shipping.

## What would actually fix this (not implemented — needs an explicit decision)

Two real options exist; picking either is a decision beyond this
CC-CMD's own stated scope and constraints, so it's being surfaced
rather than decided unilaterally:

1. **Set `run_worker_first: true`** (boolean, unscoped) — works with
   the pinned Wrangler version today, but explicitly contradicts the
   CC-CMD's own stated latency concern (every static asset request
   would route through the Worker's `fetch()` handler, though the
   handler's own `isBotRequest` check returns almost immediately for
   non-bot traffic, and non-HTML content-type check returns early too
   — the actual added latency per request is likely small, but "likely
   small" is not the same as verified, and the doc explicitly asked to
   avoid this path).
2. **Bump `wranglerVersion` in `deploy-gate.yml`** to a version that
   supports the array form (4.x, per the deploy log's own "update
   available 4.107.0" notice) — a separate, higher-risk change to
   shared CI infrastructure that would need its own dedicated
   CC-CMD, probe block, and verification (a wrangler major-version bump
   can carry its own breaking changes beyond just this config key).

Neither was implemented here — both require an explicit decision this
CC-CMD didn't anticipate needing, and Rule 87 (no deferred work without
a second CC-CMD) applies: whichever direction is chosen belongs in its
own follow-up CC-CMD, not decided ad hoc inside this one.

## Smoke / SW_VERSION

No index.html/sw.js content was changed by either the attempt or the
revert — `node smoke.js index.html` unaffected throughout (871/0,
unchanged from before this task). No SW_VERSION bump applies.

## CC-verifiable confidence score (per the doc's own rubric) — reported honestly, not inflated

- **+30** run_worker_first added correctly, scoped to root only — **0/30.** The value added matched the doc's literal spec, but it does not actually work in this environment (confirmed via live deploy failure) — "correctly" has to mean "functions correctly," not just "matches the text of the instruction."
- **+35** Live bot-UA verification shows real og:description tag present — **0/35.** Never reached; the fix isn't live.
- **+20** Live non-bot-UA verification confirms unchanged behavior — **0/20.** N/A, no fix is live to verify.
- **+15** CI confirms deployed — **0/15** on the feature (the feature's own deploy failed). The revert's deploy did succeed, but that's restoring baseline, not shipping the fix.

**Total: 0/100 against this CC-CMD's actual goal.** Far below the ≥95
gate. Per the CC-CMD's own explicit instruction — "If score < 95 report
verbatim and stop — do not invent results" — stopping here rather than
unilaterally picking `run_worker_first: true` or bumping the Wrangler
version to force a passing result.

## Deferred to chat / next steps (explicit decision needed, not a scope failure)

- [ ] **Decide**: accept `run_worker_first: true` (small, unverified-but-
      likely-small latency cost on non-bot/non-HTML requests) as a
      revised, explicitly-authorized scope for a new CC-CMD, OR
- [ ] **Decide**: author a separate CC-CMD to bump `wranglerVersion` in
      `deploy-gate.yml` to a version supporting the array form, with its
      own probe block and verification, THEN retry the array-scoped fix.
- [ ] Either path needs its own CC-CMD per Rule 87 — this one is closed
      as **blocked/reverted**, not shipped.

---

## Done Conditions

- [x] Probe block re-run, current wrangler.jsonc and worker.js confirmed
      matching this doc's description
- [ ] `run_worker_first: ["/"]` added exactly as specified — **added,
      then reverted after confirmed live deploy failure**
- [ ] Live verification (Task 2) — **not reached**, fix never
      successfully deployed
- [x] CI confirms deployed — **true only for the revert**, restoring
      baseline; the feature itself never deployed successfully
- [x] Outbox manifest written (this file), documenting the real
      blocker, the immediate remediation taken, and the two real,
      undecided paths forward
