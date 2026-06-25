# CC-CMD G (revised): jubilant-bassoon — BSD Live Pitch Integration
**Date:** 2026-06-25 · **Repo:** jubilant-bassoon · **Rule 87:** Self-completing.
**Revision:** Rewritten after probe block stopped at 5 blockers (architecture mismatch).
**Cross-repo dep:** field-relay-nba HEAD ≥ e49debf (bsdEventId in handleV2Games).

---

## WHAT CHANGED FROM ORIGINAL SPEC

Five blockers corrected:
1. Architecture: NO React/JSX/ES modules. All vanilla JS inline in index.html.
   Pattern: extend existing functions in-place. No new files.
2. Probe: NO curl to field-relay-nba.jeffunglesbee.workers.dev (sandbox blocks it).
   All probe steps are grep-only on local source.
3. bsdEventId: mapV2ToESPN at L16662 strips it. Must be added to return object.
4. SSE: extend existing _connect() listener block (L27000-27006). No second EventSource.
5. Lifecycle: subscribe/unsubscribe hooks attach to toggleWCView() (L30611), not useEffect.

Pitch SVG rendering is INCLUDED as inline functions — no separate module file.

---

## PROBE BLOCK — grep only, no relay curls

```bash
cd /home/claude/jubilant-bassoon && git pull

# 1. Confirm bsdEventId is absent from client (blocker 3)
grep -c 'bsdEventId' index.html
# Expected: 0

# 2. Confirm mapV2ToESPN return object location
grep -n 'start_time: fg.start' index.html
# Expected: 1 line at ~L16694

# 3. Confirm _connect listener block for str_replace anchor
grep -n "addEventListener('ping'" index.html
# Expected: 1 line at ~L27006

# 4. Confirm toggleWCView location and structure
grep -n 'function toggleWCView' index.html
grep -n 'renderWCSection()' index.html | head -3
# Expected: function at ~L30611, renderWCSection() call at ~L30628

# 5. Confirm _onMessage ping check for str_replace anchor
grep -n "eventType === 'ping') return" index.html
# Expected: 1 line at ~L26765

# 6. Confirm V2_RELAY_BASE is accessible in scope
grep -n 'V2_RELAY_BASE' index.html | head -5
# Expected: defined somewhere in the global JS scope

# 7. No bsd:ball listener yet
grep -c "bsd:ball" index.html
# Expected: 0
```

---

## TASK 1 — mapV2ToESPN: forward bsdEventId

**str_replace in index.html:**

OLD (exact match, ~L16694):
```
    start_time: fg.start || '',
  };
}
```

NEW:
```
    bsdEventId: fg.bsdEventId || null,  // BSD event ID — activates pitch/momentum when set
    start_time: fg.start || '',
  };
}
```

---

## TASK 2 — _connect(): add bsd:ball and bsd:stats listeners

**str_replace in index.html:**

OLD (exact match, ~L27006-27007):
```
      _es.addEventListener('ping',        e => _onMessage(e, 'ping'));

      _es.onopen = function() {
```

NEW:
```
      _es.addEventListener('ping',        e => _onMessage(e, 'ping'));
      _es.addEventListener('bsd:ball',    e => _onMessage(e, 'bsd:ball'));
      _es.addEventListener('bsd:stats',   e => _onMessage(e, 'bsd:stats'));

      _es.onopen = function() {
```

---

## TASK 3 — _onMessage: handle bsd:ball and bsd:stats

**str_replace in index.html:**

OLD (exact match, ~L26765-26766):
```
    if (eventType === 'ping') return; // keepalive — no action

    if (eventType === 'connected') {
```

NEW:
```
    if (eventType === 'ping') return; // keepalive — no action

    // BSD ball tracking and stats frames — routed through AmbientDO SSE
    if (eventType === 'bsd:ball' || eventType === 'bsd:stats') {
      try { if (typeof _bsdOnSSEFrame === 'function') _bsdOnSSEFrame(eventType, data); } catch (_e) {}
      return;
    }

    if (eventType === 'connected') {
```

---

## TASK 4 — toggleWCView: subscribe/unsubscribe hooks

**str_replace in index.html:**

OLD (exact match, ~L30628-30634):
```
    renderWCSection();
  } else {
    navLink?.classList.remove('active');
    section?.setAttribute('hidden', '');
    if (section) section.style.display = ''; // clear inline override
    // Close BracketDO WebSocket — no bracket updates needed off-screen
    if (window._bracketWS) window._bracketWS.close();
  }
}
```

