# Tasks

- [x] T1 更新 044–046 错误假设与文档
- [x] T2 共享目录 observation、分页、重连、轮询、资源清理
- [x] T3 pill / attention / workspace 接入，去掉错误 Closed/归档推断
- [x] T4 timeline cleanup 与 beta.2 最低版本
- [x] T5 契约/回归测试、typecheck、reload 与运行日志

验证：
- T1：044 spec/plan 与 045/046 历史说明、README/架构/CHANGELOG 更新。
- T2/T3：真实 beta.2 createPaseoApi 契约回归覆盖实例隔离、共享引用计数、分页并发更新、重连覆盖旧请求、卸载 pending bootstrap、订阅失败回退和重建、归档/反归档及 Closed 未归档。
- T4：SDK callable cleanup；最低版本与 SDK 固定 beta.2。
- T5：typecheck 通过；173 tests / 35 suites 全通过；beta.2 daemon 上 reload 后 running，加载日志 Plugin ready 无错误。

页面验收未完成：本地 daemon 网页入口不可用；桌面自动化未取得可靠的 Activity 页面状态；浏览器随后由用户接管，已停止 UI 操作。未对真实会话执行归档/反归档测试。
