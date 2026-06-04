#!/usr/bin/env python3
"""
Patent full-text extractor — PPUBS edition.

Background (June 2026): The USPTO data landscape changed under us this year.
  - PatentsView API (search.patentsview.org) shut down 2026-03-20.
  - bulkdata.uspto.gov host DNS-deleted as part of ODP migration.
  - ODP API (api.uspto.gov) is the new official surface BUT requires an
    API key gated by ID.me video verification (one-time, ~30 min).

This script uses USPTO Patent Public Search (PPUBS) at ppubs.uspto.gov,
which is the same backend the public web tool uses. PPUBS requires no
API key and no ID.me — it uses an anonymous session-token model.

Reference implementation: github.com/riemannzeta/patent_mcp_server (MIT),
which itself credits parkerhancock/patent_client for reverse-engineering
the PPUBS request sequence. The request pattern here is a synchronous
port of just enough of that code to get claims out.

PPUBS request sequence:
  1. GET  /pubwebapp/                          (prime cookies)
  2. POST /api/users/me/session  body=-1       (get caseId + X-Access-Token)
  3. POST /api/searches/counts                 (search "<num>.pn." in USPAT)
  4. POST /api/searches/searchWithBeFamily     (get GUID for patent)
  5. GET  /api/patents/highlight/<guid>        (full document JSON w/ sections)

Input format:
  patent_fetch.py "10846193"
  patent_fetch.py "10846193,11182537,8335848"
  patent_fetch.py "10846193:2020-11-24"     # date suffix accepted but ignored

Output per patent:
  outbox/patents/US{number}.json   - full structured data
  outbox/patents/US{number}.txt    - plain-text claims for Drive upload
  outbox/patents/_lastrun.log      - run log (committed on failure for diagnostics)
  outbox/patents/_ppubs_dump_{number}.json  - raw PPUBS response, for the
                                              first patent in the batch only,
                                              to verify field mapping

Idempotent: identical content does not change file bytes.
"""

import json
import os
import re
import sys
from pathlib import Path

import requests

OUTBOX = Path("outbox/patents")
OUTBOX.mkdir(parents=True, exist_ok=True)

PPUBS_BASE = "https://ppubs.uspto.gov"
UA = "Mozilla/5.0 (X11; Linux x86_64) jubilant-bassoon/patents-pipeline"
TIMEOUT = 60


# ---------------------------------------------------------------------------
# Session
# ---------------------------------------------------------------------------

def ppubs_session():
    """Establish an anonymous PPUBS session.
    Returns a requests.Session with caseId/token baked in, or None on failure."""
    s = requests.Session()
    s.headers.update({
        "X-Requested-With": "XMLHttpRequest",
        "User-Agent": UA,
        "Origin": PPUBS_BASE,
        "Referer": f"{PPUBS_BASE}/pubwebapp/",
        "Pragma": "no-cache",
        "Cache-Control": "no-cache",
    })

    # Prime cookies
    try:
        r = s.get(f"{PPUBS_BASE}/pubwebapp/", timeout=TIMEOUT)
        print(f"  [ppubs] prime: HTTP {r.status_code}")
    except requests.RequestException as e:
        print(f"  [ppubs] prime error: {e}")
        return None

    # Create session
    try:
        r = s.post(
            f"{PPUBS_BASE}/api/users/me/session",
            json=-1,
            headers={"X-Access-Token": "null", "referer": f"{PPUBS_BASE}/pubwebapp/"},
            timeout=TIMEOUT,
        )
    except requests.RequestException as e:
        print(f"  [ppubs] session error: {e}")
        return None

    if r.status_code != 200:
        print(f"  [ppubs] session HTTP {r.status_code}: {r.text[:200]}")
        return None

    try:
        sess = r.json()
        case_id = sess["userCase"]["caseId"]
    except (ValueError, KeyError) as e:
        print(f"  [ppubs] session parse error: {e}")
        return None

    token = r.headers.get("X-Access-Token") or r.headers.get("x-access-token")
    if not token:
        print("  [ppubs] no X-Access-Token in response headers")
        return None

    s.headers["X-Access-Token"] = token
    s._case_id = case_id  # attach for later use
    print(f"  [ppubs] session ok: caseId={case_id}")
    return s


