/**
 * Debrief domain — post-game card layer assembly.
 *
 * Owns the six functions that build the Debrief card overlay: five layer
 * builders (drama, journalism brief, odds story, series arc, bracket shift)
 * and the assembler (buildDebrief) that composes them.
 *
 * The motivating bug: buildSeriesArc originally read game.winner/game.margin
 * per-game, but the relay's findSeries() provides home_score/away_score per
 * game and a top-level margins[] array. The types here enforce the corrected
 * shape so a mismatch of this class fails at build time.
 *
 * fieldChip is injected via initDebriefModule() — same DI pattern as
 * identity/index.ts — because it lives in field.js scope and is not a
 * separately importable util.
 */

// ── Injected dependency ───────────────────────────────────────────────────────

type FieldChipFn = (text: string, tier: string, opts?: { small?: boolean; icon?: string }) => HTMLElement;

let _fieldChip: FieldChipFn | undefined;

export function initDebriefModule(deps: { fieldChip: FieldChipFn }): void {
  _fieldChip = deps.fieldChip;
}

// ── Data shapes ───────────────────────────────────────────────────────────────

/** Opening/closing moneyline odds from the Odds API. */
export interface MoneylineOdds {
  moneyline?: { home?: number; away?: number };
  [key: string]: unknown;
}

/** Resolved odds outcome for a completed game. */
export interface OddsOutcome {
  opening: MoneylineOdds;
  closing: MoneylineOdds | null;
  homeScore: number | null;
  awayScore: number | null;
  home: string;
  away: string;
  wentToOT: boolean;
}

/** One game entry from the relay's findSeries() — confirmed field names. */
export interface SeriesGame {
  id?: unknown;
  game_number?: number;
  date?: string;
  home?: string;
  away?: string;
  home_score: number | null;
  away_score: number | null;
  note?: string;
  importance?: unknown;
}

/** Return shape of relay's findSeries(). margins[] is home_score - away_score for completed games only. */
export interface SeriesArc {
  series: Record<string, unknown> | null;
  games: SeriesGame[];
  margins: number[];
}

/** One team's championship probability shift from BracketDO recompute. */
export interface BracketShift {
  name: string;
  champDelta: number;
  champAfter: number;
}

/** WC bracket delta payload from BracketDO. */
export interface BracketDelta {
  shifts: BracketShift[];
  significant?: boolean;
}

/** The debrief sub-object on an enriched game, as built by buildEnrichedGame(). */
export interface DebriefData {
  dramaSealed: number | null;
  dramaArc: number[] | null;
  oddsOutcome: OddsOutcome | null;
  preGameBrief: string | null;
  seriesArc: SeriesArc | null;
  bracketDelta: BracketDelta | null;
}

/** Minimal enriched game shape for buildDebrief. Full enriched games satisfy this. */
export interface EnrichedGameForDebrief {
  debrief?: DebriefData | null;
  [key: string]: unknown;
}

// ── Layer builders ────────────────────────────────────────────────────────────

/** Layer 1: Drama Unsealed — peak drama bar + tier chip + high-tension minutes. */
export function buildDramaUnsealed(debrief: DebriefData): HTMLElement | null {
  const peak = debrief?.dramaSealed;
  if (peak == null) return null;
  const wrap = document.createElement('div');
  wrap.className = 'debrief-drama';
  const barTrack = document.createElement('div');
  barTrack.className = 'debrief-drama__bar-track';
  const bar = document.createElement('div');
  bar.className = 'debrief-drama__bar';
  bar.style.width = `${Math.min(100, Math.max(0, Math.round(peak)))}%`;
  const tier = peak >= 85 ? 'MUST' : peak >= 65 ? 'HOT' : peak >= 45 ? 'HEATING' : 'QUIET';
  bar.dataset.tier = tier;
  barTrack.appendChild(bar);
  wrap.appendChild(barTrack);
  const chips = document.createElement('div');
  chips.className = 'debrief-drama__chips';
  chips.appendChild(_fieldChip!(tier, tier, { small: true }));
  const arc = debrief.dramaArc;
  if (Array.isArray(arc) && arc.length) {
    const highMins = Math.round(arc.filter(v => v >= 65).length * 15 / 60);
    if (highMins >= 1) chips.appendChild(_fieldChip!(`${highMins}m high`, 'HEATING', { small: true }));
  }
  wrap.appendChild(chips);
  return wrap;
}

/** Layer 2: FIELD Was Watching — journalism brief text (dim/italic). */
export function buildFieldWasWatching(debrief: DebriefData): HTMLElement | null {
  const brief = debrief?.preGameBrief;
  if (!brief) return null;
  const wrap = document.createElement('div');
  wrap.className = 'debrief-prediction';
  const p = document.createElement('p');
  p.className = 'debrief-prediction__text';
  p.textContent = String(brief).slice(0, 300);
  wrap.appendChild(p);
  return wrap;
}

