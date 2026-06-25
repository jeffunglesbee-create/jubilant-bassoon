# CC-CMD-2026-06-25-G-jb-pitch-component — Manifest (STOPPED at probe block)

DATE   : 2026-06-25 ET
PROMPT : docs/CC-CMD-2026-06-25-G-jb-pitch-component.md
REPO   : jubilant-bassoon
SW     : unchanged (no code added)
HEAD   : a46616c (post-pull, pre-edit)
STATUS : STOPPED at probe block.

Five concrete blockers; no code changes made.

================================================================
PROBE RESULTS
================================================================

PROBE 1 — Relay /bsd/contract endpoint
  `curl https://field-relay-nba.jeffunglesbee.workers.dev/bsd/contract`
  → curl: (56) CONNECT tunnel failed, response 403

  Sandbox egress proxy blocks the relay hostname. Cannot verify the
  contract shape, axes, or coordinate ranges from this session.

PROBE 2 — Relay /ambient/bsd/subscribe endpoint
  Same hostname, same 403. Cannot verify route exists or accepts
  the documented payload.

PROBE 3 — WC game view component / bsdEventId presence
  `grep -rn "bsdEventId\|wc26" src --include='*.{ts,tsx,js,jsx}'`
  → src directory contains only `src/js/{epa.js, test-epa.js}`.
    No TypeScript files, no React components, no .jsx/.tsx anywhere.
  `grep "bsdEventId" index.html` → 0 hits.

  Neither the activation field (`game.bsdEventId`) nor the React
  scaffold described by the CC-CMD exists in this codebase.

PROBE 4 — SSE listener / EventSource
  `grep "EventSource\|/live/ambient" index.html`
  → L26720-L27015: AmbientEventSource singleton ALREADY EXISTS in
    vanilla JS. ENDPOINT = `${RELAY_BASE}/live/ambient`; a single `_es`
    EventSource is opened (L26998) and listeners attach via the existing
    `_es.addEventListener(...)`. Auto-reconnects, manages readyState.

  This is the same SSE channel the CC-CMD's `useBSDLive` hook wants to
  open a SECOND time per WCGameView mount. Wrong topology.

================================================================
BLOCKERS
================================================================

BLOCKER 1 — Project architecture mismatch (fatal)

The CC-CMD specifies React/JSX deliverables:
  • `src/lib/bsd-pitch.js` with ES module `export { ... }`
  • `src/components/BSDPitch.jsx` (JSX, React functional component)
  • `src/lib/use-bsd-live.js` (`useEffect`/`useState`/`useRef`)
  • `WCGameView` JSX component

CLAUDE.md describes this repo:
  "A 34,000+ line single-file PWA (index.html) for global sports
   intelligence. Deployed on Cloudflare Workers as a pure static
   assets worker."

Direct verification:
  • `grep -c "import.*from" index.html` → 4 hits, all false positives
    inside string templates (no actual ES module imports anywhere)
  • `grep -c "export " index.html` → 0
  • Existing JS module pattern is the IIFE — `src/js/epa.js` uses
    `const FIELD_EPA = (() => { ... })();` exposed as a window global,
    NOT an ES module export
  • No build tool (no Vite, no webpack, no JSX transform); files are
    served verbatim by the static-assets worker
  • No React anywhere in project code (the only React hits in the tree
    are inside `node_modules/playwright-core` — a test-time browser
    automation dep, not a runtime dep)

A faithful adaptation would replace the React component with an SVG
DOM render function, the hook with a subscription attached to the
existing singleton AmbientEventSource, and the module exports with a
window-global IIFE pattern. That's a significant translation, not a
port — the prompt as written specifies the wrong stack.

BLOCKER 2 — Cross-repo verification blocked (Rule 72)

The CC-CMD says "Sequence: After field-relay-nba CC-CMDs A→F +
`/bsd/contract` shipped (HEAD `e49debf`)". Rule 72 (CHALLENGE-A):
"Inherited claims are hypotheses, not facts." I cannot verify the
relay state from this sandbox (proxy 403). Per the CC-CMD's own
PROBE 1+2, the manifest gates on those curl results.

Building against an unverified contract would risk shipping client
code that the relay never serves. The contract itself is marked
`provisional` even relay-side per the CC-CMD's own note.

BLOCKER 3 — Activation field absent client-side

`game.bsdEventId` is the activation gate per Task 4. `grep "bsdEventId"
index.html` → 0 hits. Neither relay→client propagation nor the field
exists yet on the client. Even a faithful vanilla-JS pitch component
would be permanently inactive (every conditional is `if (game.bsdEventId)
return null`).