NEW:
```
    renderWCSection();
    // Subscribe to BSD for any live WC game with bsdEventId
    setTimeout(_bsdActivateForWC, 500); // defer 500ms — let V2 poll populate espnScores first
  } else {
    navLink?.classList.remove('active');
    section?.setAttribute('hidden', '');
    if (section) section.style.display = ''; // clear inline override
    // Close BracketDO WebSocket — no bracket updates needed off-screen
    if (window._bracketWS) window._bracketWS.close();
    // Unsubscribe BSD WebSocket fan-out
    _bsdDeactivate();
  }
}

// ── BSD pitch helpers (2026-06-25) ────────────────────────────────────────
// Vanilla JS. Extends existing _es SSE singleton (no second EventSource).
// Subscribe/unsubscribe lifecycle tied to wc-mode panel state.

// Track active BSD subscription
var _bsdActiveId = null;
var _bsdShotData = [];
var _bsdBallPos  = null;

// Called on bsd:ball and bsd:stats frames from _onMessage
function _bsdOnSSEFrame(type, data) {
  if (type === 'bsd:ball') {
    _bsdBallPos = data;
    _bsdRepaint();
  } else if (type === 'bsd:stats') {
    if (Array.isArray(data.shots)) { _bsdShotData = data.shots; _bsdRepaint(); }
  }
}

// Subscribe to BSD WebSocket via AmbientDO
function _bsdActivate(eventId) {
  if (_bsdActiveId === eventId) return;
  _bsdActiveId = eventId;
  var base = (typeof V2_RELAY_BASE !== 'undefined') ? V2_RELAY_BASE : '';
  fetch(base + '/ambient/bsd/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event_id: eventId }),
  }).catch(function() {});
}

// Unsubscribe when leaving WC view
function _bsdDeactivate() {
  if (!_bsdActiveId) return;
  var base = (typeof V2_RELAY_BASE !== 'undefined') ? V2_RELAY_BASE : '';
  fetch(base + '/ambient/bsd/unsubscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event_id: _bsdActiveId }),
  }).catch(function() {});
  _bsdActiveId = null;
  _bsdBallPos  = null;
  _bsdShotData = [];
}

// Find a live WC game with bsdEventId and subscribe
function _bsdActivateForWC() {
  try {
    if (typeof espnScores === 'undefined') return;
    var entry = null;
    Object.keys(espnScores).forEach(function(k) {
      var s = espnScores[k];
      if (s && s._sport === 'wc26' && s.state === 'in' && s.bsdEventId && !entry) {
        entry = s;
      }
    });
    if (entry) _bsdActivate(entry.bsdEventId);
  } catch (_e) {}
}

// SVG pitch renderer — called on each bsd:ball / bsd:stats frame
function _bsdRepaint() {
  var el = document.getElementById('bsd-pitch');
  if (!el) return;
  var W = el.clientWidth  || 300;
  var H = Math.round(W * 0.667);
  var shots = (_bsdShotData || []).map(function(s) {
    var cx = s.x * W / 100;
    var cy = (100 - s.y) * H / 100;
    var r  = 3 + (s.xg || 0) * 10;
    var col = s.team === 'home' ? 'rgba(99,179,237,0.75)' : 'rgba(252,129,74,0.75)';
    return '<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="'+col+'" stroke="rgba(255,255,255,0.4)" stroke-width="0.8"/>';
  }).join('');
  var ball = '';
  if (_bsdBallPos && _bsdBallPos.x != null) {
    var bx = _bsdBallPos.x * W / 100;
    var by = (100 - _bsdBallPos.y) * H / 100;
    ball = '<circle cx="'+bx+'" cy="'+by+'" r="5" fill="#fff" stroke="rgba(0,0,0,0.4)" stroke-width="1"/>';
  }
  el.innerHTML =
    '<svg width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" style="display:block;background:#2d5a27;border-radius:6px">'+
    '<rect x="'+W*.05+'" y="'+H*.05+'" width="'+W*.9+'" height="'+H*.9+'" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="1.5"/>'+
    '<line x1="'+W/2+'" y1="'+H*.05+'" x2="'+W/2+'" y2="'+H*.95+'" stroke="rgba(255,255,255,0.35)" stroke-width="1.5"/>'+
    '<circle cx="'+W/2+'" cy="'+H/2+'" r="'+Math.min(W,H)*.1+'" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="1.5"/>'+
    shots + ball +
    '</svg>';
}
```

---

## TASK 5 — Smoke assertions

Add after the last existing assertion (near end of JS, before `</script>`):

```javascript
// A_BSD_7 — bsdEventId forwarded through mapV2ToESPN
assert('A_BSD_7 — bsdEventId in mapV2ToESPN return object',
  html.includes('bsdEventId: fg.bsdEventId || null'),
  'mapV2ToESPN must forward bsdEventId so client can track BSD live events');

// A_BSD_8 — bsd:ball listener wired in _connect()
assert('A_BSD_8 — bsd:ball SSE listener in _connect()',
  html.includes("addEventListener('bsd:ball'"),
  '_connect() must register bsd:ball listener on existing _es singleton');
```

---

## DONE CONDITIONS

```bash
# 1. Smoke passes
node smoke.js 2>&1 | tail -3
# Expected: N passed, 0 failed (N ≥ 755, two new assertions added)

# 2. bsdEventId appears in index.html (mapV2ToESPN + smoke)
grep -c 'bsdEventId' index.html
# Expected: ≥ 3

# 3. bsd:ball listener wired
grep -c "addEventListener('bsd:ball'" index.html
# Expected: 1

# 4. _bsdOnSSEFrame defined
grep -c 'function _bsdOnSSEFrame' index.html
# Expected: 1

# 5. Subscribe/unsubscribe functions defined
grep -c 'function _bsdActivate\b' index.html && grep -c 'function _bsdDeactivate' index.html
# Expected: 1 each

# 6. A_BSD_7 and A_BSD_8 in smoke.js
grep -c 'A_BSD_7\|A_BSD_8' smoke.js
# Expected: 2

# 7. diff — index.html and smoke.js only
git diff --stat
# Expected: index.html + smoke.js (no new files)
```

---

## COMMIT

```bash
git add index.html smoke.js
git commit -m "feat(bsd): wire bsdEventId + bsd:ball/stats SSE + pitch renderer (A_BSD_7, A_BSD_8)"
git push origin main
```
