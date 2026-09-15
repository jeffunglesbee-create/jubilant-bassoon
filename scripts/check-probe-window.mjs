#!/usr/bin/env node
// Enumerated input/output pairs for the probe's window reality
// (scripts/probe-window.cjs). odds_line_probe.js calls the same function, so
// this check and the probe cannot drift apart.
//
// Rule 90: the cases that matter are the ones a naive implementation gets
// WRONG. The five real scheduled runs below are the corpus — every one of them
// started hours after its cron, and three of them read a slate that could not
// contain a debrief while reporting the resulting 0 as though it could.

import { createRequire } from 'node:module';
const { windowReality } = createRequire(import.meta.url)('./probe-window.cjs');

// [ label, probedAt, trigger, explicitStepBack, expected subset ]
const CASES = [
  ['run 34949877281 — 03:45 cron, started 08:58Z (+5h13m), 04:58 ET',
   '2026-09-15T08:58:06Z', 'schedule', null,
   { cron: '03:45Z US window', delay_minutes: 313, et_hour: 4,
     today_likely_complete: false, step_back_days: 1,
     reads_complete_slate: true, zero_debriefs_is_evidence: true }],

  ['run 34826955734 — 03:45 cron, started 09:15Z (+5h30m)',
   '2026-09-14T09:15:31Z', 'schedule', null,
   { cron: '03:45Z US window', delay_minutes: 330, et_hour: 5, step_back_days: 1 }],

  ['run 34747944004 — 03:45 cron, started 08:32Z (+4h47m)',
   '2026-09-13T08:32:28Z', 'schedule', null,
   { cron: '03:45Z US window', delay_minutes: 287, et_hour: 4, step_back_days: 1 }],

  ['run 34892026130 — 16:10 cron, started 20:17Z (+4h07m), 16:17 ET',
   '2026-09-14T20:17:34Z', 'schedule', null,
   { cron: '16:10Z European window', delay_minutes: 247, et_hour: 16,
     today_likely_complete: false, step_back_days: 1 }],

  ['run 34775630281 — 16:10 cron, started 18:45Z (+2h36m)',
   '2026-09-13T18:45:53Z', 'schedule', null,
   { cron: '16:10Z European window', delay_minutes: 155, et_hour: 14, step_back_days: 1 }],

  // The wrap case: 02:00Z is before BOTH crons, so it belongs to the previous
  // day's 16:10 slot, not to 03:45 later the same morning. An implementation
  // that clamps to the first slot instead of wrapping gets this backwards.
  ['02:00Z belongs to the PREVIOUS day 16:10 cron, not the coming 03:45',
   '2026-09-15T02:00:00Z', 'schedule', null,
   { cron: '16:10Z European window', delay_minutes: 590 }],

  ['a run exactly on its cron minute has zero delay',
   '2026-09-15T03:45:00Z', 'schedule', null,
   { cron: '03:45Z US window', delay_minutes: 0 }],

  // A dispatch run reads Today by default — a human asking for Today at 10:00
  // ET gets a slate whose games are not final, and the manifest must say the
  // resulting 0 proves nothing.
  ['dispatch at 14:00Z (10:00 ET) reads Today, and a 0 is NOT evidence',
   '2026-09-15T14:00:00Z', 'workflow_dispatch', null,
   { cron: null, delay_minutes: null, et_hour: 10, step_back_days: 0,
     step_back_source: 'dispatch-default-0',
     reads_complete_slate: false, zero_debriefs_is_evidence: false }],

  ['dispatch at 03:30Z (23:30 ET) reads Today, and a 0 IS evidence',
   '2026-09-16T03:30:00Z', 'workflow_dispatch', null,
   { et_hour: 23, today_likely_complete: true, step_back_days: 0,
     reads_complete_slate: true, zero_debriefs_is_evidence: true }],

  ['an explicit 0 on a scheduled run overrides the default, and is honoured',
   '2026-09-15T08:58:06Z', 'schedule', 0,
   { step_back_days: 0, step_back_source: 'explicit',
     reads_complete_slate: false, zero_debriefs_is_evidence: false }],

  ['an explicit 2 is honoured and still reads a complete slate',
   '2026-09-15T08:58:06Z', 'schedule', 2,
   { step_back_days: 2, step_back_source: 'explicit', reads_complete_slate: true }],
];

let failed = 0;
for (const [label, at, trigger, explicit, expected] of CASES) {
  const got = windowReality(at, trigger, explicit);
  const bad = Object.entries(expected).filter(([k, v]) => got[k] !== v);
  if (bad.length) {
    failed++;
    console.log(`FAIL  ${label}`);
    for (const [k, v] of bad) console.log(`        ${k}: expected ${JSON.stringify(v)}, got ${JSON.stringify(got[k])}`);
  } else {
    console.log(`ok    ${label}`);
  }
}

console.log(`\nchecked ${CASES.length} cases of the probe-window contract, ${failed} failed.`);
process.exit(failed ? 1 : 0);
