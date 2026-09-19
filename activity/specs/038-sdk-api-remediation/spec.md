# 038 — SDK API 审查修复

日期：2026-09-19。对应 docs/reviews/2026-09-19-sdk-api-usage-review.md。

- 保持 Paseo 0.8.0 兼容，不抢占宿主唯一目录 observation。
- 目录事件仅作加速；状态保留 15s 轮询，pill 分页初始化并定期同步，断开推送后仍能发现 agent / 恢复隐藏 pill。
- Workspace 查询按实际 projectKey 收窄（不得把 projectId 当 projectKey），推送增量更新状态缓存。
- 单 agent 使用 timeline 的真实 turn 事件；workspace 保留明确命名的启发式刷新与 15s 兜底。
- skill 查询刷新空句柄，解析项目路径；失败退回 home roots，保留统计可用性。
- 核查 CLI 默认目标解析，记录 unarchive 环境约束，不使用未经验证的 host 推断。

验收：typecheck、回归测试、reload running；未完成的真机交互明确记录。
