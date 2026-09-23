# 003 · 隐藏 Thinking

## 目标

- 时间线不再显示 agent 的 Thinking（`reasoning`）条目，减少无实质信息的行
- 使用官方 `addTimelineTransformer`：`query.itemType = "reasoning"`，`transform` 返回 `{ items: [] }`
- 所有平台生效（Web、桌面、iOS、Android），不依赖 DOM；历史、流式输出、虚拟列表都一致
- 与主题选择无关：插件启用即生效；停用插件恢复原生 Thinking

## 非目标

- 不改工具调用、正文、用户消息
- 不提供开关设置页（需要时再加）

## 影响

- 模型思考阶段，时间线上不再有 Thinking 行和加载动画；工作状态仍由宿主的运行指示表达
- transformer 只影响渲染，daemon 中的历史数据与 Activity 统计不变
- 与其他同样转换 `reasoning` 的插件（如 compact-agent-activity、reasoning-display）同时启用可能冲突

## 验收

- `npm run typecheck`、`npm test` 通过
- `paseo plugin reload mono` 后状态为 `running`
- 已有会话与新一轮输出中都看不到 Thinking 行；停用 mono 后恢复

## 设置

- 可在 Settings → Plugins → mono → Settings 关闭（默认开启），见 `specs/005-voice-button-settings/`
