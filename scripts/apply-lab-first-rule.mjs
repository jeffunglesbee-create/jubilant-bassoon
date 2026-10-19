// Inserts LAB-FIRST-A into CLAUDE.md under "## Rules (non-negotiable)", right
// after the PRIME DIRECTIVE paragraph. field-laboratory
// docs/CC-CMD-2026-10-18-lab-first.md, TASK 2: a direct owner order, landed by a
// runner commit (lab-first-rule.yml), not a PR.
//
// UNNUMBERED, BY ORDER. This file's numbered list ends at 90, and Rule 91
// already means two different things in STANDARDS.md and in field-relay-nba's
// CLAUDE.md. A tag carries no number to collide.
//
// Idempotent: a file that already carries the tag is left byte for byte.
//
// Usage:  node scripts/apply-lab-first-rule.mjs [--self-test] [file]
import { readFileSync, writeFileSync } from 'node:fs'

export const TAG = '**LAB-FIRST-A.**'
export const RULE = `${TAG} Do not build here what could be built in field-laboratory. This repo holds the served page and the captures that feed the laboratory. New computation, new proofs and new metrics go to field-laboratory. Direct owner order, 2026-10-18. It outranks the routing default (client-scoped work here, relay-scoped work in field-relay-nba) wherever a choice exists; where work can live in only one repo, that default still decides it. Not retroactive: existing client code stays where it is (field-laboratory \`docs/CC-CMD-2026-10-18-lab-first.md\`).`
const SECTION = '## Rules (non-negotiable)'
const ANCHOR = '**PRIME DIRECTIVE: DO NOT RATIONALIZE'

/** The text with the rule in place, or an Error naming why it cannot be placed. */
export const apply = (text) => {
  if (text.includes(TAG)) return text
  const sec = text.indexOf(SECTION)
  if (sec < 0 || text.indexOf(SECTION, sec + 1) >= 0) return new Error(`"${SECTION}" must occur exactly once`)
  const at = text.indexOf(ANCHOR, sec)
  if (at < 0 || text.indexOf(ANCHOR, at + 1) >= 0) return new Error('the PRIME DIRECTIVE paragraph must occur exactly once, under the Rules section')
  const end = text.indexOf('\n\n', at)
  if (end < 0) return new Error('the PRIME DIRECTIVE paragraph has no end')
  return text.slice(0, end) + '\n\n' + RULE + text.slice(end)
}

if (process.argv.includes('--self-test')) {
  const base = `# T\n\n${SECTION}\n\n${ANCHOR} (Rule 77).** Investigate first.\n\n1. **DO NOT INVENT** — x\n`
  const cases = [
    ['places the rule after the PRIME DIRECTIVE and before rule 1', () => {
      const out = apply(base)
      return typeof out === 'string' && out.indexOf(TAG) > out.indexOf(ANCHOR) && out.indexOf(TAG) < out.indexOf('1. **DO NOT INVENT')
    }],
    ['is idempotent: a second application changes nothing', () => apply(apply(base)) === apply(base)],
    ['carries no rule number', () => !/Rule \d|^\d+\.\s/m.test(RULE)],
    ['refuses a file with no Rules section', () => apply(base.replace(SECTION, '## Other')) instanceof Error],
    ['refuses a file with no PRIME DIRECTIVE', () => apply(base.replace(ANCHOR, '**OTHER')) instanceof Error],
    ['refuses a PRIME DIRECTIVE outside the Rules section', () => apply(`${ANCHOR}\n\n${base.replace(ANCHOR, '**OTHER')}`) instanceof Error],
  ]
  let bad = 0
  for (const [name, f] of cases) { const ok = f(); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`); if (!ok) bad++ }
  process.exit(bad ? 1 : 0)
}

const file = process.argv.slice(2).find(a => !a.startsWith('--')) ?? 'CLAUDE.md'
const before = readFileSync(file, 'utf8')
const after = apply(before)
if (after instanceof Error) { console.error(`FAIL: ${after.message}`); process.exit(1) }
if (after === before) { console.log('LAB-FIRST-A already present; nothing changed'); process.exit(0) }
if (after.split(TAG).length !== 2) { console.error('FAIL: the tag is not present exactly once after insertion'); process.exit(1) }
writeFileSync(file, after)
console.log('LAB-FIRST-A inserted under "## Rules (non-negotiable)"')
