// Which window did a scheduled probe run ACTUALLY land in, and can that window
// contain the thing the probe is looking for?
//
// odds-line-probe.yml declares two crons, each with a careful comment reasoning
// about the hour it fires at: 03:45 UTC "= 23:45 ET, when the day's games are
// final and the client's own ET date has not rolled over yet", and 16:10 UTC
// "European league matches ... go final around 15:50".
//
// Measured 2026-09-15 over every scheduled run the workflow has had:
//
//   run 34747944004  03:45 cron  started 09-13 08:32Z  +4h47m
//   run 34775630281  16:10 cron  started 09-13 18:45Z  +2h36m
//   run 34826955734  03:45 cron  started 09-14 09:15Z  +5h30m
//   run 34892026130  16:10 cron  started 09-14 20:17Z  +4h07m
//   run 34949877281  03:45 cron  started 09-15 08:58Z  +5h13m
//
// Neither cron has ever run at the hour its comment reasons about. The 03:45
// slot executes at 04:32-05:15 ET, by which time the ET date HAS rolled over,
// so the final games it was aimed at are on yesterday and "Today" holds a
// scheduled slate. All three of its runs read debriefs 0 — and the manifest
// reported that 0 identically to a 0 from a broken injector.
//
// The cron expression is the copy of the intent. run_started_at is the source.
// Only the copy was ever read.

const CRONS = [
  { label: '03:45Z US window', atUtcMin: 3 * 60 + 45 },
  { label: '16:10Z European window', atUtcMin: 16 * 60 + 10 },
];

// A slate is only guaranteed complete once the ET day's games are final. The
// 03:45 cron's own comment picked 23:45 ET for exactly this reason. Kept as the
// threshold because the reasoning was right; only the assumption that the
// scheduler honours the hour was wrong.
const ET_HOUR_TODAY_COMPLETE = 23;

function etHourOf(date) {
  const h = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', hour: 'numeric', hour12: false,
  }).format(date);
  return Number(h) % 24;
}

// Nearest cron slot at or before `utcMin`, wrapping to the last slot of the
// previous day. Returns the slot and how many minutes late the run started.
function owningCron(utcMin, crons) {
  const sorted = [...crons].sort((a, b) => a.atUtcMin - b.atUtcMin);
  let owner = sorted[sorted.length - 1];
  let delay = utcMin + 1440 - owner.atUtcMin;
  for (const c of sorted) {
    if (c.atUtcMin <= utcMin) { owner = c; delay = utcMin - c.atUtcMin; }
  }
  return { cron: owner.label, delay_minutes: delay };
}

/**
 * @param {string} probedAtISO  the probe's own clock at start (manifest.probed_at)
 * @param {string} trigger      github.event_name
 * @param {number|null} explicitStepBack  STEP_BACK_DAYS if the caller set it, else null
 */
function windowReality(probedAtISO, trigger, explicitStepBack = null, crons = CRONS) {
  const d = new Date(probedAtISO);
  if (Number.isNaN(d.getTime())) throw new Error(`unparseable probed_at: ${probedAtISO}`);

  const scheduled = trigger === 'schedule';
  const etHour = etHourOf(d);
  const todayLikelyComplete = etHour >= ET_HOUR_TODAY_COMPLETE;

  // Scheduled runs cannot choose their hour — measured delay 2h10m to 5h30m —
  // so they must not depend on it. Yesterday is complete at EVERY hour, and a
  // STEP_BACK_DAYS=1 run has already been measured carrying the subject:
  // manifest 20260912T190808Z read 26 cards, 26 debriefs, odds layer in DOM.
  const step_back_days = explicitStepBack !== null ? explicitStepBack
                       : scheduled ? 1 : 0;

  // The slate this run will actually read is complete if it stepped back at
  // all, or if it is reading Today late enough in the ET day.
  const reads_complete_slate = step_back_days > 0 || todayLikelyComplete;

  return {
    ...(scheduled ? owningCron(d.getUTCHours() * 60 + d.getUTCMinutes(), crons)
                  : { cron: null, delay_minutes: null }),
    trigger,
    et_hour: etHour,
    today_likely_complete: todayLikelyComplete,
    step_back_days,
    step_back_source: explicitStepBack !== null ? 'explicit'
                    : scheduled ? 'scheduled-default-1' : 'dispatch-default-0',
    reads_complete_slate,
    // Rule 91: the denominator, stated where the result is read. A debrief
    // census of 0 on a slate that cannot contain a debrief is not a finding.
    zero_debriefs_is_evidence: reads_complete_slate,
  };
}

module.exports = { windowReality, owningCron, etHourOf, CRONS, ET_HOUR_TODAY_COMPLETE };
