// Which "missing from the DOM" sections are actually a defect.
//
// renderAll returns "" for a section with no games, so a model label carrying
// games: [] is absent by design. Lumping it in with a section whose games were
// dropped inflates the gap with correct behaviour and makes the 0/5 done
// condition unclosable.
//
// Extracted so a test exercises THIS function and not a copy of it.
'use strict';

/**
 * @param {string[]} missing  labels in the model but not in the DOM
 * @param {{label: string, games: number|null}[]} counts  per-section game counts
 * @returns {{dropped: {label,games}[], empty: string[], unknown: string[]}}
 *
 * THREE BUCKETS, NEVER MERGED (Rule 99). `dropped` is the defect. `empty` is
 * the render doing its job. `unknown` is a section whose count could not be
 * read — a deployed bundle predating sportsGameCounts reports every label that
 * way, and calling those `empty` would silently report "no defect" for a page
 * that was never measured.
 */
function splitGap(missing, counts) {
  if (!Array.isArray(missing) || !Array.isArray(counts)) return null;
  const by = new Map(counts.map(c => [c && c.label, c ? c.games : undefined]));
  const bucket = { dropped: [], empty: [], unknown: [] };
  for (const label of missing) {
    const n = by.has(label) ? by.get(label) : undefined;
    if (n === undefined || n === null) bucket.unknown.push(label);
    else if (n > 0) bucket.dropped.push({ label, games: n });
    else bucket.empty.push(label);
  }
  return bucket;
}

/**
 * The sections whose model label and DOM key disagree.
 *
 * `renderAll` writes `data-sport="${sec.sport}"`; the manifest reports
 * `section || sport`. For a league-config section those differ by design
 * (`{sport:"basketball", section:"WNBA"}`), so a comparison across the two
 * counts a rendered section as missing. This names them so the count can be
 * read honestly rather than argued about.
 *
 * `sport: null` is NOT a mismatch — it means the entry has no sport key at all,
 * which is a different fact and belongs in `unknown`, not here.
 */
function keyMismatches(counts) {
  if (!Array.isArray(counts)) return null;
  return counts
    .filter(c => c && typeof c.sport === 'string' && c.sport !== c.label)
    .map(c => ({ label: c.label, sport: c.sport, games: c.games }));
}

/**
 * The gap recomputed on the key the DOM is keyed by.
 *
 * Takes the model's counts and the DOM's data-sport values and returns the
 * labels genuinely absent — a section is present if EITHER of its keys is in
 * the DOM, because either one matching means it rendered.
 */
function gapOnDomKey(counts, domSports) {
  if (!Array.isArray(counts) || !Array.isArray(domSports)) return null;
  const inDom = new Set(domSports);
  return counts
    .filter(c => c && !inDom.has(c.label) && !(typeof c.sport === 'string' && inDom.has(c.sport)))
    .map(c => c.label);
}

module.exports = { splitGap, keyMismatches, gapOnDomKey };
