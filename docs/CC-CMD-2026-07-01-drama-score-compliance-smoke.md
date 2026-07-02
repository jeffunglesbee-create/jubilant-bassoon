# Claude Code Command — Lock In Drama Score Display Compliance

**Branch:** main — commit directly, do not create a feature branch or PR.

git pull. Read CLAUDE.md.

Write all findings to outbox/cc-drama-score-compliance-smoke-2026-07-01.md.

## CONTEXT

Manually verified 2026-07-01 (chat-side, not via CC): `dramaScoreLive()`
computes a real weighted composite for live games (returns 0 for pre/
post), but every consumer converts it via `dramaTier(score)` to exactly
one of `'fire'|'hot'|'warm'|''` before it's used for anything
display-facing — the raw number is never interpolated into rendered
HTML/text. Confirmed by checking every `${score}` template-literal site
in the file; the only three that looked like potential leaks were
unrelated (performance telemetry, a golf leaderboard score, the actual
game score). This CC-CMD locks that verified state into smoke so a
future change can't silently reintroduce a raw drama-number display
without failing CI — turning a one-time manual grep audit into a
standing check.

## PRE-BUILD PROBE (Rule 87)

```bash
grep -n "function dramaScoreLive\|function dramaTier" index.html
sed -n '/function dramaTier/,/^}/p' index.html
```

Confirm current line numbers and `dramaTier`'s exact return set before
writing assertions — line numbers above (22978, 23809) are from the
2026-07-01 investigation and may have shifted.

## TASK 1: Assert dramaTier's return set is exactly the 4 known values

```javascript
assert('DRAMA-COMPLIANCE-001 — dramaTier returns only the 4 named tiers, never a raw number',
  () => {
    const src = fetchFileSource('index.html'); // however smoke.js currently reads the file — match existing convention
    const fnMatch = src.match(/function dramaTier\(score\)\{([\s\S]*?)\n\}/);
    if (!fnMatch) return { pass: false, reason: 'dramaTier function not found' };
    const body = fnMatch[1];
    // Every return statement must return a string literal from the known
    // set, or an empty string — never `return score` or similar raw passthrough.
    const returns = [...body.matchAll(/return\s+([^;]+);/g)].map(m => m[1].trim());
    const allowed = new Set(["'fire'", "'hot'", "'warm'", "''"]);
    const bad = returns.filter(r => !allowed.has(r));
    return { pass: bad.length === 0, reason: bad.length ? `unexpected return: ${bad.join(', ')}` : '' };
  });
```

Adapt the exact source-reading mechanism to whatever `smoke.js` already
uses elsewhere (check an existing structural assertion for the real
pattern — don't invent a new file-reading approach if one exists).

## TASK 2: Assert no raw drama-score template-literal exists

```javascript
assert('DRAMA-COMPLIANCE-002 — no raw dramaScoreLive() output is template-interpolated into display text',
  () => {
    const src = fetchFileSource('index.html');
    // Look for the dangerous pattern: a template literal containing
    // `${score}` (or `${Math.round(score)}`, `${score.toFixed(...)}`)
    // within ~15 lines of a `dramaScoreLive(` call, WITHOUT an
    // intervening `dramaTier(` call between them (which would mean the
    // raw value was safely converted before use).
    // This is a heuristic, not a full AST analysis — document that
    // limitation in the outbox. It catches the exact class of mistake
    // found during manual audit (a new consumer forgetting to call
    // dramaTier before rendering), not every conceivable variant.
    const lines = src.split('\n');
    const violations = [];
    lines.forEach((line, i) => {
      if (/dramaScoreLive\(/.test(line)) {
        const window = lines.slice(i, i + 15).join('\n');
        const hasRawInterp = /\$\{score(\.toFixed|\.round)?\}/.test(window) || /\$\{Math\.round\(score\)\}/.test(window);
        const hasTierConversion = /dramaTier\(/.test(window);
        if (hasRawInterp && !hasTierConversion) {
          violations.push(`line ${i + 1}`);
        }
      }
    });
    return { pass: violations.length === 0, reason: violations.length ? `potential raw score display near: ${violations.join(', ')}` : '' };
  });
```

**Explicitly acknowledge this is a heuristic, not a proof** — a
determined or careless future edit could still route around it (e.g.
assigning `score` to a differently-named variable before display). This
assertion is a tripwire for the specific mistake pattern already found
and fixed once (a new consumer forgetting `dramaTier()`), not a
guarantee against every possible variant. State this limitation
explicitly in the outbox rather than overselling what a regex-based
smoke check can actually prove.

## TASK 3: Verification

```bash
node smoke.js index.html
```

Done condition: both new assertions pass against the current, already-
verified-compliant code (they should pass immediately, since the
underlying compliance was already confirmed manually — this task is
about locking in the verification, not fixing a new problem).

## TASK 4: Outbox manifest (last task)

State explicitly the heuristic limitation from Task 2, and confirm both
assertions pass against current `main` without requiring any actual
code change to `dramaScoreLive`/`dramaTier` themselves — this CC-CMD
adds a regression guard, it does not fix a live violation (none was
found).
