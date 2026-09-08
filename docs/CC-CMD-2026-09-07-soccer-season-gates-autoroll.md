# Claude Code Command — Fix 8 stuck European soccer season gates (auto-rolling)

**Date:** 2026-09-07
**Repo:** jubilant-bassoon
**Branch:** main — commit directly, do not create a feature branch or PR
**Type:** B (bug fix)
**Severity:** Live product defect. EPL has been playing since 2026-08-21 and renders no cards.

## CONTEXT — what is actually broken

`src/legacy/field.js` (and the mirrored block in `index.html`) declares
`FIELD_V2_SOURCES` at approximately line 15043. Eight European competitions are
hardcoded `false`:

```js
epl: false, // off-season
eflchamp: false, eflone: false, efltwo: false,   // EFL — season ended May 25 2026
laliga: false, seriea: false, bundesliga: false, ligue1: false,
```

The comment directly above the block reads: *"European leagues ended ≤2026-05-26 — set true next season."*

Nobody set them true. All eight seasons have started:

| Competition | 2026-27 first matchday (aggregator sources conflict; see note) |
|---|---|
| EFL Championship / L1 / L2 | 14 Aug 2026 |
| La Liga | 14–16 Aug 2026 (sources disagree) |
| Premier League | 21 Aug 2026 (Arsenal v Coventry, primary source: premierleague.com) |
| Ligue 1 | 22–23 Aug 2026 (sources disagree) |
| Serie A | 23 Aug 2026 |
| Bundesliga | 28 Aug 2026 (primary source: bundesliga.com) |

Verified live on 2026-09-07: the deployed app's filter bar reads
`ALL (68) · FREE · MLB (11) · AFL (1) · TENNIS (40) · COLLEGE FOOTBALL (1) · NFL (1) · MLS (14)`.
No European soccer chip is present. The journalism layer *is* writing accurate
copy about these leagues ("Barcelona's flawless start in La Liga", "Mainz
delivered a masterclass in the Bundesliga"), which confirms the data exists
upstream and the gate is what blocks card creation.

Note `bundesliga: false` here even though `ger.1` is present in `SOCCER_LEAGUES`
and the Bundesliga broadcast chain shipped in August. The ESPN card path was
wired while the V2 source stayed gated off. Both paths must be consistent.

## WHY NOT JUST FLIP THEM TO `true`

That reproduces the defect next June. Same for copying the date-gate pattern
used by `wc26` / `nfl` / `cfb` in the same block — those hardcode an absolute
year and will need a human to bump them every July.

Per the standing hardcoding rule: hardcode STABLE data, never values that change
on a regular cycle. Test: "will this be wrong next week?" A boolean fails. An
absolute-year date gate fails annually. A month-window helper does not.

## TASK 0 — PROBE (read from HEAD, do not trust this document)

1. Read the real current `FIELD_V2_SOURCES` block in `src/legacy/field.js`.
   Record the exact line number and the exact current value of all eight keys.
2. Confirm whether `index.html` carries a duplicate of the same block. If it
   does, both must be changed identically in the same commit.
3. Confirm no helper named `_euSeasonActive` already exists.
4. Confirm the relay actually serves these sports before enabling them —
   for each of `epl, laliga, seriea, bundesliga, ligue1, eflchamp, eflone, efltwo`:
   `GET https://field-relay-nba.jeffunglesbee.workers.dev/v2/games?sport={key}`
   Record the real HTTP status and game count for each. If a sport returns a
   real error or is unimplemented relay-side, DO NOT enable it — report it in
   the outbox as a separate finding and leave that one key alone.

## TASK 1 — Add the auto-rolling helper

Add immediately above `FIELD_V2_SOURCES`:

```js
// European club seasons run Aug -> May every year. A boolean needs a human to
// remember; an absolute-year date gate needs a human every July. This needs
// neither. Opening a few weeks early is harmless (the relay simply returns no
// games); opening late is a live product outage, which is what happened in
// Aug 2026. Month-based so it auto-rolls every season.
function _euSeasonActive(){
  const m = new Date().getUTCMonth(); // 0=Jan
  return m >= 7 || m <= 5;            // Aug(7)..Dec, Jan..Jun(5)
}
```

## TASK 2 — Apply to all eight keys

Replace the eight `false` literals with `_euSeasonActive()`, in BOTH files if
Task 0.2 found a duplicate. Remove the now-false "off-season" / "season ended"
trailing comments and the stale "set true next season" comment above the block,
replacing it with a one-line note that these auto-roll.

Do NOT touch `ucl`/`europa`/`conference` (already `true`) or the `wc26`/`nfl`/
`cfb` date gates — out of scope.

## TASK 3 — Verification (must run inside this session, not deferred)

1. `node --check` the extracted script block before committing (per the standing
   large-file rule — `index.html` is 2.6MB; Python `str.replace()` is fragile).
2. Run the full smoke suite. Record the real pass/fail count.
3. After deploy completes, load the deployed app and capture the real filter-bar
   chip list. EPL/La Liga/Serie A/Ligue 1/Bundesliga fixtures exist on the
   weekend of 2026-09-12–14; note that 2026-09-07 falls in an international
   break, so a same-day check may legitimately show no chips. If run during the
   break, verify instead via `/v2/games?sport=epl` returning games for a past
   matchday and confirm the client's gate now evaluates true (e.g. log
   `FIELD_V2_SOURCES.epl` in a live browser session with `FIELD_DEBUG=true`).

## DONE CONDITION (verifiable probe output, not a self-report)

- `_euSeasonActive` exists in every file that declares `FIELD_V2_SOURCES`.
- All eight keys evaluate `true` as of 2026-09-07.
- Smoke green, real count recorded.
- Deployed-app evidence recorded per Task 3.3, including which method was used
  and why.

## TASK 4 — Outbox manifest (last task)

Write `outbox/cc-session-2026-09-07-soccer-season-gates-autoroll.md` with the
real Task 0 probe table (all eight relay statuses and counts), the commit SHA,
the real smoke count, and the Task 3.3 evidence. State explicitly which of the
eight were enabled and which (if any) were left alone because the relay does not
serve them.
