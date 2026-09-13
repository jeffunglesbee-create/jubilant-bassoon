#!/usr/bin/env node
// Rule 67: every CC session that produces code changes writes a session doc,
// AND the HANDOFF write names it. "Absence = violation."
//
// The first half was being honoured and the second was not. On 2026-09-12,
// eleven session docs existed and HANDOFF named three. The other eight were
// findable only by listing outbox/ — which is the exact failure Rule 67 was
// written for, since the rule exists because chat sessions were reverse-
// engineering changes from git log.
//
// A doc that exists and is unreferenced looks identical, from HANDOFF, to a
// session that never wrote one.

import fs from 'node:fs';

const handoff = fs.readFileSync('HANDOFF.md', 'utf8');
const docs = fs.readdirSync('outbox').filter(f => /^cc-session-.*\.md$/.test(f));
if (!docs.length) { console.error('FAIL — no cc-session-*.md in outbox/; the parse is wrong, nothing was checked.'); process.exit(1); }

// Only docs from the last N days: HANDOFF is pruned over time and demanding
// that it name every doc ever written would fail permanently and be ignored.
const DAYS = Number(process.env.SESSION_DOC_WINDOW_DAYS || 14);
const cutoff = new Date(Date.now() - DAYS * 86400000).toISOString().slice(0, 10);
const recent = docs.filter(f => {
  const m = f.match(/^cc-session-(\d{4}-\d{2}-\d{2})-/);
  return m && m[1] >= cutoff;
});

const missing = recent.filter(f => !handoff.includes(f));
console.log(`checked ${recent.length} session doc(s) from the last ${DAYS} day(s) `
          + `(of ${docs.length} in outbox/ overall) against HANDOFF.md`);
if (missing.length) {
  console.error(`FAIL — ${missing.length} session doc(s) exist and are NOT named in HANDOFF.md:`);
  for (const f of missing) console.error(`  ${f}`);
  console.error('Rule 67: the HANDOFF write must include "Session doc: outbox/<file>".');
  process.exit(1);
}
console.log('PASS');
