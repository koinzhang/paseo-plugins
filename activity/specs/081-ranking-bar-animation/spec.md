# 081 — Global chart animation

## Goal

Animate the Global charts (Providers / Projects rankings, Daily Activity, Activity Calendar, Hourly Activity) so first display and value changes are easy to follow.

## Requirements

- **Rankings**: when a bar first appears (initial render, expansion, or the list getting longer), its fill grows from 0 to its target width. Animation follows the **rank slot**, not the entry: on metric change or data refresh, the bar at each position animates only if that position's percentage changed. Reordering alone does not animate, and the top bar, which is always 100%, stays still.
- **Daily Activity**: each day's column grows from 0 on first display; on metric switch or data refresh it animates from its current height to the new height. Empty days keep the 2px baseline.
- **Activity Calendar**: animating ~370 cell colors individually is too costly, so week columns fade in left to right on first display. Switching metric, range, or heatmap mode replays a shorter sweep starting at 30% opacity (the new colors apply immediately). Background data polling does not replay it.
- **Hourly Activity**: the line is built from many rotated views, so it can't be morphed point by point cheaply. The whole area plot (fill + line) grows upward from the baseline via `scaleY` on first display, and again with the shorter duration on metric or provider change. Background data polling does not replay it; the baseline rule and axis stay still.
- Durations come from `CHART_MOTION` in `client/design-tokens.ts` (bars 400 ms, calendar 700 / 450 ms, ease-out). Animation does not change sorting, filtering, highlighting, tooltips, counts, or scaling.

## Acceptance

- Opening Global: ranking bars and Daily Activity columns grow from zero; the calendar sweeps in from the left.
- Switching `‹ Sessions ›` animates ranking bars and daily columns to new sizes and replays a light calendar sweep.
- `npm run typecheck` and `npm test` pass; the local Activity plugin reloads successfully.
