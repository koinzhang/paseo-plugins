# 036 — Agents 行 running loading 指示

- 状态：已实现
- 日期：2026-09-19
- 依赖：024 / 031（Workspace panel）、033 / 034（agent 状态展示）

## 1. 背景

host `agents.list` 的 `status` 已包含 `running`（会话正在执行回合），但 Explorer Agents 行没有运行中视觉；用户无法从列表看出哪些 agent 正在工作。Paseo 宿主在 agent 图标右下角用环形 loading 表示运行中。

## 2. 目标

| ID | 目标 |
|---|---|
| G1 | host `status === "running"` 的 agent：机器人图标右下角显示环形 loading（accent 色弧 + border 色轨道，持续旋转） |
| G2 | 指示器样式对齐宿主：小圆环、带 surface0 底色与图标分隔，位于图标右下角 |
| G3 | 状态由 host 推送（`agent_update`）驱动，运行结束/开始时指示器自动出现/消失，15s 轮询兜底 |
| G4 | 归档行不显示指示器；行 a11y label 追加 `running` |

## 3. 非目标

| ID | 非目标 |
|---|---|
| NG1 | `initializing` 显示 loading（仅 running；initializing 单列另案） |
| NG2 | 进度百分比 / 耗时展示 |
| NG3 | 图标本体的 attention 配色逻辑调整（保持 034） |

## 4. 口径

- 数据：沿用 `AgentStatusInfo.status`（`paseo.agents.list`，无需新 RPC）
- 判定：`status === "running"` 且 `archivedAt == null`
- 视觉：10px 圆环，`borderWidth 2`，轨道 `theme.colors.border`，弧 `theme.colors.accent`，800ms/圈线性旋转；外层 13px 圆形底 `theme.colors.surface0`
- 动画：RN `Animated.loop`（`useNativeDriver: false`，兼容 web/native）

## 5. 验收

- [ ] 运行中 agent 图标右下角出现旋转 loading（待真机目视确认）
- [ ] 回合结束后指示器消失（host 推送 / 15s 内，待真机目视确认）
- [x] `npm run typecheck` / `paseo plugin reload activity` → running
