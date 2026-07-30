# CC Session — layer4-cross-game-facts-pull
**Date:** 2026-07-30
**CC-CMD:** docs/CC-CMD-2026-07-30-layer4-cross-game-facts-pull.md
**Repo:** jubilant-bassoon
**HEAD at close:** 8f6d45f0

---

## Storage mechanism chosen, and why

**None.** No Durable Object, no relay endpoint, no new storage of any
kind — and this is a justified choice, not a shortcut. All 10 PL Final
Day games already render together in the SAME in-memory `eplGames` array
on every render pass (this file's existing single-page-schedule
architecture: `buildTodaySchedule()` pushes one `{sport:"Premier
League", games:eplGames}` section, not ten isolated views). Since the
data one game needs (another simultaneous game's live score) is already
co-located in the same process memory, there is no cross-request or
cross-process state to coordinate — the entire premise for needing a
coordinator (DO or otherwise) doesn't hold once you look at what data is
actually available where.

`_applyLayer4CrossGameFacts(games)` is a pure, synchronous function.
Confirmed via direct inspection: zero occurrences of `fetch`,
`WebSocket`, or `postMessage` anywhere in its body. It reads live scores
via `findESPNScore(g)` — the exact same function every other card in
this file already uses, which reads already-populated in-memory state
(`espnScores`/`_scoresBySource`), not a new network call.

---

## Task 1 — re-verified fresh, confirmed the CC-CMD's premise holds

- **`bracket-do.js` re-read fresh** (field-relay-nba): confirmed it still
  autonomously fans out WebSocket broadcasts on every threshold-relevant
  change (`_recomputeLiveAndBroadcast`, `ctx.getWebSockets()` fan-out at
  multiple sites). Today's earlier read still holds.
- **Deployed DO list re-confirmed fresh** via `wrangler.toml`: exactly 5 —
  `GameDO`, `UserDO`, `BracketDO`, `AmbientDO`, `BrowserDO`. No "World Cup
  Group DO A1" exists or ever existed.
- **`ADR-002-CONTEXT.md` Rule A/F read directly**, not from a paraphrase:
  Rule A permits the relay to compute and serve scalar/commodity values
  in pull-based responses, but never autonomously push a threshold-keyed
  alert. Rule F separately governs content (commodity vs. proprietary).
  Both must independently hold. This CC-CMD's design (pull-only, zero
  relay involvement at all) trivially satisfies both — there's no relay
  computation to even evaluate against Rule F.

---

## Task 2 — built, pull-only

- Scoped to PL Final Day only (real `PL_FD` standings data), matching the
  CC-CMD's instruction not to build the general case.
- Reuses `PL_FD` and the four note functions from
  `CC-CMD-2026-07-30-wire-pl-final-day-stakes` rather than recomputing
  clinch/standings math.
- Wired at the same `eplGames` call site as `_applyPLFinalDayNote`
  (src/legacy/field.js, `buildTodaySchedule()`).
- Rendered via one new conditional line in the shared card template
  (`${g._layer4Watch?...}`), matching the existing narrative-line/
  crew-line convention exactly — not a new rendering pattern.
- Drama implications: none computed here. This function only produces a
  factual "watching elsewhere" string (live score of the paired game);
  it does not feed `dramaScoreLive` or any scoring path, matching Rule
  47/client-only drama scoring by simply not touching that system at all.

---

## Task 3 — verified, and a real bug was caught in the process

**No autonomous send confirmed** via direct inspection (grep for
`fetch`/`WebSocket`/`postMessage` inside the function body: zero
matches).

**Direct evaluation, not just code inspection:** extracted the exact
committed function bodies (`_plTeamMatch`, `_applyPLFinalDayNote`,
`_applyLayer4CrossGameFacts`) verbatim and ran them in Node against a
4-game synthetic slate with a mocked `findESPNScore`.

First run caught a real bug: `liveState()` used a hardcoded
`/arsenal|tottenham|spurs/i` check to decide which side of a game was
"the tracked team," which silently broke when called on Man City's own
game (City doesn't match that regex, so the function treated City as the
*opponent* and Aston Villa as the tracked team) — output read "Man City
currently level with Manchester City 2-2," visibly wrong. Fixed by
passing `teamRe` explicitly per call instead of inferring it. Re-ran:

```
{"home":"Crystal Palace","away":"Arsenal","layer4Watch":"Man City currently level with Aston Villa 2-2 — watch that game too."}
{"home":"Manchester City","away":"Aston Villa","layer4Watch":"Arsenal currently leading Crystal Palace 1-0 — watch that game too."}
{"home":"Tottenham Hotspur","away":"Everton","layer4Watch":"West Ham currently trailing Newcastle United 0-3 (FT) — watch that game too."}
{"home":"Newcastle United","away":"West Ham United","layer4Watch":"Tottenham currently level with Everton 1-1 — watch that game too."}
```

All four cross-game watch strings now correctly name the opponent, not
the tracked team itself. This is exactly the class of bug direct
evaluation exists to catch — it would have shipped invisibly under
"looks right" code review alone.

`node field_smoke.js index.html`: `Failures: 0`.
`node smoke.js index.html`: `965 passed, 0 failed`.

---

## File-size smoke gate — hit and resolved, disclosed

index.html's structural ceiling (2,600,000 bytes, `smoke.js:43`) was
crossed during this commit — cumulative real comment volume across this
session's four CC-CMDs pushed past it. Trimmed verbosity only (zero
logic changes, verified via re-running the direct-evaluation test after
each trim) from this commit's own new comments plus the two earlier
CC-CMDs shipped this same session (`fix-savant-wp-scale`,
`reconcile-soccer-base-formula`). No comment trimmed further back than
today's own work — did not touch unrelated pre-existing code to make
room. Final size: 2,599,918 bytes.

---

## Commits this session (this CC-CMD)

| Commit | Description |
|---|---|
| `96c22227` → `8f6d45f0` (rebased) | feat: Layer 4 cross-game facts, pull-only, with the direct-evaluation bug fix and file-size trims |

---

## Explicitly NOT touched (per CC-CMD scope)

- `BracketDO` itself — separate audit already filed
  (`docs/outbox/chat-update-2026-07-30-bracketdo-rule-a-concern.md`).
- Bundesliga/Serie A/Ligue 1 — confirmed zero standings data, separate
  larger gap.
- No WebSockets, DO alarms, or any push-shaped mechanism anywhere in this
  work.

## Carry-forwards

None for this CC-CMD. The separately-filed BracketDO Rule A concern
remains open and is not resolved by this session's work — it's a
pre-existing, broader audit finding, not something this CC-CMD was
scoped to fix.
