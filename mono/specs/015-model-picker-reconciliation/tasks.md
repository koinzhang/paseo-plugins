# 015 · Tasks

- [x] 用实际适配器在 Chromium 复现跨实例数量改写循环 — 202 个微任务触发限额。
- [x] 保留宿主数量节点，改为 CSS 显示可见数量并支持清理 — Chromium 验证宿主 text node 身份不变，CSS 显示 3 models。
- [x] 两套适配器按帧合并通知，取消卸载时的待执行帧 — typecheck；浏览器回归验证取消 1 个帧。
- [x] 添加 Chromium 回归测试：跨实例收敛、宿主数量更新、重新显示、卸载清理 — `npm run test:browser`。
- [x] typecheck / test / browser regression — 22 项单元测试通过；双实例微任务数 0，更新收敛。
- [x] draft 模型弹窗实测 — 用户确认「已修复」；发布时重载本地 Mono。
