#!/usr/bin/env python3
"""
NHL Analytics Probe — runs before building any hardcoded lookup tables.
Confirms: API endpoints, field names, key formats, data availability.
Lesson from MLB: never guess column names or key formats.
Output: outbox/nhl/nhl-analytics-probe-{timestamp}.json
"""
import urllib.request, json, os, datetime

TS = datetime.datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')
os.makedirs('outbox/nhl', exist_ok=True)

HEADERS = {
    'User-Agent': 'Mozilla/5.0 FIELD-probe/1.0',
    'Accept': 'application/json',
}

def fetch(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read()), r.status

results = {'timestamp': TS, 'endpoints': {}}

# ── 1. NHL Team Playoff Summary (Corsi, goals, shots) ─────────────────────
# gameTypeId=3 = playoffs, seasonId=20252026
print("1. Team playoff summary...")
try:
    url = "https://api.nhle.com/stats/rest/en/team/summary?cayenneExp=seasonId=20252026 and gameTypeId=3&sort=points&limit=20"
    data, status = fetch(url)
    teams = data.get('data', [])
    results['endpoints']['team_summary'] = {
        'url': url, 'status': status, 'count': len(teams),
        'sample_fields': list(teams[0].keys()) if teams else [],
        'sample': teams[:2] if teams else [],
    }
    print(f"  ✅ {len(teams)} teams | fields: {list(teams[0].keys()) if teams else 'none'}")
except Exception as e:
    results['endpoints']['team_summary'] = {'error': str(e)}
    print(f"  ❌ {e}")

# ── 2. NHL Team Special Teams (PP%, PK%) ─────────────────────────────────
print("2. Team special teams...")
try:
    url = "https://api.nhle.com/stats/rest/en/team/powerplay?cayenneExp=seasonId=20252026 and gameTypeId=3&sort=powerPlayPct&limit=20"
    data, status = fetch(url)
    teams = data.get('data', [])
    results['endpoints']['team_powerplay'] = {
        'url': url, 'status': status, 'count': len(teams),
        'sample_fields': list(teams[0].keys()) if teams else [],
        'sample': teams[:2] if teams else [],
    }
    print(f"  ✅ {len(teams)} teams | fields: {list(teams[0].keys()) if teams else 'none'}")
except Exception as e:
    results['endpoints']['team_powerplay'] = {'error': str(e)}
    print(f"  ❌ {e}")

# ── 3. NHL Team Penalty Kill ──────────────────────────────────────────────
print("3. Team penalty kill...")
try:
    url = "https://api.nhle.com/stats/rest/en/team/penaltykill?cayenneExp=seasonId=20252026 and gameTypeId=3&sort=penaltyKillPct&limit=20"
    data, status = fetch(url)
    teams = data.get('data', [])
    results['endpoints']['team_penaltykill'] = {
        'url': url, 'status': status, 'count': len(teams),
        'sample_fields': list(teams[0].keys()) if teams else [],
        'sample': teams[:2] if teams else [],
    }
    print(f"  ✅ {len(teams)} teams | fields: {list(teams[0].keys()) if teams else 'none'}")
except Exception as e:
    results['endpoints']['team_penaltykill'] = {'error': str(e)}
    print(f"  ❌ {e}")

# ── 4. NHL Goalie Playoff Stats ───────────────────────────────────────────
print("4. Goalie playoff stats...")
try:
    url = "https://api.nhle.com/stats/rest/en/goalie/summary?cayenneExp=seasonId=20252026 and gameTypeId=3&sort=wins&limit=30"
    data, status = fetch(url)
    goalies = data.get('data', [])
    results['endpoints']['goalie_summary'] = {
        'url': url, 'status': status, 'count': len(goalies),
        'sample_fields': list(goalies[0].keys()) if goalies else [],
        'sample': goalies[:3] if goalies else [],
    }
    print(f"  ✅ {len(goalies)} goalies | fields: {list(goalies[0].keys()) if goalies else 'none'}")
except Exception as e:
    results['endpoints']['goalie_summary'] = {'error': str(e)}
    print(f"  ❌ {e}")

# ── 5. NHL Team Shot Quality (Fenwick/Corsi proxy) ────────────────────────
print("5. Team shot attempts (Corsi proxy)...")
try:
    url = "https://api.nhle.com/stats/rest/en/team/shotshares?cayenneExp=seasonId=20252026 and gameTypeId=3&limit=20"
    data, status = fetch(url)
    teams = data.get('data', [])
    results['endpoints']['team_shotshares'] = {
        'url': url, 'status': status, 'count': len(teams),
        'sample_fields': list(teams[0].keys()) if teams else [],
        'sample': teams[:2] if teams else [],
    }
    print(f"  ✅ {len(teams)} teams | fields: {list(teams[0].keys()) if teams else 'none'}")
except Exception as e:
    # Try alternate endpoint
    try:
        url2 = "https://api.nhle.com/stats/rest/en/team/realtime?cayenneExp=seasonId=20252026 and gameTypeId=3&limit=20"
        data, status = fetch(url2)
        teams = data.get('data', [])
        results['endpoints']['team_shotshares'] = {
            'url': url2, 'status': status, 'count': len(teams),
            'sample_fields': list(teams[0].keys()) if teams else [],
            'sample': teams[:2] if teams else [],
            'note': f'primary failed ({e}), used realtime endpoint'
        }
        print(f"  ✅ (realtime) {len(teams)} teams | fields: {list(teams[0].keys()) if teams else 'none'}")
    except Exception as e2:
        results['endpoints']['team_shotshares'] = {'error': str(e), 'alt_error': str(e2)}
        print(f"  ❌ both endpoints failed: {e} / {e2}")

# ── 6. Confirm team identifier field name ────────────────────────────────
print("6. Checking team identifier field...")
for endpoint_key in ['team_summary', 'team_powerplay', 'team_penaltykill']:
    ep = results['endpoints'].get(endpoint_key, {})
    sample = ep.get('sample', [{}])
    if sample:
        id_fields = [k for k in sample[0].keys() if 'team' in k.lower() or 'abbrev' in k.lower() or 'code' in k.lower() or 'id' in k.lower()]
        print(f"  {endpoint_key}: id candidates = {id_fields}")
        results['endpoints'][endpoint_key]['id_field_candidates'] = id_fields

# ── 7. Check goalie identifier ───────────────────────────────────────────
print("7. Checking goalie identifier field...")
ep = results['endpoints'].get('goalie_summary', {})
sample = ep.get('sample', [{}])
if sample:
    name_fields = [k for k in sample[0].keys() if 'name' in k.lower() or 'id' in k.lower()]
    print(f"  goalie_summary: name/id candidates = {name_fields}")
    if sample[0]:
        print(f"  Sample goalie: {sample[0]}")
    results['endpoints']['goalie_summary']['name_field_candidates'] = name_fields

# ── Save ─────────────────────────────────────────────────────────────────
outpath = f"outbox/nhl/nhl-analytics-probe-{TS}.json"
with open(outpath, 'w') as f:
    json.dump(results, f, indent=2)
print(f"\n✅ Probe saved: {outpath}")
