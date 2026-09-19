# 029 — Explorer Agents 标题搜索

- 状态：已实现
- 日期：2026-09-19
- 依赖：025 / 028

## 1. 目标

| ID | 目标 |
|---|---|
| G1 | Agents 区标题行：默认在显示偏好（筛选）按钮**左侧**放搜索图标 |
| G2 | 点击搜索图标在 **Agents 标题右侧**展开胶囊搜索框（不替换标题；固定行高防顶移；展开/收起动画）；右侧图标变为 X 关闭 |
| G3 | 输入文字按 **标题** 过滤列表（`title`，无标题时用展示用的 `agentId`）；大小写不敏感子串匹配 |
| G4 | 搜索与现有 Status / Lifecycle 筛选、排序、分组叠加；搜索词仅会话态，不写入 settings |

## 2. 非目标

- 不按 provider / 状态 / 消息数等其它字段搜索
- 不持久化搜索词或「展开」状态
- 不改 Skills / MCP 排行区

## 3. 口径

- 匹配串：`(item.title ?? item.agentId)`，`toLowerCase()` 后 `includes(query.trim().toLowerCase())`
- `query` 空白时不过滤（等同未搜索）
- 展开时输入框可获焦；收起时清空 query
- 无匹配时空态文案仍可用「No matching agents」（与筛选空态一致即可）

## 4. 验收

- [x] 默认仅搜索图标 + 设置图标；点搜索展开输入框
- [x] 输入后列表只留标题命中项；清空或收起后恢复
- [x] 与 Status/Lifecycle 筛选叠加
- [x] `npm run typecheck` / `paseo plugin reload activity`
