# Plan

## 1. 按压反馈（`PRESS`）

`client/design-tokens.ts` 新增：

- `PRESS = { scale: 0.94, opacity: 0.7, textOpacity: 0.6 }`

接线：

- `ui.tsx`：`IconButton` 的 Pressable 改函数式 style（scale + opacity）；`ErrorState` Retry、`TextTabs` 用 `textOpacity`。
- 列表行按压用 `surface2` 背景：`agent-row.tsx`（Agents）、`rank-section.tsx` 两个 timeline 行（新增 `listRowPressed`）、`terminals-section.tsx`（新增 `terminalRowPressed`）、`usage-popover.tsx` skill 行。
- 行内图标动作（归档 / 关闭终端）复用 `PRESS` 的 scale + opacity。
- 纯文本目标用 `textOpacity`：Provider 触发器、排行 Show more、skill 详情返回、Agent panel 返回 / skill 链接。
- `agents-section.tsx` 的搜索 / 显示 / 分页原始 Pressable 改用公共 `IconButton`（自带按压反馈）。

## 2. 原生驱动

`useNativeDriver: true`：

- `workspace/running-indicator.tsx`（rotate）
- `ui.tsx` MetricStepper（opacity + translateX）
- `activity-heatmap.tsx`（列 opacity 扫入）
- `hourly-activity-timeline.tsx`（scaleY + translateY）

保持 `false`（动画布局属性）：`ranking-bars.tsx`（width / height）、`agent-creations.tsx`（height）、`agents-section.tsx`（width / marginLeft）。

## 3. ease-in 修正

- `ranking-bars.tsx` `discloseTiming`：展开 / 收起都用 `Easing.out(Easing.cubic)`；收起用 `CHART_MOTION.discloseClose`（180）。
- `workspace/constants.ts` 新增 `SEARCH_CLOSE_ANIM_MS = 160`；`agents-section.tsx` `closeAgentSearch` 改 ease-out + 该时长。

## 4. 文档

`docs/design-system.md` §5 补按压反馈规则；§6 注明收起 / 关闭快于展开 / 打开。
