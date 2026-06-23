# CC-CMD — Night Owl archiveBrief: pass sourceId as game_id

**Repo:** jubilant-bassoon
**Date:** 2026-06-23
**Scope:** One character change in index.html — archiveBrief night_owl game_id

---

## BACKGROUND (verified from source)

The night_owl archiveBrief call at L38254 currently passes:
  `topGame._id || topGame.id`
This produces FIELD internal IDs like "mlb_arizonadiamo_minnesotatwi".

The relay's /archive/brief D1 lookup cannot match this format against
`regular_season_games.id` (format: "MLB_2026-06-20_cubs_bluejays") OR
`regular_season_games.espn_event_id` (format: "401696473").

Fix: pass `topGame.sourceId || topGame._id || topGame.id`.
`topGame.sourceId` is the ESPN numeric event ID (verified at L36174:
`_mlbBoxscoreCache['mlb_box_'+topGame.sourceId]`). This matches
`regular_season_games.espn_event_id` which the relay's new espn_event_id
fallback lookup will find.

**Verified:** archiveBrief night_owl call at L38254 (confirmed from source)
**Verified:** `topGame.sourceId` = ESPN event ID at L36174, L36421

---

## PRE-BUILD PROBE

```bash
grep -n "archiveBrief.*night_owl" index.html
# Should show L38254 with topGame._id||topGame.id
```

---

## TASK 1 — Change game_id in night_owl archiveBrief call

Find L38254 (verify from probe). The exact string to replace:

```
topGame&&(topGame._id||topGame.id)||null,claudeText,null
```

Replace with:

```
topGame&&(topGame.sourceId||topGame._id||topGame.id)||null,claudeText,null
```

**This is a one-word change. Do not modify anything else on this line.**

---

## TASK 2 — Smoke

```bash
node smoke.js index.html
# Must pass 726/0 (no new smoke assertions needed — runtime change only)
```

---

## TASK 3 — SW_VERSION bump + deploy

Bump SW_VERSION in index.html and sw.js (Rule 4). Single commit.

---

## TASK 4 — Outbox manifest

Write `outbox/cc-nightowl-gameid-fix-client-2026-06-23.md`:
- Commit + deploy run ID
- Smoke pass count
- Confirm: topGame.sourceId now passed as first priority for game_id

---

## SCOPE
- Change one field in archiveBrief call at L38254 in index.html
- SW_VERSION bump in index.html + sw.js
- Single commit
- DO NOT touch any other function or line
