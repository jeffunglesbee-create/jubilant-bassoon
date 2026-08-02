# CC-CMD-2026-08-02-wire-laliga-apim-standings-v2

**Repo:** jubilant-bassoon
**Branch:** main — commit directly, do not create a feature branch or PR

One-liner:
```
git remote get-url origin | grep -q jubilant-bassoon || { echo "WRONG REPO"; exit 1; }
git pull. Read docs/CC-CMD-2026-08-02-wire-laliga-apim-standings-v2.md. Execute all tasks.
Do not commit unless confidence >= 95. If score < 95, report verbatim and stop.
```

---

## The real answer — not a guess, a re-observed fact

The prior attempt at this CC-CMD (`outbox/cc-session-2026-08-02-wire-
laliga-apim-standings.md`) concluded the subscription key had rotated,
based on finding `06969d3c68ed97998b7e0f6b97e06766` in `www.laliga.com`'s
`__NEXT_DATA__` and getting 401 with it. **That conclusion was wrong.**

A follow-up diagnostic (field-playground, read-only investigation, no
production dependency) let a real browser make the real, successful
request naturally instead of guessing header shapes, and captured
exactly what it sent. Real result, this session, HTTP 200:

```
GET https://apim.laliga.com/public-service/api/v1/digitalassets/clasificacion?contentLanguage=en&countryCode=US&subscription-key=c13c3a8e2f6b46da9c5c425cf61fab3e

Real headers:
  referer: https://www.laliga.com/
  country-code: US
  ocp-apim-subscription-key: c13c3a8e2f6b46da9c5c425cf61fab3e
  accept: application/json, text/plain, */*
  content-language: en
  user-agent: (real browser UA)
```

**The key is `c13c3a8e2f6b46da9c5c425cf61fab3e` — the ORIGINAL key from
first discovery, not a rotated one.** LaLiga's SSR payload ships
multiple subscription keys for different subsystems
(`backendSubscription` vs `webviewSubscription`, and apparently at
least one more) — the prior session's field-extraction grabbed a
different key than the one `clasificacion` actually needs. This is a
real, disclosed correction, not a re-guess.

## Task 1 — Re-verify this exact finding fresh (Rule 87)

- Re-confirm from HEAD that `clasificacion` still returns 200 with
  `c13c3a8e2f6b46da9c5c425cf61fab3e` and the header set above, via a
  real request built from this exact shape — not another guess, this
  specific one, confirmed working minutes before this doc was written.
- If it no longer works by the time this executes, stop and report —
  do not fall back to guessing again.

## Task 2 — Relay route, using the confirmed-working shape

- Add a relay route (e.g. `/laliga-apim/clasificacion`) proxying the
  real endpoint with the real header set above. Key lives server-side
  (Rule 80), same discipline as any other credential.
- Real failure handling: if this specific, confirmed shape ever stops
  working, log clearly and fall back to the existing FD-sourced La
  Liga standings path — do not let this take down a working source.

## Task 3 — Wire standings only, this pass

- Same scope as the original CC-CMD: standings only, cross-check
  against FD's existing La Liga data or use as primary if FD has a
  known gap (re-check FD's current behavior fresh, don't assume).
- Do not wire the other nine confirmed apim endpoints this pass.

## Task 4 — Smoke + verify

- `node smoke.js` — 0 failures required.
- Real verification: confirm the new route returns real data via a
  live probe, and confirm the fallback path is genuinely tested.

---

## Explicitly NOT in scope

- Do not re-investigate whether the key rotated — this is answered,
  confirmed by direct re-observation, not assumed.
- Do not wire the other nine endpoints, remove FD's existing path, or
  treat this key with less care than a normal credential.

---

## Outbox

`outbox/cc-session-2026-08-02-wire-laliga-apim-standings-v2.md`: real
confirmation the exact shape above still works, the shipped relay
route, and real fallback verification.
