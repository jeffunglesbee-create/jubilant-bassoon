#!/usr/bin/env python3
"""
Seed post-WC MLS schedule (July 19 – October 2026) into ARCHIVE_DB.
Uses relay POST /fixtures/fetch — all credentials server-side in the Worker.
No APISPORTS_KEY or CF tokens needed in CI.

Audit artefact: outbox/mls-schedule-2026.json
"""

import json, os, sys, urllib.request, urllib.error
from datetime import datetime, timezone

RELAY     = os.environ.get("RELAY_URL", "https://field-relay-nba.jeffunglesbee.workers.dev").rstrip("/")
RELAY_HDR = {"X-FIELD-Relay": "field-relay-cron-2026", "Content-Type": "application/json"}

def fetch_and_seed():
    url  = f"{RELAY}/fixtures/fetch"
    body = json.dumps({
        "league": 253,
        "season": 2026,
        "from":   "2026-07-19",
        "to":     "2026-10-31",
        "sport":  "MLS",
    }).encode("utf-8")
    headers = {**RELAY_HDR, "Content-Length": str(len(body))}
    req = urllib.request.Request(url, data=body, method="POST", headers=headers)
    print(f"POST {url}")
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        return {"ok": False, "status": e.code, "body": e.read().decode("utf-8", "replace")[:300]}
    except Exception as e:
        return {"ok": False, "error": str(e)}

def main():
    result = fetch_and_seed()
    print(f"Result: {json.dumps(result, indent=2)}")

    os.makedirs("outbox", exist_ok=True)
    audit = {
        "ran_at":   datetime.now(timezone.utc).isoformat(),
        "endpoint": "/fixtures/fetch",
        "result":   result,
    }
    with open("outbox/mls-schedule-2026.json", "w") as f:
        json.dump(audit, f, indent=2)
    print("✅ outbox/mls-schedule-2026.json written")

    if not result.get("ok"):
        print(f"❌ Seed failed")
        sys.exit(1)

    fetched  = result.get("fetched", 0)
    inserted = result.get("inserted", 0)
    print(f"✅ Done — fetched:{fetched} inserted:{inserted}")
    if fetched == 0:
        print("⚠️  No fixtures returned — check league/season/date params")
        sys.exit(1)

if __name__ == "__main__":
    main()
