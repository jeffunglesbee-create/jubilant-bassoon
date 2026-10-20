# Claude Code Command — the missed-peak recap reads a shape /context/game never sends

**Date:** 2026-10-20
**Repo:** jubilant-bassoon
**Branch:** main. Commit directly; no feature branch, no PR.
**Confidence gate:** >= 95 before any commit
**Status:** FILED, not dispatched
**Filed by:** CC, from the adversarial review of
`docs/CC-CMD-2026-10-20-debrief-cache-outlives-archive-repair.md` (Rule 87.4:
found there, out of that document's scope).

---

## What was measured (2026-10-20)

`hydrateMissedRecaps` in `src/legacy/field.js` fetches `/context/game/{gameId}`
for up to `USER_STATE_HYDRATE_MAX` of the viewer's missed dramatic moments. It
then reads:

- `data?.briefs || data?.context?.briefs`
- `b?.type === 'game_recap'`
- `recap?.text || recap?.body`

The relay's body has none of those. Probed 2026-10-20 through the relay
self-probe, `GET /context/game/espn:401866408` gave 200 and 3105 bytes, with
these top-level keys: `ok, id, resolved, id_form, game, archive, series,
enrichment, bracketDelta`. The briefs are at `archive.gameBriefs[]`, and each
carries `brief_type` and `brief_text`.

So `briefs` is always `[]`, and `m.recapSnippet` is never set. The Night Owl
prompt's `[MISSED PEAKS]` line (`(m.recapSnippet ? ' — ' + m.recapSnippet : '')`)
therefore never carries a recap. Each user-state refresh still spends up to
`USER_STATE_HYDRATE_MAX` relay requests to learn nothing.

**Not measured:**
- whether any viewer's `dramaticMomentsMissed` is non-empty today;
- which id form `m.gameId` takes. That decides whether the relay can resolve it
  at all (see `classifyContextGameId` in field-relay-nba).

## TASK 0 — premises, one command each (Rule 100)

1. The shape, again: probe `/context/game/<an id taken from a real
   dramaticMomentsMissed entry>` and record the top-level keys and
   `archive.gameBriefs[].brief_type`.
2. The id form: read the relay's UserDO writer of `dramaticMomentsMissed` and
   record what `gameId` holds (espn:, a slate g-number, or an archive id).
3. The consumer: `grep -n "recapSnippet" src/legacy/field.js`. Every reader,
   and what it renders or sends.

## TASK 1 — read the shape the relay sends (Rule 60: the relay owns it)

- Read `data?.archive?.gameBriefs`, `brief_type === 'game_recap'` and
  `brief_text`. No fallback chain (Rule 76): the old keys are removed, not kept
  beside the new ones.
- If TASK 0.2 shows ids the relay cannot resolve, the request is not sent for
  them. That is a stated absence, not a request that is known to fail.

Proof: a test that feeds the probed body through `hydrateMissedRecaps` and
asserts the snippet. Red at HEAD, green after, with a Rule 90 mutation that
restores the old key.

## Done condition (Rule 90 artifacts)

1. TASK 0's three outputs committed.
2. The test red before and green after, with its mutation, in a committed log.
3. One green deploy-gate run.

## FORBIDDEN

- No relay change (the relay's shape is the contract).
- No change to the Night Owl prompt text beyond the snippet it already reserves.
