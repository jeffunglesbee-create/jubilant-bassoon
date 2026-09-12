#!/usr/bin/env node
// Behavioural test of fetchRelayDateSections — the past-date slate source
// (CC-CMD-2026-09-12-past-date-slate-from-relay). smoke.js is structural: it
// can see that the function exists and that goToDate calls it, and it cannot
// see what it RETURNS. The three properties below are all about return value.
//
// The function lives inside field.js's IIFE and is not exported, so its source
// text is extracted and evaluated here against stubs. That means this test
// reads the SOURCE, not a copy — if the extraction stops matching, every
// assertion below would silently stop running, so the extraction asserts it
// found exactly one of each declaration before anything else happens.
//
// Coverage (Rule 91): 3 properties, 1 function, 0 of the 23 sport keys are
// exercised against the real relay — the fetch is stubbed. Whether the relay
// actually serves a given past date is the probe manifest's job, not this.

import fs from 'node:fs';
const src = fs.readFileSync('src/legacy/field.js', 'utf8');

function extract(name, re) {
  const all = [...src.matchAll(re)];
  if (all.length !== 1) {
    console.error(`FAIL — extraction for ${name} matched ${all.length} time(s), expected exactly 1. `
                + `Nothing was checked; fix the pattern rather than trusting a pass.`);
    process.exit(1);
  }
  return all[0][0];
}

const srcMap   = extract('V2_SECTION_LABEL',       /const V2_SECTION_LABEL = \{[\s\S]*?\n\};/g);
const srcGame  = extract('_v2SectionGame',         /function _v2SectionGame\([\s\S]*?\n\}/g);
const srcFetch = extract('fetchRelayDateSections', /async function fetchRelayDateSections\(iso\) \{[\s\S]*?\n\}/g);

// Stubs are parameters, so nothing here can reach a real network or a real DOM.
const make = (FIELD_V2_SOURCES, fetchV2Games) => {
  const errors = [];
  const captureFieldError = (tag, err) => errors.push({ tag, msg: String(err?.message ?? err) });
  const fn = new Function('FIELD_V2_SOURCES', 'fetchV2Games', 'captureFieldError',
    `${srcMap}\n${srcGame}\n${srcFetch}\nreturn fetchRelayDateSections;`
  )(FIELD_V2_SOURCES, fetchV2Games, captureFieldError);
  return { fn, errors };
};

const game = (h, a) => ({ home: { name: h }, away: { name: a }, id: `${h}-${a}`, start: '2026-09-11T23:00:00Z', state: 'post' });

let failed = 0;
const check = (label, cond, detail) => {
  if (cond) { console.log(`  ok    ${label}`); }
  else      { failed++; console.error(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`); }
};

// ── 1. the happy path: enabled sports with games become labelled sections ──
{
  const { fn } = make(
    { mlb: true, nfl: true, nhl: false },
    async k => (k === 'mlb' ? [game('Reds', 'Cubs'), game('Rays', 'Jays')] : [game('Bills', 'Jets')])
  );
  const out = await fn('2026-09-11');
  check('1a three sections? no — only the two ENABLED sports return sections',
        Array.isArray(out) && out.length === 2, `got ${out && out.length}`);
  const mlb = out?.find(s => s.section === 'Baseball (MLB)');
  check('1b mlb section carries the map label, not the sport key', !!mlb, JSON.stringify(out?.map(s => s.section)));
  check('1c mlb section has both games', mlb?.games?.length === 2, `got ${mlb?.games?.length}`);
  check('1d a game carries home/away and the section label as its sport',
        mlb?.games?.[0]?.home === 'Reds' && mlb?.games?.[0]?._sport === 'Baseball (MLB)');
  check('1e a game carries NO streams key (injected sections never have them)',
        mlb?.games?.[0] && !('streams' in mlb.games[0]));
}

// ── 2. one sport failing must not take the other sports with it ──
// fetchV2Games catches everything and returns [] today, so this can only happen
// if that ever changes. Promise.all would turn one rejection into a blank slate
// for every sport at once; that coupling is what this asserts is absent.
{
  const { fn, errors } = make(
    { mlb: true, nfl: true, nhl: true },
    async k => { if (k === 'nfl') throw new Error('relay 503'); return [game('A', 'B')]; }
  );
  let out, threw = null;
  try { out = await fn('2026-09-11'); } catch (e) { threw = e; }
  check('2a one rejecting sport does not reject the whole call', threw === null, threw && threw.message);
  check('2b the other two sports still render', out?.length === 2, `got ${out && out.length}`);
  check('2c the failure is reported, not swallowed',
        errors.some(e => e.tag.startsWith('relay-date-sections') && /503/.test(e.msg)),
        JSON.stringify(errors));
}

// ── 3. a genuinely empty day returns null, so the caller owns the empty state ──
// Rule 99: absence must be distinguishable. An empty ARRAY here would render a
// slate with zero sections — a blank page. null routes to the no-events note.
{
  const { fn } = make({ mlb: true, nfl: true }, async () => []);
  const out = await fn('2026-09-11');
  check('3a every sport empty returns null, not [] and not a blank slate',
        out === null, JSON.stringify(out));
}

// ── 4. an unlabelled sport key is reported, not silently dropped ──
{
  const { fn, errors } = make({ mlb: true, notasport: true }, async () => [game('A', 'B')]);
  const out = await fn('2026-09-11');
  check('4a the labelled sport still renders', out?.length === 1, `got ${out && out.length}`);
  check('4b the unlabelled key is captured by name',
        errors.some(e => e.tag === 'relay-date-sections:no-label' && e.msg === 'notasport'),
        JSON.stringify(errors));
}

console.log(`\nchecked 4 propert(ies) of fetchRelayDateSections across 11 assertions, `
          + `against extracted source (not a copy); the relay fetch is stubbed, so this `
          + `proves nothing about whether any real date has data`);
if (failed) { console.error(`FAIL — ${failed} assertion(s).`); process.exit(1); }
console.log('PASS');
