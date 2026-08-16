# Deploy Drift Incident — 2026-08-16T02:42:29.132Z

**Category:** incident (deploy-drift)

A commit touching a deploy-gate.yml-watched path
(index.html, sw.js, field_utils.js, wrangler.jsonc) has been on `main` for
104 minutes (commit `1fecea4d62deb554295663b43c851487d9796d2c`, expected
SW_VERSION `2026-08-15i`), but the live site
(https://jubilant-bassoon.jeffunglesbee.workers.dev/) currently reports SW_VERSION `2026-08-15h`.

This means a real, well-formed commit did not deploy within a normal
window. Detection only -- no automated remediation was attempted.
Real next step: check deploy-gate.yml's recent run history for this
commit SHA; if it never fired, this may be the same class of silent
push-trigger failure documented in
`outbox/cc-session-2026-08-02-trigger-deploy-gate.md`.
