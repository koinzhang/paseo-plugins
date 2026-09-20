# 053 — KPI 值不带占比 · 直方图堆叠块去圆角

- 状态：已实现
- 日期：2026-09-20
- 依赖：050（KPI 6 格与 Top provider / Top model 口径）、051（provider 堆叠直方图）

## 1. 背景

050 给 Top provider / Top model 的值带上了占比（`Cursor · 61%`、`Auto Smart · 64%`）。两点不合适：

1. 占比不是这两个格子要回答的问题（用户看的是「哪个 provider / 哪个 model」），却把值撑长——在 130px 的格子里 `Auto Smart · 64%` 得压到 12.4px 才放得下（052），同一行字号参差。
2. provider 过滤时 050 已经不显示占比（份额恒 100%），于是「过滤态」和「全部态」的值形状不一致。

051 的堆叠柱给每个 provider 段都加了 3px 圆角，段与段的接缝因此出现内凹缺口，看起来像一根根分离的胶囊而不是一根柱。

## 2. 目标

| ID | 目标 |
|---|---|
| G1 | KPI `Top provider` / `Top model` 的值只显示名称（`Cursor`、`Gpt 5.4`），全部态与过滤态形状一致 |
| G2 | 排名仍按原口径（provider = 消息加权；model = model 消息数），只是不再输出占比 |
| G3 | 直方图堆叠柱：**仅最上方一段**带 3px 上圆角，其余段与接缝为直角 |
| G4 | 当日 0 创建的空槽同样不带圆角（直角 2px 底线） |

## 3. 非目标

- 不删占比数据本身：`ProviderUsageItem.messageCount` / `models[].count` 仍照常返回，占比只是不再进 KPI 文案
- 不改 Insights 的 `Coding vs chat`（`N% coding` 保留——那里的占比是结论本身）
- 不改柱高、堆叠顺序、配色与浮层内容（051）
- 不改其它列表（Most used skills / MCP / models）

## 4. 行为

- `topProviderValue`：全部态取消息加权第一的 `label`；过滤态取该 provider 的 `label`；无样本 `—`
- `topModelValue`：在（全部或所选 provider 的）model 计数里取第一，`formatDisplayName` 后输出；无样本 `—`
- 直方图每根柱的段：`index === 0`（DOM 顺序第一 = 最上方）→ `borderTopLeftRadius/borderTopRightRadius: 3`，其余段与底边 0；空槽无圆角

## 5. 契约

| 名称 | 位置 |
|---|---|
| `topProviderValue(providers, providerFilter)` | `shared/insights.ts`（内部） |
| `topModelValue(providers, providerFilter)` | `shared/insights.ts`（内部） |
| 段圆角规则 | `client/agent-creations.tsx` |

## 6. 验收

- 单测：`shared/insights.test.ts` → `rows[3] === "Codex"`、`rows[4] === "Gpt 5.4"`（全部态与过滤态都无 `%`）；`npm test` 200 通过
- 浏览器实测（react-native-web 渲染真实组件，KPI 由真实 `buildActivityKpi` 生成）：784px / 6 格下 `Cursor`、`Auto Smart` 均 18px 单行，无占比；仅 `14.2 days · active` 缩到 12.4px
- 段圆角：DOM 计算样式 —— 每根柱首段 `borderTopLeftRadius/Right = 3px`、其余段与所有底角 `0px`
- `npm run typecheck` 通过；`paseo plugin reload activity-dev` running
