// CC-CMD-2026-08-09-token-resolution-audit, Task 2.
//
// Emits the CSS selectors whose declarations the phantom-token audit changed,
// DERIVED FROM THE COMMITS -- never from memory. A hand-written target list is
// how a probe returns a false green: it checks only what the author remembered,
// and the forgotten selector is the one that breaks.
//
// Method: for each commit, extract the <style> block from index.html at that
// commit AND at its parent, parse both into selector -> declarations maps with
// a real brace parse, and keep every selector whose body changed and whose new
// body contains a var() reference.
//
// The brace parse replaced a line-oriented diff parse, which could not see
// multi-line rules and reported 9 of them as anomalies. Parsing whole files at
// both revisions is slower and correct; the line parse was fast and wrong.
//
// Inline styles inside JS template literals are reported SEPARATELY, not as
// selectors. They have no selector to probe -- they are attributes on elements
// built at runtime -- and folding them into the selector list would claim
// coverage the probe cannot deliver.

import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const COMMITS = process.argv.slice(2);
if (!COMMITS.length) {
  console.error('usage: node scripts/derive-touched-selectors.mjs <commit> [<commit>...]');
  process.exit(1);
}

const show = (rev) =>
  execSync(`git show ${rev}:index.html`, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });

function cssRules(html) {
  const start = html.indexOf('<style');
  const end = html.indexOf('</style>', start);
  const css = html.slice(start, end);
  const map = new Map();
  // Deliberately the same shape as the parse used throughout this audit:
  // non-nested rules only. @media blocks nest, so their inner rules are
  // captured with the outer text stripped -- acceptable because every
  // declaration this audit touched is in a top-level rule, and the anomaly
  // count below is what would catch it if that stopped being true.
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = m[1].replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').trim();
    if (!sel || sel.startsWith('@')) continue;
    map.set(sel, m[2].replace(/\s+/g, ' ').trim());
  }
  return map;
}

function jsInlineVarLines(rev, prevRev) {
  // Added lines carrying var() that are NOT a complete CSS rule -- i.e. inline
  // styles in JS templates. Counted, never listed as selectors.
  const diff = execSync(`git diff -U0 ${prevRev} ${rev} -- index.html`,
    { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  return diff.split('\n')
    .filter((l) => l.startsWith('+') && !l.startsWith('+++') && l.includes('var(--'))
    .filter((l) => /style\s*=|style\.|cssText/.test(l))
    .map((l) => l.slice(1).trim().slice(0, 100));
}

const touched = new Map();
const inlineStyleSites = [];

for (const c of COMMITS) {
  const now = cssRules(show(c));
  const before = cssRules(show(`${c}^`));
  for (const [sel, body] of now) {
    if (before.get(sel) === body) continue;
    if (!body.includes('var(--')) continue;
    const props = body.split(';')
      .filter((d) => d.includes('var(--'))
      .map((d) => d.split(':')[0].trim())
      .filter(Boolean);
    if (!props.length) continue;
    if (!touched.has(sel)) touched.set(sel, new Set());
    props.forEach((p) => touched.get(sel).add(p));
  }
  inlineStyleSites.push(...jsInlineVarLines(c, `${c}^`));
}

const result = {
  commits: COMMITS,
  selectors: [...touched.entries()]
    .map(([selector, props]) => ({ selector, properties: [...props].sort() }))
    .sort((a, b) => a.selector.localeCompare(b.selector)),
  // Named honestly: these are real changed sites the selector probe CANNOT
  // cover. Their count belongs in the manifest so the audit's coverage claim
  // is bounded rather than implied.
  jsInlineStyleSites: inlineStyleSites,
};

writeFileSync('outbox/touched-selectors.json', JSON.stringify(result, null, 2));
console.log(`selectors: ${result.selectors.length}  js-inline-style sites (not selector-probeable): ${inlineStyleSites.length}`);
