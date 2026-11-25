# 008 Agent options alignment

## 目标

把 `/feature` 和 `/profile` 的运行时 provider 值写入对齐 Paseo / SDK 0.17.4 的 options patch，停止发送旧 `featureValues` 和 `set_agent_feature_request`。不修改其他会话的 Composer、弹窗、依赖、manifest 或入口文件。

## 行为

- 新 snapshot 的 `controls` 描述可用键和选项，`options` 描述有效值；优先使用它们。旧 snapshot 的 `features` 只作兼容输入。
- `/feature` 沿用名称匹配、toggle 和 select 参数；`/feature <name> --default` 写入 `null`，恢复 host/provider 默认值，不把 null 转成 false 或某个硬编码选择。
- `/feature` 经原有 server RPC 调用公开 `AgentHandle.setOptions({ [key]: value })`。写前刷新 snapshot，核验 control 支持的键；provider 对值或运行时可修改性的拒绝继续原样返回。
- `/profile` 优先读取 `options`，缺失时读取旧 `featureValues`；只应用已暴露的键，未知键仍逐项提示。输出单次 `{ modelId, modeId, thinkingOptionId, options }` 配置包。
- `/profile` 保留 server `DaemonClient.applyAgentConfig`，以保留 model-first、单次请求与 mode/thinking notice；不拆成多个 SDK setter。
- 以 `options` 为准，不自行把 Codex `fast_mode` 转换为 `service_tier` 或转换其他 provider 专用名称。
- bundle 能力缺失时报明确错误，不逐字段回退到旧写接口。

## 非目标

- 不改 `/model` `/effort` `/mode` 的并发 Composer 适配、`/rename` `/cancel` `/resend`、逐命令启停或 Esc 弹窗。
- client 范围仅修改已追加授权的 `loadAgentState` options/controls 读取与对应测试，不修改 Composer 或弹窗文件。
- 不把 provider 不展示的启动专用 options 绕过 controls 强行应用。
- 不安装依赖，不 reload，不修改最低 host 版本，不发版。

## 验收

- [x] `/feature` 的 RPC 最终只用公开 setOptions，不使用 setAgentFeature；server 测试与调用路径检查通过。
- [x] `/profile` 输出 options，单次 applyAgentConfig，mode/thinking notice 不丢失；server bundle 测试通过。
- [x] null reset、未知键、provider rejection、bundle 能力缺失有测试；均通过。
- [x] 新 controls/options 优先，空 controls 不恢复旧 features；旧 features 和 profile.featureValues 输入仍可读；shared 测试通过。
- [x] shared/server 完整测试、typecheck、npm ls 和范围 diff 已检查并记录实际结果；见 tasks。
- [x] 向主 agent 交付客户端 snapshot reader 接入点与 manifest 下界归属，不声称其他会话工作已验收；见 research 与 tasks。
- [x] 已授权的 client loader 接入共享 helper；真实 loader 输出交给 planFeature/planProfile 的回归测试通过，相关 shared/server/loader 测试共 71/71 通过。
