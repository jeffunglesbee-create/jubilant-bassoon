# Session doc — the secret scan was scoped to one repo, and said so nowhere

**Date:** 2026-08-25
**Repos touched:** jubilant-bassoon (this), field-relay-nba

## What this corrects

Earlier today the relay's Odds API key was removed and reported as **"the Odds
API key is out of the repo"**, with a ratchet declaring `0`. Both true — of
field-relay-nba. A cross-repo scan afterwards found:

| repo | RELAY_SHARED_SECRET | ODDS_API_KEY |
|---|---|---|
| field-relay-nba | 115 | 0 |
| **jubilant-bassoon** | **9** | **3** |
| field-laboratory | 0 | 0 |
| field-playground | 0 | 0 |

The claim was scoped to one repository and nothing in it said so. A credential
does not respect repository boundaries and neither can the check that looks for
one.

## Done here

**The Odds key is redacted** — 4 occurrences across 3 files
(`docs/CC-CMD-2026-06-29-odds-adapter-proof-p1.md:159`,
`docs/source-registry.json:94`, `outbox/cc-odds-audit-results.md` ×2). All four
were PROSE, not configuration: the `source-registry.json` hit was inside a
`notes` string, and `smoke.js` reads that file only for
`.includes('bsd-bzzoiro-soccer')`, so nothing ever loaded the key from it. JSON
revalidated after the edit.

**`scripts/check-exposed-secrets.mjs` ported**, wired into
`smoke-and-verify.yml`, which runs on every push. Manifest:
`ODDS_API_KEY 0`, `RELAY_SHARED_SECRET 9`.

The shared secret is NOT removed here, for the same reason as in the relay: the
value is in git history either way, and four of the nine sites are live code —
`workers/field-claude-proxy/src/index.js:105` is an auth comparison, and
`retry_telemetry_probe.js` plus two `scripts/seed-mls-*.py` POST to
`/d1/execute`. The order is source-first and is written down in
`field-relay-nba docs/CC-CMD-2026-08-25-rotate-relay-secret.md`.

## The scanner had two holes, and this repo is how they were found

Both were in the version shipped to the relay this morning. Both are fixed in
both copies.

**1. Nested quotes.** `docs/journalism-root-cause-2026-05-29.md:24` carries

```
copy (`relayAuth === RELAY_SHARED_SECRET || 'field-relay-cron-2026'` skipped)
```

Two failures at once. The quote-pair regex matched the OUTER backtick span
first and consumed the inner literal, so the single-quoted secret never got its
own match. The token pass then produced ``'field-relay-cron-2026'` `` and the
strip regex removed one leading and one trailing quote character — leaving a
trailing apostrophe, so the hash missed. **The file scanned clean while
carrying the secret**, and a secret inside a code span is exactly how one
appears in prose.

Fixed by treating quote characters as DELIMITERS rather than decoration to
trim: no credential contains a quote, so nothing is lost and nesting stops
mattering.

**2. Whole-file scanning.** The counter pre-checked the whole file before
counting lines. Quote pairing is not anchored, so an unbalanced quote on an
earlier line shifts where later matches begin. Now line-by-line only.

**The relay's count moved 114 → 115 once the scanner was fixed.** That number
had been published this morning as the exposure. It was the second undercount
of the same value in one day — the first was ~41, from grepping `src/`.

**3. Importing the module ran a full scan.** A one-line diagnostic import
printed an entire report. `check:import-purity` in field-laboratory exists for
exactly this. The executable body is now behind a main guard.

Each hole has a self-test case, including the nested-quote form verbatim.

## Not done

`field-playground` measured clean and has **no gate**. A clean repo without a
guard is one commit from being a dirty one. It is the last of the four and it
is written down in `docs/CC-CMD-2026-08-25-playground-secret-gate.md`.

## Pre-existing, not caused here

`smoke.js` reports **984 passed, 1 failed** both before and after these edits.
The failure is `A515 — SW_VERSION date 2026-08-21 !== today ET 2026-08-25`.
Nothing in this change touches a deploy-trigger path (`index.html`, `sw.js`,
`field_utils.js`, `wrangler.jsonc`), so bumping SW_VERSION here would trigger a
deploy for a docs-and-scripts commit. Left alone and reported.
