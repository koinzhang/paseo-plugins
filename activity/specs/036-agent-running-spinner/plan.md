# 036 — plan

## 方案

纯展示改动，数据沿用 033/034 的 `agents.list` 状态查询。

- `client/workspace/constants.ts`：新增 `isAgentRunning(info)` 判定（`status === "running"`）
- `client/workspace/running-indicator.tsx`：新增 `RunningIndicator` 组件（Animated 旋转圆环）
- `client/workspace/agents-section.tsx`：`renderAgentRow` 计算并传入 `running`
- `client/workspace/agent-row.tsx`：图标包一层 `agentIconWrap`，`running && !archived` 时渲染 `runningBadge` + `RunningIndicator`；行 label 追加 `running`
- `client/workspace/panel.tsx`：新增 `agentIconWrap` / `runningBadge` 样式

## 文件

| 文件 | 改动 |
|---|---|
| `client/workspace/constants.ts` | `isAgentRunning` 判定 |
| `client/workspace/running-indicator.tsx` | 新增旋转圆环组件 |
| `client/workspace/agents-section.tsx` | 传入 running |
| `client/workspace/agent-row.tsx` | 指示器渲染 + a11y |
| `client/workspace/panel.tsx` | 图标容器 / 指示器样式 |
| `specs/README.md` / `CHANGELOG.md` | 登记 |

## 依赖边界

- 不新增查询 / RPC；复用 `["activity","workspace-agent-status",workspaceId]`（host 推送 + 15s 轮询兜底）
- 颜色只用 `theme.colors`（border / accent / surface0），跨平台无特殊处理
