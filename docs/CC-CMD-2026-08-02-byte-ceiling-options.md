# CC-CMD-2026-08-02-byte-ceiling-options

**Repo:** jubilant-bassoon
**Branch:** main — commit directly, do not create a feature branch or PR

One-liner:
```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git pull. Read docs/CC-CMD-2026-08-02-byte-ceiling-options.md. Execute all tasks.
Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```

---

## Why this exists

The `index.html` byte ceiling has been hit twice in one session on
ordinary feature work (NFL drama data, an earlier byte-reclaim fix).
CFB/NFL both just added real weight. This will keep recurring, more
often as more sports/features land, not less. This CC-CMD investigates
the real options — it does not choose one.

## Task 1 — Establish the real facts fresh (Rule 87)

- Confirm the actual current ceiling value and where it's enforced
  (build step, deploy-gate check, or both) — re-read from HEAD, don't
  assume this doc's description is current.
- Confirm the actual current byte count and real headroom remaining.
- Find why this specific ceiling value was originally chosen (check
  git history / STANDARDS.md / ADRs for the real reasoning) rather
  than assuming it was arbitrary.

## Task 2 — Present real options with real tradeoffs, not a recommendation

For each option below, investigate concretely (not hypothetically)
what it would actually require:

1. **Raise the ceiling.** What's the real constraint being protected
   against right now (load time? a Cloudflare Worker size limit? something
   else)? If the real constraint is a hard platform limit, state the
   real number; if it's a soft, chosen guideline, state that too.
2. **Split index.html.** Would genuinely splitting into multiple files
   work given this is a single-file PWA by design (per this project's
   own architecture) — what would actually break, concretely, not
   speculatively?
3. **Standing byte-reclaim overhead.** What would it look like to make
   byte-reclaim a routine, expected step in CC-CMDs that touch
   `index.html`, rather than an emergency fix each time — is there a
   real, automatable way to flag "this commit will exceed the ceiling"
   before a session hits it blind, the way the deploy-drift-detector
   catches deploy failures after the fact?

## Task 3 — Do not decide, present clearly

Output a real, structured comparison — not a single recommended path.
This is Jeff's decision; the job here is making it informed, not
making it for him.

## Task 4 — Smoke + verify

- `node smoke.js` — 0 failures required (report-only task, should be
  a no-op check).

---

## Explicitly NOT in scope

- Do not raise the ceiling.
- Do not split `index.html`.
- Do not build the "warn before hitting the ceiling" mechanism from
  option 3 — investigate its feasibility only, don't build it here.

---

## Outbox

`outbox/cc-session-2026-08-02-byte-ceiling-options.md`: the real,
current facts and a clear, decision-ready comparison of the three
options above.
