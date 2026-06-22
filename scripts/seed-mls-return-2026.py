#!/usr/bin/env python3
"""
Seed post-WC MLS schedule (July 19 – October 2026) into ARCHIVE_DB
regular_season_games. One-time backfill so context-assembler can resolve
'mls' on return weekend (July 19-20). MLS paused May 24 for the WC.

Source : relay /apisports/football/fixtures proxy (relay holds APISPORTS_KEY
         as a Worker secret — no key needed in CI)
Sink   : ARCHIVE_DB via relay /d1/execute (requires X-FIELD-Relay header)

INSERT OR IGNORE — never overwrites a game row that already carries scores.

Env required: none (relay proxy handles all credentials)

Audit artefact: outbox/mls-schedule-2026.json
"""

import json, os, sys, urllib.request, urllib.error
from datetime import datetime, timezone

RELAY     = os.environ.get("RELAY_URL", "https://field-relay-nba.jeffunglesbee.workers.dev").rstrip("/")
RELAY_HDR = {"X-FIELD-Relay": "field-relay-cron-2026", "Accept": "application/json"}
LEAGUE_ID = 253
SEASON    = 2026
DATE_FROM = "2026-07-19"
DATE_TO   = "2026-10-31"
BATCH     = 20

def fetch_fixtures():
    url = (f"{RELAY}/apisports/football/fixtures"
           f"?league={LEAGUE_ID}&season={SEASON}"
           f"&from={DATE_FROM}&to={DATE_TO}")
    print(f"GET {url}")
    req = urllib.request.Request(url, headers=RELAY_HDR)
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.loads(r.read())
    errs = data.get("errors")
    if errs and any(errs.values() if isinstance(errs, dict) else [errs]):
        print(f"❌ api-sports errors: {errs}")
        sys.exit(1)
    fixtures = data.get("response", [])
    print(f"✅ {len(fixtures)} fixtures returned")
    return fixtures

def to_row(fx):
    date = (fx.get("fixture", {}).get("date") or "")[:10]
    home = (fx.get("teams", {}).get("home", {}) or {}).get("name") or ""
    away = (fx.get("teams", {}).get("away", {}) or {}).get("name") or ""
    if not date or not home or not away:
        return None
    home_abbr = home[:5].lower().replace(" ", "")
    away_abbr = away[:5].lower().replace(" ", "")
    return {
        "id":         f"{date}-mls-{home_abbr}-{away_abbr}",
        "date":       date,
        "sport":      "MLS",
        "home":       home,
        "away":       away,
        "home_score": None,
        "away_score": None,
    }

def sql_escape(v):
    if v is None:
        return "NULL"
    return "'" + str(v).replace("'", "''") + "'"

def build_batch_sql(rows):
    values = []
    for r in rows:
        values.append(
            "(" + ",".join([
                sql_escape(r["id"]),
                sql_escape(r["date"]),
                sql_escape(r["sport"]),
                sql_escape(r["home"]),
                sql_escape(r["away"]),
                "NULL",
                "NULL",
            ]) + ")"
        )
    return ("INSERT OR IGNORE INTO regular_season_games "
            "(id, date, sport, home, away, home_score, away_score) VALUES "
            + ",".join(values))

def post_d1(sql):
    url  = f"{RELAY}/d1/execute"
    body = json.dumps({"sql": sql}).encode("utf-8")
    headers = {**RELAY_HDR, "Content-Type": "application/json", "Content-Length": str(len(body))}
    req  = urllib.request.Request(url, data=body, method="POST", headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        return {"ok": False, "status": e.code, "body": e.read().decode("utf-8", "replace")[:300]}
    except Exception as e:
        return {"ok": False, "error": str(e)}

def main():
    fixtures = fetch_fixtures()
    rows = [r for r in (to_row(f) for f in fixtures) if r]
    print(f"✅ {len(rows)} valid rows")

    os.makedirs("outbox", exist_ok=True)
    audit = {
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "league": LEAGUE_ID, "season": SEASON,
        "from": DATE_FROM, "to": DATE_TO,
        "count": len(rows), "rows": rows,
    }
    with open("outbox/mls-schedule-2026.json", "w") as f:
        json.dump(audit, f, indent=2)
    print("✅ outbox/mls-schedule-2026.json written")

    inserted = 0
    for i in range(0, len(rows), BATCH):
        chunk = rows[i:i+BATCH]
        sql = build_batch_sql(chunk)
        resp = post_d1(sql)
        ok = resp.get("success") or resp.get("ok")
        if ok:
            inserted += len(chunk)
            print(f"  batch {i//BATCH + 1}: {len(chunk)} rows OK")
        else:
            print(f"  batch {i//BATCH + 1}: FAILED — {resp}")

    print(f"\n✅ Done — {inserted}/{len(rows)} rows attempted via INSERT OR IGNORE")
    if inserted < len(rows):
        sys.exit(1)

if __name__ == "__main__":
    main()
