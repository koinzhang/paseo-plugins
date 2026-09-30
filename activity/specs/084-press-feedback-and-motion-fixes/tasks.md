# Tasks

- [x] T1 `PRESS` token + `IconButton` / `TextTabs` / `ErrorState` 按压反馈；`npm run typecheck` 通过。
- [x] T2 列表行与文本目标按压反馈：Agents、Timeline、Terminals、popover skill 行、Provider 触发器、Show more、返回 / skill 链接；行内图标动作（归档 / 关闭终端）scale + opacity。
- [x] T3 `agents-section` 搜索 / 显示 / 分页改用 `IconButton`（顺带删除未用的 `Pressable` / `CONTROL` 导入）。
- [x] T4 四处 transform / opacity 动画改 `useNativeDriver: true`：RunningIndicator、MetricStepper、Activity Calendar 扫入、Hourly Activity 增长。
- [x] T5 两处退出动画去 ease-in：`discloseTiming` 收起用 `CHART_MOTION.discloseClose`（180ms）；`closeAgentSearch` 用 `SEARCH_CLOSE_ANIM_MS`（160ms）。
- [x] T6 `docs/design-system.md` §5 补按压反馈、§6 补退出时长；`specs/README.md` 加 084 条目。
- [x] T7 `npm run typecheck` 通过；`npm test` 254 项全部通过；`grep` 确认 `Easing.in(` 零命中，`useNativeDriver: false` 只剩布局动画（ranking-bars ×2、agents-section ×2、agent-creations ×1）。
- [x] T8 `paseo plugin reload activity` 成功，`paseo plugin ls` 确认本 checkout 的 Activity 为 running。
- [ ] T9 页面目测：IconButton / 列表行 / tab 按下有反馈；Show less 收起起步即动；多 agent running 时转圈不掉帧。
