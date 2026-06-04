# ADR-PATENT-001: USPTO Patent Public Search (PPUBS) as primary data source

**Status:** Accepted
**Date:** 2026-06-04
**Repo:** jubilant-bassoon (patent automation pipeline)
**Decided by:** Jeff + Claude Opus 4.7

## Context

The patent automation pipeline (`.github/workflows/patent-fulltext.yml` +
`.github/scripts/patent_fetch.py`) was originally architected to fetch full
patent text from two USPTO surfaces:

1. **PatentsView API** (`search.patentsview.org`) — structured JSON API,
   no API key originally needed.
2. **USPTO Bulk Grant XML** (`bulkdata.uspto.gov`) — weekly XML archives,
   anonymous HTTP downloads.

Both source paths broke during this session's build verification:

- **PatentsView API**: Shut down 2026-03-20 as part of USPTO's migration to
  the Open Data Portal (ODP). The API now returns 403 without an API key,
  and the legacy PatentsView host is being decommissioned entirely.
- **`bulkdata.uspto.gov`**: DNS record removed sometime before 2026-06-04.
  Confirmed via CI runner `NameResolutionError`: "Failed to resolve
  'bulkdata.uspto.gov'". The host is gone, not just renamed; the data is
  on ODP at `data.uspto.gov/bulkdata/datasets/ptgrxml` behind a
  JavaScript-rendered file browser with no documented direct-download URL
  pattern.

The replacement data surface is the **ODP API** at `api.uspto.gov`. It is
authoritative, well-documented, and current. However, ODP API access
requires an API key, and the key registration flow is gated by **ID.me video
verification** (government ID + SSN + face match). This is a one-time
~30-minute setup but not something we can complete inside a single
automation pass.

The USPTO provisional patent filing deadline for FIELD's PM-26-O
perceived-performance claims is 2026-06-25 — 21 days from this decision.
We need claim text for six prior-art patents to feed the comparison
engine before that date.

## Decision

Use **USPTO Patent Public Search (PPUBS)** at `ppubs.uspto.gov` as the
primary data source for `patent_fetch.py`.

PPUBS is the same backend the public web tool at
`https://ppubs.uspto.gov/pubwebapp/` uses. It is:

- **Free** — no cost, no metering
- **Anonymous** — no API key, no ID.me, no USPTO.gov account
- **Official** — direct USPTO source, not a third-party mirror
- **Full text** — returns claims, description, specification, abstract
- **Working in CI** — GitHub Actions runners have open egress

The PPUBS request sequence is:

1. `GET /pubwebapp/` (prime cookies)
2. `POST /api/users/me/session` with body `-1` (returns `caseId` +
   `X-Access-Token` header)
3. `POST /api/searches/counts` (preflight)
4. `POST /api/searches/searchWithBeFamily` (returns document GUID for
   patent number via `"<num>".pn.` query)
5. `GET /api/patents/highlight/<guid>?source=USPAT&includeSections=true`
   (returns full document JSON)

Session tokens are valid ~30 minutes. The script establishes one session
per run and reuses it across all patents in a batch.

## Consequences

### Positive

- Pipeline unblocks for 2026-06-25 deadline today, no further wait for
  external credentials.
- Same comparison engine, Drive upload, and auto-chain infrastructure
  remain valid; only the source layer changed.
- No new secrets, no rotation burden.
- PPUBS daily updates make this viable for the patent-watch use case too.

### Negative / Risks

- **PPUBS is not officially documented as a public API.** It's the
  backend of a public web tool, used by third-party libraries (notably
  `parkerhancock/patent_client` and `riemannzeta/patent_mcp_server`),
  but USPTO could change endpoints or request shapes without notice.
  Mitigation: the comparison engine is source-agnostic; if PPUBS breaks,
  we swap the source layer, not the whole pipeline.
- **Session token model** means runs longer than ~30 minutes need
  re-establishment logic. Current runs complete in well under that.
- **Rate limits not published.** Anecdotal evidence is generous but if
  we hit them we add exponential backoff.
- **One-maintainer reference implementation.** The PPUBS request pattern
  is borrowed from `riemannzeta/patent_mcp_server` (MIT, ~45 stars, one
  active maintainer). Mitigation: the relevant request sequence is
  ported into our script directly — we don't take a package dependency.

### Not chosen

- **PatentsView API key request** — dead source, API shut down 2026-03-20.
- **Bulk XML revival** — host DNS removed; bulk data is now on ODP and
  requires API key for the metadata-discovery step.
- **Google Patents scraping** — third-party source; we have an official
  no-auth alternative.
- **ODP API key** — viable but blocks on ID.me. Documented as a parallel
  future investment for enrichment (continuity, file wrapper documents,
  prosecution history). See "Future work" below.

## Future work

When Jeff completes ID.me verification and obtains an ODP API key, add
an enrichment layer to `patent_fetch.py` that fetches:

- Continuity data (`/api/v1/patent/applications/<app>/continuity`)
- File wrapper documents (`/api/v1/patent/applications/<app>/documents`)
- Assignment / transaction history

The PPUBS source layer remains primary for claims and core document
content; ODP becomes additive.

## References

- USPTO ODP migration timeline:
  https://data.uspto.gov/support/transition-guide/patentsview
- PPUBS reference implementation:
  https://github.com/riemannzeta/patent_mcp_server (MIT, March 2026)
- Earlier USPTO PPUBS reverse-engineering:
  https://github.com/parkerhancock/patent_client (archived April 2026)
- ODP API key registration:
  https://data.uspto.gov/apis/getting-started
- This session's diagnostic capture:
  `outbox/patents/_lastrun.log` (commit `dc5db79`, fetch step output
  showing NameResolutionError for bulkdata.uspto.gov)
