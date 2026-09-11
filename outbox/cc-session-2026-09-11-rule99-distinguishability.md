# CC session 2026-09-11 — Rule 99 (DISTINGUISHABILITY-A)

Rule 67 session doc for `docs/CC-CMD-2026-09-11-rule99-distinguishability.md`.

## HEAD progression

| repo | commit | what |
|---|---|---|
| jubilant-bassoon | `3da97fb9` | Rule 99 + `check-absence-collapse.mjs` + deploy-gate wiring |
| field-relay-nba | `dc7df57` | the live fix + `check-quota-gate-ordering.mjs` + deploy.yml wiring |

Smoke: **1037 passed, 0 failed** (unchanged; no `index.html` edit, so no
SW_VERSION bump and no deploy trigger in this repo).

## TASK 0 findings — two, and one contradicts the CC-CMD

**0.1 Numbering.** Highest existing rule is **Rule 98** at `STANDARDS.md:4845`,
heading form `## Rule 98 — <name> (TAG-A)`. Rule 99 matches it and sits at
`:4906`.

**0.2 `STANDARDS-INDEX.md` still does not exist.** Confirmed absent from the
working tree and from `git ls-files`. Two CC-CMDs about a standards index exist
under `docs/`; neither produced the file. No index entry to add.

**0.3 — the gate. The CC-CMD's own citation is wrong for this repo.**

It says "Read Rule 89 and Rule 91 before writing. Rule 91 (SAMPLE-COVERAGE-A)".
In this repo's `STANDARDS.md`, **Rule 91 is SCOPE-LEGIBLE-A** and Rule 89 is
SCOPED-TOOL-DEFAULT-A. `SAMPLE-COVERAGE-A` appears nowhere in jubilant-bassoon
except inside that CC-CMD itself.

Three registries are in play and they diverge above 88:

| registry | 89 | 90 | 91 |
|---|---|---|---|
| `jubilant-bassoon/STANDARDS.md` | SCOPED-TOOL-DEFAULT-A | RULE-COMPLIANCE-FOLLOWUP-A | **SCOPE-LEGIBLE-A** |
| `jubilant-bassoon/CLAUDE.md` | RENDER-CHROME-A | VERIFY-ARTIFACT-A | *does not exist* |
| `field-relay-nba/CLAUDE.md` | VERIFY-ARTIFACT-A | MUTATE-FIRST-A | **SAMPLE-COVERAGE-A** |

Verified by grep, not read off a document. Rule 99 therefore cites
SAMPLE-COVERAGE-A by tag and file, never by bare number, and carries a numbering
caution saying why.

**0.3 verdict — genus and species, not a near-duplicate.**

SAMPLE-COVERAGE-A is this class at the reporting surface: a bare `PASS` cannot
distinguish "186 of 186 verified" from "6 verified, 180 inferred." Neither rule
makes the other redundant:

- SAMPLE-COVERAGE-A is narrower in scope (probe output only) and more specific
  in remedy (print `checked N of M`). It has nothing to say about
  `parseInt(h || '0', 10) || 0` — there is no sample and no probe.
- Rule 99 is about types crossing a boundary and its remedy is structural. It
  does not tell you to print a denominator.

Rule 99 states explicitly: **where they meet, SAMPLE-COVERAGE-A governs.** Do
not satisfy it by widening a type and leaving the printed result silent.

## The three counts

Run across both repos at HEAD, after the fix:

```
scanned 376 files across 2 root(s)
(check-absence-collapse.mjs excluded from its own scan)

  flagged                 263
  suppressed-with-reason    0
  clean (lines)        138430
```

Before the relay fix the same scan read **266**. The delta is exactly the three
collapse sites removed; none of them appears in the flagged list now.

A single pass/fail number would be this rule violating itself: `flagged 0`
cannot distinguish "nothing to find" from "the matcher matched nothing."

## First ten flagged

```
jubilant-bassoon/layer2_review.js:22            [|| '']  (process.env.COMMIT_MESSAGE || '')
jubilant-bassoon/retry_telemetry_probe.js:116   [?? []]  latest?.results ?? []
jubilant-bassoon/scripts/build-field-data.js:47 [|| '']  (process.env.ESPN_GOTD_IDS || '')
jubilant-bassoon/scripts/build-field-data.js:48 [|| '']  (process.env.PEACOCK_GOTD_IDS || '')
jubilant-bassoon/src/legacy/field.js:6784       [|| []]  JSON.parse(localStorage.getItem(key)) || []
jubilant-bassoon/src/legacy/field.js:6795       [|| []]  JSON.parse(localStorage.getItem(key)) || []
jubilant-bassoon/src/legacy/field.js:9666       [?? []]  Array.isArray(j) ? j : (j?.results ?? [])
jubilant-bassoon/src/legacy/field.js:19411      [|| []]  fetchOpenF1Positions
jubilant-bassoon/src/legacy/field.js:19413      [|| []]  fetchOpenF1Drivers
jubilant-bassoon/src/legacy/field.js:21828      [|| []]  games.push(...(d.games||[]))
```

