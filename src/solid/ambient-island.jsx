// Ambient panel Solid island — CC-CMD-2026-07-20-solid-2-rewrite.
// Six real, separate section components fed by a createStore + reconcile()
// tree (not a plain signal replaced wholesale) so unchanged sections/rows
// keep their DOM nodes across polls — genuine fine-grained updates, not
// just a coarser version of the old whole-panel innerHTML replacement.
// Markup below mirrors the real otwHTML/scoresHTML/soonHTML/upcomingHTML/
// ctxHTML/editorialHTML/arbHTML templates in renderAmbientPanel()
// (src/legacy/field.js) exactly — same classes, same structure.
import { createSignal, Show, For } from 'solid-js';
import { render } from 'solid-js/web';
import { createStore, reconcile } from 'solid-js/store';

function OtwCard(props) {
  return (
    <Show when={props.data}>
      <Show
        when={props.data.mode === 'fire'}
        fallback={
          <div class="ap-soon">
            <span class="ap-otw-header">One to Watch</span>
            <span class="ap-soon-label">Up Next · {props.data.countdown}</span>
            <span class="ap-soon-game">{props.data.away} {props.data.neutral ? 'vs' : '@'} {props.data.home}</span>
            <Show when={props.data.net}><span class="ap-soon-meta">{props.data.net}</span></Show>
          </div>
        }
      >
        <div class="ap-otw-fire">
          <span class="ap-otw-header">One to Watch</span>
          <span class="ap-fire-badge">🔴 FIRE — {props.data.tierLabel}{props.data.ctxSuffix}</span>
          <span class="ap-fire-game">{props.data.away} {props.data.neutral ? 'vs' : '@'} {props.data.home}</span>
          <div class="ap-fire-row3">
            <span class="ap-fire-score">{props.data.scoreStr}</span>
            <Show when={props.data.periodLbl || props.data.clockStr}>
              <span class="ap-fire-clock">{props.data.periodLbl}{props.data.clockStr}</span>
            </Show>
          </div>
        </div>
      </Show>
    </Show>
  );
}

function ScoresList(props) {
  return (
    <div class="ap-scores">
      <div class="ap-section-label">Live</div>
      <For each={props.games}>
        {(s) => (
          <div class="ap-score-row">
            <span class="ap-score-teams">{s.leftName}<strong class="ap-score-num">{s.leftScore}–{s.rightScore}</strong>{s.rightName}</span>
            <Show when={s.timeStr}><span class="ap-score-clock">{s.timeStr}</span></Show>
          </div>
        )}
      </For>
    </div>
  );
}

function SoonList(props) {
  return (
    <div class="ap-scores">
      <div class="ap-section-label">Soon</div>
      <For each={props.games}>
        {(g) => (
          <div class="ap-score-row">
            <span class="ap-score-teams">{g.away} {g.neutral ? 'vs' : '@'} {g.home}<Show when={g.net}> · <span style="opacity:.6">{g.net}</span></Show></span>
            <span class="ap-score-clock">{g.countdown}</span>
          </div>
        )}
      </For>
    </div>
  );
}

function UpcomingList(props) {
  return (
    <div class="ap-scores">
      <div class="ap-section-label">Upcoming</div>
      <For each={props.data.rows}>
        {(g) => (
          <div class="ap-score-row">
            <span class="ap-score-teams">{g.away} {g.neutral ? 'vs' : '@'} {g.home}</span>
            <span class="ap-score-clock">{g.time}</span>
          </div>
        )}
      </For>
      <Show when={props.data.moreCount}>
        <div class="ap-score-row"><span class="ap-score-teams" style="opacity:.45;font-size:.62rem">+{props.data.moreCount} more</span></div>
      </Show>
    </div>
  );
}

// Real, existing inline onclick scroll-to-filter handler (previously an
// anonymous IIFE built inline into ctxHTML's template string) — no named
// function to reuse existed in field.js, so it was extracted verbatim as
// _apScrollToFilter and passed in here as a stable reference at mount time.
function ContextPill(props) {
  return (
    <div class="ap-season">
      <div class="ap-ctx-label">Season Context</div>
      <span class="ap-ctx-pill" title={`Filter to ${props.data.label}`} onClick={() => props.onScrollToFilter(props.data.relevantLeagues)} style="cursor:pointer">
        {props.data.label}
      </span>
    </div>
  );
}

