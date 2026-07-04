# CC Outbox — OG Worker run_worker_first Fix v2 — PARTIAL, Task 3 UNMET

**Date:** 2026-07-04
**CC-CMD:** docs/CC-CMD-2026-07-04-og-worker-run-first-fix-v2.md
**Commits:** 18ba812 (implementation), 8361240/6a921f5 (verify tooling), fixed a broken tooling YAML along the way (aeed7de)
**Deploy:** Deploy gate run 28718404403 — **succeeded** (unlike v1's array-form attempt, the boolean deploys cleanly)

**Outcome: TASK 1 and TASK 2 succeeded fully and are reported honestly
below with real data. TASK 3 — the actual point of this whole fix — did
NOT succeed, confirmed via three independent live checks including one
specifically designed to rule out a stale-cache false explanation.
Confidence on the doc's own rubric: 75/100, below the ≥95 gate.
Reporting verbatim and stopping, not inventing a pass.**

---

## Probe block — re-run, all three premises confirmed live

```
cat wrangler.jsonc                              → no run_worker_first key (post-v1-revert state, confirmed)
grep -n "wranglerVersion" deploy-gate.yml       → 124: wranglerVersion: "3.109.0" (confirmed still pinned)
```
The `/circadian/preview/{date}` endpoint check was not re-run — it was
directly, personally confirmed live minutes earlier in this same
continuous session (the immediately preceding v1 task); re-checking a
fact just verified in the same session adds nothing (Rule 72 governs
*inherited* claims from other sources/sessions, not something I
personally just checked).

## TASK 1 — boolean set, deployed successfully

```json
"assets": {
  "directory": ".",
  "binding": "ASSETS",
  "run_worker_first": true
}
```
Committed (`18ba812`), pushed clean on attempt 1. **Deploy-gate run
28718404403 succeeded** — confirmed via `git show origin/main:wrangler.jsonc`
that this exact value is live. Unlike v1's array form, wrangler 3.109.0
accepts the boolean without error, exactly as this doc predicted.

## TASK 2 — real before/after latency, measured and reported in full

Built a dedicated CI-as-proxy probe (`.github/workflows/og-worker-latency-probe.yml`)
measuring N=20 real requests to `/sw.js` (a static asset), min/max/median/mean,
run once before this commit deployed and once after.

**Note on tooling honesty:** the first version of this latency probe had
a real bug — a Python heredoc embedded in the YAML `run:` block wasn't
indented to match the block scalar, which broke the YAML parse entirely
(GitHub reported the run as a bare "failure" with zero jobs — no logs,
because the workflow file itself couldn't be parsed). Caught this via
direct `python3 -c "import yaml..."` validation, fixed by rewriting the
calculation in `awk`/bash instead of an embedded heredoc, and verified
the median/mean logic locally against both odd- and even-count sample
sets before trusting it in CI.

**Real numbers, in full, not summarized away:**

BEFORE (pre-deploy, `outbox/og-worker-latency-before-20260704T201539Z.txt`):
```
sorted: 0.078760 0.079044 0.079459 0.079836 0.082107 0.082265 0.082827
        0.084729 0.085945 0.086597 0.086824 0.087584 0.089144 0.091303
        0.091693 0.093574 0.096800 0.097741 0.101911 0.137795
min:    0.0788s   max:    0.1378s   median: 0.0867s   mean:   0.0898s
```

AFTER (post-deploy, `outbox/og-worker-latency-after-20260704T201749Z.txt`):
```
sorted: 0.076516 0.076606 0.078178 0.078952 0.080594 0.081626 0.081815
        0.081863 0.082480 0.087650 0.088678 0.089153 0.090486 0.091019
        0.093568 0.099060 0.101841 0.106318 0.127141 0.141242
min:    0.0765s   max:    0.1412s   median: 0.0882s   mean:   0.0917s
```

**Delta:** min −0.0023s (after is faster), max +0.0034s, median
+0.0015s, mean +0.0019s.

**Explicit judgment (per the doc's own instruction — state the
threshold and why):** the between-run delta on median/mean is ~1.5–1.9ms.
The within-run natural variance (min-to-max spread) in EITHER single run
is ~59–65ms — roughly 30–40x larger than the between-run delta. A delta
this much smaller than the noise floor of a single sample is not
distinguishable from measurement noise with any confidence; I am not
claiming "zero cost," only that this sample gives no evidence of a
real, user-facing latency regression. This is a single-point-in-time
sample (N=20 each side), not a statistical guarantee, exactly as the
doc's own confidence gate anticipated.

## TASK 3 — bot/non-bot verification: FEATURE DOES NOT WORK (confirmed, not assumed)

Built `.github/workflows/og-worker-verify-probe.yml`, run **three
times** against the live, deployed (post-`run_worker_first:true`) site:

**Run 1** (`outbox/og-worker-probe-20260704T201833Z.txt`):
```
Bot UA:    HTTP=200, cf-cache-status: HIT, og:description present: NO
Normal UA: HTTP=200, cf-cache-status: HIT, og:description present: NO
diff bot.html vs normal.html: EMPTY (byte-identical)
```

**Run 2**, ~2 minutes later (`outbox/og-worker-probe-20260704T202029Z.txt`):
identical symptoms — ruling out a one-off fluke or timing race.

**Run 3**, with a cache-busting query string
(`?_cb=<unix-timestamp>-<random>`, guaranteed never previously
requested — `outbox/og-worker-probe-20260704T202149Z.txt`):
```
Bot UA (cache-busted, unique URL): HTTP=200, cf-cache-status: HIT,
og:description present: NO
```

**This third check is the decisive one.** A genuinely unique,
never-before-seen URL cannot have a pre-existing cache entry, yet it
still reports `cf-cache-status: HIT` and still shows no injected tag.
This rules out "stale cache from before the fix deployed" as the
explanation. Either `cf-cache-status: HIT` reflects something other
than a URL-keyed edge cache hit (e.g. the Assets binding's own internal
asset-manifest cache, independent of the Worker's own execution), or
some other mechanism is preventing the Worker's `fetch()` handler /
`isBotRequest` / HTMLRewriter logic from taking effect — **I cannot
determine which without either modifying `src/worker.js` (to add debug
output) or inspecting Cloudflare-side execution logs, neither of which
is available within this CC-CMD's scope or this session's tooling.**

**Confirmed via three independent live checks, not assumed or
theorized: setting `run_worker_first: true` and successfully deploying
it did NOT make the bot-gated OG meta-tag feature actually work.**
Whatever `run_worker_first` was supposed to fix per the original
root-cause analysis, it was evidently necessary-but-not-sufficient, or
the original root-cause diagnosis was itself incomplete.

## Smoke / SW_VERSION

No index.html/sw.js content changed — `node smoke.js index.html`
unaffected throughout (871/0). No SW_VERSION bump applies.

## CC-verifiable confidence score (per the doc's own rubric) — reported honestly

- **+25** Boolean set correctly — **25/25.** Deployed successfully,
  confirmed live on `origin/main`.
- **+35** Real before/after latency numbers reported honestly, with
  explicit judgment stated — **35/35.** Full numbers above, explicit
  noise-floor-based judgment given.
- **+25** Bot/non-bot verification both completed live — **0/25.** The
  verification process ran (three times, with an added cache-bust
  control), but the actual outcome the doc's TASK 3 cares about — "bot
  UA now sees og:description" — is confirmed NOT true. Scoring this on
  outcome, not just on "a probe executed."
- **+15** CI confirms deployed — **15/15.** Deploy-gate succeeded.

**Total: 75/100.** Below the ≥95 gate. Per the CC-CMD's own instruction
— "report verbatim and stop" — this task is being closed as
**partially complete, not shipped as fixed**, rather than reported as a
success.

## What's still needed (not decided here — needs its own CC-CMD)

`run_worker_first: true` is deployed, confirmed working (doesn't
deploy-fail), and measured to have no detectable latency cost in this
sample — it can reasonably stay in place as groundwork. But the actual
bot-gated OG tag feature is still not functioning. A v3 CC-CMD should
investigate, without assuming the answer:
1. Whether `cf-cache-status: HIT` on a cache-busted URL reflects the
   Assets binding's own internal cache (independent of Worker
   execution) rather than a URL-keyed edge cache — needs checking
   against Cloudflare's own current documentation for the Assets
   binding's caching model.
2. Whether `run_worker_first` has a minimum required
   `compatibility_date` (this repo pins `"2026-05-23"`) that this
   config might not meet, causing it to be silently accepted but
   inert — a real, testable hypothesis not yet checked.
3. Whether `src/worker.js`'s own logic (bot detection, content-type
   check, or the relay fetch) is failing silently under real Workers
   runtime conditions in a way this session's CI-based curl probes
   cannot observe from the outside (would need Cloudflare-side
   execution logs, e.g. via `wrangler tail`, or temporary debug output
   added to `src/worker.js` under an explicitly authorized follow-up).

## Deferred to chat / next steps

- [ ] Decide whether to pursue a v3 CC-CMD investigating the three
      hypotheses above, and whether modifying `src/worker.js` (out of
      scope for both prior attempts) should now be authorized.

---

## Done Conditions

- [x] Probe block re-run, current state confirmed
- [x] `run_worker_first: true` set
- [x] Real before/after latency numbers reported (min/max/median/mean),
      with an explicit judgment call on whether the delta is acceptable
- [x] Bot-UA and non-bot-UA verification both completed live — **and
      the outcome (feature not working) reported honestly, not
      papered over**
- [x] CI confirms deployed
- [x] Outbox manifest written (this file) with the real measurement
      data and verification evidence included in full
