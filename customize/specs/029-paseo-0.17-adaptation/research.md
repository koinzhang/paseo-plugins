# 029 — Research

## 锚点（2026-11-25）

- 主 checkout：`5326249867269f7cda3a70315d584a3da886a218`。
- 只读上游 Paseo：`1ff119dc2a42825e7fdc46c504b6ccee52a4f8be`；`packages/plugin/package.json` 为 `0.17.4`，本机 `paseo --version` 为 `0.17.4`（CLI 同时输出 Electron codesign warning，但成功返回版本）。
- 本轮升级前 Customize 安装的 plugin/client/protocol 均为 `0.15.1`，manifest `requirements.paseo >=0.15.0`；本轮目标是实际安装 SDK 与 peers 0.17.4，最低运行时 >=0.17.4。
- 已阅读 `public-docs/plugins/migration.md`、`hooks.md`，并对照实际导出与 app/SDK 实现；不以新版本号本身作为升级理由。

## 采用：公开宿主语言与持久 message 标签

- `packages/plugin/src/client/index.ts` 公开导出 `defineTranslations`、`useTranslation`。
- `packages/plugin/src/client/translations.tsx`：hook 使用 `useSyncExternalStore` 订阅安装实例语言，返回 resolved locale；message 是不可变引用，文案由宿主按当前语言解析。
- `packages/plugin/src/client/contracts.ts`：Command Center title 和 slash command description 接受 `PluginText`；IDs、command names 与 callbacks 不变。
- `packages/app/src/plugins/registry.ts`：locale 来源是 app i18n 的 `resolvedLanguage`/`language` 与 `languageChanged`，不是浏览器 localStorage；每个安装实例管理订阅和清理。
- `packages/app/src/plugins/installation-provider.tsx`：为插件内容注入 translation provider；`command-center/contributions.ts` 与 `client-slash-commands/index.ts` 解析持久标签。
- 官方示例 `plugin-examples/translations/index.client.tsx` 使用 message 引用注册命令，而不是换语言时重注册。
- 现有实现读取私有 `@paseo:app-settings`、每 1500ms 检查语言，原生端固定 English；命令在语言变化时注销重注册。新实现移除私有数据依赖和语言 timer，并修复原生语言来源；保留原文案函数、扫描和缓存。

### 发布边界与文档偏差

`public-docs/plugins/reference.md` 的 Runtime translations 小节仍写 Unreleased、示例暂定 >=0.12.1。不能仅凭这段文档假设版本。

首轮实际检查：`git merge-base --is-ancestor 30464cf23 v0.15.0` 退出 0（该提交引入语言支持）；`git show v0.15.0:packages/plugin/src/client/index.ts` 已导出两项接口；同 tag 的 `packages/app/src/plugins/registry.ts` 已创建 runtime 并订阅 app language，`installation-provider.tsx` 已注入 provider。0.15.1 的公开 `/client` 导出与 descriptor 类型也包含两项接口和 PluginText，因此首轮 i18n 改进不需要升级。文档的 Unreleased 标注与发布 tag 不一致，保留此证据而不改上游。

本轮用户明确要求「彻底对齐 Paseo / SDK 0.17.4」，取代首轮不强制升级的边界。`packages/plugin/package.json` 的 0.17.4 peers 精确要求 `@getpaseo/client`、`@getpaseo/protocol` 0.17.4；允许安装现有依赖及必需 peers，要求实际同步 lockfile/node_modules 并通过完整测试。最低宿主 >=0.17.4 是用户要求的支持边界，不意味着首轮 i18n API 到该版本才出现。

## 首轮未采纳项（本轮复审见后文）

