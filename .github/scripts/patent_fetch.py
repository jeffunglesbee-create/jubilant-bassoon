#!/usr/bin/env python3
"""
Patent full-text extractor.

Strategy:
  1. PatentSearch API (search.patentsview.org) - structured JSON. Fast, clean,
     includes claims, inventors, assignees, examiners, CPC, citations.
  2. USPTO bulk grant XML (bulkdata.uspto.gov) - authoritative weekly archives
     keyed by ipgYYMMDD.zip. Used when PatentSearch is incomplete.
  3. PDF + OCR is intentionally NOT used. Two-column patent OCR scrambles
     word order; the source XML is the right input.

Output per patent:
  outbox/patents/US{number}.json   - full structured data
  outbox/patents/US{number}.txt    - plain-text claims for Drive upload

Idempotent: identical content does not change file bytes.
"""

import json
import os
import re
import sys
import zipfile
from datetime import datetime
from io import BytesIO
from pathlib import Path
from urllib.parse import quote

import requests

OUTBOX = Path("outbox/patents")
OUTBOX.mkdir(parents=True, exist_ok=True)

UA = "jubilant-bassoon/patent-fetch (research)"
PATENTSVIEW_BASE = "https://search.patentsview.org/api/v1"
USPTO_BULK_BASE = "https://bulkdata.uspto.gov/data/patent/grant/redbook/fulltext"


def fetch_patentsview(patent_id: str, api_key):
    """Returns structured patent dict or None."""
    headers = {"User-Agent": UA}
    if api_key:
        headers["X-Api-Key"] = api_key

    # Metadata
    meta_q = json.dumps({"patent_id": patent_id})
    meta_fields = json.dumps([
        "patent_id", "patent_title", "patent_date", "patent_abstract",
        "patent_num_claims", "patent_type",
        "assignees.assignee_organization", "assignees.assignee_country",
        "inventors.inventor_name_first", "inventors.inventor_name_last",
        "examiners.examiner_name_first", "examiners.examiner_name_last",
        "cpc_current.cpc_subclass_id", "cpc_current.cpc_group_id",
        "us_application_citations.cited_patent_number",
    ])
    url = f"{PATENTSVIEW_BASE}/patent/?q={quote(meta_q)}&f={quote(meta_fields)}"
    try:
        r = requests.get(url, headers=headers, timeout=30)
    except requests.RequestException as e:
        print(f"  PatentSearch request error: {e}")
        return None
    if r.status_code in (403, 404):
        print(f"  PatentSearch HTTP {r.status_code} (no API key or not found)")
        return None
    if not r.ok:
        print(f"  PatentSearch HTTP {r.status_code}")
        return None
    meta_data = r.json()
    if meta_data.get("count", 0) == 0 or not meta_data.get("patents"):
        return None
    patent_meta = meta_data["patents"][0]

    # Claims
    claims_q = json.dumps({"patent_id": patent_id})
    claims_fields = json.dumps([
        "claim_sequence", "claim_text", "claim_dependent",
    ])
    opts = json.dumps({"size": 100})
    url = (
        f"{PATENTSVIEW_BASE}/g_claims/"
        f"?q={quote(claims_q)}&f={quote(claims_fields)}&o={quote(opts)}"
    )
    try:
        r = requests.get(url, headers=headers, timeout=30)
        if r.ok:
            claims_data = r.json()
            patent_meta["claims"] = claims_data.get("g_claims", [])
        else:
            patent_meta["claims"] = []
            patent_meta["claims_error"] = f"HTTP {r.status_code}"
    except requests.RequestException as e:
        patent_meta["claims"] = []
        patent_meta["claims_error"] = str(e)

    patent_meta["_source"] = "patentsview"
    return patent_meta


def fetch_uspto_bulk(patent_id: str, grant_date: str):
    """Fallback: USPTO bulk grant XML. grant_date format YYYY-MM-DD."""
    try:
        dt = datetime.strptime(grant_date, "%Y-%m-%d")
    except ValueError:
        print(f"  Bad grant_date format: {grant_date}")
        return None

    file_stem = f"ipg{dt.strftime('%y%m%d')}"
    url = f"{USPTO_BULK_BASE}/{dt.year}/{file_stem}.zip"
    print(f"  Downloading {url}...")

    try:
        r = requests.get(url, headers={"User-Agent": UA}, timeout=300, stream=True)
    except requests.RequestException as e:
        print(f"  Bulk fetch error: {e}")
        return None
    if not r.ok:
        print(f"  Bulk HTTP {r.status_code}")
        return None

    buf = BytesIO()
    for chunk in r.iter_content(chunk_size=1 << 20):
        buf.write(chunk)
    buf.seek(0)

    with zipfile.ZipFile(buf) as zf:
        xml_name = next((n for n in zf.namelist() if n.endswith(".xml")), None)
        if not xml_name:
            print("  No XML in zip")
            return None
        with zf.open(xml_name) as xf:
            patent_xml = _extract_one_patent(xf, patent_id)

    if not patent_xml:
        print(f"  Patent {patent_id} not found in {file_stem}.zip")
        return None

    # Parse claims out of the patent's XML block
    claims_raw = re.findall(
        r'<claim id="[^"]*">(.*?)</claim>',
        patent_xml,
        flags=re.DOTALL,
    )
    claims = []
    for i, c in enumerate(claims_raw, 1):
        text = re.sub(r"<[^>]+>", " ", c)
        text = re.sub(r"\s+", " ", text).strip()
        claims.append({"claim_sequence": str(i), "claim_text": text})

    # Pull title and dates from the block too
    title_m = re.search(
        r"<invention-title[^>]*>(.*?)</invention-title>",
        patent_xml,
        re.DOTALL,
    )
    title = re.sub(r"\s+", " ",
                   re.sub(r"<[^>]+>", "", title_m.group(1) if title_m else "")).strip()

    return {
        "patent_id": patent_id,
        "patent_title": title,
        "patent_date": grant_date,
        "claims": claims,
        "_source": "uspto_bulk_xml",
        "_source_url": url,
    }


