# 006 · Tasks

- [x] 定义 `models` 设置文档（`shared/settings.ts`）并测试默认值 — `shared/settings.test.ts`
- [x] 纯函数：隐藏列表增删、composer CSS、标题 → provider id（`shared/models.ts`）并测试 — `shared/models.test.ts`
- [x] `index.server.ts` 注册设置 — reload 后 `running`
- [x] `client/model-visibility-store.ts`：读取、乐观切换、带 revision 写入、provider snapshot — typecheck
- [x] DOM 适配器 `client/model-visibility-web.ts`：Provider 弹窗注入开关、composer 隐藏 CSS、停用清理 — typecheck
- [x] README 说明
- [x] typecheck / test / reload 验证 — 17 项测试通过，`paseo plugin ls` 为 `running`
- [ ] 手动验收：开关即时生效、重载后保持
