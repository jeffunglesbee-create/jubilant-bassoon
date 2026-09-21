# CC-CMD 2026-09-21 — tennis renders zero cards above ~26 allowed matches

**Status:** OPEN
**Repo:** jubilant-bassoon (client). The relay is not implicated — see Premise 1.
**Detector:** `.github/workflows/tennis-live-probe.yml`, declared in
field-relay-nba `docs/declared-detectors.json`. This document is its `tracked_by`.

## The symptom

The deployed page renders zero tennis cards while the relay serves tennis that
passes FIELD's own tier bar. Newest reading, `outbox/tennis-live-probe-latest.json`
at 2026-09-21T19:17:56Z:

```
relayLiveMatches          42     (AFTER the tier filter)
relayLiveMatchesAllTiers  133
tennisSectionPresent      false
tennisCardCount           0
relayCallsFromPage        200 /bsd/tennis/matches/live  (x2)
failedRequests            GET /bsd/tennis/matches/by-date?date=2026-09-21 — net::ERR_ABORTED  (x2)
verdict                   FAIL
```

## What the 36 committed manifests actually say

Every `outbox/tennis-live-probe-manifest-*.json`, sorted by its own `ts`:

| allowed matches | outcome |
|---|---|
| 7, 7, 7, 8, 15, 15, 16, 17, 19, 23, 23, 24, 24, 26, 26 | **PASS**, cards == allowed every time |
| 26, 33, 33, 34, 37, 37, 38, 40, 41, 42, 43, 43, 51, 52, 53, 53, 73, 73 | **FAIL**, 0 cards |
| 36, 92, 100 | UNKNOWN, 0 cards |

**PASS max 26. FAIL min 26.** Clean separation on one number, with a single
overlap AT the boundary: 2026-09-06 15:26 failed at 26 and 15:32 passed at 26,
six minutes apart, same slate size. A logic break does not flip on a six-minute
gap at a fixed input size. A timing or budget effect does.

This is a THRESHOLD, not a wiring failure. The mechanism demonstrably works —
it rendered 26 cards on 2026-09-06 and 19 on 2026-09-17.

## Premises, and the ONE command that refutes each (Rule 100)

Run these BEFORE writing code. Two are already refuted; they are recorded so the
next session does not re-derive them.

| premise | status | the command |
|---|---|---|
| "The tier filter explains it — those 42 are Challenger/UTR" | **REFUTED** | `grep -n 'relayLiveMatches =' tennis_live_probe.js` — line 86 filters with the SAME `TIERS`/`NAMED` predicate as `field.js:9762-9773`. 42 is the count after the bar. |
| "This is the 2026-06..09 regression: no section is ever created" | **REFUTED** | `tennisSectionPresent` is `true` in **30 of 36** manifests, including 24 of the zero-card runs. The section exists and is empty. The probe's own `reason` string says otherwise and is wrong — Task 4. |
| "The relay stopped serving" | **REFUTED** | `relayCallsFromPage` shows `200 /bsd/tennis/matches/live` twice on the failing run. |
| "`by-date` aborting is the cause" | UNTESTED, and unlikely by design | `fetchTennisLive` uses `Promise.allSettled` precisely so one dead feed does not empty the section (`field.js:9789`). But `readRows` returns `[]` for a failure AND for an empty feed — see Task 1. |
| "The 5s fetch timeout fires under load" | UNTESTED — the leading candidate | `field.js:9790-9791` both carry `AbortSignal.timeout(5000)`. The all-tiers payload on failing days runs 133-304 rows. Task 1 instruments it. |
| "It reaches `allData` and the RENDER drops it" | UNTESTED — the other candidate | `field.js:21683` does `allData={sports:[...verified,...supplemental]}` then a DEBOUNCED `scheduleRenderAll()`. That line REPLACES `allData` from a closure snapshot, and `field.js:21625` already documents the consequence — the MLS proof path had to push into `verified` as well to survive it. Tennis arrives inside `supplemental`, so it is not discarded there; the reading is still taken after that line, not before. Task 1 reads `allData.sports` directly. |

## The absence collapse at the centre of this

`field.js:9793-9797`:

```js
const readRows = async (res) => {
  if(res.status !== 'fulfilled' || !res.value?.ok) return [];
  const j = await res.value.json();
  return Array.isArray(j) ? j : (j?.results ?? []);
};
```

