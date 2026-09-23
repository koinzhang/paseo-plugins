# 002 · Tasks

- [x] 定义四个宿主导航项的稳定 test ID，并添加契约测试 — 验证：`npm test`
- [x] 实现 `client/web.ts`：主题检测、DOM 标记、四列样式、MutationObserver 和清理 — 验证：`npm run typecheck`
- [x] 从客户端入口安装 Web 适配器，原生端 no-op — 验证：`Platform.OS !== "web"` 直接返回清理函数
- [x] 更新文档和 npm 包文件清单 — 验证：`README.md`、`package.json`
- [x] 运行 typecheck、测试、插件重载与状态检查 — 验证：4 tests pass，`mono` 为 running
- [ ] 人工视觉验收：Mono / 非 Mono 主题切换和四个按钮交互