The CC-CMD says CC-CMD-F (relay-side) added it; I have no way to
confirm from this sandbox. Even if it ships relay-side, the V2 client
poll-loop ingest path would need a one-line patch to forward the field
through to the game object.

BLOCKER 4 — SSE topology conflict

`useBSDLive` opens a new EventSource per WCGameView mount. The existing
AmbientEventSource singleton at L26720-L27015 manages exactly one
connection across the entire app with auto-reconnect + backoff. Opening
a second EventSource doubles the connection cost, fragments
backoff/reconnect handling, and conflicts with the existing topology.

Faithful integration would expose a register-listener API on the
existing singleton (e.g. `AmbientEventSource.on('bsd:ball', cb)`) and
let the pitch renderer attach to that.

BLOCKER 5 — Hook-only patterns

`useEffect`/`useState`/`useRef` cannot be lifted into vanilla JS as a
direct translation. The CC-CMD's lifecycle (subscribe on mount,
unsubscribe on unmount) requires a render lifecycle that vanilla JS
DOM rendering does not provide — would need to be approximated by
view-change listeners or attach/detach hooks on whatever container
the pitch SVG is mounted in.

================================================================
PATH FORWARD (NOT EXECUTED)
================================================================

A faithful rewrite for this codebase would be roughly:

  1. Relay-side (separate repo): verify /bsd/contract returns the
     documented JSON shape. Verify /v2/games?sport=wc26 includes
     `bsdEventId` on the test fixture (Ecuador @ Germany 20:00 UTC).
     I cannot verify either from sandbox.

  2. Client ingest (index.html, ~5 lines): in the V2 wc26 game
     processing path (find via `grep "wc26.*sport" index.html`),
     forward `bsdEventId` from the V2 payload onto the game object.
     Assertion: `assert('A_BSD_1 — bsdEventId forwarded in wc26 ingest', ...)`

  3. Pitch render module — choose one of:
     (a) New top-level file `src/js/bsd-pitch.js` mirroring the
         `src/js/epa.js` IIFE pattern, exposing `window.FIELD_BSD`
         with `getContract()`, `bsdToScreen(...)`, `renderPitch(el, opts)`.
     (b) Inline section in index.html, parallel to the existing
         AmbientEventSource block (~150 lines around L26720).
     The codebase pattern leans toward (b) for tightly-coupled features
     (e.g. WP fetch at L19297) and toward (a) for self-contained data
     pipelines (EPA). Pitch rendering is somewhere in between.

  4. SSE wiring: attach `bsd:ball` and `bsd:stats` listeners to the
     existing `_es` at L26998 — do NOT open a new EventSource. Filter
     by `event_id`. Reuse the existing connection's backoff and
     reconnect logic.

  5. Subscribe/unsubscribe: POST `/ambient/bsd/subscribe` when the
     pitch view becomes visible; POST `/ambient/bsd/unsubscribe` on
     hide. The view-change hook in FIELD is typically driven by
     `toggleWCView()` / panel-state changes (L10590 has the WC nav link).

  6. WC card integration: find where WC game cards are rendered
     (likely `buildWCMediaCards` based on earlier CC-CMDs in this
     session) and add a "Live Pitch" expansion or modal trigger
     gated on `wg.bsdEventId`.

Net result is similar feature surface, but ~150 lines of vanilla JS
into existing files — no new module system, no React, no JSX, no
duplicate EventSource. A correctly-scoped CC-CMD would specify those
locations and patterns instead of React component scaffolding.

================================================================
COMMIT STATE
================================================================

  HEAD       : a46616c (unchanged; only this manifest is new)
  SW_VERSION : unchanged (2026-06-25a in both files — synced last commit)
  Smoke      : not re-run (no code edits)
  Pushed     : manifest only, [skip ci]

Rules invoked: 60/70 (CONTRACT-A / ATOMIC-A — relay state unverifiable
from sandbox, contract still provisional), 62 (existing-conventions —
codebase has no React/JSX/ES modules to follow), 68 (PROBE-FIRST-A —
PROBE 1+2 blocked by network proxy; PROBE 3+4 contradict diagnosis),
71 (CONTEXT-A — read AmbientEventSource singleton before writing a
second one), 72 (CHALLENGE-A — relay HEAD claim unverified), 77
(NO-RATIONALIZE-A — five blockers investigated before writing),
87 (SELF-COMPLETE-A — stopped cleanly at probe block).
