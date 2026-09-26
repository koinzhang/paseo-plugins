# Tasks

- [x] 查证当前 Paseo 插件 API、SDK、daemon 协议与 built-in slash commands。结论与源码位置见 research.md。
- [x] `resolveOption`：exact → 大小写无关 → 唯一前缀 → 唯一子串，ambiguous / not found；`shared/resolve-option.test.ts` 12 项覆盖。
- [x] 7 个命令的参数解析与决策（`shared/commands.ts`）；`shared/commands.test.ts` 覆盖 picker 当前值标记、各命令匹配 / 错误文案、profile 字段取舍、rename / cancel 边界。
- [x] 插件 server 连接本机 daemon 并转发控制请求；`server/daemon.test.ts` 覆盖 listen 解析。用临时 codex agent（无 prompt）端到端跑 rename / model / thinking / mode / feature / config / cancel，snapshot 均更新，状态始终 idle，测试后归档。
- [x] 客户端注册命令；无参数时临时 composer pill 挂载并自动弹出 picker（宽布局锚定浮层，compact 为 host sheet）；`shared/popover-geometry.test.ts` 覆盖定位、翻转与 clamp。`npm run typecheck` 通过；`paseo plugin install` 后 `paseo plugin ls` 为 running，日志 Plugin ready。
- [ ] 桌面 app 手动验证 autocomplete、pill 菜单与即时同步（本机 daemon 未提供 web UI，未做自动化界面操作）。