| 领域 | 可复用接口与上游源码 | 保留现状的原因 |
|---|---|---|
| Provider 配置/自动发现 | `packages/client/src/index.ts` 的 `providers.snapshot/subscribe/waitForReady/listControls`、`config.get`；`packages/protocol/src/agent-types.ts` 的 ProviderSnapshotEntry | 现有 snapshot 已按 enabled/source 筛选已知 scanner；listControls 是 agent providerOptions，不是各 CLI 的 rules/skills/MCP 文件发现；config.get 是原始 daemon config，可能含 keys/env，不应为扫描需求读取更多敏感信息。waitForReady 会等待 lazy discovery，不替代已有缓存先显示/刷新策略。 |
| Provider 即时状态订阅 | 同上 `providers.subscribe` | 可作为以后替代 30 秒 Provider 刷新的候选，但不提供磁盘配置变更事件；本次收益主要在语言桥接，无需同时重写 Provider query 生命周期。 |
| Agent Plugins 状态 | `packages/client/src/index.ts` 的 agent metadata 和 `commands()`；`packages/plugin/src/server/contracts.ts` | Paseo 插件、provider 自身插件清单、agent 运行态是不同对象。SDK 没有统一的 provider 插件加载清单；metadata 是插件自有 JSON，不证明外部插件已加载。保留规范清单 badge 和「磁盘证据不等于运行态」边界。 |
| 文件访问/预览 | `packages/plugin/src/client/file.ts` 的 PluginFile/useFileText；`client/contracts.ts` 的导航能力 | PluginFile 属于文件 panel 目标，不是任意配置目录扫描 API；导航没有 openFile。直接读会绕过现有路径校验、64 KiB/400 行截断和 MCP 脱敏。保留 server RPC 和系统 Open/Reveal。 |
| query/cache | `packages/plugin/src/client/query.ts`、`client/client-state.tsx` 的 useProjects/useWorkspaces 等；`packages/plugin/src/rpc.ts` 的 defineSubscription | 新 collection hooks 提供 app 实体缓存，不管理 provider 磁盘扫描或十分钟持久快照；订阅需要新的 watcher 生命周期和 SDK 依赖边界，不机械替换现有 React Query/snapshot。 |
| Slash command 运行态目录 | `packages/client/src/index.ts` 的 agent handle `commands()` | 需要具体运行中 agent，返回其实际加载的 skills/commands；Customize 以 Provider/Project 为维度，还涵盖未运行 agent 和七类配置。可另做运行态核验功能，但不能替代当前磁盘看板。 |
| Workspace 默认选择 | `packages/plugin/src/client/contracts.ts` 的 SidebarViewProps.active、`client/client-state.tsx` 的 entity hooks | active 仅为替换整个 sidebar 的 contribution 提供；现有 screen/header item 无 active workspace。entity hook 不返回导航中的活动 workspace；保留窄范围的 web 路由桥接。 |
| Lifecycle | `packages/plugin/src/server/lifecycle.ts`、`public-docs/plugins/hooks.md` 的 addHook | Customize 现有 server 不注册旧 hooks，且用户修改磁盘文件不一定触发 agent lifecycle。新增 hooks 不解决统一文件发现，并扩大监听范围，未采纳。 |

## 验证边界

本轮允许仅在 Customize 安装现有依赖并实际对齐 SDK/client/protocol 0.17.4；串行运行 typecheck 和完整 npm test。本委派仍不 reload、不执行 UI 操作、不读取用户配置或凭据。实际语言切换和原生渲染交由主 agent统一验证。

## 0.17.4 实际安装后的复审

- `npm install --ignore-scripts --no-audit --no-fund` 首次在 sandbox 失败（exit 1，ENOTFOUND registry.npmjs.org，且不能写 ~/.npm/_logs）；获准 require_escalated 后重跑成功（exit 0，changed 5 packages）。没有安装额外直接依赖。
- 实际 `npm ls @getpaseo/plugin @getpaseo/client @getpaseo/protocol` exit 0，三者均 0.17.4，无 invalid；node 读取实际三个 package.json 的版本一致。初次升级后 typecheck exit 0，未发现需要猜测补丁的类型错误。
- 安装只改变既有依赖链：plugin/client/protocol/relay 升至 0.17.4，npm 同步将已有 client 传递依赖 ws 从 8.22.1 解析为 8.23.0；没有新增直接依赖。最终 `npm ls --all --json` exit 0、problems=[]；实际 package.json 与 lockfile 中四个 @getpaseo 包版本一致。

