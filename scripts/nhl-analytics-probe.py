#!/usr/bin/env python3
"""
NHL Analytics Probe — runs before building any hardcoded lookup tables.
Confirms: API endpoints, field names, key formats, data availability.
Lesson from MLB: never guess column names or key formats.
Output: outbox/nhl/nhl-analytics-probe-{timestamp}.json
"""
import urllib.request, urllib.parse, json, os, datetime

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

def nhl_stats_url(endpoint, cayenne_exp, sort=None, limit=30):
    """Build properly encoded NHL stats API URL."""
    params = {'cayenneExp': cayenne_exp, 'limit': limit}
    if sort:
        params['sort'] = sort
    base = f"https://api.nhle.com/stats/rest/en/{endpoint}"
    return base + '?' + urllib.parse.urlencode(params)

results = {'timestamp': TS, 'endpoints': {}}

CAYENNE = "seasonId=20252026 and gameTypeId=3"

# ── 1. NHL Team Playoff Summary (Corsi, goals, shots) ─────────────────────
print("1. Team playoff summary...")
try:
    url = nhl_stats_url("team/summary", CAYENNE, sort="points", limit=20)
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

# ── 2. NHL Team Special Teams (PP%) ─────────────────────────────────────
print("2. Team powerplay...")
try:
    url = nhl_stats_url("team/powerplay", CAYENNE, sort="powerPlayPct", limit=20)
    data, status = fetch(url)
    teams = data.get('data', [])
    results['endpoints']['team_powerplay'] = {
        'url': url, 'status': status, 'count': len(teams),
        'sample_fields': list(teams[0].keys()) if teams else [],
        'sample': teams[:3] if teams else [],
    }
    print(f"  ✅ {len(teams)} teams | fields: {list(teams[0].keys()) if teams else 'none'}")
except Exception as e:
    results['endpoints']['team_powerplay'] = {'error': str(e)}
    print(f"  ❌ {e}")

# ── 3. NHL Team Penalty Kill ──────────────────────────────────────────────
print("3. Team penalty kill...")
try:
    url = nhl_stats_url("team/penaltykill", CAYENNE, sort="penaltyKillPct", limit=20)
    data, status = fetch(url)
    teams = data.get('data', [])
    results['endpoints']['team_penaltykill'] = {
        'url': url, 'status': status, 'count': len(teams),
        'sample_fields': list(teams[0].keys()) if teams else [],
        'sample': teams[:3] if teams else [],
    }
    print(f"  ✅ {len(teams)} teams | fields: {list(teams[0].keys()) if teams else 'none'}")
except Exception as e:
    results['endpoints']['team_penaltykill'] = {'error': str(e)}
    print(f"  ❌ {e}")

# ── 4. NHL Goalie Playoff Stats ───────────────────────────────────────────
print("4. Goalie playoff stats...")
try:
    url = nhl_stats_url("goalie/summary", CAYENNE, sort="wins", limit=30)
    data, status = fetch(url)
    goalies = data.get('data', [])
    results['endpoints']['goalie_summary'] = {
        'url': url, 'status': status, 'count': len(goalies),
        'sample_fields': list(goalies[0].keys()) if goalies else [],
        'sample': goalies[:4] if goalies else [],
    }
    print(f"  ✅ {len(goalies)} goalies | fields: {list(goalies[0].keys()) if goalies else 'none'}")
except Exception as e:
    results['endpoints']['goalie_summary'] = {'error': str(e)}
    print(f"  ❌ {e}")

# ── 5. NHL Team Shot Shares (Corsi/Fenwick proxy) ────────────────────────
print("5. Team shot shares...")
for stat_type in ["team/shotshares", "team/realtime"]:
    try:
        url = nhl_stats_url(stat_type, CAYENNE, limit=20)
        data, status = fetch(url)
        teams = data.get('data', [])
        results['endpoints']['team_shotshares'] = {
            'url': url, 'status': status, 'count': len(teams), 'stat_type': stat_type,
            'sample_fields': list(teams[0].keys()) if teams else [],
            'sample': teams[:2] if teams else [],
        }
        print(f"  ✅ ({stat_type}) {len(teams)} teams | fields: {list(teams[0].keys()) if teams else 'none'}")
        break
    except Exception as e:
        results['endpoints']['team_shotshares'] = results['endpoints'].get('team_shotshares', {})
        results['endpoints']['team_shotshares'][f'error_{stat_type}'] = str(e)
        print(f"  ⚠️  {stat_type}: {e}")

# ── 6. Confirm team + goalie identifier field names ──────────────────────
print("6. Key format analysis...")
for ep_key in ['team_summary', 'team_powerplay', 'team_penaltykill', 'team_shotshares']:
    ep = results['endpoints'].get(ep_key, {})
    sample = ep.get('sample', [])
    if sample:
        s = sample[0]
        id_fields = {k: s[k] for k in s if any(x in k.lower() for x in ['team','abbrev','code','name']) and k in s}
        ep['id_field_map'] = id_fields
        print(f"  {ep_key}: {id_fields}")

ep = results['endpoints'].get('goalie_summary', {})
sample = ep.get('sample', [])
if sample:
    s = sample[0]
    id_fields = {k: s[k] for k in s if any(x in k.lower() for x in ['name','id','team','abbrev'])}
    ep['id_field_map'] = id_fields
    print(f"  goalie_summary: {id_fields}")

# ── Save ─────────────────────────────────────────────────────────────────
outpath = f"outbox/nhl/nhl-analytics-probe-{TS}.json"
with open(outpath, 'w') as f:
    json.dump(results, f, indent=2)
print(f"\n✅ Probe saved: {outpath}")
