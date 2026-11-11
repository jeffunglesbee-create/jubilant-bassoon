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
// Coverage (Rule 91): 5 properties, 1 function, 0 of the 26 sport keys (23 FIELD_V2_SOURCES + 3 past-date-only) are
// exercised against the real relay — the fetch is stubbed. Whether the relay
// actually serves a given past date is the probe manifest's job, not this.

import fs from 'node:fs';
// FIELD_SRC points the check at a mutated COPY (scripts/mutate-past-date-cups.mjs); the default is the real file.
const src = fs.readFileSync(process.env.FIELD_SRC || 'src/legacy/field.js', 'utf8');

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
const srcPast  = extract('V2_PAST_DATE_ONLY',      /const V2_PAST_DATE_ONLY = \{[^}]*\};/g);
const srcGame  = extract('_v2SectionGame',         /function _v2SectionGame\([\s\S]*?\n\}/g);
const srcFetch = extract('fetchRelayDateSections', /async function fetchRelayDateSections\(iso\) \{[\s\S]*?\n\}/g);

// Stubs are parameters, so nothing here can reach a real network or a real DOM.
// `past` is the V2_PAST_DATE_ONLY declaration the function sees. Tests 1 to 4 pass an EMPTY one, so they keep the meaning they had before the three cups were added
// (what the FIELD_V2_SOURCES keys do) and the older mutation gate scripts/mutate-relay-date-sections.mjs, which is built on them, still reads what it expects. Section 5 passes the real one.
const NO_PAST = 'const V2_PAST_DATE_ONLY = {};';
const make = (FIELD_V2_SOURCES, fetchV2Games, past = NO_PAST) => {
  const errors = [];
  const captureFieldError = (tag, err) => errors.push({ tag, msg: String(err?.message ?? err) });
  const fn = new Function('FIELD_V2_SOURCES', 'fetchV2Games', 'captureFieldError',
    `${srcMap}\n${past}\n${srcGame}\n${srcFetch}\nreturn fetchRelayDateSections;`
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

// ── 5. the FA Cup, EFL Cup and EFL Trophy are asked for on a past date although they are NOT FIELD_V2_SOURCES keys ──
// Relay CC-CMD-2026-08-08-fa-cup-coverage Task 6 (owner: "yes all 3", 2026-11-11). They are ESPN-sweep cards, so the live poll (which walks
// FIELD_V2_SOURCES) must not gain them, and a past day (which walks FIELD_V2_SOURCES AND V2_PAST_DATE_ONLY) must show them.
{
  const asked = [];
  const sources = { mlb: true, nhl: false };
  const before = JSON.stringify(sources);
  const { fn, errors } = make(sources, async k => {
    asked.push(k);
    return k === 'facup' ? [game('York City', 'Northampton Town'), game('Huddersfield Town', 'Exeter City')]
         : k === 'eflcup' ? [game('Liverpool', 'Chelsea')]
         : k === 'efltrophy' ? [game('Bolton Wanderers', 'Leeds United U21')]
         : k === 'nhl' ? [game('Bruins', 'Rangers')]      // the OFF key answers with a game, so asking for it shows up as a section
         : [];
  }, srcPast);
  const out = await fn('2026-11-07');
  check('5a all three past-date-only keys are asked for, and a FIELD_V2_SOURCES key that is off (nhl: false) is not',
        ['facup', 'eflcup', 'efltrophy', 'mlb'].every(k => asked.includes(k)) && asked.length === 4 && !asked.includes('nhl'), JSON.stringify(asked));
  const cup = (label) => out?.find(s => s.section === label);
  check('5b each cup becomes a section whose section AND sport are the SOCCER_LEAGUES label (FA Cup, EFL Cup, EFL Trophy), not the sport key; the off key adds none',
        ['FA Cup', 'EFL Cup', 'EFL Trophy'].every(l => cup(l)?.sport === l) && !out?.some(s => s.section === 'NHL'), JSON.stringify(out?.map(s => [s.section, s.sport])));
  check('5c the FA Cup section has both of its games, each carrying the cup label as its _sport and its _section',
        cup('FA Cup')?.games?.length === 2 && cup('FA Cup').games.every(g => g._sport === 'FA Cup' && g._section === 'FA Cup'), JSON.stringify(cup('FA Cup')?.games?.map(g => [g._sport, g._section])));
  check('5d asking for the cups does not add them to FIELD_V2_SOURCES (the live poll walks that object)',
        JSON.stringify(sources) === before && !('facup' in sources) && !('eflcup' in sources) && !('efltrophy' in sources), JSON.stringify(sources));
  check('5e no label was missing: nothing was reported to captureFieldError', errors.length === 0, JSON.stringify(errors));
}
{
  // a cup with no games that day is simply absent; one cup failing must not take the others (or the cups) with it
  const { fn, errors } = make({ mlb: true }, async k => {
    if (k === 'eflcup') throw new Error('relay 502');
    return k === 'facup' ? [game('A', 'B')] : k === 'mlb' ? [game('C', 'D')] : [];
  }, srcPast);
  const out = await fn('2026-11-07');
  check('5f a cup with no games is absent; a failing cup does not blank the others (FA Cup and MLB still render)',
        out?.length === 2 && out.some(s => s.section === 'FA Cup') && out.some(s => s.section === 'Baseball (MLB)'), JSON.stringify(out?.map(s => s.section)));
  check('5g the failing cup is reported by name', errors.some(e => e.tag === 'relay-date-sections:eflcup' && /502/.test(e.msg)), JSON.stringify(errors));
}

console.log(`\nchecked 5 propert(ies) of fetchRelayDateSections across 18 assertions, `
          + `against extracted source (not a copy); the relay fetch is stubbed, so this `
          + `proves nothing about whether any real date has data`);
if (failed) { console.error(`FAIL — ${failed} assertion(s).`); process.exit(1); }
console.log('PASS');
