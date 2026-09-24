# 方案

- 复用 `usage.by-provider` 的 `from` / `to` 查询，同时请求当前与上一窗口。`to` 是闭区间，上一窗口结束时间取当前窗口起点前 1 毫秒。
- 主 KPI 保持全时段查询；对比查询单独缓存和刷新。共享层 `buildActivityKpi` 对 Sessions / Prompts 计算计数变化，对 Top provider / Top model 从上一窗口的聚合结果取第一名名称。
- `UsageStats` 仅按可选的趋势元数据在 label 下方渲染附属文字；Workspace / Agent 不传该字段。两者字号都使用 `FONT_SIZE.label`，并各自用 `FitText` 适配卡片宽度。颜色使用宿主 `statusSuccess` / `statusDanger` / `foregroundMuted`。
