# 006 Profile options compatibility

## 目标

`/profile` 读取 Paseo 当前的 `AgentProfile.options`，同时兼容旧 profile 的 `featureValues`。保持现有 provider、model、mode、effort 校验与单次 server RPC 写入，不改变其他命令。

## 行为

- profile 包含 `options` 时以它为准，包括空对象；只有未提供 `options` 时才读取 `featureValues`。
- 仍只应用当前 agent 已暴露的 feature，未知键继续逐项报告 `Ignored`。
- `options` 是已支持的 profile 字段，不再把这个字段本身误报为 `Ignored: options`。
- 继续把可运行时修改的值放入现有 `config.featureValues`，经 `commands.agent.control` 和 server `DaemonClient.applyAgentConfig` 一次应用；不新增或修改公共 RPC 契约。

## 非目标

- 不采用 Composer 设置写 API，不生成 provider 生效提示。
- 不升级 SDK、依赖、manifest 或最低主机版本。
- 不把未暴露的 provider options 强行应用到运行中 agent。
- 不修改本次工作开始时已存在、来源未确认的 005 Composer 迁移文件。

## 验收

- [x] 旧 `featureValues` profile 行为不变；现有 profile 测试通过。
- [x] 只有 `options` 的 profile 能生成现有单次配置 RPC；新增测试通过。
- [x] 同时有两字段时以 `options` 为准，且不误报整个字段；新增测试通过。
- [x] 空 `options` 不回退到旧值；未知键仍给出原有逐项提示；新增测试通过。
- [x] 单独运行相关纯函数测试并记录退出码；修复后 24/24 通过，退出 0。
- [x] 运行 typecheck，区分新增代码问题与已有 005 迁移/已安装 SDK 不匹配；前后结果及外部依赖变化见 `tasks.md`。