Not a defect list. Several are genuine defaults; the three counts exist so the
census is readable as a census.

## The required acceptance test

The CC-CMD's condition — "if the check does not flag `src/index.js:6503` it does
not work" — is satisfied against the **pre-fix** source, which is where that
line still exists:

```
$ git show 81a7a3f:src/index.js > /tmp/prefixrepo/src/index.js
$ node check-absence-collapse.mjs /tmp/prefixrepo --require=prefixrepo/src/index.js:6503
  flagged  107
require OK: prefixrepo/src/index.js:6503 flagged as || 0
```

`--require` is itself proven able to fail: a mutation replacing
`flagged.find(f => f.at.includes(need))` with `flagged[0]` made a nonexistent
path "pass," and the restored control rejects it (`require FAILED`, exit 1).

## Mutations

**`check-absence-collapse.mjs`** — classifier self-tests on 9 fixtures every
invocation, 3 kinds.

| mutation | result |
|---|---|
| neuter BOTH header-matching patterns | caught (require red) |
| remove the `\|\| 0` collapse pattern | caught (require red) |
| make `--require` always pass | caught by the restored control |
| neuter `.headers.get` **alone** | **SURVIVED** |

The survival is the finding: `.headers.get` is fully covered by the generic
`.get('literal')` rule, left the count at 266, and still caught 6503. Recorded
in the source so a later reader does not treat it as load-bearing.

A first attempt at the `|| 0` mutation **self-reported NOT MUTATED** (bad regex
escaping in the harness) rather than printing a false green. That is the
corollary this project already requires of mutation harnesses.

**`check-quota-gate-ordering.mjs`** — its first version passed all three of its
own mutations **for the wrong reason**: `await fetchSportOddsLive(env, sportKey)`
also appears in the `/identity/mismatches` route, so every mutation was "caught"
by an anchor-uniqueness error rather than by the property under test. Anchors
are now the full destructuring lines, and a mutation must be caught by its own
property letter to count.

## The live fix

Impact analysis found **three** collapse sites and **two** structurally
identical loops, not one of each:

| site | status |
|---|---|
| `src/index.js:6503` (live fetch) | fixed |
| `src/index.js:6603` (historical fetch) | fixed |
| `src/wp-resolver.js:268` | fixed — **latent**, its only caller (`:548`) destructures `{ games, ok }` |

`readQuotaHeader` (`budget-helpers.js`) returns `number | null`, unit-tested 7/7
over `null`, `''`, `'  '`, `'0'`, `'44235'`, `'abc'`, `undefined`. A real `0`
stays `0`; everything else that is not a reading is `null`.

Both loops: assignment moved after the `ok` check; floor gates test
`typeof x === 'number'`; the `> 0` guard removed deliberately, because it
existed only to blunt the fabricated zero and would now let a genuine
exhaustion through.

**The earlier partial fix is why this ships with a guard.** `> 0` had been added
to the inner check (`:6540`) and not the outer (`:6535`), so the fabricated zero
survived one iteration and killed the next. A defence applied to one of two
identical sites is the signature of treating a symptom.

## What the check cannot catch

Stated in Rule 99 and in the script header. It is a syntactic matcher over
source text and does **not** see:

1. a collapse across a function boundary — a helper returning `0` whose caller
   cannot tell;
2. `Number(x)` or unary `+x` producing `NaN` later coerced;
3. a schema-level default in D1, or a JSON parser's own default;
4. a value collapsed inside a library;
5. the *semantic* question — whether a flagged `|| 0` is a real defect. It
   cannot rank the 263.

Its clean count means "nothing matched these patterns," never "this file is free
of the class."

## Automated follow-ups

- `jubilant-bassoon/.github/workflows/deploy-gate.yml` — absence-collapse census
  on every deploy. **Not a count gate** (266 flagged on day one would make it
  useless; Rule 97). It asserts the check still works: `--self-test`, plus
  `--require=src/legacy/field.js` so a matcher that silently stopped matching
  fails rather than reporting a clean sweep.
- `field-relay-nba/.github/workflows/deploy.yml` — `check-quota-gate-ordering.mjs`
  blocks the deploy if either loop regresses on any of the three properties.

## Carry-forward

None. No deferred work without a second CC-CMD.

The 263 flagged sites are a census, not a backlog — Rule 99 governs new
boundaries, and triaging the existing ones is not scoped here and has no
evidence yet that any is live.
