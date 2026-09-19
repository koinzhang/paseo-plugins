# 031 — Plan

## 文档

- 新增 `activity/docs/architecture.md`（三层 scope + 分层 + RPC 表 + 边界）
- `specs/README.md` 增加 031 行，并在文首链到 architecture

## Workspace 拆分

```text
client/workspace-panel.tsx          # re-export WorkspaceActivityPanel
client/workspace/
  panel.tsx                         # 编排：queries / KPI / 组合 section
  constants.ts                      # 尺寸、页大小、菜单选项
  filters.ts                        # attentionRank / matches* / formatAgentMeta
  agent-row.tsx
  display-menu.tsx                  # MenuSubTrigger / MenuOptionList
  agents-section.tsx                # 标题、搜索、设置、列表、pager
  rank-section.tsx                  # Skills / MCP
  list-host-agents.ts               # 客户端翻页 agents.list → status map
```

共享翻页：

```text
shared/list-agent-pages.ts          # listAllAgentPages(listPage) 纯循环
```

服务端 `background-sync.ts` / `resyncAgents` 使用同一 helper（传入 `paseo.agents.list`）。

## Agents UI pager

- `AGENT_PAGE_SIZE = 40`
- `AgentsSection` 接收完整 `visibleAgentItems`，内部 slice + 条件渲染控件

## Summary messageCount

- `usageSummaryRpc` output 增 `messageCount`
- `createSummaryHandler`：`summarizeRows` + `selectUserMessages(filter).length`
- `panel.tsx` KPI 加入 Messages
- `workspace/panel.tsx` KPI Messages 用 summary
