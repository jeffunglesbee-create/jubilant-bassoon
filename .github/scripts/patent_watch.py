#!/usr/bin/env python3
"""
Weekly patent watcher.

Scans the most recent week's USPTO grant XML and pre-grant publication XML
for assignees in .github/patent-watchlist.txt. Files a GitHub issue per
week when matches are found.

Filename conventions:
  Grants:       ipgYYMMDD.zip (Tuesday)
  Applications: ipaYYMMDD.zip (Thursday)

USPTO bulk data is published the same day as the Official Gazette - no
embargo, no rate limits, no API key required.
"""

import json
import os
import re
import sys
import zipfile
from datetime import datetime, timedelta
from io import BytesIO
from pathlib import Path

import requests

OUTBOX = Path("outbox/patents")
OUTBOX.mkdir(parents=True, exist_ok=True)
WATCHLIST_PATH = Path(".github/patent-watchlist.txt")

USPTO_GRANT_BASE = "https://bulkdata.uspto.gov/data/patent/grant/redbook/fulltext"
USPTO_PGPUB_BASE = "https://bulkdata.uspto.gov/data/patent/application/redbook/fulltext"
UA = "jubilant-bassoon/patent-watch (research)"

def write_github_output(key: str, value: str):
    """Write key=value to $GITHUB_OUTPUT when running in GitHub Actions.
    No-op locally."""
    output_file = os.environ.get("GITHUB_OUTPUT", "").strip()
    if not output_file:
        return
    try:
        with open(output_file, "a") as f:
            f.write(f"{key}={value}\n")
    except OSError as e:
        print(f"  Could not write GITHUB_OUTPUT: {e}")



def last_tuesday(today=None):
    today = today or datetime.utcnow()
    days_back = (today.weekday() - 1) % 7  # Tuesday=1
    if days_back == 0 and today.hour < 16:
        days_back = 7
    return today - timedelta(days=days_back)


def thursday_of_week(tuesday: datetime) -> datetime:
    return tuesday + timedelta(days=2)


def load_watchlist():
    if not WATCHLIST_PATH.exists():
        print(f"No watchlist at {WATCHLIST_PATH}")
        return []
    lines = WATCHLIST_PATH.read_text().splitlines()
    return [l.strip() for l in lines if l.strip() and not l.startswith("#")]


def scan_bulk_xml(url: str, watchlist):
    """Stream-scan USPTO bulk XML for assignee matches."""
    print(f"  GET {url}")
    try:
        r = requests.get(url, headers={"User-Agent": UA}, timeout=300, stream=True)
    except requests.RequestException as e:
        print(f"    Error: {e}")
        return []
    if not r.ok:
        print(f"    HTTP {r.status_code} (file may not exist yet)")
        return []

    buf = BytesIO()
    for chunk in r.iter_content(chunk_size=1 << 20):
        buf.write(chunk)
    buf.seek(0)

    matches = []
    with zipfile.ZipFile(buf) as zf:
        xml_name = next((n for n in zf.namelist() if n.endswith(".xml")), None)
        if not xml_name:
            return []
        with zf.open(xml_name) as xf:
            current = []
            in_doc = False
            doc_kind = None
            for line_bytes in xf:
                line = line_bytes.decode("utf-8", errors="replace")
                if "<us-patent-grant" in line:
                    in_doc = True
                    doc_kind = "grant"
                    current = [line]
                    continue
                if "<us-patent-application" in line:
                    in_doc = True
                    doc_kind = "application"
                    current = [line]
                    continue
                if in_doc:
                    current.append(line)
                    if "</us-patent-grant>" in line or "</us-patent-application>" in line:
                        block = "".join(current)
                        block_lower = block.lower()
                        for watch in watchlist:
                            if watch.lower() in block_lower:
                                num_m = re.search(r"<doc-number>(\d+)</doc-number>", block)
                                title_m = re.search(
                                    r"<invention-title[^>]*>(.*?)</invention-title>",
                                    block,
                                    re.DOTALL,
                                )
                                title = re.sub(r"\s+", " ", re.sub(
                                    r"<[^>]+>",
                                    "",
                                    title_m.group(1) if title_m else "",
                                )).strip()
                                matches.append({
                                    "assignee_match": watch,
                                    "patent_id": num_m.group(1) if num_m else "?",
                                    "title": title[:200],
                                    "doc_kind": doc_kind,
                                })
                                break
                        in_doc = False
                        current = []
    return matches


