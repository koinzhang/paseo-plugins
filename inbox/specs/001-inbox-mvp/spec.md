# 001 Inbox MVP

## 目标

提供一个个人 Inbox，用来收集 Paseo 里「我想留下来的东西」：

- **收藏 agent**：一键收藏当前 agent，之后从 Inbox 跳回；agent 被归档后收藏仍保留，并可在 Inbox 里反归档。
- **Notes**：可编辑的 Markdown 文本，可关联到 project。
- **Project 记录**：按 project 聚合的笔记与收藏（project 是分组维度，不是独立实体）。
- **临时记录（scratch）**：快速捕获的短文本，之后可整理成 note 或删除。

## 已定决策

1. **归档的 agent 仍保留在收藏中**：条目标记为「已归档」，提供「反归档」操作；反归档成功后恢复为正常状态。只有用户手动取消收藏才移除条目。所属 workspace 也已归档时，先恢复 workspace（worktree 会按原分支重建），再反归档 agent；workspace 无法恢复时给出 daemon 返回的原因，不反归档 agent。
2. **存储**：SQLite（`node:sqlite`），文件为 `~/.paseo/plugin-data/inbox/inbox.db`。
3. **数据归属所在 host**：数据存在该 host daemon 的 `~/.paseo/plugin-data/inbox/`。插件 surface 支持切换 host 查看各自数据（利用 Paseo surface 自带的 host picker）；不做跨 host 同步或合并。
4. **Project key**：优先用规范化后的 git remote URL（`origin`，没有 origin 就取第一个 remote）；没有 remote 时用 git 仓库根目录的绝对路径；不在 git 仓库里时用 workspace 目录的绝对路径。
5. **不写入 agent timeline**：Inbox 数据只存在插件自己的存储里，不使用 `timeline.append`。
6. **不依赖 Activity**：独立插件，不读 Activity 的数据库和 RPC。

## 用户故事

- 在某个 agent 里按 ⌘K →「Add to Inbox」，这个 agent 出现在 Inbox 的 Agents 分组，显示标题、provider、project 和状态。
- 点击收藏的 agent 跳转到该 agent；如果它已归档，显示「已归档」和「Unarchive」按钮，点击后反归档并可继续跳转。
- 在 Inbox 新建 note，选择或自动带上当前 project；按 project 筛选能看到该 project 的 notes 和收藏的 agent。
- 在 composer 输入 `/inbox 一段文本`，不发送给 agent，直接存为 scratch，默认关联当前 workspace 的 project。
- 连接了多个 host 时，在 Inbox surface 顶部切换 host，看到的是该 host 自己的数据。

## 范围

- 侧边栏 surface「Inbox」：分组 All / Agents / Notes / Scratch，project 筛选，搜索（标题 + 正文），置顶，删除。
- Note / scratch 编辑：标题（可选）+ 纯文本 / Markdown 正文，自动保存；scratch 可「转为 note」。
- **空笔记不保存**：新建 note 先是本地草稿，标题或正文有非空白内容后才写入；离开编辑器时标题和正文都为空的 note 会被删除；server 拒绝创建空 note，并在启动时清理残留的空 note / scratch。
- Command Center：`Add agent to Inbox`（agent context）、`Quick note`（workspace / global context）、`Inbox`（009 起，原 `Open Inbox`）。
- Slash command：`/inbox [text]`（agent context）。带文本存为 scratch；不带参数把当前 agent 加入 Inbox（幂等）。
  - 同一插件不能注册两个同名 slash command（`Duplicate client slash command`），workspace context 又拿不到当前 agent，所以 `/inbox` 只在已有 agent 的 composer 中可用；草稿 composer 用 Command Center 的 "New Inbox note"。
- 收藏的 agent：保存快照（agentId、title、provider、model、workspaceId、cwd、projectKey、starredAt），并与实时状态合并（运行中 / 空闲 / 已归档 / 不存在）。

## 非目标

- 跨 host 同步、导入导出、云端备份。
- 富文本编辑器、图片或附件。
- 把 note 作为附件插入 prompt（留给后续编号：attachment source）。
- Explorer 里的 project 笔记面板（已由 [`002-workspace-inbox`](../002-workspace-inbox/) 以 workspace 级 Inbox 实现）。
- 和 Activity 的联动。

## 验收

- [ ] 侧边栏出现 Inbox，桌面和紧凑布局下都能正常使用，深色和浅色主题下文字颜色都正确。
- [ ] ⌘K 能收藏当前 agent；重复收藏不产生重复条目。
- [ ] 归档已收藏的 agent 后，条目仍在并显示「已归档」；在 Inbox 点「Unarchive」后 agent 恢复，条目状态随之更新。
- [ ] agent 与所属 workspace 都已归档时，Unarchive 先恢复 workspace 再恢复 agent；workspace 不可恢复时显示原因。
- [ ] agent 被彻底删除（daemon 中查不到）时，条目显示「不可用」，可以取消收藏。
- [ ] 同一仓库的不同 worktree / workspace 归到同一个 project（remote 相同）；没有 remote 的仓库按仓库根路径归组。
- [ ] `/inbox 文本` 生成一条 scratch，composer 清空，不触发 agent turn。
- [ ] 只输入 `/inbox` 把当前 agent 加入 Inbox；重复执行不产生重复条目。
- [ ] 两个 host 各自有独立数据，切换 host 后列表随之切换。
- [ ] daemon 重启和插件 reload 后数据仍在。
- [ ] 点「+ Note」或「New Inbox note」后不输入任何内容就离开，不留下条目；把已有 note 的标题和正文都清空后离开，该条目被删除。
