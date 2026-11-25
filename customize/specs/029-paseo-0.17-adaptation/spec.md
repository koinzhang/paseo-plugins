# 029 — Paseo 0.17 审查与宿主语言适配

## 目标

实际对齐 Paseo / 插件 SDK 0.17.4，安装对应 SDK 与 client/protocol peers，并以实际类型检查和完整测试验证。保留公开宿主语言适配，让页面与命令文案在 Web 和原生端跟随 Paseo 当前语言，不读取 app 私有语言设置。

## 范围与非目标

- 保留现有中英文文案、Provider/Project 选择、七类磁盘扫描、自动发现状态、预览脱敏、内存和持久化缓存。
- Command Center 的标题仍为 Customize，`/customize` 的描述仍为现有「打开 Customize」/「Open Customize」。命令 ID、参数、提交行为和设置冲突处理不变。
- 不把磁盘发现结果替换成某个运行中 agent 的命令清单，不增加运行态面板、扫描 watcher 或生命周期 hook。
- 根据本轮用户授权，将 `@getpaseo/plugin` 固定为 0.17.4，同步 package-lock/node_modules，最低 Paseo 版本设为 >=0.17.4；只安装现有依赖及必需 peers。
- 审查现存 deprecated API 与 0.17.4 的 collection refs/query、Provider 安装/版本、配置发现、插件状态、文件访问、selection、cache、slash command 和翻译契约。能等价简化旧实现才采用，不为升级机械重写。
- 不 reload、不修改全局配置、不提交、不推送或发版；其他插件和根目录不在本委派修改范围。

## 验收

- 页面使用 SDK `useTranslation().locale`，继续通过现有 `messagesFor` 选择中英文文案。
- 命令持久标签使用 `defineTranslations().message()`；切换语言无需注销并重新注册命令。
- `client/web.ts` 只保留缺少公开替代的 workspace 路由桥接，不再访问 app 私有语言设置、浏览器语言或语言轮询。
- 已知最后访问的 workspace ID 时，通过公开 `paseo.workspaces.ref(id).refresh()` 查项目根，移除插件手写分页及 21 页上限；无 ID 或 SDK 返回不存在时保持原有项目默认值回退，缓存策略不变。
- 实际安装的 plugin/client/protocol 均为 0.17.4，`npm ls` 无 invalid；SDK 固定版本与 lockfile、最低运行时、README/CHANGELOG/spec 一致。
- 在实际 SDK 0.17.4 下 `npm run typecheck`、完整 `npm test` 和 `git diff --check -- customize` 通过；不得用旧 SDK 通过或源码推断代替。
- 记录 Paseo 0.17.4 源码审查、已发布兼容边界和未采纳接口；最终 diff 仅涉及 `customize/`。
- 主 agent 在获准 reload 后切换 Web/原生端 Settings → Language，检查页面和命令即时变化，Provider/Project 与列表/卡片选择不重置、缓存列表不消失。
