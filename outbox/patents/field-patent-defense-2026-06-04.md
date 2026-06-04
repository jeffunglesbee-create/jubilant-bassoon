# FIELD Patent Defense — June 4 2026 Session

**Repo:** jubilant-bassoon (patent automation pipeline; adjacent to FIELD codebase, not FIELD itself)
**Final HEAD:** `f0904a4`
**Session output:** 6 prior-art patents fetched, compared, classified
**USPTO provisional filing target:** June 25 2026 (21 days)

> Heuristic auto-detected analysis. Attorney review required. NOT a legal opinion.

---

## Pipeline shipped (jubilant-bassoon)

- PPUBS source layer (USPTO Patent Public Search, no API key required) → FIELD-feature comparison engine → outputs to `outbox/patents/` in repo
- Auto-upload to Dropbox `/FIELD/patents/` via refresh-token OAuth flow
- End-to-end CI run: ~15 seconds for 6 patents
- Weekly `patent-watch` workflow auto-chains to `patent-fulltext` for any new grant hits matching the watch query. No human action required for steady state.
- ADR: `.github/adr/ADR-PATENT-001-ppubs-source.md` documents the source-layer decision (PatentsView shut down 2026-03-20; bulkdata.uspto.gov DNS removed; ODP API requires ID.me-gated key; PPUBS chosen as no-auth path).

---

## Six prior-art patents — at a glance

| Patent | Assignee | Granted | Claims | STRONG | DIFFERS | Review |
|---|---|---|---|---:|---:|---:|
| US10846193 | Dynatrace LLC | 2020-11-24 | 33 (3 indep) | 3 | 8 | 12 |
| US11182537 | Dynatrace LLC | 2021-11-23 | 15 (3 indep) | 13 | 9 | 17 |
| US8335848  | TeaLeaf Technology | 2012-12-18 | 23 (4 indep) | 4 | 0 | 12 |
| US8533532  | IBM | 2013-09-10 | 30 (5 indep) | 1 | 0 | 15 |
| US9571591  | Dynatrace LLC | 2017-02-14 | 31 (3 indep) | 7 | 3 | 18 |
| US9509714  | Cabara Software | 2016-11-29 | 17 (3 indep) | 0 | 0 | 12 |

**Totals:** 28 STRONG non-infringement arguments, 20 ELEMENT_DIFFERS, 86 elements needing attorney human review.

---

## Architectural distinctions the engine validated

Five FIELD design choices appear repeatedly across the STRONG arguments. These are the patent-defense pillars to lead with in the provisional.

### 1. Client-only architecture (no remote monitoring server)

Hits in 5 of 6 patents. Across Dynatrace, TeaLeaf, IBM patents, claim elements consistently require sending data over a network to a *monitoring node residing on a server computer*. FIELD's PM-26-O measures CLS entirely in-browser and exposes the result via `?clsdebug=1` panel. No remote monitoring server. No backend data transfer. No telemetry egress. This single architectural fact knocks out most independent claims across the prior-art set.

**Attorney consideration:** doctrine of equivalents. Could "monitoring node" be construed broadly to include any analytics endpoint, error reporter, or telemetry collector under a generous reading? FIELD currently has no such surface, but the provisional should explicitly call this out as a deliberate architectural choice — not an accidental absence.

### 2. No session replay / no past-state reconstruction

Hits Dynatrace 11182537 (claim 1.k — inverse mutation application) and IBM 8533532 (claim 20.b — session replay controller). FIELD measures forward-looking layout shifts; does not record or replay past states. No event log, no mutation history, no reconstruction.

### 3. Continuous mutations / no end-of-content-processing trigger

The Dynatrace family (10846193, 11182537) defines an end-of-content-processing trigger that fires when DOM mutations cease. FIELD operates in a continuous-mutation environment (ESPN ~30s polling cycle for live scores). The trigger never fires by design. PM-26-J was the architectural pivot in FIELD specifically because cold-load metrics don't capture continuous editorial mutations. **This is a NOVEL contribution worth filing on.** The provisional should emphasize the perceived-performance measurement in a continuous-update environment as the patentable insight.

### 4. Application self-instrumentation (not vendor agent injection)

The Dynatrace claims describe a third-party monitoring vendor's browser agent injected into the content displayed by the web browser. FIELD's measurement code is part of the application itself — not injected by an external monitoring product, not loaded from a vendor CDN, not agent-based.

### 5. No transaction tracing / no correlation across client+server

