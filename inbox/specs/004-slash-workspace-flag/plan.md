# Plan

- `shared/slash-command.ts`：`parseInboxCommand(args) → { workspace, text }`，规则见 spec 表格。
- `index.client.tsx`：`workspace` 为真时给 `agents.star` / `items.save` 传 `workspaceId: workspace.id`。两个 RPC 已支持该字段（002），server 无改动。
- `client/selection.ts`：`notifyItemsChanged` / `onItemsChanged`；`InboxSurface`（全局页面与 Explorer 面板共用）订阅后 invalidate 列表与 agent 候选查询。
