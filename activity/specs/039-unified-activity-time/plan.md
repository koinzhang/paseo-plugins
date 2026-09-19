# 039 — plan

## 共享层

`shared/format.ts`：

- `formatActivityTime`：当天仅时间；同年非当天 month/day + time；跨年加 year（`month: short`, `day: numeric`, `hour/minute`）
- `formatUpdatedAt` → 薄别名，避免 025 文案瞬间断裂
- 移除仅 popover 使用的 `formatDayTime`（及对应单测）
- `formatLocalDateTime(iso, locale = "en")`：export 用，显式默认英文

## 客户端

`client/formatted-time.tsx`：

```tsx
<FormattedTime iso={...} style={...} prefix="Last " />
```

接线：

| 面 | 文件 | 改动 |
|---|---|---|
| Popover | `usage-popover.tsx` | `formatDayTime` → `FormattedTime` |
| Agent panel | `panel.tsx` | `formatLocalDateTime` → `FormattedTime` + `prefix="Last "` |
| Workspace Rank | `rank-section.tsx` | 同上 |
| Agents meta | `filters.ts` | `formatUpdatedAt` → `formatActivityTime`（已有 locale 入参） |
