# 069 — Global：Sessions 口径 / Provider 下拉 / KPI 重构 / Provider 排行

## 背景

Global Activity 页把「一次 agent 会话」称作 Agents，容易被理解成「启动了 N 个不同的 Agent」。同时筛选栏的时间 chips 很少用，provider chips 最多只显示 5 个（016）；KPI 里「Longest agent」「Peak weekday」价值偏低。

## 目标

1. **筛选栏**
   - 移除时间范围 chips（All time / Today / 7 days / 30 days）；页面固定为全部时间（All time）。
   - provider chips 改为下拉框 `Provider: All ▾`，列出**全部** provider（取消 016 的 5 个上限，排序规则不变）。
   - `Most used models` 列出全部 model（不再受 `ACTIVITY_LIST_LIMIT` 8 行截断；skills / MCP 保持 8 行）。**已被 082 取代**：三类列表均截断到 Insights 行数。
2. **KPI 6 格**（顺序固定）

   | # | 值 | 标签 |
   |---|---|---|
   | 1 | 会话数（千分位） | Sessions |
   | 2 | 用户消息数（千分位） | Messages |
   | 3 | `Cursor · 62%` | Top provider |
   | 4 | `Auto Smart · 38%` | Top model |
   | 5 | 活跃天数 | Active days |
   | 6 | 最长连续 | Longest streak |

   - Top provider 占比 = 该 provider 消息数 / 全部 provider 消息数；选中某 provider 时显示该 provider 及其在全部 provider 中的占比。
   - Top model 占比 = 该 model 消息数 / 当前筛选范围内全部 model 消息数。
3. **Insights 去重**：`Active days`、`Messages` 移入 KPI 后从 Insights 删除；`Peak weekday`、`Longest session` 从 KPI 移入 Insights，仍固定 8 行。
4. **术语**：Global 页所有表示「会话」的 Agents / agent 改为 Sessions / session（KPI、Insights、创建直方图标题与浮层、Timeline 图例与浮层、热力图浮层、空状态提示）。Workspace / Agent 两层的 Agents 列表（对应 Paseo agent 实体）不改。
5. **热力图**：隐藏右上角 Daily / Weekly / Cumulative，固定 Daily。
6. **Providers 排行**：新增 section，每行 = provider 色块 + 名称 + 比例条 + 数值；标题右侧 `‹ Sessions ›` 在 Sessions / Messages / Skill calls / MCP calls 间循环。
   - 始终列出全部 provider（不随 provider 下拉过滤）；选中某 provider 时其他行降低不透明度。
   - 数值为 0 的 provider 不列出；条长按当前指标最大值归一。

## 非目标

- 不改 RPC 名与契约（仍 `usage.*`），不新增查询。
- 不改 Workspace / Agent 层文案。
- 插件 `Icon` 只支持 Lucide 名称，拿不到宿主 provider 品牌图标；排行行首用 provider 品牌色块代替。

## 验收

- 筛选栏只有 `Provider: All ▾`；展开后列出全部 provider，选中后页面数据按 provider 过滤，点外部关闭。
- KPI 6 格标签与值符合上表；Insights 8 行不与 KPI 重复。
- Global 页可见文案无「Agents / agent」指代会话。
- 热力图标题行无模式切换。
- Providers 排行可循环 4 种指标，数值与 KPI / Insights 一致。
