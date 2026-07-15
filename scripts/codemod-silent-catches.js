#!/usr/bin/env node
// scripts/codemod-silent-catches.js — mechanical AST rewrite that inserts a
// captureFieldError(...) call into a SILENT catch site (try/catch or
// .catch(...)), matching the fix pattern applied by hand across the
// 2026-07-15 archive-path audit (3 passes, 34 sites, see
// docs/outbox/cc-archive-silent-catch-fix-2026-07-15.md).
//
// Deliberately split into two mechanical/semantic stages:
//   1. `list`  — finds every catch site in scope (via the same AST logic as
//      audit-silent-catches.js) and emits a JSON manifest with a `label: ""`
//      placeholder per SILENT site. This tool does NOT invent labels --
//      `subsystem:operation` naming requires actually understanding what the
//      code does (CLAUDE.md Rule 1/2: do not invent, do not assume). A human
//      or an agent that has read the surrounding code fills in `label` and
//      `silent` (true/false) per site, and may set `skip: true` to exclude
//      a site (e.g. one judged genuinely fine to leave, or one already
//      covered by a prior pass).
//   2. `apply` — reads the filled-in manifest and performs ONLY the
//      mechanical text insertion: `captureFieldError(label, err, silent);`
//      as the first statement in the catch body. Refuses (skips + warns,
//      does not guess) on anything it can't do safely:
//        - a catch with no bound error identifier, unless --allow-add-param
//          is passed, and even then only if the body doesn't already
//          reference a bare `e` (that would silently break, not introduce,
//          a binding)
//        - a .catch(x => expr) with a concise (non-block) arrow body --
//          converting that to a block risks changing the promise chain's
//          return value semantics, which this tool will not guess about
//      Verifies a sourceHash captured at `list` time against the file at
//      `apply` time and aborts on mismatch, so a stale manifest can never
//      be silently applied against a since-edited file.
//
// Usage:
//   node scripts/codemod-silent-catches.js list <pattern> [> manifest.json]
//   node scripts/codemod-silent-catches.js apply <manifest.json> [--write] [--allow-add-param]
//     (without --write: dry-run, prints what would change)
//
// This tool does not run smoke.js / field_unit.js / forced-condition tests
// for you -- run those after every apply, same as every manual pass this
// session.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const REPORTERS = ['captureFieldError', 'console.error', 'console.warn', 'console.debug', 'throw'];
const INDEX_HTML = path.join(ROOT, 'index.html');

function sha(s) { return crypto.createHash('sha256').update(s).digest('hex').slice(0, 16); }

async function getParser() {
  const { Parser, Language } = require('web-tree-sitter');
  await Parser.init();
  const parser = new Parser();
  const jsWasmPath = path.join(
    require.resolve('tree-sitter-javascript/package.json'), '..', 'tree-sitter-javascript.wasm'
  );
  parser.setLanguage(await Language.load(jsWasmPath));
  return parser;
}

function extractMainScript(html) {
  const scriptMatches = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  const mainScript = scriptMatches.map(m => m[1]).sort((a, b) => b.length - a.length)[0];
  if (!mainScript) throw new Error('No <script> block found in index.html');
  return mainScript;
}

// Same function-collection + catch-enumeration logic as audit-silent-catches.js,
// kept in lockstep deliberately so `list` ordinals and `apply` ordinals agree.
function collectFns(root) {
  const fns = [];
  (function walk(node) {
    if (node.type === 'function_declaration') {
      const n = node.childForFieldName('name');
      fns.push({ name: n ? n.text : '(anonymous)', node });
    } else if (node.type === 'variable_declarator') {
      const n = node.childForFieldName('name');
      const v = node.childForFieldName('value');
      if (n && v && (v.type === 'arrow_function' || v.type === 'function_expression')) {
        fns.push({ name: n.text, node: v });
      }
    }
    for (let i = 0; i < node.namedChildCount; i++) walk(node.namedChild(i));
  })(root);
  return fns;
}

function bodyMatchesPattern(mainScript, fnNode, pattern) {
  const text = mainScript.slice(fnNode.startIndex, fnNode.endIndex).toLowerCase();
  return text.includes(pattern);
}

// Enumerate every catch site inside fnNode, in stable pre-order.
// Returns {kind, node, handlerOrCbNode, silent, line, snippet}
function findCatches(mainScript, fnNode) {
  const out = [];
  (function walk(node) {
    if (node.type === 'try_statement') {
      const handler = node.childForFieldName('handler');
      if (handler) {
        const body = mainScript.slice(handler.startIndex, handler.endIndex);
        const silent = !REPORTERS.some(r => body.includes(r));
        out.push({ kind: 'try/catch', node: handler, silent, line: handler.startPosition.row + 1,
          snippet: body.replace(/\s+/g, ' ').slice(0, 140) });
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
            out.push({ kind: '.catch(...)', node: cbArg, silent, line: node.startPosition.row + 1,
              snippet: body.replace(/\s+/g, ' ').slice(0, 140) });
          }
        }
      }
    }
    for (let i = 0; i < node.namedChildCount; i++) walk(node.namedChild(i));
  })(fnNode);
  return out;
}

