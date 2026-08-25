# CC-CMD-2026-08-25-playground-secret-gate

**Filed:** 2026-08-25 from the cross-repo secret scan.
**Target:** field-playground.
**Status:** OPEN. Small, and the only one of the four repos still unguarded.

## Why

A scan of all four repos on 2026-08-25 measured:

| repo | RELAY_SHARED_SECRET | ODDS_API_KEY | gate |
|---|---|---|---|
| field-relay-nba | 115 | 0 | yes (deploy.yml) |
| jubilant-bassoon | 9 | 3 → 0 | yes (smoke-and-verify.yml) |
| field-laboratory | 0 | 0 | yes (`check:secrets`) |
| **field-playground** | **0** | **0** | **none** |

field-playground is clean. It is also the only one where nothing would notice if
it stopped being clean, and it is the repo most likely to acquire a credential:
it is the scratch repo.

Being clean is not the same as being guarded. This whole finding exists because
a gate that measured one tree was reported as measuring the exposure.

## The ask

1. **Probe first.** Run the scanner from jubilant-bassoon against field-playground
   and paste the output. If it is no longer clean, that is the finding and this
   CC-CMD changes shape.
2. **Copy `scripts/check-exposed-secrets.mjs`** from jubilant-bassoon verbatim.
   It has three fixes the relay's first version lacked (nested quotes, per-line
   scanning, import purity) and five self-test cases covering them.
3. **Write `docs/exposed-secrets.sha256`** with both hashes at the MEASURED
   count from step 1. Do not assume 0 — measure it.
4. **Wire it into a workflow that runs on every push**, not a paths-filtered one.

## Done condition

`node scripts/check-exposed-secrets.mjs --self-test && node scripts/check-exposed-secrets.mjs`
green in CI on a real push, with the live count line pasted into the outbox
manifest verbatim. A green deploy is not the done condition; the printed count is.
