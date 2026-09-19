# 031 — 三层架构文档 + Workspace 拆分 / agents 翻页 / Agent Messages KPI

- 状态：已实现
- 日期：2026-09-19
- 依赖：006、024、025、027、030

## 1. 背景

功能面已明确为 **Global / Workspace / Agent** 三层，但缺少架构文档；Workspace 面板单文件过大；`agents.list` 单页 limit=200 会导致状态 enrichment 不全；Agent 面板 KPI 仍缺 Messages（006 当时 NG4，现产品需要补上）。Workspace **不**恢复时间窗口（维持 027）。

## 2. 目标

| ID | 目标 |
|---|---|
| G1 | 架构文档落地：`activity/docs/architecture.md`；`specs/README.md` 链到文档与本 spec |
| G2 | 拆分 `workspace-panel.tsx` 为 `client/workspace/` 模块（编排薄文件 + row / menu / list / filters / host list） |
| G3 | Host `agents.list` **翻页取全**（cursor / hasMore）；服务端 background-sync / resync 同样翻页 |
| G4 | Workspace Agents **列表 UI 分页**；仅当总页数 > 1 时显示页码 / 换页控件 |
| G5 | Agent panel KPI 增加 **Messages**；`usage.summary` 输出 `messageCount` |
| G6 | Workspace **不**恢复时间范围 chips（查询仍固定全部时间） |

## 3. 非目标

| ID | 非目标 |
|---|---|
| NG1 | 恢复 Workspace 时间窗 / 热力图 / Models |
| NG2 | 给 `usage.list` / `usage.export` 补 workspaceId（另案） |
| NG3 | 改 Global surface / pill 主语义 |
| NG4 | 为 Agents 列表做无限滚动（本版页码分页即可） |

## 4. 口径

### 4.1 Host agents.list

- `page.limit` 默认 200；循环 `pageInfo.nextCursor` 直至 `!hasMore`
- Workspace 状态 map：`includeArchived: true`，并按 `workspaceId` 客户端过滤
- Sync 路径：保持原 filter（可不带 includeArchived），但必须翻页

### 4.2 Agents UI 分页

- 对筛选 / 排序 / 搜索后的 `visibleAgentItems` 分页；再对当前页做 group
- 页大小：40
- 筛选、搜索、排序、分组、workspace 切换时重置到第 1 页
- `pageCount <= 1`：**不渲染**页码与上一页 / 下一页

### 4.3 Messages KPI

- `usage.summary.messageCount` = `selectUserMessages` 同 filter 行数
- Agent panel KPI 增加 Messages（与 Shell / File 等并列）
- Workspace KPI Messages 改读 `summary.messageCount`（与本地库一致，不再对 agents 行求和）

## 5. 验收

- [x] `docs/architecture.md` 描述三层 scope、RPC、采集；README 已索引
- [x] `client/workspace-panel.tsx` 为薄导出；逻辑在 `client/workspace/`
- [x] 单测覆盖 list-all 翻页 helper；UI 仅多页时显示 pager
- [x] Agent panel 显示 Messages；summary 契约含 `messageCount`
- [x] Workspace 无时间 chips
- [x] `npm test` / `npm run typecheck` / `paseo plugin reload activity`
