#!/usr/bin/env node
// scripts/call-graph.js — real function call-graph / impact analysis via AST,
// not text search. Answers two questions plain grep can't answer reliably:
//   1. Who genuinely calls this function? (not a comment mention, not a
//      parameter/variable name collision -- see the teamName case: 69 raw
//      text hits, 1 real call-syntax occurrence, its own declaration)
//   2. What does this function itself call?
//
// Two reference mechanisms are tracked, since a real orphan sweep needs both
// (confirmed the hard way during the 2026-07-15 orphan-sweep session):
//   - CALLS   : real call_expression sites, e.g. fetchFoo(x)
//   - REFS    : bare function references passed to another call as an
//               argument, e.g. games.map(_computeSRPlayEPA) or
//               fetchSchedule().then(markFreshnessLive) -- genuinely live,
//               but invisible to a naive call_expression-only walk.
//
// Usage:
//   node scripts/call-graph.js <functionName>      -- report for one function
//   node scripts/call-graph.js --orphans            -- list every declared
//                                                       function with zero
//                                                       real CALLS or REFS
//   node scripts/call-graph.js --callers <name>     -- same as bare name
//   node scripts/call-graph.js --callees <name>     -- only outgoing edges
//
// Declaration shapes handled: `function foo(...)` and `const foo = (...) =>`
// / `const foo = function(...)`. Onclick-attribute string references
// ("onclick=\"foo()\"") are a THIRD real mechanism this script does not
// parse (they live in template-literal HTML strings, not JS call sites) --
// cross-check those by hand if a function you expect to be live shows 0
// CALLS/REFS; that's the known gap, not a false orphan.
//
// Two real bugs found and fixed while verifying this against known ground
// truth from the 2026-07-15 orphan sweep (not just trusted on a first pass):
//   1. Names locally re-declared in multiple unrelated enclosing functions
//      (e.g. `avg`/`close`/`cleanup`, each its own local const-fn helper in
//      8+ different places) can't be tracked as one canonical declaration --
//      a naive single name->declaration map made even real, live local
//      calls look orphaned (shadow-checked against the WRONG local
//      declaration). Fixed by tracking every declaration per name and its
//      nesting depth; --orphans only reports names with exactly one
//      declaration at top level (depth 0), where "does this have callers"
//      is actually a coherent question. Ambiguous names are reported as
//      such in single-function mode, not silently resolved to one of them.
//   2. The scope-shadow walk itself had a real bug: reaching all the way up
//      to `program` (top-level) scope and finding a same-named declaration
//      there was being treated as "shadowed", when a match at that level IS
//      the real global declaration being resolved to -- not a shadow at
//      all. This silently excluded real calls to ANY top-level function
//      whenever the walk-up happened to reach top scope with no closer
//      match (caught via `isPlayoffGame`, known from tonight's own
//      card-badges work to have 2 real callers -- the tool reported 0 until
//      this fix). Only a match inside a NESTED statement_block now counts
//      as a genuine shadow.
//
// Built 2026-07-15, checked in per the same reasoning as
// audit-prompt-tag-array.js -- reusable, not a scratchpad one-off.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

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

  // ── Pass 1: collect every declared function name. ──────────────────────
  // Real limitation found and fixed here, not glossed over: names like
  // `avg`/`close`/`cleanup` are declared as LOCAL `const name = () => {}`
  // helpers inside many DIFFERENT, unrelated enclosing functions (e.g.
  // `avg` has 8+ separate local declarations across the file). A single
  // name->declaration map can only remember the LAST one seen, and the
  // scope-shadow check (below) then correctly excludes every real call as
  // "shadowed by a DIFFERENT local declaration of the same name" -- net
  // effect: real, live, locally-called helpers were reported as orphans.
  // Fix: track ALL declarations per name plus each one's nesting depth.
  // `declaredNames` (name -> true) still gates call/ref matching (any
  // declaration of that name makes it a candidate); `declList` (name ->
  // array of {line, depth}) is used to detect ambiguity and restrict
  // --orphans to genuinely unique, top-level names, where a single global
  // call graph is actually a coherent question to ask.
  const declaredNames = new Set();
  const declList = new Map(); // name -> [{line, depth, kind}]
  const enclosingFnStack = []; // stack of {name, node} for call attribution
  let fnDepth = 0;

  function addDecl(name, line, kind, depth) {
    declaredNames.add(name);
    if (!declList.has(name)) declList.set(name, []);
    declList.get(name).push({ line, kind, depth });
  }

  function visitDeclarations(node) {
    let pushed = false;
    if (node.type === 'function_declaration') {
      const nameNode = node.childForFieldName('name');
      if (nameNode) addDecl(nameNode.text, node.startPosition.row + 1, 'function', fnDepth);
      enclosingFnStack.push({ name: nameNode ? nameNode.text : null, node });
      pushed = true; fnDepth++;
    } else if (node.type === 'variable_declarator') {
      const nameNode = node.childForFieldName('name');
      const valueNode = node.childForFieldName('value');
      if (nameNode && valueNode && (valueNode.type === 'arrow_function' || valueNode.type === 'function_expression')) {
        addDecl(nameNode.text, node.startPosition.row + 1, 'const-fn', fnDepth);
      }
    } else if (node.type === 'arrow_function' || node.type === 'function_expression') {
      // Anonymous function scope (e.g. IIFE, callback) -- push a null-name
      // frame so calls inside it still attribute to the nearest NAMED
      // enclosing function, not falsely to top-level.
      enclosingFnStack.push({ name: null, node });
      pushed = true; fnDepth++;
    }
    for (let i = 0; i < node.namedChildCount; i++) visitDeclarations(node.namedChild(i));
    if (pushed) { enclosingFnStack.pop(); fnDepth--; }
  }
  visitDeclarations(root);

  // Back-compat shim: code below checks `declarations.has(name)`.
  const declarations = { has: (n) => declaredNames.has(n) };

  // ── Pass 2: walk every call_expression. Two things extracted per call:
  //   (a) direct calls: callee identifier text, if it matches a declared name
  //   (b) bare references: any argument that is itself a plain identifier
  //       matching a declared name (the .map(fnName) / .then(fnName) shape)
  // ────────────────────────────────────────────────────────────────────
  const calls = []; // {calleeName, callerName, line}
  const refs = [];  // {refName, callerName, line, via} -- via = enclosing call's own callee text

  function calleeText(fnNode) {
    // function field of a call_expression: identifier, or member_expression
    // (foo.bar(...) -- we want 'bar', the real member name, for refs-via
    // labeling; for direct-call resolution we only match bare identifiers,
    // since index.html doesn't define functions as object methods for the
    // cases this tool cares about).
    if (fnNode.type === 'identifier') return fnNode.text;
    if (fnNode.type === 'member_expression') {
      const prop = fnNode.childForFieldName('property');
      return prop ? prop.text : null;
    }
    return null;
  }

  // ── Scope-shadow resolution ────────────────────────────────────────────
  // The `teamName` case (69 raw text hits, 1 real call: its own declaration
  // -- everything else was a same-named function PARAMETER in unrelated
  // functions) proved name-string matching alone is wrong: an identifier
  // `teamName` used inside `function fetchTeamRank(teamName) {...}` refers
  // to that LOCAL parameter, not the global `function teamName(g){...}`.
  // Real resolution: walk up from the usage node through enclosing
  // function scopes; if any enclosing function's own parameter list (or a
  // local const/let/var with the same name declared in an enclosing
  // block) binds this name BEFORE reaching the top level, the identifier
  // is shadowed -- it is NOT a reference to the global declaration.
  function isShadowed(identifierNode, name) {
    let node = identifierNode.parent;
    while (node) {
      if (node.type === 'function_declaration' || node.type === 'arrow_function' || node.type === 'function_expression') {
        const params = node.childForFieldName('parameters');
        if (params && paramListHasName(params, name)) return true;
      }
      // Real bug found and fixed here via the isPlayoffGame case: a match
      // at `program` (top-level) scope is the identifier correctly
      // resolving to the REAL global declaration itself, not a shadow --
      // walking that far up with no closer match means "not shadowed".
      // Only a match inside a NESTED `statement_block` is a genuine local
      // re-declaration that shadows the global one. Multiple genuine
      // top-level declarations of the same name are already handled
      // separately by declList's ambiguity check (declList.get(name).length
      // > 1), not by this function.
      if (node.type === 'statement_block') {
        for (let i = 0; i < node.namedChildCount; i++) {
          const stmt = node.namedChild(i);
          if (stmt.type === 'lexical_declaration' || stmt.type === 'variable_declaration') {
            for (let j = 0; j < stmt.namedChildCount; j++) {
              const decl = stmt.namedChild(j);
              if (decl.type === 'variable_declarator') {
                const n = decl.childForFieldName('name');
                if (n && n.type === 'identifier' && n.text === name && n.id !== identifierNode.id) return true;
              }
            }
          }
          // catch(e) blocks
          if (stmt.type === 'catch_clause') {
            const p = stmt.childForFieldName('parameter');
            if (p && p.type === 'identifier' && p.text === name) return true;
          }
        }
      }
      // for (const x of ...) / for (const x in ...) -- loop variable is a
      // bare identifier child, not wrapped in a variable_declarator (found
      // via the real `teamName` for-of loop in fetchNightOwlFromClaude).
      if (node.type === 'for_in_statement') {
        for (let i = 0; i < node.namedChildCount; i++) {
          const c = node.namedChild(i);
          if (c.type === 'identifier' && c.text === name && c.id !== identifierNode.id) return true;
          if ((c.type === 'array_pattern' || c.type === 'object_pattern') && c.text.includes(name)) return true;
        }
      }
      // classic for (let x = 0; ...; ...) -- init clause
      if (node.type === 'for_statement') {
        const init = node.childForFieldName('initializer');
        if (init && (init.type === 'lexical_declaration' || init.type === 'variable_declaration')) {
          for (let j = 0; j < init.namedChildCount; j++) {
            const decl = init.namedChild(j);
            if (decl.type === 'variable_declarator') {
              const n = decl.childForFieldName('name');
              if (n && n.type === 'identifier' && n.text === name) return true;
            }
          }
        }
      }
      node = node.parent;
    }
    return false;
  }
  function paramListHasName(paramsNode, name) {
    for (let i = 0; i < paramsNode.namedChildCount; i++) {
      const p = paramsNode.namedChild(i);
      if (p.type === 'identifier' && p.text === name) return true;
      if (p.type === 'assignment_pattern') {
        const left = p.childForFieldName('left');
        if (left && left.type === 'identifier' && left.text === name) return true;
      }
      if (p.type === 'object_pattern' || p.type === 'array_pattern') {
        // destructured param sharing the name -- treat as shadowing too
        if (p.text.includes(name)) return true;
      }
    }
    return false;
  }

  function visitCalls(node, enclosingStack) {
    let pushed = false;
    if (node.type === 'function_declaration' || node.type === 'arrow_function' || node.type === 'function_expression') {
      let name = null;
      if (node.type === 'function_declaration') {
        const n = node.childForFieldName('name');
        name = n ? n.text : null;
      } else {
        // arrow/function_expression: check if it's the RHS of a named const/let
        const parent = node.parent;
        if (parent && parent.type === 'variable_declarator') {
          const n = parent.childForFieldName('name');
          name = n ? n.text : null;
        }
      }
      enclosingStack = enclosingStack.concat([name]);
      pushed = true;
    }
    if (node.type === 'call_expression') {
      const fnNode = node.childForFieldName('function');
      const calleeName = fnNode ? calleeText(fnNode) : null;
      const line = node.startPosition.row + 1;
      const callerName = [...enclosingStack].reverse().find(Boolean) || '(top-level)';
      if (calleeName && declarations.has(calleeName) && fnNode.type === 'identifier' && !isShadowed(fnNode, calleeName)) {
        calls.push({ calleeName, callerName, line });
      }
      // Bare-reference arguments: games.map(_computeSRPlayEPA), etc.
      const argsNode = node.childForFieldName('arguments');
      if (argsNode) {
        for (let i = 0; i < argsNode.namedChildCount; i++) {
          const arg = argsNode.namedChild(i);
          if (arg.type === 'identifier' && declarations.has(arg.text) && arg.text !== calleeName && !isShadowed(arg, arg.text)) {
            refs.push({ refName: arg.text, callerName, line, via: calleeName || '(unknown)' });
          }
        }
      }
    }
    for (let i = 0; i < node.namedChildCount; i++) visitCalls(node.namedChild(i), enclosingStack);
    if (pushed) enclosingStack.pop();
  }
  visitCalls(root, []);

  // ── Report ────────────────────────────────────────────────────────────
  function report(name) {
    const decls = declList.get(name);
    if (!decls) { console.error(`Not found as a declared function: ${name}`); process.exit(1); }

    if (decls.length > 1) {
      console.log(`⚠ AMBIGUOUS: ${decls.length} separate declarations of "${name}" found:`);
      for (const d of decls) console.log(`  L${d.line} (${d.kind}, nesting depth ${d.depth})`);
      console.log(`Results below conflate all of them -- CALLS/REFS to any one are indistinguishable\n` +
        `from calls to another. This is a real, disclosed limitation (see script header):\n` +
        `local helper names re-declared in multiple unrelated enclosing functions can't be\n` +
        `told apart by this tool. Read the actual call sites below by hand before concluding\n` +
        `anything from the counts alone.\n`);
    } else {
      console.log(`${name} (${decls[0].kind}) — declared line ${decls[0].line}, nesting depth ${decls[0].depth}${decls[0].depth > 0 ? ' (LOCAL/nested, not a top-level function)' : ''}\n`);
    }

    const realCallers = calls.filter(c => c.calleeName === name);
    const realRefs = refs.filter(r => r.refName === name);
    console.log(`Called by (${realCallers.length}):`);
    if (!realCallers.length) console.log('  (none)');
    for (const c of realCallers) console.log(`  L${c.line}  from ${c.callerName}()`);

    console.log(`\nReferenced (not called) via bare-identifier arguments (${realRefs.length}):`);
    if (!realRefs.length) console.log('  (none)');
    for (const r of realRefs) console.log(`  L${r.line}  passed to ${r.via}(...) inside ${r.callerName}()`);

    const outgoing = calls.filter(c => c.callerName === name);
    const outgoingUnique = [...new Set(outgoing.map(c => c.calleeName))];
    console.log(`\nCalls (${outgoingUnique.length} distinct real callees):`);
    if (!outgoingUnique.length) console.log('  (none)');
    for (const callee of outgoingUnique) console.log(`  ${callee}()`);

    if (!realCallers.length && !realRefs.length && decls.length === 1) {
      console.log(`\n⚠ Zero real CALLS or REFS found. This IS the same signal the 2026-07-15\n` +
        `orphan sweep used, with one known gap: onclick="foo()" HTML-attribute\n` +
        `string references aren't parsed by this tool (they live in template-\n` +
        `literal strings, not JS call sites) -- cross-check with grep before\n` +
        `concluding this is dead.`);
    }
  }

  function reportOrphans() {
    const withCalls = new Set(calls.map(c => c.calleeName));
    const withRefs = new Set(refs.map(r => r.refName));
    // Restricted to names with exactly ONE declaration, at top level (depth
    // 0, i.e. a real function_declaration or const directly in the file's
    // top-level scope) -- see the Pass-1 comment for why: a name declared
    // multiple times as a local helper in different enclosing functions
    // can't be meaningfully asked "does THE global one have callers" at
    // all, and reporting it as an orphan would be actively wrong (real,
    // live local calls exist, just not to any single canonical declaration).
    const eligible = [...declList.entries()].filter(([n, ds]) => ds.length === 1 && ds[0].depth === 0);
    const ambiguousCount = declList.size - eligible.length;
    const orphans = eligible.filter(([n]) => !withCalls.has(n) && !withRefs.has(n)).map(([n]) => n).sort();
    console.log(`${declList.size} declared names total (${eligible.length} unique top-level, ${ambiguousCount} local/re-declared and excluded from this report).`);
    console.log(`${orphans.length} top-level functions with zero real CALLS or REFS:\n`);
    for (const name of orphans) {
      const d = declList.get(name)[0];
      console.log(`  ${name} — L${d.line}`);
    }
    console.log(`\nKnown gap: onclick="..." HTML-attribute references aren't parsed here -- cross-\n` +
      `check each with grep before treating it as confirmed dead. Local/re-declared names\n` +
      `(e.g. multiple unrelated functions each defining their own local "avg"/"close"\n` +
      `helper) are excluded here rather than falsely reported -- look them up individually\n` +
      `with report mode if you need to check one specifically.`);
  }

  const arg1 = process.argv[2];
  const arg2 = process.argv[3];
  if (!arg1) {
    console.error('Usage: node scripts/call-graph.js <functionName> | --orphans | --callers <name> | --callees <name>');
    process.exit(1);
  }
  if (arg1 === '--orphans') { reportOrphans(); return; }
  if (arg1 === '--callers' || arg1 === '--callees') { report(arg2); return; }
  report(arg1);
})().catch(e => { console.error('ERROR:', e); process.exit(1); });
