# Deploy Drift Incident — 2026-08-04T17:48:51.009Z

**Category:** incident (deploy-drift)

A commit touching a deploy-gate.yml-watched path
(index.html, sw.js, field_utils.js, wrangler.jsonc) has been on `main` for
673 minutes (commit `bc02927c8b4e4667f4420b2b8a85f675d8b496b8`, expected
SW_VERSION `2026-08-04a`), but the live site
(https://jubilant-bassoon.jeffunglesbee.workers.dev/) currently reports SW_VERSION `2026-08-02h`.

This means a real, well-formed commit did not deploy within a normal
window. Detection only -- no automated remediation was attempted.
Real next step: check deploy-gate.yml's recent run history for this
commit SHA; if it never fired, this may be the same class of silent
push-trigger failure documented in
`outbox/cc-session-2026-08-02-trigger-deploy-gate.md`.
