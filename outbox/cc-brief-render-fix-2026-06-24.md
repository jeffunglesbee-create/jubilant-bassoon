# CC-CMD-2026-06-24-brief-render-fix — Manifest (STOPPED at probe block)

DATE   : 2026-06-24 ET
PROMPT : docs/CC-CMD-2026-06-24-brief-render-fix.md
REPO   : jubilant-bassoon (sole)
SW     : 2026-06-24f → (NOT bumped — see below)
HEAD   : a3b0740 (pre-probe baseline)
STATUS : STOPPED at probe block per Rule 68 + the CC-CMD's own
         instruction:
           "If any probe contradicts the diagnosis above, STOP and
            record findings. Do not proceed with tasks until probes
            are reconciled."

Four of eight probes contradict the diagnosis. No code edits made.
No SW_VERSION bump. No smoke modifications. Nothing pushed.

================================================================
PROBE RESULTS (verbatim)
================================================================

──────────────────────────────────────────────────────────────────
PROBE 1 — scheduleRenderAll implementation at L10063
──────────────────────────────────────────────────────────────────

`sed -n '10060,10090p' index.html`

  10062  let _renderAllPending = null;
  10063  function scheduleRenderAll(){
  10064    if(_renderAllPending) clearTimeout(_renderAllPending);
  10065    _renderAllPending = setTimeout(()=>{
              _renderAllPending=null; renderAll(); renderESPNScores();
            }, 150);
  10066  }

VERDICT — CONTRADICTS DIAGNOSIS.
scheduleRenderAll is ALREADY DEBOUNCED via `_renderAllPending` with a
150ms timeout. The CC-CMD's premise ("each call rebuilds DOM sections /
28 call sites → 28 renders") is incorrect — the 28 sites already collapse
to 1 render per settle cycle.

Task 1 asks to add `_sraTimer = null` + `_sraTimer = setTimeout`. This
would either:
  (a) be redundant (already debounced — adds a second indirection),
  (b) replace the working debounce with a renamed copy (no functional
      change; pure churn), or
  (c) double-debounce (delays accumulate, slows renders).

None of these address brief render failure.

──────────────────────────────────────────────────────────────────
PROBE 2 — _briefText assignment sites
──────────────────────────────────────────────────────────────────

`grep -n '_briefText\s*=' index.html`

  10549      const _briefText = _briefEl.textContent?.trim() || '';
  32530      const _briefText = _briefEl.querySelector('.field-brief-text')?.textContent?.trim()||'';

VERDICT — CONTRADICTS DIAGNOSIS.
`_briefText` is NEVER module-scope. Both sites are `const _briefText`
inside LOCAL scopes (one inside the MutationObserver callback at
L10547-10553, the other inside an inner function at L32530). The
variable is recomputed from DOM `textContent` each read. There is no
"wipe source" and no way for it to be "cleared between renders" — it
doesn't persist between renders to begin with.

The diagnosis claim "_briefText may be empty…panel goes blank"
misunderstands the code path: the MutationObserver re-reads the DOM
every mutation; if textContent is non-empty (>20) it fires
renderAmbientPanel. There is no clearing mechanism.

──────────────────────────────────────────────────────────────────
PROBE 3 — isStatic condition at L4868
──────────────────────────────────────────────────────────────────

`sed -n '4865,4875p' index.html`

  4866      if (cached && cached.length > 40) {
  4867        rows.push(ok('Journalism', `Brief rendered (${cached.length} chars) · ${used} AI calls used`));
  4868      } else if (briefTxt && !isStatic) {
  4869        rows.push(ok('Journalism', `Brief live (${briefTxt.length} chars) · ${used} AI calls`));
  4870      } else if (isStatic && briefTxt) {
  4871        … 'Static only — compound null …'
  4872      } else {
  4873        … 'No brief text …'
  4874      }

VERDICT — CONTRADICTS DIAGNOSIS.
This is NOT a brief render gate. It is a `rows.push(ok/warn(...))`
diagnostic-status row builder inside a status/health panel. The four
branches classify which status message to show:
  1) cached + length>40   → "Brief rendered (cached)"  [ok]
  2) briefTxt && !isStatic → "Brief live"               [ok]
  3) isStatic && briefTxt  → "Static only — compound null" [warn]
  4) (else)                → "No brief text"            [warn]