async function cmdList(pattern) {
  const parser = await getParser();
  const html = fs.readFileSync(INDEX_HTML, 'utf8');
  const mainScript = extractMainScript(html);
  const root = parser.parse(mainScript).rootNode;

  const fns = collectFns(root);
  const matched = fns.filter(f => f.name.toLowerCase().includes(pattern) || bodyMatchesPattern(mainScript, f.node, pattern));

  const sites = [];
  for (const f of matched) {
    const catches = findCatches(mainScript, f.node);
    catches.forEach((c, ordinal) => {
      sites.push({
        fnName: f.name,
        ordinal,
        kind: c.kind,
        line: c.line,
        alreadyHandled: !c.silent,
        snippet: c.snippet,
        label: c.silent ? '' : null,
        silent: c.silent ? true : null,
        skip: !c.silent,
      });
    });
  }

  const manifest = {
    pattern,
    sourceHash: sha(mainScript),
    generatedAt: '(fill in manually -- Date.now() unavailable in this tool by design, same constraint as workflow scripts)',
    totalSites: sites.length,
    silentSites: sites.filter(s => !s.alreadyHandled).length,
    instructions: 'Fill in `label` (subsystem:operation, matching this file\'s existing convention) and `silent` (true/false) for every site where skip is not true. Set skip:true to exclude a site. Do not fill in labels you have not verified by reading the surrounding code -- see CLAUDE.md Rule 1/2.',
    sites,
  };
  process.stdout.write(JSON.stringify(manifest, null, 2) + '\n');
}

