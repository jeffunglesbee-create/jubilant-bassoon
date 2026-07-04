# CC-CMD: OG worker run_worker_first fix v2 — use the boolean, measure latency for real

**Date:** 2026-07-04
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main
**Scope:** `wrangler.jsonc`'s `assets` block, one value.

**Context — real, confirmed blocker from the prior attempt:** the array
form (`run_worker_first: ["/"]`) was tried and failed with a real
Wrangler CLI error: `Expected "assets.run_worker_first" to be of type
boolean`. Root cause confirmed: this repo pins `wranglerVersion:
"3.109.0"` in `deploy-gate.yml`, and that version's schema only accepts
a boolean. The array form is real (current Cloudflare docs describe it)
but requires a newer Wrangler than what's pinned here. The prior attempt
correctly refused to invent a workaround, reverted cleanly, and reported
verbatim rather than silently picking `true` despite it being the only
working value — that was the right call, not a failure to correct here.

**Decision made — stated explicitly, not left ambiguous:** use
`run_worker_first: true` (unscoped boolean) rather than bumping the
pinned Wrangler version. Reasoning: bumping a pinned CI dependency is
its own real, separate risk surface (unrelated behavior changes between
3.109.0 and whatever version supports the array form, untested against
this specific deploy pipeline) for a benefit (avoiding Worker
invocation on non-HTML static assets) that is directly, empirically
measurable and may turn out to be negligible. Measure first; only
pursue the version-bump path later if the boolean's real, measured cost
turns out to be unacceptable.

**Target time:** ~25 min (real measurement takes real requests, not
just a config change)

## ENVIRONMENT CONSTRAINTS (copy verbatim)
- *.workers.dev:443 blocked from CC egress — CI-as-proxy for all live checks
- Playwright tests must run via GitHub Actions CI — never localhost
- api.github.com is reachable from CC bash
- No branch switching — work on main only
- 2 attempts max on any push — declare failure and stop if both fail

## CONFIDENCE GATE
Do not commit unless confidence ≥ 95 on the config change itself. The
latency measurement is inherently a point-in-time sample, not a
statistical guarantee — report the real numbers honestly rather than
overclaiming certainty from a small sample.

## PROBE BLOCK (run before any edits)
```bash
cat wrangler.jsonc
grep -n "wranglerVersion" .github/workflows/deploy-gate.yml
curl -s "https://field-relay-nba.jeffunglesbee.workers.dev/circadian/preview/$(TZ=America/New_York date +%Y-%m-%d)"
```
Confirm current state matches this doc's description before editing.

## TASK 1 — Set the boolean

```json
  "assets": {
    "directory": ".",
    "binding": "ASSETS",
    "run_worker_first": true
  },
```

## TASK 2 — Measure real latency impact, before committing to keeping it

Via CI-as-proxy (outbox trigger, same pattern used all session), from a
GitHub Actions runner:
1. Time N (at least 10) requests to a static asset path (e.g., an image
   or icon file already served by this site) BEFORE this change ships
   (i.e., against the currently-deployed version, prior to this commit).
2. After deploying this change, time the same N requests to the same
   asset path again.
3. Report both sets of real numbers (not just an average — min/max/
   median) side by side in the outbox. If the delta is large enough to
   be a real user-facing concern (use judgment; state the threshold you
   used and why), say so explicitly rather than burying a bad number in
   an average. If it's negligible, say that explicitly too — either
   real outcome is an acceptable result of this task, silence about it
   is not.

## TASK 3 — Verify the actual feature works end-to-end

Same as the original CC-CMD's Task 2: confirm with a real bot User-Agent
that `og:description` now appears, and confirm a normal User-Agent still
gets unchanged behavior.

## SCOPE BOUNDARY

DO:
- Set exactly `run_worker_first: true`
- Measure real before/after latency on a static asset path, report real numbers
- Verify the OG feature works end-to-end for both bot and non-bot UAs

DO NOT:
- Attempt the array form again — already confirmed incompatible with the pinned Wrangler version
- Bump the pinned Wrangler version in this CC-CMD — that's a separate decision with its own risk surface, not bundled into this one
- Modify `src/worker.js`

## DONE CONDITIONS
- [ ] Probe block re-run, current state confirmed
- [ ] `run_worker_first: true` set
- [ ] Real before/after latency numbers reported (min/max/median), with an explicit judgment call on whether the delta is acceptable
- [ ] Bot-UA and non-bot-UA verification both completed live
- [ ] CI confirms deployed
- [ ] Outbox manifest written to `docs/outbox/cc-og-worker-run-first-fix-v2-{date}.md` with the real measurement data included in full, not summarized away

## COMPLIANCE
- Rule 68: probe block first
- Rule 87: self-completing — the latency measurement is achievable within this session via CI-as-proxy timing, not deferred

## CONFIDENCE SCORING TABLE
+25  Boolean set correctly
+35  Real before/after latency numbers reported honestly, with explicit judgment stated
+25  Bot/non-bot verification both completed live
+15  CI confirms deployed

## ONE-LINER
git pull. Read docs/CC-CMD-2026-07-04-og-worker-run-first-fix-v2.md.
Re-confirm current wrangler.jsonc and the pinned Wrangler version first.
Set run_worker_first: true (the array form is confirmed incompatible
with this repo's pinned version, do not retry it). Measure real
before/after latency on a static asset request via CI-as-proxy and
report the actual numbers, not just a verdict. Verify the OG feature
works for a real bot UA and that normal UA behavior is unchanged. Do
not commit unless confidence ≥ 95. If score < 95 report verbatim and
stop — do not invent results.
