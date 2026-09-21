# CC session 2026-09-21 — tennis rendered zero cards above the overflow threshold

CC-CMD: `docs/CC-CMD-2026-09-21-tennis-renders-zero-above-26.md`
Repo: jubilant-bassoon. Branch: `main` throughout.

## The defect, in one line

`renderAll` splits any section above `FEATURED_TIER_OVERFLOW_THRESHOLD` (30)
into featured cards and a collapsed overflow strip, promoting a game only on a
curated rank of 25 or better, a followed team, or a Scout's Pick. **Tennis has
no ranking source and a headless visitor follows nobody**, so zero of 42 games
qualified, every one went to the strip, and the section rendered its own header
over an empty list.

## HEAD progression

| commit | what |
|---|---|
| `bbbc8ecb` | the CC-CMD itself |
| `70296e82` | Task 1 — the producer says WHICH absence it found |
| `4f23c372` | Tasks 2 + 4 — the probe names the boundary; the false cause removed |
| `e8160dd7` | the render's own counters, read at the same instant |
| `92172468` | what the Tennis element actually IS, plus my empty-model misread fixed |
| `6c2f0124` | **Task 3 — the fix** |

SW_VERSION `2026-09-12u` → `2026-09-21a` → `b` → `c`.

## Done condition — MET

> A committed manifest with `relayLiveMatches >= 34`, `verdict: "PASS"`, and
> `tennisCardCount == relayLiveMatches`.

`outbox/tennis-live-probe-manifest-2026-09-21T22-02-15-900Z.json`:

```
verdict              PASS
relayLiveMatches     42        tennisCardCount   42
tennisGamesInModel   42
domSectionCardCounts MLB 3, AFL 1, Tennis 42
cardsWithSetScore    40 of 40 started  (2 not yet under way, correctly chipless)
cardsWithOpponent    42
tournaments proven   Porto, Seoul, Singapore, Tolentino, WTA 125k Ankara,
                     WTA Sao Paulo
```

**42 ≥ 34, so this PASS cannot be explained by the slate shrinking under the
threshold** — which is the whole reason the bar was set above the lowest FAIL.

### The second scheduled PASS is NOT yet in hand

The condition asks for **two** such manifests from SCHEDULED runs, and this one
was dispatched. That is a genuine residual, not deferred work: the workflow runs
at 00:57 and 14:00 UTC and nothing further is required of a session. The
before/after pair at a fixed slate size is stronger evidence than either alone —
same 42 matches, 21:56Z renders 0, 22:02Z renders 42, six minutes apart with one
commit between them.

## What ruled each candidate out

Every candidate the CC-CMD listed was wrong, including its leading one. Task 1's
instrumentation is what killed them, in this order:

| candidate | what refuted it |
|---|---|
| the 5s `AbortSignal.timeout` | `feedLiveOutcome: ok:7`, `feedByDateOutcome: ok:133` |
| the tier filter | `rowsBeforeTier 133` → `rowsAfterTier 42` |
| the row mapping | `sectionReturned 42` |
| the async merge | `sectionInAllData true`, `tennisGamesInModel 42` |
| "the 2026-06..09 no-section regression" | `tennisSectionPresent` true in 30 of 36 manifests |

The last one was being **published by the probe itself** on every FAIL, twice a
day, for sixteen days. Removing it was Task 4.

## What the manifests had been saying all along

Sorted by their own `ts`, every PASS sat at 26 or fewer tier-allowed matches and
every FAIL at 26 or more — a threshold, with the boundary going both ways six
minutes apart on 2026-09-06. That pattern was read correctly as "a threshold"
and attributed to a timeout. It was a threshold of 30 on the SECTION's game
count, which `relayLiveMatches` only tracks loosely because the by-date feed
contributes matches that are not yet live.

**The count was right and the cause was wrong**, which is exactly why the
CC-CMD filed it as a candidate rather than a finding.

## The fix

