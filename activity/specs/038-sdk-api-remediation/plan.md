# 038 — plan

- Pill 目录同步提取独立模块：完整分页、递归 15s 定时、禁止重叠、卸载取消后续注册、推送/快照竞争重放。
- workspace 直接使用 useWorkspace 的 projectId 作为 agent placement 过滤值；该 ID 缺失时回退完整分页。agent_update 直接 setQueryData，不触发全目录请求。
- useAgentTurnEnd 只处理单 agent timeline；workspace 使用单独 useWorkspaceActivityRefresh，明确事件只是刷新提示。
- skillRootsForQuery 改 async，current 为空时 refresh；补项目 SKILL.md 回归。
- 035/037 记录兼容性偏差；审查报告按核查后的结论更新。

## 2026-09-19 状态回归修正

实测同一 agent：无过滤可见，projects.list 的 remote: key 过滤为 0 条。daemon session.buildProjectPlacementFromRecords 将 project.projectId 写入 placement.projectKey。之前错误的过滤导致每 15s 清空状态缓存，覆盖推送所得 permission 状态。本次移除 projects.list 映射与等待；使用 workspace.projectId，测试必须以 daemon 的 placement 形状为基准，并进行真实只读查询验证。
