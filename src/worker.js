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