def file_issue(matches, week: str, scope: str):
    if not matches:
        return
    token = os.environ.get("GH_TOKEN")
    repo = os.environ.get("GH_REPO")
    if not token or not repo:
        print("  No GH_TOKEN/GH_REPO; skipping issue creation")
        return

    body = [
        f"USPTO {scope} week ending {week}.",
        "",
        f"**{len(matches)} match(es) found** against watchlist.",
        "",
    ]
    for m in matches:
        body.append(
            f"- **US{m['patent_id']}** ({m['doc_kind']}): {m['title']} "
            f"-- matched on `{m['assignee_match']}`"
        )
    body.append("")
    body.append(
        "Run `patent-fulltext` workflow with these numbers to pull full claim text:"
    )
    body.append("```")
    body.append(f"gh workflow run patent-fulltext.yml -f patents={','.join(m['patent_id'] for m in matches)}")
    body.append("```")

    r = requests.post(
        f"https://api.github.com/repos/{repo}/issues",
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
        },
        json={
            "title": f"Patent watch ({scope}): {len(matches)} hit(s) - {week}",
            "body": "\n".join(body),
            "labels": ["patent-watch"],
            "assignees": [os.environ.get("GH_REPO", "/").split("/")[0]],
        },
        timeout=30,
    )
    if r.ok:
        print(f"  Issue filed: {r.json().get('html_url')}")
    else:
        print(f"  Issue creation failed: HTTP {r.status_code}: {r.text[:200]}")


def main():
    override = os.environ.get("WEEK_OVERRIDE", "").strip()
    if override:
        try:
            tue = datetime.strptime(override, "%Y-%m-%d")
        except ValueError:
            print(f"Bad WEEK_OVERRIDE: {override}")
            sys.exit(1)
    else:
        tue = last_tuesday()
    thu = thursday_of_week(tue)

    week_str = tue.strftime("%Y-%m-%d")
    grant_stem = f"ipg{tue.strftime('%y%m%d')}"
    pgpub_stem = f"ipa{thu.strftime('%y%m%d')}"

    watchlist = load_watchlist()
    if not watchlist:
        print("Empty watchlist; nothing to do.")
        return
    print(f"Watchlist ({len(watchlist)} entries):")
    for w in watchlist:
        print(f"  - {w}")
    print(f"Grant week: {week_str} (Tuesday)")
    print(f"PGPub week: {thu.strftime('%Y-%m-%d')} (Thursday)")

    all_matches = []

    print(f"\nScanning grants ({grant_stem}.zip)...")
    grant_url = f"{USPTO_GRANT_BASE}/{tue.year}/{grant_stem}.zip"
    grants = scan_bulk_xml(grant_url, watchlist)
    print(f"  {len(grants)} grant matches")
    file_issue(grants, week_str, "grants")
    all_matches.extend([{**m, "scan": "grants"} for m in grants])

    print(f"\nScanning pre-grant publications ({pgpub_stem}.zip)...")
    pgpub_url = f"{USPTO_PGPUB_BASE}/{thu.year}/{pgpub_stem}.zip"
    pgpubs = scan_bulk_xml(pgpub_url, watchlist)
    print(f"  {len(pgpubs)} PGPub matches")
    file_issue(pgpubs, week_str, "applications")
    all_matches.extend([{**m, "scan": "applications"} for m in pgpubs])

    manifest_path = OUTBOX / f"watch-{week_str}.json"
    manifest_path.write_text(json.dumps({
        "week_tuesday": week_str,
        "week_thursday": thu.strftime("%Y-%m-%d"),
        "watchlist": watchlist,
        "matches": all_matches,
    }, indent=2))
    print(f"\nSaved {manifest_path}")

    # Emit grant-only hits to $GITHUB_OUTPUT so the workflow can auto-chain
    # to patent-fulltext.yml. PGPub hits are NOT auto-chained because their
    # publication numbers route to a different PatentSearch endpoint.
    # Cap at 20 to prevent runaway followup workflows.
    GRANT_HITS_LIMIT = 20
    grant_ids = []
    seen = set()
    for m in all_matches:
        if m.get("scan") != "grants":
            continue
        pid = m.get("patent_id", "")
        if pid and pid != "?" and pid not in seen:
            seen.add(pid)
            grant_ids.append(pid)
        if len(grant_ids) >= GRANT_HITS_LIMIT:
            break
    grant_hits_csv = ",".join(grant_ids)
    write_github_output("grant_hits", grant_hits_csv)
    write_github_output("grant_hits_count", str(len(grant_ids)))
    if grant_ids:
        print(f"\nAuto-chain grant hits: {grant_hits_csv}")
    else:
        print(f"\nNo grant hits to auto-chain.")


if __name__ == "__main__":
    main()
