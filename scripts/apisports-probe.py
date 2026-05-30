#!/usr/bin/env python3
"""
api-sports.io Probe — RUWT step 2 (corrected endpoints from docs)
Verified endpoint list from api-sports.io documentation:
  Basketball: /games/statistics/teams?id=X  /games/statistics/players?id=X
  Baseball:   NO game-level stats endpoint (only /teams/statistics season-level)
  Predictions: football (soccer) only via /predictions?fixture=X
  NBA-specific: v2.nba.api-sports.io /players/statistics (season-level)
"""

import urllib.request, json, os, datetime

RELAY  = "https://field-relay-nba.jeffunglesbee.workers.dev"
TS     = datetime.datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')
TODAY  = datetime.datetime.utcnow().strftime('%Y-%m-%d')
HEADERS = {
    'User-Agent': 'FIELD-probe/1.0',
    'Accept':     'application/json',
}

os.makedirs('outbox/apisports', exist_ok=True)
results = {'timestamp': TS, 'today': TODAY, 'probes': {}}

def fetch(url):
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=20) as r:
            raw  = r.read()
            data = json.loads(raw)
            print(f"  ✅ HTTP {r.status} — {len(raw)} bytes")
            return {'status': r.status, 'data': data, 'error': None}
    except Exception as e:
        print(f"  ❌ {e}")
        return {'status': None, 'error': str(e), 'data': None}

def probe(label, url):
    print(f"\n{'─'*55}\nPROBE: {label}\n  {url}")
    r = fetch(url)
    results['probes'][label] = {'url': url, **r}
    items = (r.get('data') or {}).get('response', [])
    if items:
        print(f"  → {len(items)} items | top keys: {list(items[0].keys())}")
    elif r.get('data'):
        errs = (r['data'] or {}).get('errors', {})
        if errs:
            print(f"  → errors: {errs}")
    return r

print(f"\n{'═'*55}")
print(f"FIELD api-sports PROBE v2 — {TODAY}")
print(f"{'═'*55}")

# ── STEP 1: Get game IDs from today ──────────────────────────────────────
print("\n[1] Get live/today game IDs")

mlb_games = probe('mlb/today',
    f"{RELAY}/apisports/baseball/games?league=1&season=2026&date={TODAY}"
).get('data', {}).get('response', [])

nba_games = probe('nba/today',
    f"{RELAY}/apisports/basketball/games?league=12&season=2025-2026&date={TODAY}"
).get('data', {}).get('response', [])

nhl_games = probe('nhl/today',
    f"{RELAY}/apisports/hockey/games?league=57&season=2025-2026&date={TODAY}"
).get('data', {}).get('response', [])

# Show full shape of first game
for label, games in [('MLB', mlb_games), ('NBA', nba_games), ('NHL', nhl_games)]:
    if games:
        print(f"\n  {label} game[0] full shape:")
        print(json.dumps(games[0], indent=2)[:1000])

# ── STEP 2: CORRECT statistics endpoints (from docs) ─────────────────────
print("\n[2] Basketball /games/statistics/teams and /players (CORRECTED)")

# Use any available NBA game
nba_id = next((g['id'] for g in nba_games), None)
if nba_id:
    probe(f'nba/stats/teams/{nba_id}',
        f"{RELAY}/apisports/basketball/games/statistics/teams?id={nba_id}")
    probe(f'nba/stats/players/{nba_id}',
        f"{RELAY}/apisports/basketball/games/statistics/players?id={nba_id}")
else:
    print("  No NBA game found today — using hardcoded recent id=500121")
    probe('nba/stats/teams/500121',
        f"{RELAY}/apisports/basketball/games/statistics/teams?id=500121")
    probe('nba/stats/players/500121',
        f"{RELAY}/apisports/basketball/games/statistics/players?id=500121")

# ── STEP 3: Baseball — no game stats, confirm teams/statistics ───────────
print("\n[3] Baseball stats — no game-level endpoint per docs")
print("    Confirming: /teams/statistics is season-level only")
probe('baseball/teams/stats',
    f"{RELAY}/apisports/baseball/teams/statistics?league=1&season=2026&team=35")

# ── STEP 4: Hockey game stats ─────────────────────────────────────────────
print("\n[4] Hockey /games/statistics (does it exist?)")
nhl_id = next((g['id'] for g in nhl_games), None)
if nhl_id:
    probe(f'nhl/stats/teams/{nhl_id}',
        f"{RELAY}/apisports/hockey/games/statistics/teams?id={nhl_id}")
else:
    print("  No NHL game today — skipping")

# ── STEP 5: Football (soccer) predictions ────────────────────────────────
print("\n[5] Football predictions — soccer only, fixture= param")
mls_games = probe('mls/today',
    f"{RELAY}/apisports/football/fixtures?league=253&season=2026&date={TODAY}"
).get('data', {}).get('response', [])

mls_id = next((g.get('fixture', {}).get('id') for g in mls_games if g.get('fixture', {}).get('id')), None)
if mls_id:
    probe(f'mls/predictions/{mls_id}',
        f"{RELAY}/apisports/football/predictions?fixture={mls_id}")
else:
    print("  No MLS fixture today — skipping predictions")

# ── STEP 6: Show full statistics response shapes ──────────────────────────
print(f"\n{'═'*55}")
print("FULL RESPONSE SHAPES FOR VERIFIED ENDPOINTS:")

for label in ['nba/stats/teams/500121', 'nba/stats/players/500121', 'baseball/teams/stats']:
    r = results['probes'].get(label, {})
    data = r.get('data', {})
    items = data.get('response', [])
    errors = data.get('errors', {})
    print(f"\n=== {label} ===")
    if errors:
        print(f"  ERROR: {errors}")
    elif items:
        print(json.dumps(items[0], indent=2)[:2000])
    else:
        print(f"  empty response | raw: {json.dumps(data, indent=2)[:300]}")

# ── SAVE ──────────────────────────────────────────────────────────────────
out_json = f"outbox/apisports/probe-{TS}.json"
with open(out_json, 'w') as f:
    json.dump(results, f, indent=2)

print(f"\n{'═'*55}")
print(f"PROBE COMPLETE — {TS}")
print(f"Output: {out_json}")
