# CC-CMD: Fix a real race condition in deploy-gate.yml's SW_VERSION auto-sync-back step

**Date:** 2026-07-04
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main
**Scope:** `.github/workflows/deploy-gate.yml`'s "Sync SW_VERSION to deploy date" step (~line 49-65).

**Why — a real, observed, reproduced failure, not theoretical:** this
step reads `sw.js`'s current version at the checkout it happened to get
when the workflow run started, extracts the trailing letter suffix, and
combines it with today's date to compute a "synced" version — then
commits that back to both files. When several commits land on `main` in
rapid succession (confirmed today: 3 pushes within a few minutes), a
workflow run triggered by an EARLIER commit can execute its sync-back
step AFTER a LATER, already-correct commit has landed — its checkout is
stale by the time it actually runs, so it computes a version reflecting
an intermediate state and overwrites the newer, correct one. Reproduced
live today: a run's stale checkout saw `sw.js` at suffix `k`, wrote
`2026-07-04k` back into `index.html` via a `[skip ci]` commit — even
though `sw.js` had already moved to `2026-07-04l` via a later, real
commit by the time this run's write happened. Confirmed via direct
inspection of the actual conflicting commit's diff and author
(`Deploy-Gate`), not assumed.

**This is a different bug from the already-known `sw-version-bump.yml`
double-space regex issue** (separate CC-CMD, still unexecuted as of this
writing) — that one causes silent no-op failures in a daily cron; this
one causes an active, incorrect overwrite from a race between concurrent
workflow runs. Both currently exist; fix this one without assuming it
resolves the other.

**Target time:** ~25 min

## ENVIRONMENT CONSTRAINTS (copy verbatim)
- *.workers.dev:443 blocked from CC egress
- Playwright tests must run via GitHub Actions CI — never localhost
- api.github.com is reachable from CC bash
- No branch switching — work on main only
- 2 attempts max on any push — declare failure and stop if both fail

## CONFIDENCE GATE
Do not commit unless confidence ≥ 95. This modifies shared CI
infrastructure that runs on every future push — be more conservative
here than on a typical content fix. If the fix's correctness can't be
verified by re-reading the change carefully (workflow logic can't be
unit-tested the way index.html functions can), say so explicitly rather
than assuming a clean diff means a correct fix.

## PROBE BLOCK (run before any edits)
```bash
cat .github/workflows/deploy-gate.yml
grep -rn "SW_VERSION" .github/workflows/*.yml
```
Confirm the exact current step content matches this doc's description —
re-verify line numbers, since this file may have changed since
2026-07-04. Also confirm whether `sw-version-bump.yml`'s known,
separate, already-documented bug has been fixed in the interim (check
its CC-CMD's execution status) — if it has, some of the risk surface
here may have changed, note that rather than assuming this doc's
context is still fully current.

## TASK 1 — Add a concurrency group to serialize sync-back runs

This is the standard, minimal-risk GitHub Actions pattern for exactly
this class of problem: multiple runs racing to write back to the same
files on the same branch. Add near the top of the workflow file
(alongside the existing `on:`/`permissions:` blocks, not inside a
specific job):
```yaml
concurrency:
  group: deploy-gate-main
  cancel-in-progress: false
```
`cancel-in-progress: false` is deliberate — this must QUEUE runs so each
one still fully completes (smoke tests, deploy) rather than CANCEL an
in-progress run when a new one starts (which could abort a legitimate
in-flight deploy). Queueing means a later run's checkout will correctly
see the previous run's completed sync-back commit before computing its
own, eliminating the stale-read race.

## TASK 2 — Make the sync-back step re-pull immediately before reading CURRENT

Defense in depth beyond Task 1 (queueing reduces the race window but a
long-running earlier job could still theoretically finish between this
job's checkout and this specific step). Immediately before the existing
`CURRENT=$(grep ...)` line, add:
```bash
git pull --rebase --autostash origin main 2>/dev/null || true
```
This refreshes the local checkout to the actual current `main` right
before reading `sw.js`'s suffix, rather than relying on the
workflow-start-time checkout, which may be stale by the time this step
runs if earlier steps (smoke tests, etc.) took real time.
`|| true` because a pull failure here should not fail the whole sync
step outright — if it fails, the existing logic still runs against
whatever checkout is present, same as today's behavior, not worse.

## TASK 3 — Verify, don't assume, that this doesn't break the existing "no-op when already in sync" check

The existing "Commit SW_VERSION sync back to repo" step has its own
`git diff --quiet sw.js index.html && ... && exit 0` short-circuit.
Confirm via careful reading (not just diff review) that Task 2's added
`git pull` doesn't interfere with this check — e.g., if the pull brings
in changes to files OTHER than sw.js/index.html, `git diff --quiet
sw.js index.html` should still correctly reflect only those two files'
state, but verify this reasoning holds rather than assuming it.

## SCOPE BOUNDARY

DO:
- Add the `concurrency` block exactly as specified
- Add the `git pull` line exactly as specified, in the correct step
- Verify (Task 3) the no-op check still behaves correctly
- Do NOT touch `sw-version-bump.yml` — that's a separate, already-documented, separately-CC-CMD'd bug

DO NOT:
- Change the actual version-computation logic (date + suffix extraction) — that logic itself is correct, the bug is purely about WHEN it reads stale state
- Add `cancel-in-progress: true` — this would abort legitimate in-flight deploys, a worse failure mode than the one being fixed
- Modify any other step in deploy-gate.yml
- Assume this fix is complete without noting that CI concurrency behavior is inherently hard to verify locally — state this limitation explicitly in the outbox rather than claiming full confidence on a dimension that can't be locally tested

## DONE CONDITIONS
- [ ] Probe block re-run, current file state confirmed
- [ ] `concurrency` block added correctly at workflow level
- [ ] `git pull --rebase --autostash` added immediately before the `CURRENT=` line
- [ ] Task 3's reasoning verified via careful reading, stated as a checked conclusion
- [ ] YAML validated (`python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy-gate.yml'))"`)
- [ ] Outbox manifest written to `docs/outbox/cc-deploy-gate-sw-sync-race-{date}.md`, explicitly noting that concurrency-race fixes cannot be fully verified without observing several real, rapid-succession pushes over time — this is a lower-confidence-by-nature fix than a typical content change, say so plainly

**Deferred to chat — cannot be verified in this session:**
- [ ] Real observation, over several future rapid-succession pushes, that the race no longer reproduces. This requires multiple real pushes over real time and cannot be forced or simulated now.

## COMPLIANCE
- Rule 68: probe block first
- Rule 87: this fix is NOT fully self-completing even on the CC-verifiable portion — CI concurrency behavior genuinely cannot be confirmed by static review alone. Report this honestly rather than claiming higher confidence than is actually possible to establish here.

## CONFIDENCE SCORING TABLE
+35  Concurrency block added correctly, cancel-in-progress:false preserved deliberately
+35  git pull added in the correct location, Task 3's interaction verified by careful reading
+30  YAML valid, outbox honestly notes the inherent verification limitation of this class of fix

## ONE-LINER
git pull. Read docs/CC-CMD-2026-07-04-deploy-gate-sw-sync-race.md.
Re-confirm the workflow's exact current content first (see PROBE BLOCK).
Add the concurrency group (cancel-in-progress: false, deliberately) and
the git pull immediately before reading sw.js's current suffix. Do not
touch sw-version-bump.yml -- that's a separate, already-documented bug.
Validate YAML. Be honest in the outbox that CI concurrency fixes cannot
be fully verified by static review alone. Do not commit unless
confidence ≥ 95. If score < 95 report verbatim and stop — do not invent
results.
