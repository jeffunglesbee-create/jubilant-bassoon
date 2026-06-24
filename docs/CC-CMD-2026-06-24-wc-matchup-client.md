# CC-CMD: WC Matchup Context — Client KV Write
**Date:** 2026-06-24  
**Repo:** jubilant-bassoon (client side)  
**Depends on:** CC-CMD-2026-06-24-wc-matchup-relay.md MUST deploy first.
**Rule 87:** Self-completing.

---

## CONTEXT

After the relay CC-CMD ships, `POST /wc/matchup/cache` is live. The client
needs to POST matchupNotes for upcoming WC games so `writeWCResult` can
read them when those games go final.

Injection point: `_fetchWCTournBriefForSchedule` — already runs on schedule
load, has `standings` + `matchResults` resolved, and `wc26Raw` is global
in scope. Add a fire-and-forget POST loop after the scenarios cache is
populated (the block added in the WC MD3 session).

---

## PROBE BLOCK

1. Find the `_fetchWCTournBriefForSchedule` Promise.all `.then(...)` block.
   Locate the scenarios cache write (the block added Jun 24 — looks for
   `_wcComputeAllScenarios`). The matchupNote POST goes immediately after it.

2. Confirm `wc26Raw` is accessible at this location (it's a global array).

3. Confirm `V2_RELAY_BASE` or `relay` variable is in scope (relay URL).
   It's declared at the top of `_fetchWCTournBriefForSchedule`:
   `const relay = typeof V2_RELAY_BASE !== 'undefined' ? V2_RELAY_BASE : ...`

4. Confirm highest smoke assertion number (tail smoke.js) — currently A731.

---

## TASK 1 — POST matchupNotes for upcoming WC games

In `_fetchWCTournBriefForSchedule`, find the closing `} catch (_) { }` of the
scenarios cache block. Immediately after it, add:

```javascript
    // POST matchupNotes for upcoming WC games so relay's writeWCResult
    // can inject PRE-GAME CONTEXT into journalism prompts.
    // Fires once per schedule load — fire-and-forget, never blocks.
    try {
      const nowMs = Date.now();
      const upcoming = (typeof wc26Raw !== 'undefined' && Array.isArray(wc26Raw))
        ? wc26Raw.filter(g =>
            g.matchupNote &&
            g.home && g.away &&
            !g.homeScore && !g.awayScore &&   // not yet finished
            new Date(g.start_time).getTime() > nowMs - 4 * 3600 * 1000 &&  // started ≤4h ago
            new Date(g.start_time).getTime() < nowMs + 7 * 24 * 3600 * 1000 // within 7 days
          )
        : [];
      for (const g of upcoming.slice(0, 20)) {  // cap at 20 POSTs
        fetch(relay + '/wc/matchup/cache', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            home: g.home,
            away: g.away,
            note: g.matchupNote,
          }),
        }).catch(() => {});  // fire-and-forget
      }
    } catch (_) { /* non-blocking */ }
```

**Filter logic:**
- `g.matchupNote` — only games that have pre-game context written
- `!g.homeScore && !g.awayScore` — not finished (no scores set yet)
- `start_time > nowMs - 4h` — include games that started up to 4h ago (live)
- `start_time < nowMs + 7d` — within next 7 days only

**Note for CC:** `homeScore` / `awayScore` might be named differently in
`wc26Raw` entries (check confirmed/completed games — they use `homeScore`,
`awayScore` as the field names on confirmed result entries). Read a few
`wc26Raw` completed entries to verify the field name before using it.
If scores are stored differently, adjust the filter condition.

---

## TASK 2 — Smoke assertion

```javascript
assert('A732 — WC matchup: client POSTs matchupNote to /wc/matchup/cache on schedule load',
  html.includes('/wc/matchup/cache') && html.includes('g.matchupNote'),
  'client must POST wc26Raw matchupNotes to relay KV');
```

---

## TASK 3 — Smoke + SW_VERSION + commit

1. `node smoke.js` — 0 failures (A732 passes).
2. Bump SW_VERSION in `index.html` and `sw.js`.
3. Commit:
   ```
   feat: client POSTs wc26Raw matchupNotes to relay on schedule load

   _fetchWCTournBriefForSchedule now fires POST /wc/matchup/cache for each
   upcoming WC game with a matchupNote (cap: 20 games, 7-day window).
   Relay's writeWCResult reads these from FIELD_JOURNALISM KV and injects
   as PRE-GAME CONTEXT in the journalism prompt.
   ```
4. Push.

---

## TASK 4 — Outbox manifest. Commit [skip ci] and push.

---

## DONE CONDITIONS

- [ ] `upcoming` filter in `_fetchWCTournBriefForSchedule` after scenarios cache block
- [ ] POSTs `/wc/matchup/cache` for each upcoming game with matchupNote
- [ ] Fire-and-forget (`.catch(() => {})`) — never blocks schedule load
- [ ] Smoke A732 passes, 0 failures total
- [ ] SW_VERSION bumped in both files
- [ ] Deploy gate green
- [ ] Outbox manifest committed [skip ci]
