# 027 — Command Center「Current Activity」改名 Agent Activity

- 状态：已实现
- 日期：2026-09-19
- 依赖：023（Command Center 项改名 All Activity / Current Activity）

## 1. 目标

| 原 | 新 | 行为 |
|---|---|---|
| Current Activity | **Agent Activity** | 打开当前 agent panel（不变） |

## 2. 非目标

- 不改 item id / 行为 / 图标 / keywords / surface 与 panel 注册
- 不改侧边栏与 workspace panel 标题（仍为 Activity）

## 3. 验收

- [x] `index.client.tsx` agent 项 title 改为 Agent Activity
- [x] `npm run typecheck` 通过
- [x] `paseo plugin reload activity`
