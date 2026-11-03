# CC session — 2026-11-02 — patent-watch's caller passes the input its callee declares, and the run it started read nothing

CC-CMD: `docs/CC-CMD-2026-11-02-scheduled-job-skipped-every-time.md` in field-relay-nba (TASK 4 and TASK 4b). The relay's session doc for the same work is `outbox/cc-session-2026-11-02-scheduled-job-skipped-every-time.md` there (addendum 2026-11-03).
HEAD: `f7ac1f4` → `8ff34ac` → `3e7f07d` → this session doc · Branch: main. Smoke 1066 passed, 0 failed and units 70 passed, 0 failed in the pre-commit hook's run before the push; CI at `3e7f07d`: Smoke Test + Live Verify 41574578585 success. SW_VERSION not bumped: no client code and no deploy path changed.

## What the owner approved, and what was done beyond it

The owner's "Next approved" (2026-11-02, 22:43 ET) approved one step, with its side effects stated first (a weekly issue assigned to the owner, which is a mobile push; commits to `outbox/patents/` on this repository's main; a PatentsView call; a Dropbox upload where the secrets are set): in `.github/workflows/patent-watch.yml`, change the `followup` job's `skip_drive: false` to `skip_dropbox: false`, push to main, dispatch once, read the result.

Beyond the literal approval, stated here and in the report: the README commit `3e7f07d`, and a read-only run of the relay's workflow YAML gate over this repository's 138 workflows (0 failing).

## Commits

| commit | what |
|---|---|
| `8ff34ac` | `.github/workflows/patent-watch.yml` line 85: `skip_drive: false` → `skip_dropbox: false`. The callee, `patent-fulltext.yml`, declares `patents` and `skip_dropbox` (default false) under `workflow_call`; the caller passed an input it does not declare, which `actionlint` reports and which ended 21 of 21 scheduled runs (2026-06-10 to 2026-10-28) as `startup_failure`. The callee's default is false, so the caller keeps its meaning. |
| `3e7f07d` | `outbox/patents/README.md`: two commands that passed `-f skip_drive=true` to `patent-fulltext.yml` now pass `-f skip_dropbox=true`, with the two sentences that introduce them. The README's other Drive wording is unchanged. |
| `8e94848` (not mine) | Pushed by the dispatched run's own `Commit results` step: `outbox/patents/watch-2026-10-27.json`, 22 lines, `matches: []`. See the next section. |

## The run started, and read nothing

Dispatch, run 41574599866 (`workflow_dispatch`, created 2026-11-03T03:50:47Z, head `3e7f07d`): the `watch` job started at 03:50:50Z and finished `success` at 03:51:47Z; `followup` was skipped, as designed when there are no grant hits. The run started a job where 21 had started none.

Its `Run watcher` step printed, for both files, `Failed to resolve 'bulkdata.uspto.gov' ([Errno -5] No address associated with hostname)`, then `0 grant matches`, `0 PGPub matches`, `Saved outbox/patents/watch-2026-10-27.json`, `No grant hits to auto-chain.`, and exited 0. The full lines are in the relay CC-CMD, TASK 4, "The green run read nothing".

- `.github/scripts/patent_watch.py` returns `[]` from `scan_bulk_xml` on any `requests.RequestException` and on any non-OK status, and `main()` then writes the manifest and exits 0. Run unmodified in an empty directory against a local stand-in that answers every request with 404, then with 500, it exits 0 and writes `matches = []` both times.
- `.github/adr/ADR-PATENT-001-ppubs-source.md` (Accepted 2026-06-04) records that the `bulkdata.uspto.gov` DNS record was removed and PatentsView's API was shut down on 2026-03-20; it chose PPUBS for `patent_fetch.py`, did not choose "Bulk XML revival", and lists the ODP API (a key behind the owner's ID.me verification) as future work. `patent_watch.py` never moved.
- `8e94848` is a false negative: it says no watchlist assignee had a grant or a publication in the week of 2026-10-27, and the run never looked. Nothing delivers it (the Drive workflow uploads added `.md` files only). It stays until the owner decides.
- The pre-grant week: `thursday_of_week` returns the Tuesday plus two days. Executed with a fixed clock, a Wednesday 2026-11-04 run asks for the Thursday 2026-11-05 file, a date after the run. The README says "the previous Thursday".

## Verified E2E, and what was not

| claim | status | evidence |
|---|---|---|
| the caller and callee inputs now match | **VERIFIED** | `actionlint`: one finding before, exit 0 after; the relay's YAML gate over 138 workflows, 0 failing |
| `patent-watch.yml` starts a job | **VERIFIED**, one dispatched run | run 41574599866 |
| the README commit's CI | **VERIFIED** | at `3e7f07d`: Smoke Test + Live Verify 41574578585, FIELD Outbox to Drive 41574578708, Desktop Chrome Viewport Audit 41574578634, Desktop Safari Viewport Audit 41574578686, all `success` |
| the watcher read the week's USPTO files | **REFUTED** | the log above |
| the `followup` job and the Dropbox upload work through the caller | **NOT VERIFIED** | no grant hit exists to chain |
| the pre-grant file the Wednesday run asks for can exist | **DERIVED** | dates only; the host cannot be asked |

## Open (owner's calls)

TASK 4b in the relay CC-CMD, one decision with two parts. **Part 1, no input needed:** `patent_watch.py` exits non-zero on a fetch it could not complete, so the run is red and `Commit results` does not run; `outbox/patents/watch-2026-10-27.json` is removed; a laboratory check holds it (red before, green after, and a hit still files its issue and chains). The Wednesday run then turns red until Part 2. **Part 2, the owner chooses:** PPUBS (anonymous, undocumented; nothing here has tried a search by assignee and date range) or the ODP bulk-data API (needs `USPTO_API_KEY`, which needs the ID.me verification), with the pre-grant week fixed in the same change.

## Armed

The relay's scheduled task for 2026-11-04T22:30Z reads the first scheduled run of `patent-watch.yml` through its own log (Wednesday 2026-11-04; its last eight ticks were created between 19:12Z and 21:11Z) and writes "false green, not a fix" if the dead-cron watch stops listing the workflow on a run that fetched nothing.

## Seen, not fixed

- `patent_watch.py`: the client's Rule 69 limits a session to the code its prompt names. The defects above are recorded for a future prompt (TASK 4b).
- `outbox/patents/README.md` (lines 4, 35, 43, 46, 68 to 69, 101 to 108, 116) and the header comment of `patent-fulltext.yml` still describe a Drive upload; the workflow uploads to Dropbox.
- `field-data.yml` line 57 column 33 fails `actionlint`: `force_date` is not a declared `workflow_dispatch` input. Unrelated to this work.

## Mistakes in my own work

I proposed the step, and stated its side effects, without searching this repository for the data source the watcher fetches from. One search for `bulkdata.uspto.gov` finds ADR-PATENT-001. I read it after the dispatch. The side effects the owner approved against did not include "commits a manifest that says no matches for a week it did not read".