async function cmdApply(manifestPath, opts) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const parser = await getParser();
  const html = fs.readFileSync(INDEX_HTML, 'utf8');
  const mainScript = extractMainScript(html);

  const currentHash = sha(mainScript);
  if (currentHash !== manifest.sourceHash) {
    console.error(`ABORT: sourceHash mismatch (manifest=${manifest.sourceHash}, current=${currentHash}).`);
    console.error('index.html has changed since this manifest was generated -- re-run `list` against the current file rather than applying a stale manifest.');
    process.exit(1);
  }

  const root = parser.parse(mainScript).rootNode;
  const fns = collectFns(root);
  const byName = new Map();
  for (const f of fns) {
    if (!byName.has(f.name)) byName.set(f.name, []);
    byName.get(f.name).push(f);
  }

  const edits = []; // {startIndex, endIndex, replacement} -- applied back-to-front
  const skipped = [];
  const errors = [];

  for (const site of manifest.sites) {
    if (site.skip) continue;
    if (!site.label || typeof site.silent !== 'boolean') {
      errors.push(`${site.fnName}#${site.ordinal}: missing label or silent (skip:false but incomplete) -- fix the manifest or set skip:true`);
      continue;
    }

    const candidates = byName.get(site.fnName);
    if (!candidates || candidates.length !== 1) {
      errors.push(`${site.fnName}#${site.ordinal}: function name not found or ambiguous (${candidates ? candidates.length : 0} matches) in current source -- re-run \`list\` to regenerate`);
      continue;
    }
    const catches = findCatches(mainScript, candidates[0].node);
    const c = catches[site.ordinal];
    if (!c) {
      errors.push(`${site.fnName}#${site.ordinal}: ordinal out of range (function now has ${catches.length} catch sites) -- re-run \`list\` to regenerate`);
      continue;
    }
    if (c.kind !== site.kind) {
      errors.push(`${site.fnName}#${site.ordinal}: kind mismatch (manifest says ${site.kind}, source has ${c.kind}) -- re-run \`list\` to regenerate`);
      continue;
    }

    const node = c.node; // catch_clause | arrow_function | function_expression
    let paramNode = null, bodyNode = null;
    if (node.type === 'catch_clause') {
      paramNode = node.childForFieldName('parameter');
      bodyNode = node.childForFieldName('body');
    } else {
      // arrow_function or function_expression used as the .catch() callback
      const p = node.childForFieldName('parameters');
      paramNode = p && p.type === 'identifier' ? p : (p && p.namedChildCount === 1 ? p.namedChild(0) : (p && p.namedChildCount === 0 ? null : p));
      bodyNode = node.childForFieldName('body');
    }

    if (!bodyNode || bodyNode.type !== 'statement_block') {
      skipped.push(`${site.fnName}#${site.ordinal}: .catch() callback has a concise (non-block) body -- refusing to auto-convert, needs manual fix`);
      continue;
    }

    let errVar = paramNode ? paramNode.text : null;
    let paramEdit = null;
    if (!errVar) {
      if (!opts.allowAddParam) {
        skipped.push(`${site.fnName}#${site.ordinal}: no bound error identifier and --allow-add-param not passed -- refusing to guess, needs manual fix`);
        continue;
      }
      const bodyText = mainScript.slice(bodyNode.startIndex, bodyNode.endIndex);
      if (/\be\b/.test(bodyText)) {
        skipped.push(`${site.fnName}#${site.ordinal}: no bound error identifier, but body already references a bare 'e' -- adding a catch(e) binding would shadow it silently, refusing`);
        continue;
      }
      errVar = 'e';
      if (node.type === 'catch_clause') {
        // insert "(e)" between "catch" and the body's "{"
        paramEdit = { startIndex: node.startIndex + 'catch'.length, endIndex: bodyNode.startIndex, replacement: '(e) ' };
      } else {
        // arrow with zero params, e.g. "() => { ... }" -- replace the "()" with "(e)"
        const paramsField = node.childForFieldName('parameters');
        if (paramsField) {
          paramEdit = { startIndex: paramsField.startIndex, endIndex: paramsField.endIndex, replacement: '(e)' };
        } else {
          skipped.push(`${site.fnName}#${site.ordinal}: could not locate a parameters node to inject (e) into -- needs manual fix`);
          continue;
        }
      }
    }

    const labelEscaped = site.label.replace(/'/g, "\\'");
    const insertion = `captureFieldError('${labelEscaped}', ${errVar}, ${site.silent});`;

    const bodyText = mainScript.slice(bodyNode.startIndex, bodyNode.endIndex);
    const afterBrace = bodyText.slice(1);
    const multiline = /^\r?\n/.test(afterBrace);
    let replacement;
    if (multiline) {
      const m = /^\r?\n(\s*)/.exec(afterBrace);
      const indent = m ? m[1] : '  ';
      replacement = `{\n${indent}${insertion}`;
    } else {
      const needsSpace = afterBrace.length > 0 && !/^\s/.test(afterBrace);
      replacement = `{ ${insertion}${needsSpace ? ' ' : ''}`;
    }
    edits.push({ startIndex: bodyNode.startIndex, endIndex: bodyNode.startIndex + 1, replacement, label: `${site.fnName}#${site.ordinal} (body-insert)` });
    if (paramEdit) edits.push({ ...paramEdit, label: `${site.fnName}#${site.ordinal} (add param)` });
  }

  if (errors.length) {
    console.error(`${errors.length} manifest error(s), not applying anything:`);
    errors.forEach(e => console.error('  ERROR: ' + e));
    process.exit(1);
  }
  if (skipped.length) {
    console.error(`${skipped.length} site(s) skipped (need manual handling, not auto-applied):`);
    skipped.forEach(s => console.error('  SKIP: ' + s));
  }
  if (!edits.length) {
    console.error('No edits to apply.');
    process.exit(skipped.length ? 1 : 0);
  }

  edits.sort((a, b) => b.startIndex - a.startIndex);
  let newMainScript = mainScript;
  for (const e of edits) {
    newMainScript = newMainScript.slice(0, e.startIndex) + e.replacement + newMainScript.slice(e.endIndex);
  }

  console.log(`${edits.length} edit(s) across ${new Set(manifest.sites.filter(s => !s.skip).map(s => s.fnName)).size} function(s):`);
  for (const e of edits.slice().sort((a, b) => a.startIndex - b.startIndex)) console.log(`  ${e.label}`);

  if (!opts.write) {
    console.log('\nDry run (no --write passed). Nothing written.');
    return;
  }

  // NOTE: the replacement arg MUST be a function, not a string. String.replace()
  // treats a string replacement's own "$&"/"$$"/etc as special patterns (even
  // with a plain-string search value) -- newMainScript legitimately contains
  // "$&" (regex-escaping code elsewhere in the file), which silently corrupted
  // the entire splice the first time this was tried against real content.
  // Function replacements return their value verbatim, no pattern parsing.
  const newHtml = html.replace(mainScript, () => newMainScript);
  if (newHtml === html) throw new Error('replace() no-op -- mainScript substring not found for splice, aborting without writing');
  fs.writeFileSync(INDEX_HTML, newHtml);
  console.log(`\nWrote ${INDEX_HTML}. Run smoke.js / field_smoke.js / field_unit.js next -- this tool does not run them for you.`);
}

(async () => {
  const [, , cmd, arg] = process.argv;
  if (cmd === 'list') {
    await cmdList((arg || 'archive').toLowerCase());
  } else if (cmd === 'apply') {
    if (!arg) throw new Error('usage: node scripts/codemod-silent-catches.js apply <manifest.json> [--write] [--allow-add-param]');
    await cmdApply(arg, {
      write: process.argv.includes('--write'),
      allowAddParam: process.argv.includes('--allow-add-param'),
    });
  } else {
    console.error('usage:');
    console.error('  node scripts/codemod-silent-catches.js list <pattern>');
    console.error('  node scripts/codemod-silent-catches.js apply <manifest.json> [--write] [--allow-add-param]');
    process.exit(1);
  }
})().catch(e => { console.error('ERROR:', e); process.exit(1); });
