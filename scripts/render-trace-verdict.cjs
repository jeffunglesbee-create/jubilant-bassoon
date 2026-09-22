// WHERE EACH MISSING SECTION WAS LOST, named per section.
//
// `sections_model_not_in_dom` has been a COUNT for ten days. A count cannot
// separate the three ways a section reaches allData and not the DOM:
//
//   - the render never iterated it   (it entered allData after that pass)
//   - the render iterated it and a filter removed it
//   - the render iterated it and emitted nothing for it
//
// Those want three different fixes, and every hypothesis refuted so far was
// refuted because it assumed one of them without being able to tell.
// `window._fieldRenderTrace` records what renderAll actually saw and produced;
// this function zips that against the gap.
//
// Extracted so a test exercises THIS function and not a copy of it.
'use strict';

/**
 * @param {string[]} missing  labels in the model but not in the DOM
 * @param {{outcome:string, modelSections:{label:string,games:number|null}[],
 *          sections:{label:string,games:number|null,emitted:boolean,chars:number|null}[]}} trace
 * @returns {{label:string, verdict:string, games:number|null, chars:number|null}[]|null}
 *
 * null when the verdict cannot be reached at all — an old bundle with no
 * trace, or a gap that could not be computed. NEVER [], which would read as
 * "checked, every section accounted for" (Rule 99).
 */
function traceVerdicts(missing, trace) {
  if (!Array.isArray(missing)) return null;
  if (!trace || !Array.isArray(trace.sections) || !Array.isArray(trace.modelSections)) return null;
  const rendered = new Map();
  for (const s of trace.sections) if (s && typeof s.label === 'string') rendered.set(s.label, s);
  const inModel = new Set();
  for (const s of trace.modelSections) if (s && typeof s.label === 'string') inModel.add(s.label);

  return missing.map(label => {
    const s = rendered.get(label);
    if (s) {
      // Emitted and still absent is a DIFFERENT defect from not emitted: the
      // section produced HTML and something downstream of the join dropped it.
      // applyMainHTML has already done exactly that once (the card-less
      // zero-change fast path, 2026-09-12), so this branch is not theoretical.
      if (s.emitted) return { label, verdict: 'emitted-but-absent', games: s.games ?? null, chars: s.chars ?? null };
      if (s.games === null || s.games === undefined)
        return { label, verdict: 'unknown-count', games: null, chars: s.chars ?? null };
      if (s.games > 0) return { label, verdict: 'dropped-at-render', games: s.games, chars: s.chars ?? null };
      return { label, verdict: 'empty-by-design', games: 0, chars: s.chars ?? null };
    }
    // In the model the render read, but not in what it iterated: a filter
    // removed it. Legitimate under myTeams/rivals; the trace carries the
    // filter states so a reader can tell.
    if (inModel.has(label)) return { label, verdict: 'filtered-out', games: null, chars: null };
    // Not even in the model the render read. The section entered allData after
    // that pass — nothing was dropped, nothing has rendered it yet.
    return { label, verdict: 'not-iterated', games: null, chars: null };
  });
}

/**
 * The census of verdicts, for the one line anyone actually reads.
 * @returns {Object<string,number>|null}
 */
function verdictCensus(verdicts) {
  if (!Array.isArray(verdicts)) return null;
  const by = {};
  for (const v of verdicts) if (v && typeof v.verdict === 'string') by[v.verdict] = (by[v.verdict] || 0) + 1;
  return by;
}

module.exports = { traceVerdicts, verdictCensus };
