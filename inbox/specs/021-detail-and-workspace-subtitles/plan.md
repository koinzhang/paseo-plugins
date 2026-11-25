# 021 Plan

- 新建 `client/item-subtitle.ts`：接收 item、workspace scope 与现有状态查询中的活动时间，返回副标题分段；没有真实活动时间时明确标注 starred。
- `agentStates` 的每个结果增加可选 `lastActivityAt`，来自公开 `paseo.agents.ref(id).refresh()` 的 `agent.updatedAt` / `lastUserMessageAt`，不修改收藏 item 的 `updatedAt`。
- `ExchangeBlock` 对 Agent 文本使用 SDK `Markdown`，保留 excerpt；Prompt 继续使用原有无边框纯文本。
- 复用现有 `DetailActionGroup` / `RowIconButton`，标题限制一行。
- 列表 item 保持原水平 padding；条目之间另渲染有相同水平 margin 的横线，保持内容缩进一致。
