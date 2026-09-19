# 032 — Workspace Terminals 区块

- 状态：已实现
- 日期：2026-09-19
- 依赖：024 / 031（Workspace panel）

## 1. 背景

Workspace Activity 面板目前只展示 Agents 与 Skills / MCP 排行。用户在 Explorer 里打开的终端属于「本 workspace 正在发生什么」的运营信息，且 host SDK 已暴露只读查询（`paseo.terminals.list({ workspaceId })` / `capture()`）。

## 2. 目标

| ID | 目标 |
|---|---|
| G1 | Workspace 面板新增 **Terminals** 区块，列出当前 workspace 打开的终端 |
| G2 | 行显示 `name` + `cwd`；点击展开该终端**最近输出**（`capture({ stripAnsi: true })`，最新 8 行），再点收起 |
| G3 | 列表与展开预览各自 5s 轮询；仅当存在终端时渲染区块；不阻塞、不影响面板其它区块 |
| G4 | 行内 **关闭按钮**：`terminals.ref(id).kill()` 关闭该终端进程；乐观移除 + 失败 toast 回滚；Web 悬停显示，native 常显 |
| G5 | 不提供创建 / 输入终端 |

## 3. 非目标

| ID | 非目标 |
|---|---|
| NG1 | 在插件里创建 / 输入终端（关闭由 G4 支持） |
| NG2 | 展示 host SDK 未暴露的 `title` / `activity` 状态（SDK schema 只保留 `{ id, name, cwd }`） |
| NG3 | 文件列表 / 打开文件（`PaseoApi` 无文件 API，另案评估） |
| NG4 | 把 Terminals 写入本地 SQLite（不是用量维度，不做历史统计） |

## 4. 口径

- 列表来源：`usePaseo().terminals.list({ workspaceId })`；查询 key `["activity","workspace-terminals",workspaceId]`，`refetchInterval 5s`，`retry: false`
- 预览来源：`usePaseo().terminals.ref(id).capture({ stripAnsi: true })`；查询 key `["activity","terminal-capture",workspaceId,id]`，仅展开时 enabled，`refetchInterval 5s`
- 预览行 = capture `lines` **去掉尾部空行**后取末 8 行；结果为空显示 `No output`
- 列表顺序 = host 返回顺序（创建顺序）
- 关闭 = `kill()` **直接执行**（无二次确认，与 host 关闭行为一致），本地列表先移除、失败回滚并 toast；关闭时清掉该终端的 capture 缓存
- 查询失败（如 host 不支持 workspace terminals）**静默隐藏**区块，不进入面板 error；展开中的终端从列表消失时自动收起

## 5. 验收

- [ ] 有终端时出现 Terminals 区块；无终端时不出现（无 Agents / Rank 时也不显示 "No activity"）（待真机目视确认）
- [ ] 行点击展开 / 收起；展开显示最新 8 行并 5s 刷新；新终端出现、关闭的终端消失（待真机目视确认）
- [ ] 关闭按钮 kill 成功、行移除；失败 toast 且行恢复（待真机目视确认）
- [x] `npm run typecheck` / `npm test`（146 pass）/ `paseo plugin reload activity` → running