// Real local toggle state (createSignal) replaces the DOM-level
// data-full/data-trunc-len/_deskCardToggle(this) hack the ambient panel's
// own editorial card used previously. _deskCardToggle itself is untouched
// and still serves its other real callers (Finals Desk cards, Desk grid
// briefs) — this component just no longer uses it for the ambient panel.
function EditorialCard(props) {
  const [expanded, setExpanded] = createSignal(false);
  const isOwl = () => props.data.mode === 'owl';
  const canToggle = () => !!props.data.canToggle;
  const bodyText = () => (expanded() ? props.data.fullText : props.data.truncatedText) + (!expanded() && props.data.isTruncated ? '…' : '');
  return (
    <div
      class={isOwl() ? `ap-card ap-card-owl${canToggle() ? ' ap-card-expandable' : ''}` : 'ap-card ap-card-brief'}
      onClick={() => { if (canToggle()) setExpanded(v => !v); }}
      style={canToggle() ? 'cursor:pointer' : undefined}
      title={isOwl() && canToggle() ? 'Tap to expand' : ''}
    >
      <div class="ap-card-header">
        <Show when={isOwl()}><span class="ap-card-icon">{props.data.icon}</span></Show>
        <span class="ap-card-label">{isOwl() ? props.data.label : 'FIELD Brief'}</span>
        <Show when={!isOwl() && props.data.date}><span class="ap-card-date">{props.data.date}</span></Show>
        <Show when={isOwl() && canToggle()}>
          <span class="ap-card-expand-hint" style="margin-left:auto;font-size:.55rem;color:var(--muted);font-family:var(--ff-mono)">+ expand</span>
        </Show>
      </div>
      <Show when={isOwl() && props.data.game}>
        <div class="ap-card-game">{props.data.game}<Show when={props.data.score}> <span style="opacity:.65;font-size:.7em">{props.data.score}</span></Show></div>
      </Show>
      <Show when={props.data.truncatedText}>
        <p class="ap-card-text">{bodyText()}</p>
      </Show>
    </div>
  );
}

function ArbCard(props) {
  return (
    <div class="ap-card ap-card-arb">
      <div class="ap-card-header">
        <span class="ap-card-icon">📡</span>
        <span class="ap-card-label">Watch Free</span>
      </div>
      <div class="ap-card-arb-rows">
        <Show when={props.data.freeCount > 0}>
          <div class="ap-arb-row">🎯 <strong>{props.data.freeCount} free tonight</strong> · {props.data.svcs.join(' · ')}</div>
        </Show>
        <Show when={props.data.bestAdd}>
          <div class="ap-arb-row">💡 Add <strong>{props.data.bestAdd?.name}</strong> · {props.data.bestAdd?.cost}/mo → +{props.data.bestAdd?.gameCount} games</div>
        </Show>
      </div>
    </div>
  );
}

// Section order matches the real, current _apHTML concatenation order in
// renderAmbientPanel() exactly: otw, scores(Live), soon, upcoming, ctx,
// arb, editorial(owl/brief) last. Each section independently prepends its
// own divider when present, same as the original per-section `${x?div+x:''}`
// pattern (including the original's own leading-divider quirk when otw is
// empty but a later section has content — not a regression introduced here).
function AmbientPanel(props) {
  return (
    <div class="ambient-scroll-inner">
      <OtwCard data={props.state.otw} />
      <Show when={props.state.scores?.length}><div class="ap-divider" /><ScoresList games={props.state.scores} /></Show>
      <Show when={props.state.soon?.length}><div class="ap-divider" /><SoonList games={props.state.soon} /></Show>
      <Show when={props.state.upcoming}><div class="ap-divider" /><UpcomingList data={props.state.upcoming} /></Show>
      <Show when={props.state.ctx}><div class="ap-divider" /><ContextPill data={props.state.ctx} onScrollToFilter={props.onScrollToFilter} /></Show>
      <Show when={props.state.arb}><div class="ap-divider" /><ArbCard data={props.state.arb} /></Show>
      <Show when={props.state.editorial}><div class="ap-divider" /><EditorialCard data={props.state.editorial} /></Show>
    </div>
  );
}

// key:'gid' — scores/soon/upcoming.rows rows are all keyed by 'gid' (see
// renderAmbientPanel's data-building); reconcile's default key is 'id',
// which none of these rows have, so it must be set explicitly or array
// diffing silently falls back to whole-array replacement every poll.
const [state, setState] = createStore({ otw: null, scores: [], soon: [], upcoming: null, ctx: null, editorial: null, arb: null });

export function mountAmbientIsland(panelEl, onScrollToFilter) {
  render(() => <AmbientPanel state={state} onScrollToFilter={onScrollToFilter} />, panelEl);
}

export function updateAmbientData(newState) {
  setState(reconcile(newState, { key: 'gid' }));
}
