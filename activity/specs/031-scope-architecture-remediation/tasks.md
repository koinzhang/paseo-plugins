# 031 — Tasks

- [x] T1 Spec / plan / architecture.md / README 索引 — 验证：文件存在
- [x] T2 `shared/list-agent-pages.ts` + 单测；server sync / resync 接线 — 验证：`npm test` list-agent-pages + background-sync / messages
- [x] T3 拆分 `client/workspace/*`；`workspace-panel.tsx` re-export — 验证：typecheck
- [x] T4 Agents UI 分页（仅多页显示控件）— 验证：AGENT_PAGE_SIZE 单测；pageCount≤1 无 pager
- [x] T5 `usage.summary.messageCount` + Agent / Workspace KPI — 验证：typecheck；summary schema
- [x] T6 `npm test` / `npm run typecheck` / `paseo plugin reload activity` — 验证：143 tests pass；reload running
