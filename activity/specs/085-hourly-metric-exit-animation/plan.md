# Plan

- `HourlyActivityTimeline` 分离按钮选择的 `metric` 和折线当前展示的 `displayedMetric`；折线数据及 peak 使用后者。
- 指标不一致时对现有 `grow` 执行退出动画，完成后才更新 `displayedMetric`；下一轮 effect 启动向上展开。
- 动画清理先标记取消再 stop，回调同时检查取消标记及 `finished`，阻止过期动画覆盖最新选择。
- 入场从当前 `grow` 值开始，因此快速切回旧指标不会跳到 0；初始值及退出终点均为 0。provider 变化仍直接归零重播入场。
- 继续使用原生驱动及现有基线固定的 transform，无须逐段更新折线。
