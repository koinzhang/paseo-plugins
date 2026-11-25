# 029 — Plan

1. 保留首轮 i18n 改进和其他会话的已有改动；先更新本规格，记录用户将目标从「收益优先、不强制升级」调整为「实际对齐 0.17.4」。
2. 固定 SDK 0.17.4 与 requirements >=0.17.4，运行 `npm install --ignore-scripts --no-audit --no-fund`；验证 plugin/client/protocol 实际安装版本、lockfile 和 `npm ls`。
3. 对照 migration/hooks、公开导出及实际安装的类型，审查全部 Customize SDK/API 调用。遇到类型错误先记录并追踪真实契约；对 collection refs、query、Provider 版本/安装及文件访问逐项判断是否能等价替代旧 workaround。
4. 仅实现确有收益或契约要求的最小改动；继续保留现有中英文 catalog、设置 revision 冲突处理、七类扫描、安全边界与缓存结构。同步 README/CHANGELOG 和审查依据。
5. 在 SDK 0.17.4 下串行执行 typecheck 和完整测试，检查 tracked/untracked diff；真实界面、语言与选择/缓存留存由主 agent统一验证，本委派不 reload。

验证对应：版本用 node_modules/package-lock 与 npm ls；契约用实际 SDK typecheck；原有行为用完整测试（包含语言、slash command、query/cache、provider、selection、七类扫描和 MCP 脱敏）；改动范围用 git diff 与 untracked 文件清单。

已确认的最小适配：screen 的 Component 使用 `PluginScreenProps`；最后访问 workspace 的项目根查询交给 SDK workspace handle 的 `refresh()`，保留现有查询 key、gcTime、staleTime 和 fallback。该 SDK 方法内部仍分页，不宣称单次 RPC；收益是复用宿主查找行为和移除插件额外的 21 页截断。新增单元测试覆盖有 ID、无 ID、不存在和失败分支。
