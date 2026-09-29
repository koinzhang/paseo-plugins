# Tasks

- [x] Store：`workspace_id` 列迁移、`list` 的 workspace 过滤与隐藏、`projects` / `workspaces` 按可见条目聚合、`starAgent` 归属规则，附单测。`npm test` 19 项通过（新增 workspace 作用域、收藏移入、旧库迁移 3 项）。
- [x] RPC：`items.list` / `items.save` / `agents.star` 扩展，新增 `agents.candidates`（server 端排除已在本 workspace Inbox 的 agent）；`items.list` 按活动 workspace 隐藏。typecheck 通过。
- [x] 全局页面 workspace 筛选 chip（仅各 workspace，点选 / 再点取消；按反馈去掉 All workspaces / Global chip；只在 Agents 分组下显示，计数按 kind 过滤，`npm test` 19 项通过），副标题显示 workspace 名，归档后筛选回到 All。typecheck 通过；app 内未手动验证。
- [x] Explorer 面板：workspace 作用域列表、「+ Note」、「+ Agent」候选列表。typecheck 通过；app 内未手动验证。
- [x] 候选列表里点 star 只收藏并留在列表，不打开详情。typecheck 通过，reload 后 running；app 内未手动验证。
- [ ] typecheck、`npm test`、reload 后 `paseo plugin ls` 为 running（已完成，日志 Plugin ready）；app 内手动验收（未做）。