Removing `!isStatic` from branch 2 makes branch 3 unreachable: any
case where `isStatic && briefTxt` would now match branch 2 and emit
the green "Brief live" status — destroying the diagnostic that
distinguishes live compound output from static fallback. That is the
opposite of "no effect" — it actively breaks the journalism health
indicator.

The CC-CMD's own guidance covers this:
  "If PROBE 3 reveals isStatic serves another purpose at this gate
   (i.e. it is not solely about the schedule), record and do NOT
   remove it. Flag for next session instead."

→ FLAGGED. Do not remove.

──────────────────────────────────────────────────────────────────
PROBE 4 — _briefEl + MutationObserver at L10546
──────────────────────────────────────────────────────────────────

`sed -n '10543,10555p' index.html`

  10544    (function() {
  10545      const _briefEl = (_DOM?.fieldBrief || document.getElementById('field-brief'));
  10546      if (!_briefEl || typeof MutationObserver === 'undefined') return;
  10547      const _briefObs = new MutationObserver(() => {
  10548        // Only re-render ambient if there's real content (>20 chars avoids flicker)
  10549        const _briefText = _briefEl.textContent?.trim() || '';
  10550        if (_briefText.length > 20 && typeof renderAmbientPanel === 'function') {
  10551          renderAmbientPanel();
  10552        }
  10553      });
  10554      _briefObs.observe(_briefEl, { childList: true, subtree: true, characterData: true });
  10555      })();

VERDICT — CONTRADICTS DIAGNOSIS.
This MutationObserver is a one-way pump: brief content arrives → trigger
ambient render. The >20 threshold prevents flickering on empty/placeholder
mutations. It does NOT clear the brief — it does not write anywhere.

The diagnosis claim "If _briefText is cleared between renders, panel
goes blank" describes a phantom: nothing in this block clears anything.
The brief DOM lives at top-level (PROBE 6) and is not inside any of
scheduleRenderAll's rebuild targets.

──────────────────────────────────────────────────────────────────
PROBE 5 — renderAmbientPanel call sites
──────────────────────────────────────────────────────────────────

