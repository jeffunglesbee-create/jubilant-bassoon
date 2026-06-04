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

def ppubs_find_guid(s, patent_number, debug_dump=False):
    """Search PPUBS USPAT source for the patent number, return (guid, source_type, raw_doc)."""
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
    if debug_dump:
        dump_path = OUTBOX / f"_ppubs_search_{patent_number}.json"
        dump_path.write_text(json.dumps(result, indent=2, default=str))
        print(f"  [ppubs] dumped search response to {dump_path.name}")
    if not patents:
        # Could be under nested structure; dump for debug
        print(f"  [ppubs] no results for {patent_number}")
        print(f"  [ppubs] response keys: {list(result.keys())}")
        return None, None, None

    doc = patents[0]
    guid = doc.get("guid")
    src_type = doc.get("type") or "USPAT"
    return guid, src_type, doc


# ---------------------------------------------------------------------------
# Document retrieval
# ---------------------------------------------------------------------------

def ppubs_get_document(s, guid, src_type):
    """Fetch the full document JSON including all sections (claims, etc).

    Reference impl uses httpx which omits None params; we replicate that by
    not including uniqueId at all. includeSections must serialize as the
    lowercase string 'true' (httpx does this automatically for booleans;
    requests would send 'True', so we pass the string explicitly).
    """
    url = f"{PPUBS_BASE}/api/patents/highlight/{guid}"
    params = {
        "queryId": 1,
        "source": src_type,
        "includeSections": "true",
        # NOTE: deliberately omitting uniqueId (httpx behaviour for None)
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

    PPUBS returns claims under `claimsHtml` — a single string of HTML with
    each claim numbered like '1. ...<br />...<br />2. ...'. The HTML wrapping
    is just `<br />` line breaks plus highlight `<span>` tags for search-term
    emphasis. We strip HTML, then split on numeric-period boundaries.
    """
    claims_html = doc.get("claimsHtml") or doc.get("claimSection") or doc.get("claims")
    if not claims_html:
        return []

    if isinstance(claims_html, list):
        claims_text = "\n".join(str(c) for c in claims_html)
    elif isinstance(claims_html, dict):
        claims_text = claims_html.get("text") or claims_html.get("content") or ""
    else:
        claims_text = str(claims_html)

    # Convert <br /> to newlines first, then strip remaining HTML
    claims_text = re.sub(r"<br\s*/?>", "\n", claims_text, flags=re.IGNORECASE)
    claims_text = _strip_html(claims_text)

    # Split on claim number boundaries: "1. ..." "2. ..." etc
    parts = re.split(r"\n\s*(\d+)\s*\.\s*", "\n" + claims_text)
    claims = []
    i = 1
    while i < len(parts) - 1:
        try:
            seq = int(parts[i])
            text = parts[i + 1].strip()
            # Compress excessive internal whitespace, keep paragraph breaks
            text = re.sub(r"\n{3,}", "\n\n", text)
            dep_match = DEP_RE.search(text[:200])
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
    Field names verified from saved test fixture in patent_mcp_server.
    """
    title = _strip_html(doc.get("inventionTitle") or "")

    grant_date = (
        doc.get("datePublished")  # "1999-12-07T00:00:00Z"
        or doc.get("publicationDate")
        or ""
    )
    # Trim ISO time portion if present
    if "T" in grant_date:
        grant_date = grant_date.split("T")[0]

    # Assignees: PPUBS returns assigneeName as a list of strings
    assignees = []
    asg_raw = doc.get("assigneeName") or doc.get("assignees") or []
    if isinstance(asg_raw, list):
        for a in asg_raw:
            if isinstance(a, str) and a.strip():
                assignees.append({"assignee_organization": _strip_html(a)})
            elif isinstance(a, dict):
                org = a.get("organizationName") or a.get("name") or ""
                if org:
                    assignees.append({"assignee_organization": _strip_html(org)})
    elif isinstance(asg_raw, str) and asg_raw.strip():
        assignees.append({"assignee_organization": _strip_html(asg_raw)})

    # Inventors: PPUBS uses inventorsName as list of "LastName; FirstName" strings
    inventors = []
    inv_raw = doc.get("inventorsName") or doc.get("inventors") or []
    if isinstance(inv_raw, list):
        for i in inv_raw:
            if isinstance(i, str) and i.strip():
                # Format is "LastName; FirstName MiddleInit." per fixture
                parts = i.split(";", 1)
                if len(parts) == 2:
                    last = parts[0].strip()
                    first = parts[1].strip()
                    inventors.append({
                        "inventor_name_first": _strip_html(first),
                        "inventor_name_last": _strip_html(last),
                    })
                else:
                    # Fall back: just stuff full string into last
                    inventors.append({
                        "inventor_name_first": "",
                        "inventor_name_last": _strip_html(i),
                    })
            elif isinstance(i, dict):
                first = i.get("firstName") or i.get("givenName") or ""
                last = i.get("lastName") or i.get("familyName") or ""
                if first or last:
                    inventors.append({
                        "inventor_name_first": _strip_html(first),
                        "inventor_name_last": _strip_html(last),
                    })

    # Examiners: PPUBS surfaces these in primaryExaminer + assistantExaminer
    examiners = []
    for exam_field in ("primaryExaminer", "assistantExaminer"):
        ex = doc.get(exam_field)
        if isinstance(ex, str) and ex.strip():
            parts = ex.split(";", 1)
            if len(parts) == 2:
                examiners.append({
                    "examiner_name_first": parts[1].strip(),
                    "examiner_name_last": parts[0].strip(),
                })
            else:
                examiners.append({
                    "examiner_name_first": "",
                    "examiner_name_last": ex.strip(),
                })

    return {
        "patent_title": title,
        "patent_date": grant_date,
        "assignees": assignees,
        "inventors": inventors,
        "examiners": examiners,
    }


# ---------------------------------------------------------------------------
# Main fetch flow
# ---------------------------------------------------------------------------

def fetch_ppubs(patent_id, session, debug_dump=False):
    """Fetch via PPUBS. Returns the canonical data dict or None on failure."""
    guid, src_type, search_doc = ppubs_find_guid(session, patent_id, debug_dump=debug_dump)
    if not guid:
        return None

    print(f"  [ppubs] guid={guid} type={src_type}")

    doc = ppubs_get_document(session, guid, src_type)
    if not doc:
        # Document fetch failed but search succeeded - use search-only metadata
        # (no claims available from search results)
        print(f"  [ppubs] document fetch failed, returning search-only metadata")
        if search_doc:
            meta = extract_metadata(search_doc)
            return {
                "patent_id": patent_id,
                "patent_title": meta["patent_title"],
                "patent_date": meta["patent_date"],
                "assignees": meta["assignees"],
                "inventors": meta["inventors"],
                "examiners": meta["examiners"],
                "claims": [],
                "_source": "ppubs-search-only",
                "_ppubs_guid": guid,
                "_ppubs_type": src_type,
            }
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
