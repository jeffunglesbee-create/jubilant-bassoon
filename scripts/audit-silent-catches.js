#!/usr/bin/env node
// scripts/audit-silent-catches.js — finds every catch site (try/catch and
// .catch(...)) inside functions whose body touches a given pattern (e.g. a
// relay path substring like "/archive/"), and classifies each as SILENT
// (no reporting call, no rethrow -- a failure vanishes with zero trace) or
// HANDLED (calls captureFieldError/console.error/console.warn, rethrows,
// or otherwise does something observable).
//
// Built for the 2026-07-15 archive-path audit (a real, external review
// found archiveBrief()/_archiveBrief() sitting behind empty catches --
// confirmed directly, then this tool built to find the FULL cluster via
// AST rather than eyeballing more grep hits one at a time).
//
// Usage:
//   node scripts/audit-silent-catches.js <pattern>
//     pattern matches against: function name (case-insensitive substring)
//     OR any string/template literal inside the function body (e.g. a URL
//     path). Defaults to "archive" if omitted.
//
// Known limits, disclosed rather than silently assumed away:
//   - "Handled" is a textual check (does the catch body's own text contain
//     a known reporting identifier) not a full semantic proof the error is
//     genuinely surfaced somewhere a human will see it -- read the flagged
//     HANDLED sites too if you're doing a rigorous audit, this only
//     confirms SILENT sites reliably.
//   - Anonymous IIFEs and inline .then()/.catch() chains not inside any
//     named function are attributed to the nearest named enclosing
//     function, or "(top-level)" if none.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PATTERN = (process.argv[2] || 'archive').toLowerCase();
const REPORTERS = ['captureFieldError', 'console.error', 'console.warn', 'console.debug', 'throw'];

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

  // ── Find every named function (function_declaration or const-fn), plus
  // its full source text, so we can pattern-match its body and enumerate
  // catches inside it directly. ──────────────────────────────────────────
  const fns = []; // {name, node, line}
  function collectFns(node) {
    if (node.type === 'function_declaration') {
      const n = node.childForFieldName('name');
      fns.push({ name: n ? n.text : '(anonymous)', node, line: node.startPosition.row + 1 });
    } else if (node.type === 'variable_declarator') {
      const n = node.childForFieldName('name');
      const v = node.childForFieldName('value');
      if (n && v && (v.type === 'arrow_function' || v.type === 'function_expression')) {
        fns.push({ name: n.text, node: v, line: node.startPosition.row + 1 });
      }
    }
    for (let i = 0; i < node.namedChildCount; i++) collectFns(node.namedChild(i));
  }
  collectFns(root);

  // ── Only functions whose own body genuinely touches the pattern (by
  // name, or a string/template literal inside it) are in scope. ─────────
  function bodyMatchesPattern(fnNode) {
    const text = mainScript.slice(fnNode.startIndex, fnNode.endIndex).toLowerCase();
    return text.includes(PATTERN);
  }
  const matched = fns.filter(f => f.name.toLowerCase().includes(PATTERN) || bodyMatchesPattern(f.node));
  console.log(`Pattern "${PATTERN}": ${matched.length} function(s) matched (by name or body content).\n`);

  // ── Within each matched function, find every catch site. ───────────────
  const findings = []; // {fnName, fnLine, catchLine, kind, silent, snippet}

  function findCatchesIn(node, fnName) {
    if (node.type === 'try_statement') {
      const handler = node.childForFieldName('handler');
      if (handler) {
        const body = mainScript.slice(handler.startIndex, handler.endIndex);
        const silent = !REPORTERS.some(r => body.includes(r));
        findings.push({
          fnName, catchLine: handler.startPosition.row + 1, kind: 'try/catch', silent,
          snippet: body.replace(/\s+/g, ' ').slice(0, 140),
        });
      }
    }
    if (node.type === 'call_expression') {
      const fnField = node.childForFieldName('function');
      if (fnField && fnField.type === 'member_expression') {
        const prop = fnField.childForFieldName('property');
        if (prop && prop.text === 'catch') {
          const argsNode = node.childForFieldName('arguments');
          const cbArg = argsNode && argsNode.namedChildCount ? argsNode.namedChild(0) : null;
          if (cbArg) {
            const body = mainScript.slice(cbArg.startIndex, cbArg.endIndex);
            const silent = !REPORTERS.some(r => body.includes(r));
            findings.push({
              fnName, catchLine: node.startPosition.row + 1, kind: '.catch(...)', silent,
              snippet: body.replace(/\s+/g, ' ').slice(0, 140),
            });
          }
        }
      }
    }
    for (let i = 0; i < node.namedChildCount; i++) findCatchesIn(node.namedChild(i), fnName);
  }

  for (const f of matched) findCatchesIn(f.node, f.name);

  const silentFindings = findings.filter(x => x.silent);
  const handledFindings = findings.filter(x => !x.silent);

  console.log(`${findings.length} total catch sites found in matched functions.`);
  console.log(`${silentFindings.length} SILENT (no captureFieldError/console.error/console.warn/console.debug/throw in the catch body):\n`);
  for (const s of silentFindings) {
    console.log(`  L${s.catchLine}  ${s.kind}  in ${s.fnName}()`);
    console.log(`    ${s.snippet}`);
  }

  console.log(`\n${handledFindings.length} HANDLED (reporting call or rethrow found in the catch body -- still read these if being rigorous, this is a textual check, not semantic proof):\n`);
  for (const h of handledFindings) {
    console.log(`  L${h.catchLine}  ${h.kind}  in ${h.fnName}()`);
  }
})().catch(e => { console.error('ERROR:', e); process.exit(1); });
