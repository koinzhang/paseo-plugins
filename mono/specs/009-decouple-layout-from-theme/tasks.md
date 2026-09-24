# 009 · Tasks

- [x] 设置新增 `minimalChrome`（默认开启）并更新测试 — `shared/settings.test.ts`
- [x] 设置页 Layout 分组加入 Hide dividers and borders 开关 — typecheck
- [x] `client/web.ts`：去掉主题总闸，按 `compactSidebarNav` / `minimalChrome` 分别设置 `data-mono-nav-active` / `data-mono-chrome`；`data-mono-theme` 仅用于调色板颜色 — typecheck
- [x] 语音按钮 CSS 去掉主题前缀 — typecheck
- [x] typecheck / test / reload 验证 — 19 项测试通过，`paseo plugin ls` 为 `running`
- [ ] 手动验收：非 Mono 主题下各开关生效；关闭 Hide dividers and borders 后恢复宿主样式