# ---------------------------------------------------------------------------
# Search by patent number
# ---------------------------------------------------------------------------

def ppubs_find_guid(s, patent_number):
    """Search PPUBS USPAT source for the patent number, return (guid, source_type)."""
    case_id = s._case_id

    # Build the search query body. The .pn. operator is the legacy PatFT
    # patent-number field; PPUBS still accepts it for granted patents.
    query_str = f'"{patent_number}".pn.'

    query_body = {
        "caseId": case_id,
        "hl_snippets": "2",
        "op": "OR",
        "q": query_str,
        "queryName": query_str,
        "highlights": "1",
        "qt": "brs",
        "spellCheck": False,
        "viewName": "tile",
        "plurals": True,
        "britishEquivalents": True,
        "databaseFilters": [
            {"databaseName": "USPAT", "countryCodes": []},
        ],
        "searchType": 1,
        "ignorePersist": True,
        "userEnteredQuery": query_str,
    }

    full_body = {
        "start": 0,
        "pageCount": 1,
        "sort": "date_publ desc",
        "docFamilyFiltering": "familyIdFiltering",
        "searchType": 1,
        "familyIdEnglishOnly": True,
        "familyIdFirstPreferred": "US-PGPUB",
        "familyIdSecondPreferred": "USPAT",
        "familyIdThirdPreferred": "FPRS",
        "showDocPerFamilyPref": "showEnglish",
        "queryId": 0,
        "tagDocSearch": False,
        "query": query_body,
    }

    # Counts call (PPUBS requires this before search)
    try:
        r = s.post(f"{PPUBS_BASE}/api/searches/counts", json=query_body, timeout=TIMEOUT)
        print(f"  [ppubs] counts: HTTP {r.status_code}")
    except requests.RequestException as e:
        print(f"  [ppubs] counts error: {e}")
        return None, None

    # Actual search
    try:
        r = s.post(
            f"{PPUBS_BASE}/api/searches/searchWithBeFamily",
            json=full_body,
            timeout=TIMEOUT,
        )
    except requests.RequestException as e:
        print(f"  [ppubs] search error: {e}")
        return None, None

    if r.status_code != 200:
        print(f"  [ppubs] search HTTP {r.status_code}: {r.text[:200]}")
        return None, None

    try:
        result = r.json()
    except ValueError:
        print(f"  [ppubs] search parse error")
        return None, None

    # Patent list is under "patents" or "docs" depending on response shape
    patents = result.get("patents") or result.get("docs") or []
    if not patents:
        # Could be under nested structure; dump for debug
        print(f"  [ppubs] no results for {patent_number}")
        print(f"  [ppubs] response keys: {list(result.keys())}")
        return None, None

    doc = patents[0]
    guid = doc.get("guid")
    src_type = doc.get("type") or "USPAT"
    return guid, src_type


# ---------------------------------------------------------------------------
# Document retrieval
# ---------------------------------------------------------------------------

def ppubs_get_document(s, guid, src_type):
    """Fetch the full document JSON including all sections (claims, etc)."""
    url = f"{PPUBS_BASE}/api/patents/highlight/{guid}"
    params = {
        "queryId": 1,
        "source": src_type,
        "includeSections": "true",
        "uniqueId": "null",
    }
    try:
        r = s.get(url, params=params, timeout=TIMEOUT)
    except requests.RequestException as e:
        print(f"  [ppubs] document error: {e}")
        return None

    if r.status_code != 200:
        print(f"  [ppubs] document HTTP {r.status_code}: {r.text[:200]}")
        return None

    try:
        return r.json()
    except ValueError:
        print(f"  [ppubs] document parse error")
        return None


# ---------------------------------------------------------------------------
# Claim extraction (defensive; PPUBS structure not officially documented)
# ---------------------------------------------------------------------------

CLAIM_NUM_RE = re.compile(r"^\s*(\d+)\s*\.\s*")
DEP_RE = re.compile(
    r"(?:claim|the\s+\w+\s+of\s+claim|method\s+of\s+claim|system\s+of\s+claim)\s+(\d+)",
    re.IGNORECASE,
)


def _strip_html(text):
    """Quick-and-dirty HTML tag strip; PPUBS responses include <highlight> spans."""
    if not text:
        return ""
    return re.sub(r"<[^>]+>", "", text).strip()


