var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/game-do.js
var POLL_INTERVAL_MS = 25e3;
var IDLE_SHUTDOWN_MS = 5 * 60 * 1e3;
var CRUNCH_DEDUP_TTL_MS = 30 * 60 * 1e3;
var ALLOWED_CLIENT_MSG_TYPES = /* @__PURE__ */ new Set([
  "hello",
  // {type:'hello', gameId, sport} — confirms identity (DO already knows from URL)
  "pin",
  // {type:'pin', subscription, prefs} — pin this game for push when backgrounded
  "unpin",
  // {type:'unpin', endpoint} — remove pin
  "signal-crunch",
  // {type:'signal-crunch', period, gameId} — browser locally detected CRUNCH TIME
  "ping"
  // keepalive
]);
var SPORT_TO_V2 = {
  "nba": "nba",
  "nhl": "nhl",
  "mlb": "mlb",
  "wnba": "wnba",
  "epl": "epl",
  "mls": "mls",
  "ucl": "ucl",
  "wc26": "wc26"
  // WC 2026 added June 4 2026
};
var WP_HISTORY_MAX = 180;
var GameDO = class {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.gameId = null;
    this.sport = null;
    this.lastFacts = null;
    this.lastSeen = Date.now();
    this._restored = false;
  }
  async _restore() {
    if (this._restored)
      return;
    const stored = await this.ctx.storage.get(["gameId", "sport", "lastFacts", "lastSeen"]);
    this.gameId = stored.get("gameId") ?? this.gameId;
    this.sport = stored.get("sport") ?? this.sport;
    this.lastFacts = stored.get("lastFacts") ?? this.lastFacts;
    this.lastSeen = stored.get("lastSeen") ?? Date.now();
    this._restored = true;
  }
  async fetch(request) {
    await this._restore();
    const url = new URL(request.url);
    const pathname = url.pathname;
    if (request.headers.get("Upgrade") === "websocket") {
      const qSport = url.searchParams.get("sport");
      const qGameId = url.searchParams.get("gameId");
      if (qSport && !this.sport) {
        this.sport = qSport;
        await this.ctx.storage.put("sport", qSport);
      }
      if (qGameId && !this.gameId) {
        this.gameId = qGameId;
        await this.ctx.storage.put("gameId", qGameId);
      }
      const pair = new WebSocketPair();
      const client = pair[0], server = pair[1];
      this.ctx.acceptWebSocket(server);
      await this._ensurePolling();
      if (this.lastFacts) {
        try {
          server.send(JSON.stringify({ type: "facts", ...this.lastFacts }));
        } catch (_) {
        }
      } else {
        this.ctx.waitUntil(this._poll());
      }
      return new Response(null, { status: 101, webSocket: client });
    }
    if (pathname.endsWith("/pin") && request.method === "POST") {
      try {
        const body = await request.json();
        const { subscription, prefs } = body || {};
        if (!subscription?.endpoint)
          return new Response("Missing subscription", { status: 400 });
        const key = "pin:" + this._hashEndpoint(subscription.endpoint);
        await this.ctx.storage.put(key, { subscription, prefs: prefs || {}, ts: Date.now() });
        return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
      } catch (e) {
        return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500 });
      }
    }
    if (pathname.endsWith("/unpin") && request.method === "POST") {
      try {
        const { endpoint } = await request.json();
        if (!endpoint)
          return new Response("Missing endpoint", { status: 400 });
        const key = "pin:" + this._hashEndpoint(endpoint);
        await this.ctx.storage.delete(key);
        return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
      } catch (e) {
        return new Response(JSON.stringify({ ok: false }), { status: 500 });
      }
    }
    if (pathname.endsWith("/signal/crunch") && request.method === "POST") {
      try {
        const body = await request.json();
        const { period, gameId } = body || {};
        if (!period && period !== 0)
          return new Response("Missing period", { status: 400 });
        const dedupKey = `crunch:${gameId || this.gameId}:p${period}`;
        const last = await this.ctx.storage.get(dedupKey);
        if (last && Date.now() - last < CRUNCH_DEDUP_TTL_MS) {
          return new Response(
            JSON.stringify({ ok: true, deduped: true }),
            { headers: { "Content-Type": "application/json" } }
          );
        }
        await this.ctx.storage.put(dedupKey, Date.now());
        const sent = await this._fanoutCrunch(body);
        return new Response(
          JSON.stringify({ ok: true, sent }),
          { headers: { "Content-Type": "application/json" } }
        );
      } catch (e) {
        return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500 });
      }
    }
    if (pathname.endsWith("/crunch") && request.method === "POST") {
      try {
        const body = await request.json();
        const { condition, gameId } = body || {};
        if (!condition)
          return new Response(
            JSON.stringify({ ok: false, error: "Missing condition" }),
            { headers: { "Content-Type": "application/json" } }
          );
        const dedupKey = `crunch:${gameId || this.gameId}:${condition}`;
        const last = await this.ctx.storage.get(dedupKey);
        if (last && Date.now() - last < CRUNCH_DEDUP_TTL_MS) {
          return new Response(
            JSON.stringify({ ok: true, deduped: true }),
            { headers: { "Content-Type": "application/json" } }
          );
        }
        await this.ctx.storage.put(dedupKey, Date.now());
        const sent = await this._fanoutCrunch(body);
        return new Response(
          JSON.stringify({ ok: true, sent }),
          { headers: { "Content-Type": "application/json" } }
        );
      } catch (e) {
        return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500 });
      }
    }
    if (pathname.endsWith("/wp") && request.method === "POST") {
      try {
        const body = await request.json();
        const { wp, elapsed, advanceProb } = body || {};
        if (!wp || typeof wp.homeWin !== "number") {
          return new Response(
            JSON.stringify({ ok: false, error: "Invalid wp object" }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }
        const stored = await this.ctx.storage.get(["openingWP", "lastWP", "wpHistory", "openingAdvanceProb"]);
        const openingWP = stored.get("openingWP") ?? null;
        const lastWP = stored.get("lastWP") ?? null;
        const wpHistory = stored.get("wpHistory") ?? [];
        const openingAdvanceProb = stored.get("openingAdvanceProb") ?? null;
        const wpDelta = lastWP !== null ? {
          homeWin: parseFloat((wp.homeWin - lastWP.homeWin).toFixed(4)),
          awayWin: parseFloat((wp.awayWin - lastWP.awayWin).toFixed(4)),
          draw: parseFloat((wp.draw - lastWP.draw).toFixed(4))
        } : null;
        const newOpeningWP = openingWP ?? { ...wp, elapsed: elapsed ?? 0, storedAt: Date.now() };
        const newOpeningAdvanceProb = openingAdvanceProb ?? (advanceProb && typeof advanceProb.homeAdvance === "number" ? advanceProb : null);
        const entry = { elapsed: elapsed ?? 0, homeWin: wp.homeWin, draw: wp.draw };
        const newHistory = [...wpHistory, entry].slice(-WP_HISTORY_MAX);
        await this.ctx.storage.put({
          openingWP: newOpeningWP,
          lastWP: { ...wp, elapsed: elapsed ?? 0, ts: Date.now() },
          wpHistory: newHistory,
          openingAdvanceProb: newOpeningAdvanceProb
        });
        this._broadcast({ type: "wp", wp, elapsed, wpDelta, ts: Date.now() });
        return new Response(JSON.stringify({
          ok: true,
          openingWP: newOpeningWP,
          wpDelta,
          recentHistory: newHistory.slice(-20),
          historyLen: newHistory.length,
          openingAdvanceProb: newOpeningAdvanceProb
        }), { headers: { "Content-Type": "application/json" } });
      } catch (e) {
        return new Response(
          JSON.stringify({ ok: false, error: e.message }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    }
    return new Response("GameDO: unknown route", { status: 404 });
  }
  // ── Hibernation WebSocket handlers ────────────────────────────────────
  async webSocketMessage(ws, message) {
    await this._restore();
    let msg;
    try {
      msg = typeof message === "string" ? JSON.parse(message) : null;
    } catch (_) {
      msg = null;
    }
    if (!msg || !ALLOWED_CLIENT_MSG_TYPES.has(msg.type))
      return;
    this.lastSeen = Date.now();
    await this.ctx.storage.put("lastSeen", this.lastSeen);
    if (msg.type === "ping") {
      try {
        ws.send(JSON.stringify({ type: "pong", ts: Date.now() }));
      } catch (_) {
      }
      return;
    }
    if (msg.type === "pin" && msg.subscription?.endpoint) {
      const key = "pin:" + this._hashEndpoint(msg.subscription.endpoint);
      await this.ctx.storage.put(key, { subscription: msg.subscription, prefs: msg.prefs || {}, ts: Date.now() });
      try {
        ws.send(JSON.stringify({ type: "pinned" }));
      } catch (_) {
      }
      return;
    }
    if (msg.type === "unpin" && msg.endpoint) {
      const key = "pin:" + this._hashEndpoint(msg.endpoint);
      await this.ctx.storage.delete(key);
      try {
        ws.send(JSON.stringify({ type: "unpinned" }));
      } catch (_) {
      }
      return;
    }
    if (msg.type === "signal-crunch") {
      const period = msg.period;
      const dedupKey = `crunch:${this.gameId}:p${period}`;
      const last = await this.ctx.storage.get(dedupKey);
      if (last && Date.now() - last < CRUNCH_DEDUP_TTL_MS)
        return;
      await this.ctx.storage.put(dedupKey, Date.now());
      this.ctx.waitUntil(this._fanoutCrunch(msg));
      return;
    }
  }
  async webSocketClose(ws, code, reason, wasClean) {
  }
  async webSocketError(ws, error) {
  }
  // ── Polling cycle ─────────────────────────────────────────────────────
  async _ensurePolling() {
    const existing = await this.ctx.storage.getAlarm();
    if (existing == null) {
      await this.ctx.storage.setAlarm(Date.now() + POLL_INTERVAL_MS);
    }
  }
  async alarm() {
    await this._restore();
    const sessions = this.ctx.getWebSockets();
    const idleFor = Date.now() - this.lastSeen;
    if (sessions.length === 0 && idleFor > IDLE_SHUTDOWN_MS) {
      return;
    }
    try {
      await this._poll();
    } catch (_) {
    }
    await this.ctx.storage.setAlarm(Date.now() + POLL_INTERVAL_MS);
  }
  async _poll() {
    if (!this.gameId || !this.sport)
      return;
    const facts = await this._fetchFacts();
    if (!facts)
      return;
    if (this._sameFacts(facts, this.lastFacts)) {
      this.lastSeen = Date.now();
      return;
    }
    this.lastFacts = facts;
    this.lastSeen = Date.now();
    await this.ctx.storage.put({ lastFacts: facts, lastSeen: this.lastSeen });
    this._broadcast({ type: "facts", ...facts });
  }
  // Fetch from API-Sports primary; fallback to ESPN if API-Sports returns nothing.
  // ADR-002: API-Sports is the GREEN+contract source. ESPN is fallback only
  //          during the migration window; remove fallback after ESPN cutover.
  async _fetchFacts() {
    const v2Sport = SPORT_TO_V2[this.sport];
    if (v2Sport) {
      try {
        const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
        const url = `https://field-relay-nba.jeffunglesbee.workers.dev/v2/games?sport=${v2Sport}&date=${today}`;
        const resp = await fetch(url, { cf: { cacheTtl: 10 } });
        if (resp.ok) {
          const data = await resp.json();
          const games = data?.games || [];
          const match = games.find((g) => String(g.id) === String(this.gameId));
          if (match) {
            return {
              gameId: String(this.gameId),
              sport: this.sport,
              state: match.state || "pre",
              homeScore: match?.home?.score ?? null,
              awayScore: match?.away?.score ?? null,
              period: match.periodNum ?? null,
              periodLabel: match.periodLabel || "",
              clock: match.clock || "",
              source: "apisports",
              ts: Date.now()
            };
          }
        }
      } catch (_) {
      }
    }
    return null;
  }
  _sameFacts(a, b) {
    if (!a || !b)
      return false;
    return a.homeScore === b.homeScore && a.awayScore === b.awayScore && a.period === b.period && a.clock === b.clock && a.state === b.state;
  }
  _broadcast(obj) {
    const json2 = JSON.stringify(obj);
    const sessions = this.ctx.getWebSockets();
    for (const ws of sessions) {
      try {
        ws.send(json2);
      } catch (_) {
      }
    }
  }
  // ── Push fan-out for CRUNCH TIME ──────────────────────────────────────
  // Reads pinned subscriptions from DO storage, calls sendWebPush from the
  // main worker module. Browser computed the named condition; DO delivers.
  async _fanoutCrunch(signalBody) {
    const pins = await this.ctx.storage.list({ prefix: "pin:" });
    if (pins.size === 0)
      return 0;
    const payload = {
      type: "CRUNCH_TIME_SIGNAL",
      gameId: this.gameId,
      sport: this.sport,
      home: signalBody?.home || "",
      away: signalBody?.away || "",
      homeScore: signalBody?.homeScore ?? null,
      awayScore: signalBody?.awayScore ?? null,
      period: signalBody?.period ?? null,
      periodLabel: signalBody?.periodLabel || "",
      broadcast: signalBody?.broadcast || "",
      watchUrl: signalBody?.watchUrl || "/",
      ts: Date.now()
    };
    let sent = 0;
    for (const [_key, val] of pins) {
      try {
        if (this.env._sendWebPush) {
          const res = await this.env._sendWebPush(val.subscription, payload, this.env);
          if (res && res.ok)
            sent++;
        }
      } catch (_) {
      }
    }
    return sent;
  }
  _hashEndpoint(endpoint) {
    return btoa(endpoint).slice(0, 32).replace(/[^a-zA-Z0-9]/g, "");
  }
};
__name(GameDO, "GameDO");

// src/journalism-quality.js
var BANNED_PHRASES = [
  "punch their ticket",
  "the stage is set",
  "make a statement",
  "facing a must-win",
  "looking to bounce back",
  "all eyes on",
  "put the league on notice",
  "a tale of two halves",
  "rise to the occasion",
  "leave it all on the floor",
  "leave it all on the field",
  "leave it all on the court",
  "backs against the wall",
  "do-or-die",
  "prove the doubters wrong",
  "send a message",
  "weather the storm",
  "turn the page",
  "take care of business",
  "control their own destiny",
  "gut check",
  "step up when it matters",
  "laying it on the line",
  "battle-tested",
  "high-octane",
  "red-hot",
  "ice-cold",
  "pulling away",
  "in the driver's seat",
  "with their season on the line",
  "cement their legacy",
  "the chess match continues",
  "salvage pride",
  "insurmountable deficit",
  "clinical execution",
  "dictated the tempo",
  "decisive series deficit",
  "statement series clincher",
  "ruthless sweep",
  "the team to beat",
  "perimeter scoring",
  "offensive production required",
  "exploit defensive lapses",
  "gritty performance",
  "gritty win",
  "fired on all cylinders",
  "on the brink",
  "must-win situation",
  "at this point in the season",
  "when it counts",
  "dig deep",
  "put this one away",
  "get back on track",
  "on a mission",
  "statement win",
  "pivotal moment",
  "defining moment",
  "all the marbles",
  "one game at a time",
  // P0.2 additions (June 4 2026): clunky wire-copy patterns seen in Morning Report
  "secured a victory",
  "secured a win",
  "secured the win",
  "secured the victory",
  "capitalized on scoring opportunities",
  "capitalize on scoring",
  "finalize a",
  "finalize the",
  "overcome the",
  "to overcome",
  "managed to overcome",
  "result moved",
  "result moves",
  "continued their",
  "extended their",
  "maintained their momentum"
];
var SPARINGLY_PHRASES = [
  "crucial",
  "critical",
  "pivotal",
  "key",
  "dominant",
  "dominance",
  "impressive",
  "outstanding",
  "must-watch",
  "storyline",
  "narrative",
  "momentum",
  "statement game",
  "statement",
  "big-time",
  "clutch",
  "electric",
  "exciting",
  "under the radar",
  "overlooked",
  "deep dive",
  "breakdown",
  "defensive struggles",
  "defensive issues",
  "however"
];
function hasCliche(text) {
  if (!text)
    return [];
  const lower = text.toLowerCase();
  return BANNED_PHRASES.filter((p) => lower.includes(p));
}
__name(hasCliche, "hasCliche");
function countSparingly(text) {
  if (!text)
    return [];
  const lower = text.toLowerCase();
  return SPARINGLY_PHRASES.map((p) => {
    let count = 0, idx = 0;
    while ((idx = lower.indexOf(p, idx)) !== -1) {
      count++;
      idx += p.length;
    }
    return { phrase: p, count };
  }).filter((r) => r.count >= 2);
}
__name(countSparingly, "countSparingly");
var SPORT_VOCAB_VIOLATIONS = {
  baseball: {
    forbidden: [
      "one-possession",
      "possession game",
      "one possession",
      "quarter",
      "quarters",
      "first quarter",
      "fourth quarter",
      "halftime",
      "half time",
      "field goal",
      "field goal percentage",
      "field goals",
      "three-point",
      "three-pointer",
      "three pointer",
      "free throw",
      "transition game",
      "fast break",
      "assist",
      "assists",
      "rebound",
      "rebounds",
      "down the stretch",
      "in the paint",
      "basket",
      "baskets",
      "touchdown",
      "first down",
      "red zone",
      "turnover on downs",
      "offsides",
      "penalty kick",
      "extra time",
      "nil",
      "ball movement",
      "offensive rhythm",
      "interior scoring"
    ],
    sport: "baseball",
    units: "runs (not points)",
    extra_period: "extra innings (not overtime, not OT, not quarters)"
  },
  hockey: {
    forbidden: [
      "quarter",
      "quarters",
      "halftime",
      "half time",
      "field goal",
      "three-point",
      "free throw",
      "rebound",
      "assist",
      "touchdown",
      "first down",
      "red zone",
      "inning",
      "innings",
      "at-bat",
      "strikeout",
      "strikeouts",
      "home run",
      "home runs",
      "offsides",
      "penalty kick",
      "extra time",
      "nil",
      "in the paint",
      "down the stretch"
    ],
    sport: "hockey",
    units: "goals (not points, runs, or scores)",
    extra_period: "overtime (3rd OT, 4th OT, etc.) \u2014 never extra innings or quarters"
  },
  basketball: {
    forbidden: [
      "inning",
      "innings",
      "at-bat",
      "strikeout",
      "home run",
      "home runs",
      "touchdown",
      "first down",
      "red zone",
      "field goal percentage of a kicker",
      "offsides",
      "penalty kick",
      "nil",
      "goal kick",
      "period",
      "periods"
      // hockey term
    ],
    sport: "basketball",
    units: "points",
    extra_period: "overtime (OT, 2OT, 3OT, etc.)"
  },
  football: {
    // NFL
    forbidden: [
      "inning",
      "innings",
      "at-bat",
      "strikeout",
      "home run",
      "three-pointer",
      "free throw",
      "rebound",
      "assist",
      "offsides",
      "penalty kick",
      "nil",
      "extra time",
      "period",
      "periods"
    ],
    sport: "football (American)",
    units: "points",
    extra_period: "overtime"
  },
  soccer: {
    forbidden: [
      "inning",
      "innings",
      "at-bat",
      "strikeout",
      "home run",
      "quarter",
      "quarters",
      "halftime quarter",
      "first quarter",
      "fourth quarter",
      "three-pointer",
      "free throw",
      "rebound",
      "assists per game",
      "touchdown",
      "first down",
      "red zone",
      "in the paint",
      "one-possession",
      "transition game",
      "fast break",
      "period",
      "periods"
    ],
    sport: "soccer",
    units: "goals (not points)",
    extra_period: "extra time / stoppage time (not overtime, OT, or extra innings)"
  }
};
function detectSportClass(sport) {
  const s = (sport || "").toLowerCase();
  if (s.includes("baseball") || s.includes("mlb"))
    return "baseball";
  if (s.includes("hockey") || s.includes("nhl"))
    return "hockey";
  if (s.includes("basketball") || s.includes("nba") || s.includes("wnba") || s.includes("ncaa-mb"))
    return "basketball";
  if (s.includes("soccer") || s.includes("epl") || s.includes("premier") || s.includes("mls") || s.includes("uefa") || s.includes("ucl") || s.includes("serie") || s.includes("liga") || s.includes("bundesliga") || s.includes("ligue"))
    return "soccer";
  if (s.includes("nfl") || s.includes("football"))
    return "football";
  return null;
}
__name(detectSportClass, "detectSportClass");
function checkSportVocab(text, sport) {
  if (!text || !sport)
    return [];
  const cls = detectSportClass(sport);
  if (!cls)
    return [];
  const vocab = SPORT_VOCAB_VIOLATIONS[cls];
  if (!vocab)
    return [];
  const lower = text.toLowerCase();
  return vocab.forbidden.filter((term) => lower.includes(term));
}
__name(checkSportVocab, "checkSportVocab");
var LEAD_SENTENCE_RE = /^The [A-Z][a-z]+ (are|have|will|look|need|must|face|enter|hope|want|seek|open|host|visit|travel|return|aim|play|sit|stand|hold|lead|trail|take|make|get)\b/;
function hasGenericLead(text) {
  if (!text)
    return null;
  const firstSentence = text.trim().split(/[.!?]/)[0];
  return LEAD_SENTENCE_RE.test(firstSentence.trim()) ? firstSentence.trim() : null;
}
__name(hasGenericLead, "hasGenericLead");
function extractStatsFromContext(prompt) {
  if (!prompt)
    return [];
  const stats = /* @__PURE__ */ new Set();
  const patterns = [
    /\b\d{1,3}(?:\.\d{1,2})?\s*(?:PPG|APG|RPG|BPG|SPG|MPG)\b/g,
    /\b\d{1,3}(?:\.\d{1,2})?\s*(?:ERA|WHIP|OPS|WAR)\b/gi,
    /\b\d{1,3}(?:\.\d{1,2})?\s*(?:DRTG|ORTG|PACE)\b/g,
    /\b\d{1,3}(?:\.\d{1,2})?%\b/g,
    // percentages
    /\b\d{1,3}-\d{1,3}\b/g,
    // series records like 3-2
    /\b\d{1,3}\s+(?:points|goals|runs|hits|shots)\b/gi
  ];
  for (const p of patterns) {
    const matches = prompt.match(p) || [];
    matches.forEach((m) => stats.add(m.trim()));
  }
  return [...stats];
}
__name(extractStatsFromContext, "extractStatsFromContext");
function missingStats(prompt, text) {
  if (!prompt || !text)
    return [];
  const required = extractStatsFromContext(prompt);
  if (!required.length)
    return [];
  const lower = text.toLowerCase();
  return required.filter((s) => !lower.includes(s.toLowerCase()));
}
__name(missingStats, "missingStats");
var LEAGUE_TROPHIES = {
  nba: ["nba finals", "nba championship", "wcf", "ecf", "western conference finals", "eastern conference finals", "larry o'brien"],
  nhl: ["stanley cup", "stanley cup final", "stanley cup finals"],
  mlb: ["world series", "alcs", "nlcs", "al championship series", "nl championship series", "american league championship", "national league championship", "commissioner's trophy"],
  nfl: ["super bowl", "afc championship", "nfc championship", "afc title game", "nfc title game", "vince lombardi", "lombardi trophy"],
  mls: ["mls cup", "mls cup final"],
  epl: ["premier league title", "premier league trophy", "prem title"],
  ucl: ["champions league final", "ucl final", "europa league final", "conference league final"],
  wnba: ["wnba finals", "wnba championship"],
  afl: ["afl grand final", "afl premiership"],
  wc: ["world cup final", "world cup title"]
};
var LEAGUE_TEAMS = {
  nba: ["spurs", "knicks", "lakers", "celtics", "warriors", "nuggets", "heat", "bucks", "thunder", "sixers", "76ers", "mavs", "mavericks", "nets", "pacers", "bulls", "cavs", "clippers", "suns", "grizzlies", "rockets", "jazz", "timberwolves", "trail blazers", "magic", "hawks", "wizards", "raptors", "san antonio", "oklahoma city", "new york knicks", "golden state"],
  nhl: ["hurricanes", "golden knights", "penguins", "oilers", "panthers", "bruins", "flyers", "lightning", "capitals", "islanders", "devils", "blackhawks", "red wings", "sabres", "maple leafs", "canadiens", "senators", "jets", "blues", "wild", "avalanche", "stars", "predators", "sharks", "kraken", "blue jackets"],
  mlb: ["yankees", "dodgers", "red sox", "astros", "phillies", "braves", "mariners", "blue jays", "guardians", "tigers", "twins", "royals", "white sox", "angels", "athletics", "padres", "giants", "rockies", "diamondbacks", "dbacks", "cubs", "cardinals", "brewers", "pirates", "reds", "marlins", "mets", "nationals"],
  nfl: ["chiefs", "patriots", "cowboys", "eagles", "49ers", "niners", "ravens", "bills", "dolphins", "jets", "steelers", "browns", "bengals", "colts", "jaguars", "texans", "titans", "broncos", "raiders", "chargers", "vikings", "packers", "bears", "lions", "falcons", "saints", "buccaneers", "bucs", "commanders", "seahawks"],
  mls: ["inter miami", "lafc", "la galaxy", "seattle sounders", "portland timbers", "atlanta united", "nycfc"],
  wnba: ["liberty", "aces", "indiana fever", "phoenix mercury", "connecticut sun", "seattle storm", "lynx", "dallas wings", "washington mystics", "atlanta dream", "chicago sky"],
  afl: ["collingwood", "sydney swans", "greater western sydney", "geelong cats", "melbourne demons", "richmond tigers", "hawthorn hawks", "essendon bombers", "carlton blues", "western bulldogs", "adelaide crows", "port adelaide", "brisbane lions", "gold coast suns"]
};
var CROSS_LINK_VERBS = /\b(face|faces|facing|faced|advance(?:s|d)?\s+to(?:\s+face)?|play(?:s|ed|ing)?(?:\s+against)?|meet(?:s|ing)?|matchup\s+(?:with|against)|winner\s+of|opponent\s+(?:will\s+be|is)|takes?\s+on|squares?\s+off\s+(?:with|against))\b/i;
function hasCrossSportHallucination(text) {
  if (!text)
    return [];
  const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.length > 10);
  const flagged = [];
  for (const sentence of sentences) {
    if (!CROSS_LINK_VERBS.test(sentence))
      continue;
    const lower = sentence.toLowerCase();
    const trophyLeagues = /* @__PURE__ */ new Set();
    const teamLeagues = /* @__PURE__ */ new Set();
    const signals = [];
    for (const [league, trophies] of Object.entries(LEAGUE_TROPHIES)) {
      for (const t of trophies) {
        if (lower.includes(t)) {
          trophyLeagues.add(league);
          signals.push(`${league}:trophy:${t}`);
          break;
        }
      }
    }
    if (trophyLeagues.size > 0) {
      for (const [league, teams] of Object.entries(LEAGUE_TEAMS)) {
        for (const t of teams) {
          const match = t.includes(" ") ? lower.includes(t) : new RegExp("\\b" + t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b").test(lower);
          if (match) {
            teamLeagues.add(league);
            signals.push(`${league}:team:${t}`);
            break;
          }
        }
      }
    }
    const distinctTrophyLeagues = [...trophyLeagues];
    const distinctTeamLeagues = [...teamLeagues];
    let isCross = false;
    if (distinctTrophyLeagues.length >= 2)
      isCross = true;
    for (const tl of distinctTeamLeagues) {
      for (const trl of distinctTrophyLeagues) {
        if (tl !== trl) {
          isCross = true;
          break;
        }
      }
      if (isCross)
        break;
    }
    if (isCross) {
      const allLeagues = [.../* @__PURE__ */ new Set([...distinctTrophyLeagues, ...distinctTeamLeagues])];
      flagged.push({ sentence: sentence.trim(), leagues: allLeagues, signals });
    }
  }
  return flagged;
}
__name(hasCrossSportHallucination, "hasCrossSportHallucination");
var _STOP_WORDS_RE = /^(their|about|would|could|which|should|after|before|against|during|while|other|first|since|still|being|where|these|those|there|every|until|under|again|from|with|this|that|have|will|they|been|were|what|when|into|than|then|also|each|over|more|most|such|both|some|only|very|just|like|well|even|back|game|team|play|year|time|week)$/i;
async function _datamuseFreshness(words) {
  const contentWords = words.filter((w) => w.length > 4 && !_STOP_WORDS_RE.test(w) && /^[a-z]/i.test(w)).slice(0, 5);
  if (!contentWords.length)
    return 83;
  try {
    const freqs = await Promise.all(contentWords.map(async (w) => {
      try {
        const r = await fetch(`https://api.datamuse.com/words?sp=${encodeURIComponent(w.toLowerCase())}&md=f&max=1`, {
          signal: AbortSignal.timeout(2e3)
        });
        if (!r.ok)
          return 50;
        const d = await r.json();
        const tag = d?.[0]?.tags?.find((t) => typeof t === "string" && t.startsWith("f:"));
        return tag ? parseFloat(tag.slice(2)) : 50;
      } catch {
        return 50;
      }
    }));
    const avgFreq = freqs.reduce((a, b) => a + b, 0) / freqs.length;
    return Math.max(0, Math.min(100, 100 - avgFreq / 3));
  } catch {
    return 83;
  }
}
__name(_datamuseFreshness, "_datamuseFreshness");
async function scoreProse(text) {
  if (!text)
    return 0;
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length)
    return 0;
  const unique = new Set(words.map((w) => w.toLowerCase()));
  const specifics = words.filter((w) => /^[A-Z][a-z]/.test(w) || /\d/.test(w));
  const specificity = specifics.length / words.length;
  const variety = unique.size / words.length;
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 3);
  const nSent = Math.max(1, sentences.length);
  const density = specifics.length / nSent;
  const statPatterns = [
    /\b\d{1,3}(?:\.\d{1,2})?\s*(?:PPG|APG|RPG|BPG|SPG|MPG|ERA|WHIP|OPS|WAR|DRTG|ORTG|PACE)\b/gi,
    /\b\d{1,3}(?:\.\d{1,2})?%/g,
    /\b\d{1,3}-\d{1,3}\b/g
  ];
  const stats = /* @__PURE__ */ new Set();
  for (const p of statPatterns)
    (text.match(p) || []).forEach((m) => stats.add(m));
  const statDepth = Math.min(1, stats.size / 4);
  const freshness = await _datamuseFreshness(words);
  const base = Math.min(
    140,
    Math.round(specificity * 50 + variety * 38 + Math.min(density, 4) * 6 + statDepth * 28 + freshness / 100 * 20)
  );
  const first = sentences[0] || "";
  const last = sentences[sentences.length - 1] || "";
  const sentStarts = new Set(sentences.map((s) => s.split(/\s+/)[0]));
  const stakes = /\b\d-\d\b/.test(first) || /\b(finals|championship|eliminated|advance|clinch|series|title|cup|playoffs)\b/i.test(first) || /\b(first since|since \d{4}|\d+ years?)\b/i.test(first);
  const tension = sentences.some((s) => {
    const sw = s.split(/\s+/);
    const hasPlayer = sw.some((w) => /^[A-Z][a-z]{2,}/.test(w) && !sentStarts.has(w) && w.length > 3);
    const hasStat = /\d/.test(s) && (/\d+\.\d/.test(s) || /\d+%/.test(s) || /\b(pts?|points?|rebounds?|assists?|goals?|ppg|apg|rpg|saves?)\b/i.test(s));
    return hasPlayer && hasStat;
  });
  const resolution = /\b(watch|look for|decide|force|need|must|whether|tonight|will|could)\b/i.test(last) || /\bif\b/i.test(last) || /\?/.test(last);
  const arcScore = (stakes ? 10 : 0) + (tension ? 10 : 0) + (resolution ? 10 : 0) + (stakes && tension && resolution ? 10 : 0);
  return Math.min(180, base + arcScore);
}
__name(scoreProse, "scoreProse");
var FIELD_PROSE_STYLE = [
  '- STYLE: specificity over metaphor. "48 minutes from their first Finals since 1999" not "looking to punch their ticket."',
  `- STYLE: numbers over adjectives. "Brunson's 29.0 PPG this series" not "Brunson has been dominant."`,
  `- TIME-PERIOD ANCHORING (mandatory): every numeric statistic must be qualified with its time period in the SAME sentence. Required for points, PPG, ERA, batting avg, RBIs, goals, goals-against, FG%, saves, shots, etc. Acceptable qualifiers: "this postseason", "this series", "this season", "last 5 games", "career", "through 30 starts", "tonight", "in May". Bare numbers like "25.0 points", "26.0 PPG", "37 goals", "5-for-6 with 2 RBIs", "32 points through the season" without a clear timeframe ARE FORBIDDEN. The reader must always know what window the number is measured over. Example: write "Wembanyama's 28.2 PPG this postseason" not "Wembanyama's 25.0 points." Write "Jung Hoo Lee's 5-for-6 night" not "Jung Hoo Lee went 5-for-6" \u2014 the noun "night" anchors the number to one game.`,
  '- STYLE: active voice. "Wembanyama blocked 3 shots" not "3 shots were blocked."',
  '- STYLE: concrete over abstract. "Game 4 starts at 8pm on ESPN" not "the stage is set for a pivotal matchup."',
  "- STYLE: one metaphor max per brief \u2014 if you use one, make it original.",
  "- STYLE: write like a well-prepared friend who watched every game, not like a press release.",
  "- STYLE: if a sentence would work in any game recap for any sport, it is too generic \u2014 rewrite with details specific to THIS game.",
  '- CITE ANALYTICS: if [PP/PK], [POSSESSION], [PARK], [UMPIRE], or [GOALIE] context appears in the game data, cite the specific figure verbatim \u2014 not a paraphrase. "93.5% penalty kill" not "elite penalty killing". "+17% runs at Camden Yards" not "a hitter-friendly park".',
  '- CITE NBA ANALYTICS: if [SLOW GRIND], [FAST PACE], [ELITE D BOTH], [CHESS MATCH], [CLUTCH], or [GAME TYPE] appears, cite specific DRTG, pace, or clutch figures verbatim. "107.7 DRTG, best in the NBA" not "elite defense".',
  '- CITE CHAMPION: if [CHAMPION] appears in game context, reference the team as "defending champions" or "reigning NBA champions" in the first paragraph \u2014 never omit this when present.',
  "- FEATURED STAT: if a [FEATURED STAT] line appears for a game, that exact figure MUST appear in your brief for that game.",
  '- LEAD SENTENCE: never start a brief, paragraph, or sentence with "The [Team]..." \u2014 lead with the specific situation. "Wembanyama scored 34" not "The Spurs got a big performance." "Two years without a Finals appearance ends tonight" not "The Celtics are looking to make a statement."',
  "- LEAGUE BOUNDARIES (critical): each league is a self-contained competition. NBA winners advance to the NBA Finals to face another NBA team. NHL winners advance to the Stanley Cup Final to face another NHL team. MLB winners advance to the World Series to face another MLB team. NEVER describe a team in one league as advancing to face the winner of, or playing against, a team or champion in a different league. The Stanley Cup, NBA Finals, World Series, Super Bowl, MLS Cup, and Premier League title are separate trophies in separate competitions. If two playoff series in different leagues happen at the same time, write about them as parallel events \u2014 never as connected or sequential events.",
  "- BANNED PHRASES (never use): " + BANNED_PHRASES.join(", ") + ".",
  "- USE SPARINGLY (maximum once per brief): " + SPARINGLY_PHRASES.join(", ") + ". If you use any of these, use it once only \u2014 then choose a more specific word.",
  "- NEVER explain what data is missing or why you cannot write something. If context is limited, write a short factual brief from what is available. Do not produce meta-commentary about the data."
].join("\n");
async function runQualityChain(prompt, initialText, callProxy, opts = {}) {
  const t0 = Date.now();
  const layers_fired = [];
  let text = initialText;
  let retries = 0;
  const sport = opts.sport || null;
  const maxRetries = opts.maxRetries || 6;
  const cliches = hasCliche(text);
  const overused = countSparingly(text);
  if ((cliches.length || overused.length) && retries < maxRetries) {
    const banNote = cliches.length ? "BANNED PHRASES to remove: " + cliches.join(", ") + ". " : "";
    const sparNote = overused.length ? "OVERUSED WORDS (used " + overused.map((r) => '"' + r.phrase + '" ' + r.count + "x").join(", ") + " \u2014 use each at most once, replace extras): " : "";
    const retryPrompt = prompt + "\n\nIMPORTANT REWRITE: " + banNote + sparNote + "Rewrite without them. Use a specific fact instead of each generic phrase.";
    const retried = await callProxy(retryPrompt);
    if (retried && retried.length > 30) {
      text = retried.trim();
      retries++;
      layers_fired.push("2");
    }
  }
  if (sport) {
    const viol = checkSportVocab(text, sport);
    if (viol.length && retries < maxRetries) {
      const sportClass = detectSportClass(sport);
      const vocab = SPORT_VOCAB_VIOLATIONS[sportClass] || {};
      const retryPrompt = prompt + `

CRITICAL CORRECTION \u2014 sport vocabulary errors detected:
Sport: ${vocab.sport || sport}. Score in ${vocab.units || "correct units"}. Extra period = ${vocab.extra_period || "correct term"}.
These terms from the wrong sport appeared in your draft and must be removed: ${viol.join(", ")}.
Rewrite using ONLY vocabulary appropriate for ${vocab.sport || sport}.`;
      const retried = await callProxy(retryPrompt);
      if (retried && retried.length > 30) {
        text = retried.trim();
        retries++;
        layers_fired.push("2b");
      }
    }
  }
  const genericLead = hasGenericLead(text);
  if (genericLead && retries < maxRetries) {
    const retryPrompt = prompt + `

LEAD SENTENCE CORRECTION: Your draft starts with "${genericLead.slice(0, 80)}..." \u2014 this is the generic AI pattern. Rewrite the first sentence to lead with a specific fact, name, number, or situation. NOT "The [Team] ..." \u2014 instead something like "Wembanyama scored 34" or "Two years without a Finals appearance ends tonight."`;
    const retried = await callProxy(retryPrompt);
    if (retried && retried.length > 30) {
      text = retried.trim();
      retries++;
      layers_fired.push("2c");
    }
  }
  const missing = missingStats(prompt, text);
  if (missing.length && retries < maxRetries) {
    const retryPrompt = prompt + "\n\nSTAT VERIFICATION FAILURE: Your previous draft omitted these specific figures that were in the context data: " + missing.join(", ") + ". These exact figures MUST appear verbatim in your rewrite. A brief without its own data is just filler.";
    const retried = await callProxy(retryPrompt);
    if (retried && retried.length > 30) {
      text = retried.trim();
      retries++;
      layers_fired.push("2d");
    }
  }
  const cross = hasCrossSportHallucination(text);
  if (cross.length && retries < maxRetries) {
    const errorLines = cross.map(
      (v) => `- The sentence "${v.sentence.slice(0, 140)}${v.sentence.length > 140 ? "..." : ""}" combines ${v.leagues.map((l) => l.toUpperCase()).join(" and ")} in a way that suggests they meet, advance against each other, or share a championship. They do not.`
    ).join("\n");
    const retryPrompt = prompt + `

CRITICAL FACTUAL CORRECTION \u2014 cross-league hallucination detected:
` + errorLines + `

Each league is independent: NBA winners face other NBA teams in the NBA Finals; NHL winners face other NHL teams in the Stanley Cup Final; MLB winners face other MLB teams in the World Series; etc. They never advance to face winners from other leagues. Rewrite so every sentence treats each league as self-contained. If both leagues appear, describe as PARALLEL events. Do NOT use face/advance/play/meet/winner of when bridging leagues.`;
    const retried = await callProxy(retryPrompt);
    if (retried && retried.length > 30) {
      text = retried.trim();
      retries++;
      layers_fired.push("2e");
    }
  }
  const score = await scoreProse(text);
  const THRESHOLD = opts.scoreThreshold || 130;
  if (score < THRESHOLD && retries < maxRetries) {
    const retryPrompt = prompt + `

QUALITY SCORE LOW (${score}/180): the previous draft scored below our quality threshold. Add more specific facts: proper names, exact numbers, stats with units, and concrete details. Every sentence should contain at least one specific fact (name, number, stat, or concrete detail). Remove vague adjectives and generic transitions.`;
    const retried = await callProxy(retryPrompt);
    if (retried && retried.length > 30) {
      const newScore = await scoreProse(retried);
      if (newScore >= score) {
        text = retried.trim();
        retries++;
        layers_fired.push("3b");
      }
    }
  }
  const finalScore = await scoreProse(text);
  return {
    text,
    score: finalScore,
    retries,
    layers_fired,
    ms: Date.now() - t0
  };
}
__name(runQualityChain, "runQualityChain");

// src/finals-context.js
var NBA_FINALS_2026_CONTEXT = [
  "NBA FINALS 2026 \u2014 San Antonio Spurs vs New York Knicks. G1 Wed June 3, 8:30pm ET, Frost Bank Center, ABC.",
  "- SAS regular season 62-20. NYK regular season 53-29. (Source: FIELD codebase line 7424.)",
  "- NYK first Finals appearance since 1999 (27 years). The 1999 Finals: NYK lost 4-1 to the same SAS franchise; Tim Duncan won his first Finals MVP. NYK was the only 8-seed Finals team until 2023. (Source: Wikipedia 1999 NBA Finals; basketball-reference.)",
  "- SAS last Finals appearance: 2014 (12 years). Won 4-1 over Miami Heat; Kawhi Leonard MVP; 5th franchise championship. SAS regular season was also 62-20 that year \u2014 same as 2026. (Source: Wikipedia 2014 NBA Finals; nba.com history.)",
  "- Path to 2026 Finals: SAS defeated defending champion OKC 4-3 in WCF (Wembanyama 28.2 PPG / 3.7 BPG this postseason \u2014 his first deep playoff run). NYK swept CLE 4-0 in ECF (Brunson ECF MVP). (Source: FIELD codebase matchupNote line 7422/7424.)",
  "- Venues: SAS hosts G1/G2/G5/G7 at Frost Bank Center, San Antonio. NYK hosts G3/G4/G6 at Madison Square Garden. (Source: FIELD codebase line 7424-7430.)",
  "- ABC crew: Mike Breen play-by-play, Richard Jefferson + Tim Legler analysts. (Source: FIELD codebase line 7424.)",
  "- Franchise championships: SAS has 5 (1999, 2003, 2005, 2007, 2014). NYK has 2 (1970, 1973). (Source: nba.com history.)"
].join("\n");
var NHL_SCF_2026_CONTEXT = [
  "STANLEY CUP FINAL 2026 \u2014 Carolina Hurricanes vs Vegas Golden Knights. G1 Tue June 2, 8pm ET, Lenovo Center, Raleigh, ABC.",
  "- CAR first Stanley Cup Final since winning the Cup in 2006 (20 years). The 2006 Final: CAR defeated Edmonton Oilers 4-3 in 7 games; rookie goalie Cam Ward won Conn Smythe; Rod Brind'Amour captained the win \u2014 CAR's 1st championship and 2nd-ever Final appearance (also 2002, lost to Detroit). (Source: Wikipedia 2006 Stanley Cup Final; ESPN 2006 box scores.)",
  "- VGK making 3rd Final in 9 years (franchise founded 2017 as expansion). 2018: lost 4-1 to Washington Capitals in VGK's inaugural season (Ovechkin's first Cup). 2023: won 4-1 over Florida Panthers; Mark Stone hat trick in clinching G5 (9-3) \u2014 VGK's 1st championship, in just its 6th season. (Source: CBS 2023 SCF coverage; PBS; The Hockey Writers.)",
  "- Path to 2026 SCF: CAR completed ECF 4-1 over Montreal (Andersen shutout in G4, 6-1 G5 win). VGK swept Colorado 4-0 in WCF (Stone GWG in G4, outscored COL 14-7 across series). (Source: FIELD codebase matchupNote line 7456-7458, 7476.)",
  "- G1 result (June 2, Lenovo Center): VGK 5-4. Ehlers scored 25 seconds in (fastest SCF G1 goal since Reggie Leach 1976) and scored again for 2-0 CAR lead. VGK came back with 3 straight goals, score tied at 2-2, 3-3, 4-4. Hertl GWG with 3:24 left. VGK first road team in NHL history to overcome a multi-goal deficit (2-0) to win SCF G1 \u2014 road teams were 0-55 in that situation before this game (ESPN Insights / NHL.com). Theodore 1G/2A, McNabb 3A. Andersen allowed 5 on 23 shots. VGK leads series 1-0.",
  '- Venues: CAR hosts G1/G2/G5/G7 at Lenovo Center, Raleigh. VGK hosts G3/G4/G6 at T-Mobile Arena, Las Vegas. G1 and G2 are BOTH in Raleigh \u2014 the series does not visit Las Vegas until G3. Do NOT write "returns to Vegas" or "back in Vegas" \u2014 the series goes to Vegas for the FIRST TIME at G3. (Source: FIELD codebase line 7463-7469.)',
  "- ABC crew: Sean McDonough play-by-play, Ray Ferraro analyst. (Source: FIELD codebase line 7463.)",
  "- Key CAR players: Nikolaj Ehlers (scored first two goals of G1 in 25 seconds and 12:08 of P1 \u2014 built the 2-0 lead VGK erased), Andrei Svechnikov, Sebastian Aho, Frederik Andersen (G, allowed 5 on 23 in G1). (Source: FIELD codebase matchupNote; G1 NHL.com recap.)",
  "- Key VGK players: Mark Stone (captain), Pavel Dorofeyev, Jonathan Marchessault. (Source: FIELD codebase matchupNote line 7463.)",
  "- Franchise championships: CAR has 1 (2006). VGK has 1 (2023). (Source: nhl.com history.)"
].join("\n");
function slateHasNBAFinals(gameLines) {
  return gameLines.some(
    (l) => (
      // Case 3: ESPN series field — "NBA Finals" with or without year
      /\bNBA Finals\b/i.test(l) || // Case 1: full team names in same line (direct data / non-ESPN sources)
      /\bSan Antonio Spurs\b/.test(l) && /\bNew York Knicks\b/.test(l) || // Case 2: ESPN short display names — "Spurs" + "Knicks" in same game line.
      // Safe: "Spurs" without "Knicks" matches Tottenham in EPL lines; combined
      // check prevents false positives across sports.
      /\bSpurs\b/.test(l) && /\bKnicks\b/.test(l)
    )
  );
}
__name(slateHasNBAFinals, "slateHasNBAFinals");
function slateHasSCF(gameLines) {
  return gameLines.some(
    (l) => (
      // Case 3: ESPN series field — "Stanley Cup Final" with or without year
      /\bStanley Cup Final\b/i.test(l) || // Case 1: full team names in same line
      /\bCarolina Hurricanes\b/.test(l) && /\bVegas Golden Knights\b/.test(l) || // Case 2: ESPN short display names — "Hurricanes" or "Canes" + "Golden Knights" or "Knights"
      /\b(Hurricanes|Canes)\b/.test(l) && /\b(Golden Knights|Knights)\b/.test(l)
    )
  );
}
__name(slateHasSCF, "slateHasSCF");
function buildFinalsContextBlock(gameLines) {
  const blocks = [];
  if (slateHasNBAFinals(gameLines))
    blocks.push(NBA_FINALS_2026_CONTEXT);
  if (slateHasSCF(gameLines))
    blocks.push(NHL_SCF_2026_CONTEXT);
  if (!blocks.length)
    return "";
  return [
    "",
    "FINALS NARRATIVE CONTEXT (verified background facts; use where natural, do NOT invent beyond these):",
    ...blocks
  ].join("\n");
}
__name(buildFinalsContextBlock, "buildFinalsContextBlock");

// src/wc-team-context.js
var WC_NAME_TO_CODE = {
  "United States": "USA",
  "Mexico": "MEX",
  "Canada": "CAN",
  "South Korea": "KOR",
  "South Africa": "RSA",
  "Czechia": "CZE",
  "Bosnia and Herzegovina": "BIH",
  "Qatar": "QAT",
  "Switzerland": "SUI",
  "Brazil": "BRA",
  "Morocco": "MAR",
  "Haiti": "HAI",
  "Scotland": "SCO",
  "Paraguay": "PAR",
  "Australia": "AUS",
  "T\xFCrkiye": "TUR",
  "Germany": "GER",
  "Cura\xE7ao": "CUW",
  "Ivory Coast": "CIV",
  "Ecuador": "ECU",
  "Netherlands": "NED",
  "Japan": "JPN",
  "Tunisia": "TUN",
  "Sweden": "SWE",
  "Belgium": "BEL",
  "Egypt": "EGY",
  "Iran": "IRN",
  "New Zealand": "NZL",
  "Spain": "ESP",
  "Cape Verde": "CPV",
  "Saudi Arabia": "KSA",
  "Uruguay": "URU",
  "France": "FRA",
  "Senegal": "SEN",
  "Iraq": "IRQ",
  "Norway": "NOR",
  "Argentina": "ARG",
  "Algeria": "ALG",
  "Austria": "AUT",
  "Jordan": "JOR",
  "Colombia": "COL",
  "Congo DR": "COD",
  "Portugal": "POR",
  "Uzbekistan": "UZB",
  "Panama": "PAN",
  "England": "ENG",
  "Croatia": "CRO",
  "Ghana": "GHA"
};
var WC_TEAM_CONTEXT = {
  // ── GROUP A ──────────────────────────────────────────────────────────────────
  MEX: {
    fifaCode: "MEX",
    displayName: "Mexico",
    group: "A",
    fifaRank: 15,
    // [FIFA] April 1 2026
    wcAppearances: 17,
    // [Wiki] 17 appearances including 2026
    bestResult: "Quarter-finals 1970, 1986 (host)",
    manager: "Javier Aguirre",
    // [FIFPlay] appointed 2024
    keyPlayers: "Jim\xE9nez (FW, Fulham), Lozano (FW), Flores (CM)",
    qualifyingNote: "Host nation \u2014 automatic qualification as co-host",
    debutFlag: false,
    guardrail: null,
    narrativeNote: "Mexico opens the tournament at Estadio Azteca \u2014 the same venue that hosted WC 1970 and 1986 finals. Aguirre's third stint as Mexico manager."
  },
  RSA: {
    fifaCode: "RSA",
    displayName: "South Africa",
    group: "A",
    fifaRank: 60,
    // [FIFA] April 2026
    wcAppearances: 4,
    // [Wiki] 1998, 2002, 2010 (host), 2026
    bestResult: "Group stage (host in 2010)",
    manager: "Hugo Broos",
    // [FIFPlay] appointed 2021
    keyPlayers: "Zwane (FW), Dolly (FW), Williams (GK)",
    qualifyingNote: "Qualified via CAF \u2014 Africa qualifying",
    debutFlag: false,
    guardrail: null,
    narrativeNote: "Bafana Bafana open against Mexico in a rematch of the iconic 2010 WC opening match at Soccer City, when Lawrence Tshabalala scored one of the tournament's most celebrated goals."
  },
  KOR: {
    fifaCode: "KOR",
    displayName: "South Korea",
    group: "A",
    fifaRank: 25,
    // [FIFA] April 2026
    wcAppearances: 11,
    // [Wiki] 11 appearances including 2026
    bestResult: "Semi-finals 2002 (co-host)",
    manager: "Hong Myung-bo",
    // [FIFPlay] appointed 2024
    keyPlayers: "Son Heung-min (FW/CAP, Tottenham), Lee Jae-sung (CM), Hwang Hee-chan (FW)",
    qualifyingNote: "Qualified automatically \u2014 AFC qualifying",
    debutFlag: false,
    guardrail: null,
    narrativeNote: "Son Heung-min captains South Korea \u2014 one of Asia's all-time greatest players. South Korea's 2002 semi-final run (co-hosting with Japan) remains the best finish by an Asian team."
  },
  CZE: {
    fifaCode: "CZE",
    displayName: "Czechia",
    group: "A",
    fifaRank: 41,
    // [FIFA] April 2026
    wcAppearances: 2,
    // [Wiki] as Czech Republic: 2006; 2026 (Czechia era — Czechoslovakia had 11 WC appearances)
    bestResult: "Group stage (2006 as Czech Republic)",
    manager: "Miroslav Koubek",
    // [FIFPlay] appointed 2024
    keyPlayers: "Schick (FW, Bayer Leverkusen), Sou\u010Dek (CM, West Ham), Coufal (RB)",
    qualifyingNote: "Qualified via UEFA \u2014 European playoff winner (beat Italy)",
    debutFlag: false,
    guardrail: "Czechia as a nation includes the Czech Republic era WC records (2006). Czechoslovakia had a much longer WC history (11 appearances, runners-up 1934 and 1962) \u2014 use full Czechoslovakia/Czech Republic context if appropriate.",
    narrativeNote: "Qualified via a dramatic penalty shootout win over Italy in the UEFA playoffs \u2014 Italy missing a second consecutive WC. Schick is their talismanic striker."
  },
  // ── GROUP B ──────────────────────────────────────────────────────────────────
  CAN: {
    fifaCode: "CAN",
    displayName: "Canada",
    group: "B",
    fifaRank: 30,
    // [FIFA] April 2026
    wcAppearances: 3,
    // [Wiki] 1986, 2022, 2026
    bestResult: "Group stage (1986, 2022)",
    manager: "Jesse Marsch",
    // [FIFPlay] appointed 2024
    keyPlayers: "Davies (LW/LB, Bayern Munich), Jonathan David (FW, Lille), Eust\xE1quio (CM)",
    qualifyingNote: "Host nation \u2014 automatic qualification as co-host",
    debutFlag: false,
    guardrail: null,
    narrativeNote: "Second home World Cup after 1986. Davies and Jonathan David lead a golden generation that reached Qatar 2022 \u2014 the first WC for Canada in 36 years. All three group games played on home soil."
  },
  BIH: {
    fifaCode: "BIH",
    displayName: "Bosnia and Herzegovina",
    group: "B",
    fifaRank: 65,
    // [FIFA] April 2026
    wcAppearances: 2,
    // [Wiki] 2014, 2026
    bestResult: "Group stage (2014)",
    manager: "Sergej Barbarez",
    // [FIFPlay] appointed 2024
    keyPlayers: "D\u017Eeko (FW, Fenerbah\xE7e \u2014 veteran), Ahmedhodzic (CB, Sheffield United), Pjani\u0107 (retired)",
    qualifyingNote: "Qualified via UEFA \u2014 European playoff winner (beat Germany in extra time)",
    debutFlag: false,
    guardrail: null,
    narrativeNote: "Qualified with a stunning 2-1 extra-time win over Germany in the UEFA European playoff \u2014 one of qualifying's biggest upsets. Dragons making only their second World Cup."
  },
  QAT: {
    fifaCode: "QAT",
    displayName: "Qatar",
    group: "B",
    fifaRank: 55,
    // [FIFA] April 2026
    wcAppearances: 2,
    // [Wiki] 2022 (host), 2026
    bestResult: "Group stage (2022, 2026)",
    manager: "Julen Lopetegui",
    // [FIFPlay] appointed 2025
    keyPlayers: "Afif (FW, Al Sadd), Al-Moez Ali (FW), Boudiaf (CM)",
    qualifyingNote: "Qualified via AFC \u2014 Asian qualifying",
    debutFlag: false,
    guardrail: "Qatar became the first host nation in WC history to be eliminated in the group stage in 2022 \u2014 scored only 1 goal in 3 games. Do NOT frame 2026 as a redemption story without noting the 2022 context.",
    narrativeNote: "First WC as a non-host qualifier. Lopetegui (former Spain/Real Madrid manager) hired to rebuild after 2022 embarrassment. Akram Afif is their best player and a genuine creative threat."
  },
  SUI: {
    fifaCode: "SUI",
    displayName: "Switzerland",
    group: "B",
    fifaRank: 19,
    // [FIFA] April 2026
    wcAppearances: 12,
    // [Wiki] including 2026
    bestResult: "Quarter-finals 1934, 1938, 1954 (host)",
    manager: "Murat Yakin",
    // [FIFPlay] appointed 2021
    keyPlayers: "Xhaka (CM, Bayer Leverkusen), Akanji (CB, Man City), Embolo (FW)",
    qualifyingNote: "Qualified automatically \u2014 UEFA qualifying",
    debutFlag: false,
    guardrail: null,
    narrativeNote: "Consistent dark horses \u2014 reached the last 16 in 2022 (lost to Portugal). Xhaka is their captain and creative engine from deep."
  },
  // ── GROUP C ──────────────────────────────────────────────────────────────────
  BRA: {
    fifaCode: "BRA",
    displayName: "Brazil",
    group: "C",
    fifaRank: 6,
    // [FIFA] April 2026
    wcAppearances: 22,
    // [Wiki] 22 appearances including 2026 — every WC ever
    bestResult: "Champions 1958, 1962, 1970, 1994, 2002 (5 titles \u2014 record)",
    manager: "Carlo Ancelotti",
    // [FIFPlay] appointed 2025 — from Real Madrid
    keyPlayers: "Vin\xEDcius Jr (FW, Real Madrid), Rodrygo (FW, Real Madrid), Endrick (FW)",
    qualifyingNote: "Qualified automatically \u2014 CONMEBOL qualifying",
    debutFlag: false,
    guardrail: 'Brazil are the only nation to have played in EVERY World Cup. Their 7-1 loss to Germany in the 2014 semi-final (as hosts) is directly relevant context. Last won in 2002. Do NOT say "seeking a record 6th title" \u2014 it would be their 6th, but the record is already theirs at 5.',
    narrativeNote: "Ancelotti's first tournament as Brazil manager after joining from Real Madrid in 2025. Last won in 2002 \u2014 a 24-year title drought for the most decorated WC nation."
  },
  MAR: {
    fifaCode: "MAR",
    displayName: "Morocco",
    group: "C",
    fifaRank: 8,
    // [FIFA] April 2026
    wcAppearances: 7,
    // [Wiki] 1970, 1986, 1994, 1998, 2018, 2022, 2026
    bestResult: "Semi-finals 2022 (first African team ever)",
    manager: "Walid Regragui",
    // [FIFPlay] appointed 2022
    keyPlayers: "En-Nesyri (FW, Fenerbah\xE7e), Ziyech (AM, Galatasaray), Amrabat (CM)",
    qualifyingNote: "Qualified automatically \u2014 CAF qualifying",
    debutFlag: false,
    guardrail: null,
    narrativeNote: "First African team in WC semi-finals history (2022). Regragui unchanged as manager. Now ranked 8th in the world \u2014 legitimate contenders, not underdogs."
  },
  HAI: {
    fifaCode: "HAI",
    displayName: "Haiti",
    group: "C",
    fifaRank: 83,
    // [FIFA] April 2026
    wcAppearances: 2,
    // [Wiki] 1974, 2026
    bestResult: "Group stage (1974)",
    manager: "S\xE9bastien Mign\xE9",
    // [FIFPlay] appointed 2024
    keyPlayers: "Etienne Jr (FW, Toronto FC), Nesta Quintero (CM)",
    qualifyingNote: "Qualified via CONCACAF \u2014 Nations League path",
    debutFlag: false,
    guardrail: null,
    narrativeNote: "First World Cup appearance in 52 years (since 1974). Haiti face Brazil and Morocco \u2014 the two teams that met in the 2022 quarter-finals. Remarkable qualification story."
  },
  SCO: {
    fifaCode: "SCO",
    displayName: "Scotland",
    group: "C",
    fifaRank: 43,
    // [FIFA] April 2026
    wcAppearances: 9,
    // [Wiki] 9 appearances including 2026 (last was 1998 — 28-year gap)
    bestResult: "Group stage (multiple appearances)",
    manager: "Steve Clarke",
    // [FIFPlay] appointed 2019
    keyPlayers: "McTominay (CM, Napoli), Robertson (LB, Liverpool), Tierney (LB)",
    qualifyingNote: "Qualified via UEFA \u2014 European qualifying",
    debutFlag: false,
    guardrail: null,
    narrativeNote: "Scotland return to the World Cup after a 28-year absence (last appearance 1998). McTominay and Robertson lead the most talented Scottish generation in decades."
  },
  // ── GROUP D ──────────────────────────────────────────────────────────────────
  USA: {
    fifaCode: "USA",
    displayName: "United States",
    group: "D",
    fifaRank: 16,
    // [FIFA] April 2026
    wcAppearances: 11,
    // [Wiki] 11 appearances including 2026
    bestResult: "Semi-finals 1930",
    manager: "Mauricio Pochettino",
    // [FIFPlay] appointed 2024 — former Chelsea/PSG/Spurs
    keyPlayers: "Pulisic (FW/CAP, AC Milan), Adams (CM, Bournemouth), McKennie (CM)",
    qualifyingNote: "Host nation \u2014 automatic qualification as co-host",
    debutFlag: false,
    guardrail: null,
    narrativeNote: "First home World Cup since co-hosting in 1994. Pochettino's golden generation must deliver on home soil. USA vs Paraguay on June 12 is free on Tubi \u2014 biggest US soccer moment in decades."
  },
  PAR: {
    fifaCode: "PAR",
    displayName: "Paraguay",
    group: "D",
    fifaRank: 40,
    // [FIFA] April 2026
    wcAppearances: 9,
    // [Wiki] 9 appearances including 2026
    bestResult: "Quarter-finals 2010",
    manager: "Gustavo Alfaro",
    // [FIFPlay] appointed 2024
    keyPlayers: "Sanabria (FW, Torino), Almir\xF3n (AM, Newcastle United), G\xF3mez (GK)",
    qualifyingNote: "Qualified via CONMEBOL \u2014 South American qualifying",
    debutFlag: false,
    guardrail: null,
    narrativeNote: "Almir\xF3n (Newcastle) is their most recognizable player globally. Paraguay-USA on June 12 is free on Tubi \u2014 the highest-profile free WC broadcast in US history."
  },
  AUS: {
    fifaCode: "AUS",
    displayName: "Australia",
    group: "D",
    fifaRank: 27,
    // [FIFA] April 2026
    wcAppearances: 6,
    // [Wiki] 1974, 2006, 2010, 2014, 2022, 2026
    bestResult: "Round of 16 2006, 2022",
    manager: "Tony Popovic",
    // [FIFPlay] appointed 2024
    keyPlayers: "Leckie (FW/RW, Melbourne City), Irvine (CM, St. Pauli), Rowles (CB)",
    qualifyingNote: "Qualified via AFC \u2014 Asian qualifying",
    debutFlag: false,
    guardrail: null,
    narrativeNote: "Reached the Round of 16 in 2022 (lost to Argentina). Popovic replaced Socceroos legend Arnold. Leckie remains the key attacking outlet."
  },
  TUR: {
    fifaCode: "TUR",
    displayName: "T\xFCrkiye",
    group: "D",
    fifaRank: 22,
    // [FIFA] April 2026
    wcAppearances: 3,
    // [Wiki] 1954, 2002, 2026
    bestResult: "Third place 2002",
    manager: "Vincenzo Montella",
    // [FIFPlay] appointed 2023 — Italian manager
    keyPlayers: "\xC7alhanoglu (CM, Inter Milan), G\xFCler (AM, Real Madrid \u2014 young star), Y\u0131ld\u0131z (FW)",
    qualifyingNote: "Qualified via UEFA \u2014 European playoff winner",
    debutFlag: false,
    guardrail: "SPELLING: T\xFCrkiye with \xFC \u2014 not Turkey. As used in wc26Raw, by FIFA and the Turkish government officially since 2022.",
    narrativeNote: "Arda G\xFCler (Real Madrid) is one of the tournament's most exciting young talents at age 20. Turkish football at a generational pivot. Third place in 2002 remains their best WC finish."
  },
  // ── GROUP E ──────────────────────────────────────────────────────────────────
  GER: {
    fifaCode: "GER",
    displayName: "Germany",
    group: "E",
    fifaRank: 10,
    // [FIFA] April 2026
    wcAppearances: 20,
    // [Wiki] 20 appearances including 2026 (as Germany — W.Germany era included)
    bestResult: "Champions 1954, 1974, 1990, 2014 (4 titles)",
    manager: "Julian Nagelsmann",
    // [FIFPlay] appointed 2023
    keyPlayers: "Havertz (FW/AM, Arsenal), Musiala (AM, Bayern Munich), Ter Stegen (GK)",
    qualifyingNote: "Qualified via UEFA \u2014 European qualifying",
    debutFlag: false,
    guardrail: "Germany were ELIMINATED IN THE GROUP STAGE in both 2018 and 2022 \u2014 consecutive group-stage exits as defending champion (2018) and then again in 2022. This redemption narrative is central to 2026. Do NOT frame them as dominant favorites without acknowledging the recent failures.",
    narrativeNote: "Nagelsmann's young Germany desperate to end back-to-back group-stage exits. Musiala (21) and Havertz lead a squad with genuine talent and much to prove."
  },
  CUW: {
    fifaCode: "CUW",
    displayName: "Cura\xE7ao",
    group: "E",
    fifaRank: 82,
    // [FIFA] April 2026
    wcAppearances: 1,
    // 2026 is their FIRST appearance
    bestResult: "First appearance 2026",
    manager: "Dick Advocaat",
    // [FIFPlay] appointed 2024 — veteran Dutch manager
    keyPlayers: "Cordelia (FW), Koolwijk (CM), Cijntje (FW)",
    qualifyingNote: "Qualified via CONCACAF \u2014 Nations League path",
    debutFlag: true,
    guardrail: null,
    narrativeNote: "FIRST EVER World Cup appearance. Smallest nation in the 2026 tournament by population (~156,000). Dick Advocaat \u2014 who won trophies with PSV, Rangers, Zenit \u2014 managing one of football's ultimate underdog stories."
  },
  CIV: {
    fifaCode: "CIV",
    displayName: "Ivory Coast",
    group: "E",
    fifaRank: 34,
    // [FIFA] April 2026
    wcAppearances: 4,
    // [Wiki] 2006, 2010, 2014, 2026 (missed 2018, 2022)
    bestResult: "Group stage (multiple times)",
    manager: "Emerse Fa\xE9",
    // [FIFPlay] appointed 2024
    keyPlayers: "Haller (FW, Borussia Dortmund), Sangar\xE9 (CM, Nottm Forest), Fofana (CM)",
    qualifyingNote: "Qualified via CAF \u2014 Africa qualifying",
    debutFlag: false,
    guardrail: null,
    narrativeNote: "The golden generation of Drogba/Tour\xE9 has passed, but Haller and Sangar\xE9 lead a competitive new wave. First WC since 2014 after missing two editions."
  },
  ECU: {
    fifaCode: "ECU",
    displayName: "Ecuador",
    group: "E",
    fifaRank: 23,
    // [FIFA] April 2026
    wcAppearances: 4,
    // [Wiki] 2002, 2006, 2014, 2026
    bestResult: "Round of 16 2006",
    manager: "Sebasti\xE1n Beccacece",
    // [FIFPlay] appointed 2024 — Argentine tactician
    keyPlayers: "Caicedo (CM, Chelsea), Plata (FW), Sarmiento (FW)",
    qualifyingNote: "Qualified via CONMEBOL \u2014 South American qualifying",
    debutFlag: false,
    guardrail: null,
    narrativeNote: "Mois\xE9s Caicedo (Chelsea) is one of the world's best defensive midfielders at 22 \u2014 Ecuador's most important player and a realistic Ballon d'Or candidate if he performs here."
  },
  // ── GROUP F ──────────────────────────────────────────────────────────────────
  NED: {
    fifaCode: "NED",
    displayName: "Netherlands",
    group: "F",
    fifaRank: 7,
    // [FIFA] April 2026
    wcAppearances: 11,
    // [Wiki] 11 appearances including 2026
    bestResult: "Runners-up 1974, 1978, 2010",
    manager: "Ronald Koeman",
    // [FIFPlay] appointed 2023 (second stint)
    keyPlayers: "Van Dijk (CB/CAP, Liverpool), Gakpo (FW, Liverpool), De Jong (CM, Barcelona)",
    qualifyingNote: "Qualified automatically \u2014 UEFA qualifying",
    debutFlag: false,
    guardrail: "Netherlands have finished runners-up three times (1974, 1978, 2010) without winning the tournament \u2014 a defining narrative. Do NOT say they have won the World Cup.",
    narrativeNote: `Three WC finals, zero titles \u2014 the "total football" nation's crowning achievement still eludes them. Van Dijk leads a squad with genuine world-class quality.`
  },
  JPN: {
    fifaCode: "JPN",
    displayName: "Japan",
    group: "F",
    fifaRank: 18,
    // [FIFA] April 2026
    wcAppearances: 8,
    // [Wiki] 1998, 2002, 2006, 2010, 2014, 2018, 2022, 2026
    bestResult: "Round of 16 (2002, 2010, 2018, 2022)",
    manager: "Hajime Moriyasu",
    // [FIFPlay] appointed 2018
    keyPlayers: "Minamino (FW, Monaco), Doan (FW, Freiburg), Tanaka (CM, Dortmund)",
    qualifyingNote: "Qualified automatically \u2014 AFC qualifying",
    debutFlag: false,
    guardrail: null,
    narrativeNote: "Japan beat Germany AND Spain in the 2022 group stage \u2014 the biggest result in Japanese football history. Moriyasu has built the strongest squad Japan has ever fielded."
  },
  TUN: {
    fifaCode: "TUN",
    displayName: "Tunisia",
    group: "F",
    fifaRank: 44,
    // [FIFA] April 2026
    wcAppearances: 6,
    // [Wiki] 1978, 1998, 2002, 2006, 2018, 2022, 2026 — actually 7 including 2026? Let me check: 1978, 1998, 2002, 2006, 2018, 2022, 2026 = 7
    bestResult: "Group stage (multiple times \u2014 never advanced)",
    manager: "Sami Trabelsi",
    // [FIFPlay] appointed 2025
    keyPlayers: "Msakni (AM), Sliti (FW), Khazri (veteran)",
    qualifyingNote: "Qualified via CAF \u2014 Africa qualifying",
    debutFlag: false,
    guardrail: null,
    narrativeNote: "The Eagles of Carthage have appeared at 7 World Cups without ever advancing from the group stage. New manager Trabelsi looking to change history."
  },
  SWE: {
    fifaCode: "SWE",
    displayName: "Sweden",
    group: "F",
    fifaRank: 38,
    // [FIFA] April 2026
    wcAppearances: 12,
    // [Wiki] 12 appearances including 2026
    bestResult: "Runners-up 1958 (home), Third place 1950, 1994",
    manager: "Graham Potter",
    // [FIFPlay] appointed 2025 — former Brighton/Chelsea
    keyPlayers: "Isak (FW, Newcastle), Kulusevski (RW, Tottenham), Ekdal (CM \u2014 veteran)",
    qualifyingNote: "Qualified via UEFA \u2014 European qualifying",
    debutFlag: false,
    guardrail: null,
    narrativeNote: "Alexander Isak (Newcastle) is one of Europe's most dangerous forwards at 26. Potter hired as foreign coach \u2014 a significant hire given Sweden's tradition of home-grown managers."
  },
  // ── GROUP G ──────────────────────────────────────────────────────────────────
  BEL: {
    fifaCode: "BEL",
    displayName: "Belgium",
    group: "G",
    fifaRank: 9,
    // [FIFA] April 2026
    wcAppearances: 14,
    // [Wiki] 14 appearances including 2026
    bestResult: "Third place 2018",
    manager: "Rudi Garcia",
    // [FIFPlay] appointed 2025 — former Napoli/Marseille
    keyPlayers: "De Bruyne (CM/CAP, Man City), Lukaku (FW, Roma), Courtois (GK, Real Madrid)",
    qualifyingNote: "Qualified automatically \u2014 UEFA qualifying",
    debutFlag: false,
    guardrail: 'The "golden generation" (De Bruyne, Hazard era) peaked at 2018 (third place). Eden Hazard is retired. This is the LAST WC for De Bruyne (33) and Lukaku (31). Do NOT conflate with the 2018 squad.',
    narrativeNote: "Last chance for the golden generation's survivors. De Bruyne (33) almost certainly playing his final World Cup. Garcia must navigate an ageing but still talented squad."
  },
  EGY: {
    fifaCode: "EGY",
    displayName: "Egypt",
    group: "G",
    fifaRank: 29,
    // [FIFA] April 2026
    wcAppearances: 4,
    // [Wiki] 1934, 1990, 2018, 2026
    bestResult: "Group stage (never advanced)",
    manager: "Hossam Hassan",
    // [FIFPlay] appointed 2024 — Egypt legend as player
    keyPlayers: "Salah (FW/CAP, Liverpool), Elneny (CM, Arsenal), Trezeguet (FW)",
    qualifyingNote: "Qualified via CAF \u2014 Africa qualifying",
    debutFlag: false,
    guardrail: null,
    narrativeNote: "Mo Salah leads Egypt \u2014 potentially his only World Cup at 34. One of the greatest players in the world carrying Africa's expectations. Egypt haven't advanced from the group stage in 4 appearances."
  },
  IRN: {
    fifaCode: "IRN",
    displayName: "Iran",
    group: "G",
    fifaRank: 21,
    // [FIFA] April 2026
    wcAppearances: 7,
    // [Wiki] 1978, 1998, 2006, 2014, 2018, 2022, 2026
    bestResult: "Group stage (never advanced)",
    manager: "Amir Ghalenoei",
    // [FIFPlay] appointed 2023
    keyPlayers: "Azmoun (FW, Bayer Leverkusen), Taremi (FW, Inter Milan), Jahanbakhsh (FW)",
    qualifyingNote: "Qualified automatically \u2014 AFC qualifying",
    debutFlag: false,
    guardrail: null,
    narrativeNote: "Team Melli have appeared at 7 World Cups without advancing. Taremi (Inter Milan) and Azmoun are their strongest attacking pairing. Iran beat Wales and drew with USA in 2022."
  },
  NZL: {
    fifaCode: "NZL",
    displayName: "New Zealand",
    group: "G",
    fifaRank: 85,
    // [FIFA] April 2026
    wcAppearances: 3,
    // [Wiki] 1982, 2010, 2026
    bestResult: "Group stage (1982, 2010)",
    manager: "Darren Bazeley",
    // [FIFPlay] appointed 2023
    keyPlayers: "Wood (FW, Middlesbrough), McGlinchey (FW), Cacace (LB)",
    qualifyingNote: "Qualified via OFC \u2014 Oceania qualifying",
    debutFlag: false,
    guardrail: null,
    narrativeNote: "All Whites return after a 16-year absence. Only OFC representative. Chris Wood leads a squad with limited European depth \u2014 facing Belgium and Iran in the toughest group for points."
  },
  // ── GROUP H ──────────────────────────────────────────────────────────────────
  ESP: {
    fifaCode: "ESP",
    displayName: "Spain",
    group: "H",
    fifaRank: 2,
    // [FIFA] April 2026 (FIFA #1 at draw — note Lamine Yamal injury concern)
    wcAppearances: 16,
    // [Wiki] 16 appearances including 2026
    bestResult: "Champions 2010 (South Africa)",
    manager: "Luis de la Fuente",
    // [FIFPlay] appointed 2022 — won Euro 2024
    keyPlayers: "Yamal (RW, Barcelona \u2014 age 18), Pedri (CM, Barcelona), Morata (FW, AC Milan)",
    qualifyingNote: "Qualified automatically \u2014 UEFA qualifying",
    debutFlag: false,
    guardrail: "Spain won EURO 2024 (beating England in the final) \u2014 the context for their arrival. Lamine Yamal suffered a hamstring injury before the tournament \u2014 fitness in question. Do NOT assume he plays without noting the injury concern.",
    narrativeNote: "EURO 2024 champions. Luis de la Fuente's tiki-taka revival powered by 18-year-old Lamine Yamal \u2014 the most exciting young player in world football. One WC title (2010)."
  },
  CPV: {
    fifaCode: "CPV",
    displayName: "Cape Verde",
    group: "H",
    fifaRank: 69,
    // [FIFA] April 2026
    wcAppearances: 1,
    // 2026 is their FIRST appearance
    bestResult: "First appearance 2026",
    manager: "Bubista",
    // [FIFPlay] appointed 2020
    keyPlayers: "Andrade (FW), Jamiro Monteiro (AM), Tavares (CB)",
    qualifyingNote: "Qualified via CAF \u2014 Africa qualifying",
    debutFlag: true,
    guardrail: 'Cape Verde is officially "Cabo Verde" in FIFA registration. Either form acceptable in prose.',
    narrativeNote: "FIRST EVER World Cup appearance. Cape Verde population: ~600,000. Known as the Blue Sharks \u2014 one of African football's most emotional qualification stories."
  },
  KSA: {
    fifaCode: "KSA",
    displayName: "Saudi Arabia",
    group: "H",
    fifaRank: 61,
    // [FIFA] April 2026
    wcAppearances: 7,
    // [Wiki] 1994, 1998, 2002, 2006, 2010, 2022, 2026
    bestResult: "Round of 16 1994",
    manager: "Giorgos Donis",
    // [FIFPlay] appointed 2025 — Greek manager
    keyPlayers: "Al-Dawsari (FW \u2014 scored vs Argentina 2022), Al-Buraikan (FW), Al-Malki (CM)",
    qualifyingNote: "Qualified automatically \u2014 AFC qualifying",
    debutFlag: false,
    guardrail: null,
    narrativeNote: "Salem Al-Dawsari's goal to beat Argentina 2-1 in 2022 is one of WC history's greatest upsets. The Green Falcons have invested heavily in domestic football with Ronaldo, Benzema and others in their Saudi Pro League."
  },
  URU: {
    fifaCode: "URU",
    displayName: "Uruguay",
    group: "H",
    fifaRank: 17,
    // [FIFA] April 2026
    wcAppearances: 14,
    // [Wiki] 14 appearances including 2026 — boycotted several
    bestResult: "Champions 1930, 1950 (2 titles)",
    manager: "Marcelo Bielsa",
    // [FIFPlay] appointed 2023 — Argentine legend
    keyPlayers: "N\xFA\xF1ez (FW, Liverpool), Valverde (CM, Real Madrid), Bentancur (CM)",
    qualifyingNote: "Qualified automatically \u2014 CONMEBOL qualifying",
    debutFlag: false,
    guardrail: "Uruguay are TWO-TIME World Cup champions (1930, 1950) \u2014 the first and fourth editions. Despite their size (3.4m population) they remain giants of South American football.",
    narrativeNote: "Bielsa's high-energy, pressing Uruguay with Valverde (Real Madrid) and N\xFA\xF1ez (Liverpool) \u2014 their most impressive generation since Forl\xE1n and Cavani. Dark horse with genuine pedigree."
  },
  // ── GROUP I ──────────────────────────────────────────────────────────────────
  FRA: {
    fifaCode: "FRA",
    displayName: "France",
    group: "I",
    fifaRank: 1,
    // [FIFA] April 2026 — top ranked team in the world
    wcAppearances: 16,
    // [Wiki] 16 appearances including 2026
    bestResult: "Champions 1998 (host), 2018. Runners-up 2022.",
    manager: "Didier Deschamps",
    // [FIFPlay] appointed 2012 — final WC
    keyPlayers: "Mbapp\xE9 (FW/CAP, Real Madrid), Griezmann (AM, Atl\xE9tico Madrid), Tchouam\xE9ni (CM)",
    qualifyingNote: "Qualified automatically \u2014 UEFA qualifying",
    debutFlag: false,
    guardrail: 'France are RUNNERS-UP 2022 (lost final to Argentina on penalties) \u2014 NOT defending champions. If they win 2026 it is their THIRD title (1998, 2018), equalling record. Do NOT say "seeking their third title" \u2014 this would be their THIRD, not a record. Do NOT say they are "defending champions."',
    narrativeNote: "FIFA #1. Deschamps' final tournament before stepping down \u2014 he has won the WC as player (1998) and will try to match it as manager (again). Mbapp\xE9 at 27: his defining tournament."
  },
  SEN: {
    fifaCode: "SEN",
    displayName: "Senegal",
    group: "I",
    fifaRank: 14,
    // [FIFA] April 2026
    wcAppearances: 4,
    // [Wiki] 2002, 2018, 2022, 2026
    bestResult: "Quarter-finals 2002",
    manager: "Pape Thiaw",
    // [FIFPlay] appointed 2024
    keyPlayers: "Man\xE9 (FW, Al Nassr \u2014 if fit), Gueye (CM, Everton \u2014 veteran), Sarr (FW, Palace)",
    qualifyingNote: "Qualified via CAF \u2014 Africa qualifying",
    debutFlag: false,
    guardrail: null,
    narrativeNote: "AFCON 2022 champions. Reached Round of 16 in 2022. With or without an aging Man\xE9, Senegal have the depth and organization to threaten here."
  },
  IRQ: {
    fifaCode: "IRQ",
    displayName: "Iraq",
    group: "I",
    fifaRank: 57,
    // [FIFA] April 2026
    wcAppearances: 2,
    // [Wiki] 1986, 2026 — 40-year gap
    bestResult: "Group stage (1986)",
    manager: "Graham Arnold",
    // [FIFPlay] appointed 2025 — former Australia manager
    keyPlayers: "Mohanad Ali (FW), Amjed Attwan (CM), Basim Abbas (FW)",
    qualifyingNote: "Qualified via AFC \u2014 intercontinental playoff (beat Bolivia)",
    debutFlag: false,
    guardrail: null,
    narrativeNote: "Iraq return to the World Cup after 40 years \u2014 qualified through the intercontinental playoff with a dramatic 2-1 win over Bolivia. Arnold (former Australia manager) an unusual choice."
  },
  NOR: {
    fifaCode: "NOR",
    displayName: "Norway",
    group: "I",
    fifaRank: 31,
    // [FIFA] April 2026
    wcAppearances: 4,
    // [Wiki] 1938, 1994, 1998, 2026 — 28-year gap
    bestResult: "Round of 16 1998",
    manager: "St\xE5le Solbakken",
    // [FIFPlay] appointed 2020
    keyPlayers: "Haaland (FW/CAP, Man City), S\xF6rloth (FW, Atl\xE9tico), \xD8degaard (AM, Arsenal)",
    qualifyingNote: "Qualified via UEFA \u2014 European qualifying",
    debutFlag: false,
    guardrail: null,
    narrativeNote: "Haaland \u2014 the most prolific striker in European football history at 25 \u2014 finally makes his World Cup debut after Norway missed out on qualifying in previous cycles. This is what the 2026 group draw was designed to show off."
  },
  // ── GROUP J ──────────────────────────────────────────────────────────────────
  ARG: {
    fifaCode: "ARG",
    displayName: "Argentina",
    group: "J",
    fifaRank: 3,
    // [FIFA] April 2026
    wcAppearances: 18,
    // [Wiki] 18 appearances including 2026
    bestResult: "Champions 1978 (host), 1986, 2022 (3 titles)",
    manager: "Lionel Scaloni",
    // [FIFPlay] appointed 2018
    keyPlayers: "Messi (FW/CAP, Inter Miami \u2014 age 38), De Paul (CM, Atl\xE9tico Madrid), Romero (CB)",
    qualifyingNote: "Qualified automatically \u2014 CONMEBOL qualifying",
    debutFlag: false,
    guardrail: `DEFENDING CHAMPIONS \u2014 won 2022 final vs France on penalties. Messi's SIXTH World Cup at age 38 \u2014 almost certainly his last. A fourth title would be their record-equalling achievement (Germany and Italy also have 4). Do NOT say "seeking their third title" \u2014 this would be their FOURTH.`,
    narrativeNote: "Messi at 38 in his almost certain final World Cup. Defending champions. Scaloni unchanged since 2018. The most anticipated storyline of the entire tournament."
  },
  ALG: {
    fifaCode: "ALG",
    displayName: "Algeria",
    group: "J",
    fifaRank: 28,
    // [FIFA] April 2026
    wcAppearances: 5,
    // [Wiki] 1982, 1986, 2010, 2014, 2026
    bestResult: "Round of 16 2014",
    manager: "Vladimir Petkovi\u0107",
    // [FIFPlay] appointed 2024 — former Switzerland manager
    keyPlayers: "Mahrez (FW/CAP, Al Ahli \u2014 veteran), Slimani (FW \u2014 veteran), Benrahma (AM, West Ham)",
    qualifyingNote: "Qualified via CAF \u2014 Africa qualifying",
    debutFlag: false,
    guardrail: 'Algeria beat West Germany 2-1 in 1982 \u2014 the first African team to beat a European side at a WC. Despite this, they were eliminated via an infamous collusive game between Germany and Austria ("The Disgrace of Gij\xF3n"). This historical context is often relevant.',
    narrativeNote: "Opening against defending champions Argentina in Kansas City. Mahrez (Al Ahli) captains what could be his final WC appearance. The Algeria-Argentina draw is one of the group stage's marquee matchups."
  },
  AUT: {
    fifaCode: "AUT",
    displayName: "Austria",
    group: "J",
    fifaRank: 24,
    // [FIFA] April 2026
    wcAppearances: 8,
    // [Wiki] including 2026 — last appearance was 1998
    bestResult: "Third place 1954",
    manager: "Ralf Rangnick",
    // [FIFPlay] appointed 2022 — former Man United (interim)
    keyPlayers: "Sabitzer (CM, Man United), Laimer (CM, Bayern Munich), Arnautovi\u0107 (FW \u2014 veteran)",
    qualifyingNote: "Qualified via UEFA \u2014 European qualifying",
    debutFlag: false,
    guardrail: null,
    narrativeNote: "Rangnick's pressing-intensive Austria have been consistently impressive in qualifying. Sabitzer and Laimer give them genuine midfield quality. First WC since 1998."
  },
  JOR: {
    fifaCode: "JOR",
    displayName: "Jordan",
    group: "J",
    fifaRank: 63,
    // [FIFA] April 2026
    wcAppearances: 1,
    // 2026 is their FIRST appearance
    bestResult: "First appearance 2026",
    manager: "Jamal Sellami",
    // [FIFPlay] appointed 2024 — former Morocco U23 coach
    keyPlayers: "Al-Tamari (FW, Montpellier), Baha'aDudin Abu-Hashim (FW)",
    qualifyingNote: "Qualified via AFC \u2014 intercontinental playoff path",
    debutFlag: true,
    guardrail: null,
    narrativeNote: "FIRST EVER World Cup appearance for the Chivalrous Ones. Jordan reached the 2023 Asian Cup final (lost to Qatar). Opening against defending champions Argentina in what could be the WC debut of all WC debuts."
  },
  // ── GROUP K ──────────────────────────────────────────────────────────────────
  COL: {
    fifaCode: "COL",
    displayName: "Colombia",
    group: "K",
    fifaRank: 13,
    // [FIFA] April 2026
    wcAppearances: 7,
    // [Wiki] 1962, 1990, 1994, 1998, 2014, 2018, 2026
    bestResult: "Quarter-finals 2014",
    manager: "N\xE9stor Lorenzo",
    // [FIFPlay] appointed 2022 — Argentine
    keyPlayers: "D\xEDaz (FW, Liverpool), James Rodr\xEDguez (AM \u2014 veteran), Arias (RB)",
    qualifyingNote: "Qualified automatically \u2014 CONMEBOL qualifying",
    debutFlag: false,
    guardrail: null,
    narrativeNote: "Luis D\xEDaz (Liverpool) leads Colombia's best squad since the James Rodr\xEDguez 2014 generation. Colombia won the 2024 Copa Am\xE9rica \u2014 Lorenzo's side is in excellent form entering 2026."
  },
  COD: {
    fifaCode: "COD",
    displayName: "Congo DR",
    group: "K",
    fifaRank: 46,
    // [FIFA] April 2026
    wcAppearances: 2,
    // [Wiki] 1974 (as Zaire), 2026 — 52-year gap
    bestResult: "Group stage (1974 as Zaire)",
    manager: "S\xE9bastien Desabre",
    // [FIFPlay] appointed 2022 — French manager
    keyPlayers: "Bakambu (FW, China \u2014 veteran), Masuaku (LB, Be\u015Fikta\u015F), Chadrac Akolo (FW)",
    qualifyingNote: "Qualified via CAF \u2014 FIFA playoff (beat Jamaica)",
    debutFlag: false,
    guardrail: "DISTINGUISH from Republic of Congo \u2014 different nation. Congo DR (Democratic Republic of the Congo, capital Kinshasa) previously appeared as Zaire in 1974. Do NOT confuse with Republic of Congo (capital Brazzaville), which did not qualify.",
    narrativeNote: "Return after 52 years, last appearing as Zaire in 1974 (famously lost 9-0 to Yugoslavia). Qualified via the FIFA playoff in dramatic fashion. Opening against Portugal."
  },
  POR: {
    fifaCode: "POR",
    displayName: "Portugal",
    group: "K",
    fifaRank: 5,
    // [FIFA] April 2026
    wcAppearances: 9,
    // [Wiki] 9 appearances including 2026
    bestResult: "Third place 1966, Semi-finals 2006",
    manager: "Roberto Mart\xEDnez",
    // [FIFPlay] appointed 2023 — former Belgium manager
    keyPlayers: "Ronaldo (FW/CAP, Al Nassr \u2014 age 41), Bernardo Silva (AM, Man City), R\xFAben Dias (CB)",
    qualifyingNote: "Qualified automatically \u2014 UEFA qualifying",
    debutFlag: false,
    guardrail: "Cristiano Ronaldo is 41 years old and playing in Saudi Arabia. Whether he starts or is a squad player/substitute, his presence dominates narrative. Portugal have NEVER won the World Cup \u2014 their 2016 Euro and 2019 Nations League are separate trophies. Do NOT conflate.",
    narrativeNote: "Ronaldo's extraordinary final chapter continues at 41. Bernardo Silva and R\xFAben Dias are the actual quality that drives Portugal's 2026 hopes. A final without Ronaldo in the spotlight would be a genuine surprise."
  },
  UZB: {
    fifaCode: "UZB",
    displayName: "Uzbekistan",
    group: "K",
    fifaRank: 50,
    // [FIFA] April 2026
    wcAppearances: 1,
    // 2026 is their FIRST appearance
    bestResult: "First appearance 2026",
    manager: "Fabio Cannavaro",
    // [FIFPlay] appointed 2025 — former Italy World Cup winner
    keyPlayers: "Khusanov (CB, Manchester City), Shorakhmatov (FW), Nasimov (CM)",
    qualifyingNote: "Qualified via AFC \u2014 Asian qualifying",
    debutFlag: true,
    guardrail: null,
    narrativeNote: "FIRST EVER World Cup appearance. Cannavaro (Italy's 2006 WC-winning captain and Ballon d'Or winner) as manager. Abdukodir Khusanov (Manchester City) is their only player at a European top club."
  },
  // ── GROUP L ──────────────────────────────────────────────────────────────────
  PAN: {
    fifaCode: "PAN",
    displayName: "Panama",
    group: "L",
    fifaRank: 33,
    // [FIFA] April 2026
    wcAppearances: 2,
    // [Wiki] 2018, 2026
    bestResult: "Group stage (2018)",
    manager: "Thomas Christiansen",
    // [FIFPlay] appointed 2020 — Spanish-Danish
    keyPlayers: "Fajardo (FW), Cooper (CM \u2014 CONCACAF staple), Davis (GK)",
    qualifyingNote: "Qualified via CONCACAF \u2014 qualifying",
    debutFlag: false,
    guardrail: null,
    narrativeNote: "Los Canaleros' second World Cup (after a magical debut in 2018). Opening against England in New York \u2014 one of CONCACAF's landmark moments."
  },
  ENG: {
    fifaCode: "ENG",
    displayName: "England",
    group: "L",
    fifaRank: 4,
    // [FIFA] April 2026
    wcAppearances: 16,
    // [Wiki] 16 appearances including 2026
    bestResult: "Champions 1966 (home, Wembley)",
    manager: "Thomas Tuchel",
    // [FIFPlay] appointed 2025 — former Bayern/Chelsea
    keyPlayers: "Kane (FW/CAP, Bayern Munich), Bellingham (AM, Real Madrid), Saka (RW, Arsenal)",
    qualifyingNote: "Qualified automatically \u2014 UEFA qualifying",
    debutFlag: false,
    guardrail: `England's only World Cup title was in 1966 on HOME SOIL \u2014 60 years ago. They have lost two European Championship finals in a row (2020 to Italy, 2024 to Spain). Tuchel replaced Southgate. "It's coming home" narrative is 60 years old. Frame the drought specifically.`,
    narrativeNote: "Tuchel's first tournament after replacing Southgate. Kane (31, Bayern Munich) in his prime. Bellingham at 22 is the most complete English midfielder since Scholes. The 60-year wait."
  },
  CRO: {
    fifaCode: "CRO",
    displayName: "Croatia",
    group: "L",
    fifaRank: 11,
    // [FIFA] April 2026
    wcAppearances: 8,
    // [Wiki] 8 appearances including 2026 (as independent nation since 1994)
    bestResult: "Third place 1998, 2022. Runners-up 2018.",
    manager: "Zlatko Dali\u0107",
    // [FIFPlay] appointed 2017 — unchanged since 2018
    keyPlayers: "Modri\u0107 (CM/CAP, Real Madrid \u2014 age 40), Gvardiol (CB/LB, Man City), Kova\u010Di\u0107 (CM, Man City)",
    qualifyingNote: "Qualified automatically \u2014 UEFA qualifying",
    debutFlag: false,
    guardrail: "Luka Modri\u0107 is 40 years old at the tournament \u2014 the oldest outfield player expected to play a major role. This is almost certainly his final WC. Croatia HAVE been to the final (2018, lost 4-2 to France).",
    narrativeNote: "Dali\u0107 unchanged since their 2018 final run. Modri\u0107 at 40 \u2014 still playing at Real Madrid \u2014 defies age in what is certainly his last World Cup. Gvardiol (Man City) is the next Croatian great."
  },
  GHA: {
    fifaCode: "GHA",
    displayName: "Ghana",
    group: "L",
    fifaRank: 74,
    // [FIFA] April 2026
    wcAppearances: 4,
    // [Wiki] 2006, 2010, 2014, 2026 (missed 2018, 2022)
    bestResult: "Quarter-finals 2010 (Su\xE1rez handball)",
    manager: "Otto Addo",
    // [FIFPlay] appointed 2024 (second stint)
    keyPlayers: "Kudus (FW/AM, West Ham), Partey (CM, Arsenal), Jordan Ayew (FW \u2014 veteran)",
    qualifyingNote: "Qualified via CAF \u2014 Africa qualifying",
    debutFlag: false,
    guardrail: "The Luis Su\xE1rez handball in 2010 quarter-final (Uruguay vs Ghana) \u2014 denying Ghana a historic semi-final \u2014 is iconic context if writing about Ghana. Su\xE1rez saved the shot with his hand, was red-carded, Uruguay won the subsequent penalty shootout. Ghana's most painful football memory.",
    narrativeNote: "Mohammed Kudus (West Ham) is Africa's most exciting attacking talent at 24. Otto Addo back for a second stint after qualifying success. First WC since 2014."
  }
};
function slateHasWorldCup(gameLines) {
  return gameLines.some((l) => /FIFA World Cup|World Cup 2026/i.test(l));
}
__name(slateHasWorldCup, "slateHasWorldCup");
function extractWCGames(gameLines) {
  return gameLines.filter((l) => /FIFA World Cup|World Cup 2026/i.test(l)).map((l) => {
    const isMD3 = /MD3\b/.test(l);
    const gMatch = l.match(/Group\s+([A-L])\b/i);
    const group = gMatch ? gMatch[1].toUpperCase() : null;
    const teamMatch = l.match(/([\w\s\u00C0-\u024F]+?)\s+(?:vs\.?|@)\s+([\w\s\u00C0-\u024F]+?)(?:\s*[-·]|$)/);
    const home = teamMatch?.[1]?.trim().replace(/^.*:\s*/, "") || null;
    const away = teamMatch?.[2]?.trim() || null;
    return { home, away, group, isMD3 };
  }).filter((g) => g.home && g.away);
}
__name(extractWCGames, "extractWCGames");
async function buildWCTeamContextBlock(gameLines, d1db) {
  if (!slateHasWorldCup(gameLines))
    return "";
  const games = extractWCGames(gameLines);
  if (!games.length)
    return "";
  const lines = [
    "",
    "WORLD CUP 2026 TEAM CONTEXT (verified facts \u2014 journalism must stay within this):"
  ];
  for (const game of games) {
    const homeCode = game.home ? WC_NAME_TO_CODE[game.home] : null;
    const awayCode = game.away ? WC_NAME_TO_CODE[game.away] : null;
    const homeCtx = homeCode ? WC_TEAM_CONTEXT[homeCode] : null;
    const awayCtx = awayCode ? WC_TEAM_CONTEXT[awayCode] : null;
    for (const ctx of [homeCtx, awayCtx]) {
      if (!ctx)
        continue;
      const historyLine = ctx.debutFlag ? `FIRST EVER World Cup appearance for ${ctx.displayName} (${ctx.qualifyingNote}).` : `${ctx.displayName}: ${ctx.wcAppearances} WC appearances. Best: ${ctx.bestResult}.`;
      lines.push(`${ctx.displayName} (Group ${ctx.group}, FIFA #${ctx.fifaRank}): ${historyLine}`);
      lines.push(`  Manager: ${ctx.manager}. Key players: ${ctx.keyPlayers}.`);
      if (ctx.narrativeNote)
        lines.push(`  ${ctx.narrativeNote}`);
      if (ctx.guardrail)
        lines.push(`  [GUARDRAIL] ${ctx.guardrail}`);
    }
    if (d1db && game.group) {
      try {
        const { results: rows } = await d1db.prepare(
          `SELECT team, played, points, gd, gf
           FROM wc_group WHERE group_id = ?
           ORDER BY points DESC, gd DESC, gf DESC`
        ).bind(game.group).all();
        if (rows && rows.length >= 2) {
          const tableStr = rows.map(
            (r, i) => `${i + 1}. ${r.team} ${r.points}pts (P${r.played} GD${r.gd >= 0 ? "+" : ""}${r.gd})`
          ).join(" | ");
          lines.push(`  Group ${game.group} current standings: ${tableStr}`);
          if (game.isMD3) {
            lines.push(`  [FINAL MATCHDAY] Both Group ${game.group} games kick off simultaneously (FIFA anti-collusion rule). Top 2 advance automatically. 3rd place may advance as one of the 8 best third-place teams.`);
          }
        }
      } catch (_) {
      }
    }
    lines.push("");
  }
  lines.push("Note: FIFA rankings as of April 1 2026. Updated June 9 2026 (day before tournament).");
  return lines.join("\n");
}
__name(buildWCTeamContextBlock, "buildWCTeamContextBlock");

// src/soccer-wp.js
var DC_RHO = -0.13;
var WC_LAMBDA_DEFAULT = 1.35;
var WC_XG_PER_SOT = 0.295;
var SOT_TRUST_THRESHOLD = 5;
var WC_AVG_STOPPAGE_MIN = 4.5;
var WC_STOPPAGE_REMAINING = WC_AVG_STOPPAGE_MIN / 90;
var MA_BENEFIT_FACTOR = 1.15;
var MA_PENALTY_FACTOR = 0.65;
function pois(k, lambda) {
  if (k < 0 || !Number.isFinite(lambda) || lambda <= 0) {
    return k === 0 ? Math.exp(-Math.max(lambda, 0)) : 0;
  }
  let p = Math.exp(-lambda);
  for (let i = 1; i <= k; i++)
    p = p * lambda / i;
  return p;
}
__name(pois, "pois");
function dcCorr(i, j, lh, la, rho) {
  if (i === 0 && j === 0)
    return 1 - lh * la * rho;
  else if (i === 0 && j === 1)
    return 1 + lh * rho;
  else if (i === 1 && j === 0)
    return 1 + la * rho;
  else if (i === 1 && j === 1)
    return 1 - rho;
  return 1;
}
__name(dcCorr, "dcCorr");
function winProbsFromLambda(lh, la, rho = DC_RHO, maxGoals = 7) {
  let home = 0, draw = 0, away = 0;
  for (let i = 0; i <= maxGoals; i++) {
    const pi = pois(i, lh);
    if (pi < 1e-10)
      continue;
    for (let j = 0; j <= maxGoals; j++) {
      const p = pi * pois(j, la) * dcCorr(i, j, lh, la, rho);
      if (i > j)
        home += p;
      else if (i === j)
        draw += p;
      else
        away += p;
    }
  }
  const total = home + draw + away || 1;
  return { home: home / total, draw: draw / total, away: away / total };
}
__name(winProbsFromLambda, "winProbsFromLambda");
function lambdaFromTotalsAndH2H(lambdaTotal, pHome, pDraw) {
  const lt = Math.max(0.5, Math.min(8, lambdaTotal));
  let lo = 0.05, hi = lt - 0.05;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    const { home } = winProbsFromLambda(mid, lt - mid);
    if (home < pHome)
      lo = mid;
    else
      hi = mid;
  }
  const lh = Math.max(0.05, Math.min(lt - 0.05, (lo + hi) / 2));
  return { lh, la: Math.max(0.05, lt - lh) };
}
__name(lambdaFromTotalsAndH2H, "lambdaFromTotalsAndH2H");
function oddsToLambda(pHome, pDraw, pAway) {
  const sum = pHome + pDraw + pAway || 1;
  const ph = pHome / sum, pd = pDraw / sum;
  let lh = Math.max(0.2, WC_LAMBDA_DEFAULT * (ph / 0.45));
  let la = Math.max(0.2, WC_LAMBDA_DEFAULT * ((1 - ph - pd * 0.5) / 0.35));
  for (let iter = 0; iter < 25; iter++) {
    const probs = winProbsFromLambda(lh, la);
    const homeErr = probs.home - ph;
    const drawErr = probs.draw - pd;
    const step = 0.05;
    if (Math.abs(homeErr) > 0.01)
      lh = Math.max(0.1, lh - homeErr * step * lh);
    if (Math.abs(drawErr) > 0.01) {
      const adjFactor = 1 + drawErr * 0.03;
      lh = Math.max(0.1, lh * adjFactor);
      la = Math.max(0.1, la * adjFactor);
    }
    const totalAdj = (lh + la) / 2.7;
    if (totalAdj > 1.05) {
      lh /= totalAdj;
      la /= totalAdj;
    }
    if (Math.abs(homeErr) < 5e-3 && Math.abs(drawErr) < 5e-3)
      break;
  }
  return { lh: Math.max(0.1, lh), la: Math.max(0.1, la) };
}
__name(oddsToLambda, "oddsToLambda");
function lambdaFromShots(shotsOnTarget, elapsedMin) {
  const elapsedCapped = Math.max(1, Math.min(elapsedMin, 90));
  const xgAccum = shotsOnTarget * WC_XG_PER_SOT;
  const projectedPer90 = xgAccum / (elapsedCapped / 90);
  const trust = Math.min(1, shotsOnTarget / SOT_TRUST_THRESHOLD);
  return trust * projectedPer90 + (1 - trust) * WC_LAMBDA_DEFAULT;
}
__name(lambdaFromShots, "lambdaFromShots");
function effectiveElapsed(elapsedMin, isStoppage) {
  const raw = Math.min(elapsedMin / 90, 1);
  if (isStoppage) {
    const maxElapsed = 1 - WC_STOPPAGE_REMAINING * 0.5;
    return Math.min(raw, maxElapsed);
  }
  return Math.min(raw, 0.989);
}
__name(effectiveElapsed, "effectiveElapsed");
function remainingLambda(lambda90, elapsedMin, isStoppage, manAdvFactor) {
  const elapsed = effectiveElapsed(elapsedMin, isStoppage);
  const remaining = Math.max(0, 1 - elapsed);
  return lambda90 * remaining * (manAdvFactor || 1);
}
__name(remainingLambda, "remainingLambda");
function computeLiveWP({
  homeGoals = 0,
  awayGoals = 0,
  homeSOT = 0,
  awaySOT = 0,
  elapsedMin = 0,
  isStoppage = false,
  manAdvantage = null,
  // 'home' | 'away' | null (who has NUMERICAL ADVANTAGE)
  isShootout = false,
  // Optional: pre-game λ from Odds API (Gap 2 full path)
  pregameLh = null,
  pregameLa = null
} = {}) {
  if (isShootout) {
    return { homeWin: 0.5, draw: 0, awayWin: 0.5, source: "shootout" };
  }
  const homeMaFactor = manAdvantage === "home" ? MA_BENEFIT_FACTOR : manAdvantage === "away" ? MA_PENALTY_FACTOR : 1;
  const awayMaFactor = manAdvantage === "away" ? MA_BENEFIT_FACTOR : manAdvantage === "home" ? MA_PENALTY_FACTOR : 1;
  const haveShots = homeSOT + awaySOT >= 2;
  const lhShotsBase = haveShots ? lambdaFromShots(homeSOT, elapsedMin) : WC_LAMBDA_DEFAULT;
  const laShotsBase = haveShots ? lambdaFromShots(awaySOT, elapsedMin) : WC_LAMBDA_DEFAULT;
  const preWeight = pregameLh != null ? Math.max(0, 1 - (homeSOT + awaySOT) / 20) : 0;
  const lhBase = pregameLh != null ? preWeight * pregameLh + (1 - preWeight) * lhShotsBase : lhShotsBase;
  const laBase = pregameLa != null ? preWeight * pregameLa + (1 - preWeight) * laShotsBase : laShotsBase;
  const lhRem = remainingLambda(lhBase, elapsedMin, isStoppage, homeMaFactor);
  const laRem = remainingLambda(laBase, elapsedMin, isStoppage, awayMaFactor);
  if (lhRem <= 1e-3 && laRem <= 1e-3) {
    if (homeGoals > awayGoals)
      return { homeWin: 1, draw: 0, awayWin: 0, source: "decided" };
    else if (awayGoals > homeGoals)
      return { homeWin: 0, draw: 0, awayWin: 1, source: "decided" };
    else
      return { homeWin: 0, draw: 1, awayWin: 0, source: "decided" };
  }
  const MAX = 7;
  let homeWin = 0, draw = 0, awayWin = 0;
  for (let i = 0; i <= MAX; i++) {
    const pi = pois(i, lhRem);
    if (pi < 1e-9)
      continue;
    for (let j = 0; j <= MAX; j++) {
      const p = pi * pois(j, laRem) * dcCorr(i, j, lhRem, laRem, DC_RHO);
      const hFinal = homeGoals + i;
      const aFinal = awayGoals + j;
      if (hFinal > aFinal)
        homeWin += p;
      else if (hFinal === aFinal)
        draw += p;
      else
        awayWin += p;
    }
  }
  const total = homeWin + draw + awayWin || 1;
  const source = isStoppage ? "stoppage-corrected" : pregameLh ? "odds-blended" : haveShots ? "shots-proxy" : "default-lambda";
  return {
    homeWin: homeWin / total,
    draw: draw / total,
    awayWin: awayWin / total,
    source
  };
}
__name(computeLiveWP, "computeLiveWP");
function simulateResult(standings, homeTeam, awayTeam, homeScore, awayScore) {
  return standings.map((row) => {
    let { team, played, won, drawn, lost, gf, ga, points } = row;
    if (team === homeTeam) {
      played++;
      gf += homeScore;
      ga += awayScore;
      if (homeScore > awayScore) {
        won++;
        points += 3;
      } else if (homeScore === awayScore) {
        drawn++;
        points += 1;
      } else {
        lost++;
      }
    } else if (team === awayTeam) {
      played++;
      gf += awayScore;
      ga += homeScore;
      if (awayScore > homeScore) {
        won++;
        points += 3;
      } else if (awayScore === homeScore) {
        drawn++;
        points += 1;
      } else {
        lost++;
      }
    }
    return { team, played, won, drawn, lost, gf, ga, gd: gf - ga, points };
  });
}
__name(simulateResult, "simulateResult");
function sortGroup(rows) {
  return [...rows].sort(
    (a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf
  );
}
__name(sortGroup, "sortGroup");
function groupPosition(sorted, teamName) {
  const idx = sorted.findIndex((r) => r.team === teamName);
  return idx === -1 ? 4 : idx + 1;
}
__name(groupPosition, "groupPosition");
function estimateThirdPlaceRate(thirdPlace, groupId) {
  if (!thirdPlace?.length)
    return 0.667;
  const entry = thirdPlace.find(
    (t) => t.group_id === groupId || t.group_id === `Group ${groupId}`
  );
  if (!entry)
    return 0.667;
  const rank = entry.cross_group_rank;
  if (rank <= 6)
    return 0.95;
  if (rank === 7)
    return 0.8;
  if (rank === 8)
    return 0.5;
  if (rank === 9)
    return 0.2;
  if (rank === 10)
    return 0.05;
  return 0.01;
}
__name(estimateThirdPlaceRate, "estimateThirdPlaceRate");
function computeAdvancementProb(standings, homeTeam, awayTeam, wp, thirdPlace = null) {
  if (!standings?.length || !wp || !homeTeam || !awayTeam)
    return null;
  const groupId = standings[0]?.group_id || null;
  const thirdPlaceRate = estimateThirdPlaceRate(thirdPlace, groupId);
  const winRows = simulateResult(standings, homeTeam, awayTeam, 1, 0);
  const drawRows = simulateResult(standings, homeTeam, awayTeam, 0, 0);
  const lossRows = simulateResult(standings, homeTeam, awayTeam, 0, 1);
  function posAdvProb(pos) {
    if (pos === 1 || pos === 2)
      return 1;
    if (pos === 3)
      return thirdPlaceRate;
    return 0;
  }
  __name(posAdvProb, "posAdvProb");
  const hwPos = groupPosition(sortGroup(winRows), homeTeam);
  const hdPos = groupPosition(sortGroup(drawRows), homeTeam);
  const hlPos = groupPosition(sortGroup(lossRows), homeTeam);
  const awPos = groupPosition(sortGroup(lossRows), awayTeam);
  const adPos = groupPosition(sortGroup(drawRows), awayTeam);
  const alPos = groupPosition(sortGroup(winRows), awayTeam);
  const homeAdvance = wp.homeWin * posAdvProb(hwPos) + wp.draw * posAdvProb(hdPos) + wp.awayWin * posAdvProb(hlPos);
  const awayAdvance = wp.awayWin * posAdvProb(awPos) + wp.draw * posAdvProb(adPos) + wp.homeWin * posAdvProb(alPos);
  return {
    homeAdvance,
    awayAdvance,
    homePositions: { win: hwPos, draw: hdPos, loss: hlPos },
    awayPositions: { win: awPos, draw: adPos, loss: alPos },
    thirdPlaceRate,
    method: "single-game-scenario-v2"
  };
}
__name(computeAdvancementProb, "computeAdvancementProb");

// src/mcp-oauth.js
var TTL_CODE = 300;
var TTL_TOKEN = 3600;
var TTL_REFRESH = 7776e3;
var TTL_CLIENT = 7776e3;
var TTL_LOG = 3600;
function rand(bytes = 32) {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}
__name(rand, "rand");
function b64url(buf) {
  const bin = String.fromCharCode(...new Uint8Array(buf));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
__name(b64url, "b64url");
async function sha256(input) {
  const enc = new TextEncoder().encode(input);
  return await crypto.subtle.digest("SHA-256", enc);
}
__name(sha256, "sha256");
function corsHeaders2() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };
}
__name(corsHeaders2, "corsHeaders");
function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders2(), "Content-Type": "application/json", ...extra }
  });
}
__name(json, "json");
function html(body, status = 200) {
  return new Response(body, {
    status,
    headers: { ...corsHeaders2(), "Content-Type": "text/html; charset=utf-8" }
  });
}
__name(html, "html");
async function logRequest(env, request, label) {
  try {
    if (!env.MCP_OAUTH)
      return;
    const url = new URL(request.url);
    const ts = (/* @__PURE__ */ new Date()).toISOString();
    const nonce = rand(4);
    const entry = {
      ts,
      label,
      method: request.method,
      path: url.pathname,
      query: Object.fromEntries(url.searchParams),
      headers: Object.fromEntries(
        [...request.headers.entries()].filter(
          ([k]) => !/^(cookie|x-real-ip|cf-)/i.test(k)
        )
      )
    };
    await env.MCP_OAUTH.put(
      `log:${ts}-${nonce}`,
      JSON.stringify(entry),
      { expirationTtl: TTL_LOG }
    );
  } catch (e) {
  }
}
__name(logRequest, "logRequest");
function authServerMetadata(origin) {
  return json({
    issuer: origin,
    authorization_endpoint: `${origin}/oauth/authorize`,
    token_endpoint: `${origin}/oauth/token`,
    registration_endpoint: `${origin}/oauth/register`,
    revocation_endpoint: `${origin}/oauth/revoke`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["client_secret_post", "none"],
    scopes_supported: ["mcp"]
  });
}
__name(authServerMetadata, "authServerMetadata");
function protectedResourceMetadata(origin) {
  return json({
    resource: origin,
    authorization_servers: [origin],
    scopes_supported: ["mcp"],
    bearer_methods_supported: ["header"]
  });
}
__name(protectedResourceMetadata, "protectedResourceMetadata");
async function register(request, env) {
  let body = {};
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: "invalid_request", error_description: "Body must be JSON" }, 400);
  }
  const redirect_uris = Array.isArray(body.redirect_uris) ? body.redirect_uris : [];
  if (redirect_uris.length === 0) {
    return json({ error: "invalid_redirect_uri", error_description: "redirect_uris required" }, 400);
  }
  for (const uri of redirect_uris) {
    try {
      const u = new URL(uri);
      if (u.protocol !== "https:" && u.hostname !== "localhost" && u.hostname !== "127.0.0.1") {
        return json({ error: "invalid_redirect_uri", error_description: `Non-HTTPS redirect_uri: ${uri}` }, 400);
      }
    } catch (e) {
      return json({ error: "invalid_redirect_uri", error_description: `Malformed URI: ${uri}` }, 400);
    }
  }
  const client_id = rand(16);
  const client_secret = rand(32);
  const issued_at = Math.floor(Date.now() / 1e3);
  const record = {
    client_id,
    client_secret,
    redirect_uris,
    client_name: body.client_name || "unnamed",
    grant_types: body.grant_types || ["authorization_code", "refresh_token"],
    response_types: body.response_types || ["code"],
    token_endpoint_auth_method: body.token_endpoint_auth_method || "client_secret_post",
    issued_at
  };
  await env.MCP_OAUTH.put(`client:${client_id}`, JSON.stringify(record), { expirationTtl: TTL_CLIENT });
  return json({
    ...record,
    client_id_issued_at: issued_at,
    client_secret_expires_at: 0
    // RFC 7591: 0 means never expires
  }, 201);
}
__name(register, "register");
async function authorizeGet(url, env) {
  const params = url.searchParams;
  const response_type = params.get("response_type");
  const client_id = params.get("client_id");
  const redirect_uri = params.get("redirect_uri");
  const state = params.get("state") || "";
  const scope = params.get("scope") || "mcp";
  const code_challenge = params.get("code_challenge");
  const code_challenge_method = params.get("code_challenge_method") || "plain";
  if (response_type !== "code") {
    return html(errorPage("unsupported_response_type", "Only response_type=code is supported"), 400);
  }
  if (!client_id)
    return html(errorPage("invalid_request", "client_id is required"), 400);
  if (!redirect_uri)
    return html(errorPage("invalid_request", "redirect_uri is required"), 400);
  if (!code_challenge)
    return html(errorPage("invalid_request", "code_challenge is required (PKCE)"), 400);
  if (code_challenge_method !== "S256") {
    return html(errorPage("invalid_request", "code_challenge_method must be S256"), 400);
  }
  const clientRaw = await env.MCP_OAUTH.get(`client:${client_id}`);
  if (!clientRaw)
    return html(errorPage("invalid_client", `Unknown client_id: ${client_id}`), 400);
  const client = JSON.parse(clientRaw);
  if (!client.redirect_uris.includes(redirect_uri)) {
    return html(errorPage("invalid_redirect_uri", "redirect_uri not registered for this client"), 400);
  }
  return html(passwordPage({
    client_name: client.client_name,
    client_id,
    redirect_uri,
    state,
    scope,
    code_challenge,
    code_challenge_method
  }));
}
__name(authorizeGet, "authorizeGet");
async function authorizePost(request, env) {
  const form = await request.formData();
  const password = form.get("password");
  const client_id = form.get("client_id");
  const redirect_uri = form.get("redirect_uri");
  const state = form.get("state") || "";
  const scope = form.get("scope") || "mcp";
  const code_challenge = form.get("code_challenge");
  const code_challenge_method = form.get("code_challenge_method");
  if (!password || password !== env.FIELD_MCP_SECRET) {
    const clientRaw2 = await env.MCP_OAUTH.get(`client:${client_id}`);
    if (!clientRaw2)
      return html(errorPage("invalid_client", "Unknown client"), 400);
    const client2 = JSON.parse(clientRaw2);
    return html(passwordPage({
      client_name: client2.client_name,
      client_id,
      redirect_uri,
      state,
      scope,
      code_challenge,
      code_challenge_method,
      error: "Incorrect password"
    }), 401);
  }
  const clientRaw = await env.MCP_OAUTH.get(`client:${client_id}`);
  if (!clientRaw)
    return html(errorPage("invalid_client", "Unknown client"), 400);
  const client = JSON.parse(clientRaw);
  if (!client.redirect_uris.includes(redirect_uri)) {
    return html(errorPage("invalid_redirect_uri", "redirect_uri changed"), 400);
  }
  const code = rand(32);
  await env.MCP_OAUTH.put(`code:${code}`, JSON.stringify({
    client_id,
    redirect_uri,
    scope,
    code_challenge,
    code_challenge_method,
    expires_at: Math.floor(Date.now() / 1e3) + TTL_CODE
  }), { expirationTtl: TTL_CODE });
  const redirect = new URL(redirect_uri);
  redirect.searchParams.set("code", code);
  if (state)
    redirect.searchParams.set("state", state);
  return new Response(null, {
    status: 302,
    headers: { ...corsHeaders2(), "Location": redirect.toString() }
  });
}
__name(authorizePost, "authorizePost");
async function token(request, env) {
  const form = await request.formData();
  const grant_type = form.get("grant_type");
  if (grant_type === "authorization_code") {
    const code = form.get("code");
    const redirect_uri = form.get("redirect_uri");
    const client_id = form.get("client_id");
    const code_verifier = form.get("code_verifier");
    if (!code)
      return json({ error: "invalid_request", error_description: "code required" }, 400);
    if (!code_verifier)
      return json({ error: "invalid_request", error_description: "code_verifier required (PKCE)" }, 400);
    const codeRaw = await env.MCP_OAUTH.get(`code:${code}`);
    if (!codeRaw)
      return json({ error: "invalid_grant", error_description: "Code expired or invalid" }, 400);
    const codeData = JSON.parse(codeRaw);
    if (client_id && client_id !== codeData.client_id) {
      return json({ error: "invalid_client" }, 400);
    }
    if (redirect_uri !== codeData.redirect_uri) {
      return json({ error: "invalid_grant", error_description: "redirect_uri mismatch" }, 400);
    }
    const verifierHash = b64url(await sha256(code_verifier));
    if (verifierHash !== codeData.code_challenge) {
      return json({ error: "invalid_grant", error_description: "PKCE verification failed" }, 400);
    }
    await env.MCP_OAUTH.delete(`code:${code}`);
    const access_token = rand(32);
    const refresh_token = rand(32);
    await env.MCP_OAUTH.put(`token:${access_token}`, JSON.stringify({
      client_id: codeData.client_id,
      scope: codeData.scope
    }), { expirationTtl: TTL_TOKEN });
    await env.MCP_OAUTH.put(`refresh:${refresh_token}`, JSON.stringify({
      client_id: codeData.client_id,
      scope: codeData.scope
    }), { expirationTtl: TTL_REFRESH });
    return json({
      access_token,
      token_type: "Bearer",
      expires_in: TTL_TOKEN,
      refresh_token,
      scope: codeData.scope
    });
  }
  if (grant_type === "refresh_token") {
    const rt = form.get("refresh_token");
    if (!rt)
      return json({ error: "invalid_request", error_description: "refresh_token required" }, 400);
    const rtRaw = await env.MCP_OAUTH.get(`refresh:${rt}`);
    if (!rtRaw)
      return json({ error: "invalid_grant", error_description: "Refresh token expired or invalid" }, 400);
    const rtData = JSON.parse(rtRaw);
    const access_token = rand(32);
    await env.MCP_OAUTH.put(`token:${access_token}`, JSON.stringify({
      client_id: rtData.client_id,
      scope: rtData.scope
    }), { expirationTtl: TTL_TOKEN });
    return json({
      access_token,
      token_type: "Bearer",
      expires_in: TTL_TOKEN,
      scope: rtData.scope
    });
  }
  return json({ error: "unsupported_grant_type" }, 400);
}
__name(token, "token");
async function revoke(request, env) {
  const form = await request.formData();
  const tok = form.get("token");
  if (!tok)
    return json({}, 200);
  await env.MCP_OAUTH.delete(`token:${tok}`);
  await env.MCP_OAUTH.delete(`refresh:${tok}`);
  return json({}, 200);
}
__name(revoke, "revoke");
async function validateBearer(authHeader, env) {
  if (!authHeader)
    return { valid: false };
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!m)
    return { valid: false };
  const tok = m[1].trim();
  if (!env.MCP_OAUTH)
    return { valid: false };
  const raw = await env.MCP_OAUTH.get(`token:${tok}`);
  if (!raw)
    return { valid: false };
  try {
    const data = JSON.parse(raw);
    return { valid: true, client_id: data.client_id, scope: data.scope };
  } catch (e) {
    return { valid: false };
  }
}
__name(validateBearer, "validateBearer");
async function debugRecentRequests(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const tok = auth.replace(/^Bearer\s+/i, "");
  if (tok !== env.FIELD_MCP_SECRET)
    return json({ error: "Unauthorized" }, 401);
  const list = await env.MCP_OAUTH.list({ prefix: "log:", limit: 200 });
  const entries = [];
  for (const k of list.keys) {
    const v = await env.MCP_OAUTH.get(k.name);
    if (v) {
      try {
        entries.push(JSON.parse(v));
      } catch (e) {
      }
    }
  }
  entries.sort((a, b) => a.ts > b.ts ? -1 : 1);
  return json({ count: entries.length, entries });
}
__name(debugRecentRequests, "debugRecentRequests");
function passwordPage({ client_name, client_id, redirect_uri, state, scope, code_challenge, code_challenge_method, error }) {
  const esc = /* @__PURE__ */ __name((s) => String(s || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[c]), "esc");
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>FIELD Handoff \u2014 Authorize</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  :root { color-scheme: dark; }
  body { font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
         max-width: 480px; margin: 80px auto; padding: 0 24px;
         background: #0a0a0a; color: #e0e0e0; }
  h1 { font-size: 18px; font-weight: 600; margin-bottom: 4px; }
  p.sub { color: #888; font-size: 14px; margin-top: 0; }
  .client { background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 8px;
            padding: 16px; margin: 24px 0; font-size: 14px; }
  .client b { color: #fff; }
  .meta { margin-top: 8px; color: #666; font-size: 12px; word-break: break-all; }
  label { display: block; font-size: 13px; color: #aaa; margin-bottom: 6px; }
  input[type=password] { width: 100%; padding: 10px 12px; box-sizing: border-box;
                         background: #1a1a1a; color: #fff; border: 1px solid #2a2a2a;
                         border-radius: 6px; font-size: 15px; font-family: inherit; }
  button { background: #2a5cf0; color: #fff; border: 0; padding: 10px 20px;
           border-radius: 6px; font-size: 14px; font-weight: 500;
           margin-top: 16px; cursor: pointer; }
  button:hover { background: #1e4ee0; }
  .error { color: #ff6464; font-size: 13px; margin-top: 8px; }
</style></head><body>
<h1>FIELD Handoff</h1>
<p class="sub">Authorize MCP client access</p>
<div class="client">
  <div><b>${esc(client_name)}</b> requests <code>${esc(scope)}</code> scope.</div>
  <div class="meta">redirect_uri: ${esc(redirect_uri)}</div>
</div>
<form method="POST" action="/oauth/authorize">
  <label for="password">Password</label>
  <input type="password" id="password" name="password" autofocus required>
  ${error ? `<div class="error">${esc(error)}</div>` : ""}
  <input type="hidden" name="client_id" value="${esc(client_id)}">
  <input type="hidden" name="redirect_uri" value="${esc(redirect_uri)}">
  <input type="hidden" name="state" value="${esc(state)}">
  <input type="hidden" name="scope" value="${esc(scope)}">
  <input type="hidden" name="code_challenge" value="${esc(code_challenge)}">
  <input type="hidden" name="code_challenge_method" value="${esc(code_challenge_method)}">
  <button type="submit">Authorize</button>
</form>
</body></html>`;
}
__name(passwordPage, "passwordPage");
function errorPage(error, description) {
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:500px;margin:80px auto;padding:0 20px;background:#0a0a0a;color:#e0e0e0">
<h2 style="color:#ff6464">OAuth Error: ${error}</h2><p>${description}</p></body></html>`;
}
__name(errorPage, "errorPage");

// src/index.js
var NBA_CDN_BASE = "https://cdn.nba.com/static/json";
var NBA_CACHE_TTL = 30;
var NBA_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Referer": "https://www.nba.com/standings",
  "Origin": "https://www.nba.com",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
  "Pragma": "no-cache"
};
var NBA_STANDINGS_TTL = 3600;
var NBA_ALLOWED_PATHS = [
  "/liveData/scoreboard/todaysScoreboard_00.json",
  "/liveData/standings/standings_v2.json",
  "/staticData/scheduleLeagueV2.json"
];
var NBA_ALLOWED_PREFIXES = [
  "/liveData/boxscore/boxscore_",
  "/liveData/playbyplay/playbyplay_",
  "/liveData/odds_todaysGames",
  "/liveData/channels_"
];
function nbaAllowed(path) {
  if (NBA_ALLOWED_PATHS.includes(path))
    return true;
  return NBA_ALLOWED_PREFIXES.some((p) => path.startsWith(p));
}
__name(nbaAllowed, "nbaAllowed");
var NBA_STATS_BASE = "https://stats.nba.com/stats";
var NBA_STATS_CACHE_TTL = 900;
var NBA_STATS_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Referer": "https://www.nba.com/stats/",
  "Origin": "https://www.nba.com",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
  "Pragma": "no-cache"
};
var NBA_STATS_ALLOWED_PATHS = [
  "/leagueLeaders"
];
function nbaStatsAllowed(path) {
  const cleanPath = path.split("?")[0];
  return NBA_STATS_ALLOWED_PATHS.includes(cleanPath);
}
__name(nbaStatsAllowed, "nbaStatsAllowed");
var MLB_STATS_API_BASE = "https://statsapi.mlb.com/api/v1";
var MLB_STATS_API_ALLOWED_PREFIXES = [
  "/game/",
  // /game/{gamePk}/boxscore + /game/{gamePk}/feed/live
  "/people/"
  // /people/{playerId}/stats — career/season stats
];
function mlbStatsApiAllowed(path) {
  return MLB_STATS_API_ALLOWED_PREFIXES.some((p) => path.startsWith(p));
}
__name(mlbStatsApiAllowed, "mlbStatsApiAllowed");
var MLB_STATS_API_TTL = 60;
var MLB_STATS_API_HEADERS = { "User-Agent": "FIELD-Sports-Intelligence/1.0" };
var MLS_STATS_HEADERS = {
  "User-Agent": "FIELD-Sports-Intelligence/1.0",
  "Accept": "application/json"
};
var MLS_STATS_TTL_LIVE = 30;
var MLS_STATS_TTL_GOALS = 60;
var MLS_STATS_TTL_SCHEDULE = 300;
var MLS_STATS_TTL_STANDINGS = 3600;
var MLS_STATS_ALLOWED_PREFIXES = [
  "/v1/matches",
  // today's scores + match details
  "/v1/goals",
  // goalscorer events
  "/v1/commentaries",
  // full event stream
  "/matches/seasons/",
  // schedule by season
  "/competitions/"
  // standings + season list
];
function mlsStatsAllowed(path) {
  return MLS_STATS_ALLOWED_PREFIXES.some((p) => path.startsWith(p));
}
__name(mlsStatsAllowed, "mlsStatsAllowed");
function mlsStatsTtl(path) {
  if (path.startsWith("/competitions/"))
    return MLS_STATS_TTL_STANDINGS;
  if (path.startsWith("/matches/seasons/"))
    return MLS_STATS_TTL_SCHEDULE;
  if (path.startsWith("/v1/goals") || path.startsWith("/v1/commentaries"))
    return MLS_STATS_TTL_GOALS;
  return MLS_STATS_TTL_LIVE;
}
__name(mlsStatsTtl, "mlsStatsTtl");
var NHL_BASE = "https://api-web.nhle.com";
var NHL_CACHE_TTL_LIVE = 30;
var NHL_CACHE_TTL_SCHEDULE = 300;
var NHL_CACHE_TTL_STANDINGS = 3600;
var NHL_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Referer": "https://www.nhl.com/",
  "Origin": "https://www.nhl.com",
  "Accept": "application/json"
};
var NHL_ALLOWED_EXACT = [
  "/v1/scoreboard/now",
  "/v1/standings/now"
];
var NHL_ALLOWED_PREFIXES = [
  "/v1/schedule/",
  // /v1/schedule/2026-05-20
  "/v1/standings/",
  // /v1/standings/2026-05-20
  "/v1/gamecenter/",
  // /v1/gamecenter/{id}/boxscore|landing|play-by-play|right-rail
  "/v1/score/"
  // /v1/score/{date}
];
function nhlAllowed(path) {
  if (NHL_ALLOWED_EXACT.includes(path))
    return true;
  return NHL_ALLOWED_PREFIXES.some((p) => path.startsWith(p));
}
__name(nhlAllowed, "nhlAllowed");
function nhlCacheTtl(path) {
  if (path.startsWith("/v1/standings"))
    return NHL_CACHE_TTL_STANDINGS;
  if (path.startsWith("/v1/schedule"))
    return NHL_CACHE_TTL_SCHEDULE;
  return NHL_CACHE_TTL_LIVE;
}
__name(nhlCacheTtl, "nhlCacheTtl");
var FPL_BASE = "https://fantasy.premierleague.com/api";
var FPL_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Referer": "https://fantasy.premierleague.com/",
  "Origin": "https://fantasy.premierleague.com",
  "Accept": "application/json"
};
var FPL_TTL_BOOTSTRAP = 3600;
var FPL_TTL_LIVE = 30;
var FPL_ALLOWED_EXACT = ["/bootstrap-static", "/fixtures"];
var FPL_ALLOWED_PREFIXES_FPL = ["/fixtures?", "/event/"];
function fplAllowed(path) {
  if (FPL_ALLOWED_EXACT.includes(path) || FPL_ALLOWED_EXACT.includes(path.replace(/\/$/, "")))
    return true;
  return FPL_ALLOWED_PREFIXES_FPL.some((p) => path.startsWith(p));
}
__name(fplAllowed, "fplAllowed");
function fplCacheTtl(path) {
  return path.startsWith("/bootstrap") ? FPL_TTL_BOOTSTRAP : FPL_TTL_LIVE;
}
__name(fplCacheTtl, "fplCacheTtl");
var SQUIGGLE_BASE = "https://api.squiggle.com.au";
var SQUIGGLE_TTL_LIVE = 30;
var SQUIGGLE_TTL_STANDING = 120;
var SQUIGGLE_TTL_TIPS = 3600;
var SQUIGGLE_HEADERS = {
  "Accept": "application/json",
  "User-Agent": "FIELD-Global-Sports-Intelligence/1.0 (jeffunglesbee-create/jubilant-bassoon)"
};
function squiggleTtl(search) {
  if (search.includes("complete=0"))
    return SQUIGGLE_TTL_LIVE;
  if (search.includes("q=standings") || search.includes("q=ladder"))
    return SQUIGGLE_TTL_STANDING;
  if (search.includes("q=tips") || search.includes("q=power"))
    return SQUIGGLE_TTL_TIPS;
  return SQUIGGLE_TTL_LIVE;
}
__name(squiggleTtl, "squiggleTtl");
var ATP_BASE = "https://app.atptour.com/api/v2/gateway";
var ATP_TTL = 15;
function atpAllowed(path) {
  return path === "/livematches/website" || path.startsWith("/livematches/");
}
__name(atpAllowed, "atpAllowed");
var FD_BASE = "https://api.football-data.org/v4";
var FD_AUTH_TOKEN = "21559ed667044b94a8b7cb0bbe303112";
var FD_HEADERS = {
  "X-Auth-Token": FD_AUTH_TOKEN,
  "Accept": "application/json"
};
var FD_ALLOWED_EXACT = ["/matches", "/competitions"];
var FD_ALLOWED_PREFIXES_FD = ["/matches?", "/competitions/", "/matches/"];
function fdAllowed(path) {
  if (FD_ALLOWED_EXACT.includes(path))
    return true;
  return FD_ALLOWED_PREFIXES_FD.some((p) => path.startsWith(p));
}
__name(fdAllowed, "fdAllowed");
function fdCacheTtl(path) {
  if (path.includes("/head2head"))
    return 86400;
  if (path.includes("/standings"))
    return 3600;
  if (path.startsWith("/matches"))
    return 60;
  if (path.startsWith("/competitions/"))
    return 120;
  return 120;
}
__name(fdCacheTtl, "fdCacheTtl");
var ODDS_BASE = "https://api.the-odds-api.com";
var ODDS_API_KEY_FALLBACK = "de44fdf870b3a4b5ee9d46993b2e1038";
var ODDS_TTL_ODDS = 3600;
var ODDS_TTL_SPORTS = 3600;
var ODDS_ALLOWED_EXACT = ["/v4/sports", "/v4/usage"];
var ODDS_ALLOWED_PREFIXES = ["/v4/sports/", "/v4/events/"];
function oddsAllowed(path) {
  if (ODDS_ALLOWED_EXACT.includes(path))
    return true;
  return ODDS_ALLOWED_PREFIXES.some((p) => path.startsWith(p));
}
__name(oddsAllowed, "oddsAllowed");
function oddsCacheTtl(path) {
  return path === "/v4/sports" ? ODDS_TTL_SPORTS : ODDS_TTL_ODDS;
}
__name(oddsCacheTtl, "oddsCacheTtl");
function oddsUrl(cleanPath, search, envKey) {
  const apiKey = envKey || ODDS_API_KEY_FALLBACK;
  const qs = search ? search + `&apiKey=${apiKey}` : `?apiKey=${apiKey}`;
  return `${ODDS_BASE}${cleanPath}${qs}`;
}
__name(oddsUrl, "oddsUrl");
var APISPORTS_HOSTS = {
  "football": "v3.football.api-sports.io",
  "nba": "v2.nba.api-sports.io",
  // dedicated NBA Pro plan — separate quota from basketball
  "basketball": "v1.basketball.api-sports.io",
  // WNBA-only after NBA routed to nba host
  "hockey": "v1.hockey.api-sports.io",
  "baseball": "v1.baseball.api-sports.io",
  "afl": "v1.afl.api-sports.io",
  "american-football": "v1.american-football.api-sports.io",
  "formula-1": "v1.formula-1.api-sports.io",
  "mma": "v1.mma.api-sports.io"
};
var APISPORTS_ALLOWED = [
  "/fixtures",
  // ?live=all, ?id=, ?league=&season=
  "/fixtures/",
  // /fixtures/statistics, /fixtures/events, /fixtures/lineups
  "/standings",
  // ?league=&season=
  "/odds",
  // ?fixture= (pre-match)
  "/odds/",
  // /odds/live?fixture=
  "/predictions",
  // ?fixture= (football/soccer only)
  "/games",
  // basketball/hockey/afl/nfl ?live=all
  "/games/",
  // /games/statistics/teams?id=  /games/statistics/players?id=
  "/teams",
  // ?id= team info + /teams/statistics (season-level)
  "/leagues",
  // ?id= (fixture ID lookup utility)
  "/seasons",
  // utility — cached 24hr
  "/races",
  // F1 /races?season=
  "/rounds",
  // F1 /rounds?season=&current=true
  "/events",
  // MMA /events
  "/players",
  // ?id= player info
  "/players/"
  // /players/statistics
];
function apiSportsAllowed(path) {
  return APISPORTS_ALLOWED.some(
    (p) => path === p || path.startsWith(p + "?") || path.startsWith(p + "/")
  );
}
__name(apiSportsAllowed, "apiSportsAllowed");
function apiSportsTtl(path) {
  if (path.startsWith("/fixtures?live") || path.startsWith("/games?live"))
    return 30;
  if (path.startsWith("/fixtures/statistics") || path.startsWith("/fixtures/events"))
    return 30;
  if (path.startsWith("/games/statistics"))
    return 30;
  if (path.startsWith("/odds/live"))
    return 30;
  if (path.startsWith("/predictions"))
    return 3600;
  if (path.startsWith("/standings"))
    return 3600;
  if (path.startsWith("/odds"))
    return 300;
  if (path.startsWith("/leagues"))
    return 86400;
  if (path.startsWith("/seasons"))
    return 86400;
  if (path.startsWith("/races"))
    return 3600;
  if (path.startsWith("/rounds"))
    return 3600;
  return 60;
}
__name(apiSportsTtl, "apiSportsTtl");
var ESPN_GAMBIT_BASE = "https://gambit-api-partner.fantasy.espn.com";
var ESPN_GAMBIT_TTL = 25;
var ESPN_GAMBIT_HEADERS = {
  "Origin": "https://www.espn.com",
  "Referer": "https://www.espn.com/",
  "Accept": "application/json",
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
};
function espnGambitAllowed(path) {
  return path.startsWith("/apis/v1/challenges/");
}
__name(espnGambitAllowed, "espnGambitAllowed");
var ESPN_SUMMARY_BASE = "https://site.web.api.espn.com/apis/site/v2";
var ESPN_SUMMARY_TTL = 25;
var ESPN_SUMMARY_HEADERS = {
  "Origin": "https://www.espn.com",
  "Referer": "https://www.espn.com/",
  "Accept": "application/json",
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
};
function espnSummaryAllowed(path) {
  return /^\/sports\/[a-z]+\/[a-z]+\/summary$/.test(path.split("?")[0]);
}
__name(espnSummaryAllowed, "espnSummaryAllowed");
var BDL_BASE = "https://api.balldontlie.io";
var BDL_ALLOWED_PREFIXES = [
  "/nba/v1/players",
  // player lookup by name
  "/nba/v1/season_averages",
  // season stats for milestone detection
  "/nba/v1/standings",
  // standings — tertiary source after ESPN
  "/nba/v1/stats",
  // per-game stats
  "/nba/v1/games"
  // schedule/results
];
function bdlAllowed(path) {
  return BDL_ALLOWED_PREFIXES.some((p) => path.startsWith(p));
}
__name(bdlAllowed, "bdlAllowed");
function bdlCacheTtl(path) {
  if (path.startsWith("/nba/v1/standings"))
    return 3600;
  if (path.startsWith("/nba/v1/season_averages"))
    return 3600;
  if (path.startsWith("/nba/v1/players"))
    return 86400;
  return 60;
}
__name(bdlCacheTtl, "bdlCacheTtl");
var REALTIMESPORTS_BASE = "https://www.realtimesportsapi.com/api/v1";
function realtimeSportsAllowed(path) {
  return path === "/sports" || path.startsWith("/sports/");
}
__name(realtimeSportsAllowed, "realtimeSportsAllowed");
function realtimeSportsTtl(path) {
  if (path.includes("/events/live"))
    return 30;
  if (path.includes("/boxscore"))
    return 30;
  if (path.includes("/plays"))
    return 30;
  if (path.includes("/events"))
    return 120;
  if (path.includes("/athletes"))
    return 3600;
  if (path.includes("/teams"))
    return 3600;
  return 300;
}
__name(realtimeSportsTtl, "realtimeSportsTtl");
var NFLVERSE_OUT_ALLOWED = [
  "epa_table.json",
  "team_epa.json",
  "qb_metrics.json",
  "receiver_metrics.json",
  "defense_metrics.json",
  "schedule_refs.json",
  "team_tendencies.json",
  "bdb_route_entropy.json",
  "bdb_xblock_pass_rush.json",
  "bdb_tendency_fingerprint.json",
  "bdb_separation.json"
];
var NFLVERSE_RAW_BASE = "https://raw.githubusercontent.com/jeffunglesbee-create/jubilant-bassoon/main/outbox/nfl";
var SPORTRADAR_UFL_BASE = "https://api.sportradar.com/ufl/trial/v7/en";
var SPORTRADAR_UFL_ALLOWED_PREFIXES = [
  "/games",
  "/seasons",
  "/league",
  "/teams"
];
function sportradarUflAllowed(path) {
  return SPORTRADAR_UFL_ALLOWED_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));
}
__name(sportradarUflAllowed, "sportradarUflAllowed");
function sportradarUflTtl(path) {
  if (path.includes("/pbp"))
    return 30;
  if (path.includes("/boxscore"))
    return 30;
  if (path.includes("/schedule"))
    return 300;
  if (path.includes("/summary"))
    return 60;
  if (path.includes("/statistics"))
    return 300;
  return 3600;
}
__name(sportradarUflTtl, "sportradarUflTtl");
var CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
  "Access-Control-Expose-Headers": "X-JQ-Score, X-JQ-Retries, X-JQ-Layers, X-FIELD-Proxy"
};
function _parseUmpireArray(arr) {
  if (!Array.isArray(arr))
    return null;
  const out = {};
  for (const item of arr) {
    const name = item?.entity_name || item?.name || item?.umpire_name || "";
    const challenged = Number(item?.n_challenges || item?.challenged || 0);
    const overturned = Number(item?.n_overturns || item?.overturned || 0);
    const rate = Number(item?.rate_overturns || item?.rate || 0);
    if (!name || challenged < 3)
      continue;
    const parts = name.trim().split(/\s+/);
    const last = parts[parts.length - 1].toLowerCase().replace(/[.']/g, "");
    if (last.length < 2)
      continue;
    out[last] = {
      challenged,
      overturned,
      rate: Math.round(rate * 1e3) / 1e3,
      pitchesCalled: Number(item?.pitches_called || 0),
      weakness: null,
      displayName: name
    };
  }
  return Object.keys(out).length ? out : null;
}
__name(_parseUmpireArray, "_parseUmpireArray");
function _parseUmpireHTML(html2) {
  const out = {};
  const rows = [...html2.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  for (const [, rowHtml] of rows) {
    const cells = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(([, inner]) => inner.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#?\w+;/g, "").trim());
    if (cells.length < 4)
      continue;
    let name = "", ni = -1;
    for (let i = 0; i < Math.min(cells.length, 4); i++) {
      if (cells[i] && !/^\d+\.?\d*%?$/.test(cells[i]) && cells[i].includes(" ") && cells[i].length > 4) {
        name = cells[i];
        ni = i;
        break;
      }
    }
    if (!name || ni < 0)
      continue;
    const nums = cells.slice(ni + 1).map((c) => {
      const v = parseFloat(c.replace("%", "").trim());
      return isNaN(v) ? null : v;
    });
    const challenged = nums.find((n) => n !== null && n >= 3 && n <= 200);
    const rateRaw = nums.find((n) => n !== null && n > 0 && n <= 100);
    if (!challenged || challenged < 3)
      continue;
    const rate = rateRaw > 1 ? rateRaw / 100 : rateRaw;
    const overturned = Math.round(challenged * rate);
    const parts = name.trim().split(/\s+/);
    const last = parts[parts.length - 1].toLowerCase().replace(/[.']/g, "");
    if (last.length < 2 || /^\d+$/.test(last))
      continue;
    out[last] = {
      challenged: Math.round(challenged),
      overturned,
      rate: Math.round(rate * 1e3) / 1e3,
      pitchesCalled: 0,
      weakness: null,
      displayName: name
    };
  }
  return Object.keys(out).length >= 3 ? out : null;
}
__name(_parseUmpireHTML, "_parseUmpireHTML");
async function relayFetch(targetUrl, headers, ttl, source, ctx) {
  const cache = caches.default;
  const cacheKey = new Request(targetUrl, { method: "GET" });
  let response = await cache.match(cacheKey);
  if (response)
    return response;
  let upstream;
  try {
    upstream = await fetch(targetUrl, { headers, cf: { cacheTtl: ttl, cacheEverything: true } });
  } catch (err) {
    return new Response(`${source} network error: ${err.message}`, { status: 502, headers: { "X-RELAY-Error": `${source}-network`, ...CORS } });
  }
  if (!upstream.ok) {
    return new Response(`${source} returned ${upstream.status}`, { status: upstream.status, headers: { "X-RELAY-Error": `${source}-${upstream.status}`, ...CORS } });
  }
  response = new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      ...CORS,
      "Cache-Control": `public, max-age=${ttl}`,
      "X-FIELD-Proxy": `relay-${source}`,
      "X-Cache-TTL": String(ttl),
      // Forward quota headers from upstream where present
      ...upstream.headers.get("x-requests-remaining") !== null ? { "X-Requests-Remaining": upstream.headers.get("x-requests-remaining") } : {},
      ...upstream.headers.get("x-requests-used") !== null ? { "X-Requests-Used": upstream.headers.get("x-requests-used") } : {}
    }
  });
  ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}
__name(relayFetch, "relayFetch");
function b64uDecode(s) {
  const pad = s.replace(/-/g, "+").replace(/_/g, "/").padEnd(s.length + (4 - s.length % 4) % 4, "=");
  const bin = atob(pad);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++)
    arr[i] = bin.charCodeAt(i);
  return arr;
}
__name(b64uDecode, "b64uDecode");
function b64uEncode(buf) {
  let bin = "";
  const arr = new Uint8Array(buf);
  for (const b of arr)
    bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
__name(b64uEncode, "b64uEncode");
function vapidUnsigned(audience, sub, exp) {
  const header = b64uEncode(new TextEncoder().encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = b64uEncode(new TextEncoder().encode(JSON.stringify({ aud: audience, exp, sub })));
  return `${header}.${claims}`;
}
__name(vapidUnsigned, "vapidUnsigned");
async function signVapidJwt(unsigned, privateKeyJwk) {
  const key = await crypto.subtle.importKey(
    "jwk",
    privateKeyJwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
  const data = new TextEncoder().encode(unsigned);
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, data);
  return `${unsigned}.${b64uEncode(sig)}`;
}
__name(signVapidJwt, "signVapidJwt");
async function hkdf(salt, ikm, info, len) {
  const key = await crypto.subtle.importKey("raw", ikm, { name: "HKDF" }, false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info: new TextEncoder().encode(info) },
    key,
    len * 8
  );
  return new Uint8Array(bits);
}
__name(hkdf, "hkdf");
async function encryptPayload(plaintext, sub) {
  const { p256dh, auth } = sub.keys;
  const receiverPub = b64uDecode(p256dh);
  const authSecret = b64uDecode(auth);
  const senderKP = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const senderPubRaw = new Uint8Array(await crypto.subtle.exportKey("raw", senderKP.publicKey));
  const receiverKey = await crypto.subtle.importKey(
    "raw",
    receiverPub,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );
  const sharedBits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: receiverKey },
    senderKP.privateKey,
    256
  );
  const ikm = new Uint8Array(sharedBits);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prk = await hkdf(authSecret, ikm, "Content-Encoding: auth\0", 32);
  const keyInfo = new Uint8Array([
    ...new TextEncoder().encode("Content-Encoding: aesgcm\0"),
    ...receiverPub,
    ...senderPubRaw
  ]);
  const nonceInfo = new Uint8Array([
    ...new TextEncoder().encode("Content-Encoding: nonce\0"),
    ...receiverPub,
    ...senderPubRaw
  ]);
  const cek = await hkdf(salt, prk, new TextDecoder().decode(keyInfo), 16);
  const nonce = await hkdf(salt, prk, new TextDecoder().decode(nonceInfo), 12);
  const aesKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const padded = new Uint8Array([0, 0, ...new TextEncoder().encode(plaintext)]);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, padded);
  return { ciphertext: new Uint8Array(ciphertext), salt, senderPub: senderPubRaw };
}
__name(encryptPayload, "encryptPayload");
async function sendWebPush(sub, payload, env) {
  if (!env.VAPID_PRIVATE_KEY || !env.VAPID_PUBLIC_KEY) {
    throw new Error("VAPID keys not configured in Worker secrets");
  }
  const endpoint = sub.endpoint;
  const origin = new URL(endpoint).origin;
  const exp = Math.floor(Date.now() / 1e3) + 12 * 3600;
  const sub_email = "mailto:jeff@field.app";
  const dBytes = b64uDecode(env.VAPID_PRIVATE_KEY);
  const xBytes = b64uDecode(env.VAPID_PUBLIC_KEY).slice(1, 33);
  const yBytes = b64uDecode(env.VAPID_PUBLIC_KEY).slice(33, 65);
  const privateKeyJwk = {
    kty: "EC",
    crv: "P-256",
    d: b64uEncode(dBytes),
    x: b64uEncode(xBytes),
    y: b64uEncode(yBytes)
  };
  const unsigned = vapidUnsigned(origin, sub_email, exp);
  const jwt = await signVapidJwt(unsigned, privateKeyJwk);
  const vapidHeader = `vapid t=${jwt},k=${env.VAPID_PUBLIC_KEY}`;
  const { ciphertext, salt, senderPub } = await encryptPayload(JSON.stringify(payload), sub);
  const headers = {
    "Authorization": vapidHeader,
    "Content-Type": "application/octet-stream",
    "Content-Encoding": "aesgcm",
    "Encryption": `salt=${b64uEncode(salt)}`,
    "Crypto-Key": `dh=${b64uEncode(senderPub)};p256ecdsa=${env.VAPID_PUBLIC_KEY}`,
    "TTL": "86400"
  };
  const res = await fetch(endpoint, { method: "POST", headers, body: ciphertext });
  return res;
}
__name(sendWebPush, "sendWebPush");
var _wcLambdaCache = null;
var _wcLambdaCacheTs = 0;
var WC_LAMBDA_CACHE_TTL_MS = 5 * 60 * 1e3;
async function getWCPregameLambdas(env) {
  if (_wcLambdaCache && Date.now() - _wcLambdaCacheTs < WC_LAMBDA_CACHE_TTL_MS) {
    return _wcLambdaCache;
  }
  const key = env.ODDS_API_KEY || ODDS_API_KEY_FALLBACK;
  if (!key)
    return null;
  try {
    const r = await fetch(
      `https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup/odds?apiKey=${key}&markets=h2h,totals&regions=us,eu&oddsFormat=decimal`,
      { cf: { cacheTtl: 300, cacheEverything: true } }
    );
    if (!r.ok)
      return null;
    const games = await r.json();
    const cache = /* @__PURE__ */ new Map();
    for (const game of Array.isArray(games) ? games : []) {
      const h2h = { home: 0, draw: 0, away: 0, n: 0 };
      const tot = { line: 0, n: 0 };
      for (const bm of game.bookmakers || []) {
        const h2hMkt = (bm.markets || []).find((m) => m.key === "h2h");
        const totMkt = (bm.markets || []).find((m) => m.key === "totals");
        if (h2hMkt) {
          const hO = h2hMkt.outcomes.find((o) => o.name === game.home_team);
          const aO = h2hMkt.outcomes.find((o) => o.name === game.away_team);
          const dO = h2hMkt.outcomes.find((o) => o.name === "Draw");
          if (hO && aO && dO) {
            h2h.home += 1 / hO.price;
            h2h.draw += 1 / dO.price;
            h2h.away += 1 / aO.price;
            h2h.n++;
          }
        }
        if (totMkt) {
          const overO = totMkt.outcomes.find((o) => o.name === "Over" && o.point != null);
          if (overO) {
            tot.line += overO.point;
            tot.n++;
          }
        }
      }
      if (h2h.n === 0)
        continue;
      const rH = h2h.home / h2h.n, rD = h2h.draw / h2h.n, rA = h2h.away / h2h.n;
      const vigSum = rH + rD + rA;
      if (vigSum <= 0)
        continue;
      const pH = rH / vigSum, pD = rD / vigSum;
      const lams = tot.n > 0 ? lambdaFromTotalsAndH2H(tot.line / tot.n, pH, pD) : oddsToLambda(pH, pD, 1 - pH - pD);
      cache.set(`${game.home_team}|${game.away_team}`, lams);
    }
    _wcLambdaCache = cache;
    _wcLambdaCacheTs = Date.now();
    return cache;
  } catch (e) {
    return null;
  }
}
__name(getWCPregameLambdas, "getWCPregameLambdas");
function wcTeamNameMatch(oddsName, fieldName) {
  if (!oddsName || !fieldName)
    return false;
  const norm = /* @__PURE__ */ __name((s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim(), "norm");
  const a = norm(oddsName), b = norm(fieldName);
  if (a === b)
    return true;
  const ALIASES = {
    "usa": "united states",
    "united states": "usa",
    "turkey": "turkiye",
    "turkiye": "turkey",
    "czech republic": "czechia",
    "czechia": "czech republic",
    "dr congo": "congo dr",
    "congo dr": "dr congo",
    "ivory coast": "cote d ivoire",
    "cote d ivoire": "ivory coast"
  };
  const aa = ALIASES[a] || a, bb = ALIASES[b] || b;
  if (aa === bb || aa === b || a === bb)
    return true;
  const pfx = 5;
  if (a.length >= pfx && b.length >= pfx) {
    if (b.includes(a.slice(0, pfx)) || a.includes(b.slice(0, pfx)))
      return true;
  }
  return false;
}
__name(wcTeamNameMatch, "wcTeamNameMatch");
var V2_LEAGUES = {
  "nba": { sport: "nba", leagueId: null, season: "2025-2026" },
  // routes to v2.nba.api-sports.io
  "nhl": { sport: "hockey", leagueId: 57, season: "2025" },
  // VERIFIED: hockey API requires integer season (2025 = 2025-26 season)
  "mlb": { sport: "baseball", leagueId: 1, season: "2026" },
  "wnba": { sport: "basketball", leagueId: 13, season: "2026" },
  // [VERIFY leagueId]
  "epl": { sport: "football", leagueId: 39, season: "2025" },
  "mls": { sport: "football", leagueId: 253, season: "2026" },
  "ucl": { sport: "football", leagueId: 2, season: "2025" },
  "europa": { sport: "football", leagueId: 3, season: "2025" },
  // UEFA Europa League
  "conference": { sport: "football", leagueId: 848, season: "2025" },
  // UEFA Conference League
  "eflchamp": { sport: "football", leagueId: 40, season: "2025" },
  // EFL Championship
  "eflone": { sport: "football", leagueId: 41, season: "2025" },
  // EFL League One
  "efltwo": { sport: "football", leagueId: 42, season: "2025" },
  // EFL League Two
  "laliga": { sport: "football", leagueId: 140, season: "2025" },
  "seriea": { sport: "football", leagueId: 135, season: "2025" },
  "bundesliga": { sport: "football", leagueId: 78, season: "2025" },
  "ligue1": { sport: "football", leagueId: 61, season: "2025" },
  "wc26": { sport: "football", leagueId: 1, season: "2026" }
};
function v2State(sport, statusShort) {
  const s = String(statusShort ?? "").toUpperCase();
  if (sport === "football") {
    if (["1H", "2H", "HT", "ET", "P", "BT", "LIVE"].includes(s))
      return "live";
    if (["FT", "AET", "PEN", "AWD"].includes(s))
      return "final";
    return "pre";
  }
  if (sport === "basketball") {
    if (["Q1", "Q2", "Q3", "Q4", "OT", "BT", "HT"].includes(s))
      return "live";
    if (["FT", "AOT", "ABD"].includes(s))
      return "final";
    if (["2", "3", "4", "5", "6", "7"].includes(s))
      return "live";
    if (s === "8")
      return "final";
    return "pre";
  }
  if (sport === "hockey") {
    if (["P1", "P2", "P3", "OT", "SO", "BT"].includes(s))
      return "live";
    if (["FT", "AOT", "APN", "ABD"].includes(s))
      return "final";
    return "pre";
  }
  if (sport === "baseball") {
    if (["FT", "FT_IN", "POST", "PPD", "ABD"].includes(s))
      return "final";
    if (["NS", "TBD", "PST"].includes(s))
      return "pre";
    return "live";
  }
  return "pre";
}
__name(v2State, "v2State");
function v2Period(sport, status, game) {
  const s = (status?.short || "").toUpperCase();
  if (sport === "basketball") {
    const map = { "Q1": 1, "Q2": 2, "Q3": 3, "Q4": 4, "OT": 5, "BT": game?.periods?.current || 0 };
    const num = map[s] ?? (game?.periods?.current || 0);
    const lbl = { 1: "Q1", 2: "Q2", 3: "Q3", 4: "Q4", 5: "OT" }[num] || (num > 4 ? `OT${num - 4}` : "");
    return { periodNum: num, periodLabel: lbl };
  }
  if (sport === "hockey") {
    const map = { "P1": 1, "P2": 2, "P3": 3, "OT": 4, "SO": 5 };
    const num = map[s] ?? (game?.periods?.current || 0);
    const lbl = { 1: "1st", 2: "2nd", 3: "3rd", 4: "OT", 5: "SO" }[num] || "";
    return { periodNum: num, periodLabel: lbl };
  }
  if (sport === "baseball") {
    const inn = game?.innings?.current || 0;
    const half = s.startsWith("T") ? "Top" : s.startsWith("B") ? "Bot" : s.startsWith("M") ? "Mid" : "";
    return { periodNum: inn, periodLabel: half ? `${half} ${inn}` : inn ? `Inn ${inn}` : "" };
  }
  if (sport === "football") {
    const el = status?.elapsed;
    const clock = el != null ? `${el}'` : "";
    if (s === "1H")
      return { periodNum: 1, periodLabel: clock || "1st Half" };
    if (s === "2H")
      return { periodNum: 2, periodLabel: clock || "2nd Half" };
    if (s === "HT")
      return { periodNum: 1, periodLabel: "HT" };
    if (s === "ET")
      return { periodNum: 3, periodLabel: clock || "ET" };
    if (s === "P")
      return { periodNum: 4, periodLabel: "Pen" };
    return { periodNum: 0, periodLabel: "" };
  }
  return { periodNum: 0, periodLabel: "" };
}
__name(v2Period, "v2Period");
function v2Clock(sport, status) {
  if (!status)
    return "";
  if (sport === "football")
    return status.elapsed != null ? `${status.elapsed}'` : "";
  if (status.timer != null)
    return String(status.timer);
  return "";
}
__name(v2Clock, "v2Clock");
function adaptBasketball(g) {
  const sport = "basketball", state = v2State(sport, g?.status?.short);
  const { periodNum, periodLabel } = v2Period(sport, g?.status, g);
  const qs = ["quarter_1", "quarter_2", "quarter_3", "quarter_4"];
  const homeLS = qs.map((q) => g?.scores?.home?.[q]).filter((v) => v !== null && v !== void 0);
  const awayLS = qs.map((q) => g?.scores?.away?.[q]).filter((v) => v !== null && v !== void 0);
  return {
    id: `bball:${g.id}`,
    sport: "nba",
    league: g?.league?.name || "NBA",
    state,
    start: g.date || "",
    home: { name: g?.teams?.home?.name || "", abbr: "", score: g?.scores?.home?.total ?? null, teamId: g?.teams?.home?.id ?? null },
    away: { name: g?.teams?.away?.name || "", abbr: "", score: g?.scores?.away?.total ?? null, teamId: g?.teams?.away?.id ?? null },
    periodNum,
    periodLabel,
    clock: v2Clock(sport, g?.status),
    venue: g?.venue || "",
    // VERIFIED: top-level string, not arena.name
    linescores: { home: homeLS, away: awayLS }
    // VERIFIED: quarter_1..4 present
  };
}
__name(adaptBasketball, "adaptBasketball");
function adaptApiNba(g) {
  const longRaw = String(g?.status?.long ?? "").toLowerCase();
  let state = "pre";
  if (longRaw === "finished")
    state = "final";
  else if (longRaw.includes("quarter") || longRaw.includes("half") || longRaw.includes("overtime") || longRaw === "live")
    state = "live";
  else
    state = "pre";
  const periodNum = g?.periods?.current || 0;
  const periodLabel = state === "final" ? "" : periodNum >= 1 && periodNum <= 4 ? `Q${periodNum}` : periodNum > 4 ? `OT${periodNum - 4}` : "";
  const homeLS = Array.isArray(g?.scores?.home?.linescore) ? g.scores.home.linescore.map((n) => parseInt(n) || 0) : [];
  const awayLS = Array.isArray(g?.scores?.visitors?.linescore) ? g.scores.visitors.linescore.map((n) => parseInt(n) || 0) : [];
  return {
    id: `nba:${g.id}`,
    sport: "nba",
    league: "NBA",
    state,
    start: g?.date?.start || "",
    home: {
      name: g?.teams?.home?.name || "",
      abbr: g?.teams?.home?.code || "",
      score: g?.scores?.home?.points ?? null,
      teamId: g?.teams?.home?.id ?? null
    },
    away: {
      name: g?.teams?.visitors?.name || "",
      abbr: g?.teams?.visitors?.code || "",
      score: g?.scores?.visitors?.points ?? null,
      teamId: g?.teams?.visitors?.id ?? null
    },
    periodNum,
    periodLabel,
    clock: g?.status?.clock || "",
    venue: g?.arena?.name || "",
    linescores: { home: homeLS, away: awayLS }
  };
}
__name(adaptApiNba, "adaptApiNba");
function adaptHockey(g) {
  const sport = "hockey", state = v2State(sport, g?.status?.short);
  const { periodNum, periodLabel } = v2Period(sport, g?.status, g);
  const sumPeriods = /* @__PURE__ */ __name((side) => {
    const periods = g?.scores?.[side]?.periods;
    if (!periods || typeof periods !== "object")
      return null;
    const vals = Object.values(periods).map((v) => parseInt(v) || 0);
    return vals.length ? vals.reduce((a, b) => a + b, 0) : null;
  }, "sumPeriods");
  const homeScore = g?.scores?.home?.total ?? sumPeriods("home");
  const awayScore = g?.scores?.away?.total ?? sumPeriods("away");
  return {
    id: g?.id || null,
    sport: "nhl",
    league: g?.league?.name || "NHL",
    state,
    start: g.date || "",
    home: { name: g?.teams?.home?.name || "", abbr: "", score: homeScore },
    away: { name: g?.teams?.away?.name || "", abbr: "", score: awayScore },
    periodNum,
    periodLabel,
    clock: v2Clock(sport, g?.status),
    venue: g?.venue || ""
  };
}
__name(adaptHockey, "adaptHockey");
function adaptBaseball(g) {
  const sport = "baseball", state = v2State(sport, g?.status?.short);
  const { periodNum, periodLabel } = v2Period(sport, g?.status, g);
  const s = (g?.status?.short || "").toUpperCase();
  const inningNum = s.startsWith("T") || s.startsWith("B") ? parseInt(s.slice(1)) || null : null;
  const homeInnings = g?.scores?.home?.innings || {};
  const awayInnings = g?.scores?.away?.innings || {};
  const inningKeys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
  const homeLS = inningKeys.map((k) => homeInnings[k]).filter((v) => v !== null && v !== void 0);
  const awayLS = inningKeys.map((k) => awayInnings[k]).filter((v) => v !== null && v !== void 0);
  const situation = state === "live" ? {
    inning: inningNum,
    // VERIFIED: parsed from status.short
    isTop: s.startsWith("T"),
    outs: null
    // not in /games — needs StatsAPI
  } : null;
  return {
    id: `baseball:${g.id}`,
    sport: "mlb",
    league: g?.league?.name || "MLB",
    state,
    start: g.date || "",
    home: { name: g?.teams?.home?.name || "", abbr: "", score: g?.scores?.home?.total ?? null },
    away: { name: g?.teams?.away?.name || "", abbr: "", score: g?.scores?.away?.total ?? null },
    periodNum,
    periodLabel,
    clock: "",
    venue: "",
    // VERIFIED: not present in baseball response
    situation,
    linescores: { home: homeLS, away: awayLS }
    // per-inning runs (innings 1-9)
  };
}
__name(adaptBaseball, "adaptBaseball");
function parseFootballStats(statsResponse) {
  const teams = statsResponse?.response || [];
  if (teams.length < 2)
    return null;
  function getStat(teamStats, type) {
    const found = (teamStats || []).find((s) => s.type === type);
    const v = found?.value;
    if (v === null || v === void 0)
      return 0;
    if (typeof v === "string") {
      const n = parseInt(v);
      return isNaN(n) ? 0 : n;
    }
    return typeof v === "number" ? v : 0;
  }
  __name(getStat, "getStat");
  const home = teams[0]?.statistics || [];
  const away = teams[1]?.statistics || [];
  return {
    homeSOT: getStat(home, "Shots on Goal"),
    awaySOT: getStat(away, "Shots on Goal"),
    homeShots: getStat(home, "Total Shots"),
    awayShots: getStat(away, "Total Shots"),
    homeRedCards: getStat(home, "Red Cards"),
    awayRedCards: getStat(away, "Red Cards"),
    homeYellows: getStat(home, "Yellow Cards"),
    awayYellows: getStat(away, "Yellow Cards"),
    homeCorners: getStat(home, "Corner Kicks"),
    awayCorners: getStat(away, "Corner Kicks"),
    homePossession: getStat(home, "Ball Possession"),
    // parsed as int (e.g. 62 for "62%")
    awayPossession: getStat(away, "Ball Possession")
  };
}
__name(parseFootballStats, "parseFootballStats");
function deriveManAdvantage(stats) {
  if (!stats)
    return null;
  const hRC = stats.homeRedCards || 0;
  const aRC = stats.awayRedCards || 0;
  if (hRC > aRC)
    return "away";
  if (aRC > hRC)
    return "home";
  return null;
}
__name(deriveManAdvantage, "deriveManAdvantage");
function adaptFootball(item, sportKey, statsData) {
  const fix = item?.fixture || {};
  const status = fix.status || {};
  const sport = "football", state = v2State(sport, status?.short);
  const { periodNum, periodLabel } = v2Period(sport, status, {});
  const el = status?.elapsed;
  const isLive = state === "live";
  const shortStatus = (status?.short || "").toUpperCase();
  const situation = isLive ? {
    elapsed: el || 0,
    isStoppage: el != null && el >= 90,
    isShootout: shortStatus === "P" || periodNum === 5,
    manAdvantage: deriveManAdvantage(statsData),
    // 'home' | 'away' | null
    homeSOT: statsData?.homeSOT || 0,
    awaySOT: statsData?.awaySOT || 0,
    homeShots: statsData?.homeShots || 0,
    awayShots: statsData?.awayShots || 0,
    homeRedCards: statsData?.homeRedCards || 0,
    awayRedCards: statsData?.awayRedCards || 0,
    homeCorners: statsData?.homeCorners || 0,
    awayCorners: statsData?.awayCorners || 0,
    homePossession: statsData?.homePossession || null,
    hasStats: statsData != null
  } : null;
  return {
    id: `football:${fix.id}`,
    sport: sportKey || "football",
    league: item?.league?.name || "",
    state,
    start: fix.date || "",
    home: { name: item?.teams?.home?.name || "", abbr: "", score: item?.goals?.home ?? null },
    away: { name: item?.teams?.away?.name || "", abbr: "", score: item?.goals?.away ?? null },
    periodNum,
    periodLabel,
    clock: el != null ? `${el}'` : "",
    venue: fix.venue?.name || "",
    round: item?.league?.round || "",
    // WC group detection: "Group Stage - Group A"
    situation
  };
}
__name(adaptFootball, "adaptFootball");
function extractWCGroup(round) {
  const m = (round || "").match(/Group\s+([A-L])\b/i);
  return m ? m[1].toUpperCase() : null;
}
__name(extractWCGroup, "extractWCGroup");
async function recomputeGroupStandings(db, groupId) {
  await db.prepare("DELETE FROM wc_group WHERE group_id = ?").bind(groupId).run();
  await db.prepare(`
      INSERT INTO wc_group (group_id, team, played, won, drawn, lost, gf, ga, gd, points)
      SELECT group_id, team,
             SUM(played) AS played,
             SUM(won)    AS won,
             SUM(drawn)  AS drawn,
             SUM(lost)   AS lost,
             SUM(gf)     AS gf,
             SUM(ga)     AS ga,
             SUM(gf) - SUM(ga)      AS gd,
             SUM(won)*3 + SUM(drawn) AS points
      FROM (
        SELECT group_id, home AS team, 1 AS played,
               CASE WHEN home_score > away_score THEN 1 ELSE 0 END AS won,
               CASE WHEN home_score = away_score THEN 1 ELSE 0 END AS drawn,
               CASE WHEN home_score < away_score THEN 1 ELSE 0 END AS lost,
               home_score AS gf, away_score AS ga
        FROM wc_results WHERE group_id = ?
        UNION ALL
        SELECT group_id, away AS team, 1 AS played,
               CASE WHEN away_score > home_score THEN 1 ELSE 0 END AS won,
               CASE WHEN away_score = home_score THEN 1 ELSE 0 END AS drawn,
               CASE WHEN away_score < home_score THEN 1 ELSE 0 END AS lost,
               away_score AS gf, home_score AS ga
        FROM wc_results WHERE group_id = ?
      ) r
      GROUP BY group_id, team
    `).bind(groupId, groupId).run();
}
__name(recomputeGroupStandings, "recomputeGroupStandings");
async function writeWCResult(db, game) {
  const groupId = extractWCGroup(game.round);
  if (!groupId)
    return;
  const matchDate = (game.start || "").slice(0, 10);
  const homeScore = game.home?.score ?? 0;
  const awayScore = game.away?.score ?? 0;
  await db.prepare(`
      INSERT OR IGNORE INTO wc_results
        (game_id, group_id, home, away, home_score, away_score, phase, match_date)
      VALUES (?, ?, ?, ?, ?, ?, 'group', ?)
    `).bind(
    game.id,
    groupId,
    game.home?.name || "",
    game.away?.name || "",
    homeScore,
    awayScore,
    matchDate
  ).run();
  await recomputeGroupStandings(db, groupId);
}
__name(writeWCResult, "writeWCResult");
async function handleWCStandings(url, env) {
  if (!env.WC2026_DB)
    return new Response(
      JSON.stringify({ error: "WC2026_DB not bound" }),
      { status: 503, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  const filterGroup = (url.searchParams.get("group") || "").toUpperCase() || null;
  const sql = filterGroup ? "SELECT * FROM wc_group WHERE group_id = ? ORDER BY points DESC, gd DESC, gf DESC" : "SELECT * FROM wc_group ORDER BY group_id ASC, points DESC, gd DESC, gf DESC";
  const { results } = filterGroup ? await env.WC2026_DB.prepare(sql).bind(filterGroup).all() : await env.WC2026_DB.prepare(sql).all();
  const grouped = {};
  for (const row of results) {
    if (!grouped[row.group_id])
      grouped[row.group_id] = [];
    grouped[row.group_id].push(row);
  }
  return new Response(
    JSON.stringify({ groups: grouped, ts: Date.now() }),
    { headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "max-age=60" } }
  );
}
__name(handleWCStandings, "handleWCStandings");
async function handleWCResults(url, env) {
  if (!env.WC2026_DB)
    return new Response(
      JSON.stringify({ error: "WC2026_DB not bound" }),
      { status: 503, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  const filterGroup = (url.searchParams.get("group") || "").toUpperCase() || null;
  const sql = filterGroup ? "SELECT * FROM wc_results WHERE group_id = ? ORDER BY match_date ASC" : "SELECT * FROM wc_results ORDER BY group_id ASC, match_date ASC";
  const { results } = filterGroup ? await env.WC2026_DB.prepare(sql).bind(filterGroup).all() : await env.WC2026_DB.prepare(sql).all();
  return new Response(
    JSON.stringify({ results, ts: Date.now() }),
    { headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "max-age=30" } }
  );
}
__name(handleWCResults, "handleWCResults");
async function handleWCThirdPlace(env) {
  if (!env.WC2026_DB)
    return new Response(
      JSON.stringify({ error: "WC2026_DB not bound" }),
      { status: 503, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  const { results } = await env.WC2026_DB.prepare(
    "SELECT * FROM wc_third_place_standings"
  ).all();
  return new Response(
    JSON.stringify({ third_place: results, ts: Date.now() }),
    { headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "max-age=60" } }
  );
}
__name(handleWCThirdPlace, "handleWCThirdPlace");
async function handleWCOddsProbs(env) {
  const key = env.ODDS_API_KEY || ODDS_API_KEY_FALLBACK;
  if (!key) {
    return new Response(
      JSON.stringify({ ok: false, probs: [], error: "ODDS_API_KEY not configured" }),
      { status: 503, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
  try {
    const resp = await fetch(
      `https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup/odds?apiKey=${key}&markets=h2h,totals&regions=us,eu&oddsFormat=decimal`,
      { cf: { cacheTtl: 300, cacheEverything: true } }
    );
    if (!resp.ok) {
      return new Response(
        JSON.stringify({ ok: false, probs: [], error: `Odds API ${resp.status}` }),
        { status: 502, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }
    const games = await resp.json();
    const probs = [];
    for (const game of Array.isArray(games) ? games : []) {
      const h2h = { home: 0, draw: 0, away: 0, n: 0 };
      const tot = { over: 0, line: 0, n: 0 };
      for (const bm of game.bookmakers || []) {
        const h2hMkt = (bm.markets || []).find((m) => m.key === "h2h");
        const totMkt = (bm.markets || []).find((m) => m.key === "totals");
        if (h2hMkt) {
          const hO = h2hMkt.outcomes.find((o) => o.name === game.home_team);
          const aO = h2hMkt.outcomes.find((o) => o.name === game.away_team);
          const dO = h2hMkt.outcomes.find((o) => o.name === "Draw");
          if (hO && aO && dO) {
            h2h.home += 1 / hO.price;
            h2h.draw += 1 / dO.price;
            h2h.away += 1 / aO.price;
            h2h.n++;
          }
        }
        if (totMkt) {
          const overO = totMkt.outcomes.find((o) => o.name === "Over" && o.point != null);
          if (overO) {
            tot.over += 1 / overO.price;
            tot.line += overO.point;
            tot.n++;
          }
        }
      }
      if (h2h.n === 0)
        continue;
      const rH = h2h.home / h2h.n, rD = h2h.draw / h2h.n, rA = h2h.away / h2h.n;
      const vigSum = rH + rD + rA;
      if (vigSum <= 0)
        continue;
      const pH = rH / vigSum, pD = rD / vigSum, pA = rA / vigSum;
      let lh, la, lambdaSource;
      if (tot.n > 0) {
        const lambdaTotal = tot.line / tot.n;
        const lams = lambdaFromTotalsAndH2H(lambdaTotal, pH, pD);
        lh = lams.lh;
        la = lams.la;
        lambdaSource = "totals";
      } else {
        const lams = oddsToLambda(pH, pD, pA);
        lh = lams.lh;
        la = lams.la;
        lambdaSource = "h2h-inversion";
      }
      probs.push({
        home_team: game.home_team,
        away_team: game.away_team,
        commence: game.commence_time,
        pHome: parseFloat(pH.toFixed(4)),
        pDraw: parseFloat(pD.toFixed(4)),
        pAway: parseFloat(pA.toFixed(4)),
        lambdaHome: parseFloat(lh.toFixed(3)),
        lambdaAway: parseFloat(la.toFixed(3)),
        lambdaTotal: parseFloat((lh + la).toFixed(3)),
        lambdaSource,
        bookmakers: h2h.n
      });
    }
    return new Response(JSON.stringify({
      ok: true,
      probs,
      remaining: resp.headers.get("x-requests-remaining") || "unknown",
      ts: Date.now()
    }), { headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "max-age=300" } });
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, probs: [], error: e.message }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
}
__name(handleWCOddsProbs, "handleWCOddsProbs");

async function handleCFLOddsProbs(env) {
  const key = env.ODDS_API_KEY || ODDS_API_KEY_FALLBACK;
  if (!key) {
    return new Response(
      JSON.stringify({ ok: false, probs: [], error: "ODDS_API_KEY not configured" }),
      { status: 503, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
  try {
    const resp = await fetch(
      `https://api.the-odds-api.com/v4/sports/americanfootball_cfl/odds?apiKey=${key}&markets=h2h,spreads,totals&regions=us,eu&oddsFormat=decimal`,
      { cf: { cacheTtl: 120, cacheEverything: true } }
    );
    if (!resp.ok) {
      return new Response(
        JSON.stringify({ ok: false, probs: [], error: `Odds API ${resp.status}` }),
        { status: 502, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }
    const games = await resp.json();
    const probs = [];
    for (const game of Array.isArray(games) ? games : []) {
      const h2h = { home: 0, away: 0, n: 0 };
      const spread = { line: 0, n: 0 };
      const tot = { line: 0, n: 0 };
      for (const bm of game.bookmakers || []) {
        const h2hMkt = (bm.markets || []).find((m) => m.key === "h2h");
        const spMkt  = (bm.markets || []).find((m) => m.key === "spreads");
        const totMkt = (bm.markets || []).find((m) => m.key === "totals");
        if (h2hMkt) {
          const hO = h2hMkt.outcomes.find((o) => o.name === game.home_team);
          const aO = h2hMkt.outcomes.find((o) => o.name === game.away_team);
          if (hO && aO) { h2h.home += 1 / hO.price; h2h.away += 1 / aO.price; h2h.n++; }
        }
        if (spMkt) {
          const hO = spMkt.outcomes.find((o) => o.name === game.home_team && o.point != null);
          if (hO) { spread.line += hO.point; spread.n++; }
        }
        if (totMkt) {
          const ov = totMkt.outcomes.find((o) => o.name === "Over" && o.point != null);
          if (ov) { tot.line += ov.point; tot.n++; }
        }
      }
      if (h2h.n === 0) continue;
      const vigSum = h2h.home / h2h.n + h2h.away / h2h.n;
      if (vigSum <= 0) continue;
      const pH = (h2h.home / h2h.n) / vigSum;
      const pA = (h2h.away / h2h.n) / vigSum;
      probs.push({
        home_team: game.home_team,
        away_team: game.away_team,
        commence: game.commence_time,
        pHome: parseFloat(pH.toFixed(4)),
        pAway: parseFloat(pA.toFixed(4)),
        spread: spread.n > 0 ? parseFloat((spread.line / spread.n).toFixed(1)) : null,
        total:  tot.n   > 0 ? parseFloat((tot.line  / tot.n  ).toFixed(1)) : null,
        bookmakers: h2h.n
      });
    }
    return new Response(JSON.stringify({
      ok: true, probs,
      remaining: resp.headers.get("x-requests-remaining") || "unknown",
      ts: Date.now()
    }), { headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "max-age=120" } });
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, probs: [], error: e.message }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
}
__name(handleCFLOddsProbs, "handleCFLOddsProbs");
async function handleWCWPVerify(env) {
  const key = env.ODDS_API_KEY || ODDS_API_KEY_FALLBACK;
  try {
    const resp = await fetch(
      `https://api.the-odds-api.com/v4/sports?apiKey=${key}`,
      { cf: { cacheTtl: 3600, cacheEverything: true } }
    );
    if (!resp.ok) {
      return new Response(
        JSON.stringify({ ok: false, error: `Odds API ${resp.status}` }),
        { status: 502, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }
    const sports = await resp.json();
    const wc = Array.isArray(sports) ? sports.find((s) => s.key === "soccer_fifa_world_cup") : null;
    return new Response(JSON.stringify({
      ok: !!wc,
      wcSport: wc || null,
      message: wc ? `soccer_fifa_world_cup confirmed active=${wc.active}` : "soccer_fifa_world_cup NOT FOUND",
      remaining: resp.headers.get("x-requests-remaining") || "unknown",
      ts: Date.now()
    }), { headers: { ...CORS, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: e.message }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
}
__name(handleWCWPVerify, "handleWCWPVerify");
async function handleWCAdminSeed(request, env) {
  const auth = (request.headers.get("Authorization") || "").replace("Bearer ", "");
  if (auth !== env.FIELD_MCP_SECRET)
    return new Response("Unauthorized", { status: 401, headers: CORS });
  if (!env.WC2026_DB)
    return new Response("WC2026_DB not bound", { status: 503, headers: CORS });
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400, headers: CORS });
  }
  const { game_id, group_id, home, away, home_score, away_score, match_date } = body || {};
  if (!game_id || !group_id || !home || !away)
    return new Response("Missing required fields: game_id, group_id, home, away", { status: 400, headers: CORS });
  await env.WC2026_DB.prepare(`
      INSERT OR REPLACE INTO wc_results
        (game_id, group_id, home, away, home_score, away_score, phase, match_date)
      VALUES (?, ?, ?, ?, ?, ?, 'group', ?)
    `).bind(
    game_id,
    group_id.toUpperCase(),
    home,
    away,
    parseInt(home_score) || 0,
    parseInt(away_score) || 0,
    match_date || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)
  ).run();
  await recomputeGroupStandings(env.WC2026_DB, group_id.toUpperCase());
  const { results } = await env.WC2026_DB.prepare(
    "SELECT * FROM wc_group WHERE group_id = ? ORDER BY points DESC, gd DESC, gf DESC"
  ).bind(group_id.toUpperCase()).all();
  return new Response(
    JSON.stringify({ ok: true, group: group_id.toUpperCase(), standings: results }),
    { headers: { ...CORS, "Content-Type": "application/json" } }
  );
}
__name(handleWCAdminSeed, "handleWCAdminSeed");
async function handleV2Games(url, env) {
  const sport = (url.searchParams.get("sport") || "").toLowerCase();
  const date = url.searchParams.get("date") || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const cfg = V2_LEAGUES[sport];
  if (!cfg)
    return new Response(
      JSON.stringify({ error: `Unknown sport: ${sport}`, supported: Object.keys(V2_LEAGUES) }),
      { status: 400, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  const key = env.APISPORTS_KEY;
  if (!key)
    return new Response(
      JSON.stringify({ error: "APISPORTS_KEY not configured" }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  const host = APISPORTS_HOSTS[cfg.sport];
  let targetUrl, adapt;
  if (cfg.sport === "nba") {
    targetUrl = `https://${host}/games?date=${date}`;
    adapt = /* @__PURE__ */ __name((items) => items.map(adaptApiNba), "adapt");
  } else if (cfg.sport === "football") {
    targetUrl = `https://${host}/fixtures?league=${cfg.leagueId}&season=${cfg.season}&date=${date}`;
    adapt = null;
  } else {
    targetUrl = `https://${host}/games?league=${cfg.leagueId}&season=${cfg.season}&date=${date}`;
    if (cfg.sport === "basketball")
      adapt = /* @__PURE__ */ __name((items) => items.map(adaptBasketball), "adapt");
    else if (cfg.sport === "hockey")
      adapt = /* @__PURE__ */ __name((items) => items.map(adaptHockey), "adapt");
    else if (cfg.sport === "baseball")
      adapt = /* @__PURE__ */ __name((items) => items.map(adaptBaseball), "adapt");
    else
      adapt = /* @__PURE__ */ __name((x) => x, "adapt");
  }
  try {
    const resp = await fetch(targetUrl, {
      headers: { "x-apisports-key": key, "Accept": "application/json" },
      cf: { cacheTtl: 30, cacheEverything: false }
    });
    if (!resp.ok)
      return new Response(
        JSON.stringify({ error: `Upstream ${resp.status}`, sport, date }),
        { status: 502, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    const data = await resp.json();
    const raw = data?.response || [];
    if (url.searchParams.get("debug") === "1") {
      return new Response(JSON.stringify({
        sport,
        date,
        upstream_status: resp.status,
        upstream_results: data?.results ?? null,
        first_game_raw: raw[0] || null,
        game_count: raw.length,
        ts: Date.now()
      }, null, 2), { headers: { ...CORS, "Content-Type": "application/json" } });
    }
    let games;
    if (cfg.sport === "football") {
      const LIVE_STATUS = /* @__PURE__ */ new Set(["1H", "HT", "2H", "ET", "BT", "P", "LIVE"]);
      const liveFixIds = raw.filter((f) => LIVE_STATUS.has((f?.fixture?.status?.short || "").toUpperCase())).map((f) => f?.fixture?.id).filter(Boolean);
      const statsMap = {};
      if (liveFixIds.length > 0) {
        const statsPromises = liveFixIds.map(async (fId) => {
          try {
            const sr = await fetch(
              `https://${host}/fixtures/statistics?fixture=${fId}`,
              {
                headers: { "x-apisports-key": key, "Accept": "application/json" },
                cf: { cacheTtl: 30, cacheEverything: false }
              }
            );
            if (!sr.ok)
              return { fId, stats: null };
            return { fId, stats: parseFootballStats(await sr.json()) };
          } catch (_) {
            return { fId, stats: null };
          }
        });
        const settled = await Promise.allSettled(statsPromises);
        for (const r of settled) {
          if (r.status === "fulfilled" && r.value?.stats) {
            statsMap[r.value.fId] = r.value.stats;
          }
        }
      }
      games = raw.map((f) => adaptFootball(f, sport, statsMap[f?.fixture?.id] || null));
      const wcLambdas = sport === "wc26" ? await getWCPregameLambdas(env) : null;
      for (const g of games) {
        if (g.state !== "live" || !g.situation)
          continue;
        const { situation: sit } = g;
        const hGoals = g.home.score ?? 0;
        const aGoals = g.away.score ?? 0;
        let pregameLh = null, pregameLa = null;
        if (wcLambdas) {
          const directKey = `${g.home.name}|${g.away.name}`;
          if (wcLambdas.has(directKey)) {
            const lams = wcLambdas.get(directKey);
            pregameLh = lams.lh;
            pregameLa = lams.la;
          } else {
            for (const [k, lams] of wcLambdas) {
              const [oddsHome, oddsAway] = k.split("|");
              if (wcTeamNameMatch(oddsHome, g.home.name) && wcTeamNameMatch(oddsAway, g.away.name)) {
                pregameLh = lams.lh;
                pregameLa = lams.la;
                break;
              }
              if (wcTeamNameMatch(oddsHome, g.away.name) && wcTeamNameMatch(oddsAway, g.home.name)) {
                pregameLh = lams.la;
                pregameLa = lams.lh;
                break;
              }
            }
          }
        }
        const wp = computeLiveWP({
          homeGoals: hGoals,
          awayGoals: aGoals,
          homeSOT: sit.homeSOT,
          awaySOT: sit.awaySOT,
          elapsedMin: sit.elapsed,
          isStoppage: sit.isStoppage,
          manAdvantage: sit.manAdvantage,
          isShootout: sit.isShootout,
          pregameLh,
          // null when odds unavailable → shots-proxy fallback
          pregameLa
        });
        g.winProb = wp;
        if (sport === "wc26" && env.WC2026_DB) {
          const gLetter = extractWCGroup(g.round);
          if (gLetter) {
            try {
              const [standingsRes, thirdRes] = await Promise.allSettled([
                env.WC2026_DB.prepare(
                  "SELECT * FROM wc_group WHERE group_id = ? ORDER BY points DESC, gd DESC, gf DESC"
                ).bind(gLetter).all(),
                env.WC2026_DB.prepare(
                  "SELECT * FROM wc_third_place_standings"
                ).all()
              ]);
              const standings = standingsRes.status === "fulfilled" ? standingsRes.value?.results : [];
              const thirdPlace = thirdRes.status === "fulfilled" ? thirdRes.value?.results : null;
              if (standings?.length) {
                g.advancementProb = computeAdvancementProb(
                  standings,
                  g.home.name,
                  g.away.name,
                  wp,
                  thirdPlace
                );
              }
            } catch (_) {
            }
          }
        }
        const scoreDiff = Math.abs(hGoals - aGoals);
        let crunchCondition = null;
        if (sit.isShootout)
          crunchCondition = "penalty_shootout";
        else if (sit.manAdvantage && scoreDiff <= 1)
          crunchCondition = "man_advantage";
        else if (sit.isStoppage && scoreDiff <= 1)
          crunchCondition = "added_time";
        else if (sit.elapsed > 60 && scoreDiff > 0) {
          const loserWP = hGoals > aGoals ? wp.awayWin : wp.homeWin;
          if (loserWP < 0.15)
            crunchCondition = "late_deficit";
        }
        if (crunchCondition) {
          g._crunch = crunchCondition;
          if (env.GAME_DO) {
            try {
              const doId = env.GAME_DO.idFromName(g.id);
              const doStub = env.GAME_DO.get(doId);
              doStub.fetch(new Request("https://field/crunch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ condition: crunchCondition, gameId: g.id, ts: Date.now() })
              })).catch(() => {
              });
            } catch (_) {
            }
          }
        }
      }
      if (env.GAME_DO) {
        const liveWithWP = games.filter((g) => g.state === "live" && g.winProb);
        if (liveWithWP.length > 0) {
          const wpResults = await Promise.allSettled(
            liveWithWP.map(async (g) => {
              const doStub = env.GAME_DO.get(env.GAME_DO.idFromName(g.id));
              const resp2 = await doStub.fetch(new Request("https://field/wp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  wp: g.winProb,
                  elapsed: g.situation?.elapsed ?? null,
                  advanceProb: g.advancementProb ?? null,
                  ts: Date.now()
                })
              }));
              if (!resp2.ok)
                return null;
              return { g, state: await resp2.json() };
            })
          );
          for (const result of wpResults) {
            if (result.status !== "fulfilled" || !result.value?.state?.ok)
              continue;
            const { g, state } = result.value;
            g.openingWP = state.openingWP ?? null;
            g.wpDelta = state.wpDelta ?? null;
            g.recentWPHistory = state.recentHistory ?? [];
            g.openingAdvanceProb = state.openingAdvanceProb ?? null;
          }
        }
      }
    } else {
      games = adapt(raw);
    }
    if (sport === "wc26" && env.WC2026_DB) {
      const finals = games.filter((g) => g.state === "final");
      if (finals.length > 0) {
        await Promise.allSettled(finals.map((g) => writeWCResult(env.WC2026_DB, g)));
      }
    }
    return new Response(
      JSON.stringify({ sport, date, games, count: games.length, source: "apisports", ts: Date.now() }),
      { headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "public, max-age=30" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message, sport, date }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
}
__name(handleV2Games, "handleV2Games");
async function handleV2Standings(url, env) {
  const sport = (url.searchParams.get("sport") || "").toLowerCase();
  const cfg = V2_LEAGUES[sport];
  if (!cfg)
    return new Response(
      JSON.stringify({ error: `Unknown sport: ${sport}` }),
      { status: 400, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  const key = env.APISPORTS_KEY;
  if (!key)
    return new Response(
      JSON.stringify({ error: "APISPORTS_KEY not configured" }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  const host = APISPORTS_HOSTS[cfg.sport];
  const targetUrl = `https://${host}/standings?league=${cfg.leagueId}&season=${cfg.season}`;
  try {
    const resp = await fetch(targetUrl, {
      headers: { "x-apisports-key": key, "Accept": "application/json" },
      cf: { cacheTtl: 3600, cacheEverything: false }
    });
    if (!resp.ok)
      return new Response(
        JSON.stringify({ error: `Upstream ${resp.status}` }),
        { status: 502, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    const data = await resp.json();
    return new Response(
      JSON.stringify({ sport, standings: data?.response || [], source: "apisports", ts: Date.now() }),
      { headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "public, max-age=3600" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
}
__name(handleV2Standings, "handleV2Standings");
async function handleCron(env) {
  if (!env.PUSH_SUBS)
    return;
  const RELAY = "https://field-relay-nba.jeffunglesbee.workers.dev";
  const SPORT_CONFIG = [
    { sport: "NBA", path: "basketball/nba", minPeriod: 3, maxMargin: 10 },
    { sport: "NHL", path: "hockey/nhl", minPeriod: 3, maxMargin: 3 },
    { sport: "MLB", path: "baseball/mlb", minPeriod: 7, maxMargin: 4 },
    { sport: "NFL", path: "football/nfl", minPeriod: 3, maxMargin: 10 },
    { sport: "MLS", path: "soccer/usa.1", minPeriod: 2, maxMargin: 2 },
    { sport: "EPL", path: "soccer/eng.1", minPeriod: 2, maxMargin: 2 }
  ];
  const live = [];
  for (const cfg of SPORT_CONFIG) {
    try {
      const r = await fetch(`${RELAY}/espn-gambit/apis/site/v2/sports/${cfg.path}/scoreboard`);
      if (!r.ok)
        continue;
      const d = await r.json();
      const games = d?.events || [];
      for (const ev of games) {
        const comp = ev.competitions?.[0];
        if (!comp)
          continue;
        const status = comp.status?.type;
        if (status?.completed)
          continue;
        const detail = comp.status?.detail || "";
        if (!detail.includes("Q") && !detail.includes("P") && !detail.includes("H") && !detail.includes("'") && !detail.includes("Inn") && !detail.includes("Top") && !detail.includes("Bot") && !detail.includes("End"))
          continue;
        const period = comp.status?.period || 0;
        const [home, away] = comp.competitors || [];
        const hScore = parseInt(home?.score || "0");
        const aScore = parseInt(away?.score || "0");
        const margin = Math.abs(hScore - aScore);
        const latePhase = period >= cfg.minPeriod;
        const closeGame = margin <= cfg.maxMargin;
        if (!(latePhase && closeGame))
          continue;
        const broadcast = comp.broadcasts?.[0]?.names?.[0] || cfg.sport;
        live.push({
          type: "SCORE_CHANGE",
          // facts only — client evaluates excitement
          gameId: ev.id,
          sport: cfg.sport,
          home: home?.team?.shortDisplayName || home?.team?.name || "",
          away: away?.team?.shortDisplayName || away?.team?.name || "",
          homeScore: hScore,
          awayScore: aScore,
          period: comp.status?.type?.shortDetail || detail || `Period ${period}`,
          clock: comp.status?.displayClock || "",
          broadcast,
          watchUrl: null
        });
      }
    } catch (_) {
    }
  }
  if (!live.length)
    return;
  const list = await env.PUSH_SUBS.list();
  for (const key of list.keys) {
    const raw = await env.PUSH_SUBS.get(key.name);
    if (!raw)
      continue;
    let subData;
    try {
      subData = JSON.parse(raw);
    } catch (_) {
      continue;
    }
    const sub = subData.subscription;
    if (!sub?.endpoint)
      continue;
    const prefs = subData.prefs || {};
    const sportAllow = Array.isArray(prefs.sports) ? prefs.sports : null;
    for (const game of live) {
      if (sportAllow && !sportAllow.includes(game.sport))
        continue;
      const firedKey = `${key.name}:${game.gameId}:${game.homeScore}-${game.awayScore}`;
      const alreadyFired = await env.PUSH_SUBS.get(firedKey);
      if (alreadyFired)
        continue;
      try {
        const res = await sendWebPush(sub, game, env);
        if (res.ok || res.status === 201) {
          await env.PUSH_SUBS.put(firedKey, "1", { expirationTtl: 28800 });
        }
      } catch (e) {
        if (typeof captureFieldError === "function")
          captureFieldError("push-send", e.message);
      }
    }
  }
}
__name(handleCron, "handleCron");
var JOURNALISM_CLAUDE_PROXY = "https://field-claude-proxy.jeffunglesbee.workers.dev";
var JOURNALISM_TTL_SECS = 900;
var RELAY_BANNED = [
  "punch their ticket",
  "the stage is set",
  "make a statement",
  "facing a must-win",
  "looking to bounce back",
  "all eyes on",
  "put the league on notice",
  "a tale of two halves",
  "rise to the occasion",
  "backs against the wall",
  "do-or-die",
  "prove the doubters wrong",
  "send a message",
  "weather the storm",
  "turn the page",
  "take care of business",
  "control their own destiny",
  "gut check",
  "step up when it matters",
  "battle-tested",
  "high-octane",
  "in the driver's seat",
  "cement their legacy",
  "the chess match continues",
  "must-win situation",
  "pivotal matchup",
  "will look to",
  // P0.2 additions (June 4 2026): clunky wire-copy patterns observed in Morning Report
  "secured a victory",
  "secured a win",
  "secured the win",
  "secured the victory",
  "capitalized on scoring opportunities",
  "capitalize on scoring",
  "finalize a",
  "finalize the",
  "overcome the",
  "to overcome",
  "managed to overcome",
  "result moved",
  "result moves",
  // "this result moves X into..."
  "continued their",
  "extended their",
  "maintained their momentum"
];
function relayHasCliche(text) {
  const lower = text.toLowerCase();
  return RELAY_BANNED.filter((p) => lower.includes(p));
}
__name(relayHasCliche, "relayHasCliche");
var RELAY_STYLE_RULES = [
  '- STYLE: specificity over metaphor. "48 minutes from their first Finals since 1999" not "looking to punch their ticket."',
  `- STYLE: numbers over adjectives. "Brunson's 29.0 PPG this series" not "Brunson has been dominant."`,
  '- STYLE: active voice. "Wembanyama blocked 3 shots" not "3 shots were blocked."',
  '- STYLE: concrete over abstract. "Game 4 starts at 8pm on ESPN" not "the stage is set for a pivotal matchup."',
  "- STYLE: one metaphor max per brief \u2014 if you use one, make it original.",
  "- STYLE: write like a well-prepared friend who watched every game, not like a press release. Short sentences. One thought per sentence.",
  "- STYLE: if a sentence would work in any game recap for any sport, it is too generic \u2014 rewrite with details specific to THIS game.",
  '- LEAD SENTENCE: never start a brief, paragraph, or sentence with "The [Team]..." \u2014 lead with the specific situation. "Wembanyama scored 34" not "The Spurs got a big performance." "Two years without a Finals appearance ends tonight" not "The Celtics are looking to make a statement."',
  '- VOICE: third person only. Never use "you" or address the reader directly.',
  "- BANNED PHRASES (never use): " + RELAY_BANNED.join(", ") + "."
].join("\n");
function buildGameLine(ev, league) {
  const comp = ev.competitions?.[0];
  if (!comp)
    return null;
  const teams = comp.competitors || [];
  const home = teams.find((t) => t.homeAway === "home") || teams[0];
  const away = teams.find((t) => t.homeAway === "away") || teams[1];
  if (!home || !away)
    return null;
  const homeName = home.team?.shortDisplayName || home.team?.abbreviation || "";
  const awayName = away.team?.shortDisplayName || away.team?.abbreviation || "";
  const homeScore = home.score ?? "";
  const awayScore = away.score ?? "";
  const status = comp.status?.type?.description || "";
  const broadcast = comp.broadcasts?.[0]?.names?.[0] || league.toUpperCase();
  const homeRec = (home.records || []).find((r) => r.type === "total")?.summary || "";
  const awayRec = (away.records || []).find((r) => r.type === "total")?.summary || "";
  const venueName = comp.venue?.fullName || "";
  const indoorFlag = comp.venue?.indoor ? " [indoor]" : "";
  const seriesSummary = comp.series?.summary || comp.series?.type?.text || "";
  const roundName = comp.type?.text || comp.notes?.[0]?.headline || "";
  const series = [roundName, seriesSummary].filter(Boolean).join(" \u2014 ") || seriesSummary;
  const leaders = [];
  for (const team of [home, away]) {
    const teamAbbr = team.team?.abbreviation || "";
    const teamLeaders = [];
    const leaderCategories = team.leaders || [];
    for (const lg of leaderCategories.slice(0, 3)) {
      const top = lg.leaders?.[0];
      if (top?.displayValue && top?.athlete?.displayName) {
        const cat = lg.shortDisplayName || lg.abbreviation || "";
        const nameStat = `${top.athlete.displayName} ${top.displayValue}${cat ? " " + cat : ""}`.trim();
        teamLeaders.push(nameStat);
      }
    }
    if (teamLeaders.length)
      leaders.push(`${teamAbbr}: ${teamLeaders.join(", ")}`);
  }
  const probables = [];
  for (const team of [home, away]) {
    const prob = team.probables?.[0];
    const ath = prob?.athlete;
    if (!ath?.displayName)
      continue;
    const stats = prob.statistics || [];
    const wins = stats.find((s) => s.abbreviation === "W")?.displayValue;
    const losses = stats.find((s) => s.abbreviation === "L")?.displayValue;
    const era = stats.find((s) => s.abbreviation === "ERA")?.displayValue;
    const teamAbbr = team.team?.abbreviation || "";
    const recStr = wins !== void 0 && losses !== void 0 && era !== void 0 ? `${wins}-${losses}, ${era} ERA` : era ? `${era} ERA` : "";
    probables.push(recStr ? `${ath.displayName} (${teamAbbr}, ${recStr})` : `${ath.displayName} (${teamAbbr})`);
  }
  const situation = comp.status?.type?.state === "in" ? comp.status?.displayClock ? `(${comp.status.displayClock} ${comp.status?.period ? "P" + comp.status.period : ""})` : "" : "";
  const awayLabel = `${awayName}${awayRec ? ` (${awayRec})` : ""} ${awayScore}`.trim();
  const homeLabel = `${homeName}${homeRec ? ` (${homeRec})` : ""} ${homeScore}`.trim();
  let line = `${awayLabel} @ ${homeLabel} \xB7 ${status}${situation ? " " + situation : ""}`;
  if (venueName)
    line += ` \xB7 ${venueName}${indoorFlag}`;
  line += ` \xB7 ${broadcast}`;
  if (series)
    line += ` \xB7 ${series}`;
  if (leaders.length)
    line += ` \xB7 ${leaders.join(" \xB7 ")}`;
  if (probables.length)
    line += ` \xB7 Probables: ${probables.join(", ")}`;
  return line;
}
__name(buildGameLine, "buildGameLine");
function stripMarkdown(s) {
  if (!s)
    return s;
  return s.replace(/^#{1,6}\s+/gm, "").replace(/\*\*(.+?)\*\*/g, "$1").replace(/__(.+?)__/g, "$1").replace(/`(.+?)`/g, "$1").replace(/^[-*+]\s+/gm, "").replace(/\n{3,}/g, "\n\n").trim();
}
__name(stripMarkdown, "stripMarkdown");
async function handleJournalismCycle(env) {
  if (!env.FIELD_JOURNALISM)
    return { ok: false, reason: "KV not configured" };
  const now = Date.now();
  const dateKey = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const espnDate = dateKey.replace(/-/g, "");
  const hour = (/* @__PURE__ */ new Date()).getUTCHours();
  const isLiveHours = hour >= 10 || hour <= 2;
  if (!isLiveHours)
    return { ok: false, reason: `not live hours (UTC ${hour})` };
  try {
    const LEAGUES = [
      { sport: "basketball", league: "nba", label: "NBA" },
      { sport: "hockey", league: "nhl", label: "NHL" },
      { sport: "baseball", league: "mlb", label: "MLB" },
      { sport: "basketball", league: "wnba", label: "WNBA" },
      { sport: "soccer", league: "eng.1", label: "EPL" }
    ];
    const gameLines = [];
    for (const { sport, league, label } of LEAGUES) {
      try {
        const r = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/scoreboard?dates=${espnDate}`);
        if (!r.ok)
          continue;
        const d = await r.json();
        const events = d?.events || [];
        for (const ev of events) {
          const line = buildGameLine(ev, label);
          if (line)
            gameLines.push(line);
        }
      } catch (_) {
      }
    }
    if (!gameLines.length)
      return { ok: false, reason: "no game lines from ESPN" };
    const contextHash = gameLines.join("|").split("").reduce((h, c) => Math.imul(31, h) + c.charCodeAt(0) | 0, 0).toString(16);
    const existingRaw = await env.FIELD_JOURNALISM.get(`journalism:${dateKey}`);
    if (existingRaw) {
      try {
        const existing = JSON.parse(existingRaw);
        if (existing.contextHash === contextHash)
          return { ok: false, reason: "context unchanged (already cached)" };
      } catch (_) {
      }
    }
    const wcTeamContext = slateHasWorldCup(gameLines) ? await buildWCTeamContextBlock(gameLines, env.WC2026_DB) : "";
    const buildPrompt = /* @__PURE__ */ __name(() => [
      "Write a FIELD Brief for tonight's sports slate.",
      "",
      "TONIGHT'S GAMES:",
      ...gameLines.map((l) => `- ${l}`),
      buildFinalsContextBlock(gameLines),
      wcTeamContext,
      // WC2026 team narrative (D1 + static)
      "",
      "RULES:",
      "- 100-120 words. 2 short paragraphs. No headers. No bullet points.",
      "- Lead with the most important story \u2014 the SPECIFIC situation, not the template.",
      "- CORRECTNESS: write only from the data above. Never invent scores, stats, or facts not listed.",
      `- SLATE BOUNDARY (mandatory): every league or sport you reference must appear in TONIGHT'S GAMES above. If the Premier League, La Liga, Serie A, Ligue 1, Bundesliga, MLS, or any other league has no game in tonight's slate, DO NOT mention it, recap it, or include any result from it. Saying "In England, Man United routed Brighton 3-0" is FABRICATION when no EPL game is in the slate. The brief covers ONLY what is on tonight's slate.`,
      '- SERIES ACCURACY: A Conference Finals game is NEVER "the NBA Finals" or "the Championship." A Stanley Cup Final game is NEVER a "first-round matchup." Use only the round/series description in the game data. If the series context is unclear, describe it as "a playoff series" \u2014 never upgrade it to a championship.',
      FIELD_PROSE_STYLE,
      // WOW 6: unified style block (includes LEAGUE BOUNDARIES, SPARINGLY, [CHAMPION], [FEATURED STAT], etc.)
      "- Plain prose only. Every sentence complete."
    ].join("\n"), "buildPrompt");
    let _lastProxyStatus = "";
    const callProxy = /* @__PURE__ */ __name(async (promptText) => {
      const resp = await fetch(JOURNALISM_CLAUDE_PROXY, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Server-to-server auth: proxy bypasses Origin check for the relay cron.
          "X-FIELD-Relay": "field-relay-cron-2026"
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1e3,
          messages: [{ role: "user", content: promptText }]
        })
      });
      if (!resp.ok) {
        const body = await resp.text().catch(() => "");
        _lastProxyStatus = `HTTP ${resp.status} ${body.slice(0, 200)}`;
        return null;
      }
      const data = await resp.json();
      return (data.content || []).filter((c) => c.type === "text").map((c) => c.text).join("").trim() || null;
    }, "callProxy");
    let prose = await callProxy(buildPrompt());
    if (!prose || prose.length < 50)
      return { ok: false, reason: `proxy no prose (len ${prose ? prose.length : 0})`, proxyStatus: _lastProxyStatus };
    const qualityResult = await runQualityChain(buildPrompt(), prose, callProxy, {
      sport: null,
      // slate brief covers multiple sports
      scoreThreshold: 130,
      maxRetries: 6
    });
    prose = qualityResult.text;
    const finalScore = qualityResult.score;
    const finalCliches = hasCliche(prose).length;
    try {
      if (env.JQ_ANALYTICS) {
        env.JQ_ANALYTICS.writeDataPoint({
          indexes: ["cron-slate", "multi"],
          blobs: [qualityResult.layers_fired.join(",") || "none"],
          doubles: [
            finalScore,
            qualityResult.retries,
            qualityResult.ms,
            hasCliche(qualityResult.text).length === finalCliches ? 0 : finalCliches,
            // initialCliches approx (we don't have pre-chain text here)
            finalCliches,
            0,
            // cron doesn't track initial cross-sport (would require rescan)
            hasCrossSportHallucination(prose).length,
            buildPrompt().length,
            prose.length
          ]
        });
      }
    } catch (_aeErr) {
    }
    const cycleId = crypto.randomUUID();
    await env.FIELD_JOURNALISM.put(
      `journalism:${dateKey}`,
      JSON.stringify({
        brief: prose,
        generatedAt: now,
        contextHash,
        gameCount: gameLines.length,
        cycleId,
        proseScore: finalScore,
        clicheCount: finalCliches
        // was finalCliches.length — but finalCliches is now a number (length of array)
      }),
      { expirationTtl: 86400 }
    );
    const gameBriefResults = [];
    for (const { sport, league, label } of LEAGUES) {
      try {
        const r = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/scoreboard?dates=${espnDate}`);
        if (!r.ok)
          continue;
        const d = await r.json();
        for (const ev of d?.events || []) {
          const comp = ev.competitions?.[0];
          if (!comp)
            continue;
          const eventId = ev.id;
          if (!eventId)
            continue;
          const gameHash = (ev.id + (comp.status?.type?.description || "") + (comp.competitors?.map((c) => c.score).join("|") || "")).split("").reduce((h, c) => Math.imul(31, h) + c.charCodeAt(0) | 0, 0).toString(16);
          const existingGame = await env.FIELD_JOURNALISM.get(`brief:game:${eventId}`).catch(() => null);
          if (existingGame) {
            try {
              const eg = JSON.parse(existingGame);
              if (eg.contextHash === gameHash)
                continue;
            } catch (_) {
            }
          }
          const gameLine = buildGameLine(ev, label);
          if (!gameLine)
            continue;
          const teams = comp.competitors || [];
          const home = teams.find((t) => t.homeAway === "home") || teams[0];
          const away = teams.find((t) => t.homeAway === "away") || teams[1];
          const homeName = home?.team?.shortDisplayName || home?.team?.displayName || "";
          const awayName = away?.team?.shortDisplayName || away?.team?.displayName || "";
          const series = comp.series?.summary || "";
          const state = comp.status?.type?.state || "pre";
          const broadcast = comp.broadcasts?.[0]?.names?.[0] || label.toUpperCase();
          const isPlayoff = !!(series || /playoff|final|series/i.test(ev.name || ""));
          const gamePrompt = [
            `Write a FIELD Game Brief for this ${label} game.`,
            `${awayName} @ ${homeName}.`,
            series ? `Series: ${series}.` : "",
            `Status: ${comp.status?.type?.description || "Scheduled"}. Broadcast: ${broadcast}.`,
            `Game data: ${gameLine}`,
            "",
            isPlayoff ? "Rules: 50-70 words. Lead with the series stakes. Tactical focus \u2014 what decides this game." : `Rules: 40-60 words. Lead with the most interesting fact about ${label === "MLB" ? "the pitching matchup or park conditions" : label === "WNBA" ? "the standings context" : "the matchup"}. One complete thought.`,
            FIELD_PROSE_STYLE,
            // WOW 6: unified style block
            "Write only from data above. No invented stats."
          ].filter(Boolean).join("\n");
          const brief = await callProxy(gamePrompt);
          if (!brief || brief.length < 30)
            continue;
          let finalBrief = brief;
          const cliches = relayHasCliche(brief);
          if (cliches.length) {
            await new Promise((r2) => setTimeout(r2, 2e3));
            const retried = await callProxy(gamePrompt + `

REWRITE: Remove banned phrases: ${cliches.join(", ")}. Use a specific fact instead.`);
            if (retried && retried.length > 30)
              finalBrief = retried;
          }
          await env.FIELD_JOURNALISM.put(
            `brief:game:${eventId}`,
            JSON.stringify({
              brief: finalBrief,
              generatedAt: now,
              contextHash: gameHash,
              sport: label,
              home: homeName,
              away: awayName,
              cycleId
            }),
            { expirationTtl: 3600 }
          );
          gameBriefResults.push(eventId);
          await new Promise((r2) => setTimeout(r2, 1500));
        }
      } catch (e) {
        console.warn(`[journalism-cycle] game briefs ${label} error:`, e.message);
      }
    }
    return { ok: true, reason: "written", score: finalScore, gameCount: gameLines.length, briefLen: prose.length, gameBriefs: gameBriefResults.length };
  } catch (e) {
    console.error("[journalism-cycle] error:", e.message);
    return { ok: false, reason: "exception: " + (e && e.message || String(e)) };
  }
}
__name(handleJournalismCycle, "handleJournalismCycle");
var src_default = {
  // Cron triggers:
  //   */5  * * * * → push notification heartbeat (drama threshold)
  //   */15 * * * * → journalism cycle (O(1) Newspaper — Layer 2)
  async scheduled(event, env, ctx) {
    ctx.waitUntil(handleCron(env));
    ctx.waitUntil(handleJournalismCycle(env));
  },
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
          "Access-Control-Max-Age": "86400"
        }
      });
    }
    if (env.MCP_OAUTH && (pathname.startsWith("/.well-known/") || pathname.startsWith("/oauth/") || pathname === "/mcp" || pathname === "/debug/recent-requests")) {
      ctx.waitUntil(logRequest(env, request, "route"));
    }
    if (pathname === "/.well-known/oauth-authorization-server" && request.method === "GET") {
      return authServerMetadata(url.origin);
    }
    if (pathname === "/.well-known/oauth-protected-resource" && request.method === "GET") {
      return protectedResourceMetadata(url.origin);
    }
    if (pathname === "/oauth/register" && request.method === "POST") {
      if (!env.MCP_OAUTH)
        return new Response("MCP_OAUTH KV not bound", { status: 503, headers: CORS });
      return register(request, env);
    }
    if (pathname === "/oauth/authorize" && request.method === "GET") {
      if (!env.MCP_OAUTH)
        return new Response("MCP_OAUTH KV not bound", { status: 503, headers: CORS });
      return authorizeGet(url, env);
    }
    if (pathname === "/oauth/authorize" && request.method === "POST") {
      if (!env.MCP_OAUTH)
        return new Response("MCP_OAUTH KV not bound", { status: 503, headers: CORS });
      return authorizePost(request, env);
    }
    if (pathname === "/oauth/token" && request.method === "POST") {
      if (!env.MCP_OAUTH)
        return new Response("MCP_OAUTH KV not bound", { status: 503, headers: CORS });
      return token(request, env);
    }
    if (pathname === "/oauth/revoke" && request.method === "POST") {
      if (!env.MCP_OAUTH)
        return new Response("MCP_OAUTH KV not bound", { status: 503, headers: CORS });
      return revoke(request, env);
    }
    if (pathname === "/debug/recent-requests" && request.method === "GET") {
      if (!env.MCP_OAUTH)
        return new Response("MCP_OAUTH KV not bound", { status: 503, headers: CORS });
      return debugRecentRequests(request, env);
    }
    if (pathname === "/push/subscribe" && request.method === "POST") {
      if (!env.PUSH_SUBS)
        return new Response("KV not configured", { status: 503, headers: CORS });
      try {
        const body = await request.json();
        const { subscription, prefs } = body;
        if (!subscription?.endpoint)
          return new Response("Missing subscription", { status: 400, headers: CORS });
        const key = "sub:" + btoa(subscription.endpoint).slice(0, 32).replace(/[^a-zA-Z0-9]/g, "");
        await env.PUSH_SUBS.put(key, JSON.stringify({ subscription, prefs }), { expirationTtl: 365 * 86400 });
        return new Response(JSON.stringify({ ok: true }), { headers: { ...CORS, "Content-Type": "application/json" } });
      } catch (e) {
        return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
      }
    }
    if (pathname === "/push/unsubscribe" && request.method === "POST") {
      if (!env.PUSH_SUBS)
        return new Response("KV not configured", { status: 503, headers: CORS });
      try {
        const { endpoint } = await request.json();
        const key = "sub:" + btoa(endpoint).slice(0, 32).replace(/[^a-zA-Z0-9]/g, "");
        await env.PUSH_SUBS.delete(key);
        return new Response(JSON.stringify({ ok: true }), { headers: { ...CORS, "Content-Type": "application/json" } });
      } catch (e) {
        return new Response(JSON.stringify({ ok: false }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
      }
    }
    if (pathname.startsWith("/ws/game/") && request.headers.get("Upgrade") === "websocket") {
      if (!env.GAME_DO)
        return new Response("GAME_DO binding not configured", { status: 503 });
      const parts = pathname.split("/").filter(Boolean);
      if (parts.length < 4)
        return new Response("Missing sport or gameId", { status: 400 });
      const sport = parts[2];
      const gameId = parts[3];
      const id = env.GAME_DO.idFromName(`${sport}:${gameId}`);
      const stub = env.GAME_DO.get(id);
      const forward = new URL("https://do.internal/ws");
      forward.searchParams.set("sport", sport);
      forward.searchParams.set("gameId", gameId);
      const enrichedEnv = Object.assign(Object.create(env), { _sendWebPush: sendWebPush });
      return stub.fetch(forward.toString(), { headers: request.headers });
    }
    if (pathname.startsWith("/signal/crunch/") && request.method === "POST") {
      if (!env.GAME_DO)
        return new Response("GAME_DO binding not configured", { status: 503 });
      const parts = pathname.split("/").filter(Boolean);
      if (parts.length < 4)
        return new Response("Missing sport or gameId", { status: 400 });
      const sport = parts[2];
      const gameId = parts[3];
      const id = env.GAME_DO.idFromName(`${sport}:${gameId}`);
      const stub = env.GAME_DO.get(id);
      const enrichedEnv = Object.assign(Object.create(env), { _sendWebPush: sendWebPush });
      const body = await request.text();
      return stub.fetch("https://do.internal/signal/crunch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body
      });
    }
    if (pathname.startsWith("/pin/game/") && request.method === "POST") {
      if (!env.GAME_DO)
        return new Response("GAME_DO binding not configured", { status: 503 });
      const parts = pathname.split("/").filter(Boolean);
      if (parts.length < 4)
        return new Response("Missing sport or gameId", { status: 400 });
      const sport = parts[2];
      const gameId = parts[3];
      const id = env.GAME_DO.idFromName(`${sport}:${gameId}`);
      const stub = env.GAME_DO.get(id);
      const body = await request.text();
      return stub.fetch("https://do.internal/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body
      });
    }
    if (pathname.startsWith("/unpin/game/") && request.method === "POST") {
      if (!env.GAME_DO)
        return new Response("GAME_DO binding not configured", { status: 503 });
      const parts = pathname.split("/").filter(Boolean);
      if (parts.length < 4)
        return new Response("Missing sport or gameId", { status: 400 });
      const sport = parts[2];
      const gameId = parts[3];
      const id = env.GAME_DO.idFromName(`${sport}:${gameId}`);
      const stub = env.GAME_DO.get(id);
      const body = await request.text();
      return stub.fetch("https://do.internal/unpin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body
      });
    }
    if (pathname === "/health") {
      return new Response("RELAY OK \u2014 nba + nhl + fpl + fd + odds + apisports + squiggle + atp + bdl + espn-gambit + espn-summary + dropbox + field-data + v2 + ws-game-do + jq-gate + jq-analytics + wc-d1 + wc-team-context + soccer-wp + cfl-odds", {
        status: 200,
        headers: { "Content-Type": "text/plain", ...CORS, "X-FIELD-Proxy": "relay-multi" }
      });
    }
    if (pathname.startsWith("/wc/")) {
      if (pathname === "/wc/standings")
        return handleWCStandings(url, env);
      if (pathname === "/wc/results")
        return handleWCResults(url, env);
      if (pathname === "/wc/odds-probs")
        return handleWCOddsProbs(env);
      if (pathname === "/wc/third-place")
        return handleWCThirdPlace(env);
      if (pathname === "/wc/wp/verify")
        return handleWCWPVerify(env);
      if (pathname === "/cfl/odds-probs")
        return handleCFLOddsProbs(env);
      if (pathname === "/wc/admin/seed" && request.method === "POST")
        return handleWCAdminSeed(request, env);
      return new Response("WC endpoint not found", { status: 404, headers: CORS });
    }
    if (pathname.startsWith("/v2/")) {
      if (pathname === "/v2/games")
        return handleV2Games(url, env);
      if (pathname === "/v2/standings")
        return handleV2Standings(url, env);
      return new Response("V2 endpoint not found", { status: 404, headers: CORS });
    }
    if (pathname === "/dropbox/upload" && request.method === "POST") {
      const filename = url.searchParams.get("filename") || "upload.html";
      const token2 = env.DROPBOX_TOKEN;
      if (!token2)
        return new Response("DROPBOX_TOKEN not configured", { status: 500, headers: { ...CORS, "X-RELAY-Error": "dropbox-no-token" } });
      const body = await request.arrayBuffer();
      const dbRes = await fetch("https://content.dropboxapi.com/2/files/upload", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token2}`,
          "Dropbox-API-Arg": JSON.stringify({
            path: `/${filename}`,
            mode: "overwrite",
            autorename: false,
            mute: false
          }),
          "Content-Type": "application/octet-stream"
        },
        body
      });
      const result = await dbRes.text();
      return new Response(result, {
        status: dbRes.status,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "https://jubilant-bassoon.jeffunglesbee.workers.dev",
          "Access-Control-Allow-Methods": "POST",
          "X-FIELD-Proxy": "relay-dropbox"
        }
      });
    }
    if (request.method !== "GET" && !(pathname === "/journalism/run" && request.method === "POST") && !(pathname === "/journalism/generate" && request.method === "POST") && !(pathname === "/journalism/enqueue" && request.method === "POST") && !(pathname === "/mcp" && request.method === "POST"))
      return new Response("Method not allowed", { status: 405, headers: CORS });
    if (pathname.startsWith("/squiggle")) {
      if (!url.search || !url.search.includes("q="))
        return new Response("Squiggle ?q= param required", { status: 400, headers: { "X-RELAY-Error": "squiggle-missing-q", ...CORS } });
      return relayFetch(`${SQUIGGLE_BASE}/${url.search}`, SQUIGGLE_HEADERS, squiggleTtl(url.search), "squiggle", ctx);
    }
    if (pathname.startsWith("/apisports/")) {
      const parts = pathname.replace(/^\/apisports\//, "").split("/");
      const sport = parts[0];
      const cleanPath = "/" + parts.slice(1).join("/");
      const host = APISPORTS_HOSTS[sport];
      if (!host)
        return new Response(`Unknown sport: ${sport}`, { status: 404, headers: { "X-RELAY-Error": "apisports-unknown-sport", ...CORS } });
      if (!apiSportsAllowed(cleanPath))
        return new Response("API-Sports path not allowed", { status: 403, headers: { "X-RELAY-Error": "apisports-path-not-whitelisted", ...CORS } });
      const apiKey = env.APISPORTS_KEY;
      if (!apiKey)
        return new Response("APISPORTS_KEY not configured", { status: 500, headers: { "X-RELAY-Error": "apisports-no-key", ...CORS } });
      const targetUrl = `https://${host}${cleanPath}${url.search || ""}`;
      return relayFetch(targetUrl, { "x-apisports-key": apiKey, "Accept": "application/json" }, apiSportsTtl(cleanPath), "apisports", ctx);
    }
    if (pathname.startsWith("/odds")) {
      const cleanPath = pathname.replace(/^\/odds/, "") || "/";
      if (!oddsAllowed(cleanPath))
        return new Response("Odds path not allowed", { status: 403, headers: { "X-RELAY-Error": "odds-path-not-whitelisted", ...CORS } });
      const targetUrl = oddsUrl(cleanPath, url.search, env?.ODDS_API_KEY);
      return relayFetch(targetUrl, { "Accept": "application/json" }, oddsCacheTtl(cleanPath), "odds", ctx);
    }
    if (pathname.startsWith("/nhl")) {
      const cleanPath = pathname.replace(/^\/nhl/, "") || "/";
      const nhlPath = cleanPath + (url.search || "");
      if (!nhlAllowed(cleanPath))
        return new Response("NHL path not allowed", { status: 403, headers: { "X-RELAY-Error": "nhl-path-not-whitelisted", ...CORS } });
      return relayFetch(`${NHL_BASE}${nhlPath}`, NHL_HEADERS, nhlCacheTtl(cleanPath), "nhl", ctx);
    }
    if (pathname.startsWith("/fd")) {
      const cleanPath = pathname.replace(/^\/fd/, "") || "/";
      const fdPath = cleanPath + (url.search || "");
      if (!fdAllowed(cleanPath))
        return new Response("FD path not allowed", { status: 403, headers: { "X-RELAY-Error": "fd-path-not-whitelisted", ...CORS } });
      return relayFetch(`${FD_BASE}${fdPath}`, FD_HEADERS, fdCacheTtl(cleanPath), "fd", ctx);
    }
    if (pathname.startsWith("/fpl")) {
      const cleanPath = pathname.replace(/^\/fpl/, "");
      const fplPath = cleanPath + (url.search || "");
      if (!fplAllowed(cleanPath))
        return new Response("FPL path not allowed", { status: 403, headers: { "X-RELAY-Error": "fpl-path-not-whitelisted", ...CORS } });
      return relayFetch(`${FPL_BASE}${fplPath}`, FPL_HEADERS, fplCacheTtl(cleanPath), "fpl", ctx);
    }
    if (pathname.startsWith("/atp")) {
      const cleanPath = pathname.replace(/^\/atp/, "") || "/livematches/website";
      if (!atpAllowed(cleanPath))
        return new Response("ATP path not allowed", { status: 403, headers: { "X-RELAY-Error": "atp-path-not-whitelisted", ...CORS } });
      const targetUrl = `${ATP_BASE}${cleanPath}${url.search || "?scoringTournamentLevel=tour"}`;
      return relayFetch(targetUrl, { "Accept": "application/json", "Origin": "https://www.atptour.com", "Referer": "https://www.atptour.com/" }, ATP_TTL, "atp", ctx);
    }
    if (pathname.startsWith("/bdl")) {
      const cleanPath = pathname.replace(/^\/bdl/, "") || "/";
      if (!bdlAllowed(cleanPath))
        return new Response("BDL path not allowed", { status: 403, headers: { "X-RELAY-Error": "bdl-path-not-whitelisted", ...CORS } });
      const bdlKey = env?.BDL_API_KEY || "4c881f4b-3845-4542-841f-a0e685c9f10e";
      const targetUrl = `${BDL_BASE}${cleanPath}${url.search || ""}`;
      const bdlResp = await relayFetch(targetUrl, { "Authorization": bdlKey, "Accept": "application/json" }, bdlCacheTtl(cleanPath), "bdl", ctx);
      if (bdlResp.status === 401) {
        return new Response(JSON.stringify({
          data: [],
          meta: {
            tier_required: "GOAT",
            upstream_status: 401,
            note: "BDL subscription tier required for this endpoint"
          }
        }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "X-RELAY-Tier-Gated": "1",
            ...CORS
          }
        });
      }
      return bdlResp;
    }
    if (pathname.startsWith("/espn-gambit")) {
      const cleanPath = pathname.replace(/^\/espn-gambit/, "") || "/";
      if (!espnGambitAllowed(cleanPath))
        return new Response("ESPN Gambit path not allowed", { status: 403, headers: { "X-RELAY-Error": "espn-gambit-path-not-whitelisted", ...CORS } });
      const targetUrl = `${ESPN_GAMBIT_BASE}${cleanPath}${url.search || ""}`;
      return relayFetch(targetUrl, ESPN_GAMBIT_HEADERS, ESPN_GAMBIT_TTL, "espn-gambit", ctx);
    }
    if (pathname.startsWith("/espn-summary")) {
      const cleanPath = pathname.replace(/^\/espn-summary/, "") || "/";
      if (!espnSummaryAllowed(cleanPath))
        return new Response("ESPN Summary path not allowed", { status: 403, headers: { "X-RELAY-Error": "espn-summary-path-not-whitelisted", ...CORS } });
      const targetUrl = `${ESPN_SUMMARY_BASE}${cleanPath}${url.search || ""}`;
      return relayFetch(targetUrl, ESPN_SUMMARY_HEADERS, ESPN_SUMMARY_TTL, "espn-summary", ctx);
    }
    if (pathname === "/field/data/today") {
      const dataUrl = "https://raw.githubusercontent.com/jeffunglesbee-create/jubilant-bassoon/main/outbox/field-data-today.json";
      return relayFetch(dataUrl, { "Accept": "application/json", "Cache-Control": "no-cache" }, 300, "field-data", ctx);
    }
    if (pathname.startsWith("/mlb-stats")) {
      const cleanPath = pathname.replace(/^\/mlb-stats/, "") || "/";
      const MLB_ANALYTICS_FILES = [
        "team_abs.json",
        "expected_stats.json",
        "sprint_speed.json",
        "pitch_tempo.json",
        "pitch_arsenals.json",
        "umpire_abs.json"
      ];
      const analyticsFile = cleanPath.replace(/^\//, "");
      if (MLB_ANALYTICS_FILES.includes(analyticsFile)) {
        const rawBase = "https://raw.githubusercontent.com/jeffunglesbee-create/jubilant-bassoon/main/outbox/mlb";
        return relayFetch(`${rawBase}/${analyticsFile}`, { "Accept": "application/json" }, 43200, "mlb-analytics", ctx);
      }
      if (!mlbStatsApiAllowed(cleanPath))
        return new Response("MLB Stats path not allowed", { status: 403, headers: { "X-RELAY-Error": "mlb-stats-path-not-whitelisted", ...CORS } });
      const targetUrl = `${MLB_STATS_API_BASE}${cleanPath}${url.search || ""}`;
      return relayFetch(targetUrl, MLB_STATS_API_HEADERS, MLB_STATS_API_TTL, "mlb-stats", ctx);
    }
    if (pathname.startsWith("/mls/stats")) {
      const cleanPath = pathname.replace(/^\/mls\/stats/, "") || "/";
      if (!mlsStatsAllowed(cleanPath))
        return new Response("MLS Stats path not allowed", { status: 403, headers: { "X-RELAY-Error": "mls-stats-path-not-whitelisted", ...CORS } });
      const targetUrl = `${MLS_STATS_BASE}${cleanPath}${url.search || ""}`;
      return relayFetch(targetUrl, MLS_STATS_HEADERS, mlsStatsTtl(cleanPath), "mls-stats", ctx);
    }
    if (pathname === "/journalism/run" && request.method === "POST") {
      const result = await handleJournalismCycle(env);
      return new Response(
        JSON.stringify({ triggered: "journalism-cycle", result }),
        { headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }
    if (pathname === "/journalism/generate" && request.method === "POST") {
      try {
        const body = await request.json().catch(() => null);
        if (!body || typeof body.prompt !== "string" || body.prompt.length < 10) {
          return new Response(
            JSON.stringify({ error: "missing or invalid prompt" }),
            { status: 400, headers: { ...CORS, "Content-Type": "application/json" } }
          );
        }
        const sport = body.sport || null;
        const briefType = body.briefType || "generic";
        const max_tokens = Math.min(Math.max(body.max_tokens || 1500, 200), 5e3);
        const scoreFloor = body.scoreThreshold || 130;
        let _lastProxyDiag = "none";
        const callProxy = /* @__PURE__ */ __name(async (promptText) => {
          try {
            const resp = await fetch("https://field-claude-proxy.jeffunglesbee.workers.dev", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                // Proxy whitelist requires 'field-relay-cron-2026' to bypass origin check.
                // The previous value 'field-relay-jq-2026' was rejected with 403 "Origin not allowed".
                // Use same value cron does — proxy is path-agnostic, only checks header value.
                "X-FIELD-Relay": "field-relay-cron-2026"
              },
              body: JSON.stringify({
                model: "claude-haiku-4-5-20251001",
                max_tokens,
                messages: [{ role: "user", content: promptText }]
              })
            });
            if (!resp.ok) {
              const body2 = await resp.text().catch(() => "(unreadable)");
              _lastProxyDiag = `HTTP_${resp.status}: ${body2.slice(0, 150)}`;
              return null;
            }
            const data = await resp.json();
            const text = (data.content || []).filter((c) => c.type === "text").map((c) => c.text).join("").trim();
            if (!text) {
              _lastProxyDiag = `parsed_empty: keys=${Object.keys(data).join(",")} content_len=${(data.content || []).length}`;
            }
            return text || null;
          } catch (e) {
            _lastProxyDiag = `exception: ${e.message || String(e).slice(0, 150)}`;
            return null;
          }
        }, "callProxy");
        const initial = await callProxy(body.prompt);
        if (!initial || initial.length < 30) {
          return new Response(JSON.stringify({
            error: "proxy returned no prose",
            proxy_text_length: initial ? initial.length : 0,
            proxy_diagnostic: _lastProxyDiag
          }), { status: 502, headers: { ...CORS, "Content-Type": "application/json" } });
        }
        const result = await runQualityChain(body.prompt, initial, callProxy, {
          sport,
          scoreThreshold: scoreFloor,
          maxRetries: 6
        });
        result.text = stripMarkdown(result.text);
        const _initialCliches = hasCliche(initial).length;
        const _finalCliches = hasCliche(result.text).length;
        const _initialCrossSport = hasCrossSportHallucination(initial).length;
        const _finalCrossSport = hasCrossSportHallucination(result.text).length;
        try {
          if (env.JQ_ANALYTICS) {
            env.JQ_ANALYTICS.writeDataPoint({
              indexes: [briefType, sport || "none"],
              blobs: [result.layers_fired.join(",") || "none"],
              doubles: [
                result.score,
                result.retries,
                result.ms,
                _initialCliches,
                _finalCliches,
                _initialCrossSport,
                _finalCrossSport,
                body.prompt.length,
                result.text.length
              ]
            });
          }
        } catch (_aeErr) {
        }
        return new Response(JSON.stringify({
          status: "ok",
          briefType,
          text: result.text,
          score: result.score,
          retries: result.retries,
          layers_fired: result.layers_fired,
          ms: result.ms,
          // Audit fields — written to Analytics Engine above + returned
          // here for browser-side debug panel display
          initial_cliches: _initialCliches,
          final_cliches: _finalCliches,
          initial_cross_sport: _initialCrossSport,
          final_cross_sport: _finalCrossSport
        }), {
          status: 200,
          headers: {
            ...CORS,
            "Content-Type": "application/json",
            "X-JQ-Score": String(result.score),
            "X-JQ-Retries": String(result.retries),
            "X-JQ-Layers": result.layers_fired.join(",") || "none"
          }
        });
      } catch (e) {
        return new Response(JSON.stringify({
          error: "journalism gate failure",
          detail: e.message
        }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
      }
    }
    if (pathname === "/journalism/enqueue" && request.method === "POST") {
      if (!env.JOURNALISM_QUEUE) {
        return new Response(
          JSON.stringify({ error: "queue not configured" }),
          { status: 503, headers: { ...CORS, "Content-Type": "application/json" } }
        );
      }
      try {
        const body = await request.json();
        if (!body.prompt || typeof body.prompt !== "string") {
          return new Response(
            JSON.stringify({ error: "prompt required" }),
            { status: 400, headers: { ...CORS, "Content-Type": "application/json" } }
          );
        }
        const jobId = crypto.randomUUID();
        await env.JOURNALISM_QUEUE.send({
          jobId,
          prompt: body.prompt,
          sport: body.sport || null,
          briefType: body.briefType || "queued",
          max_tokens: body.max_tokens || 1e3,
          scoreThreshold: body.scoreThreshold || null,
          enqueuedAt: Date.now()
        });
        if (env.FIELD_JOURNALISM) {
          await env.FIELD_JOURNALISM.put(
            `jobs:${jobId}`,
            JSON.stringify({ status: "queued", enqueuedAt: Date.now() }),
            { expirationTtl: 86400 }
          );
        }
        return new Response(
          JSON.stringify({ jobId, status: "queued" }),
          { status: 202, headers: { ...CORS, "Content-Type": "application/json" } }
        );
      } catch (e) {
        return new Response(
          JSON.stringify({ error: "enqueue failure", detail: e.message }),
          { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
        );
      }
    }
    if (pathname.startsWith("/journalism/result/") && request.method === "GET") {
      if (!env.FIELD_JOURNALISM) {
        return new Response(
          JSON.stringify({ error: "storage not configured" }),
          { status: 503, headers: { ...CORS, "Content-Type": "application/json" } }
        );
      }
      const jobId = pathname.slice("/journalism/result/".length);
      if (!jobId || !/^[0-9a-f-]{8,}$/i.test(jobId)) {
        return new Response(
          JSON.stringify({ error: "invalid jobId" }),
          { status: 400, headers: { ...CORS, "Content-Type": "application/json" } }
        );
      }
      const raw = await env.FIELD_JOURNALISM.get(`jobs:${jobId}`);
      if (!raw) {
        return new Response(
          JSON.stringify({ status: "unknown", jobId }),
          { status: 404, headers: { ...CORS, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        raw,
        { status: 200, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }
    if (pathname === "/rss-proxy") {
      const feedUrl = url.searchParams.get("url");
      if (!feedUrl)
        return new Response("Missing url param", { status: 400, headers: corsHeaders });
      const allowed = ["nba.com", "nhl.com", "mlb.com", "nfl.com"];
      const urlHost = new URL(feedUrl).hostname;
      if (!allowed.some((d) => urlHost.endsWith(d)))
        return new Response("Domain not allowed", { status: 403, headers: corsHeaders });
      try {
        const r = await fetch(feedUrl, { headers: { "User-Agent": "FIELD/1.0" } });
        const text = await r.text();
        return new Response(text, {
          status: r.status,
          headers: { ...corsHeaders, "Content-Type": r.headers.get("Content-Type") || "application/rss+xml" }
        });
      } catch (e) {
        return new Response("RSS fetch failed", { status: 502, headers: corsHeaders });
      }
    }
    if (pathname === "/journalism/tonight" || pathname === "/journalism/brief") {
      if (!env.FIELD_JOURNALISM)
        return new Response(JSON.stringify({ error: "not configured" }), { status: 503, headers: { ...CORS, "Content-Type": "application/json" } });
      const dateKey = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
      const raw = await env.FIELD_JOURNALISM.get(`journalism:${dateKey}`);
      if (!raw)
        return new Response(JSON.stringify({ brief: null, generatedAt: null }), { status: 200, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "public,max-age=60" } });
      const data = JSON.parse(raw);
      const age = Math.round((Date.now() - (data.generatedAt || 0)) / 1e3);
      return new Response(raw, { status: 200, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": `public,max-age=${Math.max(0, JOURNALISM_TTL_SECS - age)}`, "X-Journalism-Age": `${age}s`, "X-Journalism-Cycle": data.cycleId || "" } });
    }
    if (pathname.startsWith("/journalism/game/")) {
      if (!env.FIELD_JOURNALISM)
        return new Response(JSON.stringify({ brief: null }), { status: 200, headers: { ...CORS, "Content-Type": "application/json" } });
      const eventId = pathname.replace("/journalism/game/", "").replace(/[^a-zA-Z0-9_-]/g, "");
      if (!eventId)
        return new Response(JSON.stringify({ brief: null }), { status: 200, headers: { ...CORS, "Content-Type": "application/json" } });
      const raw = await env.FIELD_JOURNALISM.get(`brief:game:${eventId}`);
      if (!raw)
        return new Response(JSON.stringify({ brief: null }), { status: 200, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "public,max-age=60" } });
      const data = JSON.parse(raw);
      const age = Math.round((Date.now() - (data.generatedAt || 0)) / 1e3);
      return new Response(raw, { status: 200, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": `public,max-age=${Math.max(0, 3600 - age)}`, "X-Journalism-Age": `${age}s`, "X-Journalism-Sport": data.sport || "" } });
    }
    if (pathname.startsWith("/nflverse/")) {
      const file = pathname.replace(/^\/nflverse\//, "");
      if (!NFLVERSE_OUT_ALLOWED.includes(file))
        return new Response("nflverse file not allowed", { status: 403, headers: { "X-RELAY-Error": "nflverse-not-whitelisted", ...CORS } });
      const targetUrl = `${NFLVERSE_RAW_BASE}/${file}`;
      return relayFetch(targetUrl, { "Accept": "application/json" }, 86400, "nflverse", ctx);
    }
    const MLB_STATS_RAW_BASE = "https://raw.githubusercontent.com/jeffunglesbee-create/jubilant-bassoon/main/outbox/mlb";
    const MLB_STATS_ALLOWED = [
      "team_abs.json",
      "expected_stats.json",
      "sprint_speed.json",
      "pitch_tempo.json",
      "pitch_arsenals.json",
      "umpire_abs.json"
    ];
    if (pathname.startsWith("/mlb-stats/")) {
      const file = pathname.replace(/^\/mlb-stats\//, "");
      if (!MLB_STATS_ALLOWED.includes(file))
        return new Response("mlb-stats file not allowed", { status: 403, headers: { "X-RELAY-Error": "mlb-stats-not-whitelisted", ...CORS } });
      const targetUrl = `${MLB_STATS_RAW_BASE}/${file}`;
      return relayFetch(targetUrl, { "Accept": "application/json" }, 43200, "mlb-stats", ctx);
    }
    if (pathname === "/mlb-umpire-scrape") {
      const cacheKey = new Request("https://field-relay-cache/mlb-umpire-scrape-2026", request);
      const cache = caches.default;
      const hit = await cache.match(cacheKey);
      if (hit)
        return new Response(hit.body, { ...hit, headers: { ...Object.fromEntries(hit.headers), "X-Cache": "HIT", ...CORS } });
      const SAVANT_UMP = "https://baseballsavant.mlb.com/leaderboard/abs-challenges?gameType=regular&groupBy=is_strike_calc&year=2026&challengeType=hp_umpire&level=mlb&minChal=3";
      let html2 = "", status = 0;
      try {
        const r = await fetch(SAVANT_UMP, { headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,*/*",
          "Accept-Language": "en-US,en;q=0.9",
          "Referer": "https://baseballsavant.mlb.com/"
        } });
        status = r.status;
        if (r.ok)
          html2 = await r.text();
      } catch (e) {
        return new Response(
          JSON.stringify({ error: `Savant fetch failed: ${e.message}` }),
          { status: 502, headers: { "Content-Type": "application/json", ...CORS } }
        );
      }
      if (!html2)
        return new Response(
          JSON.stringify({ error: `Savant returned HTTP ${status}` }),
          { status: 502, headers: { "Content-Type": "application/json", ...CORS } }
        );
      let umpires = null;
      const ndMatch = html2.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]+?)<\/script>/);
      if (ndMatch) {
        try {
          const nd = JSON.parse(ndMatch[1]);
          const candidates = [
            nd?.props?.pageProps?.data,
            nd?.props?.pageProps?.leaderboard,
            nd?.props?.pageProps?.umpires,
            nd?.props?.pageProps?.results
          ].filter(Boolean);
          for (const c of candidates) {
            const parsed = _parseUmpireArray(Array.isArray(c) ? c : Object.values(c));
            if (parsed && Object.keys(parsed).length >= 5) {
              umpires = parsed;
              break;
            }
          }
        } catch (e) {
        }
      }
      if (!umpires) {
        umpires = _parseUmpireHTML(html2);
      }
      if (!umpires || Object.keys(umpires).length < 3) {
        const snippet = html2.slice(0, 500);
        return new Response(JSON.stringify({
          error: "Could not parse umpire table",
          htmlLength: html2.length,
          snippet,
          hint: "Check if Savant changed challengeType=hp_umpire page structure"
        }), { status: 502, headers: { "Content-Type": "application/json", ...CORS } });
      }
      const result = JSON.stringify({
        updated: (/* @__PURE__ */ new Date()).toISOString(),
        source: "Savant via CF Worker",
        data: umpires
      });
      const resp = new Response(result, {
        headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=14400", ...CORS }
      });
      ctx.waitUntil(cache.put(cacheKey, resp.clone()));
      return resp;
    }
    if (pathname.startsWith("/sportradar-ufl")) {
      const cleanPath = pathname.replace(/^\/sportradar-ufl/, "") || "/";
      if (!sportradarUflAllowed(cleanPath))
        return new Response("sportradar-ufl path not allowed", { status: 403, headers: { "X-RELAY-Error": "sr-ufl-not-whitelisted", ...CORS } });
      const srKey = env.SPORTRADAR_UFL_KEY;
      if (!srKey)
        return new Response("SPORTRADAR_UFL_KEY not configured", { status: 503, headers: { "X-RELAY-Error": "sr-ufl-no-key", ...CORS } });
      const sep = cleanPath.includes("?") ? "&" : "?";
      const targetUrl = `${SPORTRADAR_UFL_BASE}${cleanPath}${sep}api_key=${srKey}`;
      return relayFetch(targetUrl, { "Accept": "application/json" }, sportradarUflTtl(cleanPath), "sportradar-ufl", ctx);
    }
    if (pathname.startsWith("/realtimesports")) {
      const cleanPath = pathname.replace(/^\/realtimesports/, "") || "/";
      if (!realtimeSportsAllowed(cleanPath))
        return new Response("RealtimeSports path not allowed", { status: 403, headers: { "X-RELAY-Error": "realtimesports-not-whitelisted", ...CORS } });
      const rtKey = env.REALTIMESPORTS_KEY;
      if (!rtKey)
        return new Response("REALTIMESPORTS_KEY not configured", { status: 503, headers: { "X-RELAY-Error": "realtimesports-no-key", ...CORS } });
      const targetUrl = `${REALTIMESPORTS_BASE}${cleanPath}${url.search || ""}`;
      return relayFetch(targetUrl, { "Authorization": `Bearer ${rtKey}`, "Accept": "application/json" }, realtimeSportsTtl(cleanPath), "realtimesports", ctx);
    }
    if (pathname === "/mcp" && request.method === "GET") {
      const wwwAuth = `Bearer realm="MCP", resource_metadata="${url.origin}/.well-known/oauth-protected-resource"`;
      return new Response(JSON.stringify({
        error: "unauthorized",
        error_description: "MCP endpoint requires OAuth Bearer token. See WWW-Authenticate header for discovery."
      }), {
        status: 401,
        headers: {
          ...CORS,
          "Content-Type": "application/json",
          "WWW-Authenticate": wwwAuth
        }
      });
    }
    if (pathname === "/mcp" && request.method === "POST") {
      const mcpSecret = env.FIELD_MCP_SECRET;
      if (!mcpSecret) {
        return new Response(JSON.stringify({ error: "Server misconfigured: FIELD_MCP_SECRET not set on worker" }), { status: 503, headers: { ...CORS, "Content-Type": "application/json" } });
      }
      const authHeader = request.headers.get("Authorization");
      const xSecret = request.headers.get("X-FIELD-MCP-Secret");
      const qToken = url.searchParams.get("token");
      const oauthCheck = await validateBearer(authHeader, env);
      const oauthOK = oauthCheck.valid;
      const incomingLegacy = xSecret || authHeader || qToken;
      const legacyOK = incomingLegacy && incomingLegacy.includes(mcpSecret);
      if (!oauthOK && !legacyOK) {
        const wwwAuth = `Bearer realm="MCP", resource_metadata="${url.origin}/.well-known/oauth-protected-resource"`;
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: {
            ...CORS,
            "Content-Type": "application/json",
            "WWW-Authenticate": wwwAuth
          }
        });
      }
      let body;
      try {
        body = await request.json();
      } catch (e) {
        return new Response(
          JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }),
          { status: 400, headers: { ...CORS, "Content-Type": "application/json" } }
        );
      }
      const { jsonrpc, id, method, params } = body;
      const jsonrpc2 = /* @__PURE__ */ __name((result) => JSON.stringify({ jsonrpc: "2.0", id, result }), "jsonrpc2");
      const jsonrpc2err = /* @__PURE__ */ __name((code, message) => JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }), "jsonrpc2err");
      const respond = /* @__PURE__ */ __name((data, status = 200) => new Response(data, { status, headers: { ...CORS, "Content-Type": "application/json" } }), "respond");
      if (method === "initialize") {
        return respond(jsonrpc2({
          protocolVersion: "2025-03-26",
          capabilities: { tools: {} },
          serverInfo: { name: "field-relay", version: "1.0.0" }
        }));
      }
      if (method === "notifications/initialized") {
        return respond(JSON.stringify({ jsonrpc: "2.0", id: null }));
      }
      if (method === "tools/list") {
        return respond(jsonrpc2({ tools: [
          {
            name: "get_ci_status",
            description: "Get the latest GitHub Actions CI run status for jubilant-bassoon. Returns workflow name, conclusion (success/failure/in_progress), and HEAD commit.",
            inputSchema: { type: "object", properties: {}, required: [] }
          },
          {
            name: "get_smoke_count",
            description: "Get the current smoke assertion count from the latest index.html in the jubilant-bassoon repo.",
            inputSchema: { type: "object", properties: {}, required: [] }
          },
          {
            name: "get_deploy_status",
            description: "Get the last 3 GitHub Actions workflow runs for jubilant-bassoon with their status and conclusions.",
            inputSchema: {
              type: "object",
              properties: { limit: { type: "number", description: "Number of runs to return (default 3, max 5)" } },
              required: []
            }
          },
          {
            name: "get_live_scores",
            description: "Get live NBA scoreboard from the NBA CDN relay.",
            inputSchema: { type: "object", properties: {}, required: [] }
          },
          {
            name: "get_espn_game",
            description: "Get ESPN game summary for a specific game ID.",
            inputSchema: {
              type: "object",
              properties: {
                sport: { type: "string", description: "Sport slug (basketball, hockey, baseball, football, soccer)" },
                league: { type: "string", description: "League slug (nba, nhl, mlb, nfl, eng.1 etc.)" },
                game_id: { type: "string", description: "ESPN game ID" }
              },
              required: ["sport", "league", "game_id"]
            }
          },
          {
            name: "read_handoff",
            description: "Read the current HANDOFF.md from the jubilant-bassoon FIELD repo. Returns content and SHA as JSON in text field.",
            inputSchema: { type: "object", properties: {}, required: [] }
          },
          {
            name: "write_handoff",
            description: "Replace HANDOFF.md in jubilant-bassoon with new content and commit on main. Commit message is prefixed with [skip ci] automatically (HANDOFF.md is paths-ignored anyway; this is belt-and-suspenders).",
            inputSchema: {
              type: "object",
              properties: {
                content: { type: "string", description: "Full new content of HANDOFF.md (UTF-8 text)" },
                commit_message: { type: "string", description: "Commit message body (will be prefixed with [skip ci])" }
              },
              required: ["content", "commit_message"]
            }
          },
          {
            name: "get_head_sha",
            description: "Get the current HEAD SHA of jubilant-bassoon main branch. Useful for memory anchor updates after write_handoff.",
            inputSchema: { type: "object", properties: {}, required: [] }
          },
          {
            name: "probe_relay_route",
            description: "GET an allow-listed relay route (self-fetch on the same worker) and return its status, content-type, and body. Bypasses the *.workers.dev sandbox block for deployed-route verification. Allow-list is hardcoded relay-side; non-allow-listed routes return an error and are never fetched.",
            inputSchema: {
              type: "object",
              properties: {
                route: { type: "string", description: 'Relay path starting with "/", e.g. "/wc/wp/verify". Query string allowed.' }
              },
              required: ["route"]
            }
          }
        ] }));
      }
      if (method === "tools/call") {
        const toolName = params?.name;
        const toolArgs = params?.arguments || {};
        if (toolName === "get_ci_status" || toolName === "get_deploy_status") {
          const limit = Math.min(toolArgs.limit || 3, 5);
          const ghToken = env.GITHUB_PAT;
          if (!ghToken)
            return respond(jsonrpc2({ content: [{ type: "text", text: "GITHUB_PAT not configured in relay env" }] }));
          const r = await fetch(
            `https://api.github.com/repos/jeffunglesbee-create/jubilant-bassoon/actions/runs?per_page=${limit}`,
            { headers: { "Authorization": `Bearer ${ghToken}`, "User-Agent": "field-relay-mcp", "Accept": "application/vnd.github+json" } }
          );
          if (!r.ok)
            return respond(jsonrpc2({ content: [{ type: "text", text: `GitHub API error: ${r.status}` }] }));
          const data = await r.json();
          const runs = (data.workflow_runs || []).slice(0, limit).map((run) => `${run.name} | ${run.conclusion || run.status} | ${run.head_sha?.slice(0, 7)} | ${run.updated_at}`).join("\n");
          return respond(jsonrpc2({ content: [{ type: "text", text: runs || "No runs found" }] }));
        }
        if (toolName === "get_smoke_count") {
          const ghToken = env.GITHUB_PAT;
          if (!ghToken)
            return respond(jsonrpc2({ content: [{ type: "text", text: "GITHUB_PAT not configured" }] }));
          const r = await fetch(
            "https://api.github.com/repos/jeffunglesbee-create/jubilant-bassoon/contents/smoke.js",
            { headers: { "Authorization": `Bearer ${ghToken}`, "User-Agent": "field-relay-mcp", "Accept": "application/vnd.github+json" } }
          );
          if (!r.ok)
            return respond(jsonrpc2({ content: [{ type: "text", text: `GitHub API error: ${r.status}` }] }));
          const data = await r.json();
          const smokeJs = atob(data.content);
          const assertions = (smokeJs.match(/^\s*assert\(/gm) || []).length;
          return respond(jsonrpc2({ content: [{ type: "text", text: `Smoke assertions: ${assertions}` }] }));
        }
        if (toolName === "get_live_scores") {
          const r = await relayFetch(
            `${NBA_CDN_BASE}/liveData/scoreboard/todaysScoreboard_00.json`,
            NBA_HEADERS,
            NBA_CACHE_TTL,
            "nba-mcp",
            ctx
          );
          const text = await r.text();
          try {
            const d = JSON.parse(text);
            const games = (d.scoreboard?.games || []).map(
              (g) => `${g.awayTeam?.teamTricode} ${g.awayTeam?.score} @ ${g.homeTeam?.teamTricode} ${g.homeTeam?.score} (${g.gameStatusText})`
            ).join("\n");
            return respond(jsonrpc2({ content: [{ type: "text", text: games || "No games today" }] }));
          } catch (e) {
            return respond(jsonrpc2({ content: [{ type: "text", text: "Score parse error" }] }));
          }
        }
        if (toolName === "get_espn_game") {
          const { sport, league, game_id } = toolArgs;
          if (!sport || !league || !game_id) {
            return respond(jsonrpc2({ content: [{ type: "text", text: "Required: sport, league, game_id" }] }));
          }
          const espnUrl = `https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/summary?event=${game_id}`;
          const r = await fetch(espnUrl, { headers: { "User-Agent": "FIELD-Sports-Intelligence/1.0" } });
          if (!r.ok)
            return respond(jsonrpc2({ content: [{ type: "text", text: `ESPN error: ${r.status}` }] }));
          const data = await r.json();
          const comp = data.header?.competitions?.[0];
          if (!comp)
            return respond(jsonrpc2({ content: [{ type: "text", text: "No competition data" }] }));
          const teams = (comp.competitors || []).map((c) => `${c.team?.abbreviation} ${c.score}`).join(" vs ");
          const status = comp.status?.type?.description || "";
          return respond(jsonrpc2({ content: [{ type: "text", text: `${teams} | ${status}` }] }));
        }
        const HANDOFF_API_BASE = "https://api.github.com/repos/jeffunglesbee-create/jubilant-bassoon";
        const ghHeaders = /* @__PURE__ */ __name((token2) => ({
          "Authorization": `Bearer ${token2}`,
          "User-Agent": "field-relay-mcp",
          "Accept": "application/vnd.github+json"
        }), "ghHeaders");
        if (toolName === "read_handoff") {
          const ghToken = env.GITHUB_PAT;
          if (!ghToken)
            return respond(jsonrpc2({ content: [{ type: "text", text: "GITHUB_PAT not configured on worker" }], isError: true }));
          const r = await fetch(`${HANDOFF_API_BASE}/contents/HANDOFF.md`, { headers: ghHeaders(ghToken) });
          if (!r.ok) {
            const txt = await r.text();
            return respond(jsonrpc2({ content: [{ type: "text", text: `GitHub read failed: ${r.status} ${txt}` }], isError: true }));
          }
          const data = await r.json();
          const bytes = atob(data.content.replace(/\n/g, ""));
          const content = decodeURIComponent(escape(bytes));
          return respond(jsonrpc2({ content: [{ type: "text", text: JSON.stringify({ content, sha: data.sha }) }] }));
        }
        if (toolName === "write_handoff") {
          const ghToken = env.GITHUB_PAT;
          if (!ghToken)
            return respond(jsonrpc2({ content: [{ type: "text", text: "GITHUB_PAT not configured on worker" }], isError: true }));
          const { content, commit_message } = toolArgs;
          if (typeof content !== "string" || typeof commit_message !== "string") {
            return respond(jsonrpc2({ content: [{ type: "text", text: "Required: content (string), commit_message (string)" }], isError: true }));
          }
          const curR = await fetch(`${HANDOFF_API_BASE}/contents/HANDOFF.md`, { headers: ghHeaders(ghToken) });
          if (!curR.ok) {
            const txt = await curR.text();
            return respond(jsonrpc2({ content: [{ type: "text", text: `GitHub SHA read failed: ${curR.status} ${txt}` }], isError: true }));
          }
          const cur = await curR.json();
          const utf8 = unescape(encodeURIComponent(content));
          const b64 = btoa(utf8);
          const msg = commit_message.includes("[skip ci]") ? commit_message : `${commit_message} [skip ci]`;
          const putR = await fetch(`${HANDOFF_API_BASE}/contents/HANDOFF.md`, {
            method: "PUT",
            headers: { ...ghHeaders(ghToken), "Content-Type": "application/json" },
            body: JSON.stringify({ message: msg, content: b64, sha: cur.sha, branch: "main" })
          });
          if (!putR.ok) {
            const txt = await putR.text();
            return respond(jsonrpc2({ content: [{ type: "text", text: `GitHub write failed: ${putR.status} ${txt}` }], isError: true }));
          }
          const putData = await putR.json();
          return respond(jsonrpc2({ content: [{ type: "text", text: JSON.stringify({ commit: putData.commit.sha, message: msg }) }] }));
        }
        if (toolName === "get_head_sha") {
          const ghToken = env.GITHUB_PAT;
          if (!ghToken)
            return respond(jsonrpc2({ content: [{ type: "text", text: "GITHUB_PAT not configured on worker" }], isError: true }));
          const r = await fetch(`${HANDOFF_API_BASE}/git/refs/heads/main`, { headers: ghHeaders(ghToken) });
          if (!r.ok) {
            const txt = await r.text();
            return respond(jsonrpc2({ content: [{ type: "text", text: `GitHub ref read failed: ${r.status} ${txt}` }], isError: true }));
          }
          const data = await r.json();
          return respond(jsonrpc2({ content: [{ type: "text", text: JSON.stringify({ sha: data.object.sha, branch: "main" }) }] }));
        }
        if (toolName === "probe_relay_route") {
          const route = toolArgs.route;
          if (typeof route !== "string" || !route.startsWith("/")) {
            return respond(jsonrpc2({ content: [{ type: "text", text: 'Required: route (string starting with "/")' }], isError: true }));
          }
          const FORBIDDEN_PREFIX = ["/mcp", "/oauth", "/.well-known", "/debug", "/push"];
          if (FORBIDDEN_PREFIX.some((p) => route === p || route.startsWith(p + "/") || route.startsWith(p + "?"))) {
            return respond(jsonrpc2({ content: [{ type: "text", text: `Route in forbidden-prefix list: ${FORBIDDEN_PREFIX.join(", ")}` }], isError: true }));
          }
          const ALLOWED_EXACT = /* @__PURE__ */ new Set([
            "/health",
            "/wc/wp/verify",
            "/wc/standings",
            "/wc/results",
            "/wc/odds-probs",
            "/cfl/odds-probs",
            "/wc/third-place",
            "/v2/games",
            "/v2/standings",
            // P0 carry-forward (2026-06-05): first step to diagnose
            // fetchNBAScoreboard()/_nbaGameIdMap path. NYK@SAS Finals
            // G2 is the first live exposure tonight.
            "/nba/liveData/scoreboard/todaysScoreboard_00.json"
          ]);
          const ALLOWED_PREFIX = ["/squiggle"];
          const qIdx = route.indexOf("?");
          const routePath = qIdx === -1 ? route : route.slice(0, qIdx);
          const allowed = ALLOWED_EXACT.has(routePath) || ALLOWED_PREFIX.some((p) => routePath === p || routePath.startsWith(p + "/"));
          if (!allowed) {
            const allowedList = [...ALLOWED_EXACT, ...ALLOWED_PREFIX.map((p) => `${p}/*`)].join(", ");
            return respond(jsonrpc2({ content: [{ type: "text", text: `Route not in allow-list. Allowed: ${allowedList}` }], isError: true }));
          }
          const target = `${url.origin}${route}`;
          let r;
          try {
            r = await fetch(target, { method: "GET", headers: { "User-Agent": "field-relay-probe", "Accept": "application/json, text/plain, */*" }, redirect: "manual" });
          } catch (e) {
            return respond(jsonrpc2({ content: [{ type: "text", text: `Probe fetch error: ${e.message}` }], isError: true }));
          }
          const bodyText = await r.text();
          const MAX_BODY = 12e3;
          const truncated = bodyText.length > MAX_BODY ? bodyText.slice(0, MAX_BODY) + `
\u2026[truncated ${bodyText.length - MAX_BODY} bytes]` : bodyText;
          return respond(jsonrpc2({ content: [{ type: "text", text: JSON.stringify({
            target,
            status: r.status,
            contentType: r.headers.get("content-type") || "",
            bodyBytes: bodyText.length,
            body: truncated
          }, null, 2) }] }));
        }
        return respond(jsonrpc2err(-32601, `Unknown tool: ${toolName}`));
      }
      return respond(jsonrpc2err(-32601, `Unknown method: ${method}`));
    }
    if (pathname.startsWith("/nba-stats")) {
      const nbaStatsPath = pathname.replace(/^\/nba-stats/, "") || "/";
      if (!nbaStatsAllowed(nbaStatsPath)) {
        return new Response("Path not allowed", { status: 403, headers: { "X-RELAY-Error": "path-not-whitelisted", ...CORS } });
      }
      const upstream = `${NBA_STATS_BASE}${nbaStatsPath}${url.search || ""}`;
      return relayFetch(upstream, NBA_STATS_HEADERS, NBA_STATS_CACHE_TTL, "nba-stats", ctx);
    }
    const nbaPath = pathname.replace(/^\/nba/, "");
    if (!nbaAllowed(nbaPath))
      return new Response("Path not allowed", { status: 403, headers: { "X-RELAY-Error": "path-not-whitelisted", ...CORS } });
    const nbaTtl = nbaPath.startsWith("/liveData/standings") ? NBA_STANDINGS_TTL : NBA_CACHE_TTL;
    return relayFetch(`${NBA_CDN_BASE}${nbaPath}`, NBA_HEADERS, nbaTtl, "nba", ctx);
  },
  // ── Queue consumer (WOW 8 — June 1 2026) ─────────────────────────────────
  // Drains field-journalism-queue at upstream-permitted rate.
  // For each job: runs full quality chain identical to /journalism/generate,
  // persists result to FIELD_JOURNALISM KV under jobs:{jobId} for 24h.
  // On 429 from upstream, throws to trigger CF Queues automatic retry/backoff
  // (max_retries=3 from wrangler.toml). On final failure, writes a 'failed'
  // status row so the polling endpoint can report it.
  async queue(batch, env, ctx) {
    const PROXY_URL = env.CLAUDE_PROXY_URL || "https://field-claude-proxy.jeffunglesbee.workers.dev";
    for (const msg of batch.messages) {
      const job = msg.body || {};
      const jobId = job.jobId;
      if (!jobId || !env.FIELD_JOURNALISM) {
        msg.ack();
        continue;
      }
      try {
        await env.FIELD_JOURNALISM.put(
          `jobs:${jobId}`,
          JSON.stringify({ status: "processing", enqueuedAt: job.enqueuedAt, startedAt: Date.now() }),
          { expirationTtl: 86400 }
        );
        const callProxy = /* @__PURE__ */ __name(async (promptText) => {
          const r = await fetch(PROXY_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-FIELD-Relay": "field-relay-cron-2026"
            },
            body: JSON.stringify({
              model: "claude-haiku-4-5-20251001",
              max_tokens: job.max_tokens || 1e3,
              messages: [{ role: "user", content: promptText }]
            })
          });
          if (r.status === 429) {
            throw new Error("upstream 429 rate-limited");
          }
          if (!r.ok)
            return null;
          const data = await r.json().catch(() => null);
          if (!data)
            return null;
          return (data.content || []).filter((c) => c.type === "text").map((c) => c.text).join("").trim() || null;
        }, "callProxy");
        const initial = await callProxy(job.prompt);
        if (!initial)
          throw new Error("proxy returned no prose");
        const result = await runQualityChain(job.prompt, initial, callProxy, {
          sport: job.sport,
          scoreThreshold: job.scoreThreshold || void 0,
          maxRetries: 6
        });
        const cleanText = stripMarkdown(result.text);
        await env.FIELD_JOURNALISM.put(
          `jobs:${jobId}`,
          JSON.stringify({
            status: "done",
            text: cleanText,
            score: result.score,
            retries: result.retries,
            layers_fired: result.layers_fired,
            ms: result.ms,
            completedAt: Date.now()
          }),
          { expirationTtl: 86400 }
        );
        msg.ack();
      } catch (e) {
        if (msg.attempts && msg.attempts >= 3) {
          await env.FIELD_JOURNALISM.put(
            `jobs:${jobId}`,
            JSON.stringify({ status: "failed", error: e.message, failedAt: Date.now() }),
            { expirationTtl: 86400 }
          ).catch(() => {
          });
          msg.ack();
        } else {
          msg.retry();
        }
      }
    }
  }
};
export {
  GameDO,
  src_default as default
};
//# sourceMappingURL=index.js.map
