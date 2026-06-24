# CC-CMD: JQ Game Context — Client Side
**Date:** 2026-06-24  
**Repo:** jubilant-bassoon  
**Depends on:** CC-CMD-2026-06-24-jq-game-context-relay.md in field-relay-nba MUST deploy first.  
**Rule 87:** Self-completing. All probes, edits, smoke, SW_VERSION, and outbox manifest run inside this session.

---

## CONTEXT

`generateJournalismViaRelay` sends `prompt`, `sport`, `briefType`, `max_tokens`,
`scoreThreshold` to the relay `/journalism/generate` endpoint — but never `game`
or `matchupNote`. The relay now reads these fields (after the relay CC-CMD ships),
but they'll always be null until the client sends them. Five call sites have game
objects in scope and need one-line additions.

J3 slate brief (L28624) correctly passes `game: null` — multi-sport, no single
game. Do NOT touch that call site.

---

## PROBE BLOCK — read before writing anything

1. Find `generateJournalismViaRelay` definition. Confirm `const body = {` block
   has `prompt, sport, briefType, max_tokens, scoreThreshold` but NOT `game` or
   `matchupNote`. Note the exact line number of the closing `};` of the body object.

2. Read each call site and confirm the variable in scope:
   - L26175 area: J2 Series — `g` is the game object
   - L28624 area: J3 slate — `game: null` correct, skip
   - L29034 area: MLB Brief — `g` is the game object  
   - L29352 area: Stakes Brief — `g` is the game object
   - L36615 area: Night Owl — `topGame` is the game object

3. For each call site, read the exact opts object passed to
   `generateJournalismViaRelay(prompt, { ... })` — note what's already there.

4. Confirm highest smoke assertion number (tail smoke.js, last assert call).

---

## TASK 1 — Add `game` + `matchupNote` to `generateJournalismViaRelay` body

Find the `const body = {` block inside `generateJournalismViaRelay`. It currently
ends with something like:
```javascript
      scoreThreshold: opts.scoreThreshold || 130,
    };
```

Add two fields before the closing `};`:
```javascript
      scoreThreshold: opts.scoreThreshold || 130,
      game:           opts.game           || null,
      matchupNote:    opts.matchupNote    || null,
    };
```

**Verification:** grep `generateJournalismViaRelay` block for `opts.game` — must
appear once. grep for `opts.matchupNote` — must appear once.

---

## TASK 2 — Add `game:` to each call site

For each call site below, add `game:` (and `matchupNote:` where a matchupNote
is available) to the opts object passed to `generateJournalismViaRelay`.

### 2a. J2 Series (~L26175)
Find:
```javascript
    const _viaRelay = await generateJournalismViaRelay(prompt, {
      sport: _sportHint, briefType: 'j2-series', max_tokens: 1000,
```
Add `game: g || null,` to the opts. Check if `g.matchupNote` or `g.note` exists —
if so, add `matchupNote: g.matchupNote || g.note || null,`. If not, omit.

### 2b. MLB Brief (~L29034)
Find:
```javascript
    const _viaRelay = await generateJournalismViaRelay(prompt, {
      sport: 'baseball', briefType: 'mlb-brief', max_tokens: 400,
```
Add `game: g || null,`. Check for matchupNote on `g`.

### 2c. Stakes Brief (~L29352)
Find:
```javascript
    const _viaRelay = await generateJournalismViaRelay(prompt, {
      sport: _sportHint, briefType: 'stakes-brief', max_tokens: 200,
```
Add `game: g || null,`. Check for matchupNote on `g`.

### 2d. Night Owl (~L36615)
Find:
```javascript
    const _viaRelay = await generateJournalismViaRelay(prompt, {
      sport: _sportHint,
      briefType: 'night-owl',
```
Add `game: topGame || null,`. Check if `topGame.matchupNote` exists — if so,
add `matchupNote: topGame.matchupNote || null,`.

**Skip L28624 (J3 slate)** — multi-sport brief, game: null is correct.

---

## TASK 3 — Smoke assertions

Add after the last existing assertion. Use next consecutive numbers:

```javascript
assert('A[N+1] — JQ game context: generateJournalismViaRelay sends opts.game',
  html.includes('game:           opts.game') || html.includes('game: opts.game'),
  'generateJournalismViaRelay must forward opts.game to relay body');

assert('A[N+2] — JQ game context: Night Owl passes topGame to relay',
  html.includes("briefType: 'night-owl'") && html.includes('game: topGame'),
  'Night Owl generateJournalismViaRelay call must include game: topGame');
```

---

## TASK 4 — Smoke + SW_VERSION + commit + push

1. `node smoke.js` — must pass 0 failures.
2. Bump SW_VERSION in `index.html` and `sw.js`.
3. Commit:
   ```
   fix: wire game context to relay journalism/generate — Night Owl, MLB, Stakes, J2 Series

   generateJournalismViaRelay now forwards opts.game + opts.matchupNote to the
   relay body. Four call sites updated to pass game object:
   - J2 Series (g)
   - MLB Brief (g)
   - Stakes Brief (g)
   - Night Owl (topGame)
   J3 slate correctly left without game (multi-sport).

   Unlocks Dims 7+10 (Context Anchoring + Matchup Depth, 0→55pts) on all
   relay-scored briefs. Combined with relay CC-CMD, removes 245/300 ceiling.
   ```
4. Push.

---

## TASK 5 — Outbox manifest

Write `outbox/cc-jq-game-context-client-2026-06-24.md` with:
- 5 edits listed (body function + 4 call sites)
- Which call site was skipped and why (J3 slate)
- Smoke count before → after
- SW_VERSION bump
- Commit hash
- Expected impact: Night Owl, MLB Brief, Stakes Brief, J2 Series now send full
  game context to relay — Dims 7+10 score up to 55pts on these brief types

Commit `[skip ci]` and push.

---

## DONE CONDITIONS

- [ ] `opts.game || null` in `generateJournalismViaRelay` body
- [ ] `game: topGame` at Night Owl call site
- [ ] `game: g` at MLB Brief, Stakes Brief, J2 Series call sites
- [ ] J3 slate (~L28624) unchanged
- [ ] Smoke passes 0 failures
- [ ] SW_VERSION bumped in both files
- [ ] Commit pushed
- [ ] Outbox manifest committed [skip ci]
