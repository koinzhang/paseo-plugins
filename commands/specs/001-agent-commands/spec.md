# 001 Agent commands

## 目标

补充 Paseo 官方缺失、高频且适合 slash command 的 Agent 控制能力。只做薄封装：能力、选项和当前值都来自 Paseo / provider，不重新实现 daemon、MCP 或 provider 逻辑。

## 命令

| 命令 | 无参数 | 有参数 |
|---|---|---|
| `/model [model]` | 当前 provider 的 model 列表，标记当前 model | 切换 model |
| `/effort [level]` | 当前 model 的 thinking levels，标记当前值 | 设置 thinking option |
| `/profile [profile]` | 列出 `agentProfiles`；其他 provider 的 profile 置灰 | 把 profile 中可运行时修改的 model / mode / thinking / features 同步到当前 agent；其余字段忽略并简短提示 |
| `/mode [mode]` | 当前 agent 可用 modes，标记当前值 | 切换 mode |
| `/feature [name] [value]` | 所有 features 及当前值（子菜单选值） | `name`：该 feature 的可选值；`name value`：修改 |
| `/rename <title>` | 提示用法，不发起 turn | 修改 agent title |
| `/cancel` | 运行中则取消；空闲时简短提示 | — |

## 交互

- 无参数时自动弹出 picker：宽布局为锚定在 pill 上方的浮层（样式、定位、键盘交互对齐 Paseo `MenuSurface` / `MenuItem`：上方左对齐、间距 12、宽 280–420、最高 440 可滚动、空间不足翻转、Esc / 方向键 / Enter、点遮罩关闭、选中即关闭），compact 布局为 host `Modal` sheet；当前值右侧 ✓。插件 API 不允许 slash command 直接打开 host UI，因此在当前 agent 的 composer 加一个临时 pill，由它的自定义图标组件挂载并立即打开 Modal；关闭或选中后移除 pill，点击 pill 可重新打开，同 agent 再次调用时原地替换。选中后的提示用 warning toast。
- 有参数时直接执行，不弹 picker。
- 匹配：exact → 大小写无关 exact（空格 / `_` / `-` 视为同一分隔符）→ 唯一前缀 → 唯一子串（model 关闭子串）；多个候选报 ambiguous 并列出候选；不用 LLM。
- 错误简短，例如 `Unknown effort "max".` + `Available: medium, high, extra-high`。错误与提示走 Paseo 的 slash command 错误 toast。

## 非目标

`/subagent` `/new-agent` `/send` `/schedule` `/heartbeat` `/run`；`/fast` 等 alias。

## 验收

- [ ] 7 个命令出现在 agent composer 的 slash autocomplete（待桌面 app 手动验证）；命名不与 built-in（`exit` `quit` `q` `clear` `new`）冲突，同名 provider 命令按 Paseo 优先级让位给插件。
- [x] 不向 agent 发送 prompt，不产生 provider turn。
- [x] 选项和当前值动态来自 provider capability / agent snapshot，没有硬编码 model 或 effort。
- [ ] 修改由 daemon 广播 `agent_update`，app 原生控件即时同步（daemon snapshot 已验证更新，界面待手动验证）。
- [x] unsupported capability、unknown value、ambiguous value 都有明确错误。
- [x] 单测覆盖 option resolution 与各命令参数解析。
