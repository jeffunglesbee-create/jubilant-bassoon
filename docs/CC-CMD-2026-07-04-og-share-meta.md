# CC-CMD: Dynamic OG share meta tags via HTMLRewriter (real KV consumer)

**Date:** 2026-07-04
**Repo:** jeffunglesbee-create/jubilant-bassoon (sole)
**Branch:** main
**Scope:** Add a request-time Worker script in front of static-asset serving, injecting dynamic `og:title`/`og:description` for bot/crawler user-agents only. Real users get unchanged static-asset passthrough.
**Why:** This closes the actual original incident — "KV editorial keys not consulted by anything" — with a real, previously-identified-but-unbuilt consumer. Confirmed 2026-07-04: FIELD has ZERO Open Graph meta tags anywhere in index.html (grepped, zero hits). A June 13 2026 session already identified this exact gap: "Currently sharing a FIELD link shows nothing — no preview, no image. Share cards are the #1 organic growth mechanism for a sports app." That session proposed a heavier image-generation approach (Satori/@vercel/og); this CC-CMD ships the much cheaper text-only version first (og:description from existing pre-written prose, no image rendering), using content that's already being generated and written to KV every analytics cron run and currently read by nothing.
**Target time:** ~1.5 hrs (new Worker script is the real cost — everything else is a fetch + string injection)
**HARD DEPENDENCY:** CC-CMD-2026-07-04-circadian-kv-read-endpoint.md (field-relay-nba repo) must be deployed first — this CC-CMD calls that endpoint. Verify before starting:
```bash
curl -s "https://field-relay-nba.jeffunglesbee.workers.dev/circadian/preview/$(date -u +%Y-%m-%d)"
```
If this 404s, STOP — the relay CC-CMD hasn't shipped yet. (Note: that CC-CMD's "Why" section has been revised to reflect this real consumer — it was originally written for a different, incorrect purpose; the endpoint design itself was always sound.)

## ENVIRONMENT CONSTRAINTS (copy verbatim)
- *.workers.dev:443 blocked from CC egress (CC cannot curl the live URL directly)
- api.github.com is reachable from CC bash
- No branch switching — work on main only
- 2 attempts max on any push — declare failure and stop if both fail
- node --check on any new .js file before commit

## CONFIDENCE GATE
Do not commit unless confidence ≥ 95.

## CONTEXT — REAL ARCHITECTURE CHANGE, NOT A SLOT-IN
Confirmed via `wrangler.jsonc`: jubilant-bassoon currently has `"assets": {"directory": "."}` with **no `main` field** — meaning zero request-time JS logic exists today. All requests hit Cloudflare's static-asset serving directly. This CC-CMD adds the first Worker script in front of that.

**Design constraint (non-negotiable):** real user traffic must see ZERO latency or behavior change. Only requests from known crawler/bot user-agents get the HTMLRewriter treatment; everything else falls through to `env.ASSETS.fetch(request)` unmodified, same as today.

## PROBE BLOCK (run before any edits)
```bash
# P1 — confirm relay dependency (see HARD DEPENDENCY above)
curl -s "https://field-relay-nba.jeffunglesbee.workers.dev/circadian/preview/$(date -u +%Y-%m-%d)"

# P2 — confirm current index.html has no existing OG tags to conflict with
grep -c "og:title\|og:description" index.html
# Expected: 0. If nonzero, STOP and inspect what's there before adding more.

# P3 — confirm wrangler.jsonc currently has no main field (verify the
# architecture assumption this whole CC-CMD is built on, don't assume it's
# still true by the time CC executes this)
cat wrangler.jsonc
```

## TASK 1 — Add a minimal Worker script

Create `src/worker.js`:
```javascript
// Minimal request-time layer in front of static-asset serving.
// ONLY modifies responses for known crawler/bot user-agents fetching
// the root document — everything else passes through unchanged.
// Real users see zero behavior change vs. pure static-asset serving.

const BOT_UA_PATTERNS = [
    'facebookexternalhit', 'Twitterbot', 'Slackbot', 'WhatsApp',
    'Discordbot', 'TelegramBot', 'LinkedInBot', 'iMessage',
];

function isBotRequest(request) {
    const ua = request.headers.get('User-Agent') || '';
    return BOT_UA_PATTERNS.some(p => ua.includes(p));
}

class MetaTagRewriter {
    constructor(description) {
        this.description = description;
    }
    element(element) {
        if (this.description) {
            element.after('html', {
                html: `<meta property="og:description" content="${this.description.replace(/"/g, '&quot;')}">`,
            });
        }
    }
}

