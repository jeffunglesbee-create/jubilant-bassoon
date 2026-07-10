# Session Outbox — Deterministic Post-Generation Leak Strip (follow-up to prompt-data-separation)

**Date:** 2026-07-10
**Scope:** Not a CC-CMD dispatch — a chat-directed follow-up requested
after discussing the durability of the prompt/data structural
separation fix. Structural separation reduces how *often* the model
echoes its own instructions but cannot guarantee it never happens
(probabilistic generation). This adds a deterministic, output-side
guarantee: the shipped text is checked before display, regardless of
why the model produced what it produced.

## Design — reused an existing precedent, not new architecture

Found `Layer 2c` hard-strip already live in `fetchNightOwlFromClaude`'s
fallback path (index.html, sport-vocab mismatches: "one-possession
game" leaking into a baseball recap) — split into sentences, drop any
sentence matching a known-bad term, keep what survives, no model call.
`stripPromptLeaks()` is the same architecture applied to a different
violation class.

**Signatures, precisely defined per the explicit ask (not left as
described intent):**

```js
const _PROMPT_LEAK_SIGNATURES = [
  /\b\d{1,3}\s*-\s*\d{1,3}\s*words?\b/i,      // "80-100 words", "50-70 words", etc.
  /\bRules:\s*\d+(?:-\d+)?\b/i,                 // "Rules:" + a number -- narrowed
  /\b\d+(?:-\d+)?\s*sentences?\b/i,             // "2-3 sentences", "2 sentences"
];
```

The `"Rules:"` signature is narrowed exactly as requested: it requires
a number immediately following, so it never fires on a bare `"Rules:"`
with nothing numeric after it (verified: "The referee explained the
offside rules. Rules: this is not a leak, no number follows
immediately." — the second sentence survives untouched). Covers both
real shapes in the codebase: the word-count-range form ("Rules:
80-100...") and Stakes Brief's single-count form ("Rules: 2
sentences...").

## Investigation before wiring it in — architecture mapped, not assumed

Traced where generated text actually reaches its final, displayable
form for each of the 9 restructured sites, not just where generation is
*called*:

- **`generateJournalismViaRelay`** is a shared, synchronous chokepoint
  used by Series Brief, MLB brief, Stakes Brief, and Night Owl full's
  relay-first path (plus J3, a bonus — not one of the 9, but shares this
  function). Inserted the strip once here, covering all of them.
- **Scout's Pick and the Night Owl queue prompt** (`_owlQ_prompt` — the
  exact reported-bug site) are **relay-queue-based**: the actual
  generation happens server-side, and the client only ever sees the
  result via a polled job endpoint. Neither has any client-side quality
  chain running on it otherwise. Traced each to its real consumption
  point (Scout's Pick: the `result.status === 'done'` branch before
  caching; Night Owl: the unified `claudeText` variable both the queue
  path and the `fetchNightOwlFromClaude` fallback converge into,
  right before display/caching) and inserted there.
- **WNBA brief, Premier League brief, Generic Game Brief, and the
  direct-fetch fallback paths** of Series Brief / MLB brief / Stakes
  Brief / Night Owl full each call `CLAUDE_PROXY_URL` directly with no
  shared wrapper — instrumented each one's own return point.

**9 insertion points total**, all confirmed via `git diff` review: one
shared relay chokepoint, two queue-consumption points, six direct
return points (some deliberately redundant/idempotent with the relay
chokepoint as defense-in-depth — e.g. MLB brief's fallback path is
stripped independently of its relay path, since only one of the two
executes per call).

**Honest finding, not silently fixed (respecting scope):** 3 of 9
sites' brief caches (`field_mlb_brief_...`, `field_wnba_brief_...`,
`field_epl_brief_...`) use `gameid`+`status` cache keys, not
`SW_VERSION`-versioned keys like the other 6 (`field_sp_brief_v...`,
`field_nightowl_v...`, `field_stakes_brief_v...`). A brief cached in an
already-open browser tab *before* this deploy could theoretically
persist in that tab's `sessionStorage` until the tab closes, bypassing
the new strip. Narrow, low-severity (only affects already-generated
briefs in already-open tabs, not new generations), but real — flagged
rather than silently rewritten, since retrofitting cache-key versioning
across 3 sites is a separate, scope-expanding change not asked for here.

## Verification — matching the prior rounds' bar, extended

**24/24 unit checks** against the extracted, verbatim shipped function:
the exact reported-bug text; all 6 real word-count shapes across the 9
sites; the narrowed `"Rules:"` requirement (catches "Rules: 2
sentences", correctly ignores a bare "Rules:" with no number); all 5
real sentence-count shapes; 6 realistic clean sports sentences
containing digit-dash-digit patterns ("105-95", "2-0", "8-1") confirmed
to survive completely untouched (false-positive safety); null/empty
input handled without throwing.

**3 real, forced-leak generations against the live `CLAUDE_PROXY_URL`
— the actual verification bar requested, not just clean-output
safety.** Explicitly instructed the model to embed a specific
leak-shaped phrase verbatim, producing a genuine model-generated leak
(not a synthetic string), then ran the real output through the actual
shipped `stripPromptLeaks`:

1. Forced "Rules: 80-100 words" into a Night Owl-shaped recap — raw
   output: *"...pitching duel. Rules: 80-100 words were the primary
   focus of the team's defensive strategy..."* Stripped output: the
   leak sentence is gone entirely, the 3 surrounding legitimate
   sentences survive as a coherent recap.
2. Forced "Rules: 2 sentences" into a Stakes Brief-shaped response
   (matching Stakes Brief's real single-count rule shape) — same
   result: leak sentence removed, legitimate content intact.
3. Forced a bare "2-3 sentences" leak (no "Rules:" prefix, isolating
   the sentence-count signature specifically) — same result.

All 3 raw generations confirmed to genuinely contain the forced leak
before stripping (`rawTextHasLeak: true`), and confirmed clean after
(`strippedTextStillHasLeak: false`).

## Repo verification

`node smoke.js index.html`: 899/0 (unchanged). `node field_unit.js`:
66/0. `node field_smoke.js index.html`: 21 failures, matches the
documented pre-existing baseline. All 3 inline `<script>` blocks
syntax-checked via `node --check`.

## Commit

- Bumps `SW_VERSION` `2026-07-10e` → `2026-07-10f`.
- `index.html`: `stripPromptLeaks()` + 3 signature regexes added
  (alongside the existing Layer 2b/2c quality-chain functions); wired
  into 9 insertion points covering all 9 prompt-restructured sites.
- `sw.js`: `SW_VERSION` sync bump.
- This manifest.
