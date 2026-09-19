# 038 — SDK API 审查修复

日期：2026-09-19。对应 docs/reviews/2026-09-19-sdk-api-usage-review.md。

- 保持 Paseo 0.8.0 兼容，不抢占宿主唯一目录 observation。
- 目录事件仅作加速；状态保留 15s 轮询，pill 分页初始化并定期同步，断开推送后仍能发现 agent / 恢复隐藏 pill。
- Workspace 查询按 agent placement 的 projectKey 收窄（0.8.0 实际为 projectId，不是 projects.list 的仓库 key），推送增量更新状态缓存。
- 单 agent 使用 timeline 的真实 turn 事件；workspace 保留明确命名的启发式刷新与 15s 兜底。
- skill 查询刷新空句柄，解析项目路径；失败退回 home roots，保留统计可用性。
- 核查 CLI 默认目标解析，记录 unarchive 环境约束，不使用未经验证的 host 推断。

验收：typecheck、回归测试、reload running；未完成的真机交互明确记录。

## 2026-09-19 状态回归修正

实测同一 agent：无过滤可见，projects.list 的 remote: key 过滤为 0 条。daemon session.buildProjectPlacementFromRecords 将 project.projectId 写入 placement.projectKey。之前错误的过滤导致每 15s 清空状态缓存，覆盖推送所得 permission 状态。本次移除 projects.list 映射与等待；使用 workspace.projectId，测试必须以 daemon 的 placement 形状为基准，并进行真实只读查询验证。
