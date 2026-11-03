#!/usr/bin/env python3
"""
Weekly patent watcher, on USPTO Patent Public Search (PPUBS).

Reads one grant Tuesday (database USPAT) and the publication Thursday before it
(database US-PGPUB) for every term in .github/patent-watchlist.txt, files a
GitHub issue per scan that has hits, writes outbox/patents/watch-<Tuesday>.json,
and hands grant numbers to patent-fulltext.yml through $GITHUB_OUTPUT.

THE RULE THIS FILE EXISTS TO KEEP: a week is either read completely or the run
is red and no manifest is written. The previous version scanned bulkdata.uspto.gov,
whose DNS record is gone, printed "0 matches" for both scans and exited 0; the
manifest it committed said no watchlist assignee had a patent that week, and the
run had looked at nothing. Every path below that cannot say "I read it" raises
Unread, and main() turns Unread into exit 1.

WHY PPUBS, AND WHAT WAS MEASURED (2026-11-03, field-laboratory scripts/probe-ppubs-query.py,
reports outbox/ppubs-query-probe-*.md there; patent_fetch.py already uses the same backend):
  * a search answers HTTP 200 with ZERO documents for a query form the server does
    not understand (`@PD="2026-10-27"`, `"x".asg.`), so a zero is never trusted on
    its own. Five known answers run first, each in the exact form the weeks use;
    a day is read only if it holds at least MIN_DAY_FAMILIES families.
  * the counters: numberOfFamilies is the TOTAL number of matching families,
    numFound the families on THIS page = max(0, min(pageCount, numberOfFamilies -
    start)), totalResults the documents on this page (len(patents)), not a total.
    `patents` can hold more documents than numFound (family members). Held on 152
    responses without an exception; every response here is checked against it, so a
    silent cap on the page or a changed meaning of a counter is red, not a short list.
  * PPUBS answers HTTP 429 above about one call a second. At 3 s between calls, 169
    calls produced none; a 429 is waited out (Retry-After, else BACKOFF) up to RETRIES
    times and then the run is red.
  * the week's volume is small: per term at most a handful of documents, so the
    100-family page always holds the answer; a term that matches more than
    MAX_FAMILIES families in one day is refused, never truncated.

TWO QUERIES PER TERM AND DAY, tagged in the manifest and the issue:
  assignee   "<term>".as. AND @PD="<day>"    the term is the patent's assignee/applicant
  text       "<term>" AND @PD="<day>"        the term appears anywhere in the document
The old bulk-XML scan matched the term anywhere in the document, which is the text
query; the assignee query is what the watchlist's header always said it was for.
A document the assignee query finds must also be in the text query's answer for the
same term (held in all 16 weeks measured, 7 of which had an assignee hit); if not, one
of the two readings is wrong and the run is red.

Test hooks (read from the environment, defaults are production): PPUBS_BASE,
PPUBS_PAUSE, PPUBS_BACKOFF, PPUBS_DEADLINE, and GITHUB_API_URL (set by Actions).
The regression check is field-laboratory scripts/check-patent-watch.py, which runs
this file unmodified against scripts/ppubs_stand_in.py.
"""

import json
import os
import re
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path

import requests

OUTBOX = Path("outbox/patents")
WATCHLIST_PATH = Path(".github/patent-watchlist.txt")

BASE = os.environ.get("PPUBS_BASE", "https://ppubs.uspto.gov")
UA = "Mozilla/5.0 (X11; Linux x86_64) jubilant-bassoon/patent-watch"
TIMEOUT = 60
PAUSE = float(os.environ.get("PPUBS_PAUSE", "3.0"))      # between calls; 0.5 s was rate limited, 3 s was not
BACKOFF = float(os.environ.get("PPUBS_BACKOFF", "20"))   # when a 429 or a 5xx names no Retry-After
DEADLINE_S = float(os.environ.get("PPUBS_DEADLINE", str(25 * 60)))
RETRIES = 3
PAGE = 100                # families per page
MAX_FAMILIES = 500        # per query; more is refused rather than cut
MIN_DAY_FAMILIES = 500    # a grant or publication day holds thousands (5,827 to 11,466 measured)

