# Research

## 锚点和范围

- 上游 `1ff119dc2a42825e7fdc46c504b6ccee52a4f8be`；runtime 与实际安装的 plugin/client/protocol 为 0.17.4。
- 初始范围只修改 shared、server 和本目录。上轮 006 的 options 读取是前置基础，不重写其历史 spec。
- 后续主 agent 明确追加授权 `client/agent-state.ts` 的 loadAgentState 和必要测试；只读确认该文件原无未提交修改，与并发 005/007 不重叠。本目录按同一数据面任务补充 loader 接线，不另建功能编号。
- 005 Composer、007 Esc、client、package、lockfile、manifest、README、CHANGELOG 和 spec 总索引由另一会话/主 agent 负责。

## 公开 setOptions 与 notice 边界

- `packages/client/src/index.ts:446-452` 定义公开 `PaseoAgentHandle.setOptions(patch): Promise<void>`；`:1155-1156` 调用同连接 `DaemonClient.setAgentOptions`。
- `packages/client/src/daemon-client.ts:4510-4528`：现代主机将 patch 放入 `applyAgentConfig({ options })`；只有旧主机走 legacy feature 转换。
- `packages/server/src/server/session/agent-config/agent-config-session.ts:22-26` 明确 model/options 不产生 provider notice，mode/thinking 产生。因此 `/feature` 用公开 setOptions 不损失原有 notice；不能把这条结论推广到 `/profile`。
- 同文件 `:154-200`：bundle model first、mode、thinking、options last，保留第一个 notice；一条请求防止多次往返之间插入其他 mutation，但不是可回滚事务。
- `packages/client/src/index.ts:668-757`：公开 createPaseoApi 借用既有 DaemonClient；dispose 释放 API 的订阅/作用域而不关闭连接。只执行 refresh/setOptions 不注册观察订阅。

## 新数据面和默认恢复

- `packages/protocol/src/messages.ts:371-405`：control 的键为 `key`，select choices 的标识为 `value`，control 不携带当前值。
- `packages/protocol/src/option-controls.ts:62-72` 已有公开 `featuresFromControls({ controls, options })`，覆盖 toggle/select 默认值与 current choice；无需重写转换或硬编码 provider。
- `packages/protocol/src/messages.ts:2240-2247`：`AgentConfigApply.options` 为 patch，null 删除 agent 自己的 top-level 值。旧 featureValues 仅兼容入口，不再生成它。
- `packages/server/src/server/agent/agent-manager.ts:2627-2671`：null 的请求键仍送到 provider，其值重新按 config/provider 默认解析；provider 不支持运行时 applyOptions 或拒绝值时失败，不保存被拒配置。

## 旧键归一化

- `packages/server/src/server/agent/option-controls.ts:44-81`：daemon 按真实 provider adapter 把旧 Codex fast_mode 转为 service_tier；已有 service_tier 优先，null 原样保留。
- `packages/server/src/server/agent/agent-manager.ts:2635`：所有 options patch 进入 provider 前均经该 daemon 转换。
- `packages/server/src/server/daemon-config-store.ts:180-233`：存储的旧 profiles 先 fold/convert，配置 API 返回已归一化的 options，同时暂保留 legacy featureValues。
- 插件只用 snapshot 的当前 control key。不会自行将旧 fast_mode 字符串对应到现代控件；若一个旧 snapshot 仍展示它，会按原键写 options，由 daemon 转换。未知键仍拒绝/逐项提示。

## 客户端衔接和未采纳项

- loader 接线前 `client/agent-state.ts` 只读 `agent.features`。追加授权后改为读取 `optionFeatures(agent)`，并返回 AgentState.controls/options；相同 helper 用于 loader 显示与共享 plan，避免旧 features 覆盖有效 options。其实际接线回归结果记录到 tasks。
- 不把 profile 拆成多个公开 setOptions/Composer setter；否则丢 notice，并破坏 bundle 顺序和单次请求。
- 不保留缺少 agentConfigApply 的逐字段 feature 回退；用户目标已是 0.17.4，对 capability 异常明确报错。
- `public-docs/plugins/migration.md:191-211` 的 provider controls/options 语义已核对；本插件不是 provider contribution，不需要迁移 configure hooks。

## 验证

初次交付 shared/server 65/65 测试通过、typecheck exit 0、npm ls 确认三包 0.17.4。追加 loader 接线后，shared/server 加 loader 共 71/71 测试通过，typecheck 再次 exit 0。新增 loader 测试在接线前实际 4 项失败，复现遗漏新字段、旧值覆盖、空 controls 与默认值错误；接线后全部通过。完整命令与范围检查记录到 `tasks.md`。不将其他会话的变更、依赖升级或真实桌面交互验收归入本次结果。
