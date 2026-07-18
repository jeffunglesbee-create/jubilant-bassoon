/**
 * Identity domain — game ID lookup and resolution.
 *
 * Owns the boundary between FIELD's internal volatile _id (format "g{n}",
 * reassigned each page load) and external real game IDs (api-sports.io fg.id,
 * carried on espnScores entries). This boundary was the site of the MLB
 * dual-ID incident: two code paths produced incompatible ID formats for the
 * same real games, silently orphaning 206 journalism briefs.
 *
 * Dependencies are injected at module load via initIdentityModule() — these
 * functions read live mutable state (allGamesFlat, espnScores, allData) that
 * cannot be statically imported since it lives in field.js's own module scope.
 */

/** FIELD-internal per-load volatile game ID. Format: "g{number}". Resets on each page load. */
export type FieldInternalId = string;

/** External real game ID from api-sports.io (fg.id). Stable across page loads. */
export type ExternalGameId = string;

/** Minimal FIELD game shape for identity operations. Full game objects satisfy this interface. */
export interface FieldGame {
  _id: FieldInternalId;
  _gameId?: ExternalGameId;
  home?: string;
  away?: string;
  start_time?: string;
  [key: string]: unknown;
}

/** ESPN scores entry shape — only the fields identity functions read. */
interface EspnScoreEntry {
  homeName?: string;
  awayName?: string;
  _gameId?: ExternalGameId;
  state?: string;
  [key: string]: unknown;
}

/** Data store shape — only the fields identity functions traverse. */
interface FieldData {
  sports?: Array<{ games?: FieldGame[] }>;
}

// Runtime dependency closures — injected by initIdentityModule().
let _allGamesFlat: (() => FieldGame[]) | undefined;
let _getEspnScores: (() => Record<string, EspnScoreEntry>) | undefined;
let _getAllData: (() => FieldData | null) | undefined;

/**
 * Inject live runtime dependencies. Call once at field.js module load, before
 * any event handlers can fire. Closures are called at invocation time, so they
 * always see the current values of espnScores and allData.
 */
export function initIdentityModule(deps: {
  games: () => FieldGame[];
  scores: () => Record<string, EspnScoreEntry>;
  data: () => FieldData | null;
}): void {
  _allGamesFlat = deps.games;
  _getEspnScores = deps.scores;
  _getAllData = deps.data;
}

/**
 * Find a FIELD game object by its internal _id.
 * Returns undefined if the id is not found in the current game list.
 */
export function findGameById(id: FieldInternalId): FieldGame | undefined {
  return _allGamesFlat?.().find(g => g._id === id);
}

/**
 * One-time fuzzy resolution from a FIELD game object to its external real game ID.
 * Bridges the independent construction paths: buildTodaySchedule assigns _id as
 * FIELD's own per-load counter; V2/mapV2ToESPN carries fg.id on espnScores entries.
 *
 * Ambiguity guard: if more than one espnScores entry matches the fuzzy home+away
 * suffix predicate, returns null rather than guessing. Empirically reproduced with
 * real franchise names sharing ≥6-letter mascots (Panthers, Giants, Rangers).
 *
 * Stale-final guard: a FINAL espnScores entry must not be matched to a game whose
 * start_time has not yet passed — same guard as findEspnEntry().
 *
 * Caches onto game._gameId so repeat callers get the real-ID fast path for free.
 */
export function _resolveRealGameId(game: FieldGame): ExternalGameId | null {
  if (!game) return null;
  if (game._gameId) return game._gameId;
  const scores = _getEspnScores?.();
  if (!scores) return null;
  const h = (game.home || '').toLowerCase().replace(/[^a-z]/g, '').slice(-6);
  const a = (game.away || '').toLowerCase().replace(/[^a-z]/g, '').slice(-6);
  const candidates = Object.values(scores).filter(v => {
    const vh = (v.homeName || '').toLowerCase().replace(/[^a-z]/g, '');
    const va = (v.awayName || '').toLowerCase().replace(/[^a-z]/g, '');
    return vh.endsWith(h) && va.endsWith(a);
  });
  if (candidates.length !== 1) return null; // 0 = no match yet; 2+ = ambiguous, don't guess
  const entry = candidates[0];
  if (!entry._gameId) return null;
  if (entry.state === 'post' && game.start_time &&
      new Date(game.start_time).getTime() > Date.now()) {
    return null; // stale-final guard — same as findEspnEntry()
  }
  game._gameId = entry._gameId;
  return entry._gameId;
}

/**
 * Resolve a FIELD game's _id by home team name. Fuzzy suffix match against allData.
 * Used to stamp _gameId on entries built from relay/CDN paths that lack the
 * api-sports.io fg.id but do have the team name.
 */
export function resolveGameIdByHome(homeName: string): FieldInternalId | null {
  try {
    const slug = (homeName || '').toLowerCase().replace(/[^a-z]/g, '').slice(-6);
    const data = _getAllData?.();
    for (const sec of (data?.sports || [])) {
      for (const g of (sec.games || [])) {
        if (g._id && g.home && (g.home || '').toLowerCase().replace(/[^a-z]/g, '').endsWith(slug)) {
          return g._id;
        }
      }
    }
  } catch (_) {}
  return null;
}