| 复审项 | 实际 0.17.4 证据与决策 |
|---|---|
| Deprecated API | 审查全部入口、client/server/shared 的 @getpaseo import 与 SDK 调用，并对照 `packages/plugin/src/client/contracts.ts` 和 migration/hooks：已使用 addScreen、addSidebarHeaderItem、openScreen、client/ui、server.handle、defineSettings/settingsRpc，无 addSurface/addSidebarItem/openSurface、旧 hook 或旧 UI subpath 调用。Component 类型改为 PluginScreenProps，与 addScreen 的实际契约一致；PluginSurfaceProps 本身未标 deprecated，不将它虚报为运行时破坏。 |
| Workspace lookup（采用） | `packages/client/src/index.ts` 的 PaseoWorkspaceHandle.refresh 与 createWorkspaceHandleFactory 调用 `DaemonClient.findWorkspace`；`packages/client/src/daemon-client.ts` 的 findWorkspace 遍历 cursor 到结束并支持 background workspace。替代 Customize 自写 200 条/页、最多 21 页查找；不减少为单次 RPC，不改变项目根字段、查询缓存或空值回退。 |
| Collection refs/query（保留原项目查询） | `packages/plugin/src/client/client-state.tsx` 与 query.ts 导出 useProjects/useWorkspaces 和 host-scoped refs。集合返回 refs，数据来自 app 已载入的多个 host store；`packages/app/src/plugins/client-state/source.ts` 不提供该查询的加载/错误/完整分页状态。直接替换现有 projects.list/useQuery 会改变首次加载的默认项目判定及错误重试；不等价。实体 refs 也不告诉 screen 当前导航 workspace，SidebarViewProps.active 只适用于 sidebar replacement。因此只将已有 ID 的查找交给 workspace handle，保留窄范围 route bridge。 |
| Provider 安装/版本（保留 diagnostic + CLI fallback） | `packages/protocol/src/messages.ts` 的 provider.installation.inspect 请求和 ProviderInstallationInspectionSchema 提供 installed/not_installed/error、opaque version；`packages/client/src/daemon-client.ts` 的 inspectProviderInstallation 是低层 driver 方法。实际 0.17.4 `PaseoApi.providers` 仅有 snapshot/waitForReady/diagnostic/listControls 等，没有 installation inspection 高层方法，snapshot entry 也不含 version。插件 usePaseo/context.paseo 不暴露底层 driver；不新增私有连接或强转 nonexistent 方法。安装 RPC 没有通用 rules/skills/MCP 发现清单，不能替代扫描。 |
| Provider snapshot/config discovery | 0.17.4 保留 enabled/source/compactSnapshot，现有 enabledProviderOptions 仍按已知 scanner 与启用状态筛选；status 不等于 enabled。config.get 是含 keys/env 的原始 daemon 配置，不读取它来重建各 CLI 私有发现。providers.subscribe 可观察 snapshot 变化，但不观察磁盘配置；保留定时刷新及手动重试，避免扩大监听和改变缓存策略。 |
| Selection/cache | 0.17.4 defineSettings/settingsRpc/useSettings 继续支持 host scope、version、revision/conflict；既有 provider/project/layout 文档和 /customize 双重 conflict 尝试不变。SDK query/metadata/subscription 不管理十分钟私有磁盘快照；既有 schema v5、脱敏、目录权限和允许路径确认不变。 |
| File access/agent plugins/slash | PluginFile 仅面向 file panel target，不是目录扫描 API；保留 preview/open RPC 的路径验证、64 KiB/400 行与 MCP 脱敏。agent.commands() 是具体 live session 的 skills/commands，不是 Provider/Project 七类清单；metadata 是插件自有 JSON，不证明 provider 插件激活，不替换磁盘 manifest/badge。addSlashCommand 的 agent/workspace/rpc/openScreen 契约仍匹配现有代码。 |
| Translation/lifecycle | 公开 defineTranslations/useTranslation/PluginText 在实际 0.17.4 导出；页面与命令继续使用宿主语言，无私有语言轮询。现有 server 无旧 hook，新增 addHook/agent tools/MCP 注入会改变运行中 agent，且不解决磁盘变更，因此不采用。 |

### 本轮实际验证

- `cd customize && npm run typecheck`：exit 0（实际 SDK 0.17.4，workspace handle 适配后再次执行）。
- `cd customize && npm test`：exit 0，77/77 passed、0 failed、0 skipped；其中新 workspace root 四项测试覆盖 SDK 委托、无 ID、不存在、失败分支，原有 provider/project、七类扫描、MCP 脱敏、翻译与快照回归仍通过。
- `git diff --check -- customize`：exit 0。
- 对 client/server/shared/入口执行旧 API/subpath 检索：exit 1（无 addSurface/addSidebarItem/openSurface/server.on/server.before、旧 UI subpath、useRevealedText/SettingsGroup/listFeatures 调用），同时依据实际 SDK 契约逐项检查。
- 本地检查不等于本轮 reload 或 GUI 验收；首轮主 agent 的 reload 记录是历史状态。
