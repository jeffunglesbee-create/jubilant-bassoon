FIELD Session Record — 2026-05-29 (TYPE B: Web Push shipped end-to-end)

Type: TYPE B (feature build, deployed)
Repos at close: jubilant-bassoon (client) + field-relay-nba (relay)
(In-repo because Drive writes are unavailable from the sandbox. ACTION: merge to the Drive
 session log from a machine with Drive edit access.)

GOAL: turn on Web Push delivery (VAPID + client subscribe flow) on top of the ADR-002 Rule D
cron shipped earlier in the day.

WHAT WAS BUILT / DEPLOYED
- VAPID keypair generated once (web-push, ES256/P-256). Private key set as a field-relay-nba
  repo Actions secret via PyNaCl sealed box (never printed); both halves wired into deploy.yml's
  wrangler-action secrets so the deploy installs them as Worker secrets. Public key:
  BA94Jhq_0-6Hm07vN40MkakAdW4EMqMbiQh3ZkoWlvOnoes4Ds-IhKoLSe39BhL6vR8HAE2KLClmHyaLaldqFXg
  Relay deploy: b7f4888. cf-api-probe confirmed VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY bound.
- Client subscribe flow (index.html 2abe58f): #push-enable-btn now requests permission then
  pushManager.subscribe with the VAPID public key and POSTs {subscription, prefs:{}} to the relay
  /push/subscribe. Opt-in; idempotent. Added urlBase64ToUint8Array helper.
- computePushDrama fix (sw.js 0aaf749): removed the brittle isLate string gate that suppressed all
  alerts; now scores on margin (relay pre-gates late+close) with a loose very-late bonus. Optional
  d.periodNum supported (relay does not send it yet — forward-compat).

VERIFICATION
- All three deploys green (relay b7f4888; client 2abe58f, 0aaf749).
- VAPID secrets confirmed on the worker via cf-api-probe of relay settings.
- PUSH_SUBS KV readable, 0 subscriptions (expected — a real subscription requires a browser
  running pushManager, which the sandbox cannot do).

END-TO-END PATH (live): Enable -> permission -> pushManager.subscribe -> relay /push/subscribe
stores sub:<hash> -> */5 cron emits SCORE_CHANGE facts on late+close games -> SW computePushDrama
+ Drama Dial gate display.

REMAINING
- Browser opt-in test (Jeff): click Enable on the live site; re-probe PUSH_SUBS to confirm a
  sub:<hash> key appears.
- Optional: add periodNum to the relay SCORE_CHANGE payload (one line + relay deploy) for a
  deterministic very-late bonus on NBA/NFL regulation 4th quarter.
- Legacy DRAMA_THRESHOLD handler in sw.js dormant; deletable later.

POSTURE / RULE 45: client subscribe + on-device computePushDrama are Component 2 (per-device,
single drama dimension; Numerical Usage Policy Case C). Notification trigger remains the relay's
factual gate, not an interest threshold. Conforms to documented architecture; ADR-002 PROPOSED,
counsel's call.

SMOKE: jubilant-bassoon smoke.js 242 passed / 0 failed.
