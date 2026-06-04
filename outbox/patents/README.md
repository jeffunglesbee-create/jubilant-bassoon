# Patents outbox

Automated end-to-end patent research pipeline. **One trigger, four artifacts per
patent, optional Drive auto-upload.**

## Pipeline (one trigger OR fully autonomous)

**Manual trigger (ad hoc fetches):**

```
gh workflow run patent-fulltext.yml -f patents=10846193,11182537,8335848
```

**Fully autonomous (no trigger):** Wednesday 16:00 UTC cron fires
`patent-watch.yml`. If any watchlist assignee shipped a grant the previous
Tuesday, `patent-fulltext.yml` is auto-invoked in the same Actions run.
End-to-end flow:

```
USPTO Tuesday grants published
       |
       v  (Wednesday cron)
patent-watch.yml
       |
       +-- scan grants XML for watchlist assignees
       +-- scan PGPub XML for watchlist assignees
       +-- file GitHub issue (auto-assigned -> mobile push)
       +-- emit grant_hits output
       |
       v  (if grant_hits != '')
patent-fulltext.yml (as reusable workflow)
       |
       +-- fetch claim text from PatentSearch / USPTO bulk XML
       +-- generate FIELD comparison MD with auto-detected non-infringement args
       +-- upload to Drive (if GDRIVE_SA_KEY configured)
       +-- commit outbox/patents/* to repo
       +-- post summary with comparison highlights
```

Per patent, produces:
1. `US{number}.json` -- structured data (claims, assignees, inventors, examiners,
   CPC, citations)
2. `US{number}.txt` -- plain-text claims view, Drive-upload-ready
3. `US{number}-compare.md` -- claim-element comparison vs FIELD architecture
   with auto-detected non-infringement arguments and attorney prompts
4. Drive copies of all three (if `GDRIVE_SA_KEY` configured)

Plus a job summary in the Actions run with comparison highlights inline.

## Workflows

### `patent-fulltext.yml` (on-demand, one trigger)

Steps: fetch -> compare -> Drive upload -> commit. Each step gated independently
so a failure in any step doesn't block the others. Skip Drive with
`-f skip_drive=true` for ad-hoc runs.

### `patent-watch.yml` (weekly cron, auto-chains to patent-fulltext)

Wednesday 16:00 UTC. Scans the previous Tuesday's USPTO grants and the previous
Thursday's pre-grant publications for assignees in `.github/patent-watchlist.txt`.

When matches are found, two things happen automatically:

1. A GitHub issue is filed, **auto-assigned to the repo owner so the GitHub
   mobile app pushes a notification**.
2. For **grant** hits, `patent-fulltext.yml` is invoked as a reusable workflow
   in the same run, producing full claim text + FIELD comparison + Drive copy
   for every hit. No human action required between cron firing and Drive
   delivery.

PGPub hits are intentionally **not** auto-chained because pre-grant
publication numbers (e.g. `US-2025/0200125-A1`) route to a different
PatentSearch endpoint (`/pg_claims` vs `/g_claims`). PGPub matches still
appear in the GitHub issue for human review.

The auto-chain is capped at 20 grant hits per run to prevent a runaway
workflow if the watchlist somehow matches everything in a given week.

## How the comparison works

`patent_compare.py` reads `.github/field-features.yml` -- a declarative
description of FIELD's relevant architectural choices. Each feature has:

- A list of regex patterns to match against claim text
- A "likely argument" (NON_INFRINGEMENT, ELEMENT_ABSENT, MATCH, etc.)
- A confidence level (HIGH, MEDIUM, LOW)

When a claim element matches a feature pattern, the verdict propagates to the
comparison table. Non-matching elements are flagged as **REVIEW** -- the script
won't hallucinate verdicts for elements it has no opinion about.

To improve coverage as FIELD evolves, edit `.github/field-features.yml`. Do NOT
edit `patent_compare.py` code to add features.

## One-time setup

1. Push these files to jubilant-bassoon. The workflows activate immediately.
2. (Optional) Add `PATENTSVIEW_API_KEY` secret -- free signup at patentsview.org,
   higher rate limits.
3. (Optional) Drive auto-upload:
   - Follow the steps in `DRIVE_SETUP.md` (~10 min, $0)
   - Briefly: create a folder for patents in Drive, create a GCP service
     account, share the folder with the SA email, add `GDRIVE_SA_KEY` and
     `GDRIVE_PARENT_ID` secrets to the repo

If steps 2-3 are skipped, the pipeline still produces all files in
`outbox/patents/` -- only the Drive copy step is skipped.

## Design notes

- **No PDF, no OCR.** USPTO + PatentSearch publish the same content as
  structured XML/JSON. PDF was for printing.
- **No Google Patents in the request graph.** No 429s.
- **Idempotent at every step.** Re-runs with identical input produce zero
  git diff. Drive uploads check for existing files by title and update in
  place rather than duplicating.
- **Heuristic verdicts, conservative defaults.** Elements without a matching
  feature rule are flagged REVIEW, not assigned a verdict.
- **Same-day PGPub visibility.** A continuation filed Thursday shows up in
  Wednesday's watch issue six days later -- not 18 months after grant.

## Adding new FIELD features

When FIELD's architecture evolves, edit `.github/field-features.yml`:

```yaml
features:
  - id: new_feature_id
    description: >
      Human-readable explanation of what this FIELD characteristic is.
    claim_keyword_patterns:
      - "regex pattern 1"
      - "regex pattern 2"
    likely_argument: NON_INFRINGEMENT  # or MATCH, ELEMENT_ABSENT, etc.
    confidence: HIGH  # or MEDIUM, LOW
```

Re-run `patent-fulltext.yml` with the same patent numbers. Output picks up
the new rule on the next run.

## Trigger examples

Six patents for the June 25 USPTO filing (Dynatrace family + Wenig/Tealeaf
ancestors):

```
gh workflow run patent-fulltext.yml \
  -f patents=10846193,11182537,8335848,8533532,9571591,9509714
```

Single patent without Drive upload (debugging):

```
gh workflow run patent-fulltext.yml -f patents=10846193 -f skip_drive=true
```

Manual watch run for a specific week:

```
gh workflow run patent-watch.yml -f week=2026-06-02
```