A timed-out fetch, a non-200, an unparseable body and a genuinely empty feed all
produce the same `[]`. `fetchTennisLive` then hits `if(!all.length) return []`
and the caller cannot tell "no tennis today" from "we failed to ask". That is
this project's Rule 99 — `scripts/check-absence-collapse.mjs` exists for exactly
this shape — and it is why five days of FAILs carry no diagnostic.

**Fixing the collapse is Task 1 and it comes first, because without it Task 2
has nothing to read.**

## Tasks

### Task 1 — make the failure state legible, then re-probe

`readRows` must report WHICH of the four outcomes occurred, per feed, and
`fetchTennisLive` must surface the counts at three boundaries:

1. rows returned by each feed, and why a feed returned none
   (`rejected` / `timeout` / `http <status>` / `unparseable` / `empty`)
2. `all.length` before the tier filter, and `rows.length` after it
3. whether the `[{sport:"Tennis", games}]` section reached `allData.sports`

Expose them on `window.__FIELD_PROOF__` — the accessor object already exists at
`field.js:21655-21666` and already carries `fieldErrors` and `presentationPackets`, so
this follows the established convention rather than inventing a channel
(Rule 62). Do NOT add a `console.log` behind `FIELD_DEBUG`: the probe runs
headless against the deployed page and cannot set that flag.

**Scope boundary:** do not change the tier filter, `matchupHTML`, the
`_bsdTennis` guard, or the `Promise.allSettled` structure. Those are all
load-bearing and documented in place.

### Task 2 — the probe reads the three boundaries and records them

`tennis_live_probe.js` writes the Task 1 values into its manifest as their own
fields — `feedLiveOutcome`, `feedByDateOutcome`, `rowsBeforeTier`,
`rowsAfterTier`, `sectionInAllData` — and the reason line quotes them. A verdict
of FAIL must then say WHICH boundary lost the rows, not restate the symptom.

### Task 3 — name the cause from the instrumented readings, then fix it

Run the probe against the live URL on a slate above the threshold. The manifest
now names the boundary. Fix THAT, and nothing else.

If the boundary is the fetch timeout, the fix is the timeout — not a retry
loop, not a fallback feed. This repo's standing instruction is no fallbacks,
only fixes.

### Task 4 — the probe stops publishing an unestablished cause

`tennis_live_probe.js:257` writes the string into `reason`, and `tennis_live_probe.js:276` repeats the attribution in a comment. It writes `this is the 2026-06..09 regression`
into `reason` on every FAIL. Thirty of thirty-six manifests show
`tennisSectionPresent: true`, so that attribution is contradicted by the
detector's own committed data. Remove the claim; the reason line states what was
measured. An untested premise must not be published as a finding (Rule 100
corollary) — and a detector publishing one puts it in front of a reader every
twelve hours.

### Task 5 — outbox manifest

`outbox/cc-session-2026-09-21-tennis-zero-cards.md`: commit hashes, the deploy
run id, the done-condition manifest pasted verbatim, and any genuine residual.

## Done condition

An artifact, not an action (Rule 89):

**A committed `outbox/tennis-live-probe-manifest-*.json` with
`relayLiveMatches >= 34`, `verdict: "PASS"`, and `tennisCardCount ==
relayLiveMatches`.**

34 is the lowest FAIL count outside the boundary overlap, so a PASS at or above
it cannot be explained by the slate having shrunk under the threshold. A PASS at
19 proves nothing — that already happened on 2026-09-17 with the bug in place.

Two such manifests from SCHEDULED runs, not dispatched ones. The reason is the
one `check-sections-gap-streak.mjs` already documents: two dispatches minutes
apart sample one slate state, which is the coincidence a multi-run bar exists to
exclude. The 2026-09-06 pair at 26 — FAIL then PASS six minutes later — is this
project's own proof that a single reading at the boundary decides nothing.

## Rule 90 — the mutation that must go red

Before trusting Task 2's new fields, break each one and watch the probe report
the wrong boundary. A field that has only ever been written correctly has proven
nothing. The harness must refuse a verdict it did not produce: if a mutation's
anchor matches zero times or more than once, print `NOTHING MUTATED` and fail —
never `NOT CAUGHT`.

## Coverage of this document (Rule 91)

Written from **36 committed probe manifests spanning 2026-09-06 to 2026-09-21**,
and from reading `field.js:9762-9900` and `field.js:21676-21691` at HEAD (line numbers checked against HEAD on 2026-09-21, not quoted from memory). It
does **not** include: any live browser run by this session (the sandbox has no
egress to the relay — CI is the escape hatch), any relay-side reading beyond
what the probe committed, and no `by-date` payload has been inspected at all.
