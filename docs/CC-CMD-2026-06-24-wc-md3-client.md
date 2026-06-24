# CC-CMD: WC MD3 Client Fixes — Scenarios Cache + Elimination Threshold
**Date:** 2026-06-24  
**Repo:** jubilant-bassoon  
**Rule 87:** Self-completing. All probes, edits, smoke, SW_VERSION, and outbox manifest run inside this session.
**DEADLINE:** Before 3 PM ET (19:00 UTC).

---

## CONTEXT

Two client gaps that affect tonight's MD3 journalism:

**Gap 1 — `_wcScenariosCache` not pre-populated.**
The night owl prompt injects `[WC ADVANCEMENT]` context from
`window._wcScenariosCache`. That cache only exists if the user opened the WC
Groups tab. If not, the night owl prompt has zero advancement context — no
"Switzerland qualified" or "Haiti eliminated" signal reaches the AI. With MD3
games being group-deciding, this is the highest-value fix.

**Gap 2 — `alwaysEliminated` ignores best3rd path.**
`alwaysEliminated` is true only when a team can't finish 3rd in their group.
A team like Haiti (0 pts, -4 GD) can still finish 3rd in a single scenario,
so `alwaysEliminated = false`. The night owl won't label Haiti "ELIMINATED"
even though their combined P(advance) = ~0%. Fix: replace binary flag with
a probability threshold check using `_wcGetPAdv`.

---

## PROBE BLOCK

### Probe 1 — find schedule WC data fetch
Search for where the main schedule fetches WC standings and results for the
schedule build (not the WC tab — the main schedule load). Look for a function
that calls `/wc/standings` and `/wc/results` outside of `renderWCGroups`.

This is where we'll add the `_wcScenariosCache` write. Likely near the
function that builds `buildTodaySchedule` or the WC game enrichment that
sets `g._wcGroup` and `g._trapTeams`.

Confirm: is `_wcComputeAllScenarios` in scope at this location?

### Probe 2 — find the night owl `alwaysEliminated` block
Search for `_ptHome.alwaysEliminated` and `_ptAway.alwaysEliminated` in the
night owl prompt section (~L36390-36430). Read the exact condition and what
text it injects.

### Probe 3 — confirm `_wcGetPAdv` is accessible at that location
`_wcGetPAdv` is defined as a standalone function. Confirm it's in scope at
the night owl prompt block.

---

## TASK 1 — Pre-populate `_wcScenariosCache` during schedule build

Find the function (likely inside `loadWCScheduleData` or the schedule fetch
that calls `/wc/standings` and `/wc/results`) that already has `standings`
and `matchResults` in scope. After those are fetched and before the function
returns, add:

```javascript
  // Pre-populate scenarios cache so night owl advancement context fires
  // without requiring the user to have opened the WC Groups tab.
  // Runs on schedule load — standings + matchResults already fetched above.
  try {
    if (typeof _wcComputeAllScenarios === 'function' && standings
        && Object.keys(standings).length > 0) {
      window._wcScenariosCache = _wcComputeAllScenarios(
        standings, matchResults || [], null,
        window._wcOddsProbsCache || null,
        null
      );
    }
  } catch (_) { /* non-blocking */ }
```

**Note for CC:** read the actual variable names for standings and matchResults
at the injection point — do NOT guess. If the local variable is `grpStandings`
or `wc_standings`, use that exact name.

**Verification:** grep `index.html` for `_wcScenariosCache =` — must appear
at least twice (here + `renderWCGroups`).

---

## TASK 2 — Replace `alwaysEliminated` binary check with probability threshold

Find the night owl block that reads:
```javascript
            if (_ptHome) {
              if (_ptHome.alwaysQualify) _advLines.push(`${topGame.home}: QUALIFIED for Round of 32`);
              else if (_ptHome.alwaysEliminated) _advLines.push(`${topGame.home}: ELIMINATED from tournament`);
            }
            if (_ptAway) {
              if (_ptAway.alwaysQualify) _advLines.push(`${topGame.away}: QUALIFIED for Round of 32`);
              else if (_ptAway.alwaysEliminated) _advLines.push(`${topGame.away}: ELIMINATED from tournament`);
            }
```

Replace with:
```javascript
            if (_ptHome) {
              const _pAdvHome = _wcGetPAdv?.(_cachedScenarios, _grp, topGame.home) ?? null;
              if (_ptHome.alwaysQualify || (_pAdvHome !== null && _pAdvHome > 0.98))
                _advLines.push(`${topGame.home}: QUALIFIED for Round of 32`);
              else if (_ptHome.alwaysEliminated || (_pAdvHome !== null && _pAdvHome < 0.02))
                _advLines.push(`${topGame.home}: ELIMINATED from tournament`);
              else if (_pAdvHome !== null)
                _advLines.push(`${topGame.home}: P(advance) ${Math.round(_pAdvHome * 100)}%`);
            }
            if (_ptAway) {
              const _pAdvAway = _wcGetPAdv?.(_cachedScenarios, _grp, topGame.away) ?? null;
              if (_ptAway.alwaysQualify || (_pAdvAway !== null && _pAdvAway > 0.98))
                _advLines.push(`${topGame.away}: QUALIFIED for Round of 32`);
              else if (_ptAway.alwaysEliminated || (_pAdvAway !== null && _pAdvAway < 0.02))
                _advLines.push(`${topGame.away}: ELIMINATED from tournament`);
              else if (_pAdvAway !== null)
                _advLines.push(`${topGame.away}: P(advance) ${Math.round(_pAdvAway * 100)}%`);
            }
```

This adds a third case: teams between 2%-98% get a probability label
("Morocco: P(advance) 73%") rather than silence. This also fires for
non-binary games like Scotland tonight (needs Brazil slip + own win).

**Verification:** grep `index.html` for `alwaysEliminated` — the two night
owl uses must now be preceded by a `_pAdv` check. The function definition
`alwaysEliminated:` in `wcSummarizePerTeam` is unchanged.

---

## TASK 3 — Smoke + SW_VERSION + commit

1. `node smoke.js` — 0 failures.
2. Bump SW_VERSION in `index.html` and `sw.js`.
3. Commit:
   ```
   feat: WC MD3 client fixes — scenarios cache pre-pop + advancement threshold

   - Pre-populate _wcScenariosCache during schedule build so night owl
     advancement context fires without WC tab being opened
   - Replace binary alwaysEliminated/alwaysQualify with P(advance) threshold:
     >98% = QUALIFIED, <2% = ELIMINATED, else P(advance) % label
     Fixes: Haiti would not be labeled eliminated despite ~0% P(advance)
   ```
4. Push.

---

## TASK 4 — Outbox manifest

Write `outbox/cc-wc-md3-client-2026-06-24.md`. Commit [skip ci] and push.

---

## DONE CONDITIONS

- [ ] `window._wcScenariosCache =` assigned in schedule build function
- [ ] Night owl `alwaysEliminated` check replaced with `_pAdv < 0.02` threshold
- [ ] Night owl `alwaysQualify` check replaced with `_pAdv > 0.98` threshold
- [ ] Third `_pAdv` probability label case added
- [ ] Smoke 0 failures
- [ ] SW_VERSION bumped
- [ ] Deploy green before 19:00 UTC
- [ ] Outbox manifest committed [skip ci]
