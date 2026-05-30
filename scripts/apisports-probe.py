#!/usr/bin/env python3
"""
api-sports.io Probe — reads actual endpoint shapes before building adapters.
RUWT: Read Until We're There.
"""
import urllib.request, urllib.error, json, os, sys, datetime, traceback

RELAY   = "https://field-relay-nba.jeffunglesbee.workers.dev"
TS      = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
TODAY   = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d')
HEADERS = {'User-Agent': 'FIELD-probe/1.0', 'Accept': 'application/json'}

os.makedirs('outbox/apisports', exist_ok=True)
OUT = {}

def fetch(url):
    print(f"  GET {url}")
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=20) as r:
            raw  = r.read()
            data = json.loads(raw)
            count = len(data.get('response', []))
            print(f"  ✅ {r.status} | {count} items | {len(raw)} bytes")
            return data
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', errors='replace')[:200]
        print(f"  ❌ HTTP {e.code}: {body}")
        return None
    except Exception as e:
        print(f"  ❌ {type(e).__name__}: {e}")
        return None

def probe(label, url):
    print(f"\n── {label}")
    data = fetch(url)
    OUT[label] = {'url': url, 'data': data}
    return data

try:
    print(f"\n{'='*55}\nFIELD api-sports PROBE — {TODAY} {TS}\n{'='*55}")

    # 1. Today's games
    mlb  = probe('mlb/today',  f"{RELAY}/apisports/baseball/games?league=1&season=2026&date={TODAY}")
    nba  = probe('nba/today',  f"{RELAY}/apisports/basketball/games?league=12&season=2025-2026&date={TODAY}")
    nhl  = probe('nhl/today',  f"{RELAY}/apisports/hockey/games?league=57&season=2025-2026&date={TODAY}")
    mls  = probe('mls/today',  f"{RELAY}/apisports/football/fixtures?league=253&season=2026&date={TODAY}")

    # Print full shape of first game found
    for label, data in [('MLB', mlb), ('NBA', nba), ('NHL', nhl)]:
        items = (data or {}).get('response', [])
        if items:
            print(f"\n── {label} game[0] full shape:")
            print(json.dumps(items[0], indent=2)[:1200])
            break

    # 2. Game-level statistics — basketball only (per docs)
    nba_items = (nba or {}).get('response', [])
    nba_id = nba_items[0]['id'] if nba_items else 500121
    print(f"\n── Using NBA game id={nba_id}")

    st = probe(f'nba/stats/teams/{nba_id}',
        f"{RELAY}/apisports/basketball/games/statistics/teams?id={nba_id}")
    sp = probe(f'nba/stats/players/{nba_id}',
        f"{RELAY}/apisports/basketball/games/statistics/players?id={nba_id}")

    for label, data in [(f'nba/stats/teams/{nba_id}', st), (f'nba/stats/players/{nba_id}', sp)]:
        items = (data or {}).get('response', [])
        errs  = (data or {}).get('errors', {})
        print(f"\n── {label} full response:")
        if errs:
            print(f"  ERRORS: {json.dumps(errs)}")
        elif items:
            print(json.dumps(items[0], indent=2)[:2000])
        else:
            print(f"  empty | raw: {json.dumps(data, indent=2)[:400]}")

    # 3. Baseball season-level team stats (no game-level per docs)
    bts = probe('baseball/teams/stats',
        f"{RELAY}/apisports/baseball/teams/statistics?league=1&season=2026&team=35")
    print(f"\n── baseball/teams/stats full:")
    items = (bts or {}).get('response', [])
    errs  = (bts or {}).get('errors', {})
    if errs:
        print(f"  ERRORS: {json.dumps(errs)}")
    elif items:
        print(json.dumps(items[0], indent=2)[:2000])
    else:
        print(f"  raw: {json.dumps(bts, indent=2)[:400]}")

    # 4. MLS predictions (football soccer only)
    mls_items = (mls or {}).get('response', [])
    mls_id = mls_items[0].get('fixture', {}).get('id') if mls_items else None
    if mls_id:
        pd = probe(f'mls/predictions/{mls_id}',
            f"{RELAY}/apisports/football/predictions?fixture={mls_id}")
        items = (pd or {}).get('response', [])
        errs  = (pd or {}).get('errors', {})
        print(f"\n── predictions full:")
        if errs:
            print(f"  ERRORS: {json.dumps(errs)}")
        elif items:
            print(json.dumps(items[0], indent=2)[:2000])
    else:
        print("\n── No MLS fixture today — skipping predictions")

    # Save
    out_path = f"outbox/apisports/probe-{TS}.json"
    with open(out_path, 'w') as f:
        json.dump({'timestamp': TS, 'today': TODAY, 'probes': OUT}, f, indent=2)
    print(f"\n✅ PROBE COMPLETE — {out_path}")

except Exception:
    print("\n\n❌ UNCAUGHT EXCEPTION:")
    traceback.print_exc()
    sys.exit(1)
