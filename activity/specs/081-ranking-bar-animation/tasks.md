# Tasks

- [x] Add `AnimatedBar` to `RankingBars`: grows from 0 on mount, animates between widths on metric/data change. Rows keyed by rank so only slots whose percentage changed animate (reordering alone does not; the top bar stays at 100%).
- [x] Ranking Show more / Show less: height + opacity disclosure and rotating chevron.
- [x] Ranking rows added / removed on metric switch open / close with the disclosure motion (`RankSlot`).
- [x] Add `DayBar` to Daily Activity: grows from 0, animates between heights.
- [x] Activity Calendar column sweep on first display and on metric / range / mode switch.
- [x] Hourly Activity area plot grows up from its baseline on first display and on metric / provider change.
- [x] `MetricStepper` label slides in from the pressed arrow's side.
- [x] `CHART_MOTION` token + design-system note; `npm run typecheck` and `npm test` passed (254 tests).
- [x] Reload the local Activity plugin; `paseo plugin ls` reported `running`.
- [ ] Page check: all three animations on open and on metric switch.
