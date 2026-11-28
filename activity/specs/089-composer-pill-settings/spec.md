# 089 — Composer pill visibility settings

- 状态：已实现
- 日期：2026-11-28

## 背景

Activity 在 composer 上有两种互相独立的 pill：

1. **Usage pill**：当前 agent 最近使用的 Skill / MCP 摘要；无数据时自动隐藏。
2. **Attention pill**：同 workspace 其他 agent 的 finished / permission / error 提醒；无提醒时自动隐藏。

部分用户希望完全关闭其中一个或两个入口，但目前只能在宿主侧隐藏整个插件，无法只关闭 pill。

## 目标

| ID | 目标 |
|---|---|
| G1 | 在 Paseo **Settings → Plugins → activity** 增加 Activity 设置页 |
| G2 | 提供“隐藏用量 pill”和“隐藏需要关注 pill”两个独立开关 |
| G3 | 设置写入 host-scoped plugin settings，插件 reload / daemon 重启后保持 |
| G4 | 开关变化立即生效：关闭时移除对应 pill 注册，重新打开时恢复 |
| G5 | 默认两个开关均关闭，即保持现有行为（两个 pill 都启用） |

## 非目标

- 不隐藏侧边栏 Activity、Explorer Workspace Activity、Agent Activity 面板或 Command Center 入口。
- 不增加 per-workspace / per-agent 覆盖。
- 不改变 pill 的空数据自动隐藏、查询、排序或点击行为。

## 行为

- 两个开关互相独立：可以只隐藏 usage，只隐藏 attention，或都隐藏。
- 隐藏只影响 composer pill 的注册，不停止 agent 目录监听、attention 状态收集或用量入库。
- 设置加载前保持默认值（两个 pill 启用）；加载到已保存设置后按设置同步。
- 设置页文案跟随 Paseo app 语言（en / zh-CN）。

## 验收

- [x] Settings → Plugins → activity 可见两个开关。
- [x] 打开“隐藏用量 pill”后，当前及新出现的 agent composer 不再显示 usage pill。
- [x] 打开“隐藏需要关注 pill”后，不再显示 attention pill。
- [x] 关闭开关后，对应 pill 在当前已打开 agent 上恢复。
- [x] reload 插件后设置仍生效。
- [x] `npm run typecheck` / `npm test` 通过。
