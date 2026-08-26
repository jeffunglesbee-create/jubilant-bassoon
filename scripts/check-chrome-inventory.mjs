#!/usr/bin/env node
// The unslop-ui checklist, counted and ratcheted. Not banned.
//
// WHY A RATCHET AND NOT A BAN
//
// field-laboratory ran the `unslop-ui` skill against its own page on 2026-08-26
// and found five defects. This repository was audited the same night and the
// numbers are a different order of magnitude:
//
//   decorative emoji        289   (79 distinct, plus 102 flags and 107 status glyphs)
//   linear/radial-gradient   34
//   backdrop-filter          14
//   gradient text             4
//   coloured box-shadow      10 of 23
//   @keyframes               25
//
// A check demanding zero would be red from the moment it shipped, and a red
// check nobody can make green is a check that gets deleted — the same reasoning
// `docs/exposed-secrets.sha256` states for the shared secret it cannot yet
// remove. So this records what is here and fails only on GROWTH.
//
// AND SEVERAL OF THESE ARE DEFENSIBLE, which is the other half of why it does
// not ban. All fourteen `backdrop-filter` uses are on overlay surfaces —
// `.controls`, `.bottom-sheet`, `.mv-panel`, `#field-attention-bar`, `.legend`,
// `.pin-widget` — where a blur says "content is passing underneath", which is a
// real platform idiom rather than decoration. The 102 regional-indicator flags
// carry country identity in a global sports app. Neither is a defect this file
// should assert away; both are choices whose COUNT should be visible.
//
// What is not defensible is growth nobody noticed. That is what this stops.
//
// Usage:  node scripts/check-chrome-inventory.mjs [--self-test]

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const IS_MAIN = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
const SELF_TEST = IS_MAIN && process.argv.includes('--self-test')

const INVENTORY = 'docs/chrome-inventory.txt'

/// The stylesheet, which is everything between the first <style> and its close.
/// Counting gradients across the whole file would sweep up the JS that writes
/// them into inline styles, and those are a different question.
export function styleBlockOf(html) {
  const i = html.indexOf('<style>')
  const j = html.indexOf('</style>', i)
  if (i < 0 || j < 0) return ''
  // COMMENTS STRIPPED, and the reason is a real miscount. Deleting three
  // `linear-gradient` underlines on 2026-08-26 dropped the count by two,
  // because the comment written where they had been says the word
  // `linear-gradient` while explaining their removal. The counter was measuring
  // MENTIONS, so documenting a deletion partly undid it, and a commented-out
  // rule would have counted as a live one. The laboratory's own CSS parser
  // strips comments for the same reason, in the same words.
  return html.slice(i + 7, j).replace(/\/\*[\s\S]*?\*\//g, '')
}

/// The body, for anything about rendered content rather than rules.
export function bodyOf(html) {
  const i = html.indexOf('<body')
  return i < 0 ? '' : html.slice(i)
}

const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/gu
const FLAG = c => { const p = c.codePointAt(0); return p >= 0x1F1E6 && p <= 0x1F1FF }
const STATUS = new Set(['✓', '✕', '✔', '✖', '⚠', '★', '☆'])

/// Split, because these are three different findings wearing one character class.
/// A country flag beside a fixture is data; `📺` in a tinted box is decoration;
/// `✓` standing in for a checkmark icon is somewhere between.
export function emojiCensus(body) {
  const out = { flags: 0, status: 0, decorative: 0, distinct: new Set() }
  for (const m of body.matchAll(EMOJI)) {
    const c = m[0]
    if (FLAG(c)) out.flags++
    else if (STATUS.has(c)) out.status++
    else { out.decorative++; out.distinct.add(c) }
  }
  return out
}

/// A shadow is "coloured" when its colour is a hex or an rgb(a) whose channels
/// are not all near-zero. A black shadow at low alpha is elevation; a violet one
/// is decoration, and the checklist names exactly that difference.
export function colouredShadows(css) {
  let n = 0
  for (const m of css.matchAll(/box-shadow:([^;}]*)/g)) {
    const v = m[1]
    if (/#[0-9a-f]{3,8}/i.test(v)) { n++; continue }
    for (const c of v.matchAll(/rgba?\(([^)]*)\)/g)) {
      const [r, g, b] = c[1].split(',').map(Number)
      if ([r, g, b].some(x => x > 40)) { n++; break }
    }
  }
  return n
}

export function countsFor(html) {
  const css = styleBlockOf(html)
  const body = bodyOf(html)
  const e = emojiCensus(body)
  const n = (re, s) => (s.match(re) || []).length
  return {
    'decorative-emoji': e.decorative,
    'flag-emoji': e.flags,
    'status-glyph': e.status,
    'gradient': n(/linear-gradient|radial-gradient/g, css),
    'gradient-text': n(/background-clip:\s*text|-webkit-background-clip/g, css),
    'backdrop-filter': n(/backdrop-filter/g, css),
    'coloured-shadow': colouredShadows(css),
    'keyframes': n(/@keyframes/g, css),
  }
}

