# Tasks

- [x] `RankList` renders every item in a `ScrollView` whose `maxHeight` is `visibleRows` measured rows plus gaps (`visibleRows = insights.length`); scrollbar hidden; `key` by list kind resets scroll. Dropped the local `LIST_LIMIT` alias. `npm run typecheck` and `npm test` passed (254 tests).
- [x] Reload the local Activity plugin; `paseo plugin ls` reported `running`.
- [ ] Page check: scrolls past 8 rows with no visible scrollbar.
