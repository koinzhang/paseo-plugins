# 005 · Tasks

- [x] 定义 `display` 设置文档（`shared/settings.ts`）并测试默认值 — `shared/settings.test.ts`
- [x] `index.server.ts` 注册设置；`package.json` files 加入服务端入口 — reload 后 `running`
- [x] 设置页 `client/settings-screen.tsx`（Layout 两个开关在 Voice buttons 上方） — typecheck
- [x] 语音按钮选择器按设置生成（`shared/composer.ts`）并测试 — `shared/composer.test.ts`
- [x] Thinking transformer 按设置注册 / 移除（`index.client.ts`） — typecheck
- [x] DOM 适配器：侧栏横排受 `compactSidebarNav` 控制；语音按钮独立 `<style>` 重写 — typecheck
- [x] README 说明
- [x] typecheck / test / reload 验证 — 11 项测试通过，`paseo plugin ls` 为 `running`
- [ ] 手动验收：四个开关即时生效、重载后保持
