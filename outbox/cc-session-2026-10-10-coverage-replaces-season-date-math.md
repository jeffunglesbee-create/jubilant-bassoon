# CC session — the vendor states the season (client half, Rule 70)

**Date:** 2026-10-10
**Repos:** field-relay-nba (first), then jubilant-bassoon — Rule 70 pair
**Spec:** `field-relay-nba/docs/CC-CMD-2026-10-10-coverage-replaces-season-date-math.md`
**Outcome:** 4 tasks, 4 done conditions, no stop condition hit.

## What now answers "is the European season on"

`window.FIELD_SEASON_STATE`, four states, never collapsed:

| state | meaning |
|---|---|
| `date-fallback` | `_euSeasonActive()` is live; no coverage call has returned |
| `vendor` | BSD answered and the eight keys reflect it |
| `vendor-unpriced` | football `in_season` but `priced_next_7d: 0` — fixtures, no odds |
| `coverage-failed` | the call failed or carried no football row; we do not know |

`_euSeasonActive()` is **kept**, relabelled FALLBACK OF LAST RESORT, and still
populates the eight keys synchronously at load. Nothing is dark while the
coverage call is in flight: the vendor's answer overwrites a working default
rather than filling an empty one.

A payload with no football row reads `coverage-failed`, not "football is off".
That conflation is the entire subject of the document.

## The relay half, verified live rather than read

```
/bsd/coverage  HTTP 200  1957B
X-Coverage-State: vendor
Cache-Control   : public, max-age=600
X-FIELD-Source  : sports.bzzoiro.com
top-level keys  : generated_at, sports
football row via: sports[] array
6/6 checks
```

The runner holds no BSD token for either call, so the route answering at all is
the token-free proof — which is only observable from outside the worker.

## The user's three constraints, each verifiable

1. **No token attached.** The branch sends `User-Agent` and `Accept` only. A
   check asserts it, with comments stripped first so the comment *explaining*
   the absence cannot satisfy a match on the word.
2. **Above the 503 guard.** Asserted by line number, with a mutation that puts
   it below and is caught. Below it, a token-free endpoint 503s for want of a
   token it never wanted, and the symptom is indistinguishable from the
   endpoint being down.
3. **`_euSeasonActive()` demoted, not deleted.** Still present, still called,
   relabelled.

## Measurements that moved the work

**The endpoint is NOT reachable from this sandbox.** The CC-CMD reports it
token-free *and* reachable from its authoring sandbox. This container returns
`CONNECT tunnel failed, response 403` for `sports.bzzoiro.com` — an egress
policy that says nothing about the token. Re-measured from a runner, both ways:
**200 with a token, 200 without.** Not the stop condition.

**Task 4 answered better than the spec expected.** It says in capitals not to
assume the league endpoints carry a current-season flag, and to report plainly
if they do not. They do: `/api/v2/leagues/1/seasons/` returns 35 rows carrying
`is_current`. `/season/` returns `{league_id, season}` with no flag. Recorded in
`field-relay-nba/outbox/bsd-coverage-probe-latest.json` (done condition 4).

Not plumbed: per-competition state costs one call per competition, which is a
cost decision with its own CC-CMD, and Task 3 asked for coverage `status`.

**The third state is not hypothetical.** Darts and csgo read `in_season` with
`priced_next_7d: 0` today — fixtures, no prices. The check asserts the vendor
reports it rather than asserting it could.

## Four defects I shipped and caught

1. **Importing the probe RAN it.** `check-coverage-states.mjs` imported one pure
   helper; the probe executed from a sandbox with no egress, every call returned
   null, and it overwrote the runner's good artifact with a failed reading. The
   check then reported the STOP CONDITION against an artifact it had just
   destroyed itself. Guarded, and the artifact restored from git.
2. **The `--self-test` dispatch sat above that guard**, so an importer whose own
   argv carried `--self-test` ran the *probe's* self-test and exited — the check
   printed 11/11 and exited 0 without running one of its own 13.
3. **The check's branch slice ran past the route into the guard's own
   `const bsdToken`**, so the credential check failed on the guard rather than
   the route: a real-looking defect in code that did not have one.
4. **The route verifier guessed the payload shape** from the probe's *normalised*
   output rather than the raw payload — source-versus-copy, committed and run
   before being caught. It now searches the plausible envelopes and prints which
   matched.

Every one was caught by running the thing, none by reading it.

## Two gates that earned their keep

`SW_VERSION` lives INSIDE the generated script block, so editing it in
`index.html` is reverted by the next sync. The divergence guard blocked that
attempt. Then `sync-source.mjs` refused to overwrite an `index.html` that
differed from **both** `field.js` and the last commit — the state
`git checkout -- index.html` leaves behind when the file is already staged,
because it restores from the index, not HEAD. Correct fix: `git reset` then
`git checkout HEAD -- index.html`.

## And one of my own patterns, broken

My push loop checked `merge-base --is-ancestor HEAD origin/main`. When a commit
is BLOCKED by the pre-commit hook, HEAD is still the previous commit — which is
an ancestor — so it printed LANDED for a commit that did not exist. Now checks
the specific SHA is present in `origin/main`'s history.

## Carry-forwards

**None.** One measured fact for whoever continues: per-league season state
exists upstream (`is_current`), so the "coverage is football-wide" limitation
is removable — at one call per competition.
