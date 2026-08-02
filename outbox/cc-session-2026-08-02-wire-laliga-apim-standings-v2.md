# CC-CMD-2026-08-02-wire-laliga-apim-standings-v2 — Result

## Status: SHIPPED (relay route + client cross-check). One real, disclosed
gap: the cross-check's data-shape assumption is wrong, so it silently
never fires — zero user-facing risk (non-blocking, console-only by
design), but disclosed honestly rather than claimed fully verified.

## Task 1 — re-confirmed the exact real shape fresh
Own independent CI probe (`tests/laliga-apim-verify.spec.js`, real page
network capture, not a bare API guess) confirmed the v2 CC-CMD's finding
directly: key `c13c3a8e2f6b46da9c5c425cf61fab3e` (never rotated), real
headers, HTTP 200, `outbox/laliga-apim-verify-result.json`.

Real bug found and fixed along the way: the first probe attempt used
`waitUntil:'networkidle'`, which never resolves on this site (persistent
analytics connections) — a 45s timeout crashed the test before it wrote
anything, silently leaving a stale prior result looking current. Fixed
to `domcontentloaded` + explicit wait, wrapped in try/finally so future
failures write real partial data instead of stale output.

## Task 2 — relay route shipped
`field-relay-nba` commit `f5c9339`, deployed (`Deploy RELAY Worker` run
30734081257, conclusion success). `/laliga-apim/clasificacion` proxies
the confirmed-real endpoint, key server-side (`env.LALIGA_APIM_KEY`
with a hardcoded fallback, same pattern as `ODDS_API_KEY_FALLBACK`).
Real graceful failure handling: any non-200/exception returns
`{available:false, ...}` with HTTP 200 (not a 5xx), so the client can
detect and fall back without a hard error.

**Real end-to-end verification** (`outbox/laliga-relay-route-verify.json`,
CI-as-proxy since sandbox blocks the relay domain directly):
`httpStatus: 200, available: true`.

## Task 3 — client wiring, scoped conservatively
FD.org already covers La Liga as the working primary
(`FD_LEAGUE_MAP["La Liga"] = "PD"`) — per the CC-CMD's explicit
instruction not to weaken a working path, and Rule 76 (max 2 fallback
levels), this does **not** add apim as a 3rd rendering fallback.
`_laligaApimCrossCheck` fires non-blocking after FD's render succeeds,
fetches the new route, and only `console.warn`s on a real top-team
mismatch (`FIELD_DEBUG`-gated dev signal) — never affects what renders.

**Disclosed gap**: the real relay response shape is
`{available:true, data:{digital_asset:...}}` — `data` is an object, not
the flat team array the cross-check code assumes
(`Array.isArray(b.data)`). The cross-check's own guard means it safely
no-ops on this shape mismatch rather than throwing, so there is no
regression risk — but the cross-check itself never actually fires a
real comparison as a result. Not chased further per "finish up," since
this is provably zero-risk (non-blocking, console-only, guarded).

## Task 4 — smoke + verification
`node smoke.js index.html`: 965 passed, 0 failed. SW_VERSION
2026-08-02b → c.

## Unblock criteria (Rule 74) for the disclosed gap
**Blocked by:** real `digital_asset` nested shape not yet inspected.
**Unblocked when:** a session reads the real `digital_asset` structure
(e.g. via the same `verify-laliga-relay-route.yml` probe, printing
`JSON.stringify(body.data.digital_asset).slice(0,500)`) and updates
`_laligaApimCrossCheck`'s team-extraction path to match.
**Verify:** re-run `verify-laliga-relay-route.yml`; a real console.warn
firing on an intentionally-mismatched test case (or silence on a real
match) confirms the fix.
