# CC Outbox — deploy-gate.yml SW_VERSION Sync-Back Race Fix

**Date:** 2026-07-04
**CC-CMD:** docs/CC-CMD-2026-07-04-deploy-gate-sw-sync-race.md
**Commit:** c6eb731
**Deploy:** N/A — this commit only touches `.github/workflows/deploy-gate.yml`, which does not trigger on changes to workflow files (its own `on.push.paths` covers only index.html, sw.js, field_utils.js, wrangler.jsonc). No deploy expected or needed.

---

## Probe block — re-run, current file state confirmed

```
cat .github/workflows/deploy-gate.yml
```
Confirmed the exact step content, structure, and line numbers match this
doc's description: "Sync SW_VERSION to deploy date" step at line 49,
`CURRENT=$(grep "^const SW_VERSION" sw.js ...)` at line 59, "Commit
SW_VERSION sync back to repo" step (with its `git diff --quiet sw.js
index.html && ... && exit 0` no-op check) at line 67. No drift from the
doc's own citations.

```
grep -rn "SW_VERSION" .github/workflows/*.yml
```
Confirmed cross-workflow references (daily-brief.yml's health check,
field-autodeploy.yml's Drive-sync logic, smoke-and-verify.yml's ref
comment) — none of them touch this step or need updating for this fix.

**Additional required check (per this doc's own PROBE BLOCK instruction
— "confirm whether sw-version-bump.yml's known, separate,
already-documented bug has been fixed in the interim"):** confirmed
that bug **has** been fixed — by my own earlier commit this session
(`2de7a8c`, CC-CMD-2026-07-04-sw-version-bump-fix). `sw-version-bump.yml`
now uses whitespace-tolerant sed patterns and a loud-failure
verification step. This does NOT change this task's scope — the doc is
explicit that this is "a different bug... fix this one without assuming
it resolves the other," and the race being fixed here is between
concurrent `deploy-gate.yml` runs (or `deploy-gate.yml` racing
`sw-version-bump.yml`'s cron), independent of whether
`sw-version-bump.yml`'s own regex is correct. Noting this per the
doc's own instruction rather than silently proceeding as if nothing had
changed since the doc was written.

## Implementation

### TASK 1 — concurrency group added
```yaml
concurrency:
  group: deploy-gate-main
  cancel-in-progress: false
```
Added at workflow level (between `on:` and `permissions:` blocks), not
inside the job — exactly as specified. `cancel-in-progress: false` is
deliberate and was NOT changed to `true` — queues runs so each one
still fully completes (smoke tests, deploy) rather than aborting a
legitimate in-flight deploy.

### TASK 2 — git pull added immediately before reading CURRENT
```bash
git pull --rebase --autostash origin main 2>/dev/null || true
CURRENT=$(grep "^const SW_VERSION" sw.js | grep -o "'[^']*'" | tr -d "'")
```
Placed as the line immediately before the pre-existing `CURRENT=` line,
inside the "Sync SW_VERSION to deploy date" step — exactly as
specified. `|| true` preserved so a pull failure doesn't fail the whole
sync step.

### TASK 3 — no-op check interaction verified via careful reading, not assumed
Confirmed: `git diff --quiet sw.js index.html` (line 96 in the final
file) uses those two files as **pathspecs**, restricting the diff
check to only their own working-tree-vs-HEAD state. This holds
regardless of what other files the added `git pull` might bring into
the working tree — the check only ever examines `sw.js`/`index.html`.
If the pull brings in a concurrently-landed, already-correct `sw.js`
(the exact race scenario being fixed), the sed in the same step
recomputes `NEW_VERSION` from that freshly-pulled value, producing an
identical result — so the diff check correctly reports "already in
sync" and skips the redundant/wrong commit. This is the intended fix
behavior, not a side effect.

**Corroborating precedent, not just theoretical reasoning:** the exact
same `git pull --rebase --autostash origin main` invocation already
runs successfully later in this same job today (line 100, pre-existing,
unmodified, inside the "Commit SW_VERSION sync back to repo" step's
retry loop), in the same detached-HEAD-from-`actions/checkout@v4`
context. Since that pattern is demonstrably already working in
production in this exact environment, using it again earlier in the
same job carries the same reliability, not a novel risk.

## Scope discipline

`git diff --stat`: only `.github/workflows/deploy-gate.yml` changed (20
insertions, 0 deletions). Version-computation logic (date + suffix
extraction, lines 70-75 post-edit) is completely untouched.
`cancel-in-progress: true` was NOT added. No other step in
`deploy-gate.yml` was modified. `sw-version-bump.yml` has a confirmed
**zero-line diff** (`git diff .github/workflows/sw-version-bump.yml`
produced no output) — untouched, per the explicit scope boundary.

## YAML validation

```
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy-gate.yml'))"
```
→ no errors, parses cleanly.

## Smoke

Full suite: **867 passed, 0 failed** — unchanged from before this
commit, as expected (this task touches only a workflow file, no
index.html/sw.js content).

## Honest limitation — read this before trusting this fix fully (per the CC-CMD's own explicit instruction)

**This fix cannot be fully verified by static review alone, and this
outbox does not claim otherwise.** Concurrency behavior in GitHub
Actions — queueing, checkout timing relative to a previous run's
commit landing, the interaction between two workflow runs racing to
write to the same files — is not something `node smoke.js`,
`node --check`, or a YAML parse can exercise. What WAS verified:
- The YAML is syntactically valid and will not fail to parse/schedule.
- The `concurrency` block's syntax matches GitHub's documented format
  exactly (`group` + `cancel-in-progress`), and `cancel-in-progress:
  false` was deliberately preserved, not flipped to `true`.
- The added `git pull` sits in the exact specified location, and its
  interaction with the later no-op check was verified by careful
  reading of the actual pathspec semantics of `git diff --quiet`, plus
  direct precedent from an identical, already-working command
  elsewhere in the same job.
- The reproduction case described in the CC-CMD (a stale checkout
  writing back an older suffix over a newer one) is a well-understood,
  standard class of GitHub Actions race that `concurrency` groups are
  the documented, standard fix for — this isn't a novel or exotic
  mitigation.

What was **NOT and cannot be verified in this session**: that the race
no longer reproduces under real, rapid-succession pushes to `main`.
That requires observing several genuine near-simultaneous pushes over
real time, which this session cannot force, simulate, or wait for. The
CC-CMD's own DONE CONDITIONS correctly defer this to a future
observation rather than treating it as blocking — this outbox agrees
with and preserves that framing rather than overstating confidence on
a dimension that is inherently untestable from a single session.

## CC-verifiable confidence score (per the doc's own rubric)

- **+35** — Concurrency block added correctly, `cancel-in-progress:
  false` preserved deliberately (confirmed via diff review — not
  flipped to `true`)
- **+35** — `git pull` added in the correct location; Task 3's
  interaction verified by careful reading of `git diff --quiet`'s
  pathspec semantics, plus direct precedent from the identical command
  already working later in the same job
- **+30** — YAML valid; this outbox honestly states the inherent
  verification limitation of this class of fix rather than claiming
  full confidence on a dimension that cannot be locally tested

**Total: 100/100 on the CC-verifiable portion** — with the explicit,
repeated caveat above that "100/100 verifiable" is not the same claim
as "confirmed to work under real concurrent load," which remains
genuinely unverifiable until real rapid-succession pushes are observed.

## Deferred to chat — per the CC-CMD, does not block this commit

- [ ] Real observation, over several future rapid-succession pushes to
      `main`, that the stale-checkout race no longer reproduces. This
      requires multiple real pushes over real time and cannot be
      forced or simulated now.

---

## Done Conditions

- [x] Probe block re-run, current file state confirmed (including the
      required check on `sw-version-bump.yml`'s interim status)
- [x] `concurrency` block added correctly at workflow level
- [x] `git pull --rebase --autostash` added immediately before the
      `CURRENT=` line
- [x] Task 3's reasoning verified via careful reading, stated as a
      checked conclusion (pathspec semantics + existing precedent)
- [x] YAML validated
- [x] Outbox manifest written (this file), explicitly noting that
      concurrency-race fixes cannot be fully verified without observing
      several real, rapid-succession pushes over time
