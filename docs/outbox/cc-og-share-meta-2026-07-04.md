# CC Outbox — Dynamic OG Share Meta (HTMLRewriter, bot-gated)

**Date:** 2026-07-04
**CC-CMD:** docs/CC-CMD-2026-07-04-og-share-meta.md
**Commit:** 9dab55d
**Deploy:** Deploy gate (fast smoke) run 28691049214 — all 8 steps
succeeded, including "Deploy to Cloudflare Workers" (01:40:18–01:40:42Z)

---

## HARD DEPENDENCY — verified live before implementation

Sandbox egress to `*.workers.dev` is blocked (confirmed: direct `curl`
to `field-relay-nba.jeffunglesbee.workers.dev/circadian/preview/...`
returned curl exit 56, connection reset — the documented, pre-existing
block, not a relay-down signal). `mcp__FIELD_Handoff__probe_relay_route`
does not have this route on its allow-list (checked; allow-list is
hardcoded relay-side and predates this endpoint).

Used the established CI-as-proxy pattern instead: repurposed
`outbox/.trigger-cf-api` (normally for Cloudflare API calls, but it's a
generic "curl a URL from CI" mechanism) to GET the real endpoint from a
GitHub Actions runner. Real response, commit `4f2d7f8`
(`outbox/cf-result-20260704T013733Z.txt`):

```json
{
    "ok": false,
    "text": null,
    "source": null,
    "phase": "preview",
    "date": "2026-07-04"
}
```

This is a live, well-formed JSON response (not a 404) — the relay
CC-CMD has shipped. It also happens to exercise this Worker script's own
graceful-degradation path for real: `data.ok` is `false` today, so
`description` resolves to `null` under the exact code path
`description = data.ok ? data.text : null`, which correctly falls
through to `return response` (unmodified page). The relay endpoint's
current no-content-yet state and this Worker's null-description handling
were verified together, not just each in isolation.

## CC-VERIFIABLE CONFIDENCE SCORE: 100/100

- **+40** — `src/worker.js` confirmed **byte-for-byte identical** to the
  CC-CMD's Task 1 code block (diffed programmatically, zero delta).
  `node --check src/worker.js` clean.
- **+30** — `wrangler.jsonc` diff is minimal (`+main`, `+assets.binding`).
  Checked every other workflow that could assume the prior assets-only
  shape: `deploy-gate.yml` (still triggers correctly — `wrangler.jsonc`
  is in its `paths:` filter), `smoke-and-verify.yml`, `field-autodeploy.yml`
  — none reference `wrangler.jsonc`'s internal shape or a build step that
  would break with a `main` field added. `smoke.js` has no wrangler.jsonc
  assertions.
- **+30** — Graceful-degradation path traced end-to-end: the whole relay
  fetch is inside one `try/catch`; a thrown/timed-out fetch leaves
  `description = null`; a non-`ok` HTTP response is never `.json()`-parsed
  (short-circuited by `if (r.ok)`); `data.ok === false` (today's real
  relay state) also resolves to `null`. Every path converges on
  `if (!description) return response;` — no branch leaves the response
  unhandled. Verified against the real live relay response above, not
  just reasoned about in the abstract.

**Total: 100 ≥ 95 gate. Committed.**

## Bot-gating and passthrough — reasoning, not yet live-tested

`isBotRequest()` gates on 8 known crawler UA substrings
(`facebookexternalhit`, `Twitterbot`, `Slackbot`, `WhatsApp`,
`Discordbot`, `TelegramBot`, `LinkedInBot`, `iMessage`) exactly as
specified. Non-matching UAs hit `return env.ASSETS.fetch(request)` on
the very first line of `fetch()` — before any relay call, before any
`HTMLRewriter` construction — so real user traffic's code path is
identical to pre-existing pure static-asset serving (same call, same
argument, no wrapping). This is a structural guarantee from reading the
code, not a live A/B measurement.

## Deferred to chat/live verification (per CC-CMD, does not block this commit)

- [ ] Real request with `User-Agent: Twitterbot` shows a real injected
      `<meta property="og:description">` — **cannot demonstrate today**
      even live, since the relay itself currently returns `ok:false` for
      2026-07-04 (no circadian preview text generated yet for today).
      Re-check once the relay's cron populates real content for a given
      date, or test against a date the relay has content for.
- [ ] Real request with a normal browser User-Agent shows NO tag added —
      not yet checked against the live deployed URL (`*.workers.dev`
      still blocked from this sandbox; needs chat or a follow-up
      CI-as-proxy probe with a spoofed non-bot UA).
- [ ] Relay-timeout graceful degradation — code-level guarantee verified
      above; a real forced-timeout condition against the live deploy not
      separately tested.

## Explicit scope statement (per CC-CMD's Outbox Manifest requirement)

This is the CC-CMD that actually closes the original "KV editorial keys
not consulted by anything" incident — `src/worker.js` is a real, new
consumer of the relay's circadian-preview text. The sibling
`CC-CMD-2026-07-04-circadian-client-phase(-v2).md` documents are a
separate, unrelated feature (per-game circadian rendering in
`index.html`) and do not touch these KV keys or this endpoint.

## Files changed

- `src/worker.js` — new, first request-time Worker script in this repo
- `wrangler.jsonc` — `+"main": "src/worker.js"`, `+"assets.binding": "ASSETS"`
- `smoke.js` — comment-only note pointing here (no assertion added; this
  script is outside index.html's reach, per the CC-CMD's Task 3)

No other files touched. `node smoke.js index.html`: 826 passed, 0 failed
(unchanged from before this commit).
