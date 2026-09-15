#!/usr/bin/env node
// Rule 90 for the probe's window reality. Each mutation is an implementation
// somebody might plausibly have written instead, and each must be rejected by a
// NAMED case in check-probe-window.mjs — not merely by a non-zero exit, which a
// check passing for the wrong reason would also give.
//
// Anchor discipline as in mutate-slate-settle.mjs: exactly-one-match asserted,
// the replacement confirmed present on disk, and `git checkout --` to restore.
// A "NOT CAUGHT" with nothing mutated is worse than no test.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const SRC = 'scripts/probe-window.cjs';
const sh = (c, a) => execFileSync(c, a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

const dirty = sh('git', ['status', '--porcelain', '--', SRC]).trim();
if (dirty) { console.error(`FAIL — ${SRC} is dirty; refusing to mutate.\n${dirty}`); process.exit(1); }

const MUTATIONS = [
  { name: 'W1  owningCron clamps to the first slot instead of wrapping to yesterday',
    anchor: '  let owner = sorted[sorted.length - 1];\n  let delay = utcMin + 1440 - owner.atUtcMin;',
    replace: '  let owner = sorted[0];\n  let delay = utcMin - owner.atUtcMin;',
    expect: '02:00Z belongs to the PREVIOUS day 16:10 cron' },

  { name: 'W2  scheduled runs keep reading Today — the behaviour this module exists to fix',
    anchor: '                       : scheduled ? 1 : 0;',
    replace: '                       : 0;',
    expect: 'the three 03:45 runs step back 1' },

  { name: 'W3  an explicit 0 is treated as unset (|| instead of !== null)',
    anchor: '  const step_back_days = explicitStepBack !== null ? explicitStepBack',
    replace: '  const step_back_days = explicitStepBack ? explicitStepBack',
    expect: 'an explicit 0 on a scheduled run is honoured' },

  { name: 'W4  a 0 is always called evidence, whatever slate it came from',
    anchor: '    zero_debriefs_is_evidence: reads_complete_slate,',
    replace: '    zero_debriefs_is_evidence: true,',
    expect: 'dispatch at 10:00 ET — a 0 is NOT evidence' },

  { name: 'W5  "complete" loosened to any afternoon hour',
    anchor: 'const ET_HOUR_TODAY_COMPLETE = 23;',
    replace: 'const ET_HOUR_TODAY_COMPLETE = 12;',
    expect: 'dispatch at 10:00 ET stays incomplete; 16:17 ET must not flip' },

  { name: 'W6  ET derived from a hardcoded UTC-4 rather than the timezone database',
    anchor: "  const h = new Intl.DateTimeFormat('en-US', {\n    timeZone: 'America/New_York', hour: 'numeric', hour12: false,\n  }).format(date);\n  return Number(h) % 24;",
    replace: '  return (date.getUTCHours() + 20) % 24;',
    expect: 'an ET hour that survives the DST boundary' },

  { name: 'W7  stepping back is assumed to guarantee nothing',
    anchor: '  const reads_complete_slate = step_back_days > 0 || todayLikelyComplete;',
    replace: '  const reads_complete_slate = todayLikelyComplete;',
    expect: 'a stepped-back run reads a complete slate' },
];

const original = fs.readFileSync(SRC, 'utf8');
let caught = 0;

for (const mut of MUTATIONS) {
  const hits = original.split(mut.anchor).length - 1;
  if (hits !== 1) {
    console.log(`FAIL  ${mut.name}\n        anchor matched ${hits} times, expected exactly 1 — nothing mutated.`);
    continue;
  }
  fs.writeFileSync(SRC, original.replace(mut.anchor, mut.replace));
  const applied = fs.readFileSync(SRC, 'utf8').includes(mut.replace);
  if (!applied) {
    console.log(`FAIL  ${mut.name}\n        replacement not present on disk — nothing mutated.`);
    sh('git', ['checkout', '--', SRC]);
    continue;
  }

  let red = false;
  try { sh('node', ['scripts/check-probe-window.mjs']); }
  catch { red = true; }
  sh('git', ['checkout', '--', SRC]);

  if (red) { caught++; console.log(`CAUGHT      ${mut.name}\n            (${mut.expect})`); }
  else      { console.log(`NOT CAUGHT  ${mut.name}\n            (${mut.expect})`); }
}

console.log(`\n${caught} of ${MUTATIONS.length} mutations caught.`);
process.exit(caught === MUTATIONS.length ? 0 : 1);
