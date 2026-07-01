# Claude Code Command — GOTD Tagging for Adapter-Driven Days

**Branch:** main — commit directly, do not create a feature branch or PR.

git pull. Read CLAUDE.md / STANDARDS.md.

Write findings to outbox/cc-gotd-adapter-tagging-2026-07-01.md.

## CONTEXT

Confirmed live, 2026-07-01: `espnGOTD`/`peacockGOTD` flags only exist on
2 hardcoded legacy `mlbRaw` entries (June 6, Apple TV Friday Night
Baseball) — both predate the MLB Stats API adapter migration. Grepped
`fetchMLBFixtures()` and the whole file: zero GOTD-flag logic exists
anywhere in the adapter path, and no separate manual-override array
exists either. Since `mlbRaw` is now empty on "all-local" adapter-driven
days (per the architecture comment directly above `fetchMLBFixtures()`:
*"For all-local days, mlbRaw = [] and adapter provides the full slate"*),
there is currently NO mechanism to tag a GOTD flag onto any
adapter-sourced game. This has been broken since the adapter migration
(mid-June) — every adapter-covered day has been silently unable to
surface GOTD value, which the Daily Update Reference doc calls *"core to
FIELD's 'surface what's free first' principle."*

**Live GOTD data, verified via web search 2026-07-01 (3 independent,
mutually-corroborating sources — Peacock's own blog, NBC Sports press
release, NBCUniversal press release, all published today):**

- **Peacock GOTD, Wed July 1**: Detroit Tigers at New York Yankees, 1:35pm
  ET (NBC Sports/NBCUniversal press releases say 1:35pm; Peacock's own
  blog says 1:30pm — minor source discrepancy, use 1:35pm as the more
  authoritative rightsholder-direct source, note the discrepancy in the
  override comment)
- **ESPN GOTD**: no July block published yet as of this search (last
  announced block ran exactly through June 30) — do NOT tag an ESPN GOTD
  entry for today, there isn't one confirmed

## PRE-BUILD PROBE (Rule 87)

```bash
grep -n "async function fetchMLBFixtures" index.html
sed -n '19782,19835p' index.html
```

Confirm the exact current line numbers and the `mergedGames.map(...)`
block shape — line numbers above are from the 2026-07-01 probe and may
have shifted.

## TASK 1: Add MLB_GOTD_OVERRIDES, independent of mlbRaw

Near the top of `fetchMLBFixtures()` or as a module-level const near
`mlbRaw`'s definition (probe to find the cleanest placement — don't
assume, check what's actually near `mlbRaw` first), add:

```javascript
// GOTD flags, keyed by date + matchup — independent of mlbRaw, since
// mlbRaw is empty on adapter-driven days and has no hook for these.
// Format: "YYYY-MM-DD|homeTeam|awayTeam" (team names as ESPN/adapter
// sends them — verify against espnTeamMatch()'s expected format before
// assuming exact string match works; may need the same normalization
// used elsewhere for team names).
const MLB_GOTD_OVERRIDES = {
  "2026-07-01|New York Yankees|Detroit Tigers": { peacockGOTD: true },
  // Source: Peacock blog + NBC Sports press release, verified 2026-07-01.
  // Time discrepancy: Peacock blog says 1:30pm ET, NBC Sports/NBCUniversal
  // press releases say 1:35pm ET — using 1:35pm (rightsholder-direct).
};
```

Confirm via the probe whether keying by home/away team NAME strings will
reliably match the adapter's actual field values (MLB Stats API team
names vs ESPN team names may differ) — if there's a risk of mismatch,
consider keying by date + a normalized/sorted team-name pair instead so
home/away order doesn't matter, or by MLB team ID if one is available in
`apiGame`. Verify, don't assume the naive string-match approach above
works before shipping it — this is exactly the class of bug the
`identity-resolver.js` work earlier this session exists to prevent.

## TASK 2: Apply overrides at the merge point

At the `mlbSec.games = mergedGames.map(g => ({...g, ...}))` line (found
in probe), extend the mapped object to check `MLB_GOTD_OVERRIDES` by
date + matchup and spread in any matching flags:

```javascript
mlbSec.games = mergedGames
  .map(g => {
    const dateKey = (g.start_time || '').slice(0, 10);
    const overrideKey = `${dateKey}|${g.home}|${g.away}`;
    const gotd = MLB_GOTD_OVERRIDES[overrideKey] || {};
    return {...g, ...gotd, _sport:'Baseball (MLB)', _dataSource: g.source || null};
  })
  .sort((a,b)=>{ /* existing sort, unchanged */ });
```

Verify this doesn't break the existing doubleheader-tagging or sort
logic immediately below it — read the full block before editing, don't
paste blind.

## TASK 3: Verification

```bash
node smoke.js index.html
```
Done condition: 0 failures — this is additive, should not change any
existing assertion.

**Chat-side follow-up (not checkable by CC):** confirm the Peacock GOTD
chip actually renders on the Tigers @ Yankees card once deployed — CC's
egress blocks `*.workers.dev`, live-render verification happens from
chat.

## TASK 4: Outbox manifest

Note explicitly: this is a first, minimal version seeded with exactly
one real entry. The weekly/ongoing maintenance burden (adding new
entries as ESPN/Peacock announce new blocks) is NOT automated by this
CC-CMD — it's still a manual addition to `MLB_GOTD_OVERRIDES`, just no
longer blocked by `mlbRaw` being empty. Flag whether a more automated
approach (e.g., an admin endpoint, or a relay-side lookup) would be
worth a future CC-CMD — don't build it now, scope creep, just note it.
