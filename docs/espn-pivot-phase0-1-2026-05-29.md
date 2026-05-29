FIELD — ESPN Pivot: Phase 0/1 Data Adapter + Normalized Schema (design)

Date: 2026-05-29 · Design artifact (no code yet)
(In-repo because Drive writes are unavailable from the sandbox. ACTION: merge to the
 Drive design folder from a machine with Drive edit access.)

PURPOSE
Remove ESPN as a runtime data source in two reversible moves:
  Phase 0 — insert a normalized game schema + per-source adapter layer in the relay.
  Phase 1 — repoint each sport at a source FIELD already calls, behind that schema,
            and delete the ESPN read path per sport.
After Phase 0 the client stops parsing ESPN's JSON shape (~21 sites in index.html today),
so every later source decision is a relay config change, not a client rewrite.

CURRENT ESPN SURFACE (what must be replaced)
- relay /espn-gambit  -> site.api.espn scoreboard + CDN (cross-sport live scores)
- relay /espn-summary -> espn.com summary (box score, leaders) for detail cards + journalism
- client: ~21 direct reads of ESPN shape (.events / .competitions / .competitors /
  status.type / .displayClock / boxscore / athletes), plus espnGOTD flags + broadcast names

NORMALIZED SCHEMA — FieldGame  (the client contract; relay adapters emit this)
  id          string   FIELD-stable id (source id namespaced by sport)
  sport       string   'nba'|'nhl'|'mlb'|'nfl'|'epl'|'mls'|'afl'|...
  league      string
  state       'pre' | 'live' | 'final'
  start       string   ISO 8601
  home { name, short, abbr, score:int, logoKey }   logoKey = FIELD's OWN asset key
  away { name, short, abbr, score:int, logoKey }   (never a provider-supplied logo)
  periodNum   int      1..n (quarter / period / inning / half)
  periodLabel string   display ("4th", "Bot 9th", "2nd Half", "OT")
  clock       string   display clock when live, else ''
  situation?  object   sport-specific, optional, additive (bases/outs, possession)
  venue?      string
  broadcasts  string[] names only; FIELD's curated registry stays source of truth
  leaders?    array    optional; detail cards / journalism inputs
Notes:
- periodNum is exactly the field the push computePushDrama very-late bonus wants — emit it here.
- Provider logos are NOT carried (licensing); logoKey resolves to FIELD's own asset table.
- broadcasts stays FIELD-curated; an adapter may suggest, the registry decides.

PER-SPORT SOURCE OF RECORD (Phase 1 targets; GREEN/YELLOW = matrix labels, NOT counsel clearance)
  afl     live+summary+standings : Squiggle (wired)                          GREEN
  epl     live+summary+standings : Football-Data.org (wired)                 GREEN
  mls     live+standings         : Football-Data.org / mls stats relay (wired) GREEN
  mlb     live+box+standings     : StatsAPI schedule+linescore+boxscore (wired) YELLOW
  nhl     live+box+standings     : api-web.nhle.com (wired)                   YELLOW
  nba     live+box               : cdn.nba.com via /nba + BallDontLie (wired) YELLOW
  nfl     live                   : GAP — nflverse is historical only          RESIDUE
  odds                           : The Odds API (wired)                       GREEN
  weather                        : Open-Meteo (wired)                         GREEN
  tennis / golf                  : RED in production — licensed feed needed   RESIDUE

ADAPTER CONTRACT (relay)
- One adapter per (sport, source): fetch upstream -> map to FieldGame[] -> cache.
- Normalized routes: /v2/games?sport=X[&date=]  ·  /v2/game?id=  ·  /v2/standings?sport=X
- Adapters do SHAPE NORMALIZATION ONLY. Per ADR-002 the relay stays a dumb relay:
  no classification, no interest values, no drama — that all remains client-side.
- Each adapter owns: id namespacing, state mapping, period/clock mapping,
  team-name -> logoKey mapping (FIELD asset table), and TTL.

MIGRATION
Phase 0 (no behaviour change):
  1. Define FieldGame in the relay; build adapters for the already-wired sources.
  2. Add /v2/* routes. Keep the ESPN paths live in parallel.
  3. Client: add a thin /v2 reader behind a flag (e.g. FIELD_V2_SOURCES) that produces
     the same internal objects the card renderer already consumes. ESPN path untouched.
Phase 1 (per sport, independently reversible):
  4. Flip ONE sport's flag to /v2; diff render vs the ESPN path for parity (smoke + manual);
     bake ~1 day.
  5. On parity, remove that sport's ESPN read sites and its /espn-gambit + /espn-summary use.
     Repeat per sport.
  6. When every non-residue sport is off ESPN: delete the /espn-gambit + /espn-summary relay
     routes and the espnGOTD client flags (replace with per-league GOTD or curation).

RESIDUE AFTER PHASE 1 (this is the line-item list to price Phase 2's licensed provider against)
- NFL live scores/state (no clean free source).
- Real-time in-play granularity where StatsAPI / api-web / BDL are coarse or rate-limited.
- Tennis, Golf (RED).

GUARDRAILS
- smoke stays green at every step (deploy-gate).
- Each per-sport flip is revertible (flag back to the ESPN path until the path is deleted).
- DO NOT INVENT: exact upstream field paths (StatsAPI linescore fields, api-web clock, etc.)
  must be confirmed against a live response inside each adapter — not assumed from memory.
