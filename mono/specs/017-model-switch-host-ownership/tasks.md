# 017 · Tasks

- [x] 检查真实 Cursor 配置与弹窗，确认多实例显示/回调错配。
- [x] 当前主机身份校验与按钮接管 — 只读 models.host RPC + Settings host 路由匹配 + owner 标记。
- [x] Chromium 回归验证新旧实例、模型刷新与独立点击 — npm run test:browser 通过；包含旧按钮替换与 aria-checked 覆盖恢复。
- [x] typecheck / 单元测试 / reload running / 实际弹窗验证 — 23 项单元测试通过；本机 Cursor 43 项逐项与当前保存配置核对一致（最终验收为 6 开 37 关）；切换 GPT-5.6 Sol 后仅该项变化，开启与关闭均在本机配置落盘，测试后原可见性恢复（setModelHidden 会把重新关闭项追加到列表末尾）。
