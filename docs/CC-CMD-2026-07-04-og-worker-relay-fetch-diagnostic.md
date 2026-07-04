# CC-CMD: Test the ONE remaining unknown directly — does src/worker.js's own fetch() to the relay actually succeed?

**Date:** 2026-07-04
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main
**Scope:** One temporary diagnostic route in `src/worker.js`, removed in
the same CC-CMD once it has answered the question.

**Why — this is the one thing never actually tested, not another
hypothesis:** every prior check tested the relay endpoint from a GitHub
Actions runner (works, confirmed repeatedly) or reasoned about
Cloudflare's routing/caching (both now fixed, confirmed). Nothing has
ever observed what happens when THIS Worker's own `fetch()` call to
`https://field-relay-nba.jeffunglesbee.workers.dev/circadian/preview/{date}`
actually executes inside Cloudflare's runtime — a genuinely different
network/execution context than a CI runner. `MetaTagRewriter`'s own
`if (!description) return response;` early-return means ANY failure
mode here (timeout, cross-Worker fetch restriction, DNS, TLS, anything)
produces exactly the observed symptom: a silent, byte-identical
passthrough with no error surfaced anywhere this session's tooling can
see. Testing this directly settles it in one pass instead of continued
speculation.

**Target time:** ~15 min

## ENVIRONMENT CONSTRAINTS (copy verbatim)
- *.workers.dev:443 blocked from CC egress — CI-as-proxy for the live check
- Playwright tests must run via GitHub Actions CI — never localhost
- api.github.com is reachable from CC bash
- No branch switching — work on main only
- 2 attempts max on any push — declare failure and stop if both fail

## CONFIDENCE GATE
Do not commit the PERMANENT state unless confidence ≥ 95 that the
diagnostic was added correctly and fully removed afterward. This
CC-CMD's deliverable is an ANSWER (what actually happens), not a
feature — report the raw result plainly even if it's not what anyone
expected.

## PROBE BLOCK (run before any edits)
```bash
cat src/worker.js
```
Confirm current state matches the post-argument-order-fix version
before adding the diagnostic.

## TASK 1 — Add a temporary diagnostic route

Inside the existing `fetch(request, env, ctx)` handler in
`src/worker.js`, add a new branch BEFORE the existing bot-detection
logic (so it works regardless of User-Agent, and is a temporary,
easily-removed addition, not entangled with the real logic):

```javascript
    async fetch(request, env, ctx) {
        // TEMPORARY DIAGNOSTIC (CC-CMD-2026-07-04-og-worker-relay-fetch-
        // diagnostic) -- tests whether THIS Worker's own fetch() to the
        // relay actually succeeds, since every prior check only tested
        // this from a GitHub Actions runner, never from inside a real
        // Cloudflare Worker execution context.
        const url = new URL(request.url);
        if (url.pathname === '/__diag_relay_fetch') {
            const result = { attempted: true };
            try {
                const tz = 'America/New_York';
                const today = new Date().toLocaleDateString('en-CA', { timeZone: tz });
                const targetUrl = `https://field-relay-nba.jeffunglesbee.workers.dev/circadian/preview/${today}`;
                result.targetUrl = targetUrl;
                const r = await fetch(targetUrl, { signal: AbortSignal.timeout(2000) });
                result.status = r.status;
                result.ok = r.ok;
                const text = await r.text();
                result.bodySnippet = text.slice(0, 300);
                try {
                    const data = JSON.parse(text);
                    result.parsedOk = data.ok;
                    result.parsedTextPresent = !!data.text;
                } catch (parseErr) {
                    result.jsonParseError = parseErr.message;
                }
            } catch (fetchErr) {
                result.fetchError = fetchErr.message;
                result.fetchErrorName = fetchErr.name;
            }
            return new Response(JSON.stringify(result, null, 2), {
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Non-bot traffic: pure passthrough, identical to today's behavior.
        if (!isBotRequest(request)) {
```

## TASK 2 — Deploy and call it, get the real answer

Bump SW_VERSION to trigger deploy (same established mechanism as the
prior CC-CMD, since `src/worker.js` alone isn't in deploy-gate's trigger
paths). Via CI-as-proxy, curl the live diagnostic route
(`https://jubilant-bassoon.jeffunglesbee.workers.dev/__diag_relay_fetch`)
and capture the full, real JSON response.

## TASK 3 — Remove the diagnostic in the SAME CC-CMD, report the answer

Once the real result is captured, remove the diagnostic branch entirely
(this is not permanent infrastructure) and deploy again to confirm
removal. Report the exact captured JSON from Task 2 in the outbox,
verbatim — whatever it says, including if it reveals a genuinely
unexpected cause not covered by this doc's own framing.

## SCOPE BOUNDARY

DO:
- Add exactly the one temporary diagnostic route
- Call it live, capture the real, complete JSON result
- Remove it in the same CC-CMD, confirm removal deployed
- Report the raw result verbatim in the outbox, whatever it shows

DO NOT:
- Leave the diagnostic route in the deployed code after this CC-CMD completes
- Attempt a permanent fix in this CC-CMD — this is purely diagnostic; a real fix (if the result points to one, e.g. adjusting the timeout, or something about cross-Worker fetch requiring a different approach) should be its own follow-up CC-CMD, not bundled in here
- Touch anything else in `src/worker.js`, `wrangler.jsonc`, or the relay

## DONE CONDITIONS
- [ ] Probe block re-run, current file state confirmed
- [ ] Diagnostic route added exactly as specified
- [ ] Live result captured and reported verbatim, complete, not summarized
- [ ] Diagnostic route removed, removal confirmed deployed
- [ ] Outbox manifest written to `docs/outbox/cc-og-worker-relay-fetch-diagnostic-{date}.md` with the full raw JSON result included

## COMPLIANCE
- Rule 68: probe block first
- Rule 87: self-completing — this is a single-pass diagnostic entirely achievable within this session

## CONFIDENCE SCORING TABLE
+30  Diagnostic added correctly, scoped exactly as specified
+40  Real, complete result captured and reported verbatim
+30  Diagnostic fully removed and removal confirmed deployed

## ONE-LINER
git pull. Read docs/CC-CMD-2026-07-04-og-worker-relay-fetch-diagnostic.md.
Add the temporary diagnostic route exactly as specified, deploy, call
it live via CI-as-proxy, capture and report the complete real JSON
result verbatim, then remove the diagnostic and confirm removal
deployed -- all in this one CC-CMD. Do not propose or implement a
permanent fix here, that's a follow-up. Do not commit unless confidence
≥ 95. If score < 95 report verbatim and stop — do not invent results.
