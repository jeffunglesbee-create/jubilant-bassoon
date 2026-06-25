# CC-CMD-2026-06-24-brief-always-render — Manifest

DATE   : 2026-06-24 ET
PROMPT : docs/CC-CMD-2026-06-24-brief-always-render.md
REPO   : jubilant-bassoon (sole)
SW     : 2026-06-24f → 2026-06-24g
HEAD   : c8f9d3a (feature)

================================================================
PROBES (Rule 68)
================================================================

PROBE 1 — Visible-card reader path
  grep `sessionStorage.getItem(cacheKey` (also explicit
  fieldBriefCacheKey/field_brief_ patterns).
  Hit at L28865 inside `initFIELDBrief`:
    const cacheKey = fieldBriefCacheKey();
    const cached   = sessionStorage.getItem(cacheKey);
  → VISIBLE reader uses fieldBriefCacheKey() — same builder as the
    writer (L28912, L28945). **CASE A**: only the archive sweep at
    L13444 (uses fieldDateKey) diverged. Visible card never affected
    by drift directly, but fixing fieldBriefCacheKey to FIELD_TZ
    also locks the visible reader to FIELD_TZ — net symmetry.

PROBE 2 — L10593 exact text + closure scope
  sed -n '10589,10600p' index.html
  L10593:
    setTimeout(()=>initFIELDBrief(filtered).then(()=>renderAmbientPanel()).catch(e=>{
  Closure scope: `filtered` declared L10366, `visible` declared
  L10365 in the SAME renderAll() scope → `visible` available for
  fallback at L10593.

PROBE 3 — journalismCallsToday key site
  grep `field_j_calls_` → SOLE site at L23593:
    const k='field_j_calls_'+new Date().toISOString().slice(0,10);

PROBE 4 — _compoundRetryAfter
  grep `_compoundRetryAfter\s*=` → declaration L26197 (module scope,
  IIFE rehydrates from localStorage `field_compound_retry_after`).
  Writers: L25970 (compound 429 handler), L4864 (reset button).
  Read by canCall() at L23602 — shared across J3 brief + compound +
  multiple other callers (L25899, L29858, L29956, L36344).

PROBE 4-B — .inc() symmetry in fetchFIELDBriefFromClaude
  grep `budget.inc()` → L28814 inside fetchFIELDBriefFromClaude
  after `_viaRelay && _viaRelay.length > 30`. Counter advanced only
  on successful relay. inc() symmetric — no missing call to add.

PROBE 5 — Smoke baseline
  node smoke.js index.html → 748 passed, 0 failed.

No probe contradicted any task assumption. Proceeded with edits.

================================================================
SECONDARY FINDING (out of scope — flagged only)
================================================================

L28860 inside initFIELDBrief:
  if(activeFilter!=='all'||!sections.length){el.style.display='none';return;}

The J3 brief is hidden entirely when ANY sport filter (e.g. "MLB
only") is active. This is a separate silent-suppression class not
addressed by Task 1's fallback. Worth a future CC-CMD to decide
whether sport-filtered users should see a sport-scoped brief or
the full editorial brief. NOT modified in this session per Rule 69.

================================================================
EDITS
================================================================

EDIT 1 — Task 1: filtered fallback (L10593)
  BEFORE:
    setTimeout(()=>initFIELDBrief(filtered).then(()=>renderAmbientPanel()).catch(e=>{
  AFTER:
    setTimeout(()=>initFIELDBrief(filtered&&filtered.length?filtered:visible).then(()=>renderAmbientPanel()).catch(e=>{

EDIT 2 — Task 2A: archive reader clarifying comment (L13444)
  Reader already uses fieldDateKey (FIELD_TZ-anchored). After fixing
  the writer to also use FIELD_TZ, the two are symmetric. Added a
  one-line comment to lock the invariant in source:
    const key = 'field_brief_' + ds;  // matches fieldBriefCacheKey now that it uses FIELD_TZ

EDIT 3 — Task 2B: fieldBriefCacheKey TZ-invariant (L26439)
  BEFORE:
    function fieldBriefCacheKey(){
      const tz = localTz();
      const d=new Date();const tzStr=(typeof tz==='string'?tz:'America/New_York');
      const ds=d.toLocaleDateString('en-CA',{timeZone:tzStr});return 'field_brief_'+ds;
    }
  AFTER:
    function fieldBriefCacheKey(){
      // TZ-invariant: always FIELD_TZ (America/New_York) so writer and archive reader
      // (which uses fieldDateKey → FIELD_TZ) produce identical keys for non-ET users.
      const d=new Date();
      const ds=d.toLocaleDateString('en-CA',{timeZone:FIELD_TZ});return 'field_brief_'+ds;
    }

EDIT 4 — Task 3: journalismCallsToday ET key (L23593)
  BEFORE:
    const k='field_j_calls_'+new Date().toISOString().slice(0,10);
  AFTER:
    const k='field_j_calls_'+fieldDateKey(new Date());

EDIT 5 — Task 4: fetchFIELDBriefFromClaude compound isolation (L28697-)
  BEFORE:
    async function fetchFIELDBriefFromClaude(sections){
      const budget=journalismCallsToday();
      if(!budget.canCall()) return null;
  AFTER:
    async function fetchFIELDBriefFromClaude(sections){
      const budget=journalismCallsToday();
      // J3 brief is served from relay KV (no Gemini call); compound 429 backoff must not gate it.
      // Hard ceiling only — read the counter directly, bypassing canCall() backoff bleed.
      const _jCount = parseInt(sessionStorage.getItem('field_j_calls_'+fieldDateKey(new Date()))||'0');
      if (_jCount >= 50) return null;

  `budget` binding kept because budget.inc() is called at L28814 after
  successful relay response. Only the GATE was replaced; the counter
  WRITER path remains identical.

EDIT 6 — Task 5: smoke assertions A_BR_1..A_BR_4 (smoke.js)
  Added after A737. All four pass.

  Note on A_BR_4 — initial run failed because my first version of
  the comment included the literal token "_compoundRetryAfter" within
  500 chars of the function name (Rule 77: investigated, not
  rationalized). Reworded comment to use "canCall() backoff bleed"
  instead. Semantic check (no canCall() gate) unaffected by the
  comment change.

EDIT 7 — Task 6: SW_VERSION bump
  index.html L22450: '2026-06-24f' → '2026-06-24g'
  sw.js L14:        '2026-06-24f' → '2026-06-24g'

================================================================
SMOKE
================================================================

Before : 748 passed, 0 failed   (baseline at HEAD 22915ad)
After  : 752 passed, 0 failed   (+4: A_BR_1..A_BR_4; 0 regressions)

================================================================
USER-VISIBLE BEHAVIOUR
================================================================

Before:
  • MyTeams user with no qualifying games today → no FIELD Brief.
  • Non-ET user near midnight in their local TZ → Brief may not
    appear in the archive sweep until the ET day rolls over.
  • Heavy AI usage between ~3-7 PM ET → evening Brief silently
    blocked (UTC counter hits 50 before ET day rolls).
  • Single 429 on the compound path → Brief blocked for the entire
    backoff window even though the Brief itself is served from KV.

After:
  • MyTeams user always sees the full editorial Brief (covers the
    whole slate, not just their teams).
  • All Brief-related date keys (writer, visible reader, archive
    reader, budget counter) are anchored to America/New_York.
  • J3 Brief reads the counter directly, bypassing compound backoff.

================================================================
SCOPE BOUNDARY
================================================================

DO list:
  ✅ filtered fallback at L10593 (Task 1)
  ✅ fieldBriefCacheKey TZ-invariant (Task 2)
  ✅ journalismCallsToday ET key (Task 3)
  ✅ fetchFIELDBriefFromClaude bypass compound bleed (Task 4)
  ✅ A_BR_1..A_BR_4 smoke (Task 5)
  ✅ SW_VERSION bump (Task 6)

DO NOT (all respected):
  ✅ scheduleRenderAll/renderAmbientPanel/_briefText untouched
  ✅ isStatic gate untouched
  ✅ fetchFIELDBriefFromClaude post-budget internals untouched
  ✅ runQualityChain / JQ chain untouched
  ✅ Relay code NOT touched
  ✅ cardBriefCallsToday / card brief paths untouched
  ✅ sw.js cache strategy / isAPI allowlist untouched
  ✅ No new KV endpoints / relay routes

================================================================
COMMITS
================================================================

Commit 1 (feature, triggers deploy gate):
  c8f9d3a "fix: brief always-render — filtered fallback, TZ key,
           UTC->ET budget, compound isolation"

Commit 2 (manifest, [skip ci]):
  (this file)