GRANTS = ("grants", "USPAT", "grant")
APPLICATIONS = ("applications", "US-PGPUB", "application")

# Known answers, each run in the exact form the weeks use (records from the real host).
# (name, query, database, guid that must be returned, date every returned document must carry)
CONTROLS = [
    ("number form", '"10846193".pn.', "USPAT", "US-10846193-B2", None),
    ("assignee + exact date, grants", '"RUWT".as. AND @PD="20190625"', "USPAT", "US-10328326-B2", "2019-06-25"),
    ("assignee + exact date, applications", '"Dynatrace LLC".as. AND @PD="20261022"', "US-PGPUB", "US-20260332641-A1", "2026-10-22"),
    ("text + exact date, grants", '"RUWT" AND @PD="20190625"', "USPAT", "US-10328326-B2", "2019-06-25"),
    ("text + exact date, applications", '"Dynatrace LLC" AND @PD="20261022"', "US-PGPUB", "US-20260332641-A1", "2026-10-22"),
]


class Unread(Exception):
    """The week was not read, or not read completely. The message says why."""


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


def thursday_before(tuesday: datetime) -> datetime:
    """The publication Thursday that exists when this runs: five days before the
    grant Tuesday. (The old rule, Tuesday + 2, named a day that had not happened
    when the job ran on Wednesday.)"""
    return tuesday - timedelta(days=5)


def load_watchlist():
    if not WATCHLIST_PATH.exists():
        raise Unread(f"no watchlist at {WATCHLIST_PATH}")
    terms, seen = [], set()
    for raw in WATCHLIST_PATH.read_text().splitlines():
        t = raw.strip()
        if not t or t.startswith("#"):
            continue
        if '"' in t or any(ord(c) < 32 for c in t):
            raise Unread(f"watchlist term {t!r} contains a double quote or a control character; it would change the query")
        if t.lower() not in seen:
            seen.add(t.lower())
            terms.append(t)
    if not terms:
        raise Unread(f"{WATCHLIST_PATH} has no terms; an empty watchlist reads nothing and must not look like a clean week")
    return terms


# ---------------------------------------------------------------------------
# PPUBS
# ---------------------------------------------------------------------------

def query_body(case_id, q, db):
    return {
        "caseId": case_id, "hl_snippets": "2", "op": "OR", "q": q,
        "queryName": q, "highlights": "1", "qt": "brs", "spellCheck": False,
        "viewName": "tile", "plurals": True, "britishEquivalents": True,
        "databaseFilters": [{"databaseName": db, "countryCodes": []}],
        "searchType": 1, "ignorePersist": True, "userEnteredQuery": q,
    }


