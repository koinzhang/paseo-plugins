# 032 — plan

## 方案

纯客户端 host SDK 查询；不经插件 RPC、不落本地库。

- `WorkspaceActivityPanel`（`client/workspace/panel.tsx`）新增 `terminals` useQuery（key `["activity","workspace-terminals",workspaceId]`，5s 轮询，`retry: false`）
- 新组件 `client/workspace/terminals-section.tsx`：
  - 标题 + 行列表（`Terminal` 图标 + name + cwd + 关闭按钮）
  - 行 Pressable 切换 `expandedId`；展开时组件内 `usePaseo().terminals.ref(id).capture({ stripAnsi: true })` useQuery（`enabled` + 5s 轮询）
  - 关闭按钮调 `onClose(item)`（panel 注入）；Web 悬停显示（`hoveredId`），native 常显；busy 时显示 ActivityIndicator
  - `useEffect` 在展开的终端从列表消失时收起
- panel 的 `closeTerminal`：乐观移除列表行 → `paseo.terminals.ref(id).kill()` → 清 capture 缓存 + invalidate；失败回滚并 toast
- 纯函数 `client/workspace/terminal-preview.ts`：去尾部空行 + 截末 N 行（单测覆盖）
- `showContent = showAgents || showRank || showTerminals`；`terminals.error` 不进面板 error
- 样式由 panel 注入（复用 `sectionHeaderRow` / `sectionTitle` / `panel` / `listMain` / `listTitle` / `listMeta` / `titleAction`，新增 `terminalRow` / `terminalPreview` / `terminalLine`）

## 文件

| 文件 | 改动 |
|---|---|
| `client/workspace/terminals-section.tsx` | 新增区块（列表行 + 展开预览 + 关闭按钮） |
| `client/workspace/terminal-preview.ts` + `.test.ts` | 预览行纯函数 + 单测 |
| `client/workspace/panel.tsx` | terminals 查询、关闭（kill + 乐观更新）、区块接线、样式 |
| `client/workspace/constants.ts` | `TERMINAL_REFETCH_MS` / `TERMINAL_PREVIEW_LINES` |
| `package.json` | test script 增加新单测 |
| `specs/README.md` / `docs/architecture.md` / `CHANGELOG.md` | 登记 |

## 依赖边界

- `usePaseo()` 已在 panel 使用；`terminals.list/capture` 均为 host SDK 只读调用
- 不引入新依赖；不新增 RPC / SQLite 表
- 预览用 React Native `Text` + 等宽字体（沿用 `MONO` 约定），无 SVG / 图片资源