US9571591 (Dynatrace, end-to-end transaction tracing) covers distributed tracing that correlates browser actions with server-side processing via request records and correlation IDs. FIELD has no server-side component, no end-to-end trace, no correlation IDs.

---

## Per-patent risk assessment

**HIGHEST risk — US10846193 + US11182537 (Dynatrace, "visual completeness" family).**
These share inventors (Lackner, Wagner, Schatka) and use the exact terminology *"visual completeness of browser rendering process"* that overlaps with FIELD's perceived-performance positioning. 11182537 is a continuation of 193 with broader claims. Mitigation is strong (client-only, no replay, no end-of-content trigger), but the provisional MUST explicitly distinguish on these grounds.

**MEDIUM risk — US9571591 (Dynatrace, end-to-end tracing).**
Same assignee, different family. 7 STRONG arguments. Risk is lower because end-to-end tracing is conceptually different from CLS measurement, but attorney should review the 18 unmatched elements.

**MEDIUM-LOW risk — US8335848 (TeaLeaf, network capture + UI events).**
Explicitly requires network data capture which FIELD does not perform. 4 STRONG arguments. 12 elements need attorney review.

**LOW risk — US8533532 (IBM, web session inference).**
Session replay focused. Only 1 STRONG match because the abstract claim language is broader than the heuristic patterns; 15 elements flagged for human review. Attorney should look closely at the session-event-inference claims for any unintended overlap with FIELD's analytics.

**LOWEST risk — US9509714 (Cabara, web page protection against malicious injections).**
Different domain entirely (XSS / injection defense, not performance monitoring). Zero STRONG matches, zero DIFFERS. 12 elements flagged for human review but likely all non-applicable. This patent appears to have been in the watch list by mistake or as a precaution.

---

## Recommended provisional structure

Per the comparison engine output, the provisional should LEAD with the following novel-contribution claims, each tied to a non-infringement defense:

1. **Perceived-performance measurement in a continuous-update environment** — defends against Dynatrace 10846193, 11182537, 9571591 by establishing the continuous-mutation context where end-of-content-processing triggers don't apply.
2. **Client-only CLS measurement with in-browser result exposure** — defends against the entire prior-art set by establishing the no-remote-server architectural choice.
3. **Application-integrated instrumentation** (not agent-injected, not vendor-loaded) — defends against the Dynatrace family.
4. **Forward-looking layout-shift telemetry without session replay or state reconstruction** — defends against IBM 8533532 and the replay claims in 11182537.

---

## Caveats to attorney

- This is auto-detected heuristic analysis from string-matching FIELD-feature rules in `.github/field-features.yml` against claim elements. It is NOT a legal opinion. Doctrine of equivalents and prosecution history can substantially change the analysis.
- 86 claim elements were not matched by any rule and need human review. These are listed per-patent in the `-compare.md` files in `outbox/patents/`.
- The "monitoring node" argument is invoked 30+ times across the patent set. **If a future FIELD change introduces ANY backend telemetry collection (analytics endpoint, error reporting, A/B testing payload), that argument weakens substantially.** The provisional should describe the client-only architecture as a deliberate design constraint to strengthen this defense.

---

## Artifacts location

- **GitHub repo (canonical):** `jubilant-bassoon/outbox/patents/` — 6 `.json` + 6 `.txt` + 6 `-compare.md`
- **Dropbox:** root of personal Dropbox (will be `/FIELD/patents/` after setting `DROPBOX_PATENT_PATH` variable). All 12 artifacts.
- **No Drive copy** — Drive upload path parked due to Google service account quota policy (ADR-PATENT-001).

---

## Pending cleanup (low priority)

1. **Delete** `field-patent-uploader-bdf0ee663bd4.json` from Drive — file id `1Cs-mjjmcOyrH3lq_NdPohz5fseAIiDvY`. Contains private key in cleartext.
2. Set repo variable `DROPBOX_PATENT_PATH = /FIELD/patents` (Settings → Secrets and variables → Actions → Variables tab → New variable). Future uploads will be organized under that folder instead of root.
3. Optional: delete unused secrets `GDRIVE_SA_KEY`, `GDRIVE_PARENT_ID`.

---

## What's still pending (carried forward from prior sessions)

- Scoreboard not working (NBA Finals G1 live exposure)
- R2 Finals Narrative Context Phase 1 (Finals prompts ignore narrative)
- World Cup 2026 flip deadline June 11
- USPTO provisional filing June 25 (artifacts now in hand; attorney conversation unblocked)