export default {
    async fetch(request, env, ctx) {
        // Non-bot traffic: pure passthrough, identical to today's behavior.
        if (!isBotRequest(request)) {
            return env.ASSETS.fetch(request);
        }

        const response = await env.ASSETS.fetch(request);
        const contentType = response.headers.get('Content-Type') || '';
        if (!contentType.includes('text/html')) {
            return response; // only rewrite HTML documents
        }

        let description = null;
        try {
            const tz = 'America/New_York';
            const today = new Date().toLocaleDateString('en-CA', { timeZone: tz });
            const r = await fetch(
                `https://field-relay-nba.jeffunglesbee.workers.dev/circadian/preview/${today}`,
                { signal: AbortSignal.timeout(2000) }
            );
            if (r.ok) {
                const data = await r.json();
                description = data.ok ? data.text : null;
            }
        } catch (_) {
            // Fetch failed or timed out — fall through with no description
            // rather than blocking the response. Bots still get the page,
            // just without the enhanced description this pass adds.
        }

        if (!description) {
            return response; // graceful degradation — unmodified page
        }

        return new HTMLRewriter()
            .on('title', new MetaTagRewriter(description))
            .transform(response);
    },
};
```

## TASK 2 — Wire the Worker into wrangler.jsonc

```jsonc
{
  "name": "jubilant-bassoon",
  "compatibility_date": "2026-05-23",
  "main": "src/worker.js",
  "assets": {
    "directory": ".",
    "binding": "ASSETS"
  },
  "compatibility_flags": ["nodejs_compat"]
}
```
CC: confirm this doesn't collide with anything else expecting the current
assets-only config (check deploy.yml and any other workflow that
references wrangler.jsonc's shape before changing it).

## TASK 3 — Smoke check (relay call is untestable in smoke.js — it's a
## separate Worker script, not part of index.html). Add a comment-only
## note in smoke.js pointing to this CC-CMD's own outbox for verification,
## rather than inventing a fake assertion for code smoke.js can't see.

## DONE CONDITIONS

**CC completes and commits once these are done — do not wait past this list:**
- [ ] P1-P3 probes run and pass before any edit
- [ ] `node --check src/worker.js` clean
- [ ] Code review confirms bot-UA gating, HTMLRewriter usage, and the
      try/catch degradation path all match this doc exactly
- [ ] Push and confirm CI/deploy workflow reports success (this is
      checkable via GitHub API status, which CC CAN reach — this is
      different from hitting the live `*.workers.dev` URL directly)

**Deferred to chat after your push — do NOT block your commit on these,
list them in your outbox as "pending chat verification":**
- [ ] Real request with `User-Agent: Twitterbot` shows a real injected `<meta property="og:description">` with today's actual text
- [ ] Real request with a normal browser User-Agent shows NO tag added
- [ ] Relay-timeout graceful degradation confirmed against the live site
- [ ] Outbox manifest written to `docs/outbox/cc-og-share-meta-{date}.md`

## COMPLIANCE
- Rule 47/ADR-002/RUWT: injects only pre-written editorial prose text,
  no scores, no composite/interest values — this is a text substitution,
  not a computation
- Rule 68: probe block must run and pass before any edits
- Rule 87: self-completing — done conditions checkable in-session

## OUTBOX MANIFEST
- [ ] src/worker.js created
- [ ] wrangler.jsonc updated (main + assets.binding)
- [ ] Real bot-UA response pasted verbatim (showing the injected tag)
- [ ] Real normal-UA response pasted verbatim (showing NO injected tag)
- [ ] Explicit statement: this is the CC-CMD that actually closes the
      original "KV editorial keys not consulted" incident — the circadian
      per-game CC-CMD (v2) is a separate, unrelated feature that does not
      touch these KV keys

## CONFIDENCE SCORING — SPLIT INTO CC-VERIFIABLE AND LIVE-VERIFIABLE

**Process fix (2026-07-04): a sibling CC-CMD run into a structural bind
today — its confidence table put live-endpoint checks in the same score
as code checks, so CC could never reach 95 on its own (`*.workers.dev`
is blocked from CC egress, long-documented, not a CC failure). CC
correctly stopped and asked for authorization; a session stop-hook then
force-committed anyway at a low score, which looked like a violated
instruction but was really a design flaw in the CC-CMD. Fixed here by
splitting the score explicitly:**

**CC-VERIFIABLE (compute this score yourself; commit once it hits 95 —
do not wait on anything below this line):**
+40  Worker script is syntactically valid (`node --check src/worker.js`), bot-UA list and HTMLRewriter usage match the spec exactly
+30  wrangler.jsonc change is minimal and doesn't collide with anything deploy.yml or other workflows expect (check before assuming)
+30  Graceful-degradation path (relay timeout/failure) is present in the code and reasoned through — you cannot trigger a real timeout from your own sandbox, but you CAN verify the try/catch structure is correct and doesn't leave the response unhandled

**LIVE-VERIFIABLE (cannot be scored by CC — explicitly deferred, does
NOT block your commit decision):**
- Bot UA request shows real injected og:description with today's actual text
- Normal UA request shows unmodified response (bot-gating actually works, not just works-when-forced)
- These two will be checked by chat (or CI-as-proxy) AFTER your commit and reported back via the outbox/codex — commit once the CC-verifiable score above hits 95, do not wait for these.

## ONE-LINER
git pull. Read docs/CC-CMD-2026-07-04-og-share-meta.md. Verify the relay
dependency is live FIRST. Implement exactly as specified — bot-gating is
non-negotiable, real user traffic must be byte-for-byte unchanged. Do not
commit unless confidence ≥ 95. If score < 95 report verbatim and stop —
do not invent results.
