#!/usr/bin/env node
// The ADR-002 clearance cited at src/debrief/index.ts is CONDITIONAL: the chip
// is a composite, a threshold, a tier and a recommendation vocabulary, and it
// clears only because the code runs post-game only (ADR-002 Defense 4 / Step 4).
//
// So "post-game only" is not a remark — it is the load-bearing claim, and it is
// exactly the kind of claim the ADR's own 2026-09-04 case study says gets
// asserted and never re-verified: a real violation "missed here because two
// prior documents asserted this section was post-game and neither claim was
// re-verified (Rule 72)". A citation nobody enforces is one of those documents.
//
// Every clause below is a way the clearance could lapse silently.
//
// Coverage (Rule 91): 4 source-level invariants in field.js. It does NOT prove
// the live page never renders a debrief on a live game — that would need a
// browser; it proves the code paths that could do so are still absent.

import fs from 'node:fs';
const src = fs.readFileSync('src/legacy/field.js', 'utf8');
const lines = src.split('\n');
const lineOf = (needle) => lines.findIndex(l => l.includes(needle)) + 1;

let failed = 0;
const check = (label, cond, detail) => {
  if (cond) console.log(`  ok    ${label}`);
  else { failed++; console.error(`  FAIL  ${label}${detail ? `\n        ${detail}` : ''}`); }
};

// 1. Exactly the two known buildDebrief call sites. A third would be an
//    unreviewed path and the clearance would not cover it.
const calls = [...src.matchAll(/^.*[^a-zA-Z_.]buildDebrief\(/gm)].map(m => m[0].trim());
check(`exactly 2 buildDebrief call sites (found ${calls.length})`,
      calls.length === 2, calls.join('\n        '));

// 2. injectDebriefCards still returns early unless isGameOver. This is THE gate.
const GUARD = "if (!rawGame || (typeof isGameOver === 'function' && !isGameOver(rawGame))) return;";
check('injectDebriefCards still gates on isGameOver', src.includes(GUARD),
      'the only live path to buildDebrief is no longer gated — the amnesty clearance has lapsed');

// 3. The ungated path (renderCard -> fillSlot('debrief', ...)) must stay DEAD.
//    Its two apparent callers must still resolve to the local arrow function
//    that shadows the global. If that shadow is renamed or removed, both calls
//    bind to the global and start rendering debriefs with no state gate.
const SHADOW = 'const renderCard=(text,loaded)=>{';
check('the local renderCard shadow still exists', src.includes(SHADOW),
      `without it, field.js:${lineOf('renderCard(cached,true)')} and the line below bind to the `
    + `GLOBAL renderCard, whose fillSlot(card,'debrief',...) has no isGameOver gate`);

// 4. Every renderCard(...) invocation must sit AFTER the shadow's declaration,
//    i.e. inside the scope it shadows. One appearing earlier would reach the
//    global. Counted by line number rather than assumed from today's layout.
const shadowLine = lineOf(SHADOW);
const invocations = lines
  .map((l, i) => ({ n: i + 1, l }))
  .filter(x => /[^a-zA-Z_.]renderCard\(/.test(x.l) && !/^\s*(\/\/|\*)/.test(x.l) && !/^function renderCard/.test(x.l.trim()));
const early = invocations.filter(x => x.n < shadowLine);
check(`all ${invocations.length} renderCard() invocation(s) are inside the shadowing scope`,
      early.length === 0,
      early.map(x => `line ${x.n}: ${x.l.trim()}`).join('\n        ')
      + `\n        (the shadow is declared at line ${shadowLine}; anything above it reaches the ungated global)`);

console.log(`\nchecked 4 source invariant(s) the ADR-002 amnesty clearance at src/debrief/index.ts `
          + `depends on. Proves the ungated code paths are absent; does NOT prove the live page `
          + `never renders a debrief on a live game — that needs a browser.`);
if (failed) {
  console.error(`\nFAIL — ${failed} invariant(s). The cited clearance no longer holds as written. `
              + `Either restore the invariant or re-open CC-CMD-2026-09-12-debrief-odds-scenario-chip.`);
  process.exit(1);
}
console.log('PASS');
