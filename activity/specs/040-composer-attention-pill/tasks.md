# 040 — tasks

- [x] T1 spec / plan / research / README 索引 / architecture 一句 — 验证：文件存在
- [x] T2 `attention-agents` 纯函数 + 单测 — 验证：`node --test …attention-agents.test.ts`（163 pass）
- [x] T3 `open-agent` bridge；Agent / Workspace / Global 注册 — 验证：typecheck
- [x] T4 抽取 `useWorkspaceAgentStatuses`；Workspace panel 改用 — 验证：typecheck
- [x] T5 `attention-pill` + `attention-popover` + AgentRow 可选无归档；`index.client` 接入 — 验证：typecheck
- [x] T6 `package.json` test 脚本纳入新单测；CHANGELOG；reload — 验证：tests + typecheck + `paseo plugin ls` running
- [ ] T7 真机：1 / ≥2 / 隐藏条件 / openAgent（待用户；需 Explorer 或 Activity 面板已挂载以注册 bridge）
