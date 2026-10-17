# Claude Code Command — make the absence-collapse census a ratchet, and point it at the relay

**Branch:** main — commit directly, do not create a feature branch or PR
**Repo:** jubilant-bassoon
**Confidence gate:** >= 95 before any commit
**Filed:** 2026-10-16 by chat
**Status:** NOT STARTED — not dispatched.

Rule 99 (DISTINGUISHABILITY-A) names the class that nine separate defects
instantiated in the week of 2026-10-10 alone: `/bsd/contract` declaring a frame
it did not have, `/bsd/r2/list` answering from a prefix it did not name, six BDB
files serving 2022 under `targetYear: 2026`, two enrollment-workflow assertions
that passed on a shape rather than a value, and chat's own "R2 holds wc26 only."

**The mechanical check for this already exists and is good.** This command does
not build it. It closes the two gaps that stop it from acting.

---

## What exists, measured at HEAD

`scripts/check-absence-collapse.mjs`, 12,538 bytes, wired into
`deploy-gate.yml`. It carries a 16-fixture classifier self-test that runs on
every invocation, a `--require=` acceptance test, a documented self-exclusion,
and a per-op breakdown. Its header explains why it reports three counts rather
than a verdict. It is better than most things it checks.

## Gap 1 — it is a census, not a gate

```js
process.exit(failed ? 1 : 0);
```

`failed` is set **only** by a `--require` miss. So the scan prints
`flagged 263` and exits 0. Nothing acts on the number, and nothing notices when
it rises.

### The ratchet

Record a baseline and fail when it is exceeded. This repo already has the
pattern in `docs/exposed-secrets.sha256`, and HANDOFF records its lesson
verbatim: **"A ratchet only knows the hashes it is given."**

- **Per op, not one total.** `catch-collapse: 119` beside `|| []: 171` is the
  difference between a census and a pile — the script's own comment says so. A
  single number lets one op's growth hide inside another's shrinkage.
- Baseline lives in a committed file, regenerated only deliberately.
- Failure names the op, the count, the baseline, and the new sites.

### Ratchet the suppressions in the SAME direction

**This is the part a flagged-only ratchet gets wrong.** The escape hatch is
`// absence-ok: <reason>`, and the cheapest way to pass a flagged-only ratchet
is to write it everywhere. Suppressions would climb while flags fall and the
gate would call it progress.

So: **a rise in `suppressed-with-reason` fails too.** Both counts are the
ratchet. A genuine suppression is still available — it costs a baseline bump,
which is a reviewable commit, which is the point.

### The `--require` must run in the same invocation, always

A matcher that silently stopped matching reports a clean sweep, and **under a
ratchet a broken matcher reads as improvement.** That is this rule violating
itself one level up, and it is the single most likely way this change makes
things worse.

`--require=src/index.js:6503` (the motivating instance) must pass in the same
run that evaluates the ratchet. If `--require` fails, the ratchet result is not
reported at all — not reported as a pass.

## Gap 2 — it does not run on field-relay-nba

`check-absence-collapse` is **absent from `field-relay-nba/.github/workflows/guards.yml`.**

STANDARDS.md says the check "flags absence-collapse on externally-read values
**across both repos**." Its motivating instance, quoted in its own header, is
`field-relay-nba src/index.js:6503`. **The repo where the defect was found is
the repo CI does not scan.**

The script already takes multiple roots — `usage: check-absence-collapse.mjs
<root> [root...]` — so the design anticipated this.

**Do not copy the script into the relay.** Two copies drift, and the one that
drifts is the one nobody reads. Check out `field-relay-nba` alongside this repo
in the gate job and pass both roots to one invocation.

**Decide and record whether the two repos share one baseline or hold one
each.** Separate baselines are probably right — the relay is a single 1.3 MB
file and this repo is many — but it is a decision, not a detail, and a shared
baseline would let one repo's improvement mask the other's regression.

---

## TASK 0 — measure before ratcheting (blocking)

1. Run the scan over **both** roots with `--json` and record the per-op counts
   for each repo separately. That is the baseline, and it is the only number in
   this command that is not already known.
2. Confirm `--require=src/index.js:6503` passes once the relay root is added.
   **It cannot pass today**, because that file is not scanned — which is itself
   the evidence for Gap 2.
3. Count existing `absence-ok:` suppressions per repo, and report any
   **malformed** ones. The classifier already flags `absence-ok:` with no
   reason; report that count before it becomes a baseline.

**Stop condition:** if the relay root raises flagged by more than roughly an
order of magnitude over this repo's count, stop and report before wiring the
gate. A gate that goes red on its first run and stays red gets deleted — that
failure is recorded in this very script's header about count bars.

## TASK 1 — the ratchet

As above. Both counts, per op, per repo. `--require` gating the report.

## TASK 2 — relay coverage

Add the checkout and the second root. Do not duplicate the script.

## TASK 3 — make it fail on purpose

Mutation-test in both directions, in the same session:

- Add an unsuppressed collapse on an external read → the gate goes red.
- Add an `// absence-ok: <reason>` suppression → the gate goes red on the
  suppression ratchet.
- Neuter the matcher so it flags nothing → **`--require` fails and the run does
  not report a pass.** This is the mutation that matters most.

A gate that has never gone red is a claim, not a gate. `spark-check` is this
tree's recorded instance of exactly that.

## Done conditions

- Both roots scanned in one invocation; counts recorded per repo per op.
- All three mutations applied and caught, output recorded.
- `outbox/cc-session-2026-10-16-absence-collapse-ratchet.md` is the last task
  (Rule 87), named in `HANDOFF.md` (Rule 67).

## Constraints

- Do not change the classifier's matchers in this command. Changing what counts
  as a finding while establishing a baseline makes the baseline meaningless.
  If a matcher is wrong, file it separately.
- Do not mass-suppress to reach a lower baseline. The baseline is today's
  truth, not a target.
