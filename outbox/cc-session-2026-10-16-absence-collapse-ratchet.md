# CC session — 2026-10-16 — absence-collapse census becomes a ratchet over both repos

CC-CMD: `docs/CC-CMD-2026-10-16-absence-collapse-ratchet.md`
HEAD: `fc6b7b73` → `758447c6` · Branch: main · Smoke 1055/1055 before and after, units 69/69. SW_VERSION not bumped (no deploy path touched).

## Commits

| commit | what |
|---|---|
| `67e7cd79` | `check-absence-collapse.mjs`: `--baseline` / `--write-baseline` ratchet, per repo, per op, flagged AND suppressed; `--require` gates it. Baseline `docs/absence-collapse-baseline.json`. Harness `scripts/mutate-absence-collapse-ratchet.mjs`. Matchers unchanged. |
| `758447c6` | `deploy-gate.yml` census step → ratchet over both repos; `smoke-and-verify.yml` smoke-static runs harness + ratchet on every push. Relay cloned to `$RUNNER_TEMP`, not copied. |

## Task 0 — baseline, both roots, one invocation (local, then identical in CI)

Scanned at jubilant-bassoon `fc6b7b73`, field-relay-nba `0dcd504`.

| repo | flagged | suppressed | malformed |
|---|---|---|---|
| jubilant-bassoon | 98 | 0 | 0 |
| field-relay-nba | 332 | 18 | 0 |

Per op, flagged: jubilant-bassoon catch-collapse 70, `|| []` 13, `|| ''` 9, `|| 0` 3, `?? []` 3.
field-relay-nba `|| []` 204, `|| ''` 56, catch-collapse 44, `?? []` 21, `?? 0` 3, `|| 0` 2, `?? ''` 2.
Suppressed (relay only): catch-collapse 15, `|| 0` 2, `?? 0` 1.

Raw `absence-ok:` occurrences: relay 19 = the 18 honoured + one comment-only
line (`src/index.js:6214`, classified clean, so inert). jubilant-bassoon 0.

Stop condition: relay is 3.4× this repo, under the ~10× bar. NOT MET; proceeded.

## The `--require=src/index.js:6503` premise did not hold

Line 6503 of relay `src/index.js` is now `for (const key of (listed.keys || []))`
and flags nothing. The motivating collapse was fixed into `readQuotaHeader`
(relay `src/budget-helpers.js`, returns `number | null`); no
`x-requests-remaining') || '0'` remains in the relay. A require on it can never
pass, so a gate built on it would be red on its first run and stay red.

Replaced by `--require=field-relay-nba/src/index.js` (path-level, like the
existing `--require=src/legacy/field.js`). A line pin is wrong for a repo the
gate clones at HEAD: any unrelated relay edit above the line would turn it red.
The verbatim 6503 line stays covered as the classifier's first self-test fixture.

The require GATES the report, as asked: with `--baseline`, every scanned root
needs a `--require` that hits a flagged site in that root; any miss prints
`RATCHET NOT EVALUATED` and exits 1, and the ratchet verdict is never printed.

## Decision: one baseline per repo

Recorded as `repos.<name>` in one file, compared separately. A rise in either
repo fails even if the other fell by more, and a rise in one op fails even if
another op fell (both in the self-test). A baselined repo that was not scanned
fails, so a dropped relay clone cannot pass by scanning nothing.

Sites are keyed by file + trimmed text, not line, so a failure names the new
site and edits above a site do not move it.

## Task 3 — mutations, all caught (CI run 38993272783, smoke-static)

```
baseline run: ratchet OK on the unmutated tree
caught  M1  a new unsuppressed collapse            RATCHET FAILED: jubilant-bassoon flagged [|| []]
caught  M1r a new unsuppressed collapse in relay   RATCHET FAILED: field-relay-nba flagged [|| []]
caught  M2  a new suppression                      RATCHET FAILED: jubilant-bassoon suppressed [|| []]
caught  M2b suppress an EXISTING finding           RATCHET FAILED: jubilant-bassoon suppressed [|| []]
caught  M3a walker reads no files (fixtures pass)  RATCHET NOT EVALUATED
caught  M3b classifier flags nothing               CLASSIFIER SELF-TEST FAILED
caught  M3c relay checkout empty                   RATCHET NOT EVALUATED
then: ratchet OK: no op in jubilant-bassoon, field-relay-nba rose above docs/absence-collapse-baseline.json
```

M2b is the cheat the suppression ratchet exists for: flagged falls by one and
suppressed rises by one, and the gate goes red. None of the three
matcher-breaking mutations printed a pass.

Two defects found while building, both fixed before commit: a repo with zero
findings vanished from the summary and read as "not scanned" (ratchet
self-test caught it); the harness's own string literal `'|| []'` beside
`JSON.parse` was a finding (baseline went 98 → 99; literal assembled instead).

## Integration state

- smoke-and-verify smoke-static: VERIFIED, run 38993272783, all jobs green.
- deploy-gate step: STAGED. Same command minus the harness; deploy-gate fires
  only on index.html / sw.js / field_utils.js / wrangler.jsonc, and dispatching
  it would redeploy production. Unblocked by the next deploy-triggering push.
  Verify: that run's log contains `ratchet OK: no op in jubilant-bassoon,
  field-relay-nba rose above docs/absence-collapse-baseline.json`.

## Consequence to know

A relay commit that adds a collapse turns THIS repo's next push red, not the
relay commit. Fixing it here is a baseline bump (`--write-baseline`), a
reviewable diff naming the site. Gating it at the relay commit is filed as
field-relay-nba `docs/CC-CMD-2026-10-17-absence-ratchet-on-relay-pushes.md`
(Rule 87.4); it needs an owner decision on where the relay's baseline lives.
