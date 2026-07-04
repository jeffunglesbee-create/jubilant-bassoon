# SUPERSEDED — do not execute

This CC-CMD (circadian client phase, v1) used clock-hour-based phase
detection and depended on a relay endpoint that should not be built (see
the paired relay CC-CMD's retraction). Both choices contradict the
authoritative "Circadian System Spec Revised" (June 20-21 2026, Drive
1KkpQtzHIM-sKHsWTON-VohAbTkEsnNeCShXsfSPiQiA), which is schedule-state-
driven and per-game, not clock-driven and not KV-driven.

Additionally, this version would have shipped a real, silent bug: it never
verified the actual `game.state` vocabulary in production. The real
vocabulary is inconsistent across adapters — NHL/NBA/WC26 use 'final' for
finished games, while MLB/NFL/CFB use 'post'. A circadian function checking
only one string would silently fail to ever show NIGHT/LATE state for
whichever sports use the other string.

Superseded by: docs/CC-CMD-2026-07-04-circadian-client-phase-v2.md
(same repo). Do not execute this file. Retained for history only.
