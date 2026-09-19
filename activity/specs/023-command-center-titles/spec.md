# 023 — Command Center Activity 项改名

- 状态：已实现
- 日期：2026-09-19
- 依赖：001（Command Center 入口）、022（移除 export 入口）

## 1. 目标

| 原 | 新 | 行为 |
|---|---|---|
| Open Activity (all providers) | **All Activity** | 打开全局 surface |
| Activity | **Current Activity** | 打开当前 agent panel |

## 2. 非目标

- 不改 item id / 行为 / 图标 / surface 与 panel 注册
- 不改侧边栏与 workspace panel 标题（仍为 Activity）

## 3. 验收

- [x] `index.client.tsx` 两个 Command Center item title 更新；agent 项 keywords 增加 current / agent
- [x] `npm run typecheck` 通过
- [x] `paseo plugin reload activity`
