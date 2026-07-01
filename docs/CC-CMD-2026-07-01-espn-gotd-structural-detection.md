# Claude Code Command — Structural ESPN GOTD Auto-Detection

**Branch:** main — commit directly, do not create a feature branch or PR.

git pull. Read CLAUDE.md / STANDARDS.md.

Write findings to outbox/cc-espn-gotd-structural-detection-2026-07-01.md.

## CONTEXT

Verified live, 2026-07-01, via `site.api.espn.com`'s own MLB scoreboard
(a domain and endpoint shape FIELD's client already uses elsewhere —
this is not a new/unproven source): every game today shows `'MLB.TV'`
as its sole national broadcast name, EXCEPT Toronto Blue Jays @ New York
Mets, which shows `['ESPN Unlmtd', 'MLB.TV']`. The real ESPN cable
exclusive today (Brewers @ Reds) shows plain `['ESPN', 'MLB.TV']` — no
"Unlmtd" suffix. This confirms `'ESPN Unlmtd'` is a distinct, specific
string in ESPN's own feed, separate from generic `'ESPN'`.

This directly resolves the exact ambiguity `assignMLBBroadcast()`'s
existing comment warns about:

```javascript
// Detect ESPN GOTD: cross-reference against ESPN Press Room schedule lookup
// DO NOT auto-tag from broadcast name — 'ESPN' appears for many non-GOTD games
```