class Ppubs:
    def __init__(self):
        self.s = None
        self.case_id = None
        self.calls = 0
        self.t0 = time.monotonic()

    def _late(self):
        if time.monotonic() - self.t0 > DEADLINE_S:
            raise Unread(f"stopped after {int(DEADLINE_S)} s with the week still unread")

    def open(self):
        s = requests.Session()
        s.headers.update({
            "X-Requested-With": "XMLHttpRequest",
            "User-Agent": UA,
            "Origin": BASE,
            "Referer": f"{BASE}/pubwebapp/",
            "Pragma": "no-cache",
            "Cache-Control": "no-cache",
        })
        try:
            r = s.get(f"{BASE}/pubwebapp/", timeout=TIMEOUT)
            print(f"  [ppubs] prime: HTTP {r.status_code}")
            r = s.post(
                f"{BASE}/api/users/me/session", json=-1,
                headers={"X-Access-Token": "null", "referer": f"{BASE}/pubwebapp/"},
                timeout=TIMEOUT,
            )
        except requests.RequestException as e:
            raise Unread(f"PPUBS session could not be opened: {type(e).__name__}: {str(e)[:200]}")
        if r.status_code != 200:
            raise Unread(f"PPUBS session HTTP {r.status_code}: {r.text[:200]}")
        try:
            case_id = r.json()["userCase"]["caseId"]
        except (ValueError, KeyError, TypeError) as e:
            raise Unread(f"PPUBS session answer has no userCase.caseId ({type(e).__name__}): {r.text[:200]}")
        token = r.headers.get("X-Access-Token") or r.headers.get("x-access-token")
        if not token:
            raise Unread("PPUBS session answer has no X-Access-Token header")
        s.headers["X-Access-Token"] = token
        self.s, self.case_id = s, case_id
        print(f"  [ppubs] session ok: caseId={case_id}")

    def search(self, q, db, start=0, n=PAGE):
        """One search page, checked against the counter contract. -> the parsed answer."""
        attempt, reopened = 0, False
        while True:
            self._late()
            body = {
                "start": start, "pageCount": n, "sort": "date_publ desc",
                "docFamilyFiltering": "familyIdFiltering", "searchType": 1,
                "familyIdEnglishOnly": True, "familyIdFirstPreferred": "US-PGPUB",
                "familyIdSecondPreferred": "USPAT", "familyIdThirdPreferred": "FPRS",
                "showDocPerFamilyPref": "showEnglish", "queryId": 0,
                "tagDocSearch": False, "query": query_body(self.case_id, q, db),
            }
            wait, why = None, None
            try:
                r = self.s.post(f"{BASE}/api/searches/searchWithBeFamily", json=body, timeout=TIMEOUT)
            except requests.RequestException as e:
                r, why = None, f"{type(e).__name__}: {str(e)[:120]}"
            self.calls += 1
            if r is not None:
                if r.status_code in (401, 403) and not reopened:
                    reopened = True
                    print(f"  [ppubs] HTTP {r.status_code}: opening a new session")
                    self.open()
                    continue
                if r.status_code == 200:
                    time.sleep(PAUSE)
                    return self._parsed(r, q, n, start)
                if r.status_code in (429, 500, 502, 503, 504):
                    why = f"HTTP {r.status_code}: {r.text[:100]}"
                    ra = r.headers.get("Retry-After", "")
                    wait = min(float(ra), 120.0) if ra.replace(".", "", 1).isdigit() else None
                else:
                    raise Unread(f"search {q!r} on {db}: HTTP {r.status_code}: {r.text[:200]}")
            attempt += 1
            if attempt > RETRIES:
                raise Unread(f"search {q!r} on {db}: no usable answer after {RETRIES} retries ({why})")
            w = BACKOFF if wait is None else wait
            print(f"  [ppubs] {why}; waiting {w:g} s (retry {attempt} of {RETRIES})")
            time.sleep(w)

    def _parsed(self, r, q, n, start):
        try:
            res = r.json()
        except ValueError:
            raise Unread(f"search {q!r}: the answer is not JSON ({r.headers.get('Content-Type')}): {r.text[:120]!r}")
        check_counters(res, n, start, q)
        return res


