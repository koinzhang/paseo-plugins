# Tasks

- [x] 去掉按 Provider 记忆的分类，切换时沿用当前分类，不可见时改为第一项。`client/surface.tsx` 在 Provider 变化时调用 `resolveCategory`；Project 变化不改分类。
- [x] 补充可见性测试：下一 Provider 仍提供该分类时保持，否则选第一项。`client/category-visibility.test.ts`。
- [x] 运行 Customize 测试、typecheck，并重载插件。45 项测试和 typecheck 通过；`paseo plugin reload customize` 为 running。分类栏在 Paseo 界面里的点击切换未做手动验证。
