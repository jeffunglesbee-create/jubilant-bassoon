# SPEC — Game Thread (Solid.js client)

**Date:** 2026-07-19
**Status:** Filed — not in current build queue
**Supersedes client section of:** SPEC-game-thread-2026-07-19.md (relay section unchanged)

---

## What it is

Same as the base spec. Anonymous, ephemeral, per-LIVE-game note feed. Notes
disappear 15 minutes after FINAL. No accounts, no replies, no reactions.

This document covers only the client architecture. All relay changes, D1 schema,
WebSocket message types, rate limiting, and backfill-on-join are identical to
SPEC-game-thread-2026-07-19.md and are not repeated here.

---

## Why Solid.js changes the client

The vanilla JS spec (base spec) requires careful DOM surgery to append notes
without destroying scroll position and a `setInterval`-based countdown that
fights the existing `renderAll()` cycle. Solid makes both of these structural
problems disappear:

- Note list is a `<For>` keyed by `note.id` — new notes append as new DOM nodes;
  existing nodes are never touched
- Rate cap countdown is a signal on a timer — survives any surrounding re-render
  because there is no surrounding re-render
- Score and WP in the drawer header are memos over the game's existing signals —
  no separate fetch, no duplication

---

## Reactive graph

```
gameScore (signal)        ← WebSocket `facts` message (existing)
gameStatus (signal)       ← same
threadNotes (signal[])    ← WebSocket `thread_note` / `thread_catchup`
rateCap (signal: number)  ← countdown timer, 0 when clear
inputBody (signal: string) ← controlled input
myToken (derived once)    ← _getThreadToken(), stable for session

wpMemo = createMemo(() => computeWP(gameScore(), gameStatus()))
canSend = createMemo(() => rateCap() === 0 && inputBody().trim().length > 0)
```

Nothing in the drawer re-renders on a timer. Everything updates from signal
writes — which happen on WebSocket messages and user input only.

---

## Component tree

```
<ThreadDrawer gameId sport>
  <DrawerHeader>          ← score memo, status memo, WP memo
  <NoteList>
    <For each={threadNotes}>
      {note => <Note body mine={note.token === myToken} />}
    </For>
  </NoteList>
  <NoteInput>             ← controlled, disabled when !canSend
    <CountdownChip>       ← rateCap signal, hidden when 0
```

`<ThreadDrawer>` mounts into `#thread-mount-{gameId}` — a stable div that
already exists in the game card DOM (rendered by the existing vanilla JS card
builder, conditionally present when circadian state is `LIVE`). Solid mounts
once; the rest of the card is vanilla JS and unaffected.

---

## Session token

```js
const THREAD_TOKEN_KEY = 'field_thread_token_v1';
function _getThreadToken() {
  let t = localStorage.getItem(THREAD_TOKEN_KEY);
  if (!t) {
    t = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    localStorage.setItem(THREAD_TOKEN_KEY, t);
  }
  return t;
}
```

Called once at mount. Result is a plain `const` — not a signal, because the
token never changes within a session.

---

## WebSocket integration

The existing `GameSocket` class handles the WebSocket connection. Solid does not
own the socket. Instead:

```js
// Inside createEffect on mount:
gameSocket.onThreadCatchup = (payload) => {
  setThreadNotes(payload.notes); // batch set
};
gameSocket.onThreadNote = (note) => {
  setThreadNotes(prev => [...prev, note]); // append only
};
```

`setThreadNotes` is Solid's store setter. The `<For>` component reconciles
against the previous array by key (`note.id`). Existing note DOM nodes are
never touched on append — only the new node is created.

---

## Rate cap

```js
const [rateCap, setRateCap] = createSignal(0);

function afterSend() {
  setRateCap(30);
  const t = setInterval(() => {
    setRateCap(c => {
      if (c <= 1) { clearInterval(t); return 0; }
      return c - 1;
    });
  }, 1000);
}
```

`<CountdownChip>` reads `rateCap()` directly. No coordination with `renderAll()`
needed because the chip's DOM node is owned by Solid, not the vanilla JS render
cycle.

---

## Send handler

```js
function sendNote() {
  const body = inputBody().trim();
  if (!body || !canSend()) return;
  gameSocket.send({ type: 'thread_note', body, token: _getThreadToken() });
  setInputBody('');
  afterSend();
}
```

Client-side rate cap applies immediately on send. The server silently drops
duplicate sends within 30s (same as base spec). The button re-enables when
`rateCap()` reaches 0 regardless of server behavior.

---

## Own-note styling

```js
const mine = (note) => note.token === myToken;
```

`<Note>` receives `mine` as a prop. CSS class `thread-mine` applied when true.
The server never knows which notes are yours. Token is echoed verbatim in the
broadcast; catchup notes have no token (intentional — session ends, identity
ends).

---

## Mounting and unmounting

The vanilla JS card builder already conditionally renders `#thread-mount-{gameId}`
when `getCardCircadian() === 'LIVE'`. The Thread button's click handler:

```js
import { render, cleanup } from 'solid-js/web';

let threadCleanup = null;
function openThread(gameId, sport) {
  if (threadCleanup) return; // already mounted
  const mount = document.getElementById(`thread-mount-${gameId}`);
  threadCleanup = render(() => <ThreadDrawer gameId={gameId} sport={sport} />, mount);
}
function closeThread() {
  if (threadCleanup) { threadCleanup(); threadCleanup = null; }
}
```

When the game reaches FINAL and the Thread button disappears on the next poll,
`closeThread()` is called from the card rebuild. Solid disposes all reactive
computations and removes the DOM. The vanilla JS card builder owns the
lifecycle decision; Solid owns the DOM inside the mount point.

---

## Build config change

`scripts/build-bundle.mjs` (esbuild):

```js
// Add to existing esbuild options:
jsxImportSource: 'solid-js',
jsx: 'automatic',
```

`solid-js` added to `package.json` dependencies. No other build changes.

---

## CSS

Same class names as base spec (`.thread-note`, `.thread-mine`, `.thread-input`,
`#thread-drawer`) so smoke assertions are unchanged. Solid renders to the same
DOM structure; the test layer doesn't know it's Solid.

---

## Smoke assertions

Three new structural assertions (same as base spec):
- `#thread-drawer` present in DOM when Thread is open
- `.thread-note` present after first note arrives
- `.thread-input` present and is an input element

---

## Implementation order

Same relay-first ordering as base spec. Client is second. Solid client replaces
the vanilla JS client section of the base spec entirely — do not implement both.

1. Relay: D1 schema, GameDO message handling, backfill, cleanup cron
2. Client: `solid-js` dep, build config, `ThreadDrawer` component tree
3. Smoke: structural assertions for `#thread-drawer`, `.thread-note`, `.thread-input`

---

## Done condition

Same as base spec. Additionally:
- `cleanup()` called when game transitions from LIVE to FINAL and card rebuilds
- No memory leak: `createEffect` in `ThreadDrawer` disposes on unmount
- Scroll position in `<NoteList>` preserved across note appends (verified by
  sending 10 notes and confirming scroll position of note 1 is unchanged)