def extract_claims(doc):
    """Parse claims out of a PPUBS document response.

    PPUBS document JSON has the full patent text under various keys depending
    on the API version. Common locations: 'claimSection', 'claims',
    'sections.claims', or as part of 'document_structure'. We try several
    paths and fall back to regex parsing on plain text.
    """
    claims_raw = None
    # Try direct keys first
    for key in ("claimSection", "claims", "claim", "claimText"):
        if key in doc and doc[key]:
            claims_raw = doc[key]
            break

    # Try nested under sections
    if claims_raw is None and "sections" in doc:
        sec = doc["sections"]
        if isinstance(sec, dict):
            claims_raw = sec.get("claims") or sec.get("claimSection")
        elif isinstance(sec, list):
            for item in sec:
                if isinstance(item, dict) and item.get("name", "").lower() in (
                    "claims", "claim", "claimsection"
                ):
                    claims_raw = item.get("text") or item.get("content") or item
                    break

    # Try patentDocument.claimsSection or similar nesting
    if claims_raw is None and "patentDocument" in doc:
        pd = doc["patentDocument"]
        if isinstance(pd, dict):
            claims_raw = pd.get("claimsSection") or pd.get("claims")

    if claims_raw is None:
        return []

    # Normalize to a single string
    if isinstance(claims_raw, list):
        claims_text = "\n\n".join(str(c) for c in claims_raw)
    elif isinstance(claims_raw, dict):
        claims_text = claims_raw.get("text") or claims_raw.get("content") or json.dumps(claims_raw)
    else:
        claims_text = str(claims_raw)

    claims_text = _strip_html(claims_text)

    # Split on claim number boundaries: "1. ..." "2. ..." etc
    # Each claim starts with a number followed by period at line start
    parts = re.split(r"\n\s*(\d+)\s*\.\s*", "\n" + claims_text)
    # parts looks like ['', '1', 'A method ...', '2', 'The method ...', ...]
    claims = []
    i = 1
    while i < len(parts) - 1:
        try:
            seq = int(parts[i])
            text = parts[i + 1].strip()
            dep_match = DEP_RE.search(text[:120])  # only look in opening words
            claim_dep = int(dep_match.group(1)) if dep_match else None
            claims.append({
                "claim_sequence": seq,
                "claim_text": text,
                "claim_dependent": claim_dep,
            })
        except (ValueError, IndexError):
            pass
        i += 2

    return claims


def extract_metadata(doc):
    """Pull title/date/assignees/inventors from a PPUBS document response.
    Best-effort; PPUBS field names not officially documented."""
    title = (
        doc.get("title")
        or doc.get("inventionTitle")
        or doc.get("patentTitle")
        or ""
    )
    # Strip HTML if present
    title = _strip_html(title)

    grant_date = (
        doc.get("datePublished")
        or doc.get("publicationDate")
        or doc.get("grantDate")
        or doc.get("patentDate")
        or doc.get("date_publ")
        or ""
    )

    # Assignees: list of dicts or strings
    assignees = []
    asg_raw = doc.get("assignees") or doc.get("assignee") or []
    if isinstance(asg_raw, list):
        for a in asg_raw:
            if isinstance(a, dict):
                org = a.get("organizationName") or a.get("name") or a.get("orgname") or ""
                if org:
                    assignees.append({"assignee_organization": _strip_html(org)})
            elif isinstance(a, str):
                assignees.append({"assignee_organization": _strip_html(a)})

    # Inventors
    inventors = []
    inv_raw = doc.get("inventors") or doc.get("inventor") or []
    if isinstance(inv_raw, list):
        for i in inv_raw:
            if isinstance(i, dict):
                first = i.get("firstName") or i.get("givenName") or ""
                last = i.get("lastName") or i.get("familyName") or ""
                if first or last:
                    inventors.append({
                        "inventor_name_first": _strip_html(first),
                        "inventor_name_last": _strip_html(last),
                    })
            elif isinstance(i, str):
                # "FIRST LAST" — split on last space
                parts = i.rsplit(" ", 1)
                if len(parts) == 2:
                    inventors.append({
                        "inventor_name_first": parts[0],
                        "inventor_name_last": parts[1],
                    })

    return {
        "patent_title": title,
        "patent_date": grant_date,
        "assignees": assignees,
        "inventors": inventors,
        "examiners": [],  # PPUBS doesn't surface examiner cleanly
    }


