# 001 — Customize 看板

## 背景

每家 coding agent 读取的指令文件（AGENTS.md / CLAUDE.md …）、rules、skills、MCP 配置位置和语义都不一样：目录不同、是否递归不同、是否自动发现 / 如何关闭自动调用也不同。用户在 Paseo 里切换 provider 时，看不到「这个 project 下，这家 agent 实际会读到哪些配置」。

## 目标

1. 在左上角侧栏导航（与 New workspace / History / Search / Schedules 同组）加一个 **Customize** 入口，打开 Customize 看板（sidebar surface）。
2. 看板右上角可切换 **provider** 与 **project**；选择保存在当前 Paseo host 的插件设置中并在重新打开时恢复。没有保存过 Project 时，默认 = 打开看板前最后停留的 workspace 所属 project；无法得知时取 project 列表第一项。侧栏入口与命令中心入口统一使用 `FolderCog` 图标。
3. 按 **Instructions（AGENTS.md 类）/ Rules / Skills / MCP** 四类展示条目，每类内分 **项目级 / 用户级**。
4. 每个条目展示：名称、所在目录（相对 project 或 `~`）、来源位置、**自动发现状态**（自动 / 按条件 / 仅手动 / 待批准 / 已禁用 / 未生效）及原因。
5. 点击条目在下方预览框展示文件内容（截断），可「打开」文件（系统默认编辑器）或在 Finder 中显示；不在列表中展开全文。
6. 每类附「机制说明」：该 provider 扫描哪些位置、是否递归、如何关闭自动发现；不支持的类别明确标注。
7. 一期 provider：Paseo 内置的 Claude、Codex、Copilot、OpenCode、Pi、Oh My Pi，以及 Cursor。
8. UI 风格、design tokens、i18n（en / zh-CN）与 Activity 插件一致。

## 非目标

- 不编辑 / 创建 / 删除配置（只读 + 打开文件）。
- 不解析插件（Claude plugins、Cursor plugins、Codex plugins）、团队 / 云端 / claude.ai 同步规则等非本地文件来源；Cursor User Rules 存在 Cursor 设置里，不可读，仅在说明里注明。
- 不连接 MCP server、不列工具。
- 不模拟完整的 per-cwd 加载（以 project 根目录作为 cwd；子目录内的嵌套配置标为「按条件」）。

## 用户故事

- 作为用户，我在某个 workspace 点左上角侧栏的 Customize，看到当前 project 下 Claude 会加载的 CLAUDE.md、`.claude/rules`、skills 和 MCP，以及哪些 skill 设置了 `disable-model-invocation`。
- 我切到 Codex，看到 `.agents/skills` 下递归发现的 skill，哪个被 `agents/openai.yaml` 关闭了隐式调用、哪个被 `[[skills.config]] enabled = false` 禁用。
- 我切到另一个 project，看板刷新为该 project 的配置。
- 我点击一个 rule，下方预览它的 frontmatter 与正文；点「打开」用编辑器打开它。

## 验收标准

- [ ] 侧栏顶部导航出现 Customize 项，点击打开 Customize surface；Command Center（⌘K，global）也可打开。
- [ ] 看板右上角有 Provider / Project 两个下拉；Project 默认最后停留的 workspace 的 project，列表来自 `paseo.projects.list()`。
- [ ] 四个类别 tab 带条目计数；类别内按「项目 / 用户」分组；空组显示空状态。
- [ ] 条目行：图标 + 名称 + 状态徽标；meta 行显示目录与来源；原因（如 `disable-model-invocation: true`）可见。
- [ ] 选中条目后下方预览框显示路径、状态、内容（≤ 64 KiB / 400 行截断），MCP 条目只显示该 server 的配置且 `env` / `headers` / 疑似密钥参数被打码。
- [ ] 「打开」「在 Finder 中显示」可用；只能打开 / 预览扫描结果中出现过的路径。
- [ ] 7 个 provider 的扫描位置、递归规则、自动发现标记与 `research.md` 一致；不支持的类别（Pi 的 rules / MCP）显示「不支持」说明。
- [ ] compact 布局可用；文本颜色全部来自 `theme.colors`；`npm test` 拦截裸数值。
- [ ] `npm run typecheck` / `npm test` 通过；`paseo plugin ls` 显示 `customize` running。
- [ ] 看板内容不重复显示左上角 Customize 标题；Provider / Project 筛选区靠页面右上方，展开的菜单覆盖类别、机制说明和搜索栏。
- [ ] 窄屏上的 Provider 菜单从触发器左边缘向右展开，所有选项完整留在屏幕内。
- [ ] 选择 Provider / Project 后，关闭重开看板及重载插件仍保留选择；明确选择「No project」也保留，首次打开仍使用原有默认值。
