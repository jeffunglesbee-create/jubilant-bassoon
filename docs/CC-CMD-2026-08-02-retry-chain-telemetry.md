# CC-CMD-2026-08-02-retry-chain-telemetry

**Repo:** jubilant-bassoon
**Branch:** main — commit directly, do not create a feature branch or PR

One-liner:
```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git pull. Read docs/CC-CMD-2026-08-02-retry-chain-telemetry.md. Execute all tasks.
Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```

---

## Why this exists

Confirmed directly in source: journalism generation chains through up
to 7 sequential quality gates (`retryWithoutCliches`,
`retryWithoutWireCopy`, `retryWithoutNarrativeHallucination`,
`retryWithRecordAttribution`, `checkLeadSentence`,
`checkStatVerification`, `checkCrossSport`, `maybeScoreRetry`), each
independently capable of triggering its own real LLM retry call. Each
gate is individually well-designed (a real, local, free check before
ever calling out). What's genuinely unknown: how often multiple gates
fire on the *same* piece of content in real production traffic. That
number determines whether consolidating them into a single retry call
saves meaningfully or optimizes a rare edge case — this CC-CMD
measures it before anything gets built.

## Task 1 — Re-verify from HEAD before writing anything (Rule 87)

Read the real, current implementation of every gate function fresh —
confirm the exact list and call order hasn't changed since this doc
was written, and confirm no existing telemetry for this already exists
(check D1/codex for a table that might already answer this before
building a new one).

## Task 2 — Add telemetry only, zero behavior change

For each gate in the real chain, when it genuinely triggers its own
retry (not on every call — only on the branch where a retry actually
fires), record a lightweight event: which gate, which journalism type/
label, and whether this is the 1st/2nd/3rd+ gate to fire for this
specific piece of content within the same generation (needs a
per-generation correlation id — check if one already exists in this
pipeline, e.g. a jobId, before inventing a new one).

- Write to D1 (`ARCHIVE_DB`/`codex`-adjacent table, matching this
  project's existing telemetry conventions — check the real, current
  pattern before choosing a shape) via the existing relay proxy path,
  not a new external service.
- **This must not change what the client does or how it decides to
  retry** — purely additive observation. If a change is genuinely
  required to add the correlation id, keep it to the absolute minimum
  and state exactly what changed and why.
- Fire-and-forget, non-blocking — a telemetry write failure must never
  affect journalism delivery (matching this project's established
  "Rule 5" principle — journalism must never be blocked by anything
  non-essential).

## Task 3 — Real verification

- `node smoke.js` — 0 failures required.
- Confirm the telemetry actually records real events against real,
  live journalism generation (not a synthetic test) — trigger a real
  generation likely to hit at least one gate, confirm a real row
  lands.

## Task 4 — Do not analyze yet

This CC-CMD ships instrumentation only. Do not draw conclusions or
build the consolidation — there won't be enough real data yet at
execution time. State clearly in the outbox how long telemetry should
run before there's enough real signal to analyze (a reasoned estimate
given this project's real traffic volume, not an arbitrary number).

---

## Explicitly NOT in scope

- Do not consolidate the retry gates — that's a separate, later
  decision once real data exists.
- Do not change any gate's actual trigger condition or retry logic.

---

## Outbox

`outbox/cc-session-2026-08-02-retry-chain-telemetry.md`: what was
instrumented, real confirmation of a live event landing, and a stated,
reasoned window for when enough data will exist to analyze.
