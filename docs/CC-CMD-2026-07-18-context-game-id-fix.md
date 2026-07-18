# CC-CMD — Fix /context/game ID + preGameBrief field name

**Date:** 2026-07-18
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly. No PRs.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }; git log --oneline -5

---

## CONTEXT

Two linked bugs prevent `buildFieldWasWatching` (Debrief card Layer 2) from
ever rendering. Both confirmed by static analysis — no live probe needed.

**Bug A — volatile ID sent to relay**

`injectDebriefCards` fetches `/context/game/${gameId}` where `gameId =
cardEl.dataset.gameid = rawGame._id` — the volatile per-load `g{n}` ID
(confirmed: `src/legacy/field.js` `injectDebriefCards`, line ~2510). The
relay's `findGame(env, id)` queries `WHERE id = ?` against `regular_season_games`
and `postseason_games`. Those table `id` columns hold the api-sports.io game
ID (`fg.id`), which is `rawGame._gameId`. `g1`, `g2`, etc. never match —
`findGame` always returns null, and all debrief context (drama_peak, odds,
series, briefs) is null for every card.

**Bug B — wrong field name read for preGameBrief**

`buildEnrichedGame` reads `_ctx?.archive?.gameBriefs?.[0]?.text` (field.js
line ~2405). The relay's `findBriefs` SELECT returns `brief_text` (the D1
column name). `gameBriefs[0].text` is always undefined — the correct field
is `gameBriefs[0].brief_text`. (Rule 60: relay owns the field names; client
reads as-is.)

---

## PRE-BUILD PROBE BLOCK

```bash
git log --oneline -5

# Confirm current volatile ID is sent (expect: gameId = cardEl.dataset.gameid, NOT rawGame._gameId)
grep -n "context/game/\${encodeURIComponent" src/legacy/field.js

# Confirm _gameId exists on rawGame (expect: _gameId: fg.id in V2 path)
grep -n "_gameId" src/legacy/field.js | grep "fg\.\|_gameId:" | head -5

# Confirm the wrong field name is read
grep -n "gameBriefs\[0\]\." src/legacy/field.js

# Confirm relay field name (expect: brief_text)
grep -n "brief_text" src/legacy/field.js | grep gameBriefs
```

---

## TASK 1 — Fix volatile ID: send rawGame._gameId to /context/game/

In `src/legacy/field.js`, in `injectDebriefCards` (the async function that
queries `.game-card[data-gameid]:not([data-debrief-injected])`):

After `const gameId = cardEl.dataset.gameid;` and after `rawGame` is found
in `allData.sports`, derive the stable context ID:

```javascript
const contextId = rawGame._gameId || gameId;
```

Then use `contextId` in the fetch:

```javascript
const r = await fetch(`${base}/context/game/${encodeURIComponent(contextId)}`, ...)
```

And in the Cache API key:

```javascript
const _debriefCacheKey = `https://field-local/debrief/${encodeURIComponent(contextId)}`;
```

And in the `_debriefContextCache`:

```javascript
let ctx = _debriefContextCache.get(contextId);
// ...
_debriefContextCache.set(contextId, ctx);
```

Do NOT change `cardEl.dataset.gameid` or any other use of `gameId`.
Scope: only `injectDebriefCards`. No other function.

## TASK 2 — Fix field name: read .brief_text not .text

In `buildEnrichedGame` (the function that constructs the debrief sub-object),
change the preGameBrief line:

```javascript
// FROM:
preGameBrief: (_ctx?.archive?.gameBriefs?.[0]?.text) ?? (_src.journalismBrief ?? null),

// TO:
preGameBrief: (_ctx?.archive?.gameBriefs?.[0]?.brief_text) ?? (_src.journalismBrief ?? null),
```

One character change. Do NOT modify any other field read.

## TASK 3 — Literal verification

```bash
# Confirm contextId derivation is present
grep -n "contextId" src/legacy/field.js

# Confirm fetch uses contextId, not gameId
grep -n "context/game/\${encodeURIComponent" src/legacy/field.js

# Confirm field name fix
grep -n "gameBriefs\[0\]\." src/legacy/field.js

# Confirm smoke passes
node smoke.js index.html 2>&1 | tail -3
```

Paste real output. `gameBriefs[0].text` must not appear. `contextId` must
appear in injectDebriefCards. `brief_text` must appear in preGameBrief line.

## TASK 4 — Pipeline

sync-source → smoke (958/0 required) → commit → push → CI triggered.

Commit message: `fix: context/game stable ID + preGameBrief field name`

---

## DONE CONDITION

```bash
grep -n "contextId\|gameBriefs\[0\]" src/legacy/field.js
```

Expected output:
- Line with `const contextId = rawGame._gameId || gameId;`
- Line with `gameBriefs[0].brief_text` (NOT `gameBriefs[0].text`)

Smoke: 958/0. CI green.

**Confidence scoring:**
- TASK 1 (40 pts): correct derivation of contextId after rawGame is found; used in fetch, cache key, and Map
- TASK 2 (30 pts): single field name fix, no other changes
- TASK 3 (15 pts): literal output confirms both fixes
- TASK 4 (15 pts): clean pipeline

Do not commit unless confidence >= 95.
