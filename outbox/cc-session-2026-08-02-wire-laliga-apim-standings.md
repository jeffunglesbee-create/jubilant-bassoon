# CC-CMD-2026-08-02-wire-laliga-apim-standings — Result

## Status: STOPPED at Task 1. Confidence < 95. Reporting verbatim per
the CC-CMD's own gate, not proceeding to Task 2/3/4.

## Approach note
`field-playground` (where the original discovery script lives) was
correctly NOT added to this session — re-reading Task 1's actual text
found it already requires an independent, jubilant-bassoon-only
re-verification script, not a call-out to that repo. Built
`tests/laliga-apim-verify.spec.js` +
`.github/workflows/laliga-apim-verify-probe.yml`, matching this repo's
established CI-as-proxy probe convention.

## Real result (`outbox/laliga-apim-verify-result.json`, two runs)

The subscription key **genuinely rotated** since the original
discovery: `06969d3c68ed97998b7e0f6b97e06766` (found fresh today in
`www.laliga.com`'s `__NEXT_DATA__`) vs. the originally-captured
`c13c3a8e2f6b46da9c5c425cf61fab3e`. This is itself informative — it
confirms the CC-CMD's own stated risk ("the subscription key... could
plausibly have changed") was real, not hypothetical.

The new key does **not** authenticate against
`apim.laliga.com/public-service/api/v1/digitalassets/clasificacion`.
Tried 4 real variants before concluding, since the exact request shape
the original capture used was never confirmed (no access to that
script):
```
Ocp-Apim-Subscription-Key header only        -> 401
Ocp-Apim-Subscription-Key + Origin/Referer   -> 401
lowercase subscription-key header            -> 401
query param subscription-key                 -> 401
```

## Why this stops here

Task 1's explicit gate: "Confirm the same key (or a new one) still
authenticates... **before building anything on top of it**." None of
the 4 real attempts authenticated. Building a relay route (Task 2) on
top of a key that doesn't work would mean shipping dead code with no
real data behind it — exactly what the CC-CMD explicitly warns against
elsewhere in this same document (the Bundesliga sibling CC-CMD's
"worse than not building this at all" language applies equally here).

## What was NOT ruled out (genuine limits, disclosed)

- Only 4 auth-shape variants were tried. It's possible the real
  browser sends a header/cookie/token this probe didn't replicate
  (e.g. a session cookie set during page load, not just the visible
  subscription key).
- The key may simply be dead/deprecated now — LaLiga could have
  tightened `apim.laliga.com` access since the original passive
  discovery, consistent with the CC-CMD's own framing that this was
  "found by passive observation, not documented... as a public API."

## Unblock criteria (Rule 74)

**Blocked by:** no known-working auth shape against `apim.laliga.com`
as of 2026-08-02.
**Unblocked when:** a session with real browser DevTools access to
`www.laliga.com`'s live standings page captures the exact outgoing
request to `clasificacion` (headers, cookies, and body) while
authenticated as a real visitor, confirming whether it's the key
alone, an additional header, or a session artifact this probe
couldn't produce headlessly.
**Verify:** re-run `laliga-apim-verify-probe.yml` (`workflow_dispatch`,
no inputs) after any such finding is incorporated into the probe spec;
`clasificacionOk: true` in the result JSON is the done condition.

No code shipped. FD's existing La Liga standings path is completely
untouched.
