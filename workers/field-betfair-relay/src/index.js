// field-betfair-relay — Cloudflare Worker v1
// Betfair Exchange REST API proxy + session management
//
// DESIGN GOALS:
//   1. Call Betfair as little as possible (batch, cache aggressively)
//   2. Be as fast as possible (session token cached in Worker memory)
//   3. Never expose credentials to client
//
// SECRETS (set in Cloudflare Dashboard → field-betfair-relay → Settings → Variables):
//   BETFAIR_APP_KEY   → Developer Portal app key (free delayed key)
//   BETFAIR_USERNAME  → Betfair account username / email
//   BETFAIR_PASSWORD  → Betfair account password
//
// FREE KEY NOTES:
//   Data is delayed ~60-90 seconds. Best use: pre-game odds + in-play odds display.
//   NOT suitable as real-time score event proxy (need £299 live key for that).
//   Live key upgrade: wrangler secret put BETFAIR_APP_KEY --name field-betfair-relay
//   (no code changes needed — relay detects live key automatically)
//
// ENDPOINTS:
//   GET /betfair/odds?home=Arsenal&away=Chelsea&sport=soccer
//       Returns { homeWin, awayWin, draw, marketId, status }
//   GET /betfair/batch   POST body: [{ home, away, sport }, ...]
//       Returns array of odds — use this to load all today's games at once
//   GET /betfair/health
//       Returns { ok, sessionValid, latency }

const WORKER_VERSION = '1';
const BF_API   = 'https://api.betfair.com/exchange/betting/rest/v1.0';
const BF_LOGIN = 'https://identitysso.betfair.com/api/login';

// ── Sport → Betfair eventTypeId mapping ──────────────────────────────────────
const SPORT_IDS = {
  soccer:      '1',   // Soccer — EPL, UCL, MLS etc.
  tennis:      '2',   // Tennis
  golf:        '3',   // Golf
  cricket:     '4',   // Cricket
  rugby_union: '5',   // Rugby Union
  boxing:      '6',   // Boxing
  horse:       '7',   // Horse Racing
  motor:       '8',   // Motor Sport (F1)
  baseball:    '7522', // Baseball (MLB)
  basketball:  '7522', // Basketball — Betfair uses 7522 for NBA
  ice_hockey:  '7524', // Ice Hockey
  aussie_rules:'61420', // Australian Rules
};

// ── In-process session cache ──────────────────────────────────────────────────
// Workers can share memory within the same isolate. Session is valid ~8 hours.
let _sessionToken = null;
let _sessionExpiry = 0;

async function getSession(env) {
  if (_sessionToken && Date.now() < _sessionExpiry) return _sessionToken;
  const r = await fetch(BF_LOGIN, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Application': env.BETFAIR_APP_KEY,
      'Accept': 'application/json',
    },
    body: `username=${encodeURIComponent(env.BETFAIR_USERNAME)}&password=${encodeURIComponent(env.BETFAIR_PASSWORD)}`,
  });
  const data = await r.json();
  if (data.status !== 'SUCCESS') throw new Error('Betfair login: ' + (data.error || 'unknown'));
  _sessionToken = data.token;
  _sessionExpiry = Date.now() + 7 * 60 * 60 * 1000; // 7h (conservative, session lasts 8h)
  return _sessionToken;
}

// ── Betfair API helpers ───────────────────────────────────────────────────────
async function bfPost(path, body, session, appKey) {
  const r = await fetch(`${BF_API}/${path}/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Authentication': session,
      'X-Application': appKey,
      'Accept': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Betfair ${path} ${r.status}`);
  return r.json();
}

// Search for event IDs matching home/away team names
async function findMatchMarket(home, away, sport, session, appKey) {
  const eventTypeId = SPORT_IDS[sport] || '1';
  // listEvents to find the event
  const events = await bfPost('listEvents', {
    filter: {
      eventTypeIds: [eventTypeId],
      textQuery: home, // search by home team name
      inPlayOnly: false,
      bspOnly: false,
    },
    maxResults: 20,
  }, session, appKey);

  // Find the event that best matches home vs away
  const homeLow = home.toLowerCase(), awayLow = away.toLowerCase();
  const match = (events || []).find(e => {
    const n = (e.event?.name || '').toLowerCase();
    return n.includes(homeLow.split(' ').pop()) || n.includes(awayLow.split(' ').pop());
  });
  if (!match) return null;

  // Get the WIN market for this event
  const markets = await bfPost('listMarketCatalogue', {
    filter: {
      eventIds: [match.event.id],
      marketTypeCodes: ['MATCH_ODDS'],
    },
    marketProjection: ['RUNNER_METADATA', 'RUNNER_DESCRIPTION'],
    maxResults: 5,
  }, session, appKey);

  return markets?.[0] || null;
}

