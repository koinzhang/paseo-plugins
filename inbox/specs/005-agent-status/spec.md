# 005 收藏 agent 显示实时状态 + 操作文案

## 目标

1. 收藏的 agent 在列表行与详情里显示 host 上的实时状态（运行中、需要关注等），判定与 Activity Explorer 的 agent 行一致。
2. 已归档的 agent 不显示打开按钮（只保留 Unarchive）。
3. 文案：`Open agent` → `Open`，`Remove from Inbox` → `Remove`。（006 起 Open / Unarchive / Remove 只显示图标，文案留在 accessibilityLabel。）

## 状态（优先级从高到低，取第一个命中）

| 状态 | 条件 | 色调 |
|---|---|---|
| Archived | `archivedAt` 非空 | warning |
| Unavailable | host 上查不到该 agent | danger |
| Error | `status === "error"` 或 `attentionReason === "error"` | danger |
| Needs permission | 有待处理的权限请求 | warning |
| Running | `status` 为 `running` / `initializing` | accent |
| Finished | `requiresAttention` 且 `attentionReason === "finished"`（跑完、未查看） | success |
| Idle / Closed | 其余，按 `status` | muted |

## 样式（对齐 Activity Workspace Explorer 的 agent 行）

- 列表行与详情标题的前置图标即状态：归档 / 不可用用 `BotOff`；否则 `Bot` 按 attention 着色（Error 红 / Needs permission 黄 / Finished 绿 / 其余 muted）；运行中在图标右下角叠加旋转圈。
- 有待处理权限时行尾显示 `ShieldAlert` pill，多于 1 个时带数量。
- 列表行不显示文字状态（写进 accessibilityLabel）；详情的字段列表多一行 `Status` 显示上表文字。

## 非目标

- 实时订阅：沿用 `agents.states` 轮询，间隔从 30s 缩到 10s。
- 在 Inbox 里审批权限、清除 attention。

## 验收

- [ ] 运行中的 agent 显示 Running；跑完未查看显示 Finished；有权限请求显示 Needs permission。
- [ ] 归档 agent 只有 Unarchive，无 Open。
- [ ] 按钮文案为 `Open` / `Remove`。
- [ ] 状态判定有单测。
