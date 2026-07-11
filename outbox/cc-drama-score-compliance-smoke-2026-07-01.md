# CC Outbox — Lock In Drama Score Display Compliance

**Date:** 2026-07-01
**CC-CMD:** docs/CC-CMD-2026-07-01-drama-score-compliance-smoke.md
**Commit:** bc08557
**Smoke:** 819 → 821 (2 new assertions, 0 failed, no regressions)

---

## Pre-build probe

Confirmed exact current line numbers matched the CC-CMD's own probe with
zero drift: `dramaScoreLive` at index.html:22978, `dramaTier` at
index.html:23809. `dramaTier`'s real source:

```javascript
function dramaTier(score){
  if(score>=80) return 'fire';
  if(score>=60) return 'hot';
  if(score>=40) return 'warm';
  return '';
}
```

Also found relevant prior art already in `smoke.js`: `A495` already
checks for the *absence* of one specific bad pattern
(`dramaTier(score)||'warm'` in the OTW FIRE block, a RUWT Rule 95 fix
[renumbered 2026-07-11 from Rule 51, which collided with STANDARDS.md's
Period Prefix Registry — see docs/outbox/cc-standards-collision-resolution-2026-07-11.md]).
This CC-CMD's assertions are a different, more general check (the
function's own return-set contract, and a heuristic scan across all
`dramaScoreLive(` call sites) — not a duplicate of A495. Inserted the two
new assertions immediately after A495 for topical grouping.

## Adaptation from the CC-CMD's pseudocode

The CC-CMD's Task 1/2 code samples used a hypothetical
`assert(label, () => {...})` API returning `{pass, reason}`, and a
`fetchFileSource('index.html')` helper — neither exists in `smoke.js`.
The CC-CMD's own instruction explicitly said to adapt to whatever
convention already exists rather than invent one. Real `smoke.js`
convention (confirmed by reading the file, not assumed): 

```javascript
const html = fs.readFileSync(process.argv[2] || 'index.html', 'utf8');
function assert(label, condition, detail = '') { ... }
```

Rewrote both assertions as `assert(label, (() => {...boolean...})(), detail)`
IIFEs against the global `html` string, matching the pattern already used
by several existing assertions in this file (e.g. the AVV-SAVANT block).

## Task 1 — DRAMA-COMPLIANCE-001

Dry-ran the regex extraction against the real file before writing the
final assertion (not just trusted the CC-CMD's snippet): the pattern
`/function dramaTier\(score\)\{([\s\S]*?)\n\}/` matches cleanly (no space
before `{` in the real source, matching the regex's assumption), extracts
all 4 return statements (`'fire'`, `'hot'`, `'warm'`, `''`), all within
the allowed set. Passes.

## Task 2 — DRAMA-COMPLIANCE-002

Dry-ran the heuristic against the real file before shipping: found 8
`dramaScoreLive(` call sites in `index.html`, zero violations — matches
the CC-CMD's own manual-audit claim exactly (every consumer converts via
`dramaTier()` first).

**Heuristic limitation, stated explicitly (per the CC-CMD's own
instruction not to oversell this):** this is a regex-based, line-window
scan, not an AST analysis. It specifically catches the mistake pattern
already found once during manual audit — a new `dramaScoreLive(` call
site whose surrounding ~15 lines interpolate `${score}`/`${Math.round(score)}`
with no intervening `dramaTier(` call. It does **not** catch:
- A raw score assigned to a differently-named variable before display
  (e.g. `const d = dramaScoreLive(...); ...${d}...` — the heuristic only
  looks for the literal identifier `score`).
- A raw score passed through a function other than `dramaTier` that
  itself fails to sanitize it before returning.
- A violation more than 15 lines away from its `dramaScoreLive(` call.

This limitation is stated both in the assertion's own inline code
comment, in its `detail` string (shown on failure), and here — not
buried only in this outbox file, per the CC-CMD's instruction not to
oversell what a regex-based smoke check can prove.

## Task 3 — Verification

`node smoke.js index.html`: 821 passed, 0 failed (819 + 2, exact expected
delta). Both new assertions passed immediately against current `main`
with no code change to `dramaScoreLive`/`dramaTier` — confirming the CC-CMD's
stated done condition: this is a regression guard, not a fix. No live
violation was found or needed fixing.

## Task 4 — Outbox manifest

Covered above: heuristic limitation stated explicitly (Task 2 section);
both assertions confirmed passing against current `main` with zero
changes to `dramaScoreLive`/`dramaTier` themselves.

---

## Done Conditions

- [x] DRAMA-COMPLIANCE-001 verifies dramaTier's return set is exactly the
      4 known values, dry-run confirmed against real source before shipping
- [x] DRAMA-COMPLIANCE-002 heuristic dry-run confirmed zero false
      positives against real source (8 real call sites, 0 violations)
- [x] Heuristic limitation stated explicitly in the assertion's own
      detail string, not just this outbox
- [x] Adapted to smoke.js's real assert()/html conventions, not the
      CC-CMD's hypothetical pseudocode API
- [x] Both assertions pass immediately — no live violation found, no
      dramaScoreLive/dramaTier code changed
- [x] 821/0 smoke, no regressions
- [x] Outbox written