/** Layer 3: The Odds Story — CHALK / UPSET / SWEAT from opening moneyline + result. */
export function buildOddsStory(debrief: DebriefData): HTMLElement | null {
  const odds = debrief?.oddsOutcome;
  if (!odds?.opening) return null;
  const { opening, home, away, homeScore, awayScore, wentToOT } = odds;
  const ml = opening.moneyline || {};
  const homeFav = (ml.home ?? 0) < (ml.away ?? 0);
  const homeWon = (homeScore ?? 0) > (awayScore ?? 0);
  const favWon  = homeFav === homeWon;
  const margin  = Math.abs((homeScore ?? 0) - (awayScore ?? 0));
  const scenario = !favWon ? 'UPSET' : (margin <= 1 || wentToOT) ? 'SWEAT' : 'CHALK';
  const wrap = document.createElement('div');
  wrap.className = 'debrief-odds';
  const labelRow = document.createElement('div');
  labelRow.className = 'debrief-odds__scenario';
  labelRow.appendChild(_fieldChip!(scenario,
    scenario === 'UPSET' ? 'MUST' : scenario === 'SWEAT' ? 'HOT' : 'QUIET',
    { small: true }));
  wrap.appendChild(labelRow);
  const favTeam = homeFav ? (home || 'Home') : (away || 'Away');
  const favMl   = homeFav ? ml.home : ml.away;
  const dogMl   = homeFav ? ml.away : ml.home;
  const dogTeam = homeFav ? (away || 'Away') : (home || 'Home');
  const line = document.createElement('div');
  line.className = 'debrief-odds__line';
  line.textContent = `${favTeam} ${(favMl ?? 0) > 0 ? '+' : ''}${favMl} · ${dogTeam} +${Math.abs(dogMl ?? 0)}`;
  wrap.appendChild(line);
  return wrap;
}

/**
 * Layer 4: Series Arc — playoff-only game dots.
 * Shape: seriesArc.games[].home_score / away_score (NOT game.winner/game.margin —
 * the old broken assumption). seriesArc.margins[] is top-level (home_score - away_score
 * for completed games only, shorter than games[] when unplayed games exist).
 */
export function buildSeriesArc(debrief: DebriefData): HTMLElement | null {
  const arc = debrief?.seriesArc;
  if (!arc) return null;
  const games = Array.isArray(arc.games) ? arc.games : [];
  if (!games.length) return null;
  const wrap = document.createElement('div');
  wrap.className = 'debrief-arc';
  const dots = document.createElement('div');
  dots.className = 'debrief-arc__dots';
  games.forEach((g, i) => {
    const dot = document.createElement('span');
    dot.className = 'debrief-arc__dot';
    const winner = (g.home_score != null && g.away_score != null)
      ? (g.home_score > g.away_score ? 'home' : 'away')
      : null;
    if (winner) dot.dataset.winner = winner;
    const margin = Array.isArray(arc.margins) ? arc.margins[i] : null;
    if (margin != null) dot.title = `${margin > 0 ? '+' : ''}${margin}`;
    dots.appendChild(dot);
  });
  wrap.appendChild(dots);
  return wrap;
}

/** Layer 5: WC Bracket Shift — top-3 championship probability movers. */
export function buildBracketDeltaLayer(debrief: DebriefData): HTMLElement | null {
  const bd = debrief?.bracketDelta;
  if (!bd || !Array.isArray(bd.shifts) || !bd.shifts.length) return null;
  const top = bd.shifts.slice(0, 3);
  const wrap = document.createElement('div');
  wrap.className = 'debrief-bracket';
  const label = document.createElement('div');
  label.className = 'debrief-bracket__label';
  label.textContent = 'WC Bracket Shift';
  if (bd.significant) label.appendChild(_fieldChip!('SIG', 'HOT', { small: true }));
  wrap.appendChild(label);
  const movers = document.createElement('div');
  movers.className = 'debrief-bracket__movers';
  for (const s of top) {
    const row = document.createElement('div');
    row.className = 'debrief-bracket__mover';
    const dir = s.champDelta > 0 ? '+' : '';
    row.textContent = `${s.name}  ${dir}${s.champDelta.toFixed(1)}pp (${s.champAfter.toFixed(1)}%)`;
    row.dataset.dir = s.champDelta > 0 ? 'up' : 'down';
    movers.appendChild(row);
  }
  wrap.appendChild(movers);
  return wrap;
}

/** Assembles Layers 1-5 into the card-debrief container Element. */
export function buildDebrief(enrichedGame: EnrichedGameForDebrief): HTMLElement | null {
  const debrief = enrichedGame?.debrief;
  if (!debrief) return null;
  const l1 = buildDramaUnsealed(debrief);
  const l2 = buildFieldWasWatching(debrief);
  const l3 = buildOddsStory(debrief);
  const l4 = buildSeriesArc(debrief);
  const l5 = buildBracketDeltaLayer(debrief);
  if (!l1 && !l2 && !l3 && !l4 && !l5) return null;
  const wrap = document.createElement('div');
  wrap.className = 'card-debrief-inner';
  if (l1) wrap.appendChild(l1);
  if (l2) wrap.appendChild(l2);
  if (l3) wrap.appendChild(l3);
  if (l4) wrap.appendChild(l4);
  if (l5) wrap.appendChild(l5);
  return wrap;
}