# ---------------------------------------------------------------------------
# Main fetch flow
# ---------------------------------------------------------------------------

def fetch_ppubs(patent_id, session, debug_dump=False):
    """Fetch via PPUBS. Returns the canonical data dict or None on failure."""
    guid, src_type = ppubs_find_guid(session, patent_id)
    if not guid:
        return None

    print(f"  [ppubs] guid={guid} type={src_type}")

    doc = ppubs_get_document(session, guid, src_type)
    if not doc:
        return None

    if debug_dump:
        dump_path = OUTBOX / f"_ppubs_dump_{patent_id}.json"
        dump_path.write_text(json.dumps(doc, indent=2, default=str))
        print(f"  [ppubs] dumped raw response to {dump_path.name}")

    meta = extract_metadata(doc)
    claims = extract_claims(doc)

    return {
        "patent_id": patent_id,
        "patent_title": meta["patent_title"],
        "patent_date": meta["patent_date"],
        "assignees": meta["assignees"],
        "inventors": meta["inventors"],
        "examiners": meta["examiners"],
        "claims": claims,
        "_source": "ppubs",
        "_ppubs_guid": guid,
        "_ppubs_type": src_type,
    }


def write_outputs(patent_id, data):
    json_path = OUTBOX / f"US{patent_id}.json"
    txt_path = OUTBOX / f"US{patent_id}.txt"

    payload = json.dumps(data, indent=2, sort_keys=True, ensure_ascii=False)

    if json_path.exists() and json_path.read_text() == payload:
        print(f"  US{patent_id}: unchanged, skipping")
        return

    json_path.write_text(payload)

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
    lines.append(f"Source: {data.get('_source', 'unknown')}")
    if data.get("_ppubs_guid"):
        lines.append(f"PPUBS GUID: {data['_ppubs_guid']}")
    lines.append("")
    lines.append("=" * 70)
    lines.append("CLAIMS")
    lines.append("=" * 70)
    lines.append("")
    if not data.get("claims"):
        lines.append("(No claims extracted. Inspect _ppubs_dump_*.json for field mapping.)")
    for c in data.get("claims", []):
        seq = c.get("claim_sequence", "?")
        text = c.get("claim_text", "")
        dep = c.get("claim_dependent")
        marker = f"[dep on {dep}]" if dep else "[independent]"
        lines.append(f"Claim {seq} {marker}:")
        lines.append(text)
        lines.append("")
    txt_path.write_text("\n".join(lines))
    print(f"  US{patent_id}: wrote {json_path.name} + {txt_path.name} ({len(data.get('claims', []))} claims)")


def parse_input(arg):
    """Accept '12345' or '12345:2020-11-24' format. Date is ignored (PPUBS
    doesn't need it). Date suffix retained for backward compat with prior runs."""
    if ":" in arg:
        return arg.split(":", 1)[0].strip()
    return arg.strip()


def main():
    if len(sys.argv) < 2:
        print("Usage: patent_fetch.py <patent_number>[,<patent_number>...]")
        print("  (Optional :YYYY-MM-DD date suffix accepted but ignored.)")
        sys.exit(1)

    raw_inputs = [p for p in sys.argv[1].split(",") if p.strip()]
    patents = [parse_input(p) for p in raw_inputs]
    patents = [re.sub(r"^US|B\d?$", "", p, flags=re.IGNORECASE).strip() for p in patents]

    print(f"Establishing PPUBS session...")
    session = ppubs_session()
    if not session:
        print("FAIL: could not establish PPUBS session")
        sys.exit(1)

    failures = []
    for idx, pid in enumerate(patents):
        print(f"\nFetching US{pid} via PPUBS...")
        # Dump raw response for the first patent only — for field-mapping debug
        data = fetch_ppubs(pid, session, debug_dump=(idx == 0))
        if data is None:
            print(f"FAIL: US{pid}")
            failures.append(pid)
            continue
        write_outputs(pid, data)

    if failures:
        print(f"\n{len(failures)} of {len(patents)} patents failed: {failures}")
        sys.exit(2)

    print(f"\nAll {len(patents)} patents fetched successfully.")


if __name__ == "__main__":
    main()
