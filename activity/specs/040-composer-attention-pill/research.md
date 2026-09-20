# 040 — research

## 已验证

1. **Host 目录可跨 workspace**；`agents.list` filter 无 `workspaceId`，有 `projectKeys`。Workspace Activity 用 `projectId` + 客户端 `workspaceId` 收窄（038）。本功能保持同一收窄。
2. **`attentionKind`**（`client/workspace/constants.ts`）：error → permission(count) → finished；可直接用于 G2/G3。
3. **`addComposerPill`** 按 `(workspaceId, agentId)` 挂到每个 Composer；过滤「非当前」即排除该 pill 的 `agentId`。
4. **`PluginButtonContentProps` / Icon props 类型不含 `navigation`**（`@getpaseo/plugin` 0.8.0）。`openAgent` 仅出现在 Surface / Panel 的 `PluginNavigableHostProps`。因此 pill 内不能直接读 `props.navigation`；靠面板 / Global 注册的 bridge。
5. **013**：composer `popover` 在 streaming 时可能双层幽灵浮层；插件侧不绕行。

## 决策

| 问题 | 决定 |
|---|---|
| 跨 workspace？ | 否（v1）；见产品讨论 |
| 1 vs ≥2 | ≥2 展开（澄清「超过 2」笔误） |
| error | 展示（CircleAlert + danger；排序在 permission 后、finished 前） |
| openAgent | 仅 bridge（面板 / Global 注册）；无 `openPanel` 回退（误开 Activity）；不改宿主 |
| 与用量 pill | 并存；attention 独立 id `attention` |
| 可见性驱动 | **contribute 层** sync（directory + subscribe + 15s），**不**依赖 icon mount；`visible: false` 会卸掉 icon，若在 icon effect 里 `visible: true` 则永远不执行 |

## 开放 / 真机

- [x] `openPanel("usage", { agentId: other })` 回退已取消（误开 Activity）
- [ ] streaming 下 attention popover 是否触发 013
- [x] 初始 `visible: false` + icon effect 显示 → 已修为 contribute sync
- [ ] 真机：Explorer / Agent Activity / Global 至少其一挂载时 bridge 可用