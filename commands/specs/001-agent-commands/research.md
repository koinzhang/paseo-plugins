# Research

版本锚点：Paseo `49f9cec6b`（Name config.json when the CLI cannot parse it (#5337)），`paseo --version` 0.9.2，`@getpaseo/plugin` / `@getpaseo/client` 0.9.2。

## Slash command 契约

- `packages/plugin/src/client/contracts.ts`：`addSlashCommand({ name, description, argumentHint, context, onSubmit })`，`onSubmit` 得到 Command Center 上下文（`paseo` `rpc` `agent` `workspace` `openPanel`）+ `args`。
- `public-docs/plugins/reference.md` § Slash commands：Paseo 负责 autocomplete、清空输入、错误 toast；不等待 `onSubmit`；优先级 built-in > plugin > provider。
- Built-in client commands：`packages/app/src/client-slash-commands/index.ts` 只有 `exit`（`quit` `q`）与 `clear`（`new`）。

## 读能力（插件 SDK 可用）

`packages/client/src/index.ts` `PaseoApi`：`agents.ref(id).refresh()` 返回完整 `AgentSnapshotPayload`（`model` `effectiveThinkingOptionId` `currentModeId` `availableModes` `features` `runtimeInfo` `status`）；`providers.listModels / listModes / listFeatures`；`config.get()` 的 `agentProfiles`（`packages/protocol/src/agent-profile.ts`）。

## 写能力（插件 SDK 缺失）

`PaseoAgentHandle` 只有 `send` `run` `archive` `detach` `respondToPermission` 等，没有 model / mode / thinking / feature / title / cancel。插件 server 的 `paseo` 由 `plugin-process.ts` 以 `createPaseoApi(daemonClient)` 构造，`DaemonClient` 不对插件暴露。

`DaemonClient`（`packages/client/src/daemon-client.ts`）有 `setAgentModel` `setAgentThinkingOption` `setAgentMode` `setAgentFeature` `applyAgentConfig` `updateAgent` `cancelAgent`，app 与 CLI 都用它；`@getpaseo/client` 以 `./internal/daemon-client` 导出。CLI `paseo agent update` 只支持 `--name` `--thinking`，无 model / feature；MCP `/mcp/agents` 使用每次运行随机、只注入 agent 的凭据，插件不适用。

结论：插件 server 用 `DaemonClient` + `ws` 连回本机 daemon（与 `packages/cli/src/utils/client.ts` 相同）。插件 server bundle 由 esbuild 打包依赖（`packages/server/src/server/plugins/compiler.ts`，server external 仅 SDK 与 zod），子进程 fork 继承 daemon 环境变量。

## Picker

- `onSubmit` 没有 UI 句柄；`useToast` / `Modal` 需要已挂载组件。
- Composer pill `behavior: { kind: "menu" }` 渲染 app 原生 `MenuRoot`（compact 下为 sheet），开合状态由 app 内部 `pluginButtonStore` 控制，插件无法程序化打开。
- 插件 `Modal`（`packages/app/src/plugins/react-native/modal.tsx`）基于 `AdaptiveModalSheet`：桌面 `createPortal` 到 overlay root，移动端独立 native modal / bottom sheet，并用 context bridge 传递插件运行时，因此可在任意已挂载组件中打开。Composer pill 的自定义 icon 组件渲染在 `ButtonEnvironment`（toast、插件运行时、QueryClient）内，`visible: false` 的 pill 不渲染。
- pill 原生 popover（`behavior: popover`）的开合由 app 内部 `pluginButtonStore.setOpen` 控制，注册对象只有 `update` / `remove`，且 `update` 改 behavior 会强制关闭，因此无法程序化打开。
- 选择：临时 pill 的 icon 组件挂载即打开 picker。宽布局用 `react-native` `Modal`（transparent）自绘锚定浮层，参照 `components/ui/menu/menu-overlay.tsx`（`AnchoredSurface` 定位、翻转、clamp、150ms scale 0.97→1、首项聚焦与方向键）与 `menu-item.tsx`（行 28 / 40、inset 4、padding 8×4、圆角 6、hover surface2、check 在右）；插件主题无 `borderAccent` / `shadow`，用 `border` 与按 surface0 亮度选择的 `shadow.md`。compact 用 host `Modal` sheet。

## Profile

app `packages/app/src/agent-profiles/internal/use-agent-profile-picker.ts` + `materialize-profile.ts`：运行中 agent 只接受同 provider profile，mode 不在 `availableModes` 时丢弃，经 `applyAgentConfig` 一次应用 model / mode / thinking / featureValues。

## 开放问题

- 上游若给 `PaseoAgentHandle` 增加设置写接口，应改为直接用 SDK 并移除 server 连接。
- daemon 在 config 中设置密码且未通过 `PASEO_PASSWORD` 提供时，server 连接会被拒。
