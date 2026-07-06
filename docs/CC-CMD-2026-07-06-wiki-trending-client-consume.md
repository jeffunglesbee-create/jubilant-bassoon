# CC-CMD: Consume the relay's Wikimedia trending aggregator (client side)

**Date:** 2026-07-06
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR
**Depends on:** field-relay-nba's `CC-CMD-2026-07-06-wiki-trending-
aggregator.md` — confirm it is actually deployed before starting (curl
`https://field-relay-nba.jeffunglesbee.workers.dev/wiki/trending?date=`
for today's date and confirm it returns real, non-empty data for a
known team — do not proceed on faith that it shipped).

**What this replaces:** `fetchWikiSignificance()` (line ~23200) and its
per-team, per-card-pair invocation in `injectWikiChips()` (line ~23230)
currently make one direct browser-to-`wikimedia.org` fetch per distinct
team on today's schedule — 20-40+ external requests on a cold cache,
roughly half historically failing with 429 per prior WPT measurement
(June 3 2026 PM-26 session). The relay now aggregates and caches this
server-side in one call.

**Target time:** ~20 min

## PROBE BLOCK
```bash
sed -n '23148,23200p' index.html   # WIKI_TITLES + fetchWikiSignificance
sed -n '23230,23255p' index.html   # injectWikiChips
```
Confirm citations match before editing. Also confirm live:
```bash
curl -s "https://field-relay-nba.jeffunglesbee.workers.dev/wiki/trending?date=$(date -u +%F)"
```
returns a real JSON object with actual `spikeRatio`/`trending` fields
for at least one team you recognize — not an empty object, not an
error. Stop and report if this dependency isn't actually live.

## TASK 1 — Replace per-team fetching with one relay call

Add a single fetch near where the schedule is loaded (once per page
load, not per card):
```javascript
let _wikiTrendingCache = null;
async function fetchAllWikiTrending() {
  if (_wikiTrendingCache) return _wikiTrendingCache;
  try {
    const today = new Date().toISOString().slice(0, 10);
    const r = await fetch(`https://field-relay-nba.jeffunglesbee.workers.dev/wiki/trending?date=${today}`);
    _wikiTrendingCache = r.ok ? await r.json() : {};
  } catch (e) { _wikiTrendingCache = {}; }
  return _wikiTrendingCache;
}
```
Replace `fetchWikiSignificance(teamName)`'s body to look up `teamName`
in this single cached bulk result instead of making its own network
call:
```javascript
async function fetchWikiSignificance(teamName) {
  const all = await fetchAllWikiTrending();
  return all[teamName] || null;
}
```
`injectWikiChips()` itself needs no changes — it already calls
`fetchWikiSignificance` per card; the function now resolves from the
one cached bulk fetch instead of hitting the network per team. Remove
the now-unused `WIKI_TITLES` constant and the old direct-fetch/
localStorage-caching logic inside the old `fetchWikiSignificance` body
— the relay owns the team-name-to-title mapping now, the client no
longer needs its own copy. Keep the `_wikiCache`/localStorage removal
scoped to exactly this — don't touch unrelated caching elsewhere in the
file.

## TASK 2 — Verification

- `node smoke.js index.html` clean
- Confirm zero direct requests to `wikimedia.org` fire from the client
  on a real page load (check via the browser's own network activity,
  not just code review) — exactly one request to
  `field-relay-nba.jeffunglesbee.workers.dev/wiki/trending` should
  appear instead.
- Confirm at least one real trending chip still renders correctly on a
  real game card when the relay data indicates a team is trending —
  don't just confirm the network call shape, confirm the actual UI
  output still works end to end.

## DONE CONDITIONS
- [ ] Confirmed the relay dependency is live before starting, not assumed
- [ ] Probe block confirms citations before editing
- [ ] Single bulk fetch replaces the per-team fetch loop
- [ ] `WIKI_TITLES` and the old per-team fetch/cache logic removed (relay owns this now)
- [ ] Verified via real network inspection that only one request to the relay fires, zero direct wikimedia.org requests
- [ ] Verified a real trending chip still renders correctly end-to-end
- [ ] Smoke clean
- [ ] Outbox written

## CONFIDENCE SCORING TABLE
+30  Bulk fetch replaces per-team fetching correctly
+20  Dead code (WIKI_TITLES, old per-team logic) fully removed, nothing unrelated touched
+25  Verified via real network inspection that direct wikimedia.org calls are gone, not just code review
+15  Verified a real trending chip still renders correctly end-to-end
+10  Smoke clean

## ONE-LINER
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO -- this CC-CMD targets jubilant-bassoon"; exit 1; }
git pull. Read docs/CC-CMD-2026-07-06-wiki-trending-client-consume.md.
First confirm field-relay-nba's wiki-trending-aggregator CC-CMD is
actually deployed and returning real data (curl it) before touching
this file. Then replace the client's per-team direct Wikimedia fetches
with one bulk call to the relay's new /wiki/trending endpoint, removing
the now-redundant WIKI_TITLES list and per-team fetch/cache logic.
Verify via real network inspection that direct wikimedia.org requests
are gone and that a real trending chip still renders correctly. Do not
commit unless confidence >= 95. If score < 95, report verbatim and
stop.
