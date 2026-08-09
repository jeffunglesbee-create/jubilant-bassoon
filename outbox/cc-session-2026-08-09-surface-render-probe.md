# CC-CMD-2026-08-09-surface-render-probe — Result

## Status: DONE. 4 of 4 surfaces PASS on the deployed build. **Confidence: 97.**

Commits: `23b5e059` (probe + workflow). No app code changed, so no
SW_VERSION bump and no deploy — the probe measures `2026-08-09d`, already
live.

## Task 1 — probed from HEAD, and one grep in my own CC-CMD was wrong

Three of the four greps returned the expected `var(--card)`. The fourth,
`grep -o "body.journalism-mode \.jrn-companion{[^}]*}"`, returned
**nothing** — and the CC-CMD's Task 1 says to STOP on that, because it
reads as "the audit did not land."

It had landed. The selector in the file is newline-prefixed
(`'\n  body.journalism-mode .jrn-companion'`), so a literal single-space
grep cannot match it. I had written that pattern in the CC-CMD from a
whitespace-normalised python dump, not from the file.

Re-checked by parsing the CSS instead of string-matching:
`background:var(--obsidian)`. Correct at HEAD. Recording it because a
STOP on a bad grep would have aborted a healthy change — the same
false-negative class as `field-chip--MUST` looking dead to a naive grep.

## Task 2 — reveal paths, read not assumed

| surface | how it opens |
|---|---|
| `#privacy-banner` | `initPrivacyBanner()` shows it when `localStorage.field_privacy_v1` is unset (`field.js:20927`, called at `:40386`) |
| `.privacy-modal` | click `#privacy-policy-link`; its listener calls `showPrivacyPolicyModal()` |
| `#jrn-companion` | `window.toggleJournalismView()` |
| `#eu-push-consent` | `el.style.display='block'` — byte-identical to `showEUPushConsent()`'s own reveal line |

`showEUPushConsent` is not exposed on `window` and its natural trigger
needs an EU timezone plus the push-permission flow, so the probe runs that
function's own line rather than inventing a path. Every surface records
which method was used, in the manifest, so the reveal is auditable rather
than implied.

## Two defects in my own probe, both found by running it

**1. `offsetParent` is not a visibility test.** It is `null` for *every*
`position:fixed` element, and both `.jrn-companion` and `.eu-push-consent`
are fixed. The first local run reported all four `NOT-OPENED` — a probe
failing loudly about a bug that did not exist. Replaced with a
display/visibility/opacity check plus a bounding-rect measurement.

**2. A bare `catch {}` was swallowing the toggle error** — the one piece
of evidence that would explain a `NOT-OPENED`. That is Rule 77's
rationalisation reflex expressed in code. The error is now captured into
the manifest, alongside a `moduleBooted` flag, so "the bundle never ran"
can never be mistaken for "the CSS is wrong."

## Why local pre-validation was impossible here — structural, not flaky

I ran the probe locally first, as in previous executions. All four
surfaces reported `NOT-OPENED` with `toggleJournalismView is not defined`.
Rather than write that off as a sandbox quirk, I read the console:

```
Access to script at 'file:///home/user/utils/golf-format.js' from origin
'null' has been blocked by CORS policy
```

Source `index.html` carries bare `../utils/*.js` imports, and **that
directory does not exist in the repo**. The deploy pipeline bundles those
modules from `src/main.js` via esbuild. The served file is a different
artifact from the source file — so the source is not a runnable page at
all, and no local run can exercise these reveal paths.

That is exactly the condition Rule 90 names when it mandates CI against
the LIVE deployed URL. Worth writing down: for anything that depends on
the app's JS executing, local pre-validation is not merely unreliable in
this repo, it is impossible by construction. CSS-only probes (the badge
sweep's synthetic pass) remain locally checkable.

## Done condition — met, artifact committed

`outbox/surface-render-probe-2026-08-09T14-36-40-723Z-manifest.json`,
`swVersion: "2026-08-09d"`, `moduleBooted: true`, `toggleError: null`:

```
{"pass":4,"fail":0,"notOpened":0,"total":4}  conclusive: true

PASS  privacy-banner    opened=true  bg=rgb(18, 18, 36)  want=rgb(18, 18, 36)
PASS  privacy-modal     opened=true  bg=rgb(18, 18, 36)  want=rgb(18, 18, 36)
PASS  jrn-companion     opened=true  bg=rgb(7, 7, 16)    want=rgb(7, 7, 16)
PASS  eu-push-consent   opened=true  bg=rgb(18, 18, 36)  want=rgb(18, 18, 36)
```

`rgb(18,18,36)` is `--card` `#121224`; `rgb(7,7,16)` is `--obsidian`
`#070710`. Both read off the deployed tokens at runtime, not hardcoded.

Cropped screenshots committed per surface, plus a full-page frame:
`…-privacy-banner.png` (23.8 KB), `…-privacy-modal.png` (70.3 KB),
`…-jrn-companion.png` (20.0 KB), `…-eu-push-consent.png` (10.3 KB),
`…-full.png` (295 KB).

Every one of these was `rgba(0, 0, 0, 0)` before the phantom-token audit.

## The gate this closes

`outbox/cc-session-2026-08-09-phantom-css-token-audit.md` was held at
**95** for one stated reason: the 50 no-fallback declarations were each now
a visible difference with no image behind them, and "the privacy modal now
has a background" rested on CSS reasoning. That claim now has a screenshot
and a computed value at the deployed SW_VERSION. Amended to **97** there,
with a pointer to this doc.

## Confidence gate

**97.** Every surface opened by the app's own path, measured against
tokens read from the live page, with both an `opaque` and a stronger
`matchesToken` assertion, and cropped images committed. `conclusive`
requires all four decided, so a partial run cannot read as green.

Not higher because the four surfaces here are the ones I could name — they
are not the whole of the 50 fixed declarations. The remaining ~46 are text
colours on elements the badge probe's method already covers in principle
but that this probe does not enumerate. No evidence suggests they are
wrong; they simply are not individually imaged, and claiming otherwise
would overstate what the artifact shows.
