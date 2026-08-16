# CC Session — 2026-08-16 — scheduled-workflow waste audit (both repos)

Follow-on from removing `field-autodeploy.yml`'s `*/30` schedule (`e703bedf`).
Question: do the other scheduled workflows share the same waste pattern?

Scope: all 33 workflows carrying a `cron:` across jubilant-bassoon and
field-relay-nba. Findings are measured from live GitHub Actions run history and
job logs, not inferred from the YAML.

## Two measurement corrections that change the numbers

**1. Nominal cron ≠ delivered runs.** GitHub drops high-frequency scheduled
runs under load. Measured over live samples:

| workflow | nominal/day | actual/day | overestimate |
|---|---|---|---|
| wnba-slate-to-kv (`*/5`) | 288 | 59 | 4.9× |
| auto-merge-stray (`*/30`) | 48 | 39 | 1.2× |
| deploy-drift-detector (`*/30`) | 48 | 39 | 1.2× |

A naive cron-arithmetic table put total scheduled volume at 13,514 runs/month.
Measured, the `*/5` entry alone drops ~6,900 off that. Never cost a cron from
its expression.

**2. Billing rounds up to the whole minute per job**, so a 16-second job bills
a full minute. Run *count* dominates, not duration — short frequent jobs are the
worst possible shape. The one exception below (drift detector, 117 s) is the
biggest minute consumer despite a middling run count.

## Tier 1 — broken, not merely wasteful

**`auto-merge-stray-branches.yml` (relay, `*/30`, ~1,171 runs/mo) — a stuck
safety net reporting success.** Every sweep since 2026-06-22 has hit the same
branch and failed:

```
Sweeping: claude/zealous-brahmagupta-tm92w3
  HTTP 409
  ❌ Merge failed for claude/zealous-brahmagupta-tm92w3 — left intact for manual review
```

The branch is 325 commits ahead of main, 98 files, +28,366 lines. A 409 conflict
does not self-resolve, so this has failed ~2,700 consecutive times and will fail
forever. **The run still reports `conclusion: success`** — the sweep job's `else`
branch echoes the failure without `exit 1` (the `push`-triggered job on the same
file does exit 1; only the sweep swallows it). So the red X that would surface
this never appears.

Note the schedule is also redundant: `push: claude/**` already fires on the real
event. The `*/30` sweep is the same "poll something an event trigger already
covers" pattern as field-autodeploy.

**The client has the inverse failure.** `jubilant-bassoon` has **no**
auto-merge workflow at all, and carries its own stray branch
`claude/elegant-shannon-t2dvt0` (2026-07-01, 3,747 commits ahead). Relay: sweeper
stuck on an unmergeable branch. Client: unmergeable branch, no sweeper.

## Tier 2 — completed work still on a schedule

`drama-backfill.yml` and `score-fill.yml` are both titled **"(one-shot)"** and
both still run on cron (every 2 h; 6×/day). Measured on drama-backfill run
`31957975106`:

- `Run backfill` step: started 16:13:27, completed 16:13:27 — **0 seconds**,
  zero log output.
- Total job 13 s, i.e. 100 % runner scaffolding (checkout + setup-node).
- 449 runs accumulated this way.

The backfill is done. Precedent for the cleanup is already in this repo:
`verify-pending-checks.yml` carries a comment removing a check because
"re-checking a permanently-true fact every 6 hours forever added no value."
Same reasoning, unapplied here.

## Tier 3 — cadence inherited from the workflow just deleted

`deploy-drift-detector.yml` (client, `*/30`) states its cadence rationale in a
header comment: *"Cadence matches field-autodeploy.yml, the most similar existing
deploy-related scheduled workflow in this repo."* That anchor was itself a pure
no-op burning ~1,440 runs/month, so the justification is void — the cadence was
copied from waste.

It is also the **largest minute consumer audited**: 39 runs/day × 117 s mean
(it does `fetch-depth: 0`, a full-history clone of a repo whose single tracked
file is 2.6 MB) ≈ **2,344 billed min/mo**, more than wnba-slate-to-kv and
auto-merge combined. Detection-only work does not need full history; drift is a
two-value comparison.

## Tier 4 — seasonal and expired

- `wnba-slate-to-kv.yml` (`*/5`, ~1,778 runs/mo) **genuinely works** — logs show
  real slates written to KV (`HTTP 200 ... "count":3`). But it is a *failover*
  producer, consumed only during an ESPN outage, and it runs year-round at
  `*/5`. WNBA's season ends in ~September; Oct–Apr is ~7 months of producing a
  failover slate for a league that is not playing.
- `espn-ufl-live-probe.yml` — 7 fixed-date crons, all on dates in May/June 2026
  that have passed. Dormant now, will re-fire on those calendar dates next year
  against a season that has ended. Negligible volume; listed for correctness.
- `nba-clutch-update.yml` (`0 6 */3 6,7 *`) is correctly month-gated to June/July
  — this is the pattern the WNBA one should follow.

## The billing premise does not hold up — flagging rather than assuming

This audit was motivated by 90 % of the Actions budget being consumed. **Both
repos are public** (verified: `repository.private = false` on a live run
record), and public repos get standard-runner minutes free. So none of the waste
above is what is billing.

Cutting it is still worth doing — a stuck safety net and no-op noise are real
problems independent of cost — but it will **not** reclaim the budget. Before
optimizing further, confirm where the spend actually is: a private repo on the
same account, larger/GPU runners, or Actions **storage** (artifacts + logs),
which is billed separately and is the usual culprit when minutes look free.

## Ranked actions (none executed — audit only)

| # | Action | Effect |
|---|---|---|
| 1 | Resolve or delete `claude/zealous-brahmagupta-tm92w3`; add `exit 1` to the sweep's failure branch | Unsticks the safety net; makes future failures visible |
| 2 | Drop `schedule:` from relay `auto-merge-stray-branches.yml` (keep `push: claude/**`) | −1,171 runs/mo, no loss of coverage |
| 3 | Decide `claude/elegant-shannon-t2dvt0` (client); port the sweeper or delete the branch | Closes the inverse gap |
| 4 | Drop `schedule:` from `drama-backfill.yml` + `score-fill.yml`, keep `workflow_dispatch` | −547 runs/mo of 0-second work |
| 5 | Re-base `deploy-drift-detector.yml` cadence on its own merits; drop `fetch-depth: 0` | Largest minute saving (~2,344 min/mo) |
| 6 | Month-gate `wnba-slate-to-kv.yml` to the WNBA season | ~7 months/yr of ~1,778 runs/mo |
| 7 | Verify actual Actions spend source (storage vs minutes vs private repo) | Prerequisite to any further cost work |

## Verification artifacts (Rule 90)

- Stuck merge: job `95202301271` log, `HTTP 409` + `Merge failed`, run conclusion `success`.
- No-op backfill: job `95191459713`, step `Run backfill` start == end timestamp (0 s).
- Working WNBA producer: job `95204059660` log, `KV write: HTTP 200 {"ok":true,...,"count":3}`.
- Branch state: `git ls-remote --heads origin 'refs/heads/claude/*'` in both repos returns exactly one ref each.
- Repo visibility: `repository.private = false` on run `31963133278`'s record.

## Correction made during this session

An early `git ls-remote` reported 0 stray branches. That was run from a reset
shell cwd (`/home/user`, not a git repo) and was wrong — both repos have one.
Re-verified from inside each repo before any finding above was written.
