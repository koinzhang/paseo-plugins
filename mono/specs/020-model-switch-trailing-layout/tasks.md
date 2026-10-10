# 020 · Tasks

- [x] 固定开关位置、为文字和删除按钮预留空间。验证：CSS 仅匹配包含 Mono 开关的 Provider 行；删除按钮 `flex-shrink: 0`，开关区域预留 62px。
- [x] 执行 typecheck、单元测试及已有浏览器回归。验证：`npm run typecheck`、`npm test`（24/24）、`npm run test:browser`（主机隔离、点击、重排、卸载恢复）全部通过。
- [x] 重载 Mono 并检查实际 Provider 弹窗。验证：`paseo plugin reload mono` / `paseo plugin ls` 为 running；Paseo 桌面 Claude 列表 7 行开关完整可见且右侧对齐，长名称与 ID 单行省略。

验证边界：尚未单独查看 Custom 删除按钮或调整窗口宽度；以上实际页面检查针对用户截图中的 Claude Discovered 列表。
