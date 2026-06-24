# CC-CMD: Night Owl WC Drama Fix + preGameScore Fallback
**Date:** 2026-06-24  
**Repo:** jubilant-bassoon  
**Rule 87:** Self-completing.  
**DEADLINE:** Before 19:00 UTC (3 PM ET group B kickoff).

---

## CONTEXT

The night owl `topGame` is selected by drama score (`getDramaSustained` → 
`dramaPeak` → user affinity). WC games DO accumulate drama in the poll.
BUT: sport-family checks use `sp.includes('soccer')` — WC games have
`sp = 'wc26'` or `'fifa world cup 2026'`, so they're missed.

**Gap 1 — `sp.includes('soccer')` misses WC at two drama locations:**
- Late-game detection (`isLate && isClose` boost) → L32918
- `isFinalPeriod` for lead-change burst → L34262 (soccer not in the list;
  WC → `isFinalPeriod = false` → lead change +15 burst never fires)

Effect: a 1-0 WC game in the 88th scores ~55 drama instead of ~70-75.

**Gap 2 — `topGame` sort has no stake fallback:**
If drama is absent or equal, the sort falls to user affinity. No `preGameScore`
fallback exists. An MLB game with marginally more sustained drama beats a
WC group-deciding game with equal stakes but slightly less drama.

Fix: add `preGameScore` as the final tiebreaker in the `topGame` sort.
WC group stage = tierBoost 40. Regular MLB = 0. Stakes win.

---

## PROBE BLOCK

1. Find the late-game detection function (~L32913–32920). Read the
   ternary chain:
   ```
   (sp.includes('soccer') || sp.includes('epl')) ? period === 2 : false
   ```
   Confirm `'wc26'` is NOT matched here. Note exact line.

2. Find the drama garbage-time / lead-change `isFinalPeriod` check at
   ~L34258–34266. Confirm soccer is absent from the ternary (it ends
   at `baseball ? period >= 9 : false`). Note exact lines.

3. Find the `topGame` sort at ~L38254. Read the full sort function.
   Confirm the sort is:
   `bSustained - aSustained` → `peakDelta` → `_affScore(b) - _affScore(a)`
   No `preGameScore` fallback after affinity.

4. Confirm `preGameScore` is in scope at the topGame sort location
   (it's a global function — should be).

5. Confirm highest smoke assertion number (tail smoke.js) — currently A732.

---

## TASK 1 — Add WC to late-game detection (Gap 1a)

Find the ternary that reads:
```javascript
      (sp.includes('soccer') || sp.includes('epl'))       ? period === 2 :
```
(it's part of an `isFinalPeriod` or `isLate` ternary chain with basketball/
hockey/football/soccer)

Replace with:
```javascript
      (sp.includes('soccer') || sp.includes('epl') || sp.includes('wc26') || sp.includes('world cup') || sp.includes('fifa')) ? period === 2 :
```

**Verification:** grep for the replaced line — must contain `sp.includes('wc26')`.

---

## TASK 2 — Add WC/soccer to lead-change isFinalPeriod (Gap 1b)

Find the drama `isFinalPeriod` ternary that ends with:
```javascript
      (sp.includes('baseball')||sp.includes('mlb'))     ? period >= 9 : false
    );
    if (isFinalPeriod && margin > 24) score = Math.min(score, 20);
```

Replace the ternary ending with:
```javascript
      (sp.includes('baseball')||sp.includes('mlb'))     ? period >= 9 :
      (sp.includes('soccer')||sp.includes('epl')||sp.includes('wc26')||sp.includes('world cup')||sp.includes('fifa')) ? period === 2 : false
    );
    if (isFinalPeriod && margin > 24) score = Math.min(score, 20);
```

This gives soccer/WC the same `period === 2` final-period detection as the
late-game function, enabling lead-change burst (+15) to fire in the 2nd half.

**Verification:** grep for the new soccer line in this ternary — must appear.

---

## TASK 3 — Add `preGameScore` fallback to `topGame` sort (Gap 2)

Find the `topGame` sort in `renderNightOwlRecap`:
```javascript
  const topGame=finals.slice().sort((a,b)=>{\n    const aSustained=...
    ...
    return _affScore(b)-_affScore(a);
  })[0];
```

The sort currently has 3 levels. Add a 4th as the final fallback:

Find the innermost `return _affScore(b)-_affScore(a);` line. Replace with:
```javascript
      const affinityDelta = _affScore(b) - _affScore(a);
      if (affinityDelta !== 0) return affinityDelta;
      // Final fallback: preGameScore (stake tier) so WC group-deciding
      // games (tierBoost=40) beat regular MLB (tierBoost=0) when drama
      // is identical. Ensures night owl covers tonight's stakes.
      return (typeof preGameScore === 'function')
        ? preGameScore(b) - preGameScore(a) : 0;
```

**Verification:** grep `topGame` sort block for `preGameScore` — must appear once.

---

## TASK 4 — Smoke assertions

```javascript
assert('A733 — night owl: WC sport strings added to soccer isFinalPeriod check',
  html.includes("sp.includes('wc26')") && html.includes('period === 2'),
  'drama isFinalPeriod must include wc26 in soccer family');

assert('A734 — night owl: preGameScore fallback in topGame sort',
  (() => {
    const idx = html.indexOf('const topGame=finals');
    const chunk = html.slice(idx, idx + 1500);
    return chunk.includes('preGameScore');
  })(),
  'topGame sort must fall back to preGameScore after affinity');
```

---

## TASK 5 — Smoke + SW_VERSION + commit

1. `node smoke.js` — 0 failures.
2. Bump SW_VERSION in `index.html` and `sw.js`.
3. Commit:
   ```
   fix: night owl WC drama + topGame stake fallback

   Gap 1: WC sport strings ('wc26', 'world cup', 'fifa') added to soccer
   family in isFinalPeriod checks. Lead-change burst (+15) now fires for
   WC goals in the 2nd half. Late-game closeness detection now covers WC.

   Gap 2: preGameScore added as final topGame sort fallback after affinity.
   WC group stage tierBoost=40 beats regular MLB=0 when drama is equal.
   Ensures MD3 group finales win night owl selection vs blowout MLB games.
   ```
4. Push.

---

## DONE CONDITIONS

- [ ] `sp.includes('wc26')` in late-game `isFinalPeriod` ternary (Task 1)
- [ ] `sp.includes('wc26')` in drama `isFinalPeriod` ternary (Task 2)
- [ ] `preGameScore` in `topGame` sort after affinity (Task 3)
- [ ] Smoke A733-A734, 0 failures
- [ ] SW_VERSION bumped
- [ ] Deploy gate green before 19:00 UTC
- [ ] Outbox manifest committed [skip ci]
