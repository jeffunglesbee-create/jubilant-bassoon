#!/usr/bin/env python3
"""
api-sports.io Probe — FIELD RUWT step 1
Reads actual response shapes BEFORE building any adapter code.
Probe method: GitHub Actions runner → field-relay-nba → api-sports.io
Runners can reach *.workers.dev; sandbox cannot.

Probes (in order):
  1. /v2/games?sport=X — FieldGame normalized shape (live + today)
  2. /apisports/{sport}/games?live=all — raw api-sports shape
  3. /apisports/{sport}/games/statistics?id=X — player stats shape (per live game)
  4. /apisports/basketball/predictions?league=12&game=X — WP shape (if NBA game found)

Output: outbox/apisports/probe-{timestamp}.json
        outbox/apisports/probe-{timestamp}.md  (human-readable summary)

DO NOT BUILD ADAPTERS until you have read the output.
"""

import urllib.request, json, os, datetime, sys

RELAY   = "https://field-relay-nba.jeffunglesbee.workers.dev"
TS      = datetime.datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')
TODAY   = datetime.datetime.utcnow().strftime('%Y-%m-%d')
HEADERS = {
    'User-Agent': 'FIELD-probe/1.0 (github.com/jeffunglesbee-create/jubilant-bassoon)',
    'Accept':     'application/json',
}

os.makedirs('outbox/apisports', exist_ok=True)

results = {
    'timestamp': TS,
    'today':     TODAY,
    'relay':     RELAY,
    'probes':    {},
}

def fetch(url, label):
    print(f"  GET {url}")
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=20) as r:
            raw  = r.read()
            data = json.loads(raw)
            status = r.status
            print(f"  ✅ HTTP {status} — {len(raw)} bytes")
            return {'status': status, 'bytes': len(raw), 'data': data, 'error': None}
    except Exception as e:
        print(f"  ❌ {e}")
        return {'status': None, 'error': str(e), 'data': None}

def probe(label, url):
    print(f"\n{'─'*60}")
    print(f"PROBE: {label}")
    r = fetch(url, label)
    results['probes'][label] = {'url': url, **r}
    return r

def probe_games(sport_key, apisports_sport, league_id, season):
    """Probe both /v2 and raw apisports for a sport. Return found live game IDs."""
    live_ids = []

    # V2 normalized shape
    v2 = probe(
        f"v2/{sport_key}/today",
        f"{RELAY}/v2/games?sport={sport_key}&date={TODAY}"
    )
    if v2['data'] and v2['data'].get('games'):
        games = v2['data']['games']
        live  = [g for g in games if g.get('state') == 'live']
        print(f"  → {len(games)} total, {len(live)} live")
        if games:
            print(f"  → sample fields: {list(games[0].keys())}")
            print(f"  → home fields:   {list((games[0].get('home') or {}).keys())}")
            if games[0].get('situation'):
                print(f"  → situation:     {list(games[0]['situation'].keys())}")

    # Raw apisports — live=all
    raw_live = probe(
        f"apisports/{apisports_sport}/live",
        f"{RELAY}/apisports/{apisports_sport}/games?live=all"
    )
    if raw_live['data']:
        items = raw_live['data'].get('response', [])
        print(f"  → {len(items)} live games from raw")
        for g in items[:3]:
            gid = g.get('id')
            if gid:
                live_ids.append((apisports_sport, gid, sport_key))
            print(f"  → id={gid} status={g.get('status',{}).get('short')} "
                  f"{g.get('teams',{}).get('away',{}).get('name','?')} @ "
                  f"{g.get('teams',{}).get('home',{}).get('name','?')}")
        if items:
            print(f"  → top-level keys: {list(items[0].keys())}")

    # Raw apisports — by date (in case live=all empty)
    if not live_ids:
        raw_today = probe(
            f"apisports/{apisports_sport}/today",
            f"{RELAY}/apisports/{apisports_sport}/games?league={league_id}&season={season}&date={TODAY}"
        )
        if raw_today['data']:
            items = raw_today['data'].get('response', [])
            print(f"  → {len(items)} games today (by date)")
            for g in items[:2]:
                gid = g.get('id')
                status = g.get('status', {}).get('short', '?')
                if gid and status not in ('NS', 'TBD', 'PST'):
                    live_ids.append((apisports_sport, gid, sport_key))
            if items:
                print(f"  → top-level keys: {list(items[0].keys())}")

    return live_ids

