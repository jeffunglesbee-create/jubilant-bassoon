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
  /** Named explicitly: the identical-timestamp guard in buildOddsMovement
      depends on it, and the index signature alone left it untyped. */
  captured_at?: string;
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

/**
 * Layer 6: Odds movement — what the home moneyline did between open and close.
 *
 * MEASURED 2026-09-12, 116 rows across four dates, and this is shaped around the
 * states that actually occur rather than the interesting one:
 *
 *   no odds            54   46.6%   -> returns null, renders nothing
 *   both, ML identical 31   26.7%   -> "unchanged from open"
 *   opening only       20   17.2%   -> a price, no movement claim
 *   both, ML moved     11    9.5%   -> the implied-pp shift
 *
 * Distinct from Layer 3: buildOddsStory reads `opening` and never destructures
 * `closing`, so it cannot say anything about movement. These do not overlap.
 *
 * NOT built from the relay's computeOddsStory(): that returns '' for BOTH "no
 * odds" and "moved under threshold", collapsing the dominant state into the
 * second one. It is also not on the wire — `odds_story` exists once in the
 * relay, as a journalism prompt-block id.
 *
 * ADR-002 / Rule F: a bookmaker's price and its implied probability are what a
 * neutral data vendor publishes. No composite, no threshold, no tier, no
 * recommendation. PULL ONLY — plain text, no chip, no colour by magnitude, not
 * sortable, not wired to any notification. Rule F clears display and does not
 * carry Rule A.
 */
function _impliedPct(american: unknown): number | null {
  if (typeof american !== 'number' || !Number.isFinite(american)) return null;
  return american < 0
    ? (-american) / (-american + 100) * 100
    : 100 / (american + 100) * 100;
}

function _fmtAmerican(n: number): string { return n > 0 ? `+${n}` : `${n}`; }

/** Is this pair a SEQUENCE — two observations, the closing one strictly later?
 *
 *  Ported from field-laboratory's `OddsStory` (`src/Desk.fs`), which models
 *  `NotASequence` as a first-class outcome:
 *
 *      match o.CapturedAt, c.CapturedAt with
 *      | Some ot, Some ct -> ct > ot      // STRICTLY after
 *      | _ -> false                        // unverifiable, so not a sequence
 *
 *  Both snapshots must be timestamped and the closing one strictly later.
 *  Equal timestamps are one observation. A missing timestamp leaves the order
 *  unverifiable, and assuming it holds is exactly the assumption this exists to
 *  stop being made silently. Neither can support a claim about change.
 */
function _isSequence(open: MoneylineOdds, close: MoneylineOdds): boolean {
  const ot = open?.captured_at ? Date.parse(open.captured_at) : NaN;
  const ct = close?.captured_at ? Date.parse(close.captured_at) : NaN;
  return Number.isFinite(ot) && Number.isFinite(ct) && ct > ot;
}

export function buildOddsMovement(debrief: DebriefData): HTMLElement | null {
  const odds = debrief?.oddsOutcome;
  if (!odds?.opening) return null;
  const open = odds.opening, close = odds.closing;
  const oh = open.moneyline ? open.moneyline.home : undefined;
  const oPct = _impliedPct(oh);
  if (oPct == null || typeof oh !== 'number') return null;
  const opened = `${_fmtAmerican(oh)} (${oPct.toFixed(0)}% implied)`;

  let text: string;
  if (!close || !_isSequence(open, close)) {
    // ODDS-PROOF.md, 2026-08-09: closing_odds was once the same snapshot as
    // opening_odds, captured ~22 SECONDS BEFORE it, identical across moneyline,
    // spread and total. Rendering "unchanged" from that pair is "worse than
    // rendering nothing, because it invents a finding".
    //
    // The first version of this guard only caught identical timestamps, which
    // is the one case that defect did NOT produce. A pair with no timestamps,
    // or one captured out of order, fell through and claimed movement.
    text = `Home line opened ${opened}`;
  } else {
    const ch = close.moneyline ? close.moneyline.home : undefined;
    const cPct = _impliedPct(ch);
    if (cPct == null || typeof ch !== 'number') {
      text = `Home line opened ${opened}`;
    } else if (ch === oh) {
      // "the home moneyline", not "the line": the sample this was built from
      // (MLB_2026-09-11_e401816899) has an identical ML while the spread PRICES
      // moved, 113 -> 109 and -136 -> -132. Scoping the claim to what was
      // actually compared keeps it true.
      text = `Home moneyline ${opened}, unchanged from open`;
    } else {
      const delta = cPct - oPct;
      text = `Home moneyline ${_fmtAmerican(oh)} \u2192 ${_fmtAmerican(ch)}, `
           + `${Math.abs(delta).toFixed(1)} pts ${delta > 0 ? 'toward home' : 'toward away'}`;
    }
  }

  const wrap = document.createElement('div');
  wrap.className = 'debrief-odds-movement';
  wrap.textContent = text;
  return wrap;
}

/** Assembles Layers 1-6 into the card-debrief container Element. */
export function buildDebrief(enrichedGame: EnrichedGameForDebrief): HTMLElement | null {
  const debrief = enrichedGame?.debrief;
  if (!debrief) return null;
  const l1 = buildDramaUnsealed(debrief);
  const l2 = buildFieldWasWatching(debrief);
  const l3 = buildOddsStory(debrief);
  const l4 = buildSeriesArc(debrief);
  const l5 = buildBracketDeltaLayer(debrief);
  const l6 = buildOddsMovement(debrief);
  if (!l1 && !l2 && !l3 && !l4 && !l5 && !l6) return null;
  const wrap = document.createElement('div');
  wrap.className = 'card-debrief-inner';
  if (l1) wrap.appendChild(l1);
  if (l2) wrap.appendChild(l2);
  if (l3) wrap.appendChild(l3);
  if (l4) wrap.appendChild(l4);
  if (l5) wrap.appendChild(l5);
  if (l6) wrap.appendChild(l6);
  return wrap;
}