/// `<max> <name>`, comments and blanks ignored. Same shape as
/// docs/exposed-secrets.sha256, deliberately — one ratchet format in this repo.
export function parseInventory(text) {
  const out = new Map()
  for (const line of text.split('\n')) {
    const t = line.replace(/#.*$/, '').trim()
    if (!t) continue
    const [max, name] = t.split(/\s+/)
    if (name) out.set(name, Number(max))
  }
  return out
}

// ── self-test ───────────────────────────────────────────────────────────────

if (SELF_TEST) {
  let failed = 0
  const check = (label, ok, detail = '') => {
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok || !detail ? '' : `\n      → ${detail}`}`)
    if (!ok) failed++
  }

  check('styleBlockOf reads only the stylesheet',
    styleBlockOf('<style>.a{color:red}</style><body>linear-gradient</body>') === '.a{color:red}',
    'body content would be counted as CSS')
  check('a file with no stylesheet yields empty, not the whole document',
    styleBlockOf('<body>x</body>') === '')
  check('a commented-out rule is not counted as a live one',
    styleBlockOf('<style>/* a{background:linear-gradient(red,blue)} */ b{color:red}</style>')
      .includes('linear-gradient') === false,
    'prose about a gradient would count as a gradient')
  check('...and prose ABOUT a deletion does not resurrect the count',
    countsFor('<style>/* linear-gradient underlines deleted */ a{color:red}</style><body></body>')
      .gradient === 0)

  const e = emojiCensus('<body>📺 ⚽ 🇪🇸 ✓ ✓ ⚠</body>')
  check('a flag is counted as a flag, not decoration', e.flags === 2 && e.decorative === 2,
    JSON.stringify({ flags: e.flags, decorative: e.decorative }))
  check('a status glyph is its own category', e.status === 3, String(e.status))
  check('plain prose counts nothing', emojiCensus('Rockies @ Diamondbacks 4-1').decorative === 0)

  check('a black shadow is elevation, not decoration',
    colouredShadows('a{box-shadow:0 4px 24px rgba(0,0,0,.4)}') === 0)
  check('a violet shadow IS decoration',
    colouredShadows('a{box-shadow:0 0 12px rgba(167,139,250,.5)}') === 1)
  check('a hex shadow counts',
    colouredShadows('a{box-shadow:0 0 12px #a78bfa}') === 1)
  check('two rules with shadows count twice',
    colouredShadows('a{box-shadow:0 0 1px #fff}b{box-shadow:0 0 1px #f00}') === 2)

  const inv = parseInventory('# note\n\n  12  gradient   # why\n3 keyframes\n')
  check('the inventory parser ignores comments and blanks',
    inv.get('gradient') === 12 && inv.get('keyframes') === 3 && inv.size === 2)

  // The detector must be able to fail, or a green run proves nothing.
  check('countsFor actually finds what is there',
    countsFor('<style>a{background:linear-gradient(red,blue)}</style><body>📺</body>')
      .gradient === 1)

  console.log(`\n${failed === 0 ? 'PASS' : 'FAIL'}  chrome inventory self-test: ${failed} failing`)
  process.exit(failed === 0 ? 0 : 1)
}

// ── live ────────────────────────────────────────────────────────────────────

if (IS_MAIN) {
  const counts = countsFor(readFileSync('index.html', 'utf8'))
  const declared = parseInventory(readFileSync(INVENTORY, 'utf8'))

  let failed = 0
  console.log(`\n  unslop-ui checklist, counted in index.html\n`)
  for (const [name, n] of Object.entries(counts)) {
    const max = declared.get(name)
    if (max === undefined) {
      console.log(`  FAIL  ${name.padEnd(18)} ${String(n).padStart(4)}  — not declared in ${INVENTORY}`)
      failed++
    } else if (n > max) {
      console.log(`  FAIL  ${name.padEnd(18)} ${String(n).padStart(4)}  — declared at most ${max}. This is a RATCHET: a new one is the failure. If you REMOVED some, lower the number in ${INVENTORY} in this commit.`)
      failed++
    } else {
      console.log(`  ok    ${name.padEnd(18)} ${String(n).padStart(4)}  of ${max}${n < max ? '   ← lower this' : ''}`)
    }
  }
  console.log(`\n${failed === 0 ? 'PASS' : 'FAIL'}  ${failed} pattern(s) above their declared count`)
  process.exit(failed === 0 ? 0 : 1)
}
