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
            element.after(
                `<meta property="og:description" content="${this.description.replace(/"/g, '&quot;')}">`,
                { html: true }
            );
        }
    }
}

export default {
    async fetch(request, env, ctx) {
        // TEMPORARY DIAGNOSTIC (CC-CMD-2026-07-04-og-worker-global-fetch-
        // fix) -- re-tests the exact same in-Worker fetch to the relay
        // that failed with Cloudflare error 1042 before
        // global_fetch_strictly_public was added, to confirm the flag
        // actually fixes it. Added before the bot-detection branch so it
        // works regardless of User-Agent. Temporary -- removed in this
        // same CC-CMD once the live result is captured.
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
