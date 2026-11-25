# Plan

## 数据流

```text
slash command → client onSubmit
  读：paseo.agents.ref(id).refresh() / providers.listModels / providers.listModes
  决策：shared/commands.ts planModel / planEffort / planMode
  写：ctx.composers({ agentId })[0].setModel / setThinking / setMode
```

执行入口只切换 `op` 为 `model` `thinking` `mode` 的 `AgentControl`。profile / feature / rename / cancel 仍走 `controlRunner` 和现有 RPC；共享 discriminated union 暂不拆分，避免牵动其他命令与测试。

## 提示

新增 client 端纯函数，根据 `AgentState.provider` 与刷新得到的 `status === "running"` 生成补充提示：

| provider | thinking | mode | model |
|---|---|---|---|
| codex | `Thinking level applies next turn` | `Permission mode applies next turn` | 无 |
| claude | `Thinking level applies next turn` | 无 | 无 |
| 其他 | 无 | 无 | 无 |

Picker 的 plan 在读 agent state 时构建；直接命令也在同一次 `plan()` 调用中刷新 state。提示在执行前确定，与旧 RPC notice 一样属于执行时读到的运行状态。Composer Promise 的 rejection 原样交给 Paseo，不吞错。

## 依赖

- `@getpaseo/plugin` 与保留 RPC 所需的 `@getpaseo/client` 更新至 `0.17.4`，对齐已安装运行时。
- `requirements.paseo` 提升为 `>=0.16.0`，因为 `composers(selector)` 属于 0.16 引入的 Composer API。
- `ws` 保留为其他 RPC 所需依赖。

## 验证

1. 对新的提示函数添加 client 单测，覆盖 provider、运行状态与操作组合。
2. 运行 Commands 的 typecheck 和完整单测。
3. reload 本地 `commands`，检查运行状态与插件日志。
4. 在不向现有 agent 发送命令的前提下，报告桌面交互尚未实测的部分；如需真实运行中切换，另建隔离临时 agent 验证。
