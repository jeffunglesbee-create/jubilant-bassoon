#!/usr/bin/env node
// Task 0 of docs/CC-CMD-2026-11-26-night-owl-soccer-invented-numbers.md (Rule 68 / Rule 100: probe the premise before the fix).
// Reads src/legacy/field.js, the source, never a built copy, and RUNS its own expressions for every soccer label the client builds:
//   * the `_terms` ternary chain (the vocabulary line of the Night Owl fallback prompt): which branch each label lands in, and whether that branch invites xG / possession / shots;
//   * the P6B gate that decides whether a [MATCH STATS] line (possession, shots, corners) can enter the prompt at all;
//   * the no-box-stats rule text, and whether the saveEspnFinal stat snapshot (the queue prompt's only stat input) has any soccer branch;
//   * how many places in the function can supply an xG figure.
// It then joins the archive's per-label brief counts (outbox/night-owl-brief-counts-by-sport-2026-11-26.json) so the prompt side and the brief side sit in one table.
// Counts only, no brief text. Writes outbox/night-owl-soccer-prompt-numbers-<date>.json when given --write.
//
//   node scripts/probe-night-owl-soccer-numbers.mjs [--write]
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { isSoccerSportLabel } = require('../field_utils.js');

const DATE = '2026-11-26';
const html = fs.readFileSync(new URL('../src/legacy/field.js', import.meta.url), 'utf8');
const counts = JSON.parse(fs.readFileSync(new URL(`../outbox/night-owl-brief-counts-by-sport-${DATE}.json`, import.meta.url), 'utf8'));
const die = (m) => { console.error('PROBE BROKEN: ' + m); process.exit(2); };

// ---- cut the real pieces out of the source -------------------------------------------------------------------------------------------------------------------------
const fnStart = html.indexOf('async function fetchNightOwlFromClaude(topGame){');
if (fnStart < 0) die('fetchNightOwlFromClaude not found');
const fnEnd = html.indexOf('\n}\n', fnStart);
const fn = html.slice(fnStart, fnEnd + 2);

const termsM = /const _terms = ([\s\S]*?);\n  \/\/ Tier 1A/.exec(fn);
if (!termsM) die('_terms chain not found');
const termsOf = (label) => new Function('_sp', 'return ' + termsM[1])(label.toLowerCase());

