# Plan

## 数据流

```text
slash command → client onSubmit
  读：paseo.agents.ref(id).refresh() / providers.listModels / providers.listModes / config.get   （插件 SDK）
  决策：shared/commands.ts 纯函数 plan*(args, state) → picker | run | throw
  写：rpc(commands.agent.control) → server → DaemonClient → daemon 原生请求
```

插件 SDK 的 `PaseoApi` 目前只读，没有 agent 设置写接口（见 research.md），所以写操作走插件 server：它用 `@getpaseo/client` 的 `DaemonClient`（CLI 同款）连回本机 daemon，一条连接懒建立、失败重建、插件停止时关闭。

| op | daemon 请求 |
|---|---|
| model | `set_agent_model_request` |
| thinking | `set_agent_thinking_request` |
| mode | `set_agent_mode_request` |
| feature | `set_agent_feature_request` |
| config（profile） | `agent.config.apply.request`（`features.agentConfigApply`）；老 daemon 逐字段回退 |
| rename | `update_agent_request { name }` |
| cancel | `cancel_agent_request` |

daemon 地址：`PASEO_LISTEN` → `$PASEO_HOME/paseo.pid` 的 `listen` → `127.0.0.1:$PORT|6767`；支持 host:port / unix socket。密码取 `PASEO_PASSWORD`。

## 当前值

- model：`agent.model ?? runtimeInfo.model`，都为空时取 catalog `isDefault`
- thinking：`effectiveThinkingOptionId ?? thinkingOptionId ?? runtimeInfo.thinkingOptionId`，为空时取 model 默认项
- mode：`currentModeId ?? runtimeInfo.modeId`；可用 modes 取 `availableModes`，空时回退 `providers.listModes`
- features：agent snapshot `features`（含当前值）

## Profile 应用

对齐 app `use-agent-profile-picker`：provider 不同直接报错（运行中 agent 不能换 provider）；model 不在 catalog、mode 不在 availableModes、thinking 不在目标 model 选项、feature 不在当前 features 的都忽略；profile 上 schema 之外的字段（passthrough）也列入 Ignored。一次 `agent.config.apply` 应用。

## 文件

```text
index.client.ts / index.server.ts
client/commands.ts      命令注册 + 执行
client/agent-state.ts   SDK 读取 → AgentState
client/picker.tsx       临时 composer pill，宽布局锚定浮层 / compact host sheet
client/menu-list.tsx    Paseo 菜单行样式与键盘导航
shared/popover-geometry.ts  浮层定位（翻转、clamp）
server/daemon.ts        连接本机 daemon
server/control.ts       op → DaemonClient 方法
shared/commands.ts      plan* 纯函数
shared/resolve-option.ts / parse.ts / rpc.ts
```
