#!/usr/bin/env node
// scripts/audit-prompt-tag-array.js — audits a function's real per-game
// prompt-tag array (the `(()=>{try{...}catch(e_){return ''}})()` IIFE
// pattern used throughout buildCompoundPrompt) via a real AST parse, not
// text search.
//
// Run: node scripts/audit-prompt-tag-array.js [functionName]
//   functionName defaults to buildCompoundPrompt.
//
// Finds the target function's own large per-game array literal (the one
// that gets `.filter(Boolean).join(...)`-ed into the final prompt), then
// for each IIFE that is a DIRECT ELEMENT of that array (not any IIFE
// transitively nested anywhere in the function -- a naive walk catches
// local-variable helpers like `const tomET = (() => {...})();` already
// covered by their own enclosing IIFE's try/catch, producing false
// positives):
//   - flags any array-element IIFE missing a try/catch
//   - flags any IIFE whose catch clause doesn't `return ''` (worth a human
//     read -- may be a legitimate side-effect-only entry like
//     populateSeriesContext, not necessarily a bug; check what the array
//     is chained into before assuming)
//   - flags exact-duplicate IIFE bodies (byte-identical after whitespace
//     normalization)
//   - flags regexes shared by 2+ IIFEs (may be an intentional paired
//     signal, e.g. [SEASON STATS]/[RECENT FORM] sharing the same
//     player-name extraction -- not necessarily a bug either)
//
// Built 2026-07-15 during the never-adopted-utilities-disposal /
// bdl-recent-form work, checked in per CC-CMD session discussion so it's
// reusable next time this prompt-tag cluster grows, rather than lost in a
// scratchpad (see HANDOFF.md's own 2026-07-13 note about this exact gap).

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TARGET_FN = process.argv[2] || 'buildCompoundPrompt';

(async () => {
  const { Parser, Language } = require('web-tree-sitter');
  await Parser.init();
  const parser = new Parser();
  const jsWasmPath = path.join(
    require.resolve('tree-sitter-javascript/package.json'), '..', 'tree-sitter-javascript.wasm'
  );
  const JavaScript = await Language.load(jsWasmPath);
  parser.setLanguage(JavaScript);

  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const scriptMatches = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  const mainScript = scriptMatches.map(m => m[1]).sort((a, b) => b.length - a.length)[0];
  if (!mainScript) { console.error('No <script> block found in index.html'); process.exit(1); }

  const tree = parser.parse(mainScript);
  const root = tree.rootNode;

  let targetFn = null;
  function findFn(node) {
    if (targetFn) return;
    if (node.type === 'function_declaration') {
      const nameNode = node.childForFieldName('name');
      if (nameNode && nameNode.text === TARGET_FN) { targetFn = node; return; }
    }
    for (let i = 0; i < node.childCount; i++) findFn(node.child(i));
  }
  findFn(root);
  if (!targetFn) { console.error(`function ${TARGET_FN} not found`); process.exit(1); }
  console.log(`${TARGET_FN} found: script-relative lines ${targetFn.startPosition.row + 1}-${targetFn.endPosition.row + 1}`);

  // The real per-game array isn't necessarily a bare `return [...]` -- in
  // buildCompoundPrompt it's inline-chained into .filter(Boolean).join(...).
  // Find it by size: the one large (>10 elements) array literal in the
  // function body. If a function has multiple large arrays this heuristic
  // needs refining -- confirmed unique for buildCompoundPrompt.
  let promptArray = null;
  function findBigArray(node) {
    if (promptArray) return;
    if (node.type === 'array' && node.namedChildCount > 10) { promptArray = node; return; }
    for (let i = 0; i < node.namedChildCount; i++) findBigArray(node.namedChild(i));
  }
  findBigArray(targetFn);
  if (!promptArray) { console.error('No large (>10 element) array literal found in this function'); process.exit(1); }
  console.log(`Prompt-tag array: ${promptArray.namedChildCount} direct elements, lines ${promptArray.startPosition.row + 1}-${promptArray.endPosition.row + 1}`);

  const iifes = [];
  for (let i = 0; i < promptArray.namedChildCount; i++) {
    const el = promptArray.namedChild(i);
    if (el.type === 'call_expression') {
      const fn = el.childForFieldName('function');
      if (fn && fn.type === 'parenthesized_expression') {
        const inner = fn.namedChild(0);
        if (inner && inner.type === 'arrow_function') iifes.push(el);
      }
    }
  }
  console.log(`Real array-element IIFEs: ${iifes.length} of ${promptArray.namedChildCount} total array elements\n`);

  const results = [];
  for (const iife of iifes) {
    const fn = iife.childForFieldName('function');
    const arrow = fn.namedChild(0);
    const body = arrow.childForFieldName('body');
    let tryStmt = null;
    if (body && body.type === 'statement_block') {
      for (let i = 0; i < body.namedChildCount; i++) {
        if (body.namedChild(i).type === 'try_statement') { tryStmt = body.namedChild(i); break; }
      }
    }
    const startLine = iife.startPosition.row + 1;
    const srcSnippet = mainScript.slice(iife.startIndex, Math.min(iife.startIndex + 60, iife.endIndex)).replace(/\n/g, ' ');
    let catchText = null;
    if (tryStmt) {
      const catchClause = tryStmt.childForFieldName('handler');
      if (catchClause) catchText = mainScript.slice(catchClause.startIndex, catchClause.endIndex);
    }
    results.push({ startLine, hasTry: !!tryStmt, catchText, srcSnippet, fullText: mainScript.slice(iife.startIndex, iife.endIndex) });
  }

  console.log('--- Try/catch contract audit ---');
  let missingTry = 0, nonEmptyCatch = 0;
  for (const r of results) {
    if (!r.hasTry) {
      missingTry++;
      console.log(`L${r.startLine}: NO try/catch -- ${r.srcSnippet}...`);
    } else if (r.catchText && !/return\s*['"]{2}\s*[;}]/.test(r.catchText.replace(/\s+/g, ' '))) {
      nonEmptyCatch++;
      console.log(`L${r.startLine}: catch does NOT return '' -- ${r.catchText.replace(/\s+/g, ' ')}`);
    }
  }
  console.log(`Summary: ${results.length} IIFEs, ${missingTry} missing try/catch, ${nonEmptyCatch} with a non-standard catch (read before assuming a bug).\n`);

  console.log('--- Duplicate body audit (exact match after whitespace normalization) ---');
  const norm = s => s.replace(/\s+/g, ' ').trim();
  const seen = new Map();
  let dupes = 0;
  for (const r of results) {
    const key = norm(r.fullText);
    if (seen.has(key)) { dupes++; console.log(`DUPLICATE: L${r.startLine} == L${seen.get(key)}`); }
    else seen.set(key, r.startLine);
  }
  if (!dupes) console.log('None found.\n'); else console.log('');

  console.log('--- Shared-regex audit (may be an intentional paired signal, not necessarily a bug) ---');
  const regexUsers = {};
  for (const r of results) {
    for (const pattern of (r.fullText.match(/\/[^\/\n]{10,80}\/g/g) || [])) {
      (regexUsers[pattern] = regexUsers[pattern] || []).push(r.startLine);
    }
  }
  let sharedAny = false;
  for (const [pattern, lines] of Object.entries(regexUsers)) {
    if (lines.length > 1) { sharedAny = true; console.log(`${pattern} used by ${lines.length} IIFEs: L${lines.join(', L')}`); }
  }
  if (!sharedAny) console.log('None found.');
})().catch(e => { console.error('ERROR:', e); process.exit(1); });