def check_counters(res, n, start, q):
    """The relations between the counters of one search answer, measured on 152
    answers of the real host without an exception. See the module docstring."""
    if not isinstance(res, dict):
        raise Unread(f"search {q!r}: the answer is {type(res).__name__}, not an object")
    if res.get("error"):
        raise Unread(f"search {q!r}: the host reports an error: {str(res['error'])[:200]}")
    docs, fam, nf = res.get("patents"), res.get("numberOfFamilies"), res.get("numFound")
    if not isinstance(docs, list):
        raise Unread(f"search {q!r}: no `patents` list in the answer")
    for name, v in (("numberOfFamilies", fam), ("numFound", nf)):
        if not isinstance(v, int) or isinstance(v, bool):
            raise Unread(f"search {q!r}: `{name}` is missing or not an integer, so the answer cannot be shown complete")
    want = max(0, min(n, fam - start))
    if nf != want:
        raise Unread(f"search {q!r}: numFound {nf} but pageCount {n}, start {start}, numberOfFamilies {fam} make it {want}: the page was cut or a counter changed meaning")
    if res.get("totalResults") != len(docs):
        raise Unread(f"search {q!r}: totalResults {res.get('totalResults')} but {len(docs)} documents on the page")
    if len(docs) < nf:
        raise Unread(f"search {q!r}: {len(docs)} documents for {nf} families on the page")
    for d in docs:
        if not isinstance(d, dict) or not isinstance(d.get("guid"), str) or not d["guid"]:
            raise Unread(f"search {q!r}: a document without a guid in the answer")


def day_str(d):
    return d.strftime("%Y%m%d")


def doc_actors(d):
    """The assignee and applicant text of a document, flattened."""
    out = []
    for key in ("assigneeName", "applicantName"):
        v = d.get(key)
        if isinstance(v, str):
            out.append(v)
        elif isinstance(v, list):
            out.extend(x if isinstance(x, str) else json.dumps(x) for x in v)
    return " | ".join(out)


def read_all(client, q, db, day_iso):
    """Every document of one query, all pages. -> ({guid: document}, number of families).
    Refuses a result that is too large to read whole. Each page is checked against
    numberOfFamilies by check_counters (numFound = min(page, families - start)), so
    reading from start 0 in steps of PAGE until start reaches numberOfFamilies reads all of it."""
    docs, fam, start = {}, None, 0
    while True:
        res = client.search(q, db, start=start)
        if fam is None:
            fam = res["numberOfFamilies"]
            if fam > MAX_FAMILIES:
                raise Unread(f"search {q!r} on {db} matches {fam} families (more than {MAX_FAMILIES}); refusing to cut the answer")
        for d in res["patents"]:
            guid = d["guid"]
            if str(d.get("datePublished") or "")[:10] != day_iso:
                raise Unread(f"search {q!r}: {guid} is dated {str(d.get('datePublished'))[:10]!r}, not {day_iso}: the date form is not doing what it was verified to do")
            docs[guid] = d
        start += PAGE
        if start >= fam:
            break
    return docs, fam


def run_controls(client):
    names = []
    for name, q, db, guid, day_iso in CONTROLS:
        res = client.search(q, db, n=5)
        got = {d.get("guid"): d for d in res["patents"]}
        if guid not in got:
            raise Unread(f"control '{name}' ({q} on {db}) did not return {guid}; it returned {sorted(got)[:5]}: this query form no longer reads what it was verified to read")
        if day_iso and any(str(d.get("datePublished") or "")[:10] != day_iso for d in got.values()):
            raise Unread(f"control '{name}' returned a document that is not dated {day_iso}")
        print(f"  control ok: {name}")
        names.append(name)
    return names


def day_population(client, db, day):
    res = client.search(f'@PD="{day_str(day)}"', db, n=1)
    fam = res["numberOfFamilies"]
    if fam < MIN_DAY_FAMILIES:
        raise Unread(f"{db} holds {fam} families for {day:%Y-%m-%d} (fewer than {MIN_DAY_FAMILIES}): the day is not published or indexed yet, or the date form stopped working")
    print(f"  {db} {day:%Y-%m-%d}: {fam} families published that day")
    return fam


def patent_number(guid):
    m = re.fullmatch(r"US-([A-Z]*\d+)-[A-Z]\d?", guid)
    return m.group(1) if m else guid


