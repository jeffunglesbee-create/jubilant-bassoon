#!/usr/bin/env node
// Classes the stylesheet defines that nothing emits. Ratcheted, not banned.
//
// STANDARDS Rule 63 says every committed function must have a caller and every
// endpoint a consumer. It says nothing about CSS, and the stylesheet is where
// the rule went unenforced: 1,154 classes, and until this ran nobody knew how
// many of them any code path could reach.
//
// WHY THE CORPUS IS THE WHOLE BUNDLE AND NOT index.html.
//
// The first version of this scanned index.html alone and reported 105 dead
// classes, 40 of them `ap-*`. Every one of those 40 is emitted by
// src/solid/ambient-island.jsx, and the twelve `debrief-*` by
// src/debrief/index.ts — both bundled into the deploy by esbuild and neither
// present in index.html. The check was named for what a class can reach and
// measured what index.html happens to contain. 105 -> 61 once the corpus was
// the files that actually ship.
//
// THREE WAYS A CLASS IS REACHABLE, and all three are needed:
//
//   literal      the name appears somewhere outside the stylesheet
//   template     `field-chip--${tier}` — the fragment before ${ is a prefix
//   concatenation  'sport-' + league — same idea, different syntax
//
// A prefix only vouches if it contains a hyphen or is four characters or more.
// Without that, `g${n}` vouched for `gcard` and `n${x}` for `no-label`, which
// is a check that cannot accuse anything. Spot-checked after tightening: all
// six of the newly-flagged names appear ONLY between <style> and </style>.
//
// WHY A RATCHET. 61 is a real number and deleting 61 rules is a real change,
// which wants its own commit and its own evidence per group. Recording it stops
// the 62nd, which is what a ratchet is for. Same file and same format as the
// chrome inventory — one ratchet format in this repo.
//
// Usage:  node scripts/unreferenced-css-check.mjs [--self-test]

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { styleBlockOf, parseInventory } from './check-chrome-inventory.mjs'

const IS_MAIN = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
const SELF_TEST = IS_MAIN && process.argv.includes('--self-test')

const INVENTORY = 'docs/chrome-inventory.txt'
const NAME = 'unreferenced-css'

/// Every class the stylesheet defines. `.a-b`, not `.a-b:hover` — the
/// pseudo-class is not part of the name.
export function classesIn(css) {
  const out = new Set()
  for (const m of css.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) out.add(m[1])
  return out
}

