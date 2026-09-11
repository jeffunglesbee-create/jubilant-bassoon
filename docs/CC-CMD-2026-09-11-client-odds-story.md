# Claude Code Command — Consume the relay's odds story in the client

**Date:** 2026-09-11
**Repo:** jubilant-bassoon
**Branch:** main — commit directly, do not create a feature branch or PR
**Type:** C (feature)

## CONTEXT — built relay-side, rendered nowhere

`field-relay-nba/src/context-assembler.js:462` calls
`computeOddsStory(row.opening_odds, ...)` and assembles an odds story onto the
context payload.

Verified at client HEAD `bf67bad`: `oddsStory` and `odds_story` appear **0 times**
in `src/legacy/field.js`. Nothing reads it.

This is the same shape as the standing `X-FIELD-Data-Age-Seconds` item — the
relay stamps provenance headers on 186/186 routes and exposes them cross-origin,
and the client reads none of the seven. Relay produces, client ignores.

## MEASURED 2026-09-11 — what the client would actually receive

Via `/context/date/{date}`, `games.regular`:

| date | rows | both prices | identical ML | different ML | opening only | no odds |
|---|---|---|---|---|---|---|
| 2026-09-10 | 22 | 5 | 3 | 2 | 0 | 17 |
| 2026-09-08 | 28 | 14 | 10 | 4 | 0 | 14 |
| 2026-09-06 | 42 | 19 | 14 | 5 | 7 | 16 |

Per sport on 2026-09-06: MLB 14/15, La Liga 3/4, Serie A 3/4, Ligue 1 3/3,
EPL 2/2, CFL 1/1, and **MLS 0/8, Bundesliga 0/2, CFB 0/3**.

**The dominant state is "no odds", and the second most common is "both prices,
unchanged."** Any rendering must be designed for those two first. A card that
only looks right when a line moved will be wrong most of the time.

## THE TRAP

`docs/ODDS-PROOF.md` in field-laboratory records that `closing_odds` was once the
same snapshot as `opening_odds` — captured ~22 seconds BEFORE it. A narration
layer built then would have rendered **"line unchanged" on every card**, which the
doc calls "worse than rendering nothing, because it invents a finding."

That specific defect is fixed — `captured_at` now separates by ~1h54m and real
movement is observable. But the lesson stands: **"observed twice, unchanged" and
"observed once" must not render the same way**, and neither may render as a
finding. `captured_at` is the only field that distinguishes them.

## TASK 0 — PROBE (read from HEAD, do not trust this document)

1. Fetch `/context/date/{date}` for two recent dates and record the ACTUAL
   `odds_story` field name, shape and values as the relay emits them. This
   document names the producing function, not the wire format — do not assume
   they match.
2. Confirm whether the client already renders any odds surface that would
   conflict or duplicate.
3. Re-run the coverage table for those dates and record real numbers.

## TASK 1 — Render, honouring the three real states

- **No odds** — dominant state. Render nothing. Not a dash, not "N/A", not an
  empty slot.
- **Observed once** — a price, no movement claim.
- **Observed twice** — movement reported as a factual shift in implied
  percentage points, or explicitly as unchanged. Never as a signal that a game
  became worth watching.

## TASK 2 — ADR-002 / RUWT boundary

`ODDS-PROOF.md`'s position is that a bookmaker's price is Rule F's permitted
category ("anything a neutral data vendor could plausibly publish"), rendering no
composite, threshold, tier or recommendation, and that implied probability is the
same class as win probability, which ADR-002 explicitly clears.

**That reasoning covers DISPLAY only — pull, not push.** This task is pull-only
by construction. Do not wire odds movement to any notification, badge-on-change,
or attention-drawing affordance: that is Rule A, which Rule F clearance does not
carry. If any part of the design drifts toward push, stop and report.

Also respect the no-receipts constraint from the 2026-07-09 UI spec: render the
named shift, not the computation that produced it.

## TASK 3 — Verification (inside this session)

Load the deployed app and capture what actually renders for each of the three
states, naming a real game id for each. If a state cannot be found on the day of
the run, say so rather than inferring it works.

## DONE CONDITION

- Real wire format from Task 0.1 recorded.
- All three states rendered and evidenced with named game ids, or explicitly
  reported as not observable on the day.
- Smoke green, real count recorded.
- Explicit statement that no push affordance was added.

## TASK 4 — Outbox manifest (last task)

`outbox/cc-session-2026-09-11-client-odds-story.md` with the Task 0 wire format,
the three-state evidence, the commit SHA, and the smoke count.