def scan(client, spec, day, watchlist):
    """One database and one day, every term in both forms. -> (matches, stats)."""
    label, db, kind = spec
    day_iso = f"{day:%Y-%m-%d}"
    fam_day = day_population(client, db, day)
    found = {}
    for term in watchlist:
        a_docs, a_fam = read_all(client, f'"{term}".as. AND @PD="{day_str(day)}"', db, day_iso)
        t_docs, t_fam = read_all(client, f'"{term}" AND @PD="{day_str(day)}"', db, day_iso)
        missing = sorted(set(a_docs) - set(t_docs))
        if missing:
            raise Unread(f"{label}: {missing[:3]} is in the assignee answer for {term!r} but not in the text answer for it; one of the two readings is wrong")
        print(f"  {label:<12} {term:<24} assignee {len(a_docs):>2} docs / {a_fam:>2} families   text {len(t_docs):>2} docs / {t_fam:>2} families")
        for channel, docs in (("assignee", a_docs), ("text", t_docs)):
            for guid, d in docs.items():
                h = found.setdefault(guid, {"doc": d, "terms": [], "channels": set()})
                if term not in h["terms"]:
                    h["terms"].append(term)
                h["channels"].add(channel)
    matches = []
    for guid, h in found.items():
        d, actors = h["doc"], doc_actors(h["doc"])
        by_assignee = "assignee" in h["channels"] or any(t.lower() in actors.lower() for t in h["terms"])
        matches.append({
            "assignee_match": h["terms"][0],
            "patent_id": patent_number(guid),
            "title": re.sub(r"\s+", " ", str(d.get("inventionTitle") or "")).strip()[:200],
            "doc_kind": kind,
            "scan": label,
            "basis": "assignee" if by_assignee else "text",
            "terms": h["terms"],
            "guid": guid,
            "date": day_iso,
            "assignee": actors[:160],
        })
    matches.sort(key=lambda m: (m["basis"] != "assignee", m["patent_id"]))
    stats = {"database": db, "day": day_iso, "families_on_day": fam_day, "queries": 2 * len(watchlist)}
    return matches, stats


# ---------------------------------------------------------------------------
# Reporting
# ---------------------------------------------------------------------------

def file_issue(matches, week: str, scope: str):
    if not matches:
        return
    token = os.environ.get("GH_TOKEN")
    repo = os.environ.get("GH_REPO")
    in_actions = os.environ.get("GITHUB_ACTIONS") == "true"
    if not token or not repo:
        if in_actions:
            raise Unread(f"{len(matches)} {scope} hit(s) and no GH_TOKEN/GH_REPO to file the issue with: the owner would never hear of them")
        print("  No GH_TOKEN/GH_REPO; skipping issue creation")
        return

    n_assignee = sum(1 for m in matches if m["basis"] == "assignee")
    body = [
        f"USPTO {scope} week ending {week}, read on Patent Public Search.",
        "",
        f"**{len(matches)} match(es)** against the watchlist: {n_assignee} with the term as assignee/applicant, "
        f"{len(matches) - n_assignee} that only mention it in the text.",
        "",
    ]
    for m in matches:
        body.append(
            f"- **US{m['patent_id']}** ({m['doc_kind']}, {m['basis']}): {m['title']} "
            f"-- matched on `{', '.join(m['terms'])}`"
            + (f" -- {m['assignee'] or 'no assignee on record'}" if m["basis"] == "text" else "")
        )
    chain = [m["patent_id"] for m in matches if m["scan"] == "grants" and chainable(m["guid"])]
    if chain:
        body.append("")
        body.append("Run `patent-fulltext` workflow with these numbers to pull full claim text:")
        body.append("```")
        body.append(f"gh workflow run patent-fulltext.yml -f patents={','.join(chain)}")
        body.append("```")

    api = os.environ.get("GITHUB_API_URL", "https://api.github.com").rstrip("/")
    try:
        r = requests.post(
            f"{api}/repos/{repo}/issues",
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github+json",
            },
            json={
                "title": f"Patent watch ({scope}): {len(matches)} hit(s) - {week}",
                "body": "\n".join(body),
                "labels": ["patent-watch"],
                "assignees": [repo.split("/")[0]],
            },
            timeout=30,
        )
    except requests.RequestException as e:
        raise Unread(f"the {scope} issue could not be filed: {type(e).__name__}: {str(e)[:160]}")
    if not r.ok:
        raise Unread(f"the {scope} issue could not be filed: HTTP {r.status_code}: {r.text[:200]}")
    print(f"  Issue filed: {r.json().get('html_url')}")


