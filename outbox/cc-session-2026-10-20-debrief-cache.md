# CC session: the debrief cache outlived an archive repair (2026-10-20)

`docs/CC-CMD-2026-10-20-debrief-cache-outlives-archive-repair.md`, dispatched by
the owner ("next approved"). TASK 1's decision was owner-delegated. Status DONE.

**HEAD:** `ff4239e2` → `df6d8a30`, `3de79e6e`, `7a1819f9`, `9c8591c3`,
`1f3d2d04`, `5bde6c9d`, `50affb7c`, `4eb3d240`, plus this docs commit. Branch
main throughout.
**Smoke:** 1055 → 1055 (0 failed). **SW_VERSION:** 2026-10-18b → 2026-10-20a.
**Proof log:** `outbox/debrief-cache-revalidate-2026-10-20.log`
**Live manifests:** `outbox/debrief-cache-revalidate-manifest-*.json`

## TASK 0: premises, one command each (Rule 100)

| premise | command | result |
|---|---|---|
| field-debriefs is the only stale path | grep every reader and writer, plus every client store of /archive and /context payloads | **true.** It is the only store that outlives the session with no read-time age check. The sessionStorage archive caches expire at 30 min; the field-snapshots paint is replaced by the first renderAll |
| the relay sends a change signal | read the route, probe the body three times | **false.** No ETag, Last-Modified or updated_at. The body was byte-identical across 34 minutes, past the 300 s KV TTL |
| a 2xx body is a complete answer | the review read the route | **false.** A failed D1 sub-query answers 200 with `_errors` and is KV-cached. Found in review round 1, not by this TASK 0 |
| a hit used to cost no request, and that is the baseline | `git log -S field-debriefs` | **false.** Gap 12 (`324c1077`, 2026-07-18) added the Cache API on the premise that finals are immutable. Before it, every load fetched every final |
| the live build shows the defect | live probe, second visit in a new tab | **true.** Run 39456471138: 0 relay requests, and the planted copy stayed on the page and in the cache |

## What landed

| commit | what |
|---|---|
| `df6d8a30` | `debrief_cache_revalidate_probe.js` and its workflow. It plants a MARKER in one real field-debriefs entry, then makes a second visit with that game's relay request held for 4 s |
| `3de79e6e` | `lab-flow-event-rows.mjs`: a 200 without `results` is logged, not read as an empty day. This was the absence-collapse ratchet that had kept Smoke and the deploy gate red since `31feef49` |
| `7a1819f9`, `9c8591c3` | probe fixes: its waits are recorded instead of swallowed; the second visit is a new tab (see below) |
| `1f3d2d04` | **the fix**, plus `scripts/check-debrief-cache-revalidates.mjs` (24 cases, 33 mutations), its fixture, and the deploy-gate step |
| `5bde6c9d` | CONTRACTS.md: `_errors` is the partial-answer marker. Filed the missed-recap CC-CMD |
| `50affb7c` | CONTRACTS.md identical to the relay's again (red since 2026-09-12) |
| relay `3703e450`, `f5659138`, `2737179a` | two relay CC-CMDs, and the same CONTRACTS sections |

**The fix:** a Cache API hit renders at once. Then the relay is asked, with
`cache: 'no-cache'`, and the body is compared with the cached JSON.
- **Changed:** it is kept, and only that game's cards are re-run. If the new
  payload draws nothing, the old debrief is cleared.
- **Unchanged:** nothing is written, so X-Cache-Time keeps dating the copy.
- **Non-2xx, offline, or a 200 with `_errors`:** the cached copy and its render
  stay, and `debrief:revalidate` is recorded. A body with `_errors` is kept
  nowhere: not in the Cache API, not in the session Map.
- **Overlapping passes:** they share one pending resolve, and only the first
  revalidates.

## Done conditions (Rule 90 artifacts)

1. **TASK 0's three outputs:** proof log §0.
2. **The reload test, red before and green after, with mutations:** proof log §1-§2.
   - base `ff4239e2`: 6 of 24;
   - the three intermediate versions: 13, 18 and 23 of 24;
   - `1f3d2d04`: 24 of 24;
   - mutations: 33 of 33 caught, after a green baseline.
   Under CPU starvation (12 busy loops, nice 19) the 20-case version held 20 of 20.
