# Tasks

- [x] 注册并清理 `/customize` 命令。`npm run typecheck` 验证插件接口类型。
- [x] 按字段更新可用的 Provider / Project；缺失字段保持原选择，两个值都不可用时只打开页面。`client/slash-command.test.ts` 覆盖仅 Provider、仅 Project、未知 Provider 与两者缺失。
- [x] 验证完整 Customize 测试、typecheck，并重载插件。44 项测试和 typecheck 通过；`paseo plugin reload customize` 显示 running，日志显示 Plugin ready。客户端 UI 服务仍不可用，未做手动界面操作验证。
