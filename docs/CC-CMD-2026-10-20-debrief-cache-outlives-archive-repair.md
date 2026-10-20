# Claude Code Command — the debrief cache serves a game's context after the archive has corrected it

**Date:** 2026-10-20
**Repo:** jubilant-bassoon
**Branch:** main. Commit directly; no feature branch, no PR.
**Confidence gate:** >= 95 before any commit
**Status:** DONE 2026-10-20 (dispatched by the owner: "next approved"; TASK 1 owner-delegated). Results at the end.
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

---

## Results (2026-10-20)

Session doc: `outbox/cc-session-2026-10-20-debrief-cache.md`. Proof log:
`outbox/debrief-cache-revalidate-2026-10-20.log`.

**TASK 0** (log §0):
1. field-debriefs has one reader, one writer and one evictor. It is the only
   store of a relay archive payload that outlives the session with no
   read-time age check.
2. Every other archive copy is sessionStorage with a 30-minute TTL, or nothing.
3. `/context/game` carries no change signal. The body was byte-stable across
   34 minutes. A failed D1 sub-query answers 200 with `_errors`; review round 1
   found this.

**TASK 1, option (b), owner-delegated:** revalidate on read (`1f3d2d04`).
- A hit renders at once. Then the relay is asked with `cache: 'no-cache'`.
- If the body changed, it is kept and that game's cards re-run. If the
  corrected payload draws nothing, the old debrief is cleared.
- If the body is unchanged, nothing is written.
- A non-2xx, an offline fetch, or a body with `_errors` changes nothing.
- Overlapping passes share one resolve.

(a) was rejected because an age check cannot tell a corrected row from an
unchanged one. (c) fixes only this incident.

**Done conditions:**
1. TASK 0 outputs: committed in the log, §0.
2. The reload test, red before and green after, with mutations:
   `scripts/check-debrief-cache-revalidates.mjs`.
   - base `ff4239e2`: 6 of 24;
   - fix: 24 of 24;
   - mutations: 33 of 33 caught after a green baseline (log §1-§2);
   - wired into deploy-gate.
3. Deploy gate run 39468343572: success. Smoke 1055/1055. SW_VERSION 2026-10-20a.

**Live (Rule 90, CI-as-proxy Playwright against the deployed site):**
`debrief_cache_revalidate_probe.js` plants a MARKER in a real cached entry and
checks a second visit in a new tab.
- Before the fix, run 39456471138 (SW 2026-10-18b) was red:
  - 0 relay requests;
  - the MARKER stayed on the page and in the cache.
- After the fix: run 39468966102 (SW 2026-10-20a, served page carries `_revalidateDebriefContext`): PASS. The planted copy of espn:401874762 rendered at 2.8 s while its relay request was held; the relay was asked at 2.7 s and answered 200 at 6.8 s; afterwards 0 debriefs show the MARKER and the Cache API no longer holds it. The second visit asked the relay once per cached final (11 requests for 11 cached entries).

**Filed (Rule 87.4):**
- relay `docs/CC-CMD-2026-10-20-context-game-caches-partial-answers.md`
  (`findBracketDelta` hides its failure; partial answers are KV-cached);
- relay `docs/CC-CMD-2026-10-20-context-game-scans-17k-rows-per-answer.md`;
- client `docs/CC-CMD-2026-10-20-missed-recap-reads-a-shape-the-relay-never-sends.md`;
- client `docs/CC-CMD-2026-10-20-reload-on-a-past-date-renders-no-debriefs.md`
  (observed once by the live probe, not yet reproduced).
