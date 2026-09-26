# Tasks

- [x] 查证 timeline 分页、`user_message` 与公开 `agent.send()` 契约；见 `research.md`。
- [x] 实现 `/resend` direct command、可选参数换行拼接与 timeline 向前分页；`npm run typecheck` 通过。
- [x] 增加 prompt 选择与换行拼接单测并更新 Commands 设置说明；`npm test` 38 项通过。
- [x] 更新 README / changelog；`paseo plugin reload commands` 后 `paseo plugin ls` 为 running，日志为 Plugin ready。
- [ ] 桌面 app 手动验证 autocomplete 与真实重发。