// Fetch odds for a single market — minimal price projection
async function getMarketOdds(marketId, session, appKey) {
  const books = await bfPost('listMarketBook', {
    marketIds: [marketId],
    priceProjection: {
      priceData: ['EX_BEST_OFFERS'],
      exBestOffersOverrides: { bestPricesDepth: 1 }, // only best price each side
    },
  }, session, appKey);
  return books?.[0] || null;
}

// ── Response helpers ──────────────────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

function err(msg, status = 500) {
  return json({ error: msg }, status);
}

// ── Main handler ──────────────────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // Health check — validates credentials without fetching odds
    if (path === '/betfair/health') {
      const t0 = Date.now();
      try {
        await getSession(env);
        return json({ ok: true, sessionValid: true, latency: Date.now() - t0, version: WORKER_VERSION });
      } catch(e) {
        return json({ ok: false, sessionValid: false, error: e.message, version: WORKER_VERSION });
      }
    }

    // Single game odds
    if (path === '/betfair/odds') {
      const home  = url.searchParams.get('home');
      const away  = url.searchParams.get('away');
      const sport = url.searchParams.get('sport') || 'soccer';
      if (!home || !away) return err('home and away required', 400);

      try {
        const session = await getSession(env);
        const market  = await findMatchMarket(home, away, sport, session, env.BETFAIR_APP_KEY);
        if (!market) return json({ odds: null, reason: 'no_market' });

        const book = await getMarketOdds(market.marketId, session, env.BETFAIR_APP_KEY);
        if (!book) return json({ odds: null, reason: 'no_book' });

        // Map runners to home/away/draw
        const runners = book.runners || [];
        const catalogRunners = market.runners || [];
        const odds = {};
        runners.forEach((r, i) => {
          const name = catalogRunners[i]?.runnerName || '';
          const best = r.ex?.availableToBack?.[0]?.price;
          if (!best) return;
          const nameLow = name.toLowerCase();
          if (nameLow === 'the draw' || nameLow === 'draw') odds.draw = best;
          else if (!odds.homeWin) odds.homeWin = best;
          else odds.awayWin = best;
        });

        return json({
          odds,
          marketId: market.marketId,
          status: book.status,
          inPlay: book.inplay,
          totalMatched: book.totalMatched,
        });
      } catch(e) {
        return err(e.message);
      }
    }

    // Batch odds — POST [{ home, away, sport }, ...]
    // Single Betfair session + parallel market lookup for multiple games
    if (path === '/betfair/batch' && request.method === 'POST') {
      let games;
      try { games = await request.json(); } catch { return err('invalid JSON', 400); }
      if (!Array.isArray(games) || games.length > 20) return err('max 20 games per batch', 400);

      try {
        const session = await getSession(env);
        // Parallel market lookups (all share same session — one login)
        const results = await Promise.all(games.map(async g => {
          try {
            const market = await findMatchMarket(g.home, g.away, g.sport || 'soccer', session, env.BETFAIR_APP_KEY);
            if (!market) return { home: g.home, away: g.away, odds: null };
            const book = await getMarketOdds(market.marketId, session, env.BETFAIR_APP_KEY);
            if (!book) return { home: g.home, away: g.away, odds: null };
            const runners = book.runners || [];
            const cRunners = market.runners || [];
            const odds = {};
            runners.forEach((r, i) => {
              const name = (cRunners[i]?.runnerName || '').toLowerCase();
              const best = r.ex?.availableToBack?.[0]?.price;
              if (!best) return;
              if (name === 'the draw' || name === 'draw') odds.draw = best;
              else if (!odds.homeWin) odds.homeWin = best;
              else odds.awayWin = best;
            });
            return { home: g.home, away: g.away, odds, marketId: market.marketId, inPlay: book.inplay };
          } catch { return { home: g.home, away: g.away, odds: null }; }
        }));
        return json(results);
      } catch(e) {
        return err(e.message);
      }
    }

    return err('Not found', 404);
  }
};
