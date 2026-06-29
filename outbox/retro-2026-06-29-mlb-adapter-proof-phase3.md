# Retro — 2026-06-29 — MLB Adapter Proof Phase 3

Session took ~2 hours to ship 5 Playwright tests. Target should be 30 minutes.

---

## What worked

**Live getter pattern for `window.__FIELD_PROOF__`** — using `Object.defineProperty` with a `get()` that reads `allData` at evaluation time was the right call. A snapshot taken at `_fieldDataReady` time would have been empty. The getter captures state when Playwright reads it, after the render cycle completes.

**Fetch interceptor** — overriding `window.fetch` to return `{}` in proof mode was a clean solution. Without it, every background fetch in the app fired, returned HTML from the local server, then threw a JSON parse error. One guard at the top eliminated all of them.

**Local server per-request content-type** — once the root cause was found (field_utils.js served as HTML), the fix was correct and permanent.

**Journalism function guards** — adding `if (_proofMode) return null` to `generateJournalismViaRelay`, `fetchCompoundEditorial`, `fetchFIELDBriefFromClaude` was the right move. Proof mode should never make AI calls.

---

## What didn't work / time sinks

### 1. Branch switching destroyed work (~20 min lost)

Tried to switch from `main` to `claude/elegant-shannon-t2dvt0` mid-session. The branches had diverged 138 commits. `git stash pop` conflicted, `git stash drop` wiped all in-progress changes. Had to re-apply everything manually.

**Better next time:** When the feature branch is far behind main, either (a) do the work on main from the start and note the branch discrepancy, or (b) create a fresh branch from main at session start. Never attempt to stash-and-switch across a large divergence.

### 2. Root cause of AVV-PW-004/005 took too long to find (~30 min lost)

The error was "Unexpected token '<'" — a JavaScript SyntaxError. Spent time on:
- Adding `window.onerror` / `window.addEventListener('unhandledrejection')` diagnostic — didn't fire (wrong event channel)
- Reading pageerror stack trace — message only, no stack
- Inspecting `window._fieldErrors` — empty

The root cause was that the local HTTP server returned `index.html` (HTML content) for every URL including `/field_utils.js`. The browser's script loader threw a CDP `Runtime.exceptionThrown` event, which Playwright catches as `pageerror` but which does NOT propagate through `window.onerror`.

**Better next time:** When a `pageerror` fires on a local server, check the network requests FIRST. Add server-side request logging from the start — it would have shown `GET /field_utils.js → 200 text/html` immediately and identified the cause in under 2 minutes. The diagnostic path should be: pageerror → check network tab / server logs → check what the browser actually loaded, not → add more JS error listeners.

Rule to add to CC-CMD template: "Local server must log every request with method, path, status, content-type."

### 3. Numeric separator lint error (~10 min lost)

`60_000` in `USER_STATE_REFETCH_MS` caused "Parsing error: Identifier directly after number" because `.eslintrc.json` was set to `ecmaVersion: 2020`. Numeric separators require ES2021.

Initially changed `60_000` to `60000`, then found smoke assertion A658 requires the underscore form exactly. Fix was to change `.eslintrc.json` to `ecmaVersion: 2021`.

**Better next time:** The CC-CMD should include "run `npx eslint index.html --max-warnings 0` after any index.html edit" in the probe block, not just smoke. The lint failure was a blocker that only surfaced after fixing the primary issue.

### 4. Pre-existing lint violations (~10 min lost)

Fixing the ecmaVersion parse error exposed 6 pre-existing `no-restricted-syntax` violations (getElementById direct access). These weren't introduced by this session's changes but blocked the commit.

**Better next time:** Run `npx eslint index.html` at session start to get a baseline count of pre-existing lint errors. Document them in the CC-CMD so they're not a surprise. Only fix them if they're in scope.

### 5. Feature branch push never succeeded (~15 min lost)

All git push attempts to `claude/elegant-shannon-t2dvt0` timed out. The branch was 138 commits behind main, requiring a large object transfer that exceeds the remote execution environment's network timeout.

**Better next time:** When the target feature branch is more than ~10 commits behind main, note at session start that a force-push will be required and that it may not be possible in the remote execution environment. Accept that work goes to main and document clearly in HANDOFF. Don't retry the same push 4+ times.

---

## What the CC-CMD was missing

The CC-CMD (Phase 3 spec) did not include:

1. **A local server spec** — the test infrastructure requires a local HTTP server that serves `.js` files correctly. The CC-CMD only said "run the tests" without specifying what server setup was needed or what content-type gotchas to watch for.

2. **Baseline lint command** — `npx eslint index.html` before writing any code would have surfaced ecmaVersion and pre-existing lint issues immediately.

3. **Branch state check** — the CC-CMD didn't note that `claude/elegant-shannon-t2dvt0` was 138 commits behind. A one-liner like `git rev-list --count HEAD..origin/claude/elegant-shannon-t2dvt0` at session start would have flagged this.

4. **Network request logging in server** — any CC-CMD that includes a local test server should require request logging.

---

## Template additions for future Playwright CC-CMDs

Add to the probe block:

```
# 1. Check branch divergence
git rev-list --count origin/<feature-branch>..HEAD

# 2. Baseline lint
npx eslint index.html --max-warnings 0 2>&1 | tail -5

# 3. Confirm Playwright config has executablePath guard
grep -n "executablePath" tests/adapter-proof.playwright.config.js

# 4. Server must log requests: console.log(req.method, req.url, res.statusCode, contentType)
```

---

## Time breakdown (estimated)

| Task | Actual | Should be |
|---|---|---|
| Read CC-CMD, probe HEAD, set up | 10 min | 5 min |
| Write proof mode code in index.html | 25 min | 20 min |
| Fix branch switching / lost work | 20 min | 0 min |
| Debug AVV-PW-004/005 root cause | 30 min | 5 min |
| Fix lint issues (ecmaVersion + no-restricted-syntax) | 20 min | 5 min |
| Final smoke + test verification | 10 min | 5 min |
| Feature branch push attempts | 15 min | 2 min (declare fail fast) |
| HANDOFF + session doc | 10 min | 5 min |
| **Total** | **~140 min** | **~47 min** |

The 93-minute gap is almost entirely three root causes: branch switching, slow network debugging, and not having a local server spec in the CC-CMD.
