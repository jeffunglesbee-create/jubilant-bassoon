# Claude Code Command — Canonical Doc ID Consolidation

**Branch:** main — commit directly, do not create a feature branch or PR.

git pull. Read CLAUDE.md / STANDARDS.md.

Write findings to outbox/cc-canonical-doc-id-consolidation-2026-07-01.md.

## CONTEXT

Two governance systems disagree about which Drive doc is "FIELD Current
State":
- `GOVERNANCE.json`'s `canonical_docs` array points to
  `1QD3P9eG2pSdabNTMPZYHwaMc1DawmmKpRVrv0ZqQdVs` — verified via Drive
  metadata: created May 22, never modified since. Dead duplicate.
- `STANDARDS.md`'s scattered inline references (lines ~27, 47, 117, 307,
  2229 as of 2026-07-01 — re-grep, don't trust these line numbers) point
  to `1GvsfnTH9Xhqzg_NdYrPhPpk1d1Rnm0lkeG6ip-tLUlA` — the one actually
  kept semi-current (last real edit May 25).

Both are now superseded anyway. Two new v2 docs were created chat-side
2026-07-01 (Drive edit-in-place is unavailable to chat — no
update/patch tool exists, only create/read/download, confirmed by
exhaustive tool search):

- FIELD Current State v2: `1ahx6cS_Z5sfjb9sMS2Uqjypgy37xbI3M08PjZOh4G74`
- Daily Update Reference v2: `12QY-zSOpWhAbT3VVTxxDXt7mvIhQ5HwQW5VhJHoPUXw`

## PRE-BUILD PROBE (Rule 87)

```bash
grep -n "1GvsfnTH9Xhqzg_NdYrPhPpk1d1Rnm0lkeG6ip-tLUlA\|1oSHqnDskN04p95g6e85--4hhgIsKISZ3ZflLXKPM08E" STANDARDS.md
cat GOVERNANCE.json | python3 -m json.tool | grep -A3 "FIELD Current State"
```

Re-confirm every occurrence and exact GOVERNANCE.json structure fresh —
do not trust the line numbers or JSON shape described above without
re-checking, other commits may have landed since this was written.

## TASK 1: Update every STANDARDS.md occurrence

Replace every occurrence of `1GvsfnTH9Xhqzg_NdYrPhPpk1d1Rnm0lkeG6ip-tLUlA`
with `1ahx6cS_Z5sfjb9sMS2Uqjypgy37xbI3M08PjZOh4G74`.

Replace every occurrence of `1oSHqnDskN04p95g6e85--4hhgIsKISZ3ZflLXKPM08E`
with `12QY-zSOpWhAbT3VVTxxDXt7mvIhQ5HwQW5VhJHoPUXw`.

Use the probe's grep output to find every site — do not assume the count
found during this CC-CMD's authoring (5 for the first ID) is complete or
still accurate.

## TASK 2: Update GOVERNANCE.json

Update the `"FIELD Current State"` entry's `"id"` field to
`1ahx6cS_Z5sfjb9sMS2Uqjypgy37xbI3M08PjZOh4G74` (replacing the dead
`1QD3P9eG2p...` duplicate). Add a `"Daily Update Reference"` entry if one
doesn't already exist in `canonical_docs` (check the probe output —
don't assume it's missing or present). Set `last_verified` to today's
actual date, not a hardcoded string.

## TASK 3: Verification

```bash
grep -c "1GvsfnTH9Xhqzg_NdYrPhPpk1d1Rnm0lkeG6ip-tLUlA\|1oSHqnDskN04p95g6e85--4hhgIsKISZ3ZflLXKPM08E" STANDARDS.md
```
Done condition: 0 — no old IDs remain anywhere in STANDARDS.md.

```bash
node smoke.js index.html
```
A141/A142/A144 (GOVERNANCE.json validity checks) still pass.

## TASK 4: Outbox manifest

Note explicitly in the outbox doc: the two OLD Drive docs
(`1GvsfnTH9X...`, `1oSHqnDskN04p95g6e85...`) and the dead duplicate
(`1QD3P9eG2p...`) are now orphaned — nothing in the repo points to them
anymore. They are not deleted (chat has no Drive delete capability
either), just abandoned. Worth a manual Drive cleanup at some point, not
part of this CC-CMD's scope.
