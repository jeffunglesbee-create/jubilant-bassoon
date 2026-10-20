# Claude Code Command — the debrief cache serves a game's context after the archive has corrected it

**Date:** 2026-10-20
**Repo:** jubilant-bassoon
**Branch:** main. Commit directly; no feature branch, no PR.
**Confidence gate:** >= 95 before any commit
**Status:** FILED, not dispatched
**Filed by:** CC, from the adversarial review of
field-relay-nba `docs/CC-CMD-2026-10-19-odds-history-american-converted-twice.md`
(Rule 87.4: found there, out of that repo's scope).

---

## What was measured (2026-10-20)

**The relay repaired 422 odds blobs in D1; a browser can keep rendering the old
ones.**
- In D1, the 211 games the relay's targeted odds fill priced carried both
  moneylines converted twice from 2026-09-16/19 until the repair. For example,
  `CFB_2026-08-29_emichigan_sacramentost` held `{home: null, away: 27400}` where
  the truth is -345 / +275.
- `injectDebriefCards` (`src/legacy/field.js` ~2663-2690) reads the
  `field-debriefs` Cache API first. On a hit it uses that payload, with no age
  check, and never asks the relay:
  `const _hit = await _dc.match(_debriefCacheKey); if (_hit) { ctx = await _hit.json(); ... }`.
- The only eviction is in `sw.js` ~41-51, inside the `activate` handler, and
  only for entries whose `X-Cache-Time` is more than 7 days old.
- A reviewer reproduced the render with `src/debrief/index.ts` bundled by
  esbuild: the damaged blob gives `"E Michigan null · Sacramento St +27400"`
  (chip CHALK/QUIET), and the repaired one gives
  `"E Michigan -345 · Sacramento St +275"`. A fake persistent Cache API kept
  serving the damaged payload across a simulated page reload after the
  "D1" value changed (network fetches total: 1).

**The bound, as it stands:** an entry is served until it is more than 7 days old
AND a new service worker has activated after that. SW_VERSION changes several
times a day, so in practice about 7 days after the entry was cached. The relay's
own caches clear within minutes (KV `ctx:{id}` TTL 300 s for finals).

**Not measured:** whether any real browser holds such an entry. That needs
someone to have opened one of the 9 affected dates (2026-05-09, 05-24, 08-08,
08-25, 08-29, 09-03, 09-05, 09-12, 09-13) since 2026-09-16.

**The general defect is not this incident.** Any correction the archive makes
(score fix, odds repair, date re-key) reaches a browser that has the game cached
only by age-out. The odds repair is the first measured case.

## TASK 0 — premises, one command each (Rule 100)

1. `grep -n "field-debriefs" src/legacy/field.js sw.js index.html`. Every
   reader and writer of the cache, and nothing else evicts it.
2. Every other client Cache API or localStorage store of relay **archive**
   payloads, with its eviction rule: `grep -n "caches.open\|localStorage.setItem" src/legacy/field.js`.
3. Does `/context/game/{id}` return a field that changes when the archive row
   changes (an ETag, `updated_at`, or a digest)? Probe one id through the relay
   self-probe and record the headers.

## TASK 1 — make a corrected archive row reach the browser (OWNER DECISION)

- (a) An age check on read: a hit older than N hours is refetched. N comes from
  TASK 0 (finals rarely change, so hours, not minutes).
- (b) Revalidate on read: use the cached payload to render immediately, then
  fetch in the background and re-render if the relay's payload differs.
- (c) A one-off cache rename (`field-debriefs-v2`, delete the old one in
  `activate`) for this incident only. It fixes today's entries and not the next
  correction.

Proof: a test that caches a payload, changes the "relay" response, reloads, and
asserts the new payload renders. Red before, green after, with a Rule 90 mutation.
Smoke must pass, and SW_VERSION is bumped in both files.

## Done condition (Rule 90 artifacts)

1. TASK 0's three outputs committed.
2. The reload test red before and green after, with its mutation, in a committed
   log.
3. One green deploy-gate run.

## FORBIDDEN

- No change to the relay's `/context/game` contract without the paired relay CC-CMD (Rule 70).
- Do not change layout or the ambient panel; the edit is confined to the cache read/write path.