```js
const _featured = _overThreshold ? games.filter(g => isFeaturedTierGame(g, MY_TEAMS)) : games;
const _splitBySignal = _overThreshold && _featured.length > 0;
const cardGames = _splitBySignal ? _featured : games;
const overflowGames = _splitBySignal ? games.filter(g => !isFeaturedTierGame(g, MY_TEAMS)) : [];
```

One condition. A split with nothing on the featured side is not volume
management, it is a hidden section. Below the threshold nothing changes; a
section with at least one qualifying game behaves exactly as before, which
covers CFB, the sport this feature was built for. `_featured` is computed once
and reused, so the guard cannot test one list while the page renders another.

## Verified E2E vs STAGED

**E2E VERIFIED.** Data source → relay → client fetch → DOM render, in a real
browser against the live URL, with the card contents read rather than counted:
40 of 40 started matches carry a set score, 42 name an opponent, six
tournaments named on the page.

Nothing is STAGED.

## Gates

| gate | result |
|---|---|
| `node smoke.js index.html` | 1051 passed, 0 failed |
| `scripts/mutate-tennis-diag.mjs` | 8 of 8 caught |
| `scripts/check-tennis-boundary-line.mjs` | 15/15 |
| `scripts/mutate-tennis-boundary-line.mjs` | 6 of 6 caught |
| deploy-gate run 970 | success |

`A-FTO-3` was rewritten: it pinned the exact pre-fix expression, so the correct
fix made it red. It now asserts both halves of the guard and still checks that
`MY_TEAMS` is passed rather than read as a global.

## Five defects in the measuring apparatus, none in the product

Every one was caught by a mutation or a test, none by reading.

1. **The first mutation harness reported four NOT CAUGHT for mutations that
   never happened.** It mutated `field.js` and re-ran `sync-source.mjs`, which
   refused every time — with Task 1 uncommitted, `index.html` matched neither
   the mutated source nor the last commit, which is what the direct-edit guard
   is for. Its output was captured and discarded. It now mutates a copy of the
   artifact and re-reads it from disk before accepting a verdict.
2. **The second read only stdout.** `smoke.js` writes failures to stderr, so it
   printed `0 of 6 caught` while six red assertions scrolled past in the same
   terminal.
3. **`A-TENNIS-15` passed while the global it guards had been renamed**, because
   a different line still mentioned the old name. Mutation D4 caught it; reading
   it did not. It now anchors on the declaration.
4. **`boundaryLine`'s `bad()` counted `empty` as a failed feed**, so a day with
   no tennis would have been reported as `NEITHER FEED DELIVERED` — the absence
   collapse this document is about, rebuilt inside the reader written to report
   it, two hours after writing the document. Caught by its own self-test's first
   run.
5. **`sectionsInModel: []` was my probe reading `window.allData`**, which does
   not exist — `allData` is module-scoped. It printed an empty model beside a
   DOM holding three sections. Corrected before it was published as a finding;
   publishing it would have sent the next session hunting a model that was never
   empty.

The CC-CMD also named the wrong channel: it specified `window.__FIELD_PROOF__`,
which is built inside `if (_proofMode)` and does not exist on the URL the probe
loads. Reading the guard refuted it before any code was written.

## Residuals

1. **The second scheduled PASS**, above. Nothing to do; the cron produces it.
2. **`FEATURED_TIER_OVERFLOW_THRESHOLD` is a global constant applied to every
   sport.** The guard stops it hiding a section outright, but a sport with no
   ranking signal and 200 rows will now render 200 cards, which is the volume
   this feature exists to manage. Not in scope here and not a regression — it is
   the pre-overflow behaviour. Worth its own CC-CMD if a slate that size arrives.
3. **`odds-line-probe` reports the same shape at slate level** — sections in the
   model not in the DOM — and is tracked separately by
   `docs/CC-CMD-2026-09-12-v2-sections-in-model-not-in-dom.md`. Whether this fix
   moves its streak is an observation to make, not a claim to file.
