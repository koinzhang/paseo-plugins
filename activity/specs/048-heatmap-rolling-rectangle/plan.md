# 实现方案

- `buildActivityCalendar` 起点由自然周周日改为本地今天减 363 天。
- 保留本地日历 `setDate` 加减，避免夏令时导致重复或漏日。
- Weekly 每个格子按自身日期寻找自然周汇总，不能再按视觉列起点取值。
- 保留现有客户端、12 月轴、range 查询过滤和 cumulative 窗前历史逻辑。
- 增加日期边界和模式回归测试；验证后重载指向本 checkout 的 `activity-dev`。
