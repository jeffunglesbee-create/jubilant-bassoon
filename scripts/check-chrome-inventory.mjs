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

/// The delimiters that bound a literal. `<` and `>` end an HTML text node; the
/// three quote characters end a JS string; `{` and `}` end a template segment,
/// which is the conservative call — `${x}` might interpolate a label or might
/// interpolate a score, so it is not counted as a label either way.
const DELIM = /[<>`'"\n{}]/

/// The literal an emoji sits inside, which is the unit the redundancy test needs.
export function spanAround(s, i) {
  let a = i; while (a > 0 && !DELIM.test(s[a - 1])) a--
  let b = i; while (b < s.length && !DELIM.test(s[b])) b++
  return s.slice(a, b)
}

/// THE SIBLING-ELEMENT CASE, which the literal rule alone could not see.
///
/// `<span class="desk-card-label-icon">📋</span>FIELD Brief` puts the pictograph
/// in its own element and the label in the next one. By the literal rule the
/// glyph is ALONE — nothing in `📋` is a word — and the note on
/// docs/chrome-inventory.txt said so out loud: "SOURCE ADJACENCY, NOT RENDERED".
/// That under-claim was deliberate and it was also wrong about fifteen real
/// cases across three named icon slots.
///
/// This closes it WITHOUT reaching into JavaScript, where a forward scan would
/// hit identifiers and call almost everything labelled. It fires only when the
/// emoji's literal is a genuine HTML text node — bounded by `>` and `<` — and
/// then walks forward past at most three tags and whitespace-only nodes looking
/// for the first real text. That is the DOM's own definition of "the next thing
/// a reader sees", not a proximity guess.
export function labelledBySibling(body, i) {
  // The emoji's own text node must be delimited by tags on both sides.
  let a = i; while (a > 0 && body[a-1] !== '>' && body[a-1] !== '<') a--
  if (a === 0 || body[a-1] !== '>') return false
  let b = i; while (b < body.length && body[b] !== '<' && body[b] !== '>') b++
  if (b >= body.length || body[b] !== '<') return false
  let k = b, tags = 0
  while (k < body.length && tags <= 3) {
    if (body[k] === '<') {                       // skip a tag
      const close = body.indexOf('>', k)
      if (close < 0) return false
      k = close + 1; tags++
      continue
    }
    const next = body.indexOf('<', k)
    const text = body.slice(k, next < 0 ? body.length : next)
    if (text.trim()) return /[A-Za-z]{3,}/.test(text)   // first real text decides
    if (next < 0) return false
    k = next
  }
  return false
}

/// Split, because these are three different findings wearing one character class.
/// A country flag beside a fixture is data; `📺` in a tinted box is decoration;
/// `✓` standing in for a checkmark icon is somewhere between.
///
/// AND THE DECORATIVE CLASS SPLITS AGAIN, which is the point of this function.
/// The unslop-ui checklist states its own test for an icon: "Remove all
/// decorative icons. Does the UI lose any information?" That was read as a
/// judgement call for weeks and so nothing happened to a count of 288. It is a
/// string operation. An emoji whose own literal also contains a word cannot be
/// carrying information that word does not already carry — `📰 Desk` loses
/// nothing when the pictograph goes, and the check can say so without an
/// opinion. An emoji standing alone in its literal might be load-bearing, so it
/// is counted separately and left to a human.
///
/// WHAT THIS MEASURES IS SOURCE ADJACENCY, NOT RENDERED ADJACENCY. A sport-icon
/// map value (`{ nba: '🏀' }`) is alone in its literal and may still be rendered
/// beside a label. That direction is deliberate: the labelled count is the one
/// used to justify deletions, so it under-claims rather than over-claims.
export function emojiCensus(body) {
  const out = { flags: 0, status: 0, decorative: 0, labelled: 0, alone: 0, distinct: new Set() }
  for (const m of body.matchAll(EMOJI)) {
    const c = m[0]
    if (FLAG(c)) out.flags++
    else if (STATUS.has(c)) out.status++
    else {
      out.decorative++; out.distinct.add(c)
      if (/[A-Za-z]{3,}/.test(spanAround(body, m.index)) || labelledBySibling(body, m.index)) out.labelled++
      else out.alone++
    }
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

/// CHECKLIST ITEM 2, MADE MECHANICAL. "NEVER wrap icons in a colored
/// rounded-square/circle container unless it is an avatar or app icon."
///
/// The shape is specific enough to detect: a small square box (both dimensions
/// set, within 4px of each other, at most 56px), a corner radius, a real fill,
/// and flex centring. `.media-icon`, `.s-icon`, `.field-desk-icon` and
/// `.streaming-icon` all matched — four instances of one pattern, each holding a
/// pictograph immediately beside its own text label.
///
/// A FILL THAT IS `none` IS NOT A COLOURED BOX, and the first version of this
/// missed that: `/background/` matches `background:none`, so `.date-nav-btn` —
/// a bordered `<` control with no fill at all — read as a violation. The
/// checklist says "colored", and an unfilled control is not the pattern.
///
/// The avatar carve-out is the checklist's own and is NOT applied by name here.
/// `.team-logo-txt` is a 22px circle holding a team's initials when its logo
/// image fails to load, which is exactly an avatar — so it is COUNTED, and the
/// declared maximum in the inventory says so in words. An allowlist keyed on a
/// class name would hide the next one that quietly joined it.
export function iconBoxes(css) {
  const out = []
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = m[1].replace(/\s+/g, ' ').trim(), b = m[2]
    const w = /(?:^|;)\s*width:\s*(\d+)px/.exec(b), h = /(?:^|;)\s*height:\s*(\d+)px/.exec(b)
    if (!w || !h) continue
    const W = +w[1], H = +h[1]
    if (W > 56 || H > 56 || Math.abs(W - H) > 4) continue
    if (!/border-radius/.test(b)) continue
    const fill = /(?:^|;)\s*background(?:-color|-image)?:\s*([^;]+)/.exec(b)
    if (!fill || /^\s*(none|transparent|inherit|initial)\s*$/.test(fill[1])) continue
    if (!/align-items:\s*center/.test(b) && !/justify-content:\s*center/.test(b)) continue
    out.push(sel)
  }
  return out
}

export function countsFor(html) {
  const css = styleBlockOf(html)
  const body = bodyOf(html)
  const e = emojiCensus(body)
  const n = (re, s) => (s.match(re) || []).length
  return {
    'decorative-emoji': e.decorative,
    'decorative-emoji-labelled': e.labelled,
    'decorative-emoji-alone': e.alone,
    'flag-emoji': e.flags,
    'status-glyph': e.status,
    'gradient': n(/linear-gradient|radial-gradient/g, css),
    'gradient-text': n(/background-clip:\s*text|-webkit-background-clip/g, css),
    'backdrop-filter': n(/backdrop-filter/g, css),
    'coloured-shadow': colouredShadows(css),
    'keyframes': n(/@keyframes/g, css),
    'icon-in-a-box': iconBoxes(css).length,
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

  // The labelled/alone split. Each of these fails if the span rule is wrong,
  // which is the only reason to write them — a classifier that cannot be made
  // to answer "alone" proves nothing when it answers "labelled".
  const lab = emojiCensus(`<body><a>📰 Desk</a></body>`)
  check('an emoji beside a word in its own literal is labelled',
    lab.labelled === 1 && lab.alone === 0, JSON.stringify({ l: lab.labelled, a: lab.alone }))
  const al = emojiCensus('<body><span>📰</span></body>')
  check('...and the same emoji alone in its literal is not',
    al.labelled === 0 && al.alone === 1, JSON.stringify({ l: al.labelled, a: al.alone }))
  // THIS CASE USED TO ASSERT THE OPPOSITE and failed the moment the sibling
  // rule shipped — correctly, because it was encoding the deliberate
  // under-claim rather than a property worth keeping. It conflated two facts.
  // They are tested separately now, and both still hold.
  check('the LITERAL rule still does not leak across a tag boundary',
    (() => { const h = '<body><span>📰</span><span>Desk</span></body>'
             return /[A-Za-z]{3,}/.test(spanAround(h, h.search(EMOJI))) === false })(),
    'spanAround read past the closing tag')
  check('...but the SIBLING rule labels it, which is what a reader actually sees',
    emojiCensus('<body><span>📰</span><span>Desk</span></body>').labelled === 1,
    'a captioned pictograph counted as standing alone')
  check('a two-letter word is not a label',
    emojiCensus('<body><span>📰 at</span></body>').alone === 1,
    "a unit or an initial would read as a label")
  check('an interpolation is not counted as a label',
    emojiCensus('<body>`${team} 🔥`</body>').alone === 1,
    '${x} may be a score; treating it as a label would over-claim')
  check('a JS string literal labels the same way an element does',
    emojiCensus(`<body>wcBtn.textContent = '⚽ Groups'</body>`).labelled === 1)
  check('the two halves always sum to the whole',
    (() => { const c = emojiCensus('<body><a>📰 Desk</a><span>🔥</span>🇪🇸✓</body>')
             return c.labelled + c.alone === c.decorative && c.decorative === 2 })(),
    'a decorative emoji fell out of both buckets')

  // ── icon-in-a-box, checklist item 2 ──────────────────────────────────────
  const B = css => iconBoxes(css)
  check('a small filled rounded flex-centred box IS the pattern',
    B('.x{width:30px;height:30px;border-radius:6px;background:rgba(1,2,3,.1);display:flex;align-items:center}').length === 1)
  check('an UNFILLED bordered control is not',
    B('.x{width:24px;height:24px;border-radius:4px;background:none;display:flex;align-items:center}').length === 0,
    'background:none matched /background/ and flagged .date-nav-btn')
  check('a box with no radius is not',
    B('.x{width:30px;height:30px;background:#111;display:flex;align-items:center}').length === 0)
  check('a wide box is not a square icon holder',
    B('.x{width:200px;height:30px;border-radius:6px;background:#111;display:flex;align-items:center}').length === 0)
  check('a large square is not either — 56px is the bar',
    B('.x{width:120px;height:120px;border-radius:6px;background:#111;display:flex;align-items:center}').length === 0)
  check('a filled rounded box that does NOT centre its content is not',
    B('.x{width:30px;height:30px;border-radius:6px;background:#111;display:block}').length === 0)
  check('the detector reports which selector, not just a count',
    B('.s-icon{width:32px;height:32px;border-radius:8px;background:#111;justify-content:center}')[0] === '.s-icon')

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
