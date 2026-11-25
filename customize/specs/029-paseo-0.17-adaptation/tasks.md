# 029 — Tasks

## 首轮：公开语言适配（历史验证，不替代 0.17.4 验收）

- [x] 核实基线、现有改动与 SDK/运行时锚点。主 checkout `5326249867269f7cda3a70315d584a3da886a218`，开始时 Customize 无改动；其他 agent 的 `commands/` 改动未触碰。
- [x] 审查配置/Provider、插件状态、文件访问、query/cache、slash command 和语言接口。依据及未采纳项见 research.md。
- [x] 先建立 spec/plan/research；用 `v0.15.0` tag 和已安装 SDK 0.15.1 验证语言接口，不要求依赖安装。
- [x] 替换语言桥接和命令持久标签，删除因此不用的实现。页面保留 useAppLanguage/useMessages；命令只注册一次；web.ts 仅保留原 workspace 路由桥接。
- [x] 运行 `npm run typecheck`（在 customize/，exit 0）；`node --experimental-strip-types --test client/translations.test.ts client/entries.test.ts client/slash-command.test.ts client/query-policy.test.ts client/provider-options.test.ts client/selection-settings.test.ts`（同目录，exit 0，19/19 passed、0 failed）。覆盖文案/SDK message、locale 映射、路由解析、Provider 筛选、缓存刷新失败保留、选择默认值、命令更新和 revision conflict；不等同于真实 Web/原生语言切换验收。
- [x] 检查 Customize 范围完整 diff（含全部 6 个新增文件）；`git diff --check -- customize` exit 0。共 12 个文件，全部在 customize/；package.json、package-lock.json、paseo-plugin.json 无变更，其他 agent 的改动保留。
- [ ] Web/原生语言切换、命令文案与选择/缓存留存：主 agent 已执行完整测试（73/73）与 reload，状态 running、日志 Plugin ready；因用户正在操作 Paseo，未切换真实语言或验证选择/缓存留存，此项仍待 GUI 验收。

## 本轮：实际对齐 SDK 0.17.4

- [x] 核实 HEAD 与现存 Customize 改动；根据用户新授权先更新 spec/plan/research/tasks，保留首轮改进与其他会话工作。
- [x] 固定 SDK 和最低 Paseo 为 0.17.4，安装依赖并同步 lockfile；npm install 经 sandbox ENOTFOUND 后获准联网，exit 0；npm ls exit 0，plugin/client/protocol 实际均 0.17.4，无 invalid。
- [x] 重新审查全部 SDK 调用、deprecated API、Provider/配置/版本/安装/插件状态、refs/query、缓存、selection、文件访问、slash command 和翻译；采取与不采取的证据见 research.md 的实际安装后复审表。
- [x] 实际升级未出现类型错误；screen 使用 PluginScreenProps，workspace 根查询采用公开 SDK handle，移除插件分页及 21 页上限。README/CHANGELOG/spec 同步最低 Paseo >=0.17.4，保留首轮 i18n、扫描、脱敏和缓存。
- [x] 在实际 SDK 0.17.4 下运行 `npm run typecheck` exit 0、`npm test` exit 0（77/77 passed、0 failed、0 skipped）；`npm ls --all --json` exit 0、problems=[]，实际 plugin/client/protocol/relay 与 lockfile 均为 0.17.4。
- [x] 审查最终全部 tracked/untracked diff（10 个已跟踪修改、8 个新增文件，共 18 个）；`git diff --check -- customize` exit 0。本委派所有改动都在 Customize，其他会话和根目录 turn 文件未触碰；未提交、未推送、未发版、未 reload。