3. **Green deploy gate:** run 39468343572 on `5bde6c9d`, success. Locally, every
   gate step passed 32 of 32 in a clean worktree per workflow; the pushed base
   passed 30 of 31, failing only the SW_VERSION date.
4. **Live, after deploy:** run 39468966102 (SW 2026-10-20a, served page carries `_revalidateDebriefContext`): PASS. The planted copy of espn:401874762 rendered at 2.8 s while its relay request was held; the relay was asked at 2.7 s and answered 200 at 6.8 s; afterwards 0 debriefs show the MARKER and the Cache API no longer holds it. The second visit asked the relay once per cached final (11 requests for 11 cached entries).

## What this session got wrong, and the cost

- **The first fix took any 2xx as a correction.** The relay's partial answers
  (`_errors`) would have replaced good cached copies. It also re-ran the whole
  injection pass on a change, which re-requested every pending card (K × M),
  and it rewrote X-Cache-Time on every load. Three review rounds reported 37
  findings, and verifiers confirmed 32 (11, 14 and 7 by round). Several were
  the same defect found by more than one reviewer. Each confirmed finding is
  fixed in `1f3d2d04`, filed, or recorded as a limit below.
- **The first harness proved less than it said.** It modelled a relay failure
  only as a 500. Its timeouts flaked under load and could hang `--mutate`. It
  credited mutations against a red baseline. The case count went 11 → 17 → 20
  → 24, and the mutation count 10 → 18 → 26 → 33.
- **The proof log's TASK 0 had five miscounts and one probe that could not
  fail.** The two "byte-identical" reads were one KV string. All are corrected,
  and the review findings are noted where they were.
- **The first live probe reloaded the same tab.** That restores sessionStorage
  (`field_sched_<iso>`), and that path rendered no debriefs, so the red run
  could not show the cached render. The probe now uses a new tab.
- **A `git reset --hard` used to reorder unpushed commits also reverted an
  uncommitted `.assetsignore` line.** It was re-applied before any commit.
- **The step runner ran later workflows on files the strip-comments step had
  rewritten.** Six false failures, identical at base. Fixed: one worktree per
  workflow. A full disk (ENOSPC) gave one more false failure; 19 GB of this
  session's scratch was deleted.

## Residuals, filed (Rule 87.4)

- **Relay, `docs/CC-CMD-2026-10-20-context-game-caches-partial-answers.md`:**
  - `findBracketDelta` swallows its D1 error. A bracket failure therefore
    arrives with no `_errors`, and the client takes it as a correction until the
    next load revalidates.
  - Partial answers are KV-cached for 300 s.
- **Relay, `docs/CC-CMD-2026-10-20-context-game-scans-17k-rows-per-answer.md`:**
  one answer reads 17,468 D1 rows, measured per query. The client now asks once
  per cached final per page load, the pre-Gap-12 volume.
- **Client, `docs/CC-CMD-2026-10-20-missed-recap-reads-a-shape-the-relay-never-sends.md`:**
  `hydrateMissedRecaps` reads `data.briefs`, which the relay never sends.
- **Client, `docs/CC-CMD-2026-10-20-reload-on-a-past-date-renders-no-debriefs.md`:**
  a same-tab reload, then a step back to yesterday, rendered 0 debriefs where
  the first visit had 11. Observed once (run 39455640076), not yet reproduced.

## Limits, printed with the result (Rule 91)

- **The check runs field.js's own text with the real buildDebrief.** The DOM,
  the Cache API and the relay are fakes. It covers one measured game
  (espn:401866408) plus three synthetic ids.
- **The live probe checks one game per run,** the first cached final on
  yesterday's slate.
- **No revalidation throttle.** A correction reaches a browser on its first
  page load after the relay's KV copy (300 s) expires.

## Integration state (Rule 65)

- **Relay contract:** unchanged. `/context/game/{id}`; CONTRACTS.md now
  documents `_errors` in both repos.
- **Client consumer:** `injectDebriefCards` and the new
  `_resolveDebriefContext`, `_keepDebriefContext`, `_revalidateDebriefContext`
  and `_fetchDebriefContext`. They read `_errors` as the partial marker and
  render into `.card-debrief`.
- **Status:** VERIFIED live (see done condition 4).