That caution is correct for `statsapi.mlb.com`'s broadcast names (the
current data source, via `rawBroadcasts` parsing) — MLB's feed
apparently doesn't distinguish ESPN-cable from ESPN-App-GOTD in its
naming. But `site.api.espn.com` (ESPN's own feed, a DIFFERENT source)
does distinguish them, specifically. This is why press-release search
(the mechanism used for the 2026-07-01 manual fix, commit `814b00a`)
was necessary before — there was no reliable structural signal being
checked. There now is one, from a source not currently queried at all.

**Scope boundary — read before writing anything:** this fixes ESPN GOTD
only. Peacock GOTD was checked against the same ESPN feed and is
genuinely absent — Peacock and ESPN are different companies with no
shared broadcast feed; ESPN's API has no visibility into Peacock's
programming decisions. Confirmed via direct query: the known real
Peacock GOTD game today (Tigers @ Yankees) shows only `'MLB.TV'` in
ESPN's feed, no Peacock signal whatsoever. Peacock GOTD remains a
manual/press-release process — `PEACOCK_GOTD_SCHEDULE` /
`PEACOCK_GOTD_IDS` stay as they are. Do not attempt to extend this
fix to Peacock; there is no data source for it.

## PRE-BUILD PROBE (Rule 87)

```bash
grep -n "async function assignMLBBroadcast\|ESPN_GOTD_LOOKUP\|ESPN_GOTD_IDS" scripts/build-field-data.js
sed -n '129,220p' scripts/build-field-data.js
grep -n "fetch(" scripts/build-field-data.js | head -20
```

Confirm the exact current function signature/structure and how existing
`fetch()` calls in this file are made (headers, error handling pattern)
before adding a new one — match the established style, don't invent a
different pattern.

**Also confirm during probe:** the codebase has at least 2-3 separate
ESPN-GOTD-related stores across files (`ESPN_GOTD_LOOKUP` and
`ESPN_GOTD_IDS` in `build-field-data.js`, `ESPN_GOTD_SCHEDULE` in
`index.html`). This CC-CMD does NOT consolidate them — note their
existence in the outbox as a real, separate finding worth a future
"Rule 62 cleanup" CC-CMD, but do not attempt that consolidation here.
Scope creep risk is real; stay narrow.

## TASK 1: Add a new ESPN scoreboard fetch for structural GOTD detection

In `build-field-data.js`, add a function (near `assignMLBBroadcast` or
wherever fetch helpers live — confirm placement via probe):

```javascript
async function fetchEspnMlbGotd(dateStr) {
  // dateStr: 'YYYY-MM-DD'. Returns a Set of 'home|away' keys (ESPN's
  // team displayName strings) where ESPN's OWN scoreboard shows
  // 'ESPN Unlmtd' as a national broadcast — the real, specific GOTD
  // signal, distinct from generic 'ESPN' (which also covers the
  // separate cable-exclusive slate and is NOT a reliable GOTD signal).
  const espnDate = dateStr.replace(/-/g, '');
  const gotdKeys = new Set();
  try {
    const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard?dates=${espnDate}`);
    if (!res.ok) return gotdKeys;
    const data = await res.json();
    for (const ev of data.events || []) {
      const comp = ev.competitions?.[0];
      if (!comp) continue;
      const national = (comp.broadcasts || []).find(b => b.market === 'national');
      const names = (national?.names || []).map(n => n.toLowerCase());
      if (names.some(n => n.includes('espn unlmtd') || n.includes('espn unlimited'))) {
        const home = comp.competitors?.find(c => c.homeAway === 'home')?.team?.displayName;
        const away = comp.competitors?.find(c => c.homeAway === 'away')?.team?.displayName;
        if (home && away) gotdKeys.add(`${home}|${away}`);
      }
    }
  } catch (e) {
    // Never let this block the main build — GOTD is enrichment, not critical path.
  }
  return gotdKeys;
}
```

Confirm the exact field names (`homeAway`, `displayName`, `market`)
against a fresh live probe of the endpoint before shipping — the probe
above is from 2026-07-01, verify it still matches at CC-CMD execution
time rather than trusting this snippet blindly.

## TASK 2: Wire it into assignMLBBroadcast's ESPN GOTD detection

Find the existing block:

```javascript
// Detect ESPN GOTD: cross-reference against ESPN Press Room schedule lookup
// DO NOT auto-tag from broadcast name — 'ESPN' appears for many non-GOTD games
if (!game.espnGOTD) {
  const lookupKey = `${game.away}|${game.home}`;
  const scheduledGOTD = ESPN_GOTD_LOOKUP[dateStr];
  if (scheduledGOTD === lookupKey || ESPN_GOTD_IDS.includes(`${game.home}|${game.away}`)) {
    game.espnGOTD = true;
  }
}
```

This function (`assignMLBBroadcast`) is called per-game and is not
async currently (confirm via probe). The new ESPN scoreboard fetch
should happen ONCE per build run (not once per game — that would be N
redundant fetches), so call `fetchEspnMlbGotd(dateStr)` once in the
main build flow (wherever `assignMLBBroadcast` is invoked in a loop —
find that call site via probe) and pass the resulting `Set` into
`assignMLBBroadcast` as a new parameter, checked alongside the existing
`ESPN_GOTD_LOOKUP`/`ESPN_GOTD_IDS` checks:

```javascript
if (!game.espnGOTD) {
  const lookupKey = `${game.away}|${game.home}`;
  const scheduledGOTD = ESPN_GOTD_LOOKUP[dateStr];
  const structuralKey = `${game.home}|${game.away}`;
  if (scheduledGOTD === lookupKey
      || ESPN_GOTD_IDS.includes(structuralKey)
      || espnGotdKeysFromApi.has(structuralKey)) {
    game.espnGOTD = true;
  }
}
```

Confirm the exact parameter-threading change doesn't break the
function's existing call sites — there may be more than one caller.

## TASK 3: Verification

This cannot be verified by `node smoke.js` (no assertion covers this)
and CC cannot run the actual build script against live data from inside
its sandbox (same `*.workers.dev`/external-API egress constraints as
every other CC-CMD this session — confirm whether `site.api.espn.com`
is even reachable from CC's environment; if not, this task is fully
chat-side). Done condition for CC: code committed, syntactically valid
(`node -c scripts/build-field-data.js` or equivalent), no changes to
existing function signatures that would break other callers.

**Chat-side follow-up (not checkable by CC):** trigger `field-data.yml`
manually (or wait for its next scheduled run) once this ships, and
confirm `field-data-today.json` shows `espnGOTD: true` auto-detected
with ZERO manual `espn_gotd` input needed, the next time ESPN actually
has a GOTD game (today's ESPN GOTD status is unknown until this ships
and a future day is checked — today already has no ESPN GOTD per the
earlier press-release-based finding, so today isn't a valid test case;
needs a day where ESPN actually schedules one).

## TASK 4: Outbox manifest

Note explicitly: (a) Peacock GOTD remains manual, no path found to
automate it further this session, (b) the 3-way ESPN-GOTD-store
proliferation found during probe, flagged but not fixed, (c) whether
`site.api.espn.com` was reachable from the CC sandbox for any live
verification, or whether this was 100% chat-side.