# ── FOOTBALL (soccer/MLS) — v3 has different shape ────────────────────────
def probe_football(sport_key, league_id, season):
    live_ids = []
    raw_live = probe(
        f"apisports/football/{sport_key}/live",
        f"{RELAY}/apisports/football/fixtures?live=all&league={league_id}"
    )
    if raw_live['data']:
        items = raw_live['data'].get('response', [])
        print(f"  → {len(items)} live fixtures")
        for f_ in items[:3]:
            fid = f_.get('fixture', {}).get('id')
            if fid:
                live_ids.append(('football', fid, sport_key))
            print(f"  → id={fid} elapsed={f_.get('fixture',{}).get('status',{}).get('elapsed')}")
        if items:
            print(f"  → top-level keys: {list(items[0].keys())}")
            print(f"  → fixture keys:   {list(items[0].get('fixture',{}).keys())}")

    if not live_ids:
        raw_today = probe(
            f"apisports/football/{sport_key}/today",
            f"{RELAY}/apisports/football/fixtures?league={league_id}&season={season}&date={TODAY}"
        )
        if raw_today['data']:
            items = raw_today['data'].get('response', [])
            print(f"  → {len(items)} fixtures today")
            for f_ in items[:2]:
                fid = f_.get('fixture', {}).get('id')
                status = f_.get('fixture', {}).get('status', {}).get('short', '?')
                if fid and status not in ('NS', 'TBD', 'PST'):
                    live_ids.append(('football', fid, sport_key))
    return live_ids

# ── MAIN PROBE SEQUENCE ────────────────────────────────────────────────────

print(f"\n{'═'*60}")
print(f"FIELD api-sports PROBE — {TODAY}")
print(f"Relay: {RELAY}")
print(f"{'═'*60}")

all_live = []

print("\n[1] MLB")
all_live += probe_games('mlb', 'baseball', league_id=1, season='2026')

print("\n[2] NBA")
all_live += probe_games('nba', 'basketball', league_id=12, season='2025-2026')

print("\n[3] NHL")
all_live += probe_games('nhl', 'hockey', league_id=57, season='2025-2026')

print("\n[4] MLS (football/soccer)")
all_live += probe_football('mls', league_id=253, season='2026')

# ── STATISTICS PROBES for live games ──────────────────────────────────────
print(f"\n{'═'*60}")
print(f"STATISTICS PROBE — {len(all_live)} live game(s) found")

stat_sports_done = set()
for (apisports_sport, game_id, field_sport) in all_live[:6]:
    key = f"{apisports_sport}_stats"
    if key in stat_sports_done:
        continue
    stat_sports_done.add(key)

    print(f"\n[STATS] {field_sport} id={game_id}")
    stats = probe(
        f"stats/{field_sport}/{game_id}",
        f"{RELAY}/apisports/{apisports_sport}/games/statistics?id={game_id}"
    )
    if stats['data']:
        items = stats['data'].get('response', [])
        print(f"  → {len(items)} team stat objects")
        if items:
            print(f"  → team object keys:   {list(items[0].keys())}")
            players = items[0].get('players', [])
            if players:
                print(f"  → player object keys: {list(players[0].keys())}")
                stats_block = players[0].get('statistics', [{}])
                if stats_block:
                    print(f"  → statistics keys:    {list(stats_block[0].keys())}")
            # Print full first team for shape reading
            print(f"  → FULL first object:")
            print(json.dumps(items[0], indent=2)[:2000])

# ── NBA WIN PROBABILITY (pre-match predictions) ───────────────────────────
nba_games = [g for g in all_live if g[2] == 'nba']
if nba_games:
    _, game_id, _ = nba_games[0]
    print(f"\n[PREDICTIONS] NBA id={game_id}")
    pred = probe(
        f"predictions/nba/{game_id}",
        f"{RELAY}/apisports/basketball/predictions?league=12&game={game_id}"
    )
    if pred['data'] and pred['data'].get('response'):
        items = pred['data']['response']
        print(f"  → {len(items)} prediction objects")
        if items:
            print(f"  → keys: {list(items[0].keys())}")
            pct = items[0].get('predictions', {})
            print(f"  → predictions keys: {list(pct.keys()) if isinstance(pct, dict) else type(pct)}")
            print(f"  → FULL first:")
            print(json.dumps(items[0], indent=2)[:1500])
else:
    print("\n[PREDICTIONS] No live NBA game found — skipping")

# ── SAVE RESULTS ──────────────────────────────────────────────────────────
out_json = f"outbox/apisports/probe-{TS}.json"
out_md   = f"outbox/apisports/probe-{TS}.md"

with open(out_json, 'w') as f:
    json.dump(results, f, indent=2)

# Human-readable summary
lines = [
    f"# FIELD api-sports.io Probe — {TODAY}",
    f"Timestamp: {TS}",
    "",
    "## Probe URLs",
]
for label, r in results['probes'].items():
    status = r.get('status', 'ERR')
    err    = r.get('error', '')
    lines.append(f"- `{label}`: HTTP {status} {err}")

lines += [
    "",
    "## Live games found",
    f"{len(all_live)} total: " + ", ".join(f"{s}:{gid}({k})" for s,gid,k in all_live),
    "",
    "## Next step",
    "Read outbox/apisports/probe-{TS}.json for full field names.",
    "Only then write adapters. Mark verified fields: `// VERIFIED [date]`",
]

with open(out_md, 'w') as f:
    f.write('\n'.join(lines))

print(f"\n{'═'*60}")
print(f"PROBE COMPLETE")
print(f"JSON: {out_json}")
print(f"MD:   {out_md}")
print(f"Live games found: {len(all_live)}")
print(f"{'═'*60}")
