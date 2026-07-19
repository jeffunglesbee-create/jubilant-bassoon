# SPEC — Game Thread

**Date:** 2026-07-19
**Status:** Approved for implementation

---

## What it is

A live, shared, anonymous text feed attached to an individual game while it's in
progress. Anyone watching the same game sees the same notes in real time. Notes
disappear 15 minutes after the game reaches FINAL. No accounts, no replies, no
reactions, no upvotes.

The experience is the shared presence of watching together. The artifact
disappears because the artifact is not the point.

---

## User experience

**Entry point:** A "Thread" button appears on the game card only when
`getCardCircadian()` returns `'LIVE'`. Hidden for PREVIEW and FINAL. Tapping it
opens a bottom drawer or inline expander — not a new surface, not a navigation
change.

**The feed:** A vertically-scrolled list of notes, newest at the bottom, in
chronological order. No timestamps shown (they exist in the DB for ordering
only). No usernames. No avatars. No sport tags. Just the text.

**Your own notes:** Rendered in a slightly different color — purely client-side,
via matching against a session-scoped random token stored in localStorage. The
server never knows which note is yours.

**The input:** A single text field, placeholder "say something", a Send button.
280 char max. Disabled for 30 seconds after each send (rate cap). No explicit
error message on rate cap — the button just stays disabled with a subtle
countdown.

**On game completion:** Notes stop arriving. The feed stays readable for 15
minutes (TTL enforced server-side), then the Thread button disappears on the
next poll and the drawer closes. No tombstone, no "thread closed" message.

---

## Data model

### D1 table — `game_thread_notes` (in `ARCHIVE_DB`)

```sql
CREATE TABLE IF NOT EXISTS game_thread_notes (
  id          TEXT PRIMARY KEY,        -- uuid v4
  game_id     TEXT NOT NULL,           -- relay game ID (same key space as briefs.game_id)
  sport       TEXT NOT NULL,
  body        TEXT NOT NULL,           -- 1–280 chars, trimmed
  ts          INTEGER NOT NULL,        -- Unix ms, for ordering
  expires_at  INTEGER NOT NULL         -- Unix ms: game final_ts + 900000 (15 min)
);
CREATE INDEX IF NOT EXISTS idx_gtn_game_ts ON game_thread_notes(game_id, ts);
```

No author ID. No IP. No session token. The server stores nothing that links a
note to a person.

---

## Transport

### WebSocket message types (GameDO extension)

Two new types added to `ALLOWED_CLIENT_MSG_TYPES` in `src/game-do.js`:

**Client → server:**
```json
{ "type": "thread_note", "body": "...", "token": "abc123" }
```
- `body`: string, 1–280 chars after trim. Rejected silently if empty or over limit.
- `token`: opaque random string generated client-side at session start, stored in
  localStorage. Never stored server-side. Used only to echo back to the sender
  so the client can style its own notes differently. The server treats it as an
  opaque label.

**Server → all connected clients (broadcast):**
```json
{ "type": "thread_note", "id": "uuid", "body": "...", "token": "abc123", "ts": 1234567890 }
```
- `token` is echoed verbatim. Each client compares against its own session token
  to decide render style. No server-side identity is implied.

### Rate limiting

GameDO tracks last-send time per WebSocket session in memory (not persisted).
Sends within 30 seconds of the previous send are silently dropped — no error
sent back, the client handles it locally by disabling the input.

### Backfill on join

When a client connects (or reconnects), GameDO serves the last 50 notes for the
game from D1 as a single `thread_catchup` message before the live stream starts:

```json
{ "type": "thread_catchup", "notes": [ { "id": "...", "body": "...", "ts": ... }, ... ] }
```

`token` is NOT included in catchup notes — the client has no way to know which
historic notes were its own (intentional: session ends, identity ends).

---

## Relay changes (`field-relay-nba` / `src/game-do.js`)

1. Add `'thread_note'` to `ALLOWED_CLIENT_MSG_TYPES`
2. In `webSocketMessage`: handle `thread_note` — validate body length, apply
   rate cap, write to `ARCHIVE_DB.game_thread_notes`, then `_broadcast` to all
   connected sessions
3. On WebSocket open (after `hello` handshake): fetch last 50 notes from D1,
   send `thread_catchup` to the joining session only
4. Scheduled cleanup: hourly cron sweep (`*/60` via the existing cron handler in
   `src/index.js`) deletes rows where `expires_at < Date.now()`

GameDO already has `this.env` access — `ARCHIVE_DB` binding is already in
`wrangler.toml`. No new bindings needed.

**ADR-002 compliance:** GameDO writes facts (the note text) and echoes them.
It does not classify, score, or editorialize. The note body is stored and
served verbatim. No drama scoring, no interest levels, no quality filtering.

---

## Client changes (`jubilant-bassoon` / `src/legacy/field.js`)

### Session token

```js
const THREAD_TOKEN_KEY = 'field_thread_token_v1';
function _getThreadToken() {
  let t = localStorage.getItem(THREAD_TOKEN_KEY);
  if (!t) { t = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2); localStorage.setItem(THREAD_TOKEN_KEY, t); }
  return t;
}
```

### GameSocket extension

`GameSocket` already handles `onFacts`. Add `onThreadNote` and `onThreadCatchup`
callbacks alongside it. On receiving a `thread_note` or `thread_catchup` WS
message, call the registered callback with the payload.

### Render

`buildThreadHTML(notes, myToken)` — pure function, returns HTML string, no side
effects. Each note is a `<div class="thread-note [thread-mine]">` where
`thread-mine` is added when `note.token === myToken`. Newest notes appended to
the bottom; scroll position is preserved (append-only, no innerHTML replacement).

`sendThreadNote(gameId, body)` — trims body, validates length client-side,
sends `{ type: 'thread_note', body, token: _getThreadToken() }` via the
existing `GameSocket` instance for that game.

### Thread UI

Attached to the existing game card expander pattern. The Thread button is
conditionally rendered in `buildCardHTML` only when circadian state is `LIVE`.
The drawer renders below the score, above any scouting content.

---

## Scope boundaries

**Not in scope for V1:**
- Moderation beyond rate cap and length limit
- Profanity filtering
- Reporting
- Reactions or emoji-only shortcuts
- Read receipts or participant count
- Push notifications for thread activity
- Thread activity in the ambient panel or journalism feed

**Explicitly excluded forever:**
- Usernames or handles of any kind
- Thread history after the 15-minute expiry window
- Cross-game or league-wide feeds

---

## Implementation order

1. **RELAY first:** D1 schema migration, GameDO message handling, backfill-on-join,
   hourly cleanup cron. Deploy and verify with a manual WebSocket probe.
2. **CLIENT second:** Session token, GameSocket callback extension, UI render,
   send handler. No client deploy until relay is confirmed live.
3. **Smoke assertions:** Add structural assertions for `#thread-drawer`,
   `.thread-note`, `.thread-input` to `smoke.js`.

---

## Done condition

A real WebSocket client connected to a LIVE game's GameDO instance can:
1. Send a `thread_note` message and receive it broadcast back within 1 second
2. Disconnect and reconnect and receive the last 50 notes as `thread_catchup`
3. Confirm the note exists in `ARCHIVE_DB.game_thread_notes` via D1 MCP query
4. Confirm the note is absent from D1 15 minutes after `expires_at`

Client done condition: two browser tabs open to the same LIVE game card both
show the same notes in real time with < 2s latency.
