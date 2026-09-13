#!/usr/bin/env node
// Rule 90. Four mutations, one per clause of the cited clearance — each is a
// real way the "post-game only" claim could stop being true while the citation
// at src/debrief/index.ts kept saying it was.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const SRC = 'src/legacy/field.js';
const sh = (c, a) => execFileSync(c, a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const dirty = sh('git', ['status', '--porcelain', '--', SRC]).trim();
if (dirty) { console.error(`FAIL — ${SRC} is dirty; refusing to mutate.\n${dirty}`); process.exit(1); }

const MUTATIONS = [
  { name: 'D1  the isGameOver gate is removed from injectDebriefCards',
    anchor: "    if (!rawGame || (typeof isGameOver === 'function' && !isGameOver(rawGame))) return;",
    replace: '    if (!rawGame) return;',
    expect: 'still gates on isGameOver' },
  { name: 'D2  the local renderCard shadow is renamed — both calls bind to the ungated global',
    anchor: 'const renderCard=(text,loaded)=>{',
    replace: 'const renderOwlCard=(text,loaded)=>{',
    expect: 'local renderCard shadow still exists' },
  { name: 'D3  a third buildDebrief call site appears',
    anchor: '      const debriefEl = buildDebrief(enriched);',
    replace: '      const debriefEl = buildDebrief(enriched);\n      const _extra = buildDebrief(enriched);',
    expect: 'exactly 2 buildDebrief call sites' },
  { name: 'D4  a renderCard() call appears ABOVE the shadow, reaching the global',
    anchor: '  fillSlot(card, \'crew\', enrichedGame.crew || null);',
    replace: '  fillSlot(card, \'crew\', enrichedGame.crew || null);\n  if (globalThis.__never) renderCard(enrichedGame, null);',
    expect: 'inside the shadowing scope' },
];

let bad = 0;
for (const m of MUTATIONS) {
  const before = fs.readFileSync(SRC, 'utf8');
  const hits = before.split(m.anchor).length - 1;
  if (hits !== 1) {
    bad++; console.error(`  ANCHOR  ${m.name}\n          anchor occurs ${hits} time(s), expected 1. NOTHING WAS MUTATED — harness defect, not a result.`);
    continue;
  }
  fs.writeFileSync(SRC, before.replace(m.anchor, m.replace));
  if (!fs.readFileSync(SRC, 'utf8').includes(m.replace)) {
    bad++; console.error(`  NOTAPPLIED  ${m.name}`); sh('git', ['checkout', '--', SRC]); continue;
  }

  let out = '', code = 0;
  try { out = sh('node', ['scripts/check-debrief-postgame-only.mjs']); }
  catch (e) { code = e.status ?? 1; out = `${e.stdout || ''}${e.stderr || ''}`; }
  sh('git', ['checkout', '--', SRC]);

  if (code === 0) { bad++; console.error(`  NOT CAUGHT  ${m.name}\n          the check still passed.`); }
  else if (!(out.match(/^ {2}FAIL {2}.*$/gm) || []).some(l => l.includes(m.expect))) {
    bad++; console.error(`  WRONG REASON  ${m.name}\n          failed, but no FAIL line mentioned "${m.expect}". Output:\n${out}`);
  } else {
    console.log(`  caught  ${m.name}\n          by "${m.expect}"`);
  }
}

const post = sh('git', ['status', '--porcelain', '--', SRC]).trim();
if (post) { console.error(`FAIL — ${SRC} not restored:\n${post}`); process.exit(1); }
console.log(`\nran ${MUTATIONS.length} mutation(s) against scripts/check-debrief-postgame-only.mjs; each asserted `
          + `its anchor unique and its effect present before the verdict; ${SRC} restored clean`);
if (bad) { console.error(`FAIL — ${bad} mutation(s) not caught or not applied.`); process.exit(1); }
console.log('PASS');
