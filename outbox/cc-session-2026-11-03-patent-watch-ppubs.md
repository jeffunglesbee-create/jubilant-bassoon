# CC session — 2026-11-03 — patent_watch.py reads PPUBS, and a week it did not read is a red run

CC-CMD: `docs/CC-CMD-2026-11-02-scheduled-job-skipped-every-time.md` in field-relay-nba, TASK 4b; its Rule 75 spec was written first (relay `09677a77`). The laboratory holds the measurements and the checks: `outbox/cc-session-2026-11-03-ppubs-source.md` in field-laboratory (LAB-FIRST-A).
HEAD: `eb2c538` → this commit · Branch: main. No client app code changed and no deploy path: SW_VERSION not bumped, smoke not re-run locally (the commit touches one workflow, one script outside the app, a watchlist header and a deleted manifest). CI at the commit is read after the push and recorded in the relay CC-CMD.

## What the owner approved

"Go with Claudes best recommendations." (2026-11-02, 23:35 ET). The recommendation was PPUBS now, since it needs nothing from the owner, and the ODP key later as a second reader. That released TASK 4b with Part 2 = PPUBS. The ODP API is not built and is not a fallback: a fallback turns a red week into a green one by reading another file.

## What changed

| file | change |
|---|---|
| `.github/scripts/patent_watch.py` | rewritten. Reads the grant Tuesday (USPAT) and the publication Thursday five days before it (US-PGPUB) on Patent Public Search, two queries per term and day (`"<term>".as. AND @PD="<day>"`, `"<term>" AND @PD="<day>"`), tags each hit `assignee` or `text`, runs five known-answer controls first, refuses a day with fewer than 500 families, checks every response against the measured counter contract, paces at 3 s and waits out a 429. Anything it cannot say it read raises `Unread`: exit 1, `NOT READ:` in the log and the step summary, no manifest, no `$GITHUB_OUTPUT`. `write_github_output` and `last_tuesday` keep their behaviour |
| `.github/workflows/patent-watch.yml` | job `watch` only: `timeout-minutes: 30`; `Commit results` retries the push and checks it landed; `Summary` says NOT READ when the watcher step did not succeed. The `on:` block, the input and `followup` are unchanged |
| `.github/patent-watchlist.txt` | header describes the two query forms, one term per line, no double quote; the footer's "Re-runs are idempotent" is removed (a re-run files its issues again). No term added or removed |
| `outbox/patents/watch-2026-10-27.json` | deleted: the false negative run 41574599866 committed as `8e94848` |

## Verified E2E, and what was not

| claim | status | evidence |
|---|---|---|
| a week it cannot read ends red with no manifest | **VERIFIED** locally | field-laboratory `scripts/check-patent-watch.py` against a stand-in of the host: 206/206 in 32 scenarios, 33 cases of an unread week, each exit non-zero, no manifest, no `$GITHUB_OUTPUT`, `NOT READ:` in log and summary |
| that check can be made to fail | **VERIFIED** locally | `scripts/mutate-patent-watch.py`: 44 of 44 mutants caught, 38 of this file. Not covered: the 3 s pacing, `Retry-After` parsing, the 401/403 renewal, the prime request |
| the query forms, counters and rate limit are the real host's | **MEASURED**, probe runs 41580587437 and 41582509434 | lab session doc; 169 calls at 3 s between calls gave no rate-limit event |
| the workflow is valid | **VERIFIED** | `actionlint` exit 0 on `patent-watch.yml` |
| the watcher's own flow reads the real host | **NOT YET MEASURED** | two of its five controls (`"RUWT" AND @PD="20190625"`, `"Dynatrace LLC" AND @PD="20261022"`) are in no probe report. The laboratory's `patent-watch-rehearsal.yml` runs the watcher on a runner with no token and keeps the evidence; it reads this repository's main, so it runs after this commit |
| Tuesday's grants are searchable at Wednesday 16:00Z | **NOT ESTABLISHED** | the watcher reports a day below 500 families as not read |
| the first scheduled run | **NOT YET HAPPENED** | Wednesday 2026-11-04 16:00Z. It may be red: an unindexed Tuesday or a control that fails on the real host are red by design, and the log names which |
| the `followup` job and the Dropbox upload through the caller | **NOT VERIFIED** | no grant hit has chained since the caller was fixed |

## Seen, not fixed (Rule 69)

- `patent_fetch.py` creates `outbox/patents/` at import (line 52), so the watcher does not import its PPUBS code; one client for both is a follow-up that needs a prompt naming it.
- `outbox/patents/README.md` and the header of `patent-fulltext.yml` still describe a Drive upload; the workflow uploads to Dropbox. `field-data.yml` line 57 column 33 fails `actionlint`. Both as recorded in `outbox/cc-session-2026-11-02-patent-watch-caller.md`.
- A push to this repository does not run the laboratory's check; it runs on the next laboratory push.

## Mistakes in my own work

The first reading of the search counters took `totalResults` for a total. Probe run 2 refuted it (it is the documents on the page; the total is `numberOfFamilies`), and the watcher was built on the corrected contract. The old rule for the publication Thursday, Tuesday + 2, named a day that had not happened when the Wednesday job ran; the new rule is Tuesday − 5.