/// The fragments that could START a class name built at runtime. A template's
/// text before `${`, and a string literal ending in `-` before a `+`.
///
/// The hyphen-or-four-characters bar is the whole difference between a check
/// that can accuse and one that cannot.
export function prefixesIn(corpus) {
  const out = new Set()
  for (const m of corpus.matchAll(/([A-Za-z][\w-]*)\$\{/g)) out.add(m[1])
  for (const m of corpus.matchAll(/['"]([A-Za-z][\w-]*-)['"]\s*\+/g)) out.add(m[1])
  return [...out].filter(p => p.includes('-') || p.length >= 4)
}

export function reachability(cls, corpus, prefixes) {
  if (corpus.includes(cls)) return 'literal'
  if (prefixes.some(p => cls.startsWith(p) && cls.length > p.length)) return 'prefix'
  return 'unreferenced'
}

/// Every file esbuild bundles, plus the page outside its own stylesheet.
/// scripts/ and the smoke suites are deliberately NOT here: a class kept alive
/// only by an assertion about it is still dead product code, and including them
/// would vouch for exactly the names worth finding.
export function corpusFor(html, roots = ['src'], extras = ['field_utils.js', 'sw.js']) {
  const i = html.indexOf('<style>'), j = html.indexOf('</style>', i)
  let corpus = i < 0 ? html : html.slice(0, i) + html.slice(j)
  const walk = d => readdirSync(d, { withFileTypes: true }).flatMap(e => {
    const p = join(d, e.name)
    if (e.isDirectory()) return e.name === 'node_modules' ? [] : walk(p)
    return /\.(js|jsx|ts|tsx|mjs)$/.test(e.name) ? [p] : []
  })
  const files = [...roots.filter(existsSync).flatMap(walk), ...extras.filter(existsSync)]
  for (const f of files) corpus += '\n' + readFileSync(f, 'utf8')
  return { corpus, files }
}

// ── self-test ───────────────────────────────────────────────────────────────

if (SELF_TEST) {
  let failed = 0
  const check = (label, ok, detail = '') => {
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok || !detail ? '' : `\n      → ${detail}`}`)
    if (!ok) failed++
  }

  const cs = classesIn('.a-b{color:red}.c:hover{color:blue}')
  check('a class name stops at the pseudo-class',
    cs.has('a-b') && cs.has('c') && cs.size === 2, [...cs].join(','))

  check('an unreferenced class is reported',
    reachability('ghost', 'nothing here', []) === 'unreferenced')
  check('a literal reference is enough',
    reachability('ghost', '<div class="ghost">', []) === 'literal')

  const p = prefixesIn('const c = `field-chip--${tier}`')
  check('a template fragment becomes a prefix', p.includes('field-chip--'), p.join(','))
  check('...and it vouches for the built name',
    reachability('field-chip--MUST', '`field-chip--${t}`', p) === 'prefix')
  check('concatenation is read the same way',
    prefixesIn("cls = 'sport-' + league").includes('sport-'))

  // The bar that makes the check able to accuse.
  check('a one-letter prefix with no hyphen vouches for nothing',
    prefixesIn('`g${n}`').length === 0,
    'g${} would vouch for gcard, gline and gotd-streams')
  check('a two-letter prefix WITH a hyphen is real and does vouch',
    prefixesIn('`d-${level}`').includes('d-'),
    'd-warm and d-low are genuinely built that way')
  // The prefix rule requires the class to be LONGER than the prefix, so a
  // prefix never vouches for a class equal to itself. Asserted against a corpus
  // that does not contain it literally, because otherwise the literal branch
  // answers first and this proves nothing about the prefix branch — which is
  // what the first version of this case did.
  check('a prefix does not vouch for a class equal to itself',
    reachability('d-', 'nothing here', ['d-']) === 'unreferenced',
    'the bare prefix would always pass')

  check('the corpus excludes the stylesheet it is checking',
    corpusFor('<style>.only-in-css{color:red}</style><body></body>', [], [])
      .corpus.includes('only-in-css') === false,
    'every class would vouch for itself')

  console.log(`\n${failed === 0 ? 'PASS' : 'FAIL'}  unreferenced-css self-test: ${failed} failing`)
  process.exit(failed === 0 ? 0 : 1)
}

// ── live ────────────────────────────────────────────────────────────────────

if (IS_MAIN) {
  const html = readFileSync('index.html', 'utf8')
  const css = styleBlockOf(html)
  const classes = classesIn(css)
  const { corpus, files } = corpusFor(html)
  const prefixes = prefixesIn(corpus)

  const by = { literal: [], prefix: [], unreferenced: [] }
  for (const c of classes) by[reachability(c, corpus, prefixes)].push(c)

  // Vacuity guards. A run that read no classes, or no sources, would report
  // zero dead classes and mean nothing by it.
  let failed = 0
  const check = (name, ok, detail = '') => {
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !detail ? '' : `\n      → ${detail}`}`)
    if (!ok) failed++
  }

  console.log(`\n  ${classes.size} class(es) in the stylesheet, against ${files.length} bundled source file(s)`)
  console.log(`  reached by: literal ${by.literal.length}, template/concat prefix ${by.prefix.length}`)
  console.log(`  unreferenced: ${by.unreferenced.length}\n`)
  if (by.unreferenced.length) console.log(`  ${by.unreferenced.sort().join(' ')}\n`)

  check('the stylesheet parsed into classes', classes.size > 100,
    `${classes.size} — everything below would pass vacuously`)
  check('the source corpus was actually read', files.length > 5,
    `${files.length} file(s) — every class would read as unreferenced`)

  const max = parseInventory(readFileSync(INVENTORY, 'utf8')).get(NAME)
  if (max === undefined) {
    check(`${NAME} is declared in ${INVENTORY}`, false, 'no line to ratchet against')
  } else {
    check(`${NAME} is at or below its declared count`,
      by.unreferenced.length <= max,
      `${by.unreferenced.length} of ${max} — a NEW unreachable class is the failure. If you DELETED some, lower the number in ${INVENTORY} in this commit.`)
    if (by.unreferenced.length < max)
      console.log(`      ${by.unreferenced.length} of ${max}   ← lower this`)
  }

  console.log(`\n${failed === 0 ? 'PASS' : 'FAIL'}  ${failed} failing`)
  process.exit(failed === 0 ? 0 : 1)
}
