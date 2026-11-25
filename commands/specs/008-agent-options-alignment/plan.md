# Plan

## 数据流

```text
snapshot controls + options (legacy fallback: features)
  → shared optionFeatures → /feature plan / profile supported-key filter
  → commands.agent.control
      feature → server: borrow public PaseoApi over existing DaemonClient
                → agent.refresh → assertSupportedOptions → agent.setOptions
      config  → server: same public API refresh → assertSupportedOptions
                → DaemonClient.applyAgentConfig(single bundle with options)
                → original provider notice returned through RPC
```

借用 API 通过公开 `createPaseoApi(client)` 构造；不新建 socket，不增加订阅，每次 options 操作结束 `dispose()`。无需修改并发会话之外的根入口 `index.server.ts`。

## 文件

- `shared/agent-options.ts`：复用 SDK protocol 的 `featuresFromControls`，兼容旧输入并验证 patch 键；不重复实现 provider 名称转换。
- `shared/commands.ts`：可选 `AgentState.controls/options`，两条命令使用共享显示/支持项适配，null reset 参数和 profile options 输出。
- `shared/rpc.ts`：config 写入字段改为 `options`；保留 feature op 的插件内名称和已有 value 形状，避免影响并发客户端。
- `server/control.ts`：公开单键 options 写入、单次 bundle、当前 controls 校验、原样错误与 notice；移除旧 daemon 逐字段回退。
- `client/agent-state.ts`：追加授权后，loadAgentState 使用 optionFeatures(agent) 构建兼容显示列表，并把 controls/options 传给共享命令；保留原有 model/mode/thinking 读取。
- `client/agent-state.test.ts`：实际 loader 与 shared plan 的连接、新字段优先、旧字段回退、空 controls、默认值和缺失 agent 回归测试。
- 对应 shared/server 测试：保持原有命令测试并新增真实公开 SDK wrapper 与 fake transport 的回归测试。

## 兼容与验证

controls 只验证键是否受支持，不在 bundle 前复制 provider 的目标 model/value 校验。model-first 后的值校验、null 默认解析和运行时可应用性都由 daemon/provider 实现。旧键若不在当前 controls 中仍按未知键处理；从 config API 读取的旧 profiles 已由 daemon 归一化。

完整跑 `node --experimental-strip-types --test shared/*.test.ts server/*.test.ts client/agent-state.test.ts`，然后 `npm run typecheck` 和 `npm ls @getpaseo/plugin @getpaseo/client @getpaseo/protocol`。记录其他客户端并发变化导致的实际错误但不修复。主 agent 负责真实交互以及并发 Composer 最低版本核验。