def _extract_one_patent(stream, patent_id: str):
    """Stream-scan concatenated USPTO XML, return one patent's block."""
    target = patent_id.lstrip("0")
    buf = []
    in_patent = False
    is_target = False
    for line_bytes in stream:
        line = line_bytes.decode("utf-8", errors="replace")
        if "<us-patent-grant" in line:
            in_patent = True
            buf = [line]
            is_target = False
            continue
        if in_patent:
            buf.append(line)
            if not is_target and "<doc-number>" in line:
                m = re.search(r"<doc-number>(\d+)</doc-number>", line)
                if m and m.group(1).lstrip("0") == target:
                    is_target = True
            if "</us-patent-grant>" in line:
                if is_target:
                    return "".join(buf)
                in_patent = False
                buf = []
    return None


def write_outputs(patent_id: str, data: dict) -> None:
    json_path = OUTBOX / f"US{patent_id}.json"
    txt_path = OUTBOX / f"US{patent_id}.txt"

    payload = json.dumps(data, indent=2, sort_keys=True, ensure_ascii=False)

    if json_path.exists() and json_path.read_text() == payload:
        print(f"  US{patent_id}: unchanged, skipping")
        return

    json_path.write_text(payload)

    # Plain-text view for Drive upload
    lines = [f"US{patent_id}"]
    if data.get("patent_title"):
        lines.append(f"Title: {data['patent_title']}")
    if data.get("patent_date"):
        lines.append(f"Grant date: {data['patent_date']}")
    if data.get("assignees"):
        orgs = [a.get("assignee_organization", "") for a in data["assignees"]]
        orgs = [o for o in orgs if o]
        if orgs:
            lines.append(f"Assignee: {', '.join(orgs)}")
    if data.get("inventors"):
        invs = [
            f"{i.get('inventor_name_first', '')} {i.get('inventor_name_last', '')}".strip()
            for i in data["inventors"]
        ]
        invs = [i for i in invs if i]
        if invs:
            lines.append(f"Inventors: {', '.join(invs)}")
    if data.get("examiners"):
        exs = [
            f"{e.get('examiner_name_first', '')} {e.get('examiner_name_last', '')}".strip()
            for e in data["examiners"]
        ]
        exs = [e for e in exs if e]
        if exs:
            lines.append(f"Examiners: {', '.join(exs)}")
    lines.append(f"Source: {data.get('_source', 'unknown')}")
    lines.append("")
    lines.append("=" * 70)
    lines.append("CLAIMS")
    lines.append("=" * 70)
    lines.append("")
    for c in data.get("claims", []):
        seq = c.get("claim_sequence", "?")
        text = c.get("claim_text", "")
        dep = c.get("claim_dependent")
        marker = f"[dep on {dep}]" if dep else "[independent]"
        lines.append(f"Claim {seq} {marker}:")
        lines.append(text)
        lines.append("")
    txt_path.write_text("\n".join(lines))
    print(f"  US{patent_id}: wrote {json_path.name} + {txt_path.name}")


def main():
    if len(sys.argv) < 2:
        print("Usage: patent_fetch.py <patent_number>[,<patent_number>...]")
        sys.exit(1)

    patents = [p.strip() for p in sys.argv[1].split(",") if p.strip()]
    api_key = os.environ.get("PATENTSVIEW_API_KEY", "").strip() or None
    if not api_key:
        print("Note: PATENTSVIEW_API_KEY not set; using anon access.")

    for p in patents:
        clean = re.sub(r"^US|B\d?$", "", p, flags=re.IGNORECASE).strip()
        print(f"\nFetching US{clean}...")

        data = fetch_patentsview(clean, api_key)

        # If PatentSearch gave us metadata but no claims, try bulk for claims.
        needs_bulk = (
            data is None
            or not data.get("claims")
            or len(data.get("claims", [])) == 0
        )
        if needs_bulk:
            print("  PatentSearch miss or no claims; trying USPTO bulk XML...")
            grant_date = (data or {}).get("patent_date")
            if not grant_date:
                print(f"  No grant date; cannot derive bulk filename.")
                print(f"  US{clean}: only partial data saved.")
                if data:
                    write_outputs(clean, data)
                continue
            bulk_data = fetch_uspto_bulk(clean, grant_date)
            if bulk_data:
                # Merge: keep PatentSearch metadata, use bulk claims if better
                if data:
                    data["claims"] = bulk_data.get("claims", data.get("claims", []))
                    data["_source"] = "patentsview+bulk"
                else:
                    data = bulk_data

        if not data:
            print(f"  FAIL: could not retrieve US{clean}")
            continue
        write_outputs(clean, data)


if __name__ == "__main__":
    main()
