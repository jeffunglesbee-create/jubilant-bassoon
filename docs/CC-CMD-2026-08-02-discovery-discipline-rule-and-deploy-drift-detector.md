# CC-CMD-2026-08-02-discovery-discipline-rule-and-deploy-drift-detector

**Repo:** jubilant-bassoon
**Branch:** main — commit directly, do not create a feature branch or PR

One-liner:
```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git pull. Read docs/CC-CMD-2026-08-02-discovery-discipline-rule-and-deploy-drift-detector.md. Execute all tasks.
Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```

---

## Why this exists

Both pieces are automation follow-ups to a "what should FIELD be
watching for" reflection, not fixes to a specific bug.

## Task 1 — Codify undocumented-API discovery discipline as a new rule

Today's LaLiga (apim.laliga.com) and Bundesliga (wapp.bapi.bundesliga.com)
discoveries were handled carefully — `apim-int.laliga.com` identified
passively and never contacted, `api.laliga.com`'s robots.txt respected,
discovered keys treated with the same server-side-only discipline as any
other credential despite being technically shipped in plaintext to every
site visitor. But that discipline lived in individual judgment calls each
time, not in a written, citable standard. As this pattern scales to more
leagues, that's a real gap — the next discovery deserves the same care by
default, not by re-deriving it from scratch.

**Read STANDARDS.md's current rule numbering fresh from HEAD** (don't
assume the count from memory) and add a new rule, in the same format and
rigor as the existing numbered rules, covering:

- Never navigate to, request, or probe a variant/endpoint identified only
  passively (e.g. found in a payload's own reference to an internal/admin
  subdomain) — identification is not authorization to contact it.
- Respect `robots.txt` on any newly-discovered host, even when a
  functionally-similar endpoint on a different host is fair game.
- Any discovered key or credential — regardless of whether it was shipped
  in plaintext to every visitor — gets the same server-side-only handling
  as any other credential (Rule 80's existing discipline extends here, not
  a separate, lesser standard for "technically public" values).
- Any integration built on an undocumented, reverse-engineered endpoint
  must have a real, tested fallback path for when it stops working —
  it does not get to be a single point of failure the way a licensed,
  contracted data source can more safely be.
- Before treating a discovery as stable, re-verify it fresh rather than
  trust an earlier session's capture — undocumented endpoints can change
  without notice (today's LaLiga false "key rotated" alarm is a real
  example: the key hadn't rotated, but treating an unverified assumption
  as fact wasted a full CC-CMD cycle before the real explanation surfaced).

## Task 2 — Scheduled deploy-drift detector

`deploy-gate.yml`'s push trigger silently failed to fire today for a
well-formed commit — found by accident, hours later, via a manual "pull
and verify" pass, not because anything caught it proactively.

Add a new scheduled workflow (e.g. every 30–60 min — check this repo's
existing scheduled-workflow conventions and match the cadence pattern
already used elsewhere rather than picking arbitrarily) that:

- Compares the latest real commit on `main` touching a `deploy-gate.yml`-
  watched path against what's actually live (a real curl check of a
  known, version-stamped marker — `SW_VERSION` is already exactly this;
  reuse it, don't invent a new marker).
- If they diverge beyond a reasonable window (a fresh commit exists but
  the live site's `SW_VERSION` doesn't reflect it after enough time for a
  normal deploy to have completed), write a real, checkable record —
  `codex_write` with `category:"incident"` if that tool is available in
  this workflow's context, or a committed file under `outbox/` if not —
  so the next session sees it without needing to stumble onto it
  manually, the way this session did.
- Do not attempt to auto-remediate (e.g. don't have this workflow try to
  fire `workflow_dispatch` itself) — this is detection only. A human or
  a future session decides the response.

## Task 3 — Smoke + verify

- `node smoke.js` — 0 failures required.
- Confirm the new rule is real, numbered correctly, and doesn't duplicate
  or contradict Rule 80 or any existing rule — read the surrounding rules
  before finalizing the number and wording.
- Trigger the new scheduled workflow manually once (if it supports
  `workflow_dispatch` for testing) and confirm it runs cleanly against
  the current, healthy state (no false-positive drift reported).

---

## Explicitly NOT in scope

- Do not modify ADR-002-CONTEXT.md — that document is specifically
  RUWT/patent-compliance scoped; this is a different governance domain
  (data-sourcing discipline) and belongs in STANDARDS.md instead.
- Do not build the undocumented-API health-check workflow — that's a
  separate, field-relay-nba-scoped CC-CMD.
- Do not attempt automated remediation in the drift detector.

---

## Outbox

`outbox/cc-session-2026-08-02-discovery-discipline-rule-and-deploy-drift-detector.md`:
the real new rule number and text, and confirmation the drift detector
ran cleanly against current healthy state.
