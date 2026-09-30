# 004 `/inbox -w`：记到当前 workspace

> 已被 [012](../012-tag-scoped-workspace-inbox/spec.md) 取代：`-w` 已移除。

## 目标

`/inbox` 默认仍写入全局 Inbox；加 `-w` / `--workspace` 时写入当前 workspace 的 Inbox（Explorer 面板），与 002 的 workspace 归属一致。

| 输入 | 结果 |
|---|---|
| `/inbox` | 收藏当前 agent 到全局 Inbox（已收藏则保持原归属，同 002 决策 2） |
| `/inbox <text>` | 全局 scratch |
| `/inbox -w` / `/inbox --workspace` | 收藏当前 agent 到当前 workspace；已在全局或其他 workspace 的收藏移入当前 workspace |
| `/inbox -w <text>` | 当前 workspace 的 scratch |
| `/inbox -- <text>` / `/inbox -w -- <text>` | `--` 结束选项，`<text>` 可以以 `-w` 开头 |

## 已定决策

1. 只有**第一个词**是 `-w` / `--workspace` 时才是选项；其他以 `-` 开头的内容（如 `-wip`、`-x`）原样作为 scratch 文本，不报错，避免吞掉用户记录。
2. 写入后通知已挂载的 Inbox 列表（全局页面与 Explorer 面板）刷新，不打开 Inbox 页面。

## 非目标

- 其他 flag、把 workspace 条目移回全局。

## 验收

- [ ] `/inbox -w` 后当前 workspace 的 Explorer Inbox 面板出现该 agent；`/inbox -w text` 出现 scratch。
- [ ] 不带 `-w` 行为不变。
- [ ] 解析规则有单测。