`grep -n 'renderAmbientPanel' index.html`

  10551 (MutationObserver — inside)
  10593 setTimeout(()=>initFIELDBrief(filtered).then(()=>renderAmbientPanel())…)
  10598 renderAmbientPanel(); // ambient panel even if brief fails
  10602 setTimeout(renderAmbientPanel, 1200); // after schedule renders
  21472 if(Object.keys(espnScores).length) { … renderAmbientPanel(); }
  27353 _ricOrTimeout(() => { try { renderAmbientPanel(); } catch(_) {} }, 1500);
  28915 setTimeout(renderAmbientPanel, 50);
  28948 setTimeout(renderAmbientPanel, 50);
  32046 renderAmbientPanel();
  32328 function renderAmbientPanel(){

VERDICT — DIAGNOSIS CORRECT ON THIS POINT.
renderAmbientPanel is NEVER inside scheduleRenderAll/renderAll's wipe
zone. It is always called as a follow-on, often via setTimeout. So
this is not the failure mode either.

──────────────────────────────────────────────────────────────────
PROBE 6 — Brief panel DOM position
──────────────────────────────────────────────────────────────────

`grep -n 'id="field-brief"' index.html` → L4492

  4490  <div id="score-ticker-wrap" style="display:none"></div>
  4491  <div id="major-preview-container" style="padding:0 2rem"></div>
  4492  <div id="field-brief" style="display:none" aria-live="polite"></div>
  4493  <!-- Night Owl renders into its own #night-owl slot … -->

`renderAll` writes to `#main` (L10321). `#field-brief` is a TOP-LEVEL
SIBLING of `#main`, not a child. The applyMainHTML helper at L10109
operates exclusively on `#main`.

VERDICT — CONTRADICTS DIAGNOSIS / TASK 2 PRECONDITION.
The brief panel is ALREADY sibling-scope. It is NOT being wiped by
scheduleRenderAll. Task 2 ("hoist brief panel to sibling scope") is
unnecessary — that's already the structure.

──────────────────────────────────────────────────────────────────
PROBE 7 — scheduleFieldDesk debounce template
──────────────────────────────────────────────────────────────────

`sed -n '12445,12450p' index.html`

  12446  let _rfdTimer = null;
  12447  function scheduleFieldDesk(delay) {
  12448    if (_rfdTimer) clearTimeout(_rfdTimer);
  12449    _rfdTimer = setTimeout(() => { _rfdTimer = null; renderFieldDesk(); }, delay || 200);
  12450  }

VERDICT — IDENTICAL PATTERN TO scheduleRenderAll AT L10063.
The "template to mirror" already lives in scheduleRenderAll. They are
the same pattern; only variable names differ (_renderAllPending vs
_rfdTimer; 150ms vs 200ms default). Mirroring it would change nothing.

──────────────────────────────────────────────────────────────────
PROBE 8 — Smoke baseline
──────────────────────────────────────────────────────────────────

`node smoke.js index.html` → 748 passed, 0 failed.

================================================================
RECONCILIATION
================================================================

The CC-CMD's three diagnosed causes were all probed and contradicted:

  1. "scheduleRenderAll has 28 call sites — each call rebuilds DOM"
     → FALSE. Already debounced (150ms, _renderAllPending).

  2. "briefTxt && !isStatic gate suppresses brief injection"
     → FALSE. That line is a STATUS-ROW BUILDER for a diagnostic
       panel. It does not gate brief render. Removing `!isStatic`
       BREAKS the diagnostic (Branch 3 becomes unreachable).

  3. "_briefText may be cleared between renders, panel goes blank"
     → FALSE. _briefText is `const` in two local scopes; it cannot
       persist or be cleared. It is recomputed from DOM textContent
       each MutationObserver fire.

Additionally:
  - Task 2 precondition is false — the brief panel is already sibling
    of #main (PROBE 6).
  - Task 1 template is the same pattern already in place (PROBE 7).

If briefs are genuinely failing to render in production, the cause
lives elsewhere. Candidate areas worth probing in a follow-up CC-CMD:
  • initFIELDBrief failure paths (L10593 — Promise rejected silently?)
  • The KV cache key (fieldBriefCacheKey) returning null when locale/TZ
    differs between fetch site and render site
  • The setTimeout chain at L29065 (3s initJournalismQueue) racing
    against a viewport-change mid-init
  • #field-brief style="display:none" — does anything flip it to block?
    grep '"field-brief"\.style' to verify

================================================================
TASKS — NONE EXECUTED
================================================================

  ✗ Task 1 — scheduleRenderAll debounce: SKIPPED (already debounced).
  ✗ Task 2 — Hoist brief panel: SKIPPED (already sibling — precondition
            false per the CC-CMD's own conditional language).
  ✗ Task 3 — Remove !isStatic: SKIPPED (would break diagnostic panel,
            per CC-CMD's own guidance "do NOT remove it. Flag for
            next session instead").
  ✗ Task 4 — Smoke assertions: NOT ADDED (would assert presence of
            edits that should not be made).
  ✗ Task 5 — SW_VERSION bump: NOT EXECUTED (no code change to deploy;
            bumping without a corresponding edit triggers a no-op
            deploy that wastes the gate cycle).

================================================================
COMMIT / PUSH STATE
================================================================

  HEAD       : a3b0740 (unchanged from session start)
  SW_VERSION : 2026-06-24f (unchanged)
  Smoke      : 748 passed, 0 failed (unchanged)
  Pushed     : NOTHING

This manifest is being written for review BEFORE any commit, so the
next session (or user) can decide whether to:
  (a) update the CC-CMD with corrected diagnosis,
  (b) write a follow-up CC-CMD targeting the real failure path
      (likely in initFIELDBrief or its cache layer), or
  (c) authorize an override of the probe verdict and proceed with
      the original tasks anyway.

Rule 77 (NO-RATIONALIZE-A) was followed: each contradiction was
investigated (read the surrounding code) rather than explained away.
Rule 87 (SELF-COMPLETE-A) is satisfied by stopping cleanly at the
probe block — no carry-forwards introduced; the contradiction is the
outcome.