const gateM = /P6B: Soccer[\s\S]*?\n    if \(([\s\S]*?)\) \{\n      try \{\n        const _kFwd/.exec(fn);
if (!gateM) die('P6B gate not found');
const gateOf = (label) => !!new Function('_sp', 'return (' + gateM[1] + ');')(label.toLowerCase());

const nbM = /_owlNoSeriesRule\s*\?\s*'(- No box stats available[^']*)'\s*:\s*'(- No box stats available[^']*)'/.exec(fn);
if (!nbM) die('no-box-stats rule pair not found');

const snapStart = html.indexOf("let statCtx = '';"), snapEnd = html.indexOf('const entry = {', snapStart);
if (snapStart < 0 || snapEnd < 0) die('saveEspnFinal statCtx block not found');
const snapshot = html.slice(snapStart, snapEnd);

// ---- the soccer labels the client builds (same census as smoke A745 / A746) --------------------------------------------------------------------------------------
const tbl = /const V2_SECTION_LABEL = \{([\s\S]*?)\n\};/.exec(html), sl = /const SOCCER_LEAGUES = \[([\s\S]*?)\n\];/.exec(html);
if (!tbl || !sl) die('label tables not found');
const v2 = Object.fromEntries([...tbl[1].matchAll(/(\w+):\s*'([^']+)'/g)].map((m) => [m[1], m[2]]));
const soccerKeys = ['mls', 'epl', 'laliga', 'seriea', 'ligue1', 'eflchamp', 'eflone', 'efltwo', 'ucl', 'europa', 'conference', 'uclqual', 'europaqual', 'conferencequal', 'bundesliga', 'wc26'];
const soccerLabels = new Set(soccerKeys.map((k) => v2[k]));
for (const m of sl[1].matchAll(/section:\s*'([^']+)'/g)) soccerLabels.add(m[1]);
if (soccerLabels.size < 18 || [...soccerLabels].some((l) => !l)) die('soccer label census is short: ' + soccerLabels.size);

// the briefs table stores two soccer sports under a short name (counts.sport_column_aliases); map them back to the client labels, one-to-one
const alias = Object.fromEntries(Object.entries(counts.sport_column_aliases).filter(([k]) => k !== 'what'));
const labelOfRow = (sport) => alias[sport] || sport;
const unionBy = new Map(counts.union_query.rows.map((r) => [labelOfRow(r.sport), r]));
const byLabel = new Map(counts.rows.map((r) => [labelOfRow(r.sport), { ...r, union: (unionBy.get(labelOfRow(r.sport)) || {}).xg_or_possession_pct ?? null }]));
const branchOf = (t) => (t.startsWith('Sport: Football (soccer) — FIFA World Cup') ? 'soccer:world-cup' : t.startsWith('Sport: Football (soccer).') ? 'soccer:generic' : 'other:' + t.slice(0, 28));
const useList = (t) => { const i = t.indexOf('Use:'); return i < 0 ? '' : t.slice(i); };

const labels = [...soccerLabels].sort().map((label) => {
  const t = termsOf(label), use = useList(t), c = byLabel.get(label) || null;
  return {
    label,
    isSoccerSportLabel: isSoccerSportLabel(label),
    termsBranch: branchOf(t),
    termsUseListInvitesXG: /\bxG\b/.test(use),
    termsUseListInvitesPossession: /possession/.test(use),
    termsUseListInvitesShots: /\bshots\b/.test(use),
    matchStatsGatePasses: gateOf(label),
    briefs: c ? { n: c.n, xg_mention: c.xg_mention, xg_figure: c.xg_figure, poss_mention: c.poss_mention, poss_with_pct: c.poss_with_pct, shots_mention: c.shots_mention, xg_or_possession_pct: c.union } : null,
  };
});

// labels from the other sports that the `_terms` chain sends to a soccer branch anyway
const otherLabels = ['nba', 'wnba', 'nfl', 'cfb', 'nhl', 'mlb', 'afl', 'cfl'].map((k) => v2[k]).filter(Boolean);
const otherInSoccerBranch = otherLabels.filter((l) => branchOf(termsOf(l)).startsWith('soccer')).map((l) => ({ label: l, termsBranch: branchOf(termsOf(l)), briefs: (byLabel.get(l) ? { n: byLabel.get(l).n, xg_mention: byLabel.get(l).xg_mention } : null) }));

const xgInFn = [...fn.matchAll(/xg/gi)].length, xgInTerms = [...termsM[1].matchAll(/xg/gi)].length;
const report = {
  probe: 'scripts/probe-night-owl-soccer-numbers.mjs', date: DATE,
  coverage: `${labels.length} soccer labels (V2_SECTION_LABEL soccer keys plus SOCCER_LEAGUES sections), read from src/legacy/field.js; ${otherLabels.length} other-sport labels checked for a soccer branch`,
  prompt: {
    noBoxStatsRuleDemandsANumberInEverySentence: /Every sentence must include a specific number/.test(nbM[1]) && /Every sentence must include a specific number/.test(nbM[2]),
    noBoxStatsSoccerBranchText: nbM[1],
    saveEspnFinalSnapshotHasASoccerBranch: /soccer|football|mls|epl|ucl|wc26/i.test(snapshot),
    xgMentionsInFunction: xgInFn, xgMentionsInsideTermsChain: xgInTerms,
    anyDataSourceInFunctionThatCouldSupplyAnXgFigure: xgInFn > xgInTerms,
    matchStatsLabelsEmittedByTheGate: ['Possession:', 'Shots:', 'Corners:'].filter((s) => fn.includes('`' + s)),
    labelsWhereMatchStatsGatePasses: labels.filter((l) => l.matchStatsGatePasses).map((l) => l.label),
    labelsWhereTermsInviteXG: labels.filter((l) => l.termsUseListInvitesXG).length,
  },
  labels,
  otherSportsInASoccerBranch: otherInSoccerBranch,
};

// ---- reading of the table: what Task 0.1 / 0.2 asks ----------------------------------------------------------------------------------------------------------------
const noFigure = labels.filter((l) => !l.matchStatsGatePasses);
const withBriefs = labels.filter((l) => l.briefs);
report.reading = {
  task01_figuresInPrompt: report.prompt.anyDataSourceInFunctionThatCouldSupplyAnXgFigure
    ? 'an xG source exists in the function: inspect it' : 'NO xG figure can enter any soccer prompt (no source in the function, none in the saved snapshot)',
  labelsWithNoPossessionShotsCornersInPrompt: noFigure.map((l) => l.label),
  labelsWithNoPossessionShotsCornersInPromptCount: noFigure.length,
  task02_inventedShare: noFigure.filter((l) => l.briefs).map((l) => ({ label: l.label, n: l.briefs.n, xg_mention: l.briefs.xg_mention, xg_or_possession_pct: l.briefs.xg_or_possession_pct, share: +(l.briefs.xg_or_possession_pct / l.briefs.n).toFixed(2) })),
  briefsInLabelsWithNoFigureInPrompt: noFigure.reduce((s, l) => s + (l.briefs ? l.briefs.n : 0), 0),
  briefsWithAnXgMentionInThoseLabels: noFigure.reduce((s, l) => s + (l.briefs ? l.briefs.xg_mention : 0), 0),
  briefsWithAnXgOrPossessionPctFigureInThoseLabels: noFigure.reduce((s, l) => s + (l.briefs ? l.briefs.xg_or_possession_pct : 0), 0),
  shareOfThoseBriefs: +(noFigure.reduce((s, l) => s + (l.briefs ? l.briefs.xg_or_possession_pct : 0), 0) / noFigure.reduce((s, l) => s + (l.briefs ? l.briefs.n : 0), 0)).toFixed(3),
  gatePassingLabelsAreLeftOut: 'FIFA World Cup 2026 and MLS Soccer can carry real possession/shots when the live stash exists; their briefs are not counted as invented here',
  labelsWithBriefsRead: withBriefs.length,
};

console.log(JSON.stringify(report, null, 2));
if (process.argv.includes('--write')) {
  fs.writeFileSync(new URL(`../outbox/night-owl-soccer-prompt-numbers-${DATE}.json`, import.meta.url), JSON.stringify(report, null, 2) + '\n');
  console.error(`wrote outbox/night-owl-soccer-prompt-numbers-${DATE}.json`);
}
