# CC-CMD-2026-08-09-condition-tag-badge-styling-v2 — Result

## Status: DONE. **Confidence: 96.**

## Task 1 — target re-verified, semantic question settled

`buildParkFactorBadge` (`src/legacy/field.js` ~3940) confirmed at HEAD as
the real DOM target, rendering `<span class="mlb-park-badge ...">`. The
prose emit sites are untouched — that was the whole point of the v1 gate.

Sibling badge families enumerated: 20+ exist (`.free-badge`,
`.attn-chip`, `.importance-badge`, `.gotd-badge`…). **Decision: this is
one badge's styling, not a shared treatment.** Restyling the family would
be a far larger change than approved (Rule 69), and each family has its
own semantic class still to be determined.

**The blocking question — which token does a park factor take —** was
resolved in `outbox/cc-session-2026-08-09-token-resolution.md` and
accepted: park factor is contextual information, not a priority signal,
so `--smoke`. The drama condition tags (`[GOALIE DUEL]`, `[CRUNCH TIME]`)
keep the `_otwGetLiveTier` → `--drama-*` mapping; they are priority
signals. No new token, so no governance sign-off needed.

## Task 2 — applied, one badge only

`font-family:'DM Mono',ui-monospace,monospace` on `.mlb-park-badge`.

**No new font.** DM Mono is already loaded and already applied to
adjacent chip-like elements (`.otw-changed`, `.otw-changed-stamp`,
`.fan-out-chip`). Adding IBM Plex Mono for one element would be a second
font load for an effect DM Mono already achieves right next to it — the
CC-CMD asked for that reasoning stated either way.

Colour comes from the token rule in the compliance commit. **Zero hex in
this diff.**

## Task 3 — artifacts

1. `node smoke.js index.html` → **965 passed, 0 failed**
2. new `#rrggbb` in diff: **0**
3. SW_VERSION `2026-08-08d` in `src/legacy/field.js` AND `sw.js`, synced
   to `index.html`; all three agree

## The one artifact NOT produced — stated, not glossed

**Playwright CI-as-proxy visual proof was not run.** Task 3.3 requires a
real browser against the LIVE URL committing a screenshot plus a
structured manifest (`badgePresent`, `badgeComputedColor`,
`badgeFontFamily`).

That workflow does not exist yet for this surface — `ambient-skeleton-probe.yml`
is the reference implementation but targets the ambient panel, not card
badges. Building it is real work, and Rule 90 is explicit that an ad-hoc
headless run is not a substitute.

**So the visual claim is unverified.** The change is CSS-only, smoke
passes, and no hex was introduced — but "the badge renders monospace in
smoke on a real card" has not been proven, and I am not claiming it.
Written up as `CC-CMD-2026-08-09-badge-visual-probe` rather than left as
a caveat.

## Confidence

96 on what was verified; the unverified visual is why it is not higher,
and why the probe CC-CMD exists rather than a note.
