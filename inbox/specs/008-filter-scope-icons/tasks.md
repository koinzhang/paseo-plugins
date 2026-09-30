# 008 任务

- [x] `Chip` 支持可选图标；workspace chip 用 `Folder`，project chip 用 `FolderGit2`。`npm run typecheck` 通过，`paseo plugin reload inbox` 后 running。App 内未点选验证。
- [x] workspace 图标由 `Folder` 改为 `GitBranch`（筛选 chip 与条目标签 chip 两处），与 project 的 `FolderGit2` 拉开形状差异。`npm run typecheck` 通过，`paseo plugin reload inbox` 后 running。
- [x] project 图标由 `FolderGit2` 改为 `Folder`（筛选 chip 与条目标签 chip 两处）。`npm run typecheck` 通过，`paseo plugin reload inbox` 后 running。
- [x] 修复重载后首次点 project / workspace chip 闪烁：列表查询按筛选分 key，未缓存的组合在返回前 `data` 为空，chip 行与列表整体卸载再出现。列表查询改用 `keepPreviousData`，占位数据期间不做失效筛选清理；条目标签选项在可编辑条目打开时预取，展开时不再先出现 Loading 行。`npm run typecheck`、`npm test` 通过，reload 后 running。App 内未点选验证。
