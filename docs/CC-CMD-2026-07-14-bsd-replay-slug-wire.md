# Claude Code Command — Wire client post-game BSD replay to the new sport-parameterized R2 keys

**Date:** 2026-07-14
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main — commit directly, do not create a feature branch or PR.

git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO — this CC-CMD targets jubilant-bassoon"; exit 1; }; git pull.

Write findings to docs/outbox/cc-bsd-replay-slug-wire-2026-07-14.md. Commit the outbox manifest with `[skip ci]` in the message.

## CONTEXT

Two prior CC-CMDs this session closed the live-pitch half of BSD's WC-only gating (this repo, `bsd-pitch-generalize`) and the relay's post-game capture half (field-relay-nba, `bsd-endgame-capture-generalize`, commit 052727d). The relay now writes post-game BSD data for any covered club league to `bsd/{slug}/{bsdEventId}/{type}.json` — real, confirmed, deployed. This repo's own post-game replay read path was deliberately left untouched by the first client CC-CMD (explicitly out of scope, since it depends on the relay's new key format existing first — it now does):

```js
if (_bsIsWC && _bsBsdEventId && (eData?.state === 'post' || eData?.state === 'final' || _bsGameAge > 95)) {
  const _r2Key = `bsd/wc26/${_bsBsdEventId}/stats.json`;
```

Still gated to `_bsIsWC`, still hardcoded to the `wc26` prefix. Without this fix, the relay captures real MLS/EPL/etc. post-game data that nothing on the client ever reads — the loop stays open even though both prior fixes individually landed correctly.

**The real slug format, confirmed directly from the relay's own code tonight — do not guess or re-derive it:**
```js
const BSD_LEAGUE_ID_TO_SLUG = (() => {
    const map = {};
    for (const [slug, cfg] of Object.entries(V2_LEAGUES)) {
        const lid = cfg?.bsdLeagueId;
        if (Number.isInteger(lid) && !(lid in map)) map[lid] = slug;
    }
    return map;
})();
```
The slug is literally the same key `V2_LEAGUES` already uses on the relay side (e.g. `'mls'`, `'epl'`) — not a new, separate naming scheme. TASK 0's job is confirming what the equivalent, already-available sport identifier is on the client side for a given game object, and confirming it matches this same slug convention exactly — a mismatch here would silently produce zero results, the same failure shape as the WC label fragmentation and league-mislabel bugs already found and fixed elsewhere tonight. Do not assume `game._sport` already matches without checking; confirm it directly against a few real slugs (`mls`, `epl`, `wc26`, etc.).

## TASK 0 — Probe

```bash
grep -n "_bsIsWC\|_bsBsdEventId\|_r2Key" index.html
```
Re-confirm the real current line numbers and the full surrounding function (will have drifted since the live-pitch fix landed). Confirm the exact sport-identifier field available on `game`/`eData` at this call site, and confirm it matches the relay's slug convention for at least 2-3 real leagues, not assumed from naming similarity alone.

## TASK 1 — Fix

Drop the `_bsIsWC` gate, matching the live-pitch fix's own precedent — gate on `_bsBsdEventId` alone. Change the hardcoded `bsd/wc26/` prefix to use the real, confirmed sport slug for this game (`bsd/${realSlug}/${_bsBsdEventId}/stats.json`), falling back correctly to `wc26` specifically when the game genuinely is a World Cup match — do not accidentally change WC26's own existing, working behavior while generalizing the rest.

## TASK 2 — Verify

- Full-file script-block parse: clean.
- Real forced-condition test: a synthetic MLS-shaped game object with a real-shaped `bsdEventId` now correctly constructs and requests `bsd/mls/{id}/stats.json`, not `bsd/wc26/{id}/stats.json`. A synthetic WC26-shaped object still constructs `bsd/wc26/{id}/stats.json` exactly as before (non-regression).
- If a live or recently-captured real club-league R2 object is reachable (check via the relay's `/bsd/r2/read` route, allowlisted per earlier tonight's session) at execution time, confirm an actual real read succeeds end-to-end, not just that the URL construction looks right. If nothing real is available yet (club leagues resume July 16), state that plainly rather than asserting success on a URL shape alone.
- `node smoke.js index.html`: same pass count as baseline, plus any new assertion this task adds.

## DONE CONDITION

Post-game BSD replay works for any covered club league with real captured data, not just World Cup, using the exact slug convention the relay actually writes — verified against the relay's real mapping, not assumed from naming similarity. WC26's own existing replay behavior fully unchanged. This closes the loop opened by the two prior CC-CMDs — after this lands, the full live+post-game BSD feature is genuinely deployed for every covered league, not just WC26.

**Confidence scoring:**
- TASK 0 (30 pts): confirms the real client-side sport identifier matches the relay's real slug convention for multiple real leagues, not assumed
- TASK 1 (35 pts): drops the sport gate consistently with the live-pitch precedent, correctly parameterizes the R2 key, WC26's own path explicitly preserved
- TASK 2 (35 pts): real forced tests for both MLS-shaped and WC-shaped cases, real end-to-end R2 read attempted and honestly reported, smoke count confirmed

Do not commit unless confidence >= 95. If score < 95, report verbatim and stop. Automate follow-ups. No fallbacks, only fixes.
