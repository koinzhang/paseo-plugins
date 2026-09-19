# 038 — tasks

- [x] T1 核对本地 SDK / daemon / CLI 和官方文档，先写 spec / plan。
- [x] T2 修复 A–E 并核查 F。验证：SDK/CLI 源码核查、相关回归测试。
- [x] T3 回归测试、typecheck、reload 与日志检查。验证：152 tests pass、typecheck pass、running / Plugin ready。
- [x] T4 更新原审查报告及 009/035/037 偏差。验证：逐节记录实际处置和兼容性边界。
- [ ] T5 真机交互验收（未执行）：timeline 完成/失败/取消、permission/attention、远端环境矩阵。

- [x] T6 修复项目过滤回归。验证：daemon 源码 placement.projectKey=projectId；真实 loader 返回目标 agent permissionCount=1 / rank=0 / attentionKind=permission；152 tests pass、typecheck pass、reload running。未声称完成真机 UI 目视验收。

- [x] T7 修复旧轮询覆盖实时推送。验证：真实 QueryClient 晚返回竞态、首屏分页事件重放、失败释放监听。
- [x] T8 修复更新时间语义。验证：保留 snapshot updatedAt、缺失回退、历史首末时间及 live 时间优先。
- [x] T9 修复空 pill 周期显示，保留隐藏补查。验证：快照去重、新活动/重新添加、延迟 ingest、合并并发与卸载晚返回。
- [x] T10 本轮 typecheck / 全量测试 / reload。验证：161 tests pass、activity running / Plugin ready；用户所报 agent 的 loader 输出与 daemon 当前快照一致。
