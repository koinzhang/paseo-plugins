# 067 — Tasks

- [x] T1 `client/header-button.ts`：跟随 workspace 目录订阅，每个 workspace 注册 icon-only header 按钮，点击 `openPanel("workspace-activity", { location: "explorer" })`；语言变化 `update({ title })` — 验证：typecheck
- [x] T2 `index.client.tsx` 接入并在 cleanup 中停止 — 验证：`npm test` 238 pass；`paseo plugin reload activity` 后 running，日志无错误
- [x] T3 面板挂载时隐藏按钮：`client/panel-visibility.ts` 的挂载实例登记 + header `update({ visible })`；切 tab / 收起 Explorer 时保持隐藏 — 验证：`panel-visibility.test.ts`；typecheck；`npm test` 239 pass
- [ ] T4 页面验收（spec §4）：按钮出现、点击打开面板后隐藏、切 tab / 收起 Explorer 时仍隐藏、关闭面板后重现、新建 / 归档 workspace、切换语言、reload 无重复 — 待真机
