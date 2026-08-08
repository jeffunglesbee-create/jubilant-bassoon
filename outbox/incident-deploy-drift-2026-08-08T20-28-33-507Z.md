# Deploy Drift Incident — 2026-08-08T20:28:33.507Z

**Category:** incident (deploy-drift)

A commit touching a deploy-gate.yml-watched path
(index.html, sw.js, field_utils.js, wrangler.jsonc) has been on `main` for
922 minutes (commit `739ff868e419e41c3c2466711df51c7dc33e6ae8`, expected
SW_VERSION `2026-08-08a`), but the live site
(https://jubilant-bassoon.jeffunglesbee.workers.dev/) currently reports SW_VERSION `2026-08-06a`.

This means a real, well-formed commit did not deploy within a normal
window. Detection only -- no automated remediation was attempted.
Real next step: check deploy-gate.yml's recent run history for this
commit SHA; if it never fired, this may be the same class of silent
push-trigger failure documented in
`outbox/cc-session-2026-08-02-trigger-deploy-gate.md`.
