# 030 — Command Center「All Activity」改名 Activity

- 状态：已实现
- 日期：2026-09-19
- 依赖：023（Command Center 项改名 All Activity / Current Activity）、027（agent 项改 Agent Activity）

## 1. 目标

| 原 | 新 | 行为 |
|---|---|---|
| All Activity | **Activity** | 打开全局 surface（不变） |

## 2. 非目标

- 不改 item id / 行为 / 图标 / keywords / surface 注册
- 不改 agent 项（Agent Activity）与 workspace 项（Workspace Activity）
- 不改侧边栏与 workspace panel 标题（仍为 Activity）

## 3. 验收

- [x] `index.client.tsx` global 项 title 改为 Activity
- [x] `npm run typecheck` 通过
- [x] `paseo plugin reload activity`