def chainable(guid):
    """patent-fulltext.yml takes utility grant numbers; a design patent or a reissue is listed in the issue only."""
    return re.fullmatch(r"US-\d+-B\d", guid) is not None


def report_failure(msg):
    print(f"\nNOT READ: {msg}")
    print(f"::error title=Patent watch did not read this week::{msg[:400]}")
    summary = os.environ.get("GITHUB_STEP_SUMMARY", "").strip()
    if summary:
        try:
            with open(summary, "a") as f:
                f.write(f"## Patent watch: NOT READ\n\n{msg}\n\nNo manifest was written for this week.\n")
        except OSError:
            pass


def run():
    override = os.environ.get("WEEK_OVERRIDE", "").strip()
    if override:
        try:
            tue = datetime.strptime(override, "%Y-%m-%d")
        except ValueError:
            raise Unread(f"Bad WEEK_OVERRIDE: {override}")
        if tue.weekday() != 1:
            raise Unread(f"WEEK_OVERRIDE {override} is a {tue:%A}; grants issue on Tuesdays")
    else:
        tue = last_tuesday()
    thu = thursday_before(tue)
    week_str = tue.strftime("%Y-%m-%d")

    watchlist = load_watchlist()
    print(f"Watchlist ({len(watchlist)} entries):")
    for w in watchlist:
        print(f"  - {w}")
    print(f"Grant week: {week_str} (Tuesday)")
    print(f"PGPub week: {thu:%Y-%m-%d} (Thursday)")

    client = Ppubs()
    print("\nSession and controls...")
    client.open()
    controls = run_controls(client)

    all_matches, scanned = [], {}
    for spec, day in ((GRANTS, tue), (APPLICATIONS, thu)):
        print(f"\nReading {spec[0]} ({spec[1]}, {day:%Y-%m-%d})...")
        matches, stats = scan(client, spec, day, watchlist)
        print(f"  {len(matches)} {spec[0]} match(es)")
        file_issue(matches, week_str, spec[0])
        all_matches.extend(matches)
        scanned[spec[0]] = stats

    OUTBOX.mkdir(parents=True, exist_ok=True)
    manifest_path = OUTBOX / f"watch-{week_str}.json"
    manifest_path.write_text(json.dumps({
        "week_tuesday": week_str,
        "week_thursday": thu.strftime("%Y-%m-%d"),
        "source": "ppubs",
        "read_complete": True,
        "watchlist": watchlist,
        "controls": controls,
        "scanned": scanned,
        "matches": all_matches,
    }, indent=2))
    print(f"\nSaved {manifest_path}")

    # Emit grant hits to $GITHUB_OUTPUT so the workflow can auto-chain
    # to patent-fulltext.yml. PGPub hits are NOT auto-chained because their
    # publication numbers route to a different PatentSearch endpoint.
    # Cap at 20 to prevent runaway followup workflows.
    GRANT_HITS_LIMIT = 20
    grant_ids = []
    seen = set()
    for m in all_matches:
        if m.get("scan") != "grants" or not chainable(m["guid"]):
            continue
        pid = m.get("patent_id", "")
        if pid and pid not in seen:
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
        print("\nNo grant hits to auto-chain.")
    return 0


def main():
    try:
        return run()
    except Unread as e:
        report_failure(str(e))
        return 1


if __name__ == "__main__":
    sys.exit(main())
