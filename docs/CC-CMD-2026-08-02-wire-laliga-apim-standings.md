# CC-CMD-2026-08-02-wire-laliga-apim-standings

**Repo:** jubilant-bassoon
**Branch:** main — commit directly, do not create a feature branch or PR

One-liner:
```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git pull. Read docs/CC-CMD-2026-08-02-wire-laliga-apim-standings.md. Execute all tasks.
Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```

---

## What's real, confirmed minutes before this doc was written

Real browser network capture (via CI, `field-playground/scripts/probe-
laliga-network-capture.mjs`) confirmed `apim.laliga.com` is LaLiga's
own real backend. `www.laliga.com`'s own `__NEXT_DATA__` SSR payload
ships a public subscription key to every visitor
(`c13c3a8e2f6b46da9c5c425cf61fab3e` at capture time). Ten real
endpoints returned real HTTP 200 data, including
`/public-service/api/v1/digitalassets/clasificacion` — official
standings, matching the exact table structure a manual page capture
showed earlier the same session (Sevilla 1st, Athletic Club 2nd, etc.,
all currently 0 points — preseason, confirmed correct given LALIGA
2026-27 kicks off after EPL).

**This is a genuinely new discovery, not an established integration.**
It was found by passive observation, not documented by LaLiga as a
public API. Treat it with more caution than FD/FPL/ESPN, which are
either licensed or have years of stable observed behavior in this
codebase.

---

## Task 1 — Re-verify from HEAD before writing anything (Rule 87)

- Re-run the real network capture fresh — the subscription key, or the
  whole `apim.laliga.com` backend, could plausibly have changed in the
  time since discovery. Confirm the same key (or a new one) still
  authenticates, and confirm `clasificacion` still returns real 200
  data before building anything on top of it.
- Confirm current relay routing conventions fresh (how FD/FPL routes
  are structured, TTL patterns, header conventions) — match the
  established pattern rather than inventing a new one.

## Task 2 — Relay route, server-side key, graceful by design

- Add a relay route (e.g. `/laliga-apim/clasificacion`) proxying
  `apim.laliga.com/public-service/api/v1/digitalassets/clasificacion`.
  The subscription key lives server-side in the relay, same as every
  other credential in this project (Rule 80) — even though it's
  technically shipped in plaintext to every laliga.com visitor, treat
  it with the same discipline as any other key: never in client JS,
  never in a commit, never in this doc beyond the one value already
  disclosed in the discovery doc for provenance.
- **This key is undocumented and could be rotated, rate-limited, or
  blocked at any time with no warning** — this is not FD's licensed,
  stable relationship. Build real failure handling: if the request
  fails or the key stops authenticating, log it clearly and fall back
  to the existing FD-sourced La Liga standings path. Do not let this
  new, unproven source take down or degrade an existing working one.

## Task 3 — Wire standings only, this pass

- Consume the new standings data for La Liga specifically — either as
  a cross-check against FD's existing standings (flag any real
  discrepancy, don't silently prefer one) or, if FD's La Liga coverage
  has a known gap this fills, as the primary source with FD as fallback.
  Determine which based on what FD's actual current La Liga standings
  behavior is (re-check fresh, don't assume from memory).
- Do NOT wire player rankings, upcoming matches, season stats, or
  broadcaster listings in this pass — all confirmed real, but standings
  alone is the highest-value, lowest-risk piece worth production trust
  on a same-day discovery. Note the other nine endpoints as a real,
  scoped follow-up candidate, not silently dropped.

## Task 4 — Smoke + verify

- `node smoke.js` (confirm current filename fresh) — 0 failures required.
- Real verification: confirm the new route returns real data via a
  live probe, and confirm the fallback path genuinely activates if the
  new source is made to fail (simulate a bad key or a 500, don't just
  assume the fallback code is correct because it compiles).

---

## Explicitly NOT in scope

- Do not wire the other nine confirmed endpoints — separate, later
  decision.
- Do not treat this key with less caution than a normal credential
  just because it's technically public — same server-side-only
  handling as everything else.
- Do not remove or weaken FD's existing La Liga standings path — this
  is additive/cross-checking, not a replacement, unless Task 3's
  investigation finds a real, specific reason FD's path is worse.

---

## Outbox

`outbox/cc-session-2026-08-02-wire-laliga-apim-standings.md`: the
fresh re-verification result, whether the key/endpoint held or changed
since discovery, the FD-comparison decision and why, and confirmation
the fallback path was genuinely tested, not assumed.
