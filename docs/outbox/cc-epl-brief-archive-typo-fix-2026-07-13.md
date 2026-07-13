# CC Session Outbox — EPL brief archive typo fix

**Date:** 2026-07-13
**Scope:** jubilant-bassoon (sole). Executes
`docs/CC-CMD-2026-07-13-epl-brief-archive-typo-fix.md`.

## TASK 0 — Probe

`grep -n "function renderEPLMatchBriefCard" index.html` confirmed the
function still starts at line 32495, unchanged since the typed-result
survey found this bug. `sed -n '32540,32560p'` confirmed the exact
surrounding code, including the buggy line, matched the CC-CMD's own
description byte-for-byte.

## TASK 1 — Fix

Changed:
```js
try { archiveBrief('epl_match', 'EPL', g&&(g._id||g.id)||null, aiText, null); } catch(_){}
```
to:
```js
try { archiveBrief('epl_match', 'EPL', game&&(game._id||game.id)||null, aiText, null); } catch(_){}
```
One-token change only. Confirmed no other identifier in the function was
touched.

## TASK 2 — Verification

- **Read-back:** confirmed no bare `g` reference remains anywhere in
  `renderEPLMatchBriefCard`'s scope. The only `g` tokens left in the
  function body are a legitimately-scoped local parameter inside an
  unrelated `.forEach(g=>{ if(g._id===gameid) game=g; })` callback
  (finds the game object by id) — a different, correctly-scoped `g`, not
  the bug.
- **Live test attempted, none available — stated plainly, not
  fabricated:** checked ESPN scoreboards for Premier League, La Liga, and
  UEFA Champions League (2026-07-13 ~00:40 UTC). Premier League: 1 game,
  `state:pre`, kicks off 2026-08-16. La Liga: 10 games, all `state:pre`,
  also mid-August. Champions League: 1 game, `state:post`, but dated
  2026-05-30 — 6 weeks old, the prior season's final. All major European
  domestic leagues are in their summer off-season in July; no genuinely
  live or recent EPL-family game exists to trigger the real render path
  against.
- **Real extraction test performed instead** (Node `vm`, function pulled
  verbatim from `index.html`, not reimplemented): mocked
  `fetchEPLMatchBriefFromClaude` to resolve real AI text, stubbed
  `archiveBrief` to record its call arguments, ran
  `renderEPLMatchBriefCard()` against a fake card/game end-to-end.
  **Result: `archiveBrief` was called with the real game id (`g123`), no
  `ReferenceError` thrown.** Before this fix, the identical test throws
  `ReferenceError: g is not defined` inside the swallowed `try/catch`,
  and `archiveBrief` is never invoked.
- `node smoke.js index.html`: 919 passed, 0 failed.
- `node field_unit.js`: 66 passed, 0 failed.
- `node field_smoke.js index.html`: exit 0, no failures.
- `node --check` equivalent (extract + `new Function()` per `<script>`
  block): clean.

## DONE CONDITION

The undefined-`g` reference is fixed to the real local `game` variable.
Confirmed via source read-back (no other `g` binding in scope) and via a
real executed extraction test proving `archiveBrief()` now receives the
correct game id — no live browser trigger was possible (off-season, no
live/recent EPL-family game), stated honestly rather than fabricated.
All three test suites clean.

## Commit

- `index.html`: one-token fix, `g` → `game`, line ~32552. No other change.
  No `SW_VERSION` bump needed per Rule 23's own convention for typo-class
  fixes this size — reconsidered: bumping anyway since this touches
  index.html and is a deploy-gate trigger path (Rule 4 requires SW_VERSION
  sync on every index.html-touching commit, no size exception stated).
- This manifest.
