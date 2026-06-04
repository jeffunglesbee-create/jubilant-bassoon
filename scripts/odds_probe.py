#!/usr/bin/env python3
"""
FIELD Odds API Probe
Tests: soccer_fifa_world_cup coverage, totals market, h2h_lay (Betfair), MLS active league
Run via: python3 scripts/odds_probe.py
CI writes output to: outbox/odds/probe-{TS}.txt
"""
import urllib.request, json, sys

RELAY = "https://field-relay-nba.jeffunglesbee.workers.dev"


def fetch(path):
    url = RELAY + "/odds" + path
    try:
        req = urllib.request.Request(url, headers={
            "User-Agent": "FIELD-probe/1.0",
            "Accept": "application/json"
        })
        with urllib.request.urlopen(req, timeout=20) as r:
            headers = dict(r.headers)
            body = r.read().decode()
            remaining = headers.get("x-requests-remaining",
                        headers.get("X-Requests-Remaining", "?"))
            used = headers.get("x-requests-used",
                   headers.get("X-Requests-Used", "?"))
            return json.loads(body), remaining, used
    except Exception as e:
        return {"error": str(e)}, "?", "?"


def fmt_outcomes(outcomes):
    return [(o.get("name"), o.get("price"), o.get("point", "")) for o in outcomes]


# ── 1. USAGE ──────────────────────────────────────────────────────────────────
print("\n=== 1. API KEY USAGE")
data, rem, used = fetch("/v4/usage")
print(json.dumps(data, indent=2))
print(f"  remaining={rem} used={used}")

# ── 2. ALL SPORTS — WC key status ────────────────────────────────────────────
print("\n=== 2. ALL SPORTS (soccer_fifa_world_cup status)")
data, rem, used = fetch("/v4/sports?all=true")
if isinstance(data, list):
    soccer = [s for s in data if "soccer" in s.get("key", "").lower()
              or "football" in s.get("group", "").lower()]
    print(f"  Soccer sport keys ({len(soccer)} total):")
    for s in soccer:
        print(f"    {s.get('key','?'):<50s} active={s.get('active')} | {s.get('title','')}")
    wc = next((s for s in data if s.get("key") == "soccer_fifa_world_cup"), None)
    print(f"\n  WC KEY DETAIL:\n{json.dumps(wc, indent=4)}")
else:
    print(json.dumps(data))
print(f"  remaining={rem}")

# ── 3. WC h2h odds — next 10 days ────────────────────────────────────────────
print("\n=== 3. WC ODDS — h2h (daysFrom=10)")
data, rem, used = fetch("/v4/sports/soccer_fifa_world_cup/odds?markets=h2h&regions=us&daysFrom=10")
if isinstance(data, list):
    print(f"  WC games with h2h odds: {len(data)}")
    for g in data[:3]:
        print(f"  {g.get('commence_time','?')[:16]} | {g.get('home_team')} vs {g.get('away_team')}")
        for b in g.get("bookmakers", [])[:1]:
            for m in b.get("markets", []):
                print(f"    [{b['key']}] {m['key']}: {fmt_outcomes(m.get('outcomes', []))}")
elif isinstance(data, dict) and "error" in data:
    print(f"  ERROR: {data}")
else:
    print(str(data)[:400])
print(f"  remaining={rem}")

# ── 4. WC h2h + totals ───────────────────────────────────────────────────────
print("\n=== 4. WC ODDS — h2h + totals (CRITICAL: does totals work for WC?)")
data, rem, used = fetch("/v4/sports/soccer_fifa_world_cup/odds?markets=h2h,totals&regions=us&daysFrom=10")
if isinstance(data, list):
    print(f"  WC games with h2h+totals: {len(data)}")
    for g in data[:2]:
        print(f"  {g.get('commence_time','?')[:16]} | {g.get('home_team')} vs {g.get('away_team')}")
        all_mkt_keys = sorted(set(m["key"] for b in g.get("bookmakers", []) for m in b.get("markets", [])))
        print(f"  All market keys: {all_mkt_keys}")
        for b in g.get("bookmakers", [])[:1]:
            for m in b.get("markets", []):
                if m["key"] == "totals":
                    print(f"    [{b['key']}] TOTALS: {fmt_outcomes(m.get('outcomes', []))}")
elif isinstance(data, dict) and "error" in data:
    print(f"  ERROR: {data}")
else:
    print(str(data)[:400])
print(f"  remaining={rem}")

# ── 5. WC h2h_lay — Betfair Exchange ─────────────────────────────────────────
print("\n=== 5. WC ODDS — h2h + h2h_lay (Betfair Exchange?)")
data, rem, used = fetch("/v4/sports/soccer_fifa_world_cup/odds?markets=h2h,h2h_lay&regions=us,eu&daysFrom=10")
if isinstance(data, list):
    print(f"  WC games: {len(data)}")
    for g in data[:2]:
        all_books = g.get("bookmakers", [])
        ex = [b for b in all_books if any(x in b.get("key", "") for x in ["betfair", "exchange", "matchbook"])]
        all_mkt_keys = sorted(set(m["key"] for b in all_books for m in b.get("markets", [])))
        print(f"  Bookmakers: {len(all_books)} | Exchange books: {[b['key'] for b in ex]}")
        print(f"  Market keys: {all_mkt_keys}")
        for b in ex[:1]:
            for m in b.get("markets", []):
                print(f"    [{b['key']}] {m['key']}: {fmt_outcomes(m.get('outcomes', []))}")
elif isinstance(data, dict) and "error" in data:
    print(f"  ERROR: {data}")
else:
    print(str(data)[:400])
print(f"  remaining={rem}")

# ── 6. MLS — active league control test ──────────────────────────────────────
print("\n=== 6. MLS (active) — h2h + totals + h2h_lay control test")
data, rem, used = fetch("/v4/sports/soccer_usa_mls/odds?markets=h2h,totals,h2h_lay&regions=us,eu")
if isinstance(data, list):
    print(f"  MLS games: {len(data)}")
    for g in data[:2]:
        print(f"  {g.get('commence_time','?')[:16]} | {g.get('home_team')} vs {g.get('away_team')}")
        all_books = g.get("bookmakers", [])
        all_mkt_keys = sorted(set(m["key"] for b in all_books for m in b.get("markets", [])))
        ex = [b["key"] for b in all_books if any(x in b.get("key", "") for x in ["betfair", "exchange", "matchbook"])]
        print(f"  All markets: {all_mkt_keys}")
        print(f"  Exchange books: {ex}")
        for b in all_books[:1]:
            for m in b.get("markets", []):
                if m["key"] in ("totals", "h2h_lay"):
                    print(f"    [{b['key']}] {m['key']}: {fmt_outcomes(m.get('outcomes', []))}")
elif isinstance(data, dict) and "error" in data:
    print(f"  ERROR: {data}")
else:
    print(str(data)[:400])
print(f"  remaining={rem}")

# ── 7. WC events list ─────────────────────────────────────────────────────────
print("\n=== 7. WC EVENTS (upcoming, daysFrom=10)")
data, rem, used = fetch("/v4/sports/soccer_fifa_world_cup/events?daysFrom=10")
if isinstance(data, list):
    print(f"  WC events available: {len(data)}")
    for e in data[:5]:
        print(f"  {e.get('id','?')} | {e.get('commence_time','?')[:16]} | {e.get('home_team')} vs {e.get('away_team')}")
elif isinstance(data, dict) and "error" in data:
    print(f"  ERROR: {data}")
else:
    print(str(data)[:400])
print(f"  remaining={rem}")

print("\n=== PROBE COMPLETE")
