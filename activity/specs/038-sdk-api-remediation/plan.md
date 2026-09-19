# 038 — plan

- Pill 目录同步提取独立模块：完整分页、递归 15s 定时、禁止重叠、卸载取消后续注册、推送/快照竞争重放。
- workspace 通过 useWorkspace 的 projectId 查询 projects.list 得到 projectKey；无映射时回退完整分页。agent_update 直接 setQueryData，不触发全目录请求。
- useAgentTurnEnd 只处理单 agent timeline；workspace 使用单独 useWorkspaceActivityRefresh，明确事件只是刷新提示。
- skillRootsForQuery 改 async，current 为空时 refresh；补项目 SKILL.md 回归。
- 035/037 记录兼容性偏差；审查报告按核查后的结论更新。
