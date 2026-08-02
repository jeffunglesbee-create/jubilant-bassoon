# CC-CMD-2026-08-02-discovery-discipline-rule-and-deploy-drift-detector — Result

## Status: DONE. Both pieces shipped and real-verified; a genuine bug in
the drift detector was found and fixed mid-verification, not rationalized.

## Piece 1 — STANDARDS.md Rule 98 (DISCOVERY-DISCIPLINE-A)

Added immediately after Rule 97 (existing highest rule at session start).
Codifies discovery-discipline judgment calls that had existed only as
ad-hoc decisions across prior sessions (LaLiga/Bundesliga undocumented-API
work):
1. Passively identifying a variant/endpoint is not authorization to
   contact it.
2. Respect `robots.txt` per-host independently.
3. Any discovered key/credential gets full Rule 80 discipline regardless
   of "technically public" status.
4. Any undocumented/reverse-engineered integration must have a real
   tested fallback or an explicitly accepted single point of failure.
5. Re-verify a discovery fresh before trusting it stable — cites the
   real, same-day LaLiga false "key rotated" alarm as case study.

Verified: `node smoke.js index.html` passed (965/0), Rule 98 appears
exactly once, does not duplicate Rule 80 (explicitly composes with it,
per the rule's closing section).

## Piece 2 — `deploy-drift-detector.yml` + `scripts/detect-deploy-drift.mjs`

Compares the latest commit touching a deploy-gate.yml-watched path
against the live site's SW_VERSION. Detection only — never attempts
remediation. Cadence matches `field-autodeploy.yml` (every 30 min, the
most similar existing scheduled deploy-related workflow). Only commits
a record when real drift is detected (not every 30-min "healthy" run,
to avoid commit spam — same design choice as this repo's other
detection-only scheduled workflows).

### Real bugs found and fixed during verification (not rationalized away)

**Bug 1 — shell pipe bug (run 1, `30769039350`, FAILED).**
`git log -1 --format=%H|%cI -- ...` — the unquoted `|` was interpreted
by the shell as a pipe operator, producing `/bin/sh: 1: %cI: not found`
and crashing every run with exit 127. Root-caused by reading the actual
CI job log (not assumed). Fixed by quoting the format string:
`--format='%H|%cI'`.

**Bug 2 — esbuild re-quoting (run 2, `30769158898`, succeeded but
`liveSwVersion:null` despite `liveStatus:200`).** Per Rule 90
(verification tasks must specify an artifact, never a bare action), a
"succeeded" CI run was not accepted as proof — the actual JSON output was
inspected and showed `liveSwVersion:null` even though the fetch itself
worked (`liveStatus:200`, `htmlLength:1935970` on a real live-content
probe). Diagnosed via two rounds of a dedicated CI probe
(`scripts/verify-live-deploy-content.mjs`, dispatched twice):
- Round 1 confirmed the fetch itself was real and complete (not a
  sandbox/egress artifact) but the exact single-quote regex
  `SW_VERSION\s*=\s*'([^']+)'` didn't match anywhere.
- Round 2 (raw substring search) found `SW_VERSION` present in the live
  bundle, but in the form `const SW_VERSION = "2026-08-02f";` — **double
  quotes**, not the single quotes used in source
  (`src/legacy/field.js`). Root cause: `build-bundle.mjs` uses esbuild
  with `minify:false`, but esbuild's printer still re-quotes string
  literals to double quotes when bundling, independent of minification.
  `extractSwVersionFromCommit()` (reads raw source via `git show`) was
  never affected by this — only `extractLiveSwVersion()` (reads the
  bundled, deployed HTML) was.

Fixed by making the live-extraction regex quote-agnostic:
`/\bSW_VERSION\s*=\s*['"]([^'"]+)['"]/`. Verified locally against a
simulated bundled string before pushing, then re-dispatched (run 3,
`30769607706`, SUCCESS). Real job log output confirms the fix:
```
"expectedSwVersion": "2026-08-02f",
"liveSwVersion": "2026-08-02f",
"liveStatus": 200,
"drift": false
```
`liveSwVersion` now exactly matches `expectedSwVersion` — the detector
can now actually detect real drift, which it could never have done while
this regex was broken (a null-vs-null comparison never trips the drift
condition, so the detector would have silently never fired even during
a genuine incident).

### Task 3 done condition — MET

"Trigger the new scheduled workflow manually once and confirm it runs
cleanly against the current, healthy state (no false-positive drift
reported)" — met by run 3 (`30769607706`): completed, success, real
non-null `liveSwVersion` extracted and correctly compared equal to
`expectedSwVersion`, `drift:false`. This is a real positive
confirmation, not merely the absence of a crash (which is what runs 1
and 2 would have misleadingly offered without the follow-up probe).

## Diagnostic script left in place

`scripts/verify-live-deploy-content.mjs` (`.github/workflows/verify-live-deploy-content.yml`)
now also probes the SW_VERSION shape (`swVersionMatch`,
`rawSwVersionIndexOf`, `hasWindowSwVersion`, `hasSwJsQueryParam`) in
addition to its original NFL_DRAMA_PROFILES / period>=5 checks. Left
in place as a reusable CI-as-proxy diagnostic rather than reverted,
since it's what found the real bug.
